"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/**
 * Games leaderboard (/api/games/leaderboard, sample seeding /api/games/seed)
 * and the Cloudflare connection (/api/admin/cloudflare, Workers AI status) on
 * aifekr.com. The Cloudflare token is write-only: it is encrypted on save and
 * never sent back to the page.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i], date: (iso: string) => new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" }) }; };

type Entry = { id: string; score: number; maxScore: number; completedAt: string; user: { id: string; name: string | null }; game: { name: string; slug: string } };

export function LiveAdminGames() {
  const { n, tx, date } = useTx();
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const r = await fetch("/api/games/leaderboard", { credentials: "include" }); setRows(r.ok ? (await r.json()).leaderboard ?? [] : []); } catch { setRows([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function seed() {
    if (!confirm(tx(["بازی‌های نمونه در پلتفرم ثبت شوند؟", "Add the sample games to the platform?", "Beispielspiele zur Plattform hinzufügen?", "Örnek oyunlar platforma eklensin mi?"]))) return;
    setBusy(true);
    try {
      const r = await fetch("/api/games/seed", { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(n(d.seeded ?? 0) + " " + tx(["بازی نمونه ثبت شد", "sample games added", "Beispielspiele hinzugefügt", "örnek oyun eklendi"])); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setBusy(false); }
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Gamepad2" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت بازی‌ها", "Games", "Spiele", "Oyunlar"])}</h2>
          <p>{tx(["جدول رتبه‌بندی بازی‌های آموزشی پلتفرم.", "The leaderboard of the platform’s learning games.", "Bestenliste der Lernspiele der Plattform.", "Platformdaki eğitici oyunların sıralaması."])}</p>
        </div>
        <Button disabled={busy} onClick={() => void seed()}><Icon name="Zap" size={16} />{busy ? tx(["در حال ثبت…", "Adding…", "Wird hinzugefügt…", "Ekleniyor…"]) : tx(["ثبت بازی‌های نمونه", "Add sample games", "Beispielspiele hinzufügen", "Örnek oyunları ekle"])}</Button>
      </div>
      <section className="panel" aria-busy={!rows}>
        <div className="row-between"><h3>{tx(["جدول رتبه‌بندی", "Leaderboard", "Bestenliste", "Sıralama"])}</h3><Button onClick={() => void load()}><Icon name="RefreshCw" size={16} /></Button></div>
        {rows?.length ? (
          <div className="table-scroll"><table className="admin-finance-table">
            <thead><tr>{["#", tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["بازی", "Game", "Spiel", "Oyun"]), tx(["امتیاز", "Score", "Punkte", "Puan"]), tx(["زمان", "Time", "Zeit", "Zaman"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((e, k) => (
              <tr key={e.id}>
                <td>{k < 3 ? ["🥇", "🥈", "🥉"][k] : n(k + 1)}</td>
                <td><Link href={"/admin/users/" + encodeURIComponent(e.user.id)}>{e.user.name || e.user.id}</Link></td>
                <td>{e.game.name}</td>
                <td><strong>{n(e.score)}</strong> / {n(e.maxScore)}</td>
                <td>{date(e.completedAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : rows && <Empty />}
      </section>
    </>
  );
}

type Cf = { enabled: boolean; configured: boolean; accountId: string; accountName: string; lastCheckedAt: string | null; status: "UNCONFIGURED" | "ACTIVE" | "ACTIVE_LIMITED" | "ERROR"; lastError: string };

export function LiveAdminCloudflare() {
  const { n, tx, date } = useTx();
  const [cf, setCf] = useState<Cf | null>(null);
  const [accountId, setAccountId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [workers, setWorkers] = useState<{ available: boolean; models: { name: string; task: string }[] } | null>(null);
  const load = useCallback(async () => { const r = await fetch("/api/admin/cloudflare", { credentials: "include" }); const d = await r.json().catch(() => ({})); if (r.ok) { setCf(d.cloudflare); setAccountId(d.cloudflare.accountId || ""); } }, []);
  useEffect(() => { void load(); fetch("/api/admin/cloudflare/workers-ai", { credentials: "include" }).then((r) => r.json()).then(setWorkers).catch(() => setWorkers({ available: false, models: [] })); }, [load]);
  async function send(method: "POST" | "PATCH") {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/cloudflare", { method, credentials: "include", headers: { "Content-Type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify({ enabled: cf?.enabled ?? false, accountId, token }) } : {}) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "Error");
      setCf(d.cloudflare); setToken("");
      toast.success(method === "POST" ? tx(["تنظیمات Cloudflare ذخیره شد", "Cloudflare settings saved", "Cloudflare-Einstellungen gespeichert", "Cloudflare ayarları kaydedildi"]) : tx(["اتصال Cloudflare تأیید شد", "Cloudflare connection verified", "Cloudflare-Verbindung bestätigt", "Cloudflare bağlantısı doğrulandı"]));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); if (method === "PATCH") await load(); }
    finally { setBusy(false); }
  }
  const tone = cf?.status === "ACTIVE" ? "green" : cf?.status === "ACTIVE_LIMITED" ? "orange" : cf?.status === "ERROR" ? "red" : "";
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Cloud" size={28} /></span>
        <div>
          <h2>{tx(["Cloudflare و زیرساخت", "Cloudflare infrastructure", "Cloudflare-Infrastruktur", "Cloudflare altyapısı"])}</h2>
          <p>{tx(["توکن رمزنگاری می‌شود و بعد از ذخیره دوباره نمایش داده نمی‌شود.", "The token is encrypted and never displayed again after saving.", "Das Token wird verschlüsselt und danach nie wieder angezeigt.", "Token şifrelenir ve kaydedildikten sonra tekrar gösterilmez."])}</p>
        </div>
      </div>
      <div className="admin-rate-layout">
        <form className="panel admin-package-form" onSubmit={(e) => { e.preventDefault(); void send("POST"); }}>
          <div className="row-between"><h3>{tx(["اتصال حساب", "Account connection", "Kontoverbindung", "Hesap bağlantısı"])}</h3><span className={"badge " + tone}>{cf?.status || "…"}</span></div>
          {cf?.configured && <small>{tx(["کلید ثبت شده", "Credential saved", "Zugangsdaten gespeichert", "Kimlik bilgisi kayıtlı"])}{cf.accountName ? " · " + cf.accountName : ""}{cf.lastCheckedAt ? " · " + date(cf.lastCheckedAt) : ""}</small>}
          <label>Account ID<input dir="ltr" value={accountId} onChange={(e) => setAccountId(e.target.value.trim())} /></label>
          <label>API Token<input dir="ltr" type="password" autoComplete="new-password" value={token} placeholder={cf?.configured ? tx(["برای حفظ کلید فعلی خالی بگذارید", "Leave blank to keep the saved token", "Leer lassen, um das Token zu behalten", "Kayıtlı tokenı korumak için boş bırakın"]) : "cfut_…"} onChange={(e) => setToken(e.target.value)} /></label>
          <label className="toggle-row"><span>{tx(["فعال در پلتفرم", "Enabled in platform", "In Plattform aktiviert", "Platformda etkin"])}</span><input type="checkbox" checked={cf?.enabled ?? false} onChange={(e) => setCf((c) => (c ? { ...c, enabled: e.target.checked } : c))} /></label>
          {cf?.lastError && <p role="alert">{cf.lastError}</p>}
          <div className="domain-actions">
            <Button type="submit" variant="primary" disabled={busy || !cf}><Icon name="Save" size={16} />{tx(["ذخیره امن", "Save securely", "Sicher speichern", "Güvenli kaydet"])}</Button>
            <Button disabled={busy || !cf?.configured} onClick={() => void send("PATCH")}><Icon name="ShieldCheck" size={16} />{tx(["تست اتصال", "Test connection", "Verbindung testen", "Bağlantıyı test et"])}</Button>
          </div>
        </form>
        <section className="panel">
          <h3>Workers AI</h3>
          <p>{workers ? (workers.available ? tx(["دسترسی مدل‌های هوش مصنوعی تأیید شد", "AI model access verified", "KI-Modellzugriff bestätigt", "AI model erişimi doğrulandı"]) : tx(["مجوز Workers AI یا اتصال را بررسی کنید", "Check Workers AI permissions and connectivity", "Workers-AI-Rechte und Verbindung prüfen", "Workers AI izinlerini ve bağlantıyı kontrol edin"])) : "…"}</p>
          {workers?.available && <div className="stats-grid"><div className="panel stat"><span>{tx(["مدل متنی", "Text models", "Textmodelle", "Metin modeli"])}</span><strong>{n(workers.models.filter((m) => m.task === "Text Generation").length)}</strong></div><div className="panel stat"><span>{tx(["مدل تصویر", "Image models", "Bildmodelle", "Görsel modeli"])}</span><strong>{n(workers.models.filter((m) => m.task === "Text-to-Image").length)}</strong></div></div>}
          <p className="fine-print">{tx(["مجوز Workers AI مستقل از خواندن تنظیمات Account است. مدل‌های ثبت‌شده در مدیریت LLM و کارخانهٔ ویدیو قابل مدیریت‌اند.", "Workers AI access is independent of Account Settings Read. Registered models are managed in the LLM manager and Video Factory.", "Workers-AI-Rechte sind unabhängig von Account Settings Read. Modelle werden im LLM-Manager verwaltet.", "Workers AI erişimi Account Settings Read izninden bağımsızdır. Modeller LLM yöneticisinde yönetilir."])} <Link className="text-link" href="/admin/llm">LLM ↗</Link></p>
        </section>
      </div>
    </>
  );
}
