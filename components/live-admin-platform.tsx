"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/**
 * Module switches (/api/admin/modules) and the public 1980s share page
 * (/api/admin/public-share) on aifekr.com, same actions as the classic pages.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i] }; };

type Module = { id: string; key: string; name: string; description: string | null; status: string; minPlan: string; isCore: boolean; sortOrder: number };
const STATUS: Record<string, [Tx, string]> = {
  enabled: [["فعال", "Enabled", "Aktiv", "Etkin"], "green"], disabled: [["غیرفعال", "Disabled", "Deaktiviert", "Kapalı"], "red"],
  maintenance: [["نگهداری", "Maintenance", "Wartung", "Bakım"], "orange"], beta: [["بتا", "Beta", "Beta", "Beta"], ""],
};

export function LiveAdminModules() {
  const { tx } = useTx();
  const [mods, setMods] = useState<Module[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await fetch("/api/admin/modules", { credentials: "include" }); setMods(r.ok ? (await r.json()).modules ?? [] : []); }, []);
  useEffect(() => { void load(); }, [load]);
  async function setStatus(m: Module, status: string) {
    if (status !== "enabled" && !confirm(tx(["این بخش از منوی کاربران برداشته می‌شود و صفحه‌ها و APIهایش بسته می‌شوند (تا ۳۰ ثانیه). ادامه می‌دهید؟", "This section is removed from users’ menus and its pages and APIs close (within 30 seconds). Continue?", "Dieser Bereich verschwindet aus den Menüs, Seiten und APIs werden gesperrt (bis 30 s). Fortfahren?", "Bu bölüm kullanıcı menülerinden kalkar, sayfa ve API’leri kapanır (30 sn içinde). Devam edilsin mi?"]))) return;
    setSaving(m.key);
    try {
      const r = await fetch("/api/admin/modules", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: m.key, status }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      setMods((all) => all?.map((x) => (x.key === m.key ? { ...x, status } : x)) ?? null);
      toast.success(tx(["وضعیت ماژول ذخیره شد", "Module status saved", "Modulstatus gespeichert", "Modül durumu kaydedildi"]));
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setSaving(null); }
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Puzzle" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت ماژول‌ها", "Modules", "Module", "Modüller"])}</h2>
          <p>{tx(["«غیرفعال» یا «نگهداری» بخش را از منوی کاربران حذف می‌کند و صفحه‌ها و APIهای آن را می‌بندد (حداکثر ۳۰ ثانیه تا اعمال). ماژول‌های اصلی قابل غیرفعال‌سازی نیستند.", "“Disabled” or “Maintenance” removes a section from users’ menus and closes its pages and APIs (applies within 30 seconds). Core modules cannot be disabled.", "„Deaktiviert“ oder „Wartung“ entfernt den Bereich aus den Menüs und sperrt Seiten und APIs (innerhalb von 30 s). Kernmodule sind nicht abschaltbar.", "“Kapalı” veya “Bakım” bölümü menülerden kaldırır, sayfa ve API’lerini kapatır (30 sn içinde). Çekirdek modüller kapatılamaz."])}</p>
        </div>
        <Button onClick={() => void load()}><Icon name="RefreshCw" size={16} />{tx(["بارگذاری مجدد", "Reload", "Neu laden", "Yenile"])}</Button>
      </div>
      <nav className="admin-finance-links">
        <Link className="btn" href="/admin/packages">{tx(["پکیج‌ها", "Packages", "Pakete", "Paketler"])}</Link>
        <Link className="btn" href="/admin/module-access">{tx(["دسترسی ماژول‌ها", "Module access", "Modulzugriff", "Modül erişimi"])}</Link>
      </nav>
      <div className="tool-grid" aria-busy={!mods}>
        {mods?.map((m) => (
          <article className="panel admin-module-card" key={m.key}>
            <div className="row-between">
              <h3>{m.name}</h3>
              <span className={"badge " + (STATUS[m.status]?.[1] ?? "")}>{STATUS[m.status] ? tx(STATUS[m.status][0]) : m.status}</span>
            </div>
            <code dir="ltr">{m.key}</code>
            {m.isCore && <span className="badge">{tx(["هسته", "Core", "Kern", "Çekirdek"])}</span>}
            {m.key === "voice-studio" && <p className="fine-print">{tx(["فعال بودن ماژول فقط دسترسی را باز می‌کند.", "Enabling the module only opens access.", "Die Aktivierung öffnet nur den Zugang.", "Etkinleştirme yalnızca erişimi açar."])} <Link className="text-link" href="/admin/voice-studio">{tx(["تنظیم اتصال تولید صدا", "Set up voice generation", "Sprachgenerierung einrichten", "Ses üretimini ayarla"])}</Link></p>}
            <label>{tx(["وضعیت", "Status", "Status", "Durum"])}
              <select value={m.status} disabled={!!saving || m.isCore} onChange={(e) => void setStatus(m, e.target.value)}>
                {Object.keys(STATUS).map((s) => <option key={s} value={s}>{tx(STATUS[s][0])}</option>)}
              </select>
            </label>
          </article>
        ))}
      </div>
      {mods && !mods.length && <Empty />}
    </>
  );
}

type Share = { visitsByDay: { date: string; count: number }[]; totalVisits: number; dailyCap: number; totalGenerations: number; todayGenerations: number };

export function LivePublicShare() {
  const { n, tx } = useTx();
  const [s, setS] = useState<Share | null>(null);
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/admin/public-share", { credentials: "include" }); if (r.ok) { const d = await r.json(); setS(d); setCap(String(d.dailyCap)); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/public-share", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyCap: cap }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(tx(["سقف روزانه ذخیره شد", "Daily cap saved", "Tageslimit gespeichert", "Günlük sınır kaydedildi"])); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setBusy(false); }
  }
  const peak = Math.max(1, ...(s?.visitsByDay.map((v) => v.count) ?? [1]));
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Share2" size={28} /></span>
        <div>
          <h2>{tx(["صفحهٔ عمومی عکس دهه شصتی", "Public 1980s photo page", "Öffentliche 80er-Fotoseite", "Herkese açık 80’ler fotoğraf sayfası"])}</h2>
          <p>{tx(["بازدیدها و سقف روزانهٔ ساخت عکس در صفحهٔ اشتراک‌گذاری عمومی.", "Visits and the daily photo generation cap on the public share page.", "Besuche und Tageslimit für Fotos auf der öffentlichen Seite.", "Herkese açık sayfadaki ziyaretler ve günlük fotoğraf sınırı."])}</p>
        </div>
        <a className="btn" href="/share/1980s" target="_blank" rel="noopener">{tx(["دیدن صفحه", "Open page", "Seite öffnen", "Sayfayı aç"])} ↗</a>
      </div>
      <div className="stats-grid" aria-busy={!s}>
        {([[tx(["کل بازدیدها", "Total visits", "Besuche gesamt", "Toplam ziyaret"]), s?.totalVisits], [tx(["عکس‌های ساخته‌شده", "Photos generated", "Erstellte Fotos", "Üretilen fotoğraf"]), s?.totalGenerations], [tx(["ساخت امروز", "Generated today", "Heute erstellt", "Bugün üretilen"]), s?.todayGenerations], [tx(["سقف روزانه", "Daily cap", "Tageslimit", "Günlük sınır"]), s?.dailyCap]] as [string, number | undefined][]).map(([a, b]) => <div className="panel stat" key={a}><span>{a}</span><strong>{b === undefined ? "—" : n(b)}</strong></div>)}
      </div>
      <div className="admin-pulse-grid">
        <div className="panel">
          <h3>{tx(["بازدید روزانه (۱۴ روز اخیر)", "Daily visits (last 14 days)", "Tägliche Besuche (14 Tage)", "Günlük ziyaret (son 14 gün)"])}</h3>
          {s?.visitsByDay.length ? <div className="admin-pulse-bars" role="img" aria-label={tx(["نمودار بازدید", "Visits chart", "Besuchsdiagramm", "Ziyaret grafiği"])}>{s.visitsByDay.map((v) => <i key={v.date} style={{ height: Math.max(3, (v.count / peak) * 100) + "%" }} title={v.date + " · " + n(v.count)} />)}</div> : s && <p className="fine-print">{tx(["هنوز بازدیدی ثبت نشده", "No visits yet", "Noch keine Besuche", "Henüz ziyaret yok"])}</p>}
        </div>
        <form className="panel admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <h3>{tx(["سقف روزانهٔ ساخت عکس", "Daily photo generation cap", "Tageslimit für Fotos", "Günlük fotoğraf sınırı"])}</h3>
          <label>{tx(["تعداد در روز", "Per day", "Pro Tag", "Günlük"])}<input type="number" min={1} dir="ltr" value={cap} onChange={(e) => setCap(e.target.value)} /></label>
          <Button type="submit" variant="primary" disabled={busy || !s}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
        </form>
      </div>
    </>
  );
}
