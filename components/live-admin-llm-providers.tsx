"use client";
/**
 * Admin → LLM Management: dynamic providers (Coarena first) and the Usage &
 * Credits dashboard for every provider.
 *
 * - DynamicProviders: provider card (status, masked key, Test connection, Sync
 *   models, settings, internal limits, fallback) and the synced models table
 *   (search, filter, sort, bulk on/off, default model, today's usage).
 *   Backed by /api/admin/llm/providers[/<id>[/test|/sync|/models]].
 * - LlmUsageCredits: per provider and per model, from /api/admin/llm/usage.
 *   "Provider reported", "Locally tracked" and "Estimated" figures are labelled
 *   and never added together.
 *
 * API keys are write-only: the server returns only the masked form, and the
 * key field is cleared right after saving.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

type Tx = [string, string, string, string];
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  const when = (v: string | null | undefined) => (v ? new Date(v).toLocaleString(tag, { dateStyle: "short", timeStyle: "short" }) : "—");
  return { n, tx, tag, when };
}
async function json<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d as T;
}
const send = (url: string, method: string, body?: unknown) => fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

type Today = { requests: number; errors: number; tokens: number; users: number };
type Model = { id: string; key: string; externalId: string; displayName: string; description: string | null; enabled: boolean; available: boolean; lifecycle: string | null; isDefault: boolean; vision: boolean; tools: boolean; contextWindow: number | null; maxOutputTokens: number | null; priority: number; creditCost: number | null; effectiveCreditCost: number; dailyRequestCap: number | null; ownedBy: string | null; lastSyncedAt: string | null; today: Today };
type Snapshot = { status: "OK" | "ERROR"; error: string | null; creditRemainingUsd: number | null; usedTodayUsd: number | null; dailyLimitUsd: number | null; usedPercent: number | null; requestsToday: number | null; requestsLeft: number | null; dailyRequestLimit: number | null; resetAt: string | null; fetchedAt: string; stale: boolean };
type Limits = { dailyRequestCap: number | null; perUserDailyCap: number | null; maxOutputTokens: number | null; maxConcurrency: number | null; softWarnPercent: number; hardStopPercent: number };
export type ProviderRow = { id: string; name: string; adapter: string; baseUrl: string; enabled: boolean; key: { configured: boolean; source: "env" | "vault" | "none"; envName: string | null; masked: string | null }; healthStatus: "HEALTHY" | "DEGRADED" | "OFFLINE" | "UNKNOWN"; lastHealthAt: string | null; lastSyncAt: string | null; lastSyncError: string | null; lastError: string | null; timeoutMs: number; defaultModelId: string | null; defaultCreditCost: number; limits: Limits; fallbackEnabled: boolean; autoRouting: boolean; snapshot: Snapshot | null; models: Model[] };

export const HEALTH: Record<ProviderRow["healthStatus"], [Tx, string]> = {
  HEALTHY: [["سالم", "Healthy", "Gesund", "Sağlıklı"], "green"],
  DEGRADED: [["محدود", "Degraded", "Eingeschränkt", "Kısıtlı"], "orange"],
  OFFLINE: [["قطع", "Offline", "Offline", "Çevrimdışı"], "red"],
  UNKNOWN: [["نامشخص", "Unknown", "Unbekannt", "Bilinmiyor"], ""],
};
/** Safe error categories from the server, never upstream text. */
export const ERR: Record<string, Tx> = {
  AUTH: ["کلید API پذیرفته نشد", "API key was rejected", "API-Schlüssel abgelehnt", "API anahtarı reddedildi"],
  FORBIDDEN: ["دسترسی حساب محدود است", "Account access is restricted", "Kontozugriff eingeschränkt", "Hesap erişimi kısıtlı"],
  NOT_FOUND: ["مسیر یا مدل پیدا نشد", "Endpoint or model not found", "Endpunkt oder Modell nicht gefunden", "Uç nokta veya model bulunamadı"],
  TIMEOUT: ["پاسخ دیر رسید", "Request timed out", "Zeitüberschreitung", "Zaman aşımı"],
  RATE_LIMIT: ["محدودیت تعداد درخواست", "Rate limited", "Ratenlimit erreicht", "Hız sınırı"],
  QUOTA: ["اعتبار روزانه تمام شده", "Daily credit used up", "Tagesguthaben aufgebraucht", "Günlük kredi bitti"],
  UPSTREAM: ["سرویس در دسترس نیست", "Provider unavailable", "Anbieter nicht verfügbar", "Sağlayıcı kullanılamıyor"],
  BAD_RESPONSE: ["پاسخ غیرمنتظره (احتمالاً قالب API عوض شده)", "Unexpected response (the API format may have changed)", "Unerwartete Antwort (API-Format evtl. geändert)", "Beklenmeyen yanıt (API biçimi değişmiş olabilir)"],
  NETWORK: ["خطای شبکه", "Network error", "Netzwerkfehler", "Ağ hatası"],
  NOT_CONFIGURED: ["کلید یا آدرس تنظیم نشده", "Key or URL not configured", "Schlüssel oder URL fehlt", "Anahtar veya URL ayarlı değil"],
  SUPER_ADMIN_REQUIRED: ["فقط سوپرادمین می‌تواند کلید را تغییر دهد", "Only a super admin can change the key", "Nur Super-Admins können den Schlüssel ändern", "Anahtarı yalnızca süper yönetici değiştirebilir"],
  INVALID_BASE_URL: ["آدرس باید HTTPS باشد", "The URL must use HTTPS", "Die URL muss HTTPS sein", "URL HTTPS olmalı"],
  UNSAFE_BASE_URL: ["این آدرس مجاز نیست (شبکهٔ داخلی)", "This address is not allowed (private network)", "Adresse nicht erlaubt (privates Netz)", "Bu adrese izin yok (özel ağ)"],
  SOFT_ABOVE_HARD: ["آستانهٔ هشدار باید کمتر از توقف باشد", "Warning threshold must be below the hard stop", "Warnschwelle muss unter dem Stopp liegen", "Uyarı eşiği durdurma eşiğinden düşük olmalı"],
  MODEL_UNAVAILABLE: ["مدلی که دیگر ارائه نمی‌شود فعال نمی‌شود", "A model no longer offered cannot be enabled", "Nicht mehr angebotene Modelle lassen sich nicht aktivieren", "Artık sunulmayan model açılamaz"],
  RATE_LIMITED: ["کمی صبر کنید و دوباره امتحان کنید", "Wait a moment and try again", "Kurz warten und erneut versuchen", "Biraz bekleyip tekrar deneyin"],
  INVALID_SETTINGS: ["مقدارها معتبر نیستند", "Some values are not valid", "Einige Werte sind ungültig", "Bazı değerler geçersiz"],
};
export const errText = (code: string | null | undefined, tx: (c: Tx) => string) => (code ? (ERR[code] ? tx(ERR[code]) : code) : "");

export const LIMIT_FIELDS: [keyof Limits, Tx, Tx][] = [
  ["dailyRequestCap", ["سقف درخواست روزانهٔ سرویس", "Provider daily request cap", "Tageslimit Anbieter", "Sağlayıcı günlük istek sınırı"], ["خالی = بدون سقف", "Empty = no cap", "Leer = kein Limit", "Boş = sınırsız"]],
  ["perUserDailyCap", ["سقف روزانهٔ هر کاربر", "Per-user daily cap", "Tageslimit pro Nutzer", "Kullanıcı başına günlük sınır"], ["خالی = بدون سقف", "Empty = no cap", "Leer = kein Limit", "Boş = sınırsız"]],
  ["maxOutputTokens", ["حداکثر توکن خروجی", "Max output tokens", "Max. Ausgabetokens", "Azami çıktı token"], ["خالی = حد خود مدل", "Empty = the model's own limit", "Leer = Modellgrenze", "Boş = modelin kendi sınırı"]],
  ["maxConcurrency", ["حداکثر درخواست هم‌زمان", "Max concurrent requests", "Max. gleichzeitige Anfragen", "Azami eşzamanlı istek"], ["خالی = بدون سقف", "Empty = no cap", "Leer = kein Limit", "Boş = sınırsız"]],
];

export function DynamicProviders() {
  const { tx } = useT();
  const [rows, setRows] = useState<ProviderRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/admin/llm/providers", { credentials: "include" }).then((r) => json<{ providers: ProviderRow[] }>(r)).then((d) => setRows(d.providers)).catch(() => { setFailed(true); setRows((r) => r ?? []); });
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="llm-dynamic" aria-busy={!rows}>
      <div className="row-between">
        <h3>{tx(["سرویس‌دهنده‌های پویا", "Dynamic providers", "Dynamische Anbieter", "Dinamik sağlayıcılar"])}</h3>
      </div>
      <p className="fine-print">{tx(["فهرست مدل‌های این سرویس‌ها از API خودشان همگام می‌شود. مدل‌ها فقط وقتی برای کاربران دیده می‌شوند که سرویس و خود مدل فعال باشند.", "These providers' model lists are synced from their own API. Users only see a model when both the provider and the model are on.", "Die Modelllisten werden über die Anbieter-API synchronisiert. Nutzer sehen ein Modell nur, wenn Anbieter und Modell aktiv sind.", "Bu sağlayıcıların model listeleri kendi API'lerinden eşitlenir. Kullanıcılar bir modeli yalnızca sağlayıcı ve model açıkken görür."])}</p>
      {failed && <div className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{tx(["اطلاعات سرویس‌ها بارگذاری نشد.", "Could not load providers.", "Anbieter konnten nicht geladen werden.", "Sağlayıcılar yüklenemedi."])}</span><Button onClick={load}>{tx(["تلاش دوباره", "Retry", "Erneut", "Tekrar dene"])}</Button></div>}
      {!rows && <div className="skeleton" style={{ height: 180 }} />}
      {rows && !rows.length && !failed && <Empty />}
      {rows?.map((p) => <ProviderCard key={p.id} p={p} reload={load} />)}
    </section>
  );
}

function ProviderCard({ p, reload }: { p: ProviderRow; reload: () => void }) {
  const { n, tx, when } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | "enable" | "disable" | "clearKey" | "save">(null);
  const [key, setKey] = useState("");
  const [form, setForm] = useState(() => formOf(p));
  useEffect(() => { setForm(formOf(p)); }, [p]);
  const health = HEALTH[p.healthStatus] ?? HEALTH.UNKNOWN, label = tx(health[0]);

  async function act(name: string, run: () => Promise<void>) {
    setBusy(name);
    try { await run(); } catch (e) { toast.error(errText(e instanceof Error ? e.message : "", tx) || tx(["انجام نشد", "Failed", "Fehlgeschlagen", "Başarısız"])); } finally { setBusy(null); }
  }
  async function save(body: Record<string, unknown>, okText: Tx) {
    await json(await send(`/api/admin/llm/providers/${p.id}`, "PATCH", body));
    toast.success(tx(okText));
    reload();
  }

  const changes = settingsDiff(p, form);
  return (
    <article className={"panel llm-provider" + (p.enabled ? "" : " off")} aria-label={p.name}>
      <div className="row-between llm-provider-head">
        <div>
          <div className="llm-tags">
            <strong>{p.name}</strong>
            <span className={"badge " + (p.enabled ? "green" : "red")}>{p.enabled ? tx(["فعال", "On", "An", "Açık"]) : tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</span>
            <span className={"badge " + health[1]} role="status">{label}</span>
          </div>
          <small><bdi dir="ltr">{p.baseUrl}</bdi></small>
        </div>
        <div className="domain-actions">
          <Button disabled={!!busy} onClick={() => void act("test", async () => { const d = await json<{ ok: boolean; status: string; latencyMs: number | null; error: string | null }>(await send(`/api/admin/llm/providers/${p.id}/test`, "POST")); if (d.ok) toast.success(tx(["اتصال برقرار است", "Connected", "Verbunden", "Bağlandı"]) + (d.latencyMs != null ? ` · ${n(d.latencyMs)} ms` : "")); else toast.error(errText(d.error, tx) || tx(["اتصال ناموفق", "Connection failed", "Verbindung fehlgeschlagen", "Bağlantı başarısız"])); reload(); })}><Icon name="Zap" size={14} />{busy === "test" ? tx(["در حال تست…", "Testing…", "Teste…", "Test ediliyor…"]) : tx(["تست اتصال", "Test connection", "Verbindung testen", "Bağlantıyı test et"])}</Button>
          <Button disabled={!!busy} onClick={() => void act("sync", async () => { const d = await json<{ ok: boolean; added: number; updated: number; unavailable: number; skipped?: boolean }>(await send(`/api/admin/llm/providers/${p.id}/sync`, "POST")); if (d.skipped) toast(tx(["همگام‌سازی در حال اجراست", "A sync is already running", "Synchronisierung läuft bereits", "Eşitleme zaten çalışıyor"])); else toast.success(tx(["همگام شد", "Synced", "Synchronisiert", "Eşitlendi"]) + ` · +${n(d.added)} · ${n(d.updated)} · −${n(d.unavailable)}`); reload(); })}><Icon name="RefreshCw" size={14} />{busy === "sync" ? tx(["در حال همگام‌سازی…", "Syncing…", "Synchronisiere…", "Eşitleniyor…"]) : tx(["همگام‌سازی مدل‌ها", "Sync models", "Modelle synchronisieren", "Modelleri eşitle"])}</Button>
          <Button variant={p.enabled ? "" : "primary"} disabled={!!busy} onClick={() => setAsk(p.enabled ? "disable" : "enable")}><Icon name="Power" size={14} />{p.enabled ? tx(["غیرفعال کردن سرویس", "Turn provider off", "Anbieter ausschalten", "Sağlayıcıyı kapat"]) : tx(["فعال کردن سرویس", "Turn provider on", "Anbieter einschalten", "Sağlayıcıyı aç"])}</Button>
        </div>
      </div>

      <dl className="llm-facts">
        <div><dt>{tx(["کلید API", "API key", "API-Schlüssel", "API anahtarı"])}</dt><dd>{p.key.configured ? <><bdi dir="ltr">{p.key.masked}</bdi> <small>{p.key.source === "env" ? tx(["از تنظیمات سرور", "from the server environment", "aus der Serverumgebung", "sunucu ortamından"]) + ` (${p.key.envName})` : tx(["ذخیره‌شده (رمزنگاری‌شده)", "saved (encrypted)", "gespeichert (verschlüsselt)", "kayıtlı (şifreli)"])}</small></> : <span className="badge red">{tx(["تنظیم نشده", "Not set", "Nicht gesetzt", "Ayarlı değil"])}{p.key.envName ? ` · ${p.key.envName}` : ""}</span>}</dd></div>
        <div><dt>{tx(["آخرین همگام‌سازی", "Last sync", "Letzte Synchronisierung", "Son eşitleme"])}</dt><dd>{when(p.lastSyncAt)}{p.lastSyncError && <small className="fail"> · {errText(p.lastSyncError, tx)}</small>}</dd></div>
        <div><dt>{tx(["آخرین بررسی سلامت", "Last health check", "Letzter Health-Check", "Son sağlık kontrolü"])}</dt><dd>{when(p.lastHealthAt)}</dd></div>
        <div><dt>{tx(["آخرین خطا", "Last error", "Letzter Fehler", "Son hata"])}</dt><dd>{p.lastError ? <span className="fail">{errText(p.lastError, tx)}</span> : "—"}</dd></div>
      </dl>
      <p className="fine-print llm-privacy"><Icon name="ShieldAlert" size={14} /> {tx(["پیام‌هایی که به این سرویس فرستاده می‌شوند تابع شرایط و سیاست حریم خصوصی همان سرویس‌اند. آی‌فکر متن گفتگوها را در گزارش مصرف ذخیره نمی‌کند.", "Messages sent to this provider are subject to the provider's own terms and privacy policy. AIFekr does not store conversation text in the usage ledger.", "An diesen Anbieter gesendete Nachrichten unterliegen dessen Bedingungen und Datenschutz. AIFekr speichert keine Gesprächstexte im Nutzungsprotokoll.", "Bu sağlayıcıya gönderilen mesajlar sağlayıcının kendi koşullarına ve gizlilik politikasına tabidir. AIFekr kullanım kaydında konuşma metni saklamaz."])} {tx(["«تست اتصال» و «همگام‌سازی» رایگان‌اند و هیچ مدلی را صدا نمی‌زنند.", "“Test connection” and “Sync models” are free and call no model.", "„Verbindung testen“ und „Synchronisieren“ sind kostenlos und rufen kein Modell auf.", "“Bağlantıyı test et” ve “Eşitle” ücretsizdir ve model çağırmaz."])}</p>

      <details className="llm-settings">
        <summary>{tx(["تنظیمات، محدودیت‌ها و کلید", "Settings, limits and key", "Einstellungen, Limits und Schlüssel", "Ayarlar, sınırlar ve anahtar"])}</summary>
        <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); if (changes.length) setAsk("save"); }}>
          <label className="span-2">Base URL<input dir="ltr" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} /></label>
          <label>{tx(["مهلت پاسخ (ثانیه)", "Timeout (seconds)", "Timeout (Sekunden)", "Zaman aşımı (saniye)"])}<input type="number" min={5} max={300} value={form.timeoutSec} onChange={(e) => setForm({ ...form, timeoutSec: e.target.value })} /></label>
          <label>{tx(["مدل پیش‌فرض", "Default model", "Standardmodell", "Varsayılan model"])}<select value={form.defaultModelId} onChange={(e) => setForm({ ...form, defaultModelId: e.target.value })}><option value="">—</option>{p.models.filter((m) => m.available).map((m) => <option key={m.externalId} value={m.externalId}>{m.displayName}</option>)}</select></label>
          <label>{tx(["اعتبار پیش‌فرض هر پاسخ", "Default credits per answer", "Standard-Credits pro Antwort", "Yanıt başına varsayılan kredi"])}<input type="number" min={0} max={1000} value={form.defaultCreditCost} onChange={(e) => setForm({ ...form, defaultCreditCost: e.target.value })} /></label>
          {LIMIT_FIELDS.map(([k, l, hint]) => <label key={k}>{tx(l)}<input type="number" min={0} placeholder={tx(hint)} value={form.limits[k]} onChange={(e) => setForm({ ...form, limits: { ...form.limits, [k]: e.target.value } })} /></label>)}
          <label>{tx(["هشدار در (٪ سقف)", "Warn at (% of cap)", "Warnen bei (% des Limits)", "Uyarı (% sınır)"])}<input type="number" min={1} max={100} value={form.limits.softWarnPercent} onChange={(e) => setForm({ ...form, limits: { ...form.limits, softWarnPercent: e.target.value } })} /></label>
          <label>{tx(["توقف در (٪ سقف)", "Hard stop at (% of cap)", "Stopp bei (% des Limits)", "Durdurma (% sınır)"])}<input type="number" min={1} max={200} value={form.limits.hardStopPercent} onChange={(e) => setForm({ ...form, limits: { ...form.limits, hardStopPercent: e.target.value } })} /></label>
          <label className="check-label span-2"><input type="checkbox" checked={form.fallbackEnabled} onChange={(e) => setForm({ ...form, fallbackEnabled: e.target.checked })} />{tx(["اگر مدل این سرویس خطا داد، مدل‌های دیگر آی‌فکر پاسخ بدهند (fallback)", "If a model of this provider fails, let AIFekr's other models answer (fallback)", "Wenn ein Modell dieses Anbieters ausfällt, antworten andere AIFekr-Modelle (Fallback)", "Bu sağlayıcının modeli hata verirse AIFekr'in diğer modelleri yanıtlasın (yedek)"])}</label>
          <label className="check-label span-2"><input type="checkbox" checked={form.autoRouting} onChange={(e) => setForm({ ...form, autoRouting: e.target.checked })} />{tx(["مدل پیش‌فرض این سرویس در مسیریابی «خودکار» به‌عنوان آخرین گزینه استفاده شود", "Use this provider's default model as a last resort in “auto” routing", "Standardmodell als letzte Option im „Automatik“-Routing nutzen", "Varsayılan modeli “otomatik” yönlendirmede son çare olarak kullan"])}</label>
          <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={!changes.length || !!busy}>{tx(["ذخیرهٔ تنظیمات", "Save settings", "Einstellungen speichern", "Ayarları kaydet"])}{changes.length ? ` (${n(changes.length)})` : ""}</Button></div>
        </form>
        <form className="domain-fields llm-key" onSubmit={(e) => { e.preventDefault(); if (key.trim()) void act("key", async () => { await save({ apiKey: key.trim() }, ["کلید ذخیره شد", "Key saved", "Schlüssel gespeichert", "Anahtar kaydedildi"]); setKey(""); }); }}>
          <label className="span-2">{tx(["کلید API جدید (فقط ذخیره می‌شود، دیگر نمایش داده نمی‌شود؛ فقط سوپرادمین)", "New API key (stored encrypted, never shown again; super admin only)", "Neuer API-Schlüssel (verschlüsselt gespeichert, nie wieder angezeigt; nur Super-Admin)", "Yeni API anahtarı (şifreli saklanır, bir daha gösterilmez; yalnızca süper yönetici)"])}<input type="password" dir="ltr" autoComplete="new-password" value={key} onChange={(e) => setKey(e.target.value)} /></label>
          <div className="span-2 domain-actions">
            <Button type="submit" disabled={!key.trim() || !!busy}>{tx(["ذخیرهٔ کلید", "Save key", "Schlüssel speichern", "Anahtarı kaydet"])}</Button>
            {p.key.source === "vault" && <Button variant="danger" disabled={!!busy} onClick={() => setAsk("clearKey")}>{tx(["استفاده از کلید سرور", "Use server key", "Server-Schlüssel nutzen", "Sunucu anahtarını kullan"])}</Button>}
          </div>
        </form>
      </details>

      <ModelsTable p={p} reload={reload} />

      {ask && (
        <Modal title={ask === "save" ? tx(["ذخیرهٔ تنظیمات", "Save settings", "Einstellungen speichern", "Ayarları kaydet"]) : ask === "clearKey" ? tx(["حذف کلید ذخیره‌شده", "Remove saved key", "Gespeicherten Schlüssel entfernen", "Kayıtlı anahtarı kaldır"]) : p.name} onClose={() => setAsk(null)}>
          {ask === "enable" && <p>{tx(["با فعال کردن، مدل‌هایی که روشن کرده‌اید برای کاربران قابل انتخاب می‌شوند و درخواست‌هایشان به این سرویس فرستاده می‌شود.", "Once on, the models you enabled can be picked by users and their requests go to this provider.", "Danach können Nutzer die aktivierten Modelle wählen; Anfragen gehen an diesen Anbieter.", "Açıldığında, açtığınız modeller kullanıcılarca seçilebilir ve istekler bu sağlayıcıya gider."])}</p>}
          {ask === "disable" && <p>{tx(["همهٔ مدل‌های این سرویس فوراً از انتخاب‌گر کاربران حذف می‌شوند.", "All of this provider's models leave the users' model picker right away.", "Alle Modelle dieses Anbieters verschwinden sofort aus der Modellauswahl.", "Bu sağlayıcının tüm modelleri kullanıcı seçicisinden hemen kalkar."])}</p>}
          {ask === "clearKey" && <p>{tx(["کلید ذخیره‌شده پاک می‌شود و از این به بعد کلید تنظیمات سرور استفاده می‌شود.", "The saved key is erased and the server environment key is used from now on.", "Der gespeicherte Schlüssel wird gelöscht; ab jetzt gilt der Server-Schlüssel.", "Kayıtlı anahtar silinir; bundan sonra sunucu anahtarı kullanılır."])}</p>}
          {ask === "save" && <ul className="llm-changes">{changes.map(([k, v]) => <li key={k}><bdi dir="ltr">{k}</bdi>: <b>{v}</b></li>)}</ul>}
          <div className="domain-actions">
            <Button variant={ask === "clearKey" ? "danger" : "primary"} disabled={!!busy} onClick={() => {
              const what = ask;
              setAsk(null);
              void act(what, async () => {
                if (what === "enable" || what === "disable") await save({ enabled: what === "enable" }, what === "enable" ? ["سرویس فعال شد", "Provider on", "Anbieter an", "Sağlayıcı açık"] : ["سرویس غیرفعال شد", "Provider off", "Anbieter aus", "Sağlayıcı kapalı"]);
                else if (what === "clearKey") await save({ clearKey: true }, ["کلید ذخیره‌شده حذف شد", "Saved key removed", "Gespeicherter Schlüssel entfernt", "Kayıtlı anahtar kaldırıldı"]);
                else await save(Object.fromEntries(changes.map(([k]) => [k, payloadOf(form)[k]])), ["تنظیمات ذخیره شد", "Settings saved", "Einstellungen gespeichert", "Ayarlar kaydedildi"]);
              });
            }}>{tx(["تأیید", "Confirm", "Bestätigen", "Onayla"])}</Button>
          </div>
        </Modal>
      )}
    </article>
  );
}

export type Form = { baseUrl: string; timeoutSec: string; defaultModelId: string; defaultCreditCost: string; fallbackEnabled: boolean; autoRouting: boolean; limits: Record<keyof Limits, string> };
export function formOf(p: ProviderRow): Form {
  const s = (v: number | null) => (v == null ? "" : String(v));
  return { baseUrl: p.baseUrl, timeoutSec: String(Math.round(p.timeoutMs / 1000)), defaultModelId: p.defaultModelId ?? "", defaultCreditCost: String(p.defaultCreditCost), fallbackEnabled: p.fallbackEnabled, autoRouting: p.autoRouting, limits: { dailyRequestCap: s(p.limits.dailyRequestCap), perUserDailyCap: s(p.limits.perUserDailyCap), maxOutputTokens: s(p.limits.maxOutputTokens), maxConcurrency: s(p.limits.maxConcurrency), softWarnPercent: String(p.limits.softWarnPercent), hardStopPercent: String(p.limits.hardStopPercent) } };
}
const numOrNull = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))));
export function payloadOf(f: Form): Record<string, unknown> {
  return {
    baseUrl: f.baseUrl.trim(), timeoutMs: Math.round(Number(f.timeoutSec) * 1000), defaultModelId: f.defaultModelId || null, defaultCreditCost: Math.round(Number(f.defaultCreditCost)),
    dailyRequestCap: numOrNull(f.limits.dailyRequestCap), perUserDailyCap: numOrNull(f.limits.perUserDailyCap), maxOutputTokens: numOrNull(f.limits.maxOutputTokens), maxConcurrency: numOrNull(f.limits.maxConcurrency),
    softWarnPercent: Math.round(Number(f.limits.softWarnPercent)), hardStopPercent: Math.round(Number(f.limits.hardStopPercent)), fallbackEnabled: f.fallbackEnabled, autoRouting: f.autoRouting,
  };
}
/** Changed fields as [name, new value] pairs, for the confirmation list. */
export function settingsDiff(p: ProviderRow, f: Form): [string, string][] {
  const before = payloadOf(formOf(p)), after = payloadOf(f);
  return Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => [k, after[k] === null ? "—" : String(after[k])]);
}

type Filter = "all" | "on" | "off" | "gone";
type Sort = "priority" | "name" | "usage";
function ModelsTable({ p, reload }: { p: ProviderRow; reload: () => void }) {
  const { n, tx, when } = useT();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("priority");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return p.models
      .filter((m) => (filter === "on" ? m.enabled : filter === "off" ? !m.enabled && m.available : filter === "gone" ? !m.available : true))
      .filter((m) => !term || m.displayName.toLowerCase().includes(term) || m.externalId.toLowerCase().includes(term))
      .sort((a, b) => (sort === "name" ? a.displayName.localeCompare(b.displayName) : sort === "usage" ? b.today.requests - a.today.requests : a.priority - b.priority || a.externalId.localeCompare(b.externalId)));
  }, [p.models, q, filter, sort]);
  async function update(ids: string[], body: Record<string, unknown>) {
    setBusy(true);
    try {
      await json(await send(`/api/admin/llm/providers/${p.id}/models`, "PATCH", { ids, ...body }));
      setPicked(new Set());
      reload();
    } catch (e) { toast.error(errText(e instanceof Error ? e.message : "", tx) || tx(["انجام نشد", "Failed", "Fehlgeschlagen", "Başarısız"])); } finally { setBusy(false); }
  }
  const pickable = rows.filter((m) => m.available).map((m) => m.externalId);
  const allPicked = pickable.length > 0 && pickable.every((id) => picked.has(id));
  const gone = p.models.filter((m) => !m.available).length;
  return (
    <div className="llm-models">
      <div className="row-between llm-models-tools">
        <h4>{tx(["مدل‌ها", "Models", "Modelle", "Modeller"])} <small>{n(p.models.filter((m) => m.enabled).length)} / {n(p.models.length)} {tx(["فعال", "on", "an", "açık"])}</small></h4>
        <div className="domain-actions">
          <input type="search" aria-label={tx(["جست‌وجوی مدل", "Search models", "Modelle suchen", "Model ara"])} placeholder={tx(["جست‌وجو…", "Search…", "Suchen…", "Ara…"])} value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label={tx(["فیلتر", "Filter", "Filter", "Filtre"])} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">{tx(["همه", "All", "Alle", "Tümü"])}</option>
            <option value="on">{tx(["فعال", "On", "An", "Açık"])}</option>
            <option value="off">{tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</option>
            <option value="gone">{tx(["دیگر ارائه نمی‌شود", "No longer offered", "Nicht mehr angeboten", "Artık sunulmuyor"])} ({n(gone)})</option>
          </select>
          <select aria-label={tx(["مرتب‌سازی", "Sort", "Sortieren", "Sırala"])} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="priority">{tx(["اولویت", "Priority", "Priorität", "Öncelik"])}</option>
            <option value="name">{tx(["نام", "Name", "Name", "Ad"])}</option>
            <option value="usage">{tx(["مصرف امروز", "Today's use", "Heutige Nutzung", "Bugünkü kullanım"])}</option>
          </select>
        </div>
      </div>
      {picked.size > 0 && (
        <div className="domain-actions" role="toolbar" aria-label={tx(["عملیات گروهی", "Bulk actions", "Sammelaktionen", "Toplu işlemler"])}>
          <span>{n(picked.size)} {tx(["مدل انتخاب شده", "selected", "ausgewählt", "seçili"])}</span>
          <Button variant="primary" disabled={busy} onClick={() => void update([...picked], { enabled: true })}>{tx(["فعال کردن", "Turn on", "Einschalten", "Aç"])}</Button>
          <Button disabled={busy} onClick={() => void update([...picked], { enabled: false })}>{tx(["غیرفعال کردن", "Turn off", "Ausschalten", "Kapat"])}</Button>
          <Button disabled={busy} onClick={() => setPicked(new Set())}>{tx(["لغو انتخاب", "Clear", "Aufheben", "Temizle"])}</Button>
        </div>
      )}
      {rows.length ? (
        <div className="table-scroll">
          <table className="admin-finance-table llm-models-table">
            <thead><tr>
              <th><input type="checkbox" aria-label={tx(["انتخاب همه", "Select all", "Alle auswählen", "Tümünü seç"])} checked={allPicked} onChange={(e) => setPicked(e.target.checked ? new Set(pickable) : new Set())} /></th>
              <th>{tx(["مدل", "Model", "Modell", "Model"])}</th>
              <th>{tx(["وضعیت", "Status", "Status", "Durum"])}</th>
              <th>{tx(["پیش‌فرض", "Default", "Standard", "Varsayılan"])}</th>
              <th>{tx(["پنجرهٔ متن", "Context", "Kontext", "Bağlam"])}</th>
              <th>{tx(["حداکثر خروجی", "Max output", "Max. Ausgabe", "Azami çıktı"])}</th>
              <th>{tx(["تصویر", "Image", "Bild", "Görsel"])}</th>
              <th>{tx(["اولویت", "Priority", "Priorität", "Öncelik"])}</th>
              <th>{tx(["اعتبار", "Credits", "Credits", "Kredi"])}</th>
              <th>{tx(["امروز", "Today", "Heute", "Bugün"])}</th>
              <th>{tx(["آخرین همگام‌سازی", "Last sync", "Letzte Sync", "Son eşitleme"])}</th>
            </tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.externalId} className={m.available ? "" : "llm-gone"}>
                <td><input type="checkbox" aria-label={m.displayName} disabled={!m.available} checked={picked.has(m.externalId)} onChange={(e) => setPicked((s) => { const x = new Set(s); if (e.target.checked) x.add(m.externalId); else x.delete(m.externalId); return x; })} /></td>
                <td><strong>{m.displayName}</strong><br /><small><bdi dir="ltr">{m.externalId}</bdi>{m.ownedBy ? ` · ${m.ownedBy}` : ""}</small></td>
                <td>
                  {m.available
                    ? <label className="gc-switch"><input type="checkbox" checked={m.enabled} disabled={busy} onChange={() => void update([m.externalId], { enabled: !m.enabled })} />{m.enabled ? tx(["فعال", "On", "An", "Açık"]) : tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</label>
                    : <span className="badge red" title={tx(["این مدل در آخرین همگام‌سازی از سوی سرویس ارائه نشد", "Not offered by the provider at the last sync", "Bei der letzten Sync nicht mehr angeboten", "Son eşitlemede sağlayıcı tarafından sunulmadı"])}>{tx(["دیگر ارائه نمی‌شود", "No longer offered", "Nicht mehr angeboten", "Artık sunulmuyor"])}</span>}
                  {m.lifecycle && m.lifecycle !== "active" && <span className="badge orange">{m.lifecycle}</span>}
                </td>
                <td>{m.isDefault ? <span className="badge green">{tx(["پیش‌فرض", "Default", "Standard", "Varsayılan"])}</span> : m.available && <Button disabled={busy} onClick={() => void update([m.externalId], { makeDefault: true })}>{tx(["انتخاب", "Set", "Setzen", "Seç"])}</Button>}</td>
                <td>{m.contextWindow ? n(m.contextWindow) : "—"}</td>
                <td>{m.maxOutputTokens ? n(m.maxOutputTokens) : "—"}</td>
                <td>{m.vision ? <Icon name="Check" size={14} /> : "—"}</td>
                <td><input className="llm-num" type="number" min={0} max={10000} aria-label={tx(["اولویت", "Priority", "Priorität", "Öncelik"]) + " " + m.displayName} defaultValue={m.priority} disabled={busy} onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (Number.isFinite(v) && v !== m.priority) void update([m.externalId], { priority: v }); }} /></td>
                <td>{n(m.effectiveCreditCost)}</td>
                <td><small>{n(m.today.requests)} {tx(["درخواست", "req", "Anfr.", "istek"])} · {n(m.today.tokens)} {tx(["توکن", "tok", "Tok.", "token"])}{m.today.errors ? <> · <span className="fail">{n(m.today.errors)} {tx(["خطا", "err", "Fehler", "hata"])}</span></> : null}</small></td>
                <td><small>{when(m.lastSyncedAt)}</small></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="fine-print">{tx(["مدلی با این فیلتر نیست.", "No model matches this filter.", "Kein Modell passt zu diesem Filter.", "Bu filtreye uyan model yok."])}</p>}
    </div>
  );
}

// ─── Usage & Credits ─────────────────────────────────────────────────────────

type Local = { requests: number; success: number; errors: number; cancelled: number; blocked: number; inputTokens: number; outputTokens: number; totalTokens: number; reportedCostUsd: number | null; estimatedCostUsd: number | null; avgLatencyMs: number | null; successRate: number | null; lastEventAt?: string | null };
type UsageProvider = { providerId: string; name: string; dynamic: boolean; local: Local | null; reported: Snapshot | null };
type UsageModel = Local & { modelId: string; providerId: string; users: number };
type UsageData = { range: { from: string; to: string; kind: string }; generatedAt: string; providers: UsageProvider[]; models: UsageModel[] };
type Range = "today" | "7d" | "30d" | "custom";

export function LlmUsageCredits() {
  const { n, tx, when } = useT();
  const [range, setRange] = useState<Range>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const query = useMemo(() => {
    const s = new URLSearchParams({ range });
    if (range === "custom") { if (from) s.set("from", new Date(from + "T00:00:00").toISOString()); if (to) s.set("to", new Date(to + "T23:59:59").toISOString()); }
    if (providerId) s.set("providerId", providerId);
    if (modelId) s.set("modelId", modelId);
    if (userId.trim()) s.set("userId", userId.trim());
    if (status) s.set("status", status);
    return s.toString();
  }, [range, from, to, providerId, modelId, userId, status]);
  const load = useCallback(() => {
    if (range === "custom" && !from) return;
    setLoading(true); setError("");
    fetch("/api/admin/llm/usage?" + query, { credentials: "include" }).then((r) => json<UsageData>(r)).then(setData).catch((e) => setError(e instanceof Error ? e.message : "x")).finally(() => setLoading(false));
  }, [query, range, from]);
  useEffect(() => { load(); }, [load]);
  async function refresh() {
    setRefreshing(true);
    try { await json(await send("/api/admin/llm/usage", "POST")); toast.success(tx(["داده‌های سرویس‌ها به‌روز شد", "Provider data refreshed", "Anbieterdaten aktualisiert", "Sağlayıcı verileri yenilendi"])); load(); }
    catch (e) { toast.error(errText(e instanceof Error ? e.message : "", tx) || tx(["انجام نشد", "Failed", "Fehlgeschlagen", "Başarısız"])); } finally { setRefreshing(false); }
  }
  const usd = (v: number | null | undefined) => (v == null ? "—" : "$" + (v < 1 ? v.toFixed(4) : v.toFixed(2)));
  const pct = (v: number | null | undefined) => (v == null ? "—" : n(v) + tx(["٪", "%", "%", "%"]));
  const ms = (v: number | null | undefined) => (v == null ? "—" : n(v) + " ms");
  const models = data?.models.filter((m) => !providerId || m.providerId === providerId) ?? [];
  const RANGES: [Range, Tx][] = [["today", ["امروز", "Today", "Heute", "Bugün"]], ["7d", ["۷ روز", "7 days", "7 Tage", "7 gün"]], ["30d", ["۳۰ روز", "30 days", "30 Tage", "30 gün"]], ["custom", ["بازهٔ دلخواه", "Custom", "Zeitraum", "Özel"]]];
  const SRC = { reported: tx(["گزارش خود سرویس", "Provider reported", "Vom Anbieter gemeldet", "Sağlayıcı bildirdi"]), local: tx(["ثبت‌شده در آی‌فکر", "Locally tracked", "Lokal erfasst", "Yerel kayıt"]), est: tx(["تخمینی", "Estimated", "Geschätzt", "Tahmini"]) };
  return (
    <section className="panel llm-usage">
      <div className="row-between">
        <h3>{tx(["مصرف و اعتبار", "Usage & Credits", "Nutzung & Guthaben", "Kullanım ve Kredi"])}</h3>
        <Button disabled={refreshing} onClick={() => void refresh()}><Icon name="RefreshCw" size={14} />{refreshing ? tx(["در حال به‌روزرسانی…", "Refreshing…", "Aktualisiere…", "Yenileniyor…"]) : tx(["به‌روزرسانی از سرویس‌ها", "Refresh from providers", "Von Anbietern aktualisieren", "Sağlayıcılardan yenile"])}</Button>
      </div>
      <p className="fine-print">{tx(["«گزارش خود سرویس» عددهایی است که سرویس‌دهنده اعلام کرده؛ «ثبت‌شده در آی‌فکر» از دفتر مصرف خود ما می‌آید؛ «تخمینی» از قیمت‌های واردشده در ادمین حساب می‌شود و با هزینهٔ قطعی جمع نمی‌شود.", "“Provider reported” is what the provider itself says; “Locally tracked” comes from AIFekr's own usage ledger; “Estimated” is computed from admin prices and never added to exact cost.", "„Vom Anbieter gemeldet“ stammt vom Anbieter; „Lokal erfasst“ aus dem eigenen Nutzungsprotokoll; „Geschätzt“ aus Admin-Preisen und wird nie zu exakten Kosten addiert.", "“Sağlayıcı bildirdi” sağlayıcının kendi verisidir; “Yerel kayıt” AIFekr'in kullanım kaydından gelir; “Tahmini” yönetici fiyatlarından hesaplanır ve kesin maliyete eklenmez."])}</p>
      <div className="llm-usage-filters" role="group" aria-label={tx(["فیلترها", "Filters", "Filter", "Filtreler"])}>
        <div className="segmented">{RANGES.map(([k, l]) => <button key={k} type="button" className={range === k ? "active" : ""} aria-pressed={range === k} onClick={() => setRange(k)}>{tx(l)}</button>)}</div>
        {range === "custom" && <>
          <label>{tx(["از", "From", "Von", "Başlangıç"])}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>{tx(["تا", "To", "Bis", "Bitiş"])}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </>}
        <label>{tx(["سرویس", "Provider", "Anbieter", "Sağlayıcı"])}<select value={providerId} onChange={(e) => { setProviderId(e.target.value); setModelId(""); }}><option value="">{tx(["همه", "All", "Alle", "Tümü"])}</option>{data?.providers.map((p) => <option key={p.providerId} value={p.providerId}>{p.name}</option>)}</select></label>
        <label>{tx(["مدل", "Model", "Modell", "Model"])}<select value={modelId} onChange={(e) => setModelId(e.target.value)}><option value="">{tx(["همه", "All", "Alle", "Tümü"])}</option>{models.map((m) => <option key={m.modelId} value={m.modelId}>{m.modelId}</option>)}{modelId && !models.some((m) => m.modelId === modelId) && <option value={modelId}>{modelId}</option>}</select></label>
        <label>{tx(["شناسهٔ کاربر", "User id", "Nutzer-ID", "Kullanıcı kimliği"])}<input dir="ltr" value={userId} onChange={(e) => setUserId(e.target.value)} onBlur={load} /></label>
        <label>{tx(["وضعیت", "Status", "Status", "Durum"])}<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{tx(["همه", "All", "Alle", "Tümü"])}</option><option value="SUCCESS">{tx(["موفق", "Success", "Erfolg", "Başarılı"])}</option><option value="ERROR">{tx(["خطا", "Error", "Fehler", "Hata"])}</option><option value="CANCELLED">{tx(["لغوشده", "Cancelled", "Abgebrochen", "İptal"])}</option><option value="BLOCKED">{tx(["مسدود (سقف)", "Blocked (limit)", "Blockiert (Limit)", "Engellendi (sınır)"])}</option></select></label>
      </div>
      {range === "custom" && !from && <p className="fine-print">{tx(["تاریخ شروع را انتخاب کنید.", "Pick a start date.", "Startdatum wählen.", "Başlangıç tarihi seçin."])}</p>}
      {error && <div className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{tx(["گزارش مصرف بارگذاری نشد.", "Could not load usage.", "Nutzung konnte nicht geladen werden.", "Kullanım yüklenemedi."])}</span><Button onClick={load}>{tx(["تلاش دوباره", "Retry", "Erneut", "Tekrar dene"])}</Button></div>}
      {loading && !data && <div className="skeleton" style={{ height: 160 }} />}
      {data && (
        <div aria-busy={loading}>
          <p className="fine-print">{tx(["به‌روز شده", "Updated", "Aktualisiert", "Güncellendi"])}: {when(data.generatedAt)} · {when(data.range.from)} → {when(data.range.to)}</p>
          {!data.providers.length && <Empty />}
          <div className="llm-usage-grid">{data.providers.map((p) => (
            <article key={p.providerId} className="panel llm-usage-card">
              <div className="row-between"><strong>{p.name}</strong>{p.dynamic && <span className="badge">{tx(["پویا", "Dynamic", "Dynamisch", "Dinamik"])}</span>}</div>
              {p.dynamic && (
                <div className="llm-usage-block">
                  <div className="row-between"><span className="badge">{SRC.reported}</span>{p.reported && <small className={p.reported.stale ? "fail" : ""}>{when(p.reported.fetchedAt)}{p.reported.stale ? " · " + tx(["قدیمی", "stale", "veraltet", "eski"]) : ""}</small>}</div>
                  {!p.reported && <p className="fine-print">{tx(["هنوز داده‌ای از سرویس دریافت نشده؛ «به‌روزرسانی از سرویس‌ها» را بزنید.", "No provider data yet; use “Refresh from providers”.", "Noch keine Anbieterdaten; „Aktualisieren“ nutzen.", "Henüz sağlayıcı verisi yok; “Yenile”yi kullanın."])}</p>}
                  {p.reported?.status === "ERROR" && <p className="fail">{tx(["دریافت ناموفق", "Fetch failed", "Abruf fehlgeschlagen", "Alınamadı"])}: {errText(p.reported.error, tx)}</p>}
                  {p.reported?.status === "OK" && <>
                    <dl className="llm-facts">
                      <div><dt>{tx(["اعتبار باقی‌ماندهٔ امروز", "Credit left today", "Heute verbleibend", "Bugün kalan kredi"])}</dt><dd>{usd(p.reported.creditRemainingUsd)}</dd></div>
                      <div><dt>{tx(["مصرف امروز", "Used today", "Heute verbraucht", "Bugün kullanılan"])}</dt><dd>{usd(p.reported.usedTodayUsd)}</dd></div>
                      <div><dt>{tx(["سقف روزانه", "Daily limit", "Tageslimit", "Günlük sınır"])}</dt><dd>{usd(p.reported.dailyLimitUsd)}</dd></div>
                      <div><dt>{tx(["درخواست‌های امروز", "Requests today", "Anfragen heute", "Bugünkü istekler"])}</dt><dd>{p.reported.requestsToday == null ? "—" : n(p.reported.requestsToday)}{p.reported.dailyRequestLimit != null ? ` / ${n(p.reported.dailyRequestLimit)}` : ""}</dd></div>
                      <div><dt>{tx(["بازنشانی", "Resets", "Zurücksetzung", "Sıfırlanma"])}</dt><dd>{when(p.reported.resetAt)}</dd></div>
                    </dl>
                    {p.reported.usedPercent != null && <><progress max={100} value={p.reported.usedPercent} aria-label={tx(["درصد مصرف", "Share used", "Anteil verbraucht", "Kullanım oranı"])} /> <small>{pct(p.reported.usedPercent)}</small></>}
                  </>}
                </div>
              )}
              <div className="llm-usage-block">
                <span className="badge">{SRC.local}</span>
                {p.local ? (
                  <dl className="llm-facts">
                    <div><dt>{tx(["درخواست‌ها", "Requests", "Anfragen", "İstekler"])}</dt><dd>{n(p.local.requests)} <small>({n(p.local.success)} ✓ · {n(p.local.errors)} ✗{p.local.blocked ? ` · ${n(p.local.blocked)} ⛔` : ""})</small></dd></div>
                    <div><dt>{tx(["توکن ورودی / خروجی / کل", "Tokens in / out / total", "Tokens ein / aus / gesamt", "Token giriş / çıkış / toplam"])}</dt><dd>{n(p.local.inputTokens)} / {n(p.local.outputTokens)} / {n(p.local.totalTokens)}</dd></div>
                    <div><dt>{tx(["هزینه", "Cost", "Kosten", "Maliyet"])} · {SRC.reported}</dt><dd>{usd(p.local.reportedCostUsd)}</dd></div>
                    <div><dt>{tx(["هزینه", "Cost", "Kosten", "Maliyet"])} · <span className="badge orange">{SRC.est}</span></dt><dd>{usd(p.local.estimatedCostUsd)}</dd></div>
                    <div><dt>{tx(["میانگین تأخیر", "Avg latency", "Ø Latenz", "Ort. gecikme"])}</dt><dd>{ms(p.local.avgLatencyMs)}</dd></div>
                    <div><dt>{tx(["نرخ موفقیت", "Success rate", "Erfolgsquote", "Başarı oranı"])}</dt><dd>{pct(p.local.successRate)}</dd></div>
                    <div><dt>{tx(["آخرین درخواست", "Last request", "Letzte Anfrage", "Son istek"])}</dt><dd>{when(p.local.lastEventAt)}</dd></div>
                  </dl>
                ) : <p className="fine-print">{tx(["در این بازه درخواستی ثبت نشده.", "No requests in this range.", "Keine Anfragen in diesem Zeitraum.", "Bu aralıkta istek yok."])}</p>}
              </div>
            </article>
          ))}</div>
          <h4>{tx(["ریز مصرف هر مدل", "Per-model breakdown", "Aufschlüsselung je Modell", "Model bazında döküm"])} <span className="badge">{SRC.local}</span></h4>
          {models.length ? (
            <div className="table-scroll"><table className="admin-finance-table">
              <thead><tr>
                <th>{tx(["مدل", "Model", "Modell", "Model"])}</th><th>{tx(["درخواست", "Requests", "Anfragen", "İstek"])}</th><th>{tx(["کاربران", "Users", "Nutzer", "Kullanıcı"])}</th><th>{tx(["توکن", "Tokens", "Tokens", "Token"])}</th><th>{tx(["هزینهٔ گزارش‌شده", "Reported cost", "Gemeldete Kosten", "Bildirilen maliyet"])}</th><th>{tx(["هزینهٔ تخمینی", "Estimated cost", "Geschätzte Kosten", "Tahmini maliyet"])}</th><th>{tx(["تأخیر", "Latency", "Latenz", "Gecikme"])}</th><th>{tx(["موفق / خطا", "Success / error", "Erfolg / Fehler", "Başarılı / hata"])}</th>
              </tr></thead>
              <tbody>{models.map((m) => (
                <tr key={m.modelId}>
                  <td><bdi dir="ltr">{m.modelId}</bdi><br /><small>{m.providerId}</small></td>
                  <td>{n(m.requests)}</td><td>{n(m.users)}</td><td>{n(m.totalTokens)}</td><td>{usd(m.reportedCostUsd)}</td><td>{usd(m.estimatedCostUsd)}</td><td>{ms(m.avgLatencyMs)}</td>
                  <td>{pct(m.successRate)} <small>({n(m.success)} / {n(m.errors)})</small></td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="fine-print">{tx(["داده‌ای برای این فیلترها نیست.", "No data for these filters.", "Keine Daten für diese Filter.", "Bu filtreler için veri yok."])}</p>}
        </div>
      )}
    </section>
  );
}
