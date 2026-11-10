"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "./site-link";
import { useShell } from "./live-shell-context";
import { Button, Icon } from "./ui";
import { useLiveData, liveRows } from "./live-module-kit";

type Payment = { id: string; plan: string; status: string; periodMonths: number; transferCurrency: string; transferMinor: number; bankSnapshot: string; receiptAt: string | null; reviewNote: string | null; entitlementSnapshot: string };
type Four = readonly [string, string, string, string];
const LANGS = ["fa", "en", "de", "tr"] as const;

function bankOf(snapshot: string | null) {
  try {
    const bank = JSON.parse(snapshot || "") as { iban?: unknown; holder?: unknown };
    if (typeof bank.iban !== "string" || typeof bank.holder !== "string" || !bank.iban.trim() || !bank.holder.trim()) return null;
    return { iban: bank.iban.replace(/\s/g, "").toUpperCase(), holder: bank.holder };
  } catch { return null; }
}
const ibanGroups = (iban: string) => iban.match(/.{1,4}/g)?.join(" ") ?? "";

/** Bank-transfer order. The server decides everything: a receipt never activates a package; only a review does. */
export function LiveCheckout({ id }: { id: string }) {
  const lang = useShell()!.lang;
  const t = useCallback((copy: Four) => copy[Math.max(0, LANGS.indexOf(lang as (typeof LANGS)[number]))], [lang]);
  const packages = useLiveData("/api/packages");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState("");
  const [transferred, setTransferred] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (background = false) => {
    const current = ++request.current;
    if (!background) setLoading(true);
    try {
      const response = await fetch("/api/payment/" + encodeURIComponent(id), { cache: "no-store", credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(body.error || "");
      if (current !== request.current) return;
      setPayment(body.payment); setCheckedAt(new Date()); setError("");
    } catch (e) {
      if (current === request.current) setError((e instanceof Error && e.message) || t(["دریافت پرداخت ممکن نشد", "Unable to load payment", "Zahlung nicht verfügbar", "Ödeme yüklenemedi"]));
    } finally {
      if (!background && current === request.current) setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { try { setTransferred(localStorage.getItem("aifekr-transfer-" + id) === "1"); } catch {} }, [id]);
  useEffect(() => { void load(); return () => { request.current += 1; }; }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (payment?.status !== "PENDING") return;
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const interval = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [payment?.status, load]);

  function acknowledge() {
    setTransferred(true);
    try { localStorage.setItem("aifekr-transfer-" + id, "1"); } catch {}
  }
  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key); clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(""), 2200);
    } catch { setError(t(["کپی خودکار ممکن نشد؛ متن را انتخاب و کپی کنید.", "Select and copy the text manually.", "Bitte den Text manuell kopieren.", "Metni seçip elle kopyalayın."])); }
  }
  function choose(next: File | null) {
    setError(""); setFile(null);
    if (!next) return;
    if (next.size > 5 * 1024 * 1024) return setError(t(["حجم رسید باید حداکثر ۵ مگابایت باشد.", "Receipt must be 5 MB or less.", "Der Beleg darf höchstens 5 MB groß sein.", "Dekont en fazla 5 MB olmalıdır."]));
    if (!["image/jpeg", "image/png", "application/pdf"].includes(next.type)) return setError(t(["فقط فایل JPG، PNG یا PDF پذیرفته می‌شود.", "Choose a JPG, PNG or PDF file.", "Wählen Sie eine JPG-, PNG- oder PDF-Datei.", "JPG, PNG veya PDF dosyası seçin."]));
    setFile(next);
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("receipt", file);
      const response = await fetch("/api/payment/" + encodeURIComponent(id) + "/receipt", { method: "POST", body, credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(result.error || "");
      setFile(null); await load();
    } catch (e) {
      setError((e instanceof Error && e.message) || t(["ارسال رسید ممکن نشد", "Upload failed", "Hochladen fehlgeschlagen", "Yükleme başarısız"]));
    } finally { setBusy(false); }
  }

  const bank = bankOf(payment?.bankSnapshot ?? null);
  const approved = payment?.status === "SUCCESS";
  const rejected = payment?.status === "REJECTED";
  const pendingReview = payment?.status === "PENDING" && !!payment.receiptAt;
  const canUpload = payment?.status === "PENDING" && !payment.receiptAt && !!bank;
  const step = approved || pendingReview ? 2 : transferred ? 1 : 0;
  const student = !!payment?.plan.startsWith("STUDENT_");
  let fitness = !!payment?.plan.startsWith("FIT_");
  try { fitness = fitness || !!JSON.parse(payment?.entitlementSnapshot || "{}").returnPath?.startsWith("/fitness"); } catch {}
  const history = fitness ? "/fitness/payments" : "/payments";
  const known = payment ? liveRows(packages.data?.packages).find((p) => p.planCode === payment.plan) : undefined;
  const planName = known
    ? String((lang === "fa" ? known.name : known.nameEn || known.name) ?? payment?.plan)
    : student ? t(["اشتراک دانشجویی", "Student subscription", "Studierendenabo", "Öğrenci aboneliği"])
    : payment?.plan.startsWith("CREDITS_") ? t(["خرید اعتبار AI", "AI credit top-up", "KI-Guthaben", "Yapay zekâ kredisi"])
    : t(["اشتراک", "Subscription", "Abonnement", "Abonelik"]);
  const steps = [t(["انتقال مبلغ", "Transfer", "Überweisen", "Havale"]), t(["ارسال رسید", "Upload receipt", "Beleg senden", "Dekont yükle"]), t(["تأیید و فعال‌سازی", "Review & activation", "Prüfung & Aktivierung", "Onay ve etkinleştirme"])];

  return (
    <div className="pay-page">
      <Link className="pay-back" href={history}><Icon name="ArrowRight" size={16} />{t(["همهٔ پرداخت‌ها و فعال‌سازی", "All payments & activation", "Alle Zahlungen und Aktivierung", "Tüm ödemeler ve etkinleştirme"])}</Link>
      <header className="pay-head">
        <h1>{t(["پرداخت بانکی", "Bank transfer", "Banküberweisung", "Banka havalesi"])}</h1>
        <p>{t(["اطلاعات حساب، مبلغ و رسید؛ همه در یک‌جا.", "Account details, amount and receipt. All in one place.", "Kontodaten, Betrag und Beleg. Alles an einem Ort.", "Hesap bilgileri, tutar ve dekont. Hepsi bir arada."])}</p>
      </header>
      <ol className="pay-steps" aria-label={t(["مراحل پرداخت", "Payment steps", "Zahlungsschritte", "Ödeme adımları"])}>
        {steps.map((label, i) => {
          const done = approved || i < step;
          return <li key={label} className={done ? "done" : i === step ? "now" : ""} aria-current={!done && i === step ? "step" : undefined}><span>{done ? <Icon name="Check" size={14} /> : (i + 1).toLocaleString(lang)}</span>{label}</li>;
        })}
      </ol>
      {error && <div className="pay-alert" role="alert">{error}{!payment && <Button onClick={() => void load()}>{t(["تلاش مجدد", "Retry", "Erneut versuchen", "Tekrar dene"])}</Button>}</div>}
      {loading && !payment && <p role="status">{t(["در حال بارگذاری…", "Loading…", "Wird geladen…", "Yükleniyor…"])}</p>}
      {payment && (
        <div className="pay-grid">
          <section aria-label={t(["اطلاعات انتقال", "Transfer details", "Überweisungsdaten", "Havale bilgileri"])}>
            {bank ? (
              <div className="pay-card" dir="ltr">
                <div className="pay-card-top"><strong>AIFekr</strong><Icon name="CreditCard" size={26} /></div>
                <div className="pay-chip" aria-hidden="true" />
                <small>IBAN · {payment.transferCurrency}</small>
                <div className="pay-iban"><code>{ibanGroups(bank.iban)}</code><button type="button" onClick={() => void copy(bank.iban, "iban")} aria-label={t(["کپی ایبان", "Copy IBAN", "IBAN kopieren", "IBAN kopyala"])}><Icon name={copied === "iban" ? "Check" : "Copy"} size={18} /></button></div>
                <small>{t(["صاحب حساب", "Account holder", "Kontoinhaber", "Hesap sahibi"])}</small>
                <p>{bank.holder}</p>
              </div>
            ) : <div className="pay-alert" role="alert">{t(["اطلاعات حساب قابل دریافت نیست؛ پیش از انتقال با پشتیبانی تماس بگیرید.", "Account details unavailable. Contact support before transferring.", "Kontodaten fehlen. Kontaktieren Sie vor der Überweisung den Support.", "Hesap bilgileri yok. Havale öncesi destek ile iletişime geçin."])}</div>}
            <div className="pay-ref">
              <div><small>{t(["شناسه سفارش؛ در توضیح انتقال وارد کنید", "Order reference · include in transfer description", "Bestellreferenz · im Verwendungszweck angeben", "Sipariş referansı · havale açıklamasına ekleyin"])}</small><code dir="ltr">{payment.id}</code></div>
              <button type="button" onClick={() => void copy(payment.id, "ref")} aria-label={t(["کپی شناسه سفارش", "Copy reference", "Referenz kopieren", "Referansı kopyala"])}><Icon name={copied === "ref" ? "Check" : "Copy"} size={17} /></button>
            </div>
            <span className="sr-only" role="status">{copied && t(["کپی شد", "Copied", "Kopiert", "Kopyalandı"])}</span>
            <p className="pay-note"><Icon name="ShieldCheck" size={18} />{t(["مبلغ دقیق را منتقل کنید. اشتراک فقط پس از بررسی و تأیید ادمین فعال می‌شود.", "Transfer the exact amount. Your subscription activates only after admin approval.", "Überweisen Sie den genauen Betrag. Aktivierung erst nach Admin-Freigabe.", "Tam tutarı havale edin. Abonelik yalnızca yönetici onayından sonra etkinleşir."])}</p>
            {canUpload && !transferred && <Button variant="primary" className="full" onClick={acknowledge}>{t(["انتقال را انجام دادم؛ ارسال رسید", "I transferred the amount · upload receipt", "Überwiesen · Beleg hochladen", "Havale yaptım · dekont yükle"])}</Button>}
          </section>
          <section className="pay-summary">
            <small>{t(["خلاصه سفارش", "Order summary", "Bestellübersicht", "Sipariş özeti"])}</small>
            <h2><bdi>{planName}</bdi></h2>
            {payment.periodMonths > 0 && !payment.plan.startsWith("CREDITS_") && <p>{payment.periodMonths.toLocaleString(lang)} {t(["ماه", "months", "Monate", "ay"])}</p>}
            <div className="pay-amount" dir="ltr">{new Intl.NumberFormat(lang, { style: "currency", currency: payment.transferCurrency, minimumFractionDigits: 2 }).format(payment.transferMinor / 100)}</div>
            {canUpload ? (
              <form onSubmit={upload}>
                <h3>{t(["پرداخت کرده‌ای؟ رسید را اینجا بفرست", "Already paid? Send your receipt here", "Schon bezahlt? Beleg hier senden", "Ödedin mi? Dekontunu buradan gönder"])}</h3>
                <label className={"pay-drop" + (file ? " has-file" : "")} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) choose(e.dataTransfer.files[0] || null); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview ? <img src={preview} alt={t(["پیش‌نمایش رسید", "Receipt preview", "Vorschau des Belegs", "Dekont önizlemesi"])} /> : <Icon name={file ? "FileText" : "Upload"} size={30} />}
                  <strong><bdi>{file ? file.name : t(["رسید را انتخاب کنید یا اینجا رها کنید", "Choose a receipt or drop it here", "Beleg auswählen oder hier ablegen", "Dekont seçin veya buraya bırakın"])}</bdi></strong>
                  <span>JPG, PNG, PDF · 5 MB</span>
                  <input disabled={busy} type="file" accept="image/jpeg,image/png,application/pdf" aria-label={t(["انتخاب رسید پرداخت", "Choose payment receipt", "Zahlungsbeleg auswählen", "Ödeme dekontu seç"])} onChange={(e) => { choose(e.target.files?.[0] || null); e.target.value = ""; }} />
                </label>
                <Button type="submit" variant="primary" className="full" disabled={!file || busy}>{busy ? t(["در حال ارسال…", "Uploading…", "Wird hochgeladen…", "Yükleniyor…"]) : t(["ارسال رسید برای بررسی", "Submit receipt for review", "Beleg zur Prüfung senden", "Dekontu incelemeye gönder"])}</Button>
                <p className="pay-caption">{t(["ارسال رسید به معنی تأیید پرداخت نیست.", "Uploading a receipt does not confirm payment.", "Ein hochgeladener Beleg bestätigt keine Zahlung.", "Dekont yüklemek ödeme onayı değildir."])}</p>
              </form>
            ) : (
              <div className={"pay-status" + (approved ? " ok" : rejected ? " bad" : "")} role="status">
                <Icon name={approved ? "CircleCheck" : rejected ? "CircleX" : "Clock3"} size={30} />
                <h3>{approved ? t(["پرداخت تأیید شد و پکیج فعال است.", "Payment approved. Your package is active.", "Zahlung bestätigt. Dein Paket ist aktiv.", "Ödeme onaylandı. Paketin etkin."]) : rejected ? t(["رسید تأیید نشد.", "Receipt rejected.", "Beleg abgelehnt.", "Dekont reddedildi."]) : pendingReview ? t(["رسید ثبت شد؛ منتظر بررسی است.", "Receipt received. Awaiting review.", "Beleg erhalten. Prüfung ausstehend.", "Dekont alındı. İnceleme bekleniyor."]) : t(["این پرداخت دیگر رسید نمی‌پذیرد.", "This payment no longer accepts receipts.", "Für diese Zahlung können keine Belege mehr eingereicht werden.", "Bu ödeme artık dekont kabul etmiyor."])}</h3>
                {pendingReview && <p>{t(["کار دیگری لازم نیست و دوباره پرداخت نکن. وضعیت این صفحه خودکار به‌روز می‌شود.", "No further action is needed; do not pay again. This page updates automatically.", "Keine weitere Zahlung nötig. Diese Seite aktualisiert sich automatisch.", "Başka işlem gerekmiyor; tekrar ödeme yapma. Bu sayfa otomatik güncellenir."])}</p>}
                {pendingReview && checkedAt && <small>{t(["آخرین بررسی:", "Last checked:", "Zuletzt geprüft:", "Son kontrol:"])} {checkedAt.toLocaleTimeString(lang)}</small>}
                {payment.reviewNote && <p><bdi>{payment.reviewNote}</bdi></p>}
                {approved && <Link className="btn primary full" href={payment.plan === "FIT_MARKETPLACE" ? "/fitness/marketplace" : fitness ? "/fitness" : student ? "/student" : "/home"}>{student ? t(["شروع یادگیری در فضای دانشجویی", "Start learning in your student workspace", "Lernen im Studierendenbereich starten", "Öğrenci alanında öğrenmeye başla"]) : t(["ورود به پنل", "Open workspace", "Arbeitsbereich öffnen", "Panele git"])}</Link>}
                {rejected && <Link className="btn" href="/contact">{t(["پیگیری با پشتیبانی", "Contact support", "Support kontaktieren", "Destekle iletişime geç"])}</Link>}
                {payment.receiptAt && <a className="btn" href={"/api/payment/" + encodeURIComponent(payment.id) + "/receipt"}>{t(["دانلود رسید", "Download receipt", "Beleg herunterladen", "Dekont indir"])}</a>}
                {pendingReview && <Button disabled={loading} onClick={() => void load()}>{t(["بررسی وضعیت", "Refresh status", "Status aktualisieren", "Durumu yenile"])}</Button>}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
