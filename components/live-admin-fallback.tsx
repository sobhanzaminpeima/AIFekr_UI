"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/** AI provider fallback log on aifekr.com (main site /api/admin/provider-fallback), read-only. */
type Log = { id: string; fromProvider: string; toProvider: string | null; reason: string; category: string; createdAt: string };
type Stats = { totalCount: number; hours: number; recentLogs: Log[]; byFromProvider: { fromProvider: string; count: number }[]; byCategory: { category: string; count: number }[] };
type Tx = [string, string, string, string];
const WINDOWS: [number, Tx][] = [[6, ["۶ ساعت", "6 h", "6 Std.", "6 sa"]], [24, ["۲۴ ساعت", "24 h", "24 Std.", "24 sa"]], [48, ["۲ روز", "2 days", "2 Tage", "2 gün"]], [168, ["۷ روز", "7 days", "7 Tage", "7 gün"]]];

export function LiveProviderFallback() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [hours, setHours] = useState(24);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try { const r = await fetch("/api/admin/provider-fallback?hours=" + hours, { credentials: "include" }); if (!r.ok) throw Error(); setStats(await r.json()); } catch { setFailed(true); }
    finally { setLoading(false); }
  }, [hours]);
  useEffect(() => { void load(); }, [load]);
  const time = (iso: string) => new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const share = (count: number) => (stats?.totalCount ? Math.round((count / stats.totalCount) * 100) : 0);
  const bars = (rows: [string, number][]) => rows.map(([k, c]) => <div className="admin-pulse-plan" key={k}><span dir="ltr">{k}</span><i><b style={{ width: share(c) + "%" }} /></i><strong>{n(c)} · {n(share(c))}%</strong></div>);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Zap" size={28} /></span>
        <div>
          <h2>{tx(["سوئیچ خودکار بین سرویس‌های هوش مصنوعی", "AI provider fallback log", "KI-Anbieter-Ausweichprotokoll", "AI sağlayıcı yedek geçiş kaydı"])}</h2>
          <p>{tx(["هر بار که مسیریاب به‌خاطر خطا یا کندی، درخواست را به سرویس دیگری سپرده است.", "Every time the router moved a request to another provider after an error or timeout.", "Jedes Mal, wenn der Router wegen Fehler oder Zeitüberschreitung den Anbieter gewechselt hat.", "Yönlendiricinin hata veya zaman aşımı nedeniyle sağlayıcı değiştirdiği her olay."])}</p>
        </div>
        <Button onClick={() => void load()} disabled={loading}><Icon name="RefreshCw" size={16} />{tx(["بروزرسانی", "Refresh", "Aktualisieren", "Yenile"])}</Button>
      </div>
      <nav className="admin-finance-links" aria-label={tx(["بازهٔ زمانی", "Time window", "Zeitraum", "Zaman aralığı"])}>
        {WINDOWS.map(([h, label]) => <Button key={h} variant={hours === h ? "primary" : ""} onClick={() => setHours(h)}>{tx(label)}</Button>)}
      </nav>
      {failed && <p role="alert">{tx(["دریافت گزارش انجام نشد", "Could not load the log", "Protokoll konnte nicht geladen werden", "Kayıt yüklenemedi"])}</p>}
      <div className="stats-grid" aria-busy={loading}>
        <div className="panel stat"><span>{tx(["کل سوئیچ‌ها", "Total fallbacks", "Ausweichvorgänge", "Toplam geçiş"])}</span><strong>{stats ? n(stats.totalCount) : "—"}</strong></div>
        {stats?.byFromProvider.slice(0, 3).map((p) => <div className="panel stat admin-pulse-stat" key={p.fromProvider}><span dir="ltr">{p.fromProvider}</span><strong>{n(p.count)}</strong><small>{n(share(p.count))}% {tx(["از کل", "of total", "vom Gesamt", "toplamın"])}</small></div>)}
      </div>
      <div className="admin-pulse-grid">
        <div className="panel"><h3>{tx(["خطا بر اساس سرویس", "Failures by provider", "Fehler nach Anbieter", "Sağlayıcıya göre hata"])}</h3>{stats?.byFromProvider.length ? bars(stats.byFromProvider.map((p) => [p.fromProvider, p.count])) : stats && <p className="fine-print">{tx(["سوئیچی ثبت نشده؛ همهٔ سرویس‌ها سالم‌اند.", "No fallbacks; all providers are healthy.", "Keine Ausweichvorgänge; alle Anbieter gesund.", "Geçiş yok; tüm sağlayıcılar sağlıklı."])}</p>}</div>
        <div className="panel"><h3>{tx(["خطا بر اساس نوع", "Failures by category", "Fehler nach Kategorie", "Kategoriye göre hata"])}</h3>{stats?.byCategory.length ? bars(stats.byCategory.map((c) => [c.category, c.count])) : stats && <Empty />}</div>
      </div>
      <section className="panel">
        <h3>{tx(["آخرین رویدادها", "Recent fallback events", "Letzte Ereignisse", "Son olaylar"])}</h3>
        {stats?.recentLogs.length ? (
          <div className="table-scroll">
            <table className="admin-finance-table">
              <thead><tr>{[tx(["زمان", "Time", "Zeit", "Zaman"]), tx(["سرویس ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"]), tx(["جایگزین", "Picked up", "Übernommen", "Devralan"]), tx(["نوع", "Category", "Kategorie", "Kategori"]), tx(["علت", "Reason", "Grund", "Neden"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{stats.recentLogs.map((l) => (
                <tr key={l.id}>
                  <td>{time(l.createdAt)}</td>
                  <td><span className="badge red" dir="ltr">{l.fromProvider}</span></td>
                  <td>{l.toProvider ? <span className="badge green" dir="ltr">{l.toProvider}</span> : <span className="badge red">{tx(["همه ناموفق", "All failed", "Alle fehlgeschlagen", "Hepsi başarısız"])}</span>}</td>
                  <td><span className="badge">{l.category}</span></td>
                  <td className="admin-reason" title={l.reason} dir="ltr">{l.reason}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : stats && <p className="fine-print">{tx(["در این بازه رویدادی نبود.", "No fallback events in this period.", "Keine Ereignisse in diesem Zeitraum.", "Bu dönemde olay yok."])}</p>}
      </section>
    </>
  );
}
