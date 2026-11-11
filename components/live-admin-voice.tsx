"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin voice pages on aifekr.com:
 * - LiveVoiceStudioAdmin (/admin/voice-studio): /api/admin/voice-studio — readiness, a free
 *   connection test (never synthesises), policy versions (price changes are listed and confirmed
 *   before saving), usage and reconciliation of uncertain jobs.
 * - LiveVoiceAgentAdmin (/admin/voice-agent): Vapi and Telnyx setup (keys write-only), number
 *   assignment, call settlement, and per-user voice plans.
 */
type Tx = [string, string, string, string];
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  return { n, i, tx };
}
async function api<T = Row>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(Error(d.code || d.error || "HTTP_" + r.status), { code: d.code || d.error });
  return d as T;
}

/* ───────────────────────── Voice Studio ───────────────────────── */

type Policy = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const LIMITS: [string, Tx][] = [
  ["maxCharacters", ["سقف نویسهٔ پروژه", "Project character limit", "Zeichenlimit pro Projekt", "Proje karakter sınırı"]],
  ["maxDurationSeconds", ["سقف ثانیهٔ هر خروجی", "Max seconds per output", "Max. Sekunden pro Ausgabe", "Çıktı başına azami saniye"]],
  ["maxConcurrent", ["هم‌زمانی سراسری", "Global concurrency", "Globale Parallelität", "Genel eşzamanlılık"]],
  ["maxPendingPerUser", ["کارهای معلق هر کاربر", "Pending jobs per user", "Offene Jobs pro Nutzer", "Kullanıcı başına bekleyen"]],
  ["dailyJobs", ["کارهای روزانهٔ هر کاربر", "Daily jobs per user", "Tägliche Jobs pro Nutzer", "Kullanıcı başına günlük"]],
  ["retentionDays", ["روزهای نگهداری فایل", "File retention days", "Aufbewahrungstage", "Dosya saklama günleri"]],
  ["trialGenerations", ["نمونهٔ آزمایشی برای پلن‌های دیگر (۰ = خاموش)", "Trial samples for other plans (0 = off)", "Testmuster für andere Tarife (0 = aus)", "Diğer planlar için deneme (0 = kapalı)"]],
  ["trialMaxSeconds", ["سقف ثانیهٔ نمونهٔ آزمایشی", "Trial sample max seconds", "Max. Sekunden Testmuster", "Deneme azami saniye"]],
];
const PRICE_KEYS = ["creditsPerInterval", "billingInterval", "trialFree", "paidAccess", "enabled", "creditUsd", "modelUsdPer1k", "allowedPlans"];
const VOICE_ERRORS: Record<string, Tx> = {
  ADMIN_REQUIRED: ["نیاز به دسترسی مدیر", "Admin access required", "Admin-Zugriff nötig", "Yönetici erişimi gerekli"],
  PROVIDER_UNAUTHORIZED: ["کلید ElevenLabs معتبر نیست یا دسترسی ندارد (403).", "The ElevenLabs key is invalid or lacks access (403).", "ElevenLabs-Schlüssel ungültig oder ohne Zugriff (403).", "ElevenLabs anahtarı geçersiz veya yetkisiz (403)."],
  STORAGE_NOT_CONFIGURED: ["ذخیره‌سازی خصوصی تنظیم نشده است.", "Private storage is not configured.", "Privater Speicher nicht eingerichtet.", "Özel depolama ayarlı değil."],
  INVALID_JSON: ["JSON پیشرفته معتبر نیست.", "The advanced JSON is invalid.", "Erweitertes JSON ungültig.", "Gelişmiş JSON geçersiz."],
};

export function LiveVoiceStudioAdmin() {
  const { n, tx } = useT();
  const [data, setData] = useState<Row | null>(null);
  const [s, setS] = useState<Policy | null>(null);
  const [secret, setSecret] = useState("");
  const [advanced, setAdvanced] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [review, setReview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);
  const [confirmSave, setConfirmSave] = useState<string[] | null>(null);
  const err = (code: string) => (VOICE_ERRORS[code] ? tx(VOICE_ERRORS[code]) : code);
  const load = useCallback(async () => {
    const d = await api("/api/admin/voice-studio", { cache: "no-store" });
    setData(d); setS(d.settings);
    setAdvanced(JSON.stringify({ allowedPlans: d.settings.allowedPlans, allowedVoices: d.settings.allowedVoices, modelUsdPer1k: d.settings.modelUsdPer1k, priceSource: d.settings.priceSource, priceVerifiedAt: d.settings.priceVerifiedAt, creditUsd: d.settings.creditUsd }, null, 2));
  }, []);
  useEffect(() => { void load().catch((e) => toast.error(err(e.message))); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(body: Record<string, unknown>, done?: string) {
    setBusy(true);
    try {
      const d = await api("/api/admin/voice-studio", { method: "POST", body: JSON.stringify(body) });
      if (body.action === "test") { setData((p) => (p ? { ...p, catalog: d } : p)); toast.success(tx(["اتصال برقرار است؛ صداها و مدل‌ها دریافت شد.", "Connected; voices and models loaded.", "Verbunden; Stimmen und Modelle geladen.", "Bağlandı; sesler ve modeller alındı."])); }
      else { setSecret(""); await load(); if (done) toast.success(done); }
      return true;
    } catch (e) { toast.error(err(e instanceof Error ? e.message : "REQUEST_FAILED")); return false; } finally { setBusy(false); }
  }
  function merged(): Policy | null {
    if (!s) return null;
    try { return { ...s, ...JSON.parse(advanced) }; } catch { toast.error(err("INVALID_JSON")); return null; }
  }
  function askSave() {
    const next = merged();
    if (!next || !data) return;
    const before = data.settings as Policy;
    const changes = PRICE_KEYS.filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k])).map((k) => `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(next[k])}`);
    setConfirmSave(changes);
  }
  if (!data || !s) return <section className="panel" aria-busy="true" />;
  const rows: Row[] = (data.rows as Row[]).filter((r) => `${r.id} ${r.userId} ${r.status}`.toLowerCase().includes(filter.toLowerCase()));
  const unprofitable = s.creditUsd != null && (data.rows as Row[]).some((r) => r.providerCostUsd != null && r.chargedCredits * s.creditUsd < r.providerCostUsd);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="AudioLines" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت استودیوی صدا", "Voice Studio management", "Sprachstudio verwalten", "Ses stüdyosu yönetimi"])}</h2>
          <p>{tx(["ارائه‌دهنده، تعرفه، ظرفیت و بررسی رزروهای نامشخص.", "Provider, pricing, capacity and review of uncertain reservations.", "Anbieter, Preise, Kapazität und Prüfung unklarer Reservierungen.", "Sağlayıcı, tarife, kapasite ve belirsiz rezervasyon incelemesi."])}</p>
        </div>
        <Link className="btn" href="/voice-studio">{tx(["باز کردن استودیو", "Open studio", "Studio öffnen", "Stüdyoyu aç"])}</Link>
      </div>
      <div className="stats-grid">
        <div className="panel stat"><span>{tx(["کلید ElevenLabs", "ElevenLabs key", "ElevenLabs-Schlüssel", "ElevenLabs anahtarı"])}</span><strong className={data.configured ? "ok" : "pending"}>{data.configured ? tx(["تنظیم شده", "Set", "Gesetzt", "Ayarlı"]) : tx(["ندارد", "Missing", "Fehlt", "Yok"])}</strong></div>
        <div className="panel stat"><span>{tx(["ذخیره‌سازی خصوصی (R2)", "Private storage (R2)", "Privater Speicher (R2)", "Özel depolama (R2)"])}</span><strong className={data.privateStorage ? "ok" : "pending"}>{data.privateStorage ? "✓" : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["آخرین اجرای worker", "Worker heartbeat", "Worker-Heartbeat", "Worker son çalışma"])}</span><strong className="small-stat">{data.workerHeartbeat ? new Date(data.workerHeartbeat).toLocaleString() : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["تولیدها / کردیت مصرفی", "Jobs / credits charged", "Jobs / verbrauchte Credits", "İşler / harcanan kredi"])}</span><strong>{n(data.totals._count)} / {n(data.totals._sum.chargedCredits || 0)}</strong></div>
      </div>
      <section className="panel">
        <div className="row-between"><h3>{tx(["آمادگی اتصال", "Readiness", "Bereitschaft", "Hazırlık"])}</h3><Button disabled={busy} onClick={() => void act({ action: "test", ...(secret ? { secret } : {}) })}><Icon name="PlugZap" size={15} />{tx(["تست اتصال و دریافت صداها/مدل‌ها", "Test connection & load voices/models", "Verbindung testen & Stimmen laden", "Bağlantıyı test et ve sesleri al"])}</Button></div>
        <p className="fine-print">{tx(["این دکمه هیچ صدایی تولید نمی‌کند و هزینه‌ای ندارد. خطای ۴۰۳ یا نبود ذخیره‌سازی خصوصی مانع فعال‌سازی است.", "This button never synthesises audio and costs nothing. A 403 or missing private storage blocks activation.", "Dieser Knopf erzeugt nie Audio und kostet nichts. 403 oder fehlender Speicher verhindert die Aktivierung.", "Bu düğme ses üretmez ve ücretsizdir. 403 veya eksik depolama etkinleştirmeyi engeller."])}</p>
      </section>

      <section className="panel">
        <h3>{tx(["تنظیمات و نسخهٔ تعرفه", "Settings and pricing version", "Einstellungen und Preisversion", "Ayarlar ve tarife sürümü"])} · v{s.version}</h3>
        <div className="domain-fields">
          <label className="gc-switch"><input type="checkbox" checked={!!s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />{tx(["تولید فعال است", "Generation enabled", "Generierung aktiv", "Üretim açık"])}</label>
          <label className="gc-switch"><input type="checkbox" checked={!!s.paidAccess} onChange={(e) => setS({ ...s, paidAccess: e.target.checked })} />{tx(["دسترسی برای هر مشتری با خرید موفق (از کردیت)", "Open to every customer with a completed purchase (from credits)", "Für alle Kunden mit Kauf (aus Credits)", "Satın alımı olan her müşteriye açık (krediden)"])}</label>
          <label className="span-2">{tx(["کلید جدید ElevenLabs — خالی یعنی بدون تغییر؛ هرگز نمایش داده نمی‌شود", "New ElevenLabs key — blank keeps the current one; never shown", "Neuer ElevenLabs-Schlüssel — leer = unverändert; nie angezeigt", "Yeni ElevenLabs anahtarı — boş = değişmez; asla gösterilmez"])}<input type="password" autoComplete="new-password" dir="ltr" value={secret} onChange={(e) => setSecret(e.target.value)} /></label>
          <label>{tx(["کردیت هر بازه", "Credits per interval", "Credits pro Intervall", "Aralık başına kredi"])}<input type="number" min={1} max={10000} dir="ltr" value={s.creditsPerInterval} onChange={(e) => setS({ ...s, creditsPerInterval: Number(e.target.value) })} /></label>
          <label>{tx(["بازهٔ صورتحساب (ثانیه)", "Billing interval (seconds)", "Abrechnungsintervall (s)", "Hesaplama aralığı (sn)"])}<select value={s.billingInterval} onChange={(e) => setS({ ...s, billingInterval: Number(e.target.value) })}><option value={30}>30</option><option value={20}>20</option></select></label>
          {LIMITS.map(([k, l]) => <label key={k}>{tx(l)}<input type="number" dir="ltr" value={s[k]} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} /></label>)}
          <label className="gc-switch span-2"><input type="checkbox" checked={!!s.trialFree} onChange={(e) => setS({ ...s, trialFree: e.target.checked })} />{tx(["نمونه‌های آزمایشی بدون کسر کردیت", "Trial samples without charging credits", "Testmuster ohne Credit-Abzug", "Kredi düşmeden deneme"])}</label>
        </div>
        <h4>{tx(["مدل‌های مجاز", "Approved models", "Freigegebene Modelle", "Onaylı modeller"])}</h4>
        {data.catalog?.models?.length ? <div className="course-majors">{data.catalog.models.map((m: Row) => <label key={m.id} className="gc-switch"><input type="checkbox" checked={(s.allowedModels as string[]).includes(m.id)} onChange={(e) => setS({ ...s, allowedModels: e.target.checked ? [...s.allowedModels, m.id] : (s.allowedModels as string[]).filter((x) => x !== m.id) })} />{m.name} <small dir="ltr">{(m.languages || []).map((l: Row) => l.id).join(", ")}</small></label>)}</div> : <p className="fine-print">{tx(["برای دیدن مدل‌ها، دکمهٔ تست اتصال را بزنید.", "Run the connection test to list models.", "Verbindung testen, um Modelle zu sehen.", "Modelleri görmek için bağlantıyı test edin."])} ({tx(["مجاز فعلی", "currently allowed", "aktuell erlaubt", "şu an izinli"])}: <bdi dir="ltr">{(s.allowedModels as string[]).join(", ") || "—"}</bdi>)</p>}
        <details>
          <summary className="fine-print">{tx(["پلن‌ها، فهرست صداها و هزینهٔ ارائه‌دهنده (JSON)", "Plans, voice allowlist and provider costs (JSON)", "Tarife, Stimmen und Anbieterkosten (JSON)", "Planlar, sesler ve sağlayıcı maliyeti (JSON)"])}</summary>
          <p className="fine-print">{tx(["modelUsdPer1k هزینهٔ دلار به ازای ۱۰۰۰ نویسه است؛ مقدار نامعلوم را وارد نکنید. منبع و تاریخ تأیید قیمت الزامی است.", "modelUsdPer1k is USD per 1,000 characters; leave unknown costs unset. Prices need a source and verification date.", "modelUsdPer1k = USD je 1.000 Zeichen; Unbekanntes nicht eintragen. Quelle und Prüfdatum nötig.", "modelUsdPer1k = 1.000 karakter başına USD; bilinmeyeni girmeyin. Kaynak ve doğrulama tarihi gerekir."])}</p>
          <textarea className="course-json" dir="ltr" rows={12} value={advanced} onChange={(e) => setAdvanced(e.target.value)} />
        </details>
        <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={askSave}><Icon name="Save" size={15} />{tx(["ذخیره و ثبت نسخهٔ جدید", "Save as a new version", "Als neue Version speichern", "Yeni sürüm olarak kaydet"])}</Button></div>
      </section>

      <section className="panel">
        <h3>{tx(["مصرف و هزینه", "Usage and cost", "Nutzung und Kosten", "Kullanım ve maliyet"])}</h3>
        <dl className="usage-figures">
          <div><dt>{tx(["کردیت مصرفی", "Credits charged", "Verbrauchte Credits", "Harcanan kredi"])}</dt><dd>{n(data.totals._sum.chargedCredits || 0)}</dd></div>
          <div><dt>{tx(["آزادشده از رزرو (موفق)", "Released holds (successful)", "Freigegebene Reservierungen", "Serbest bırakılan rezerv"])}</dt><dd>{n(data.returned?.releasedHold ?? data.totals._sum.refundedCredits ?? 0)}</dd></div>
          <div><dt>{tx(["بازگشتی برای ناموفق", "Refunded for failures", "Erstattet (Fehler)", "Başarısızlar için iade"])}</dt><dd>{n(data.returned?.refundedFailure ?? 0)}</dd></div>
          <div><dt>{tx(["هزینهٔ برآوردی", "Estimated cost", "Geschätzte Kosten", "Tahmini maliyet"])}</dt><dd>{data.totals._sum.providerCostUsd == null ? "—" : "$" + Number(data.totals._sum.providerCostUsd).toFixed(2)}</dd></div>
        </dl>
        {unprofitable && <p className="admin-alert">{tx(["برخی خروجی‌ها ممکن است زیان‌ده باشند؛ هزینهٔ ارائه‌دهنده و تعرفهٔ کردیت را بررسی کنید.", "Some outputs may be unprofitable; review provider cost and credit pricing.", "Einige Ausgaben könnten Verlust machen; Kosten und Preise prüfen.", "Bazı çıktılar zararda olabilir; maliyet ve fiyatı inceleyin."])}</p>}
        <div className="domain-toolbar"><input aria-label={tx(["فیلتر", "Filter", "Filter", "Filtre"])} placeholder={tx(["کاربر، وضعیت یا شناسه", "User, status or id", "Nutzer, Status oder ID", "Kullanıcı, durum veya kimlik"])} value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
        {rows.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["شناسه / کاربر", "ID / user", "ID / Nutzer", "Kimlik / kullanıcı"], ["وضعیت", "Status", "Status", "Durum"], ["مدل", "Model", "Modell", "Model"], ["رزرو", "Reserved", "Reserviert", "Ayrılan"], ["کسرشده", "Charged", "Abgebucht", "Düşülen"], ["بازگشتی", "Refunded", "Erstattet", "İade"], ["USD", "USD", "USD", "USD"]] as Tx[]).map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>
            <td><bdi dir="ltr">{String(r.id).slice(0, 10)}</bdi><small><Link href={"/admin/users/" + encodeURIComponent(r.userId)}>{String(r.userId).slice(0, 10)}</Link></small></td>
            <td><span className={"badge " + (r.status === "REVIEW" ? "amber" : r.status === "FAILED" ? "red" : "")}>{r.status}</span>{r.errorCode && <small>{r.errorCode}</small>}{r.status === "REVIEW" && <Button onClick={() => { setReview(r.id); setNote(""); setOk(false); }}>{tx(["بررسی", "Review", "Prüfen", "İncele"])}</Button>}</td>
            <td><bdi dir="ltr">{r.modelId}</bdi></td><td>{n(r.reservedCredits)}</td><td>{n(r.chargedCredits)}</td><td>{n(r.refundedCredits)}</td><td dir="ltr">{r.providerCostUsd ?? "—"}</td>
          </tr>)}</tbody>
        </table></div> : <Empty />}
      </section>

      {confirmSave && (
        <Modal title={tx(["ثبت نسخهٔ جدید تنظیمات", "Save a new settings version", "Neue Einstellungsversion speichern", "Yeni ayar sürümünü kaydet"])} onClose={() => setConfirmSave(null)}>
          {confirmSave.length ? <><p>{tx(["این تغییرات روی قیمت یا دسترسی همهٔ کاربران اثر دارد:", "These changes affect pricing or access for every user:", "Diese Änderungen betreffen Preise oder Zugang aller Nutzer:", "Bu değişiklikler tüm kullanıcıların fiyat veya erişimini etkiler:"])}</p><ul className="usage-changes" dir="ltr">{confirmSave.map((c) => <li key={c}>{c}</li>)}</ul></> : <p>{tx(["قیمت و دسترسی تغییری نکرده؛ فقط سقف‌ها و مدل‌ها ذخیره می‌شوند.", "Pricing and access are unchanged; only limits and models are saved.", "Preise und Zugang unverändert; nur Limits und Modelle.", "Fiyat ve erişim değişmedi; yalnızca sınırlar ve modeller kaydedilir."])}</p>}
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => { const next = merged(); if (next) void act({ action: "settings", settings: next, ...(secret ? { secret } : {}) }, tx(["نسخهٔ جدید ذخیره شد", "New version saved", "Neue Version gespeichert", "Yeni sürüm kaydedildi"])).then((done) => { if (done) setConfirmSave(null); }); }}>{tx(["بله، ذخیره کن", "Yes, save", "Ja, speichern", "Evet, kaydet"])}</Button></div>
        </Modal>
      )}
      {review && (
        <Modal title={tx(["بررسی نتیجهٔ نامشخص", "Reconcile an uncertain outcome", "Unklaren Vorgang prüfen", "Belirsiz sonucu uzlaştır"])} onClose={() => setReview(null)}>
          <p className="fine-print"><bdi dir="ltr">{review}</bdi></p>
          <p>{tx(["اول درخواست و مصرف را در ElevenLabs بررسی کنید. فقط وقتی خروجی قابل تحویلی وجود ندارد، رزرو را آزاد کنید؛ تولید دوباره خودکار انجام نمی‌شود.", "First check the request and usage in ElevenLabs. Release the hold only if no deliverable exists; nothing is regenerated automatically.", "Zuerst Anfrage und Verbrauch bei ElevenLabs prüfen. Nur ohne lieferbares Ergebnis freigeben; keine automatische Wiederholung.", "Önce ElevenLabs'te isteği kontrol edin. Teslim edilebilir çıktı yoksa serbest bırakın; otomatik yeniden üretim yok."])}</p>
          <div className="domain-fields">
            <label className="span-2">{tx(["یادداشت بررسی (حداقل ۲۰ نویسه)", "Review note (20+ characters)", "Prüfnotiz (mind. 20 Zeichen)", "İnceleme notu (20+ karakter)"])}<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <label className="gc-switch span-2"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />{tx(["نبود خروجی قابل تحویل را بررسی و تأیید کردم.", "I checked and confirmed there is no deliverable.", "Ich habe geprüft: kein lieferbares Ergebnis.", "Teslim edilebilir çıktı olmadığını doğruladım."])}</label>
          </div>
          <div className="domain-actions"><Button variant="primary" disabled={busy || !ok || note.trim().length < 20} onClick={() => void act({ action: "reconcileNoOutput", id: review, confirmed: true, note }, tx(["بررسی ثبت و رزرو بازگردانده شد", "Review recorded and hold refunded", "Prüfung gespeichert und erstattet", "İnceleme kaydedildi ve iade edildi"])).then((done) => { if (done) setReview(null); })}>{tx(["ثبت بررسی و بازگشت رزرو", "Record review and refund", "Prüfung speichern und erstatten", "İncelemeyi kaydet ve iade et"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

/* ───────────────────────── Voice agent (call center) ───────────────────────── */

type AgentUser = { id: string; name: string | null; email: string | null; phone: string | null; voicePlan: string; voicePlanExpiry: string | null; _count: { voiceAgents: number; voiceCallLogs: number; voiceAppointments: number } };
const VAPI_FIELDS: [string, Tx, string][] = [
  ["vapi_private_key", ["کلید خصوصی Vapi", "Vapi private key", "Vapi-Privatschlüssel", "Vapi özel anahtarı"], "password"],
  ["vapi_webhook_secret", ["رمز وب‌هوک (حداقل ۳۲ کاراکتر)", "Webhook secret (32+ characters)", "Webhook-Secret (mind. 32 Zeichen)", "Webhook gizli anahtarı (32+ karakter)"], "password"],
  ["vapi_credential_id", ["Vapi Credential ID", "Vapi credential ID", "Vapi Credential ID", "Vapi credential ID"], "text"],
  ["vapi_model", ["مدل OpenAI در Vapi", "OpenAI model in Vapi", "OpenAI-Modell in Vapi", "Vapi'deki OpenAI modeli"], "text"],
  ["vapi_voice_id", ["شناسهٔ صدای ElevenLabs", "ElevenLabs voice id", "ElevenLabs-Stimm-ID", "ElevenLabs ses kimliği"], "text"],
  ["vapi_credits_per_minute", ["کردیت هر دقیقه", "Credits per minute", "Credits pro Minute", "Dakika başına kredi"], "number"],
  ["vapi_max_duration_seconds", ["حداکثر مدت تماس (ثانیه)", "Max call length (seconds)", "Max. Anrufdauer (s)", "Azami arama süresi (sn)"], "number"],
];

export function LiveVoiceAgentAdmin() {
  const { n, tx } = useT();
  const [rows, setRows] = useState<AgentUser[] | null>(null);
  const [stats, setStats] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [plan, setPlan] = useState<{ user: AgentUser; next: "ACTIVE" | "NONE" } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await api(`/api/admin/voice-agent?${new URLSearchParams({ page: String(page), ...(search ? { search } : {}) })}`); setRows(d.users || []); setStats(d.stats || null); setPages(d.totalPages || 1); }
    catch { setRows([]); toast.error(tx(["دریافت کاربران تماس انجام نشد", "Could not load call-center users", "Nutzer konnten nicht geladen werden", "Kullanıcılar yüklenemedi"])); }
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [load]);
  async function applyPlan() {
    if (!plan) return;
    setBusy(true);
    try { await api(`/api/admin/voice-agent/${encodeURIComponent(plan.user.id)}`, { method: "PATCH", body: JSON.stringify({ voicePlan: plan.next, days: 30 }) }); toast.success(plan.next === "ACTIVE" ? tx(["افزونهٔ تماس فعال شد", "Call add-on enabled", "Anruf-Add-on aktiviert", "Arama eklentisi açıldı"]) : tx(["افزونهٔ تماس لغو شد", "Call add-on cancelled", "Anruf-Add-on beendet", "Arama eklentisi iptal edildi"])); setPlan(null); await load(); }
    catch { toast.error(tx(["تغییر پلن انجام نشد", "Plan change failed", "Tarifänderung fehlgeschlagen", "Plan değişmedi"])); } finally { setBusy(false); }
  }
  const cards: [string, Tx, number][] = stats ? [["Users", ["مشترکین فعال", "Active subscribers", "Aktive Abonnenten", "Aktif aboneler"], stats.activeSubscribers], ["Bot", ["ایجنت‌ها", "Agents", "Agenten", "Ajanlar"], stats.totalAgents], ["Hash", ["شمارهٔ متصل", "Numbers assigned", "Zugewiesene Nummern", "Atanmış numara"], stats.agentsWithNumber], ["PhoneCall", ["تماس‌ها", "Calls", "Anrufe", "Aramalar"], stats.totalCalls], ["CalendarDays", ["رزروها", "Bookings", "Buchungen", "Rezervasyonlar"], stats.totalAppointments]] : [];
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="PhoneCall" size={28} /></span>
        <div>
          <h2>{tx(["مرکز تماس هوش مصنوعی", "AI call center", "KI-Callcenter", "Yapay zekâ çağrı merkezi"])}</h2>
          <p>{tx(["راه‌اندازی Vapi و Telnyx، اتصال شماره به مشتری، تسویهٔ تماس‌ها و افزونهٔ تماس کاربران.", "Vapi and Telnyx setup, assigning numbers, call settlement and users' call add-on.", "Vapi- und Telnyx-Einrichtung, Nummernzuweisung, Abrechnung und Anruf-Add-on.", "Vapi ve Telnyx kurulumu, numara atama, arama mutabakatı ve arama eklentisi."])}</p>
        </div>
      </div>
      <div className="stats-grid" aria-busy={!stats}>{cards.map(([icon, l, v]) => <div className="panel stat" key={l[1]}><span><Icon name={icon} size={15} /> {tx(l)}</span><strong>{n(v)}</strong></div>)}</div>
      <VapiSetup />
      <TelnyxSetup />
      <CallSettlement />
      <section className="panel">
        <h3>{tx(["کاربران و افزونهٔ تماس", "Users and call add-on", "Nutzer und Anruf-Add-on", "Kullanıcılar ve arama eklentisi"])}</h3>
        <div className="domain-toolbar"><input aria-label={tx(["جست‌وجو", "Search", "Suche", "Ara"])} placeholder={tx(["نام، ایمیل یا تلفن", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} /></div>
        {rows?.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["کاربر", "User", "Nutzer", "Kullanıcı"], ["افزونه", "Add-on", "Add-on", "Eklenti"], ["ایجنت‌ها", "Agents", "Agenten", "Ajanlar"], ["تماس‌ها", "Calls", "Anrufe", "Aramalar"], ["رزروها", "Bookings", "Buchungen", "Rezervasyonlar"], ["", "", "", ""]] as Tx[]).map((h, k) => <th key={k}>{tx(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>
            <td><Link href={"/admin/users/" + encodeURIComponent(r.id)}>{r.name || r.email || r.phone || r.id}</Link><small><bdi dir="ltr">{r.email || r.phone}</bdi></small></td>
            <td><span className={"badge " + (r.voicePlan === "ACTIVE" ? "green" : "")}>{r.voicePlan === "ACTIVE" ? tx(["فعال", "Active", "Aktiv", "Aktif"]) : tx(["ندارد", "None", "Keins", "Yok"])}</span>{r.voicePlanExpiry && r.voicePlan === "ACTIVE" && <small>{new Date(r.voicePlanExpiry).toLocaleDateString()}</small>}</td>
            <td>{n(r._count.voiceAgents)}</td><td>{n(r._count.voiceCallLogs)}</td><td>{n(r._count.voiceAppointments)}</td>
            <td>{r.voicePlan === "ACTIVE" ? <Button variant="danger" onClick={() => setPlan({ user: r, next: "NONE" })}>{tx(["لغو افزونه", "Cancel add-on", "Add-on beenden", "Eklentiyi iptal et"])}</Button> : <Button onClick={() => setPlan({ user: r, next: "ACTIVE" })}>{tx(["فعال‌سازی ۳۰ روزه", "Enable for 30 days", "30 Tage aktivieren", "30 gün aç"])}</Button>}</td>
          </tr>)}</tbody>
        </table></div> : rows && <Empty />}
        {pages > 1 && <div className="pagination"><span /><div><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button><span>{n(page)} / {n(pages)}</span><Button disabled={page >= pages} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button></div></div>}
      </section>
      {plan && (
        <Modal title={plan.next === "ACTIVE" ? tx(["فعال‌سازی افزونهٔ تماس", "Enable the call add-on", "Anruf-Add-on aktivieren", "Arama eklentisini aç"]) : tx(["لغو افزونهٔ تماس", "Cancel the call add-on", "Anruf-Add-on beenden", "Arama eklentisini iptal et"])} onClose={() => setPlan(null)}>
          <p>{plan.next === "ACTIVE" ? tx([`افزونهٔ تماس برای ${plan.user.name || plan.user.email || plan.user.phone} به مدت ۳۰ روز بدون پرداخت فعال می‌شود.`, `The call add-on is enabled for ${plan.user.name || plan.user.email || plan.user.phone} for 30 days without payment.`, `Das Anruf-Add-on wird für ${plan.user.name || plan.user.email || plan.user.phone} 30 Tage ohne Zahlung aktiviert.`, `Arama eklentisi ${plan.user.name || plan.user.email || plan.user.phone} için ödemesiz 30 gün açılır.`]) : tx([`افزونهٔ تماس ${plan.user.name || plan.user.email || plan.user.phone} همین الان لغو می‌شود.`, `${plan.user.name || plan.user.email || plan.user.phone}'s call add-on is cancelled now.`, `Das Anruf-Add-on von ${plan.user.name || plan.user.email || plan.user.phone} wird sofort beendet.`, `${plan.user.name || plan.user.email || plan.user.phone} arama eklentisi hemen iptal edilir.`])}</p>
          <div className="domain-actions"><Button variant={plan.next === "ACTIVE" ? "primary" : "danger"} disabled={busy} onClick={() => void applyPlan()}>{tx(["بله", "Yes", "Ja", "Evet"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

function VapiSetup() {
  const { tx } = useT();
  const [form, setForm] = useState<Record<string, string>>({});
  const [ready, setReady] = useState<boolean | null>(null);
  const [numbers, setNumbers] = useState<{ id: string; number: string }[]>([]);
  const [agents, setAgents] = useState<Row[]>([]);
  const [agent, setAgent] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await api("/api/admin/voice-agent/config"); setReady(d.apiKeyConfigured && d.webhookConfigured && !!d.credentialId); setForm({ vapi_private_key: "", vapi_webhook_secret: "", vapi_credential_id: d.credentialId ?? "", vapi_model: d.model ?? "", vapi_voice_id: d.voiceId ?? "", vapi_credits_per_minute: String(d.creditsPerMinute ?? ""), vapi_max_duration_seconds: String(d.maxDurationSeconds ?? "") }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); } }
  const save = () => run(async () => { await api("/api/admin/voice-agent/config", { method: "POST", body: JSON.stringify(Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim()))) }); await load(); toast.success(tx(["تنظیمات ذخیره شد", "Settings saved", "Einstellungen gespeichert", "Ayarlar kaydedildi"])); });
  const inventory = () => run(async () => { const d = await api("/api/admin/voice-agent/numbers"); setNumbers(d.numbers); setAgents(d.agents); toast.success(tx(["اتصال Vapi و فهرست شماره‌ها بررسی شد", "Vapi connection and numbers checked", "Vapi-Verbindung und Nummern geprüft", "Vapi bağlantısı ve numaralar kontrol edildi"])); });
  const assign = () => run(async () => { await api(`/api/voice-agent/agents/${encodeURIComponent(agent)}/provision`, { method: "POST", body: JSON.stringify({ phoneNumberId: number }) }); toast.success(tx(["شماره به ایجنت متصل شد", "Number assigned to the agent", "Nummer zugewiesen", "Numara ajana atandı"])); await inventory(); });
  return (
    <details className="panel course-section" open={ready === false}>
      <summary>Vapi · {ready === null ? "…" : ready ? tx(["تنظیمات کامل", "Fully configured", "Vollständig eingerichtet", "Tam ayarlı"]) : tx(["نیازمند تنظیم", "Needs setup", "Einrichtung nötig", "Kurulum gerekli"])}</summary>
      <ol className="fine-print voice-steps">
        <li>{tx(["حساب Vapi را شارژ کنید و شمارهٔ مجازی را در Phone Numbers وارد کنید.", "Top up Vapi and add the virtual number under Phone Numbers.", "Vapi aufladen und Nummer unter Phone Numbers hinzufügen.", "Vapi bakiyesi yükleyin ve numarayı Phone Numbers'a ekleyin."])}</li>
        <li>{tx(["کلید خصوصی و رمز وب‌هوک را اینجا ثبت کنید؛ همان رمز را در Vapi → Server Configuration به‌صورت Bearer Token ذخیره و Credential ID آن را وارد کنید.", "Save the private key and webhook secret here; store the same secret as a Bearer Token in Vapi → Server Configuration and enter its credential ID.", "Schlüssel und Webhook-Secret hier speichern; dasselbe Secret als Bearer Token in Vapi hinterlegen und die Credential ID eintragen.", "Özel anahtarı ve webhook sırrını burada kaydedin; aynı sırrı Vapi'de Bearer Token olarak saklayıp credential ID'yi girin."])}</li>
        <li>{tx(["اتصال را بررسی کنید و هر شماره را فقط به یک ایجنت مشتری متصل کنید.", "Check the connection, then assign each number to exactly one customer agent.", "Verbindung prüfen und jede Nummer genau einem Agenten zuweisen.", "Bağlantıyı kontrol edin; her numarayı tek bir ajana atayın."])}</li>
      </ol>
      <div className="domain-fields">{VAPI_FIELDS.map(([k, l, type]) => <label key={k}>{tx(l)}<input type={type} dir="ltr" autoComplete={type === "password" ? "new-password" : "off"} placeholder={type === "password" ? tx(["خالی = حفظ مقدار ذخیره‌شده", "Blank = keep the saved value", "Leer = gespeicherten Wert behalten", "Boş = kayıtlı değeri koru"]) : ""} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}</div>
      <div className="domain-actions">
        <Button variant="primary" disabled={busy} onClick={() => void save()}><Icon name="Save" size={15} />{tx(["ذخیرهٔ تنظیمات", "Save settings", "Einstellungen speichern", "Ayarları kaydet"])}</Button>
        <Button disabled={busy} onClick={() => void inventory()}><Icon name="PlugZap" size={15} />{tx(["بررسی اتصال و شماره‌ها", "Check connection & numbers", "Verbindung & Nummern prüfen", "Bağlantıyı ve numaraları kontrol et"])}</Button>
      </div>
      {!!numbers.length && <div className="domain-toolbar">
        <select aria-label={tx(["ایجنت مشتری", "Customer agent", "Kunden-Agent", "Müşteri ajanı"])} value={agent} onChange={(e) => setAgent(e.target.value)}><option value="">{tx(["انتخاب ایجنت مشتری", "Pick a customer agent", "Agent wählen", "Ajan seçin"])}</option>{agents.map((a) => <option key={a.id} value={a.id}>{(a.user?.name || a.user?.email) + " · " + a.name}</option>)}</select>
        <select aria-label={tx(["شمارهٔ مجازی", "Virtual number", "Virtuelle Nummer", "Sanal numara"])} value={number} onChange={(e) => setNumber(e.target.value)}><option value="">{tx(["انتخاب شماره", "Pick a number", "Nummer wählen", "Numara seçin"])}</option>{numbers.map((x) => <option key={x.id} value={x.id} disabled={agents.some((a) => a.vapiPhoneNumberId === x.id && a.id !== agent)}>{x.number}</option>)}</select>
        <Button variant="primary" disabled={busy || !agent || !number} onClick={() => void assign()}>{tx(["اتصال شماره به مشتری", "Assign number", "Nummer zuweisen", "Numarayı ata"])}</Button>
      </div>}
    </details>
  );
}

function TelnyxSetup() {
  const { tx } = useT();
  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [numbers, setNumbers] = useState<{ id: string; number: string; status: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/admin/voice-agent/telnyx").then((d) => { setConfigured(d.configured); setCredentialId(d.credentialId ?? ""); }).catch(() => undefined); }, []);
  async function run(action: "save" | "test" | "import", numberId?: string) {
    setBusy(true);
    try {
      const d = await api("/api/admin/voice-agent/telnyx", { method: action === "save" ? "PUT" : "POST", body: JSON.stringify(action === "save" ? { apiKey, publicKey, credentialId } : { action, numberId }) });
      if (action === "save") { setConfigured(configured || !!apiKey); setApiKey(""); setPublicKey(""); }
      if (d.numbers) setNumbers(d.numbers);
      toast.success(tx(["انجام شد", "Done", "Erledigt", "Tamam"]));
    } catch (e) { toast.error((e as { code?: string }).code === "TELNYX_CREDENTIAL_REQUIRED" ? tx(["شناسهٔ اعتبار Telnyx را از کلیدهای Vapi وارد کنید.", "Enter the Telnyx credential ID from the Vapi provider keys.", "Telnyx-Credential-ID aus den Vapi-Schlüsseln eintragen.", "Vapi anahtarlarından Telnyx credential ID girin."]) : tx(["اتصال یا ذخیره انجام نشد؛ کلید و تنظیمات شماره را بررسی کنید.", "Connection or save failed; check the keys and number setup.", "Verbindung oder Speichern fehlgeschlagen; Schlüssel prüfen.", "Bağlantı veya kayıt başarısız; anahtarları kontrol edin."])); }
    finally { setBusy(false); }
  }
  return (
    <details className="panel course-section">
      <summary>Telnyx · {configured ? tx(["کلید API ذخیره شده", "API key saved", "API-Schlüssel gespeichert", "API anahtarı kayıtlı"]) : tx(["هنوز تنظیم نشده", "Not configured", "Nicht eingerichtet", "Ayarlı değil"])}</summary>
      <p className="fine-print">{tx(["کلیدها فقط روی سرور ذخیره می‌شوند. شمارهٔ موجود را بررسی و به سرویس تماس وارد کنید؛ شمارهٔ جدیدی خریده نمی‌شود.", "Keys stay on the server. Check and import an existing number; no number is purchased.", "Schlüssel bleiben auf dem Server. Vorhandene Nummer prüfen und importieren; es wird nichts gekauft.", "Anahtarlar sunucuda kalır. Mevcut numarayı içe aktarın; numara satın alınmaz."])}</p>
      <div className="domain-fields">
        <label>API key<input type="password" dir="ltr" autoComplete="new-password" placeholder={tx(["خالی = بدون تغییر", "Blank = unchanged", "Leer = unverändert", "Boş = değişmez"])} value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></label>
        <label>Public key<input dir="ltr" autoComplete="off" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} /></label>
        <label className="span-2">Vapi Telnyx credential ID<input dir="ltr" autoComplete="off" value={credentialId} onChange={(e) => setCredentialId(e.target.value)} /></label>
      </div>
      <div className="domain-actions">
        <Button variant="primary" disabled={busy} onClick={() => void run("save")}><Icon name="Lock" size={15} />{tx(["ذخیرهٔ امن", "Save securely", "Sicher speichern", "Güvenli kaydet"])}</Button>
        <Button disabled={busy || !configured} onClick={() => void run("test")}><Icon name="PlugZap" size={15} />{tx(["تست اتصال و نمایش شماره‌ها", "Test & list numbers", "Testen & Nummern zeigen", "Test et ve numaraları göster"])}</Button>
      </div>
      {numbers.map((x) => <div key={x.id} className="access-row"><bdi dir="ltr">{x.number} · {x.status}</bdi><Button disabled={busy || x.status !== "active"} onClick={() => void run("import", x.id)}>{tx(["ورود به سرویس تماس", "Import into the call service", "In den Anrufdienst importieren", "Arama hizmetine aktar"])}</Button></div>)}
      <p className="fine-print">{tx(["برای تماس خروجی، Outbound Voice Profile و مقصدهای مجاز را در Telnyx تنظیم کنید.", "For outbound calls, set up an Outbound Voice Profile and allowed destinations in Telnyx.", "Für ausgehende Anrufe in Telnyx ein Outbound Voice Profile einrichten.", "Dış aramalar için Telnyx'te Outbound Voice Profile ayarlayın."])}</p>
    </details>
  );
}

function CallSettlement() {
  const { n, tx } = useT();
  const [calls, setCalls] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => { try { setCalls((await api("/api/admin/voice-agent/calls")).calls); } catch { setCalls([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function reconcile(id: string) {
    setBusy(id);
    try { await api(`/api/admin/voice-agent/calls/${encodeURIComponent(id)}/reconcile`, { method: "POST" }); toast.success(tx(["تسویه بررسی شد", "Settlement checked", "Abrechnung geprüft", "Mutabakat kontrol edildi"])); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(""); }
  }
  const open = calls?.filter((c) => c.billingStatus !== "settled").length ?? 0;
  return (
    <details className="panel course-section">
      <summary>{tx(["مصرف و تسویهٔ تماس‌ها", "Call usage and settlement", "Anrufnutzung und Abrechnung", "Arama kullanımı ve mutabakat"])} ({calls ? n(calls.length) : "…"}{open ? " · " + n(open) + " " + tx(["باز", "open", "offen", "açık"]) : ""})</summary>
      <p className="fine-print">{tx(["مصرف واقعی به ثانیه و رو به بالا حساب می‌شود؛ سقف تماس موقتاً رزرو و با گزارش پایان تسویه می‌شود. «بررسی و تسویه» گزارش Vapi را می‌خواند و فقط مصرف واقعی را کسر می‌کند.", "Usage is billed per second, rounded up; the call cap is reserved and settled from the end-of-call report. “Check & settle” reads the Vapi report and charges only real usage.", "Abrechnung pro Sekunde (aufgerundet); die Obergrenze wird reserviert und per Abschlussbericht abgerechnet. „Prüfen & abrechnen“ liest den Vapi-Bericht.", "Kullanım saniye bazında yukarı yuvarlanır; üst sınır ayrılır ve rapora göre kapatılır. “Kontrol et ve kapat” Vapi raporunu okur."])}</p>
      <div className="domain-actions"><Button onClick={() => void load()}><Icon name="RefreshCw" size={15} />{tx(["به‌روزرسانی", "Refresh", "Aktualisieren", "Yenile"])}</Button></div>
      {calls?.length ? <div className="llm-custom">{calls.map((c) => <div key={c.id} className="access-row">
        <div><strong>{c.user?.name || c.user?.email} · {c.agent?.name}</strong><small>{c.durationSec ?? "—"} {tx(["ثانیه", "s", "s", "sn"])} · {n(c.creditsCharged)} {tx(["کسرشده", "charged", "abgebucht", "düşülen"])} · {n(c.reservedCredits)} {tx(["رزرو", "reserved", "reserviert", "ayrılan"])} · <bdi dir="ltr">{c.vapiCallId || c.id}</bdi></small></div>
        <div className="domain-actions"><span className={"badge " + (c.billingStatus === "settled" ? "green" : "amber")}>{c.billingStatus === "settled" ? tx(["تسویه‌شده", "Settled", "Abgerechnet", "Kapatıldı"]) : tx(["در انتظار گزارش", "Awaiting report", "Bericht ausstehend", "Rapor bekleniyor"])}</span>{c.billingStatus !== "settled" && <Button disabled={!!busy} onClick={() => void reconcile(c.id)}>{tx(["بررسی و تسویه", "Check & settle", "Prüfen & abrechnen", "Kontrol et ve kapat"])}</Button>}</div>
      </div>)}</div> : calls && <Empty />}
    </details>
  );
}
