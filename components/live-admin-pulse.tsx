"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Icon } from "./ui";

/** Today's real figures on the admin control center (main site /api/admin/stats). */
type Stats = { totalUsers: number; todayUsers: number; activeSubscriptions: number; todayRevenue: number; revenueChange: string; todayRequests: number; requestsChange: string };
type Activity = { id: string; type: string; model: string | null; credits: number; createdAt: string; user: { id: string; name: string | null; email: string | null } | null };
type Data = { stats: Stats; planDistribution: { plan: string; count: number }[]; revenueByDay: Record<string, number>; recentActivity: Activity[] };
type Tx = [string, string, string, string];

export function LiveAdminPulse() {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" }).then(async (r) => { if (!r.ok) throw Error(); setData(await r.json()); }).catch(() => setFailed(true));
  }, []);
  if (failed) return <p className="fine-print" role="alert">{tx(["آمار امروز دریافت نشد.", "Today’s figures could not be loaded.", "Heutige Zahlen konnten nicht geladen werden.", "Bugünün verileri yüklenemedi."])}</p>;
  const s = data?.stats;
  const change = (v?: string) => { const x = Number(v); return !v || !x ? null : <small className={x > 0 ? "up" : "down"} dir="ltr">{x > 0 ? "+" : ""}{n(x)}%</small>; };
  const days = Array.from({ length: 30 }, (_, k) => { const d = new Date(Date.now() - (29 - k) * 86400000).toISOString().slice(0, 10); return [d, data?.revenueByDay[d] ?? 0] as const; });
  const peak = Math.max(1, ...days.map(([, v]) => v));
  const totalPlans = Math.max(1, ...(data ? [data.planDistribution.reduce((a, p) => a + p.count, 0)] : [1]));
  const time = (iso: string) => new Date(iso).toLocaleTimeString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { hour: "2-digit", minute: "2-digit" });
  return (
    <section className="admin-pulse" aria-busy={!data}>
      <div className="stats-grid">
        {([
          [tx(["کل کاربران", "Total users", "Benutzer gesamt", "Toplam kullanıcı"]), s?.totalUsers, s ? <small>+{n(s.todayUsers)} {tx(["امروز", "today", "heute", "bugün"])}</small> : null, "/admin/users"],
          [tx(["اشتراک فعال", "Active subscriptions", "Aktive Abos", "Aktif abonelik"]), s?.activeSubscriptions, null, "/admin/subscriptions"],
          [tx(["درآمد امروز (تومان)", "Revenue today (Toman)", "Umsatz heute (Toman)", "Bugünkü gelir (Tümen)"]), s?.todayRevenue, change(s?.revenueChange), "/admin/financial"],
          [tx(["درخواست‌های امروز", "Requests today", "Anfragen heute", "Bugünkü istekler"]), s?.todayRequests, change(s?.requestsChange), "/admin/usage"],
        ] as [string, number | undefined, React.ReactNode, string][]).map(([label, value, extra, href]) => (
          <Link className="panel stat admin-pulse-stat" href={href} key={label}><span>{label}</span><strong>{value === undefined ? "—" : n(value)}</strong>{extra}</Link>
        ))}
      </div>
      <div className="admin-pulse-grid">
        <div className="panel">
          <h3>{tx(["درآمد ۳۰ روز گذشته", "Revenue, last 30 days", "Umsatz der letzten 30 Tage", "Son 30 gün gelir"])}</h3>
          <div className="admin-pulse-bars" role="img" aria-label={tx(["نمودار درآمد روزانه", "Daily revenue chart", "Tagesumsatz-Diagramm", "Günlük gelir grafiği"])}>
            {days.map(([d, v]) => <i key={d} style={{ height: Math.max(3, (v / peak) * 100) + "%" }} title={d + " · " + n(v)} />)}
          </div>
        </div>
        <div className="panel">
          <h3>{tx(["توزیع پلن‌ها", "Plan distribution", "Tarifverteilung", "Plan dağılımı"])}</h3>
          {data?.planDistribution.sort((a, b) => b.count - a.count).slice(0, 6).map((p) => (
            <div className="admin-pulse-plan" key={p.plan}>
              <span>{shell?.copy.planNames?.[p.plan] || p.plan}</span>
              <i><b style={{ width: (p.count / totalPlans) * 100 + "%" }} /></i>
              <strong>{n(p.count)}</strong>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>{tx(["آخرین فعالیت‌ها", "Latest activity", "Letzte Aktivität", "Son etkinlik"])}</h3>
          {data?.recentActivity.length ? data.recentActivity.slice(0, 6).map((a) => (
            <div className="activity-item" key={a.id}>
              <Icon name="Activity" size={16} />
              <div>
                <strong>{a.user ? <Link href={"/admin/users/" + encodeURIComponent(a.user.id)}>{a.user.name || a.user.email || a.user.id}</Link> : tx(["حساب حذف‌شده", "Deleted account", "Gelöschtes Konto", "Silinmiş hesap"])}</strong>
                <p>{a.type}{a.model ? " · " + a.model : ""} · {time(a.createdAt)}</p>
              </div>
            </div>
          )) : data && <p className="fine-print">{tx(["هنوز فعالیتی ثبت نشده است.", "No activity yet.", "Noch keine Aktivität.", "Henüz etkinlik yok."])}</p>}
        </div>
      </div>
    </section>
  );
}
