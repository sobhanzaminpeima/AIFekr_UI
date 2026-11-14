"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * SEO Intelligence provider admin (/admin/seo-intelligence) on the real main-site API:
 * - GET/PUT /api/admin/seo-intelligence: settings (login/password are write-only; the
 *   server only says whether they are set) and the latest 100 research jobs.
 * - POST …/probe: account check on DataForSEO's free read-only appendix endpoint.
 * - POST …/rates: loads this account's rates (free); they still need review and save.
 * A save first shows every changed field; credentials are never echoed.
 */
type Tx = [string, string, string, string];
type Rate = { baseUsd: number; rowUsd: number } | null;
const ACTIONS = ["keywords", "rank", "competitors", "backlinks", "referringDomains", "keywordGap", "aiVisibility", "backlinkHistory"] as const;
type Action = typeof ACTIONS[number];
type Config = { enabled: boolean; configured: boolean; rates: Partial<Record<Action, Rate>>; usdPerCredit: number; markupPercent: number; infrastructureUsd: number; maxRows: number; dailyCredits: number; dailyJobs: number; maxConcurrent: number };
type Job = { id: string; userId: string; action: string; status: string; credits: number; estimatedCostUsd: number | null; actualCostUsd: number | null; errorCode: string | null; createdAt: string; refundedAt: string | null; notificationSentAt: string | null; notificationAttempts: number; notificationError: string | null };
type Row = Record<string, unknown>;

const ACTION_LABEL: Record<Action, Tx> = {
  keywords: ["کلمات کلیدی", "Keywords", "Keywords", "Anahtar kelimeler"],
  rank: ["رتبه", "Rank", "Rang", "Sıralama"],
  competitors: ["رقبا", "Competitors", "Wettbewerber", "Rakipler"],
  backlinks: ["بک‌لینک", "Backlinks", "Backlinks", "Geri bağlantılar"],
  referringDomains: ["دامنه‌های ارجاع‌دهنده", "Referring domains", "Verweisende Domains", "Yönlendiren alan adları"],
  keywordGap: ["شکاف کلمات کلیدی", "Keyword gaps", "Keyword-Lücken", "Kelime boşlukları"],
  aiVisibility: ["شواهد جست‌وجوی AI", "AI search evidence", "KI-Suchnachweise", "AI arama kanıtları"],
  backlinkHistory: ["روند بک‌لینک", "Backlink history", "Backlink-Verlauf", "Geri bağlantı geçmişi"],
};
const STATUS: Record<string, [Tx, string]> = {
  QUEUED: [["در صف", "Queued", "In Warteschlange", "Sırada"], "amber"],
  RUNNING: [["در حال اجرا", "Running", "Läuft", "Çalışıyor"], "blue"],
  SUCCEEDED: [["تکمیل شد", "Completed", "Abgeschlossen", "Tamamlandı"], "green"],
  FAILED: [["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], "red"],
};

function diff(a: unknown, b: unknown, path = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    return [...new Set([...Object.keys(a as Row), ...Object.keys(b as Row)])].flatMap((k) => diff((a as Row)[k], (b as Row)[k], path ? path + "." + k : k));
  }
  const s = (v: unknown) => { const t = JSON.stringify(v); return t === undefined ? "—" : t; };
  return [`${path}: ${s(a)} → ${s(b)}`];
}

export function LiveSeoIntelligenceAdmin() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  const [saved, setSaved] = useState<Config | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [failed, setFailed] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [verified, setVerified] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = () => fetch("/api/admin/seo-intelligence", { credentials: "include", cache: "no-store" })
    .then(async (r) => { if (!r.ok) throw Error(); const d = await r.json(); setSaved(d.config); setConfig(d.config); setJobs(d.jobs || []); })
    .catch(() => setFailed(true));
  useEffect(() => { void load(); }, []);

  const changes = useMemo(() => {
    if (!saved || !config) return [];
    const strip = ({ configured: _c, ...rest }: Config) => rest;
    const list = diff(strip(saved), strip(config));
    if (login) list.push(tx(["نام کاربری API: جایگزین می‌شود", "API login: will be replaced", "API-Login: wird ersetzt", "API kullanıcı adı: değiştirilecek"]));
    if (password) list.push(tx(["رمز API: جایگزین می‌شود", "API password: will be replaced", "API-Passwort: wird ersetzt", "API şifresi: değiştirilecek"]));
    return list;
  }, [saved, config, login, password]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    credits: jobs.reduce((a, j) => a + (j.status === "FAILED" || j.refundedAt ? 0 : j.credits), 0),
    actual: jobs.reduce((a, j) => a + (j.actualCostUsd ?? 0), 0),
    failed: jobs.filter((j) => j.status === "FAILED").length,
    refunded: jobs.filter((j) => j.refundedAt).length,
  }), [jobs]);

  async function call(url: string, method: string, body?: unknown) {
    const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.code || d.error || "HTTP_" + r.status);
    return d;
  }
  async function save() {
    if (!config) return;
    setBusy("save");
    try {
      const { configured: _c, ...settings } = config;
      const d = await call("/api/admin/seo-intelligence", "PUT", { ...settings, login, password });
      setSaved(d.config); setConfig(d.config); setLogin(""); setPassword(""); setVerified(false); setConfirm(false);
      toast.success(tx(["تنظیمات ذخیره شد", "Settings saved", "Einstellungen gespeichert", "Ayarlar kaydedildi"]));
    } catch {
      toast.error(tx(["ذخیره نشد. برای فعال‌سازی، اطلاعات حساب لازم است و مقادیر باید در بازهٔ مجاز باشند.", "Not saved. Enabling needs account credentials and values within range.", "Nicht gespeichert. Aktivierung braucht Zugangsdaten und gültige Werte.", "Kaydedilmedi. Etkinleştirmek için hesap bilgileri ve geçerli değerler gerekir."]));
    } finally { setBusy(""); }
  }
  async function probe() {
    setBusy("probe");
    try { await call("/api/admin/seo-intelligence/probe", "POST"); setVerified(true); toast.success(tx(["اتصال حساب تأیید شد", "Account connection verified", "Kontoverbindung bestätigt", "Hesap bağlantısı doğrulandı"])); }
    catch (e) { toast.error((e as Error).message === "RATE_LIMIT" ? tx(["چند لحظه بعد دوباره امتحان کنید.", "Try again in a minute.", "In einer Minute erneut versuchen.", "Bir dakika sonra tekrar deneyin."]) : tx(["اتصال تأیید نشد؛ اطلاعات API و وضعیت حساب را بررسی کنید.", "Connection failed; check API credentials and account status.", "Verbindung fehlgeschlagen; Zugangsdaten und Kontostatus prüfen.", "Bağlantı başarısız; API bilgilerini ve hesap durumunu kontrol edin."])); }
    finally { setBusy(""); }
  }
  async function importRates() {
    setBusy("rates");
    try {
      const d = await call("/api/admin/seo-intelligence/rates", "POST");
      setConfig((c) => c ? { ...c, rates: d.rates } : c);
      toast.success(tx(["تعرفه‌های حساب دریافت شد؛ بررسی و ذخیره کنید.", "Account rates loaded. Review and save them.", "Kontopreise geladen. Prüfen und speichern.", "Hesap fiyatları alındı. İnceleyip kaydedin."]));
    } catch { toast.error(tx(["تعرفه‌ها دریافت نشد؛ تنظیمات قبلی حفظ شد.", "Rates unavailable; existing settings kept.", "Preise nicht verfügbar; Einstellungen beibehalten.", "Fiyatlar alınamadı; mevcut ayarlar korundu."])); }
    finally { setBusy(""); }
  }

  /** Same formula as the server's quoteSeoAction, for a sample run at maxRows. */
  const sample = (a: Action) => {
    const r = config?.rates[a];
    if (!config || !r) return null;
    const usd = r.baseUsd + r.rowUsd * config.maxRows;
    if (usd <= 0) return null;
    return { usd, credits: Math.ceil((usd * (1 + config.markupPercent / 100) + config.infrastructureUsd) / config.usdPerCredit) };
  };

  if (failed) return <p className="fine-print" role="alert">{tx(["تنظیمات در دسترس نیست؛ دسترسی و دیتابیس را بررسی کنید.", "Settings unavailable; check access and database.", "Einstellungen nicht verfügbar; Zugriff und Datenbank prüfen.", "Ayarlar kullanılamıyor; erişimi ve veritabanını kontrol edin."])}</p>;
  if (!config) return <p className="fine-print" role="status">{tx(["در حال دریافت…", "Loading…", "Wird geladen…", "Yükleniyor…"])}</p>;

  const num = (key: keyof Config, label: Tx, step = "any") => (
    <label key={key}>{tx(label)}<input type="number" min="0" step={step} required value={config[key] as number} onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })} /></label>
  );
  const shown = jobs.filter((j) => filter === "all" || j.status === filter);
  const state = verified ? ["green", tx(["اتصال تأیید شد", "Connection verified", "Verbindung bestätigt", "Bağlantı doğrulandı"])] : config.configured ? ["amber", tx(["اطلاعات حساب ذخیره شده؛ اتصال بررسی نشده", "Credentials saved; not verified", "Zugangsdaten gespeichert; nicht geprüft", "Bilgiler kayıtlı; doğrulanmadı"])] : ["red", tx(["اطلاعات حساب ثبت نشده", "No credentials", "Keine Zugangsdaten", "Hesap bilgisi yok"])];

  return (
    <div className="admin-sms">
      <header className="panel">
        <span className="eyebrow">AIFekr / SEO</span>
        <h1>SEO Intelligence</h1>
        <p className="muted">{tx(["اتصال امن DataForSEO، تعرفه، اعتبار و درخواست‌های کاربران.", "Secure DataForSEO connection, pricing, credits and user jobs.", "Sichere DataForSEO-Verbindung, Preise, Credits und Aufträge.", "Güvenli DataForSEO bağlantısı, fiyat, kredi ve işler."])}</p>
        <div className="chips">
          <span className={"badge " + (config.enabled ? "green" : "")}>{config.enabled ? tx(["سرویس فعال", "Service on", "Dienst an", "Hizmet açık"]) : tx(["سرویس خاموش", "Service off", "Dienst aus", "Hizmet kapalı"])}</span>
          <span className={"badge " + state[0]}>{state[1]}</span>
          <span className="badge">{n(ACTIONS.filter((a) => config.rates[a]).length)} / {n(ACTIONS.length)} {tx(["تعرفهٔ فعال", "rates set", "Preise gesetzt", "fiyat tanımlı"])}</span>
        </div>
      </header>

      <div className="stats-grid">
        {([
          [tx(["درخواست‌های اخیر", "Recent jobs", "Letzte Aufträge", "Son işler"]), n(jobs.length)],
          [tx(["اعتبار مصرف‌شده", "Credits charged", "Belastete Credits", "Harcanan kredi"]), n(stats.credits)],
          [tx(["هزینهٔ واقعی گزارش‌شده", "Reported provider cost", "Gemeldete Anbieterkosten", "Bildirilen sağlayıcı maliyeti"]), "$" + stats.actual.toFixed(2)],
          [tx(["ناموفق / بازگشت اعتبار", "Failed / refunded", "Fehlgeschlagen / erstattet", "Başarısız / iade"]), n(stats.failed) + " / " + n(stats.refunded)],
        ] as [string, string][]).map(([a, b]) => <div className="panel stat" key={a}><span>{a}</span><strong>{b}</strong></div>)}
      </div>

      <section className="panel">
        <h2>{tx(["اتصال حساب", "Account connection", "Kontoverbindung", "Hesap bağlantısı"])}</h2>
        <p className="plan-notice"><Icon name="ShieldCheck" size={16} /> {tx(["اطلاعات حساب رمزگذاری می‌شود و هیچ‌وقت نمایش داده نمی‌شود. خالی گذاشتن فیلدها اطلاعات قبلی را نگه می‌دارد.", "Credentials are encrypted and never shown. Leave blank to keep the saved ones.", "Zugangsdaten werden verschlüsselt und nie angezeigt. Leer lassen, um sie zu behalten.", "Bilgiler şifrelenir ve asla gösterilmez. Mevcutları korumak için boş bırakın."])}</p>
        <div className="domain-fields">
          <label>DataForSEO API login<input autoComplete="off" dir="ltr" value={login} placeholder={config.configured ? "••••••" : ""} onChange={(e) => setLogin(e.target.value)} /></label>
          <label>DataForSEO API password<input type="password" autoComplete="new-password" dir="ltr" value={password} placeholder={config.configured ? "••••••" : ""} onChange={(e) => setPassword(e.target.value)} /></label>
          <label className="toggle-row span-2"><span>{tx(["فعال بودن سرویس برای کاربران", "Service enabled for users", "Dienst für Nutzer aktiv", "Hizmet kullanıcılar için açık"])}</span><input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} /></label>
        </div>
        <div className="domain-actions">
          <Button disabled={!config.configured || !!busy} onClick={() => void probe()}><Icon name="PlugZap" size={16} />{busy === "probe" ? "…" : tx(["تست اتصال بدون درخواست پولی", "Test connection (no paid task)", "Verbindung testen (kostenlos)", "Bağlantıyı test et (ücretsiz)"])}</Button>
        </div>
      </section>

      <section className="panel">
        <h2>{tx(["قیمت‌گذاری و سقف‌ها", "Pricing and limits", "Preise und Limits", "Fiyat ve limitler"])}</h2>
        <div className="domain-fields">
          {num("usdPerCredit", ["ارزش هر اعتبار (دلار)", "USD per credit", "USD pro Credit", "Kredi başına USD"])}
          {num("markupPercent", ["حاشیهٔ قیمت (%)", "Markup (%)", "Aufschlag (%)", "Marj (%)"])}
          {num("infrastructureUsd", ["هزینهٔ زیرساخت هر اجرا (دلار)", "Infrastructure USD per run", "Infrastruktur USD pro Lauf", "İşlem başına altyapı USD"])}
          {num("maxRows", ["حداکثر نتایج هر درخواست", "Maximum results per job", "Max. Ergebnisse pro Auftrag", "İş başına maks. sonuç"], "1")}
          {num("dailyCredits", ["بودجهٔ روزانهٔ هر کیف اعتبار", "Daily credit budget per wallet", "Tagesbudget pro Wallet", "Cüzdan başına günlük bütçe"], "1")}
          {num("dailyJobs", ["حداکثر تلاش روزانه (با خطاها)", "Daily attempts (incl. failures)", "Tägliche Versuche (inkl. Fehler)", "Günlük deneme (hatalar dahil)"], "1")}
          {num("maxConcurrent", ["حداکثر درخواست باز", "Maximum open jobs", "Max. offene Aufträge", "Maks. açık iş"], "1")}
        </div>
      </section>

      <section className="panel">
        <div className="table-toolbar">
          <h2>{tx(["تعرفهٔ واقعی سرویس (دلار)", "Provider rates (USD)", "Anbieterpreise (USD)", "Sağlayıcı fiyatları (USD)"])}</h2>
          <Button disabled={!config.configured || !!busy} onClick={() => void importRates()}><Icon name="Download" size={16} />{busy === "rates" ? "…" : tx(["دریافت تعرفه‌های همین حساب · رایگان", "Load this account’s rates · free", "Kontopreise laden · kostenlos", "Hesap fiyatlarını al · ücretsiz"])}</Button>
        </div>
        <p className="muted">{tx([`بدون تعرفه، آن ابزار برای کاربران اجرا نمی‌شود. ستون آخر هزینهٔ یک اجرای نمونه با ${n(config.maxRows)} نتیجه است.`, `Tools without a rate never run for users. The last column is a sample run with ${n(config.maxRows)} results.`, `Ohne Preis läuft ein Werkzeug nicht. Letzte Spalte: Beispiel mit ${n(config.maxRows)} Ergebnissen.`, `Fiyatı olmayan araç çalışmaz. Son sütun ${n(config.maxRows)} sonuçlu örnek işlemdir.`])}</p>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["ابزار", "Tool", "Werkzeug", "Araç"]), tx(["فعال", "On", "An", "Açık"]), tx(["پایه هر درخواست", "Base per request", "Basis pro Anfrage", "İstek başına taban"]), tx(["هر ردیف نتیجه", "Per result row", "Pro Ergebniszeile", "Sonuç satırı başına"]), tx(["اجرای نمونه", "Sample run", "Beispiellauf", "Örnek işlem"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {ACTIONS.map((a) => {
                const r = config.rates[a] ?? null, s = sample(a);
                const set = (v: Rate) => setConfig({ ...config, rates: { ...config.rates, [a]: v } });
                return (
                  <tr key={a}>
                    <td>{tx(ACTION_LABEL[a])}</td>
                    <td><input type="checkbox" aria-label={tx(ACTION_LABEL[a])} checked={!!r} onChange={(e) => set(e.target.checked ? { baseUsd: 0, rowUsd: 0 } : null)} /></td>
                    <td>{r ? <input type="number" min="0" step="0.000001" dir="ltr" value={r.baseUsd} onChange={(e) => set({ ...r, baseUsd: Number(e.target.value) })} /> : "—"}</td>
                    <td>{r ? <input type="number" min="0" step="0.000001" dir="ltr" value={r.rowUsd} onChange={(e) => set({ ...r, rowUsd: Number(e.target.value) })} /> : "—"}</td>
                    <td>{s ? <span dir="ltr">${s.usd.toFixed(4)} → {n(s.credits)} ✦</span> : <span className="muted">{tx(["اجرا نمی‌شود", "won’t run", "läuft nicht", "çalışmaz"])}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {changes.length > 0 && (
        <div className="panel vf-unsaved">
          <span>{tx([`${n(changes.length)} تغییر ذخیره‌نشده`, `${n(changes.length)} unsaved change(s)`, `${n(changes.length)} ungespeicherte Änderung(en)`, `${n(changes.length)} kaydedilmemiş değişiklik`])}</span>
          <div className="domain-actions">
            <Button disabled={!!busy} onClick={() => { setConfig(saved); setLogin(""); setPassword(""); }}>{tx(["بازگردانی", "Discard", "Verwerfen", "Vazgeç"])}</Button>
            <Button variant="primary" disabled={!!busy} onClick={() => setConfirm(true)}>{tx(["بررسی و ذخیره", "Review and save", "Prüfen und speichern", "İncele ve kaydet"])}</Button>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="table-toolbar">
          <h2>{tx(["درخواست‌ها و هزینهٔ گزارش‌شده", "Jobs and reported costs", "Aufträge und gemeldete Kosten", "İşler ve bildirilen maliyetler"])}</h2>
          <select aria-label={tx(["وضعیت", "Status", "Status", "Durum"])} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">{tx(["همه", "All", "Alle", "Tümü"])}</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{tx(v[0])}</option>)}
          </select>
        </div>
        <div className="table-wrap table-scroll">
          <table>
            <thead><tr>{[tx(["زمان", "Time", "Zeit", "Zaman"]), tx(["ابزار", "Tool", "Werkzeug", "Araç"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["اعتبار", "Credits", "Credits", "Kredi"]), tx(["تخمین / واقعی", "Estimate / actual", "Schätzung / tatsächlich", "Tahmin / gerçek"]), tx(["اعلان", "Notification", "Benachrichtigung", "Bildirim"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((j) => (
                <tr key={j.id}>
                  <td>{new Date(j.createdAt).toLocaleString(tag, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{ACTION_LABEL[j.action as Action] ? tx(ACTION_LABEL[j.action as Action]) : j.action}</td>
                  <td><span className={"badge " + (STATUS[j.status]?.[1] || "")}>{STATUS[j.status] ? tx(STATUS[j.status][0]) : j.status}</span>{j.errorCode && <small className="muted" dir="ltr"> {j.errorCode}</small>}</td>
                  <td>{n(j.credits)}{j.refundedAt && <small className="badge green" style={{ marginInlineStart: 4 }}>{tx(["بازگشت", "refunded", "erstattet", "iade"])}</small>}</td>
                  <td dir="ltr">{j.estimatedCostUsd === null ? "—" : "$" + j.estimatedCostUsd.toFixed(4)} / {j.actualCostUsd === null ? "?" : "$" + j.actualCostUsd.toFixed(4)}</td>
                  <td>{j.notificationSentAt ? tx(["ایمیل ارسال شد", "Email sent", "E-Mail gesendet", "E-posta gönderildi"]) : j.notificationError ? tx([`در انتظار (${n(j.notificationAttempts)} تلاش)`, `Pending (${j.notificationAttempts} tries)`, `Ausstehend (${j.notificationAttempts} Versuche)`, `Bekliyor (${j.notificationAttempts} deneme)`]) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <Empty />}
      </section>

      {confirm && (
        <Modal title={tx(["تأیید ذخیرهٔ تنظیمات SEO", "Confirm SEO settings", "SEO-Einstellungen bestätigen", "SEO ayarlarını onayla"])} onClose={() => busy !== "save" && setConfirm(false)}>
          <p>{tx(["این تغییرات روی قیمت و دسترسی ابزارهای SEO همهٔ کاربران اثر دارد:", "These changes affect SEO tool pricing and availability for all users:", "Diese Änderungen betreffen Preise und Verfügbarkeit für alle Nutzer:", "Bu değişiklikler tüm kullanıcılar için fiyat ve erişimi etkiler:"])}</p>
          <ul dir="ltr" className="fine-print">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="domain-actions">
            <Button variant="primary" disabled={busy === "save"} onClick={() => void save()}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
            <Button disabled={busy === "save"} onClick={() => setConfirm(false)}>{tx(["انصراف", "Cancel", "Abbrechen", "İptal"])}</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
