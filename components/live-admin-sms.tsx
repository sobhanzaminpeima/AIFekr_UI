"use client";
/**
 * Admin SMS on aifekr.com (/admin/sms), backed by /api/admin/sms:
 * provider settings (the key is write-only), a live key check, the mobile
 * sign-up switch with a test code, and sending to one user, picked users,
 * typed numbers or a customer segment, always previewed and confirmed first.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Modal } from "./ui";

type Tx = [string, string, string, string];
type Row = Record<string, unknown>;
type Config = { configured: boolean; keyHint: string | null; lineNumber: string; otpTemplateId: string; otpParam: string; source: string };
type Broadcast = { id: string; text: string; audience: string; recipients: number; sent: number; failed: number; cost: number | null; status: string; error: string | null; createdAt: string };
type State = { config: Config; phoneSignup: boolean; broadcasts: Broadcast[] };
type Audience = { type: "users"; userIds: string[] } | { type: "phones"; phones: string[] } | { type: "segment"; segment: Row };

const API = "/api/admin/sms";

function useT() {
  const { locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { i, fa: i === 0, tx: (c: Tx) => c[i], num: (v: number) => v.toLocaleString(tag), when: (v: string) => new Date(v).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }) };
}

async function call(url: string, method: string, body?: unknown): Promise<Row> {
  const res = await fetch(url, { method, credentials: "include", cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Row;
  if (!res.ok) throw Object.assign(new Error(String(data.error ?? data.code ?? `HTTP ${res.status}`)), { data });
  return data;
}

export function LiveAdminSms() {
  const { tx } = useT();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    call(API, "GET").then((d) => setState(d as unknown as State)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  if (error) return <p className="plan-notice" role="alert">{error}</p>;
  if (!state) return <section className="panel" aria-busy="true" />;
  return (
    <div className="admin-sms">
      <header className="panel">
        <h1>{tx(["پیامک", "SMS", "SMS", "SMS"])}</h1>
        <p className="muted">{tx(["تنظیم سامانهٔ پیامک (sms.ir)، ثبت‌نام با موبایل و ارسال پیامک به کاربران.", "SMS provider settings (sms.ir), mobile sign-up, and messages to users.", "SMS-Anbieter (sms.ir), Registrierung per Handy und Nachrichten an Nutzer.", "SMS sağlayıcısı (sms.ir), cep telefonuyla kayıt ve kullanıcılara mesaj."])}</p>
      </header>
      <Settings config={state.config} onSaved={load} />
      <PhoneSignup enabled={state.phoneSignup} configured={state.config.configured && !!state.config.otpTemplateId} onChanged={load} />
      <Composer configured={state.config.configured && !!state.config.lineNumber} onSent={load} />
      <History rows={state.broadcasts} />
    </div>
  );
}

function Settings({ config, onSaved }: { config: Config; onSaved: () => void }) {
  const { tx, num } = useT();
  const [form, setForm] = useState({ apiKey: "", lineNumber: config.lineNumber, otpTemplateId: config.otpTemplateId, otpParam: config.otpParam || "CODE" });
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<Row | null>(null);
  const [templates, setTemplates] = useState<unknown>(null);
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  return (
    <section className="panel">
      <h2>{tx(["سامانهٔ پیامک", "SMS provider", "SMS-Anbieter", "SMS sağlayıcısı"])}</h2>
      <p role="status">
        {config.configured
          ? tx(["کلید ثبت شده است", "A key is saved", "Ein Schlüssel ist gespeichert", "Bir anahtar kayıtlı"]) + ` (${config.keyHint})` + (config.source === "env" ? tx([" — از تنظیمات سرور", " — from server settings", " — aus der Serverkonfiguration", " — sunucu ayarlarından"]) : "")
          : tx(["هنوز کلیدی ثبت نشده است.", "No key is saved yet.", "Noch kein Schlüssel gespeichert.", "Henüz anahtar kaydedilmedi."])}
      </p>
      <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void run(async () => { await call(API, "PUT", { provider: "smsir", ...form }); setForm((f) => ({ ...f, apiKey: "" })); toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); onSaved(); }); }}>
        <label>{tx(["کلید API (مقدار کامل از پنل sms.ir)", "API key (the full value from the sms.ir panel)", "API-Schlüssel (vollständiger Wert aus sms.ir)", "API anahtarı (sms.ir panelindeki tam değer)"])}
          <input type="password" autoComplete="off" dir="ltr" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={config.configured ? tx(["برای تغییر، کلید تازه را وارد کنید", "Enter a new key to replace it", "Neuen Schlüssel eingeben, um ihn zu ersetzen", "Değiştirmek için yeni anahtarı girin"]) : ""} />
          <small>{tx(["شناسهٔ کلید (به شکل 02f5…-…) کلید نیست؛ مقدار طولانی خود کلید را وارد کنید.", "The key id (like 02f5…-…) is not the key; enter the long key value.", "Die Schlüssel-ID (wie 02f5…-…) ist nicht der Schlüssel.", "Anahtar kimliği (02f5…-… gibi) anahtar değildir."])}</small>
        </label>
        <label>{tx(["شمارهٔ خط ارسال", "Sender line number", "Absendernummer", "Gönderici hat numarası"])}<input dir="ltr" inputMode="numeric" value={form.lineNumber} onChange={(e) => setForm({ ...form, lineNumber: e.target.value.replace(/\D/g, "") })} /></label>
        <label>{tx(["شناسهٔ الگوی کد ورود", "Sign-in code template id", "Vorlagen-ID für den Anmeldecode", "Giriş kodu şablon kimliği"])}<input dir="ltr" value={form.otpTemplateId} onChange={(e) => setForm({ ...form, otpTemplateId: e.target.value.trim() })} /></label>
        <label>{tx(["نام متغیر کد در الگو", "Code placeholder in the template", "Platzhalter für den Code", "Şablondaki kod değişkeni"])}<input dir="ltr" value={form.otpParam} onChange={(e) => setForm({ ...form, otpParam: e.target.value.trim() })} /></label>
        <div className="span-2 domain-actions">
          <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          <Button type="button" disabled={busy || !config.configured} onClick={() => void run(async () => setCheck(await call(API, "POST", { action: "check" })))}>{tx(["بررسی کلید و اعتبار", "Check key and credit", "Schlüssel und Guthaben prüfen", "Anahtarı ve krediyi kontrol et"])}</Button>
          <Button type="button" disabled={busy || !config.configured} onClick={() => void run(async () => setTemplates((await call(API, "POST", { action: "templates" })).templates))}>{tx(["فهرست الگوها", "List templates", "Vorlagen anzeigen", "Şablonları listele"])}</Button>
        </div>
      </form>
      {check && (
        <dl className="domain-detail" role="status">
          <dt>{tx(["اعتبار پنل", "Panel credit", "Guthaben", "Panel kredisi"])}</dt><dd>{typeof check.credit === "number" ? num(check.credit) : String(check.credit)}</dd>
          <dt>{tx(["خطوط مجاز", "Allowed lines", "Erlaubte Nummern", "İzinli hatlar"])}</dt><dd dir="ltr">{((check.lines as string[]) ?? []).join(", ") || "—"}</dd>
          <dt>{tx(["خط ذخیره‌شده", "Saved line", "Gespeicherte Nummer", "Kayıtlı hat"])}</dt><dd>{check.lineConfigured ? tx(["درست است", "Valid", "Gültig", "Geçerli"]) : tx(["در فهرست خطوط مجاز نیست", "Not among the allowed lines", "Nicht unter den erlaubten Nummern", "İzinli hatlar arasında değil"])}</dd>
        </dl>
      )}
      {templates != null && <pre className="fine-print" dir="ltr" style={{ whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>{JSON.stringify(templates, null, 2)}</pre>}
    </section>
  );
}

function PhoneSignup({ enabled, configured, onChanged }: { enabled: boolean; configured: boolean; onChanged: () => void }) {
  const { tx } = useT();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  return (
    <section className="panel">
      <h2>{tx(["ثبت‌نام و ورود با موبایل", "Mobile sign-up and sign-in", "Registrierung und Anmeldung per Handy", "Cep telefonuyla kayıt ve giriş"])}</h2>
      <p role="status">{enabled ? tx(["روشن: کاربران تازه می‌توانند با کد پیامکی ثبت‌نام کنند.", "On: new users can sign up with an SMS code.", "An: Neue Nutzer können sich per SMS-Code registrieren.", "Açık: yeni kullanıcılar SMS koduyla kaydolabilir."]) : tx(["خاموش: فقط حساب‌هایی که شماره دارند با کد وارد می‌شوند؛ ثبت‌نام تازه با ایمیل است.", "Off: only accounts that already have a number sign in by code; new sign-ups use email.", "Aus: Nur Konten mit Nummer melden sich per Code an; neue Registrierungen per E-Mail.", "Kapalı: yalnızca numarası olan hesaplar kodla girer; yeni kayıtlar e-postayla."])}</p>
      {!configured && <p className="plan-notice">{tx(["قبل از روشن‌کردن، کلید و شناسهٔ الگوی کد ورود را ذخیره و با کد آزمایشی بررسی کنید.", "Before switching on, save the key and the sign-in template id, and check them with a test code.", "Vor dem Einschalten Schlüssel und Vorlagen-ID speichern und mit einem Testcode prüfen.", "Açmadan önce anahtarı ve şablon kimliğini kaydedip test koduyla kontrol edin."])}</p>}
      <div className="domain-actions">
        <label>{tx(["ارسال کد آزمایشی به", "Send a test code to", "Testcode senden an", "Test kodunu gönder"])}<input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" /></label>
        <Button disabled={busy || !configured || !phone.trim()} onClick={() => void run(async () => { await call(API, "POST", { action: "testCode", phone }); toast.success(tx(["کد آزمایشی فرستاده شد؛ رسیدن آن را روی گوشی بررسی کنید.", "Test code sent; check that it arrives on the phone.", "Testcode gesendet; Eingang am Handy prüfen.", "Test kodu gönderildi; telefona gelip gelmediğini kontrol edin."])); })}>{tx(["ارسال کد آزمایشی", "Send test code", "Testcode senden", "Test kodu gönder"])}</Button>
        <Button variant={enabled ? undefined : "primary"} disabled={busy || (!enabled && !configured)} onClick={() => void run(async () => { await call(API, "POST", { action: "phoneSignup", enabled: !enabled }); onChanged(); })}>
          {enabled ? tx(["خاموش کردن ثبت‌نام با موبایل", "Turn mobile sign-up off", "Handy-Registrierung ausschalten", "Cep kaydını kapat"]) : tx(["روشن کردن ثبت‌نام با موبایل", "Turn mobile sign-up on", "Handy-Registrierung einschalten", "Cep kaydını aç"])}
        </Button>
      </div>
    </section>
  );
}

const PLANS = ["FREE", "STUDENT_MONTHLY", "STUDENT_QUARTERLY", "PRO", "BUSINESS", "TEAM"];

function Composer({ configured, onSent }: { configured: boolean; onSent: () => void }) {
  const { tx, num } = useT();
  const [kind, setKind] = useState<"users" | "phones" | "segment">("users");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string | null; phone: string | null; email: string | null }[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [phones, setPhones] = useState("");
  const [segment, setSegment] = useState<{ plans: string[]; paid: "" | "paid" | "unpaid"; days: string; consentedOnly: boolean }>({ plans: [], paid: "", days: "", consentedOnly: false });
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const audience = (): Audience => kind === "users" ? { type: "users", userIds: Object.keys(picked) }
    : kind === "phones" ? { type: "phones", phones: phones.split(/[\s,،]+/).filter(Boolean) }
    : { type: "segment", segment: { ...(segment.plans.length ? { plans: segment.plans } : {}), ...(segment.paid ? { paid: segment.paid } : {}), ...(Number(segment.days) > 0 ? { signedUpWithinDays: Number(segment.days) } : {}), ...(segment.consentedOnly ? { consentedOnly: true } : {}) } };
  const reset = () => { setPreview(null); };
  const search = async () => {
    const d = await call(`/api/admin/users?search=${encodeURIComponent(query)}&page=1`, "GET");
    setFound(((d.users as Row[]) ?? []).map((u) => ({ id: String(u.id), name: (u.name as string) ?? null, phone: (u.phone as string) ?? null, email: (u.email as string) ?? null })));
  };
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };

  return (
    <section className="panel">
      <h2>{tx(["ارسال پیامک به کاربران", "Message users by SMS", "SMS an Nutzer", "Kullanıcılara SMS"])}</h2>
      {!configured && <p className="plan-notice">{tx(["برای ارسال، کلید و شمارهٔ خط را ذخیره کنید.", "Save the key and the line number to send.", "Zum Senden Schlüssel und Nummer speichern.", "Göndermek için anahtarı ve hat numarasını kaydedin."])}</p>}
      <div className="chips" role="radiogroup">
        {([["users", ["یک یا چند کاربر", "One or more users", "Ein oder mehrere Nutzer", "Bir veya birkaç kullanıcı"]], ["segment", ["دسته‌ای از مشتریان", "A customer segment", "Kundensegment", "Müşteri segmenti"]], ["phones", ["شماره‌های دلخواه", "Typed numbers", "Eingegebene Nummern", "Yazılan numaralar"]]] as [typeof kind, Tx][]).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "selected" : ""} onClick={() => { setKind(k); reset(); }}>{tx(label)}</button>
        ))}
      </div>
      {kind === "users" && (
        <div>
          <div className="domain-actions">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or mobile", "Name, E-Mail oder Handy", "Ad, e-posta veya cep"])} aria-label={tx(["جست‌وجوی کاربر", "Search users", "Nutzer suchen", "Kullanıcı ara"])} />
            <Button disabled={busy || !query.trim()} onClick={() => void run(search)}>{tx(["جست‌وجو", "Search", "Suchen", "Ara"])}</Button>
          </div>
          {found.map((u) => (
            <label className="toggle-row" key={u.id}>
              <span><strong>{u.name || u.email || u.id}</strong> <bdi dir="ltr" className="muted">{u.phone || tx(["بدون موبایل", "no mobile", "keine Nummer", "numara yok"])}</bdi></span>
              <input type="checkbox" disabled={!u.phone} checked={!!picked[u.id]} onChange={(e) => { reset(); setPicked((p) => { const n = { ...p }; if (e.target.checked) n[u.id] = u.name || u.email || u.id; else delete n[u.id]; return n; }); }} />
            </label>
          ))}
          {!!Object.keys(picked).length && <p className="muted">{tx(["انتخاب‌شده: ", "Selected: ", "Ausgewählt: ", "Seçilen: "])}{Object.values(picked).join("، ")}</p>}
        </div>
      )}
      {kind === "phones" && (
        <label>{tx(["شماره‌ها (هر خط یا با ویرگول)", "Numbers (one per line or comma-separated)", "Nummern (pro Zeile oder mit Komma)", "Numaralar (satır başına veya virgülle)"])}<textarea dir="ltr" rows={4} value={phones} onChange={(e) => { reset(); setPhones(e.target.value); }} /></label>
      )}
      {kind === "segment" && (
        <div className="domain-fields">
          <fieldset className="span-2"><legend>{tx(["پلن", "Plan", "Tarif", "Plan"])}</legend>
            <div className="chips">{PLANS.map((p) => <button key={p} type="button" className={segment.plans.includes(p) ? "selected" : ""} aria-pressed={segment.plans.includes(p)} onClick={() => { reset(); setSegment((s) => ({ ...s, plans: s.plans.includes(p) ? s.plans.filter((x) => x !== p) : [...s.plans, p] })); }}><bdi dir="ltr">{p}</bdi></button>)}</div>
            <small className="muted">{tx(["هیچ پلنی انتخاب نشود یعنی همهٔ پلن‌ها.", "No plan selected means every plan.", "Keine Auswahl = alle Tarife.", "Seçim yoksa tüm planlar."])}</small>
          </fieldset>
          <label>{tx(["خرید", "Purchases", "Käufe", "Satın alma"])}
            <select value={segment.paid} onChange={(e) => { reset(); setSegment({ ...segment, paid: e.target.value as typeof segment.paid }); }}>
              <option value="">{tx(["همه", "Everyone", "Alle", "Herkes"])}</option>
              <option value="paid">{tx(["حداقل یک خرید موفق", "At least one purchase", "Mindestens ein Kauf", "En az bir satın alma"])}</option>
              <option value="unpaid">{tx(["بدون خرید", "No purchase yet", "Noch kein Kauf", "Henüz satın alma yok"])}</option>
            </select>
          </label>
          <label>{tx(["ثبت‌نام در چند روز اخیر (خالی = همه)", "Signed up in the last N days (empty = all)", "In den letzten N Tagen registriert (leer = alle)", "Son N günde kaydolanlar (boş = hepsi)"])}<input inputMode="numeric" dir="ltr" value={segment.days} onChange={(e) => { reset(); setSegment({ ...segment, days: e.target.value.replace(/\D/g, "") }); }} /></label>
          <label className="toggle-row"><span>{tx(["فقط کسانی که اجازهٔ پیام تبلیغاتی داده‌اند", "Only customers who agreed to marketing messages", "Nur mit Werbeeinwilligung", "Yalnızca pazarlama izni verenler"])}</span><input type="checkbox" checked={segment.consentedOnly} onChange={(e) => { reset(); setSegment({ ...segment, consentedOnly: e.target.checked }); }} /></label>
        </div>
      )}
      <p className="fine-print">{tx(["کاربرانی که از پیام‌های تبلیغاتی انصراف داده‌اند، مدیران و حساب‌های مسدود هیچ‌وقت در فهرست نیستند.", "Customers who opted out of marketing, admins and blocked accounts are never included.", "Abgemeldete Kunden, Admins und gesperrte Konten sind nie dabei.", "Pazarlamadan çıkanlar, yöneticiler ve engelli hesaplar asla dahil edilmez."])}</p>
      <label>{tx(["متن پیامک", "Message text", "Nachrichtentext", "Mesaj metni"])}
        <textarea rows={4} maxLength={600} value={text} onChange={(e) => { reset(); setText(e.target.value); }} />
        <small className="muted">{num(text.length)} / {num(600)} · {tx(["حدود ", "about ", "etwa ", "yaklaşık "])}{num(Math.max(1, Math.ceil(text.length / 70)))} {tx(["پیامک برای هر نفر", "SMS per person", "SMS pro Person", "kişi başı SMS"])}</small>
      </label>
      <div className="domain-actions">
        <Button disabled={busy || !configured || text.trim().length < 2} onClick={() => void run(async () => setPreview(await call(API + "/send", "POST", { audience: audience(), text, preview: true })))}>{tx(["پیش‌نمایش گیرندگان", "Preview recipients", "Empfänger anzeigen", "Alıcıları önizle"])}</Button>
        {preview && Number(preview.recipients) > 0 && <Button variant="primary" disabled={busy} onClick={() => setConfirming(true)}>{tx(["ارسال به ", "Send to ", "Senden an ", "Gönder: "])}{num(Number(preview.recipients))}{tx([" نفر", " people", " Personen", " kişi"])}</Button>}
      </div>
      {preview && (
        <p role="status">
          {num(Number(preview.recipients))} {tx(["گیرنده با شمارهٔ معتبر", "recipients with a valid number", "Empfänger mit gültiger Nummer", "geçerli numaralı alıcı"])}
          {Number(preview.skipped) > 0 && <> · {num(Number(preview.skipped))} {tx(["کنار گذاشته شد (بدون شماره، انصراف یا تکراری)", "left out (no number, opted out or duplicate)", "ausgelassen (keine Nummer, abgemeldet oder doppelt)", "dışarıda (numara yok, çıkmış veya yinelenen)"])}</>}
          {((preview.sample as string[]) ?? []).length > 0 && <> · <bdi dir="ltr">{(preview.sample as string[]).join(", ")}</bdi></>}
        </p>
      )}
      {confirming && preview && (
        <Modal title={tx(["تأیید ارسال", "Confirm send", "Senden bestätigen", "Gönderimi onayla"])} onClose={() => !busy && setConfirming(false)}>
          <p>{tx(["این پیامک واقعاً به ", "This SMS really goes to ", "Diese SMS geht wirklich an ", "Bu SMS gerçekten "])}{num(Number(preview.recipients))}{tx([" نفر فرستاده می‌شود و هزینهٔ آن از اعتبار پنل کم می‌شود. قابل برگشت نیست.", " people and is charged to the panel credit. It cannot be undone.", " Personen und wird vom Guthaben abgezogen. Nicht rückgängig zu machen.", " kişiye gider ve panel kredisinden düşülür. Geri alınamaz."])}</p>
          <blockquote style={{ whiteSpace: "pre-wrap" }}>{text}</blockquote>
          <div className="domain-actions">
            <Button variant="primary" disabled={busy} onClick={() => void run(async () => {
              const r = await call(API + "/send", "POST", { audience: audience(), text, confirmCount: Number(preview.recipients) });
              toast.success(`${tx(["فرستاده شد: ", "Sent: ", "Gesendet: ", "Gönderildi: "])}${num(Number(r.sent))} · ${tx(["ناموفق: ", "failed: ", "fehlgeschlagen: ", "başarısız: "])}${num(Number(r.failed))}`);
              setConfirming(false); setPreview(null); setText(""); onSent();
            })}>{tx(["ارسال", "Send", "Senden", "Gönder"])}</Button>
            <Button disabled={busy} onClick={() => setConfirming(false)}>{tx(["انصراف", "Cancel", "Abbrechen", "Vazgeç"])}</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function History({ rows }: { rows: Broadcast[] }) {
  const { tx, num, when } = useT();
  const kind = (a: string) => { try { const t = (JSON.parse(a) as { type?: string }).type; return t === "users" ? tx(["کاربران انتخابی", "Picked users", "Ausgewählte Nutzer", "Seçili kullanıcılar"]) : t === "phones" ? tx(["شماره‌های دلخواه", "Typed numbers", "Eingegebene Nummern", "Yazılan numaralar"]) : tx(["دسته", "Segment", "Segment", "Segment"]); } catch { return "—"; } };
  return (
    <section className="panel">
      <h2>{tx(["ارسال‌های اخیر", "Recent sends", "Letzte Sendungen", "Son gönderimler"])}</h2>
      {!rows.length ? <p className="muted">{tx(["هنوز پیامکی از اینجا فرستاده نشده است.", "No SMS has been sent from here yet.", "Von hier wurde noch keine SMS gesendet.", "Buradan henüz SMS gönderilmedi."])}</p> : (
        <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["زمان", "When", "Wann", "Zaman"], ["گیرندگان", "Audience", "Empfänger", "Alıcılar"], ["متن", "Text", "Text", "Metin"], ["تعداد", "Recipients", "Anzahl", "Sayı"], ["موفق", "Sent", "Gesendet", "Gönderildi"], ["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], ["وضعیت", "Status", "Status", "Durum"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td>{when(r.createdAt)}</td><td>{kind(r.audience)}</td><td><span className="cell-clamp">{r.text}</span></td><td>{num(r.recipients)}</td><td>{num(r.sent)}</td><td>{num(r.failed)}</td>
              <td>{r.status === "done" ? tx(["انجام شد", "Done", "Fertig", "Tamam"]) : r.status === "failed" ? tx(["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"]) : tx(["در حال ارسال", "Sending", "Wird gesendet", "Gönderiliyor"])}{r.error && <small className="muted"> · {r.error}</small>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
