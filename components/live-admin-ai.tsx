"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin AI and billing pages on aifekr.com:
 * - LiveInvoice (/admin/financial/invoices/<id>): GET /api/admin/payments/<id>, printable.
 * - LiveUsage (/admin/usage): /api/admin/usage + /api/admin/economics; credit rules and
 *   plan limits save to /api/admin/settings only after a confirmation listing each change.
 * - LiveLlm (/admin/llm): models from /api/admin/llm/config with the router's real
 *   routing table, on/off, custom providers and media providers. A connection test is
 *   a real (small, paid) call to the provider, so the page says so and asks first.
 *   API keys are write-only: the server only reports whether one is set.
 */
type Tx = [string, string, string, string];
function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { n, i, tx, tag };
}
async function json<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d as T;
}
const usd = (v: number) => "$" + v.toFixed(2);

/* ───────────────────────── Invoice ───────────────────────── */

type Invoice = { id: string; userId: string; plan: string; status: string; gateway: string; amount: number; transferMinor: number; transferCurrency: string | null; refId: string | null; hasReceipt: boolean; promoPercent: number; promoCode: string | null; createdAt: string; days: number | null; user: { name: string | null; email: string | null; phone: string | null } };
const STATUS: Record<string, Tx> = { SUCCESS: ["موفق", "Paid", "Bezahlt", "Ödendi"], PENDING: ["در انتظار", "Pending", "Ausstehend", "Bekliyor"], FAILED: ["ناموفق", "Failed", "Fehlgeschlagen", "Başarısız"], CANCELLED: ["لغوشده", "Cancelled", "Storniert", "İptal"], REFUNDED: ["بازپرداخت‌شده", "Refunded", "Erstattet", "İade edildi"] };

export function LiveInvoice({ id }: { id: string }) {
  const { n, tx, tag } = useT();
  const [p, setP] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/payments/" + encodeURIComponent(id), { credentials: "include" }).then((r) => json<{ payment: Invoice }>(r)).then((d) => setP(d.payment)).catch((e) => setError(e.message));
  }, [id]);
  const back = <Link className="btn" href={p ? "/admin/financial?userId=" + encodeURIComponent(p.userId) : "/admin/financial"}><Icon name="ArrowRight" size={16} />{tx(["بازگشت به خریدها", "Back to purchases", "Zurück zu Käufen", "Satın almalara dön"])}</Link>;
  if (error) return <>{back}<p className="admin-alert" role="alert">{error === "NOT_FOUND" ? tx(["این سفارش پیدا نشد.", "Order not found.", "Bestellung nicht gefunden.", "Sipariş bulunamadı."]) : error}</p></>;
  if (!p) return <section className="panel" aria-busy="true" />;
  const amount = p.gateway === "bank_transfer" ? `${p.transferMinor / 100} ${p.transferCurrency ?? ""}` : `${n(p.amount)} ${tx(["تومان", "Toman", "Toman", "Tümen"])}`;
  const paid = p.status === "SUCCESS";
  return (
    <>
      <nav className="admin-finance-links invoice-noprint">
        {back}
        <Button variant="primary" onClick={() => window.print()}><Icon name="Printer" size={16} />{tx(["چاپ یا ذخیرهٔ PDF", "Print or save PDF", "Drucken oder PDF", "Yazdır veya PDF"])}</Button>
        <Link className="btn" href={"/admin/users/" + encodeURIComponent(p.userId)}>{tx(["پروفایل خریدار", "Buyer profile", "Käuferprofil", "Alıcı profili"])}</Link>
      </nav>
      <article className="panel invoice-sheet">
        <header className="row-between">
          <div><h2>AIFekr</h2><p>{paid ? tx(["فاکتور خرید", "Purchase invoice", "Kaufrechnung", "Satın alma faturası"]) : tx(["جزئیات سفارش", "Order details", "Bestelldetails", "Sipariş detayları"])}</p></div>
          <span className={"badge " + (paid ? "green" : p.status === "PENDING" ? "amber" : "red")}>{STATUS[p.status] ? tx(STATUS[p.status]) : p.status}</span>
        </header>
        <dl className="domain-detail">
          <dt>{tx(["شمارهٔ سفارش", "Order ID", "Bestellnummer", "Sipariş numarası"])}</dt><dd><bdi dir="ltr">{p.id}</bdi></dd>
          <dt>{tx(["تاریخ", "Date", "Datum", "Tarih"])}</dt><dd>{new Date(p.createdAt).toLocaleString(tag, { dateStyle: "long", timeStyle: "short" })}</dd>
          <dt>{tx(["خریدار", "Customer", "Käufer", "Müşteri"])}</dt><dd>{p.user.name || "—"}<small><bdi dir="ltr">{[p.user.email, p.user.phone].filter(Boolean).join(" · ")}</bdi></small></dd>
          <dt>{tx(["پکیج", "Package", "Paket", "Paket"])}</dt><dd>{p.plan}</dd>
          {p.days != null && <><dt>{tx(["مدت اشتراک", "Subscription length", "Abolaufzeit", "Abonelik süresi"])}</dt><dd>{n(p.days)} {tx(["روز", "days", "Tage", "gün"])}</dd></>}
          <dt>{tx(["روش پرداخت", "Payment method", "Zahlungsart", "Ödeme yöntemi"])}</dt><dd><bdi dir="ltr">{p.gateway}</bdi></dd>
          {p.promoPercent > 0 && <><dt>{tx(["تخفیف دعوت", "Invitation discount", "Einladungsrabatt", "Davet indirimi"])}</dt><dd>{n(p.promoPercent)}% · <bdi dir="ltr">{p.promoCode}</bdi></dd></>}
          {p.refId && <><dt>{tx(["شناسهٔ پرداخت", "Payment reference", "Zahlungsreferenz", "Ödeme referansı"])}</dt><dd><bdi dir="ltr">{p.refId}</bdi></dd></>}
        </dl>
        <div className="invoice-total"><span>{tx(["مبلغ", "Amount", "Betrag", "Tutar"])}</span><strong dir="ltr">{amount}</strong></div>
        {p.hasReceipt && <a className="btn invoice-noprint" href={"/api/payment/" + encodeURIComponent(p.id) + "/receipt"} target="_blank" rel="noreferrer"><Icon name="FileImage" size={16} />{tx(["مشاهدهٔ رسید پرداخت", "View payment receipt", "Zahlungsbeleg ansehen", "Ödeme dekontunu gör"])}</a>}
      </article>
    </>
  );
}

/* ───────────────────────── Usage & cost ───────────────────────── */

type Economics = { days: number; totalCostUsd: number; revenueUsd: number; grossMarginPct: number | null; usdToToman: number; byProvider: { provider: string; costUsd: number; calls: number }[]; redFlagUsers: { userId: string; costUsd: number; user: { id: string; name: string | null; email: string | null; plan: string } | null }[] };
type Limits = { dailyChats: number; monthlyImages: number; monthlyVideos: number; monthlyMusics: number; initialCredits: number };
type Usage = { days: number; totalCalls: number; totalTokens: number; missingTokenCount: number; distinctUsers: number; byType: { type: string; calls: number; tokens: number; credits: number }[]; byModule: { module: string; calls: number; credits: number; costUsd: number }[]; byModel: { model: string; calls: number; tokens: number }[]; planLimits: Record<string, Limits>; creditCosts: Record<string, number>; toolCostLabels?: Record<string, [string, string]> };
const COST_LABELS: Record<string, Tx> = {
  AI_COURSE_GENERATION: ["تولید دورهٔ هوش مصنوعی", "AI course generation", "KI-Kurserstellung", "Yapay zekâ kurs üretimi"], chat: ["چت (هر پیام)", "Chat (per message)", "Chat (pro Nachricht)", "Sohbet (mesaj başı)"],
  image_standard: ["تصویر — استاندارد", "Image — standard", "Bild — Standard", "Görsel — standart"], image_hd: ["تصویر — HD", "Image — HD", "Bild — HD", "Görsel — HD"],
  video_5s: ["ویدیو — تا ۵ ثانیه", "Video — up to 5s", "Video — bis 5 s", "Video — 5 sn'ye kadar"], video_10s: ["ویدیو — تا ۱۰ ثانیه", "Video — up to 10s", "Video — bis 10 s", "Video — 10 sn'ye kadar"], video_30s: ["ویدیو — تا ۳۰ ثانیه", "Video — up to 30s", "Video — bis 30 s", "Video — 30 sn'ye kadar"],
  music_30s: ["موزیک — تا ۳۰ ثانیه", "Music — up to 30s", "Musik — bis 30 s", "Müzik — 30 sn'ye kadar"], music_60s: ["موزیک — تا ۶۰ ثانیه", "Music — up to 60s", "Musik — bis 60 s", "Müzik — 60 sn'ye kadar"], music_120s: ["موزیک — تا ۱۲۰ ثانیه", "Music — up to 120s", "Musik — bis 120 s", "Müzik — 120 sn'ye kadar"],
  tool: ["ابزار عمومی", "General tool", "Allgemeines Werkzeug", "Genel araç"], live_turn: ["AIFekr Live — هر نوبت گفتگو", "AIFekr Live — per turn", "AIFekr Live — pro Runde", "AIFekr Canlı — tur başı"],
  live_tts_100: ["AIFekr Live — هر ۱۰۰ کاراکتر صوتی", "AIFekr Live — per 100 spoken chars", "AIFekr Live — pro 100 gesprochene Zeichen", "AIFekr Canlı — 100 sesli karakter başı"], live_realtime_minute: ["AIFekr Live زنده — هر دقیقه", "AIFekr Live realtime — per minute", "AIFekr Live Echtzeit — pro Minute", "AIFekr Canlı gerçek zamanlı — dakika başı"],
};
const LIMIT_FIELDS: [keyof Limits, Tx][] = [["dailyChats", ["چت روزانه", "Daily chats", "Chats pro Tag", "Günlük sohbet"]], ["monthlyImages", ["تصویر ماهانه", "Monthly images", "Bilder pro Monat", "Aylık görsel"]], ["monthlyVideos", ["ویدیو ماهانه", "Monthly videos", "Videos pro Monat", "Aylık video"]], ["monthlyMusics", ["موزیک ماهانه", "Monthly music", "Musik pro Monat", "Aylık müzik"]], ["initialCredits", ["اعتبار اولیه", "Starting credits", "Startguthaben", "Başlangıç kredisi"]]];

export function LiveUsage() {
  const { n, i, tx } = useT();
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState<"all" | "student">("all");
  const [stats, setStats] = useState<Usage | null>(null);
  const [econ, setEcon] = useState<Economics | null>(null);
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Record<string, number> | null>(null);
  const [limits, setLimits] = useState<Record<string, Limits> | null>(null);
  const [ask, setAsk] = useState<null | { kind: "costs" | "limits"; changes: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<{ users: number; revenue: number; cost: number } | null>(null);
  const [calc, setCalc] = useState({ input: 0.2, cached: 0.02, output: 1.25, outShare: 30, cacheShare: 0 });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([fetch(`/api/admin/usage?days=${days}&scope=${scope}`, { credentials: "include" }), fetch(`/api/admin/economics?days=${days}`, { credentials: "include" })]);
      const data = await json<Usage>(u);
      setStats(data);
      setCosts((c) => c ?? data.creditCosts);
      setLimits((l) => l ?? data.planLimits);
      if (e.ok) setEcon(await e.json());
    } catch (err) { toast.error(err instanceof Error ? err.message : "FAILED"); } finally { setLoading(false); }
  }, [days, scope]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (sim || !econ || !stats || !stats.distinctUsers) return;
    setSim({ users: stats.distinctUsers, revenue: Math.round((econ.revenueUsd / stats.distinctUsers) * 100) / 100 || 20, cost: Math.round((econ.totalCostUsd / stats.distinctUsers) * 100) / 100 || 2 });
  }, [econ, stats, sim]);
  const costLabel = (k: string) => COST_LABELS[k] ? tx(COST_LABELS[k]) : stats?.toolCostLabels?.[k] ? stats.toolCostLabels[k][i === 0 ? 0 : 1] : k;
  const costChanges = useMemo(() => (costs && stats ? Object.keys(costs).filter((k) => costs[k] !== stats.creditCosts[k]).map((k) => `${costLabel(k)}: ${n(stats.creditCosts[k] ?? 0)} → ${n(costs[k])}`) : []), [costs, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const limitChanges = useMemo(() => {
    if (!limits || !stats) return [];
    const out: string[] = [];
    for (const plan of Object.keys(limits)) for (const [f, l] of LIMIT_FIELDS) if (limits[plan][f] !== stats.planLimits[plan]?.[f]) out.push(`${plan} · ${tx(l)}: ${n(stats.planLimits[plan]?.[f] ?? 0)} → ${n(limits[plan][f])}`);
    return out;
  }, [limits, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(kind: "costs" | "limits") {
    setBusy(true); setAsk(null);
    try {
      const settings = kind === "costs" ? { creditCosts: JSON.stringify(costs) } : { planLimits: JSON.stringify(limits) };
      await json(await fetch("/api/admin/settings", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) }));
      setStats((s) => (s ? { ...s, ...(kind === "costs" ? { creditCosts: costs! } : { planLimits: limits! }) } : s));
      toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"]));
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  const tokens = stats?.totalTokens ?? 0;
  const out = tokens * (calc.outShare / 100), inTotal = tokens - out, cached = inTotal * (calc.cacheShare / 100);
  const estCost = ((inTotal - cached) / 1e6) * calc.input + (cached / 1e6) * calc.cached + (out / 1e6) * calc.output;
  const table = (heads: Tx[], rows: React.ReactNode[][]) => rows.length ? <div className="table-scroll"><table className="admin-finance-table"><thead><tr>{heads.map((h) => <th key={h[1]}>{tx(h)}</th>)}</tr></thead><tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div> : <Empty />;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Coins" size={28} /></span>
        <div>
          <h2>{tx(["مصرف و هزینهٔ هوش مصنوعی", "AI usage and cost", "KI-Nutzung und Kosten", "Yapay zekâ kullanımı ve maliyeti"])}</h2>
          <p>{tx(["آمار واقعی مصرف، هزینهٔ واقعی AI در برابر درآمد، قوانین کردیت و سقف پلن‌ها.", "Real usage, real AI cost against revenue, credit rules and plan limits.", "Echte Nutzung, echte KI-Kosten gegenüber Umsatz, Credit-Regeln und Tariflimits.", "Gerçek kullanım, gelire karşı gerçek yapay zekâ maliyeti, kredi kuralları ve plan sınırları."])}</p>
        </div>
      </div>
      <div className="domain-toolbar">
        <select aria-label={tx(["بخش", "Scope", "Bereich", "Kapsam"])} value={scope} onChange={(e) => setScope(e.target.value as "all" | "student")}><option value="all">{tx(["همهٔ ماژول‌ها", "All modules", "Alle Module", "Tüm modüller"])}</option><option value="student">{tx(["فقط دانشجویی", "Student only", "Nur Studium", "Yalnızca öğrenci"])}</option></select>
        <nav className="gc-chips">{[7, 30, 90].map((d) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{n(d)} {tx(["روز", "days", "Tage", "gün"])}</button>)}</nav>
        <Button label={tx(["تازه‌سازی", "Refresh", "Aktualisieren", "Yenile"])} disabled={loading} onClick={() => void load()}><Icon name="RefreshCw" size={16} /></Button>
      </div>
      {stats && <div className="stats-grid" aria-busy={loading}>
        <div className="panel stat"><span>{tx(["کل درخواست‌ها", "Requests", "Anfragen", "İstekler"])}</span><strong>{n(stats.totalCalls)}</strong></div>
        <div className="panel stat"><span>{tx(["توکن ثبت‌شده", "Recorded tokens", "Erfasste Tokens", "Kayıtlı token"])}</span><strong>{n(stats.totalTokens)}</strong></div>
        <div className="panel stat"><span>{tx(["کاربران فعال", "Active users", "Aktive Nutzer", "Aktif kullanıcılar"])}</span><strong>{n(stats.distinctUsers)}</strong></div>
        <div className="panel stat"><span>{tx(["هزینهٔ AI", "AI cost", "KI-Kosten", "Yapay zekâ maliyeti"])}</span><strong>{econ ? usd(econ.totalCostUsd) : "—"}</strong></div>
      </div>}
      {!!stats?.missingTokenCount && <p className="admin-note">{tx([`${n(stats.missingTokenCount)} از ${n(stats.totalCalls)} درخواست متنی توکن ثبت‌شده ندارند (رکوردهای قدیمی یا سرویس‌هایی که مصرف گزارش نمی‌دهند). عدد توکن یک کف مصرف است، نه سقف آن.`, `${n(stats.missingTokenCount)} of ${n(stats.totalCalls)} text requests have no recorded tokens (older rows or providers that don't report usage). The token number is a floor, not a ceiling.`, `${n(stats.missingTokenCount)} von ${n(stats.totalCalls)} Textanfragen haben keine Tokenangabe. Die Tokenzahl ist eine Untergrenze.`, `${n(stats.totalCalls)} metin isteğinin ${n(stats.missingTokenCount)} tanesinde token kaydı yok. Token sayısı bir alt sınırdır.`])}</p>}

      {econ && <section className="panel usage-econ">
        <h3>{tx(["اقتصاد واحد", "Unit economics", "Unit Economics", "Birim ekonomisi"])} <small>{tx(["هزینهٔ واقعی AI در برابر درآمد واقعی پرداخت‌های موفق", "Real AI cost against real revenue from successful payments", "Echte KI-Kosten gegenüber echtem Umsatz", "Gerçek ödemelerden gelire karşı gerçek maliyet"])}</small></h3>
        <dl className="usage-figures">
          <div><dt>{tx(["هزینهٔ AI", "AI cost", "KI-Kosten", "Maliyet"])} ({n(econ.days)} {tx(["روز", "days", "Tage", "gün"])})</dt><dd>{usd(econ.totalCostUsd)}</dd></div>
          <div><dt>{tx(["درآمد", "Revenue", "Umsatz", "Gelir"])}</dt><dd>{usd(econ.revenueUsd)}</dd></div>
          <div><dt>{tx(["حاشیهٔ ناخالص", "Gross margin", "Bruttomarge", "Brüt marj"])}</dt><dd className={econ.grossMarginPct == null ? "" : econ.grossMarginPct < 0 ? "neg" : "pos"}>{econ.grossMarginPct == null ? "—" : econ.grossMarginPct.toFixed(1) + "%"}</dd></div>
          <div><dt>{tx(["نرخ دلار", "USD rate", "USD-Kurs", "USD kuru"])}</dt><dd>{n(Math.round(econ.usdToToman))} {tx(["تومان", "Toman", "Toman", "Tümen"])}</dd></div>
        </dl>
        {!!econ.byProvider.length && table([["ارائه‌دهنده", "Provider", "Anbieter", "Sağlayıcı"], ["تعداد", "Calls", "Aufrufe", "Çağrı"], ["هزینه", "Cost", "Kosten", "Maliyet"]], econ.byProvider.map((p) => [p.provider, n(p.calls), usd(p.costUsd)]))}
        {!!econ.redFlagUsers.length && <>
          <h3 className="warn"><Icon name="ShieldAlert" size={16} /> {tx([`کاربران پرهزینه (${n(econ.redFlagUsers.length)}) — بیش از ۵ دلار در این بازه`, `High-cost users (${n(econ.redFlagUsers.length)}) — over $5 in this range`, `Kostenintensive Nutzer (${n(econ.redFlagUsers.length)}) — über 5 $`, `Yüksek maliyetli kullanıcılar (${n(econ.redFlagUsers.length)}) — 5 $ üzeri`])}</h3>
          {table([["کاربر", "User", "Benutzer", "Kullanıcı"], ["پلن", "Plan", "Tarif", "Plan"], ["هزینه", "Cost", "Kosten", "Maliyet"]], econ.redFlagUsers.map((r) => [<Link key="u" href={"/admin/users/" + encodeURIComponent(r.userId)}>{r.user?.name || r.user?.email || r.userId}</Link>, r.user?.plan ?? "—", usd(r.costUsd)]))}
        </>}
        {sim && <details className="usage-sim">
          <summary>{tx(["شبیه‌ساز درآمد", "Revenue simulator", "Umsatzsimulator", "Gelir simülatörü"])}</summary>
          <div className="domain-fields">
            <label>{tx(["تعداد کاربر", "Users", "Nutzer", "Kullanıcı"])}<input type="number" min={0} dir="ltr" value={sim.users} onChange={(e) => setSim({ ...sim, users: Number(e.target.value) })} /></label>
            <label>{tx(["درآمد هر کاربر ($)", "Revenue per user ($)", "Umsatz pro Nutzer ($)", "Kullanıcı başı gelir ($)"])}<input type="number" min={0} step={0.01} dir="ltr" value={sim.revenue} onChange={(e) => setSim({ ...sim, revenue: Number(e.target.value) })} /></label>
            <label>{tx(["هزینهٔ AI هر کاربر ($)", "AI cost per user ($)", "KI-Kosten pro Nutzer ($)", "Kullanıcı başı maliyet ($)"])}<input type="number" min={0} step={0.01} dir="ltr" value={sim.cost} onChange={(e) => setSim({ ...sim, cost: Number(e.target.value) })} /></label>
          </div>
          {(() => { const rev = sim.users * sim.revenue, cost = sim.users * sim.cost, m = rev > 0 ? ((rev - cost) / rev) * 100 : null; return <p>{tx(["درآمد ماهانه", "Monthly revenue", "Monatsumsatz", "Aylık gelir"])}: <b dir="ltr">{usd(rev)}</b> · {tx(["هزینهٔ AI", "AI cost", "KI-Kosten", "Maliyet"])}: <b dir="ltr">{usd(cost)}</b> · {tx(["حاشیه", "Margin", "Marge", "Marj"])}: <b>{m == null ? "—" : m.toFixed(1) + "%"}</b></p>; })()}
          <p className="fine-print">{tx(["مقادیر اولیه از میانگین واقعی کاربران فعال این بازه است. فقط محاسبهٔ داخل صفحه است و چیزی ذخیره نمی‌شود.", "Starting values are the real average of this range's active users. Calculated in the page only; nothing is saved.", "Startwerte sind der echte Durchschnitt dieses Zeitraums. Nur Berechnung, nichts wird gespeichert.", "Başlangıç değerleri bu aralığın gerçek ortalamasıdır. Yalnızca hesaplama; hiçbir şey kaydedilmez."])}</p>
        </details>}
      </section>}

      {stats && <>
        <div className="gc-two">
          <section className="panel"><h3>{tx(["مصرف به تفکیک ماژول", "By module", "Nach Modul", "Modüle göre"])}</h3>{table([["ماژول", "Module", "Modul", "Modül"], ["تعداد", "Calls", "Aufrufe", "Çağrı"], ["کردیت", "Credits", "Credits", "Kredi"], ["هزینه", "Cost", "Kosten", "Maliyet"]], stats.byModule.map((m) => [m.module, n(m.calls), n(m.credits), usd(m.costUsd)]))}</section>
          <section className="panel"><h3>{tx(["مصرف به تفکیک مدل", "By model", "Nach Modell", "Modele göre"])}</h3>{table([["مدل", "Model", "Modell", "Model"], ["تعداد", "Calls", "Aufrufe", "Çağrı"], ["توکن", "Tokens", "Tokens", "Token"]], stats.byModel.map((m) => [<bdi key="m" dir="ltr">{m.model}</bdi>, n(m.calls), n(m.tokens)]))}</section>
        </div>
        <section className="panel"><h3>{tx(["مصرف به تفکیک نوع", "By type", "Nach Typ", "Türe göre"])}</h3>{table([["نوع", "Type", "Typ", "Tür"], ["تعداد", "Calls", "Aufrufe", "Çağrı"], ["توکن", "Tokens", "Tokens", "Token"], ["کردیت", "Credits", "Credits", "Kredi"]], stats.byType.map((r) => [<bdi key="t" dir="ltr">{r.type}</bdi>, n(r.calls), n(r.tokens), n(r.credits)]))}</section>

        <details className="panel">
          <summary>{tx(["محاسبه‌گر فرضی هزینهٔ توکن", "Token cost calculator (what-if)", "Tokenkostenrechner (Annahme)", "Token maliyet hesaplayıcı (varsayım)"])}</summary>
          <p>{tx(["نتیجه با نرخ‌های زیر", "Result at these rates", "Ergebnis mit diesen Preisen", "Bu fiyatlarla sonuç"])}: <b dir="ltr">{usd(estCost)}</b></p>
          <div className="domain-fields usage-calc">
            {([["input", ["ورودی ($/1M توکن)", "Input ($/1M tokens)", "Eingabe ($/1M)", "Girdi ($/1M)"], 0.01], ["cached", ["ورودی کش‌شده ($/1M)", "Cached input ($/1M)", "Cache-Eingabe ($/1M)", "Önbellek girdi ($/1M)"], 0.01], ["output", ["خروجی ($/1M توکن)", "Output ($/1M tokens)", "Ausgabe ($/1M)", "Çıktı ($/1M)"], 0.01], ["outShare", ["سهم خروجی (%)", "Output share (%)", "Ausgabeanteil (%)", "Çıktı payı (%)"], 1], ["cacheShare", ["سهم کش از ورودی (%)", "Cached share of input (%)", "Cache-Anteil (%)", "Önbellek payı (%)"], 1]] as [keyof typeof calc, Tx, number][]).map(([k, l, step]) => <label key={k}>{tx(l)}<input type="number" step={step} dir="ltr" value={calc[k]} onChange={(e) => setCalc({ ...calc, [k]: Number(e.target.value) })} /></label>)}
          </div>
          <p className="fine-print">{tx(["جدا از هزینهٔ واقعی AI بالا؛ نرخ‌ها نمونه‌اند و فقط در همین صفحه حساب می‌شوند.", "Separate from the real AI cost above; the rates are samples and only calculated in this page.", "Unabhängig von den echten Kosten oben; Beispielpreise, nur im Browser berechnet.", "Yukarıdaki gerçek maliyetten ayrıdır; örnek fiyatlar, yalnızca sayfada hesaplanır."])}</p>
        </details>

        <section className="panel">
          <div className="row-between">
            <h3>{tx(["قوانین کردیت — هزینهٔ هر عملیات", "Credit rules — cost per action", "Credit-Regeln — Kosten pro Aktion", "Kredi kuralları — işlem başı maliyet"])}</h3>
            <Button variant="primary" disabled={busy || !costChanges.length} onClick={() => setAsk({ kind: "costs", changes: costChanges })}><Icon name="Save" size={16} />{tx(["ذخیرهٔ تغییرات", "Save changes", "Änderungen speichern", "Değişiklikleri kaydet"])}{costChanges.length ? " (" + n(costChanges.length) + ")" : ""}</Button>
          </div>
          <p className="fine-print">{tx(["بلافاصله روی همهٔ کسر کردیت‌ها اثر می‌کند و نیازی به انتشار ندارد.", "Applies to every credit charge immediately, no release needed.", "Gilt sofort für alle Abbuchungen, ohne Release.", "Tüm kredi kesintilerine hemen uygulanır, yayın gerekmez."])}</p>
          {costs && <div className="usage-costs">{Object.entries(costs).map(([k, v]) => <label key={k} className={v !== stats.creditCosts[k] ? "changed" : ""}><span>{costLabel(k)}</span><input type="number" min={0} dir="ltr" value={v} onChange={(e) => setCosts({ ...costs, [k]: Number(e.target.value) })} /></label>)}</div>}
        </section>

        <section className="panel">
          <div className="row-between">
            <h3>{tx(["سقف مصرف هر پلن", "Plan limits", "Tariflimits", "Plan sınırları"])}</h3>
            <Button variant="primary" disabled={busy || !limitChanges.length} onClick={() => setAsk({ kind: "limits", changes: limitChanges })}><Icon name="Save" size={16} />{tx(["ذخیرهٔ تغییرات", "Save changes", "Änderungen speichern", "Değişiklikleri kaydet"])}{limitChanges.length ? " (" + n(limitChanges.length) + ")" : ""}</Button>
          </div>
          {limits && <div className="table-scroll"><table className="admin-finance-table usage-limits">
            <thead><tr><th>{tx(["پلن", "Plan", "Tarif", "Plan"])}</th>{LIMIT_FIELDS.map(([, l]) => <th key={l[1]}>{tx(l)}</th>)}</tr></thead>
            <tbody>{Object.entries(limits).map(([plan, l]) => <tr key={plan}><td><b>{plan}</b></td>{LIMIT_FIELDS.map(([f]) => <td key={f}><input type="number" dir="ltr" className={l[f] !== stats.planLimits[plan]?.[f] ? "changed" : ""} value={l[f]} onChange={(e) => setLimits({ ...limits, [plan]: { ...l, [f]: Number(e.target.value) } })} /></td>)}</tr>)}</tbody>
          </table></div>}
          <p className="fine-print">{tx(["برای «نامحدود» عدد ‎-1‎ بگذارید. روی سقف واقعی تصویر، ویدیو و موزیک فوراً اثر می‌کند؛ چت هنوز با اعتبار محدود می‌شود، نه شمارش روزانه.", "Use -1 for unlimited. Applies immediately to real image, video and music limits; chat is still limited by credits, not a daily count.", "-1 = unbegrenzt. Gilt sofort für Bild-, Video- und Musiklimits; Chat wird weiter über Credits begrenzt.", "Sınırsız için -1 girin. Görsel, video ve müzik sınırlarına hemen uygulanır; sohbet hâlâ krediyle sınırlıdır."])}</p>
        </section>
      </>}

      {ask && (
        <Modal title={ask.kind === "costs" ? tx(["تأیید قوانین کردیت", "Confirm credit rules", "Credit-Regeln bestätigen", "Kredi kurallarını onayla"]) : tx(["تأیید سقف پلن‌ها", "Confirm plan limits", "Tariflimits bestätigen", "Plan sınırlarını onayla"])} onClose={() => setAsk(null)}>
          <p>{tx(["این تغییرات بلافاصله برای همهٔ کاربران اعمال می‌شود:", "These changes apply to every user immediately:", "Diese Änderungen gelten sofort für alle Nutzer:", "Bu değişiklikler tüm kullanıcılara hemen uygulanır:"])}</p>
          <ul className="usage-changes">{ask.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="domain-actions"><Button variant="primary" disabled={busy} onClick={() => void save(ask.kind)}>{tx(["بله، ذخیره کن", "Yes, save", "Ja, speichern", "Evet, kaydet"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

/* ───────────────────────── LLM providers ───────────────────────── */

type Provider = { id: string; name: string; provider: string; model: string; strengths: string[]; maxTokens: number; creditCost: number; configured: boolean; kind?: string };
type Custom = { id: string; name: string; type: "chat" | "image" | "video"; baseUrl: string; model: string; enabled: boolean };
type Media = { id: string; name: string; capability: "image" | "video" | "audio"; envKey: string; usedFor: string; configured: boolean };
const QUERY_TYPES: Record<string, Tx> = { code: ["کد", "Code", "Code", "Kod"], math: ["ریاضی", "Math", "Mathe", "Matematik"], creative: ["خلاق", "Creative", "Kreativ", "Yaratıcı"], translation: ["ترجمه", "Translation", "Übersetzung", "Çeviri"], business: ["کسب‌وکار", "Business", "Business", "İş"], complex: ["پیچیده", "Complex", "Komplex", "Karmaşık"], fast: ["سریع", "Fast", "Schnell", "Hızlı"], general: ["عمومی", "General", "Allgemein", "Genel"] };
const STRENGTHS: Record<string, Tx> = { ...QUERY_TYPES, reasoning: ["استدلال", "Reasoning", "Logik", "Akıl yürütme"], technical: ["تکنیکال", "Technical", "Technisch", "Teknik"], fa: ["فارسی", "Persian", "Persisch", "Farsça"], multimodal: ["چندرسانه‌ای", "Multimodal", "Multimodal", "Çok modlu"], factual: ["اطلاعاتی", "Factual", "Faktenbasiert", "Bilgi"] };
const CAP: Record<string, Tx> = { image: ["تصویر", "Image", "Bild", "Görsel"], video: ["ویدیو", "Video", "Video", "Video"], audio: ["صدا", "Audio", "Audio", "Ses"], chat: ["چت", "Chat", "Chat", "Sohbet"] };

export function LiveLlm() {
  const { n, tx } = useT();
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [routing, setRouting] = useState<Record<string, string[]>>({});
  const [test, setTest] = useState<Record<string, "ok" | "fail" | "testing">>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | { all: boolean; p?: Provider }>(null);
  useEffect(() => {
    fetch("/api/admin/llm/config", { credentials: "include" }).then((r) => json<{ providers: Provider[]; disabled: string[]; routing?: Record<string, string[]> }>(r)).then((d) => { setProviders(d.providers); setDisabled(new Set(d.disabled)); setRouting(d.routing ?? {}); }).catch((e) => { setProviders([]); toast.error(e.message); });
  }, []);
  const name = (id: string) => providers?.find((p) => p.id === id)?.name ?? id;
  async function setEnabled(id: string, enabled: boolean) {
    setBusy(id);
    try { const d = await json<{ ok: boolean; disabled: string[] }>(await fetch("/api/admin/llm/config", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: id, enabled }) })); if (d.ok) setDisabled(new Set(d.disabled)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(null); }
  }
  async function runTest(id: string) {
    setTest((t) => ({ ...t, [id]: "testing" }));
    const ok = await fetch("/api/admin/llm/test?provider=" + encodeURIComponent(id), { credentials: "include" }).then((r) => r.json()).then((d) => d.ok === true).catch(() => false);
    setTest((t) => ({ ...t, [id]: ok ? "ok" : "fail" }));
    return ok;
  }
  async function testOne(p: Provider) {
    setAsk(null);
    const ok = await runTest(p.id);
    if (ok) toast.success(p.name + " — " + tx(["اتصال موفق", "connected", "verbunden", "bağlandı"])); else toast.error(p.name + " — " + tx(["اتصال ناموفق", "connection failed", "Verbindung fehlgeschlagen", "bağlantı başarısız"]));
  }
  async function testAll() {
    if (!providers) return;
    setAsk(null); setBusy("all");
    for (const p of providers) { const ok = await runTest(p.id); await setEnabled(p.id, ok); }
    setBusy(null);
    toast.success(tx(["تست کامل شد؛ مدل‌های سالم فعال و بقیه غیرفعال شدند.", "Done: working models are on, the rest are off.", "Fertig: funktionierende Modelle an, andere aus.", "Tamam: çalışan modeller açık, diğerleri kapalı."]));
  }
  const active = providers ? providers.filter((p) => !disabled.has(p.id)).length : 0;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="BrainCircuit" size={28} /></span>
        <div>
          <h2>{tx(["مدل‌های هوش مصنوعی", "AI models", "KI-Modelle", "Yapay zekâ modelleri"])}</h2>
          <p>{tx(["مدل‌های چت، مسیریابی خودکار، مدل‌های سفارشی و سرویس‌های تصویر و ویدیو. کلیدها فقط روی سرور نگه داشته می‌شوند.", "Chat models, automatic routing, custom models and image/video services. Keys stay on the server.", "Chat-Modelle, automatisches Routing, eigene Modelle sowie Bild- und Videodienste. Schlüssel bleiben auf dem Server.", "Sohbet modelleri, otomatik yönlendirme, özel modeller ve görsel/video servisleri. Anahtarlar sunucuda kalır."])}</p>
        </div>
        <Button disabled={busy === "all" || !providers?.length} onClick={() => setAsk({ all: true })}><Icon name="RefreshCw" size={16} />{tx(["تست همه و فعال‌سازی خودکار", "Test all and auto-enable", "Alle testen und automatisch aktivieren", "Hepsini test et ve otomatik aç"])}</Button>
      </div>
      <div className="stats-grid" aria-busy={!providers}>
        <div className="panel stat"><span>{tx(["کل مدل‌ها", "Models", "Modelle", "Modeller"])}</span><strong>{providers ? n(providers.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["فعال", "On", "An", "Açık"])}</span><strong className="ok">{providers ? n(active) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</span><strong>{providers ? n(providers.length - active) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["کلید تنظیم‌شده", "Key set", "Schlüssel gesetzt", "Anahtar var"])}</span><strong>{providers ? n(providers.filter((p) => p.configured).length) : "—"}</strong></div>
      </div>

      {!!Object.keys(routing).length && <section className="panel">
        <h3>{tx(["مسیریابی خودکار", "Automatic routing", "Automatisches Routing", "Otomatik yönlendirme"])}</h3>
        <p className="fine-print">{tx(["وقتی کاربر «خودکار» را انتخاب می‌کند، نوع سؤال تشخیص داده می‌شود و اولین مدل فعال از این ترتیب استفاده می‌شود. این جدول مستقیم از روتر سرور خوانده می‌شود.", "When a user picks “auto”, the question type is detected and the first enabled model in this order is used. Read straight from the server's router.", "Bei „Automatisch“ wird der Fragetyp erkannt und das erste aktive Modell dieser Reihenfolge genutzt. Direkt aus dem Server-Router.", "Kullanıcı “otomatik” seçince soru türü algılanır ve bu sıradaki ilk açık model kullanılır. Doğrudan sunucu yönlendiricisinden okunur."])}</p>
        <div className="llm-routing">{Object.entries(routing).map(([type, ids]) => <div key={type}><b>{QUERY_TYPES[type] ? tx(QUERY_TYPES[type]) : type}</b><span>{ids.map((id, k) => <span key={id} className={"llm-route " + (disabled.has(id) ? "off" : k === ids.findIndex((x) => !disabled.has(x)) ? "first" : "")}>{name(id)}</span>)}</span></div>)}</div>
      </section>}

      <section className="llm-list" aria-busy={!providers}>
        {providers?.map((p) => {
          const on = !disabled.has(p.id), st = test[p.id];
          return (
            <article key={p.id} className={"panel llm-card" + (on ? "" : " off") + (st === "ok" ? " ok" : st === "fail" ? " fail" : "")}>
              <span className="llm-initials">{p.name.slice(0, 2).toUpperCase()}</span>
              <div className="llm-info">
                <div className="llm-tags">
                  <strong>{p.name}</strong><span className="badge">{p.provider}</span>
                  {p.kind === "structured-decision" && <span className="badge">{tx(["تصمیم ساخت‌یافته", "Structured decision", "Strukturierte Entscheidung", "Yapılandırılmış karar"])}</span>}
                  {!p.configured && <span className="badge red">{tx(["بدون کلید API", "No API key", "Kein API-Schlüssel", "API anahtarı yok"])}</span>}
                  <span className={"badge " + (on ? "green" : "red")}>{on ? tx(["فعال", "On", "An", "Açık"]) : tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</span>
                  {st === "ok" && <Icon name="CheckCircle2" size={16} className="ok" />}{st === "fail" && <Icon name="XCircle" size={16} className="fail" />}
                </div>
                <small><bdi dir="ltr">{p.model}</bdi>{p.kind !== "structured-decision" && <> · {n(p.creditCost)} {tx(["اعتبار", "credits", "Credits", "kredi"])} · {n(p.maxTokens)} {tx(["توکن", "tokens", "Tokens", "token"])}</>}</small>
                <div className="llm-strengths">{p.strengths.map((s) => <span key={s}>{STRENGTHS[s] ? tx(STRENGTHS[s]) : s}</span>)}</div>
              </div>
              <div className="llm-actions">
                <Button variant={on ? "" : "primary"} disabled={busy === p.id || busy === "all"} onClick={() => void setEnabled(p.id, !on)}><Icon name="Power" size={14} />{on ? tx(["غیرفعال کردن", "Turn off", "Ausschalten", "Kapat"]) : tx(["فعال کردن", "Turn on", "Einschalten", "Aç"])}</Button>
                <Button disabled={st === "testing" || busy === "all"} onClick={() => setAsk({ all: false, p })}><Icon name="Zap" size={14} />{st === "testing" ? tx(["در حال تست…", "Testing…", "Teste…", "Test ediliyor…"]) : tx(["تست اتصال", "Test connection", "Verbindung testen", "Bağlantıyı test et"])}</Button>
              </div>
            </article>
          );
        })}
      </section>

      <CustomProviders />
      <MediaProviders />

      {ask && (
        <Modal title={ask.all ? tx(["تست همهٔ مدل‌ها", "Test all models", "Alle Modelle testen", "Tüm modelleri test et"]) : tx(["تست اتصال", "Test connection", "Verbindung testen", "Bağlantıyı test et"]) + " · " + ask.p?.name} onClose={() => setAsk(null)}>
          <p>{ask.all
            ? tx([`برای هر ${n(providers?.length ?? 0)} مدل یک درخواست کوتاه واقعی (پولی) فرستاده می‌شود. مدل‌هایی که جواب بدهند فعال و بقیه غیرفعال می‌شوند، حتی اگر الان دستی فعالشان کرده باشید.`, `A short real (paid) request is sent to each of the ${n(providers?.length ?? 0)} models. Models that answer are turned on and the rest off, even ones you turned on by hand.`, `An alle ${n(providers?.length ?? 0)} Modelle geht eine kurze echte (kostenpflichtige) Anfrage. Antwortende werden aktiviert, der Rest deaktiviert, auch manuell aktivierte.`, `${n(providers?.length ?? 0)} modelin her birine kısa gerçek (ücretli) bir istek gider. Yanıt verenler açılır, diğerleri kapanır; elle açtıklarınız dahil.`])
            : tx(["یک درخواست کوتاه واقعی (پولی) به این مدل فرستاده می‌شود. وضعیت فعال یا غیرفعال آن تغییر نمی‌کند.", "A short real (paid) request is sent to this model. Its on/off state does not change.", "Eine kurze echte (kostenpflichtige) Anfrage geht an dieses Modell. Der An/Aus-Status bleibt.", "Bu modele kısa gerçek (ücretli) bir istek gider. Açık/kapalı durumu değişmez."])}</p>
          <div className="domain-actions"><Button variant="primary" onClick={() => (ask.all ? void testAll() : ask.p && void testOne(ask.p))}>{tx(["بله، تست کن", "Yes, test", "Ja, testen", "Evet, test et"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

function CustomProviders() {
  const { tx } = useT();
  const [list, setList] = useState<Custom[] | null>(null);
  const [form, setForm] = useState<{ name: string; type: Custom["type"]; baseUrl: string; apiKey: string; model: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Custom | null>(null);
  const load = useCallback(() => { fetch("/api/admin/custom-providers", { credentials: "include" }).then((r) => json<{ providers: Custom[] }>(r)).then((d) => setList(d.providers ?? [])).catch(() => setList([])); }, []);
  useEffect(() => { load(); }, [load]);
  async function add() {
    if (!form) return;
    if (!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim() || !form.model.trim()) return toast.error(tx(["همهٔ فیلدها لازم است", "All fields are required", "Alle Felder sind Pflicht", "Tüm alanlar gerekli"]));
    setBusy(true);
    try { await json(await fetch("/api/admin/custom-providers", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })); toast.success(form.name + " " + tx(["اضافه شد", "added", "hinzugefügt", "eklendi"])); setForm(null); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(false); }
  }
  async function toggle(p: Custom) {
    await fetch("/api/admin/custom-providers", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, enabled: !p.enabled }) }).catch(() => null);
    load();
  }
  async function remove(p: Custom) {
    setDel(null);
    await fetch("/api/admin/custom-providers?id=" + encodeURIComponent(p.id), { method: "DELETE", credentials: "include" }).catch(() => null);
    load();
  }
  return (
    <section className="panel">
      <div className="row-between">
        <h3>{tx(["مدل‌های سفارشی (API سازگار با OpenAI)", "Custom models (OpenAI-compatible API)", "Eigene Modelle (OpenAI-kompatibel)", "Özel modeller (OpenAI uyumlu)"])}</h3>
        <Button variant="primary" onClick={() => setForm({ name: "", type: "chat", baseUrl: "", apiKey: "", model: "" })}><Icon name="Plus" size={16} />{tx(["افزودن مدل", "Add model", "Modell hinzufügen", "Model ekle"])}</Button>
      </div>
      <details>
        <summary className="fine-print">{tx(["قرارداد API برای هر نوع", "API contract for each type", "API-Vertrag je Typ", "Tür başına API sözleşmesi"])}</summary>
        <ul className="fine-print llm-contract">
          <li><b>{tx(CAP.chat)}:</b> <bdi dir="ltr">POST {"{baseUrl}"}/chat/completions</bdi></li>
          <li><b>{tx(CAP.image)}:</b> <bdi dir="ltr">POST {"{baseUrl}"}/images/generations {"{ model, prompt, n, size }"} → {"{ data: [{ url | b64_json }] }"}</bdi></li>
          <li><b>{tx(CAP.video)}:</b> <bdi dir="ltr">POST {"{baseUrl}"}/videos/generations → id; GET {"{baseUrl}"}/videos/generations/{"{id}"} → status, output/url</bdi></li>
          <li>{tx(["این‌ها قرارداد عمومی‌اند، نه استاندارد تضمینی؛ APIای که دقیقاً این شکل را نداشته باشد کار نمی‌کند.", "These are best-effort contracts, not a guaranteed standard; an API with a different shape will not work.", "Best-Effort-Verträge, kein garantierter Standard; abweichende APIs funktionieren nicht.", "Bunlar en iyi çaba sözleşmeleridir; farklı biçimdeki API'ler çalışmaz."])}</li>
        </ul>
      </details>
      {list?.length ? <div className="llm-custom">{list.map((p) => (
        <div key={p.id} className={"access-row" + (p.enabled ? "" : " off")}>
          <div><strong>{p.name}</strong> <span className="badge">{tx(CAP[p.type] ?? CAP.chat)}</span><small><bdi dir="ltr">{p.model} · {p.baseUrl}</bdi></small></div>
          <div className="domain-actions">
            <label className="gc-switch"><input type="checkbox" checked={p.enabled} onChange={() => void toggle(p)} />{p.enabled ? tx(["فعال", "On", "An", "Açık"]) : tx(["غیرفعال", "Off", "Aus", "Kapalı"])}</label>
            <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => setDel(p)}><Icon name="Trash2" size={15} /></Button>
          </div>
        </div>
      ))}</div> : list && <p className="fine-print">{tx(["هنوز مدل سفارشی اضافه نشده است.", "No custom models yet.", "Noch keine eigenen Modelle.", "Henüz özel model yok."])}</p>}
      {form && (
        <Modal title={tx(["افزودن مدل سفارشی", "Add a custom model", "Eigenes Modell hinzufügen", "Özel model ekle"])} onClose={() => setForm(null)}>
          <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void add(); }}>
            <label>{tx(["نام", "Name", "Name", "Ad"])}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mistral Large" /></label>
            <label>{tx(["نوع", "Type", "Typ", "Tür"])}<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Custom["type"] })}>{(["chat", "image", "video"] as const).map((t) => <option key={t} value={t}>{tx(CAP[t])}</option>)}</select></label>
            <label>Base URL<input dir="ltr" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.mistral.ai/v1" /></label>
            <label>{tx(["شناسهٔ مدل", "Model id", "Modell-ID", "Model kimliği"])}<input dir="ltr" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="mistral-large-latest" /></label>
            <label className="span-2">{tx(["کلید API (فقط ذخیره می‌شود و دیگر نمایش داده نمی‌شود)", "API key (stored only, never shown again)", "API-Schlüssel (nur gespeichert, nie wieder angezeigt)", "API anahtarı (yalnızca saklanır, bir daha gösterilmez)"])}<input type="password" dir="ltr" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></label>
            <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button></div>
          </form>
        </Modal>
      )}
      {del && (
        <Modal title={tx(["حذف مدل سفارشی", "Delete custom model", "Eigenes Modell löschen", "Özel modeli sil"])} onClose={() => setDel(null)}>
          <p>{tx([`«${del.name}» و کلیدش حذف شود؟`, `Delete “${del.name}” and its key?`, `„${del.name}“ und den Schlüssel löschen?`, `“${del.name}” ve anahtarı silinsin mi?`])}</p>
          <div className="domain-actions"><Button variant="danger" onClick={() => void remove(del)}>{tx(["بله، حذف کن", "Yes, delete", "Ja, löschen", "Evet, sil"])}</Button></div>
        </Modal>
      )}
    </section>
  );
}

function MediaProviders() {
  const { tx } = useT();
  const [list, setList] = useState<Media[] | null>(null);
  useEffect(() => { fetch("/api/admin/media-providers", { credentials: "include" }).then((r) => json<{ providers: Media[] }>(r)).then((d) => setList(d.providers ?? [])).catch(() => setList([])); }, []);
  return (
    <section className="panel">
      <h3>{tx(["سرویس‌های تصویر، ویدیو و صدا", "Image, video and audio services", "Bild-, Video- und Audiodienste", "Görsel, video ve ses servisleri"])}</h3>
      <p className="fine-print">{tx(["برای افزودن سرویس جدید، کلید آن را در تنظیمات محیطی سرور اضافه کنید؛ این فهرست خودکار به‌روز می‌شود.", "To add a service, put its key in the server environment; this list updates on its own.", "Neuen Dienst über die Server-Umgebung hinzufügen; die Liste aktualisiert sich selbst.", "Yeni servis için anahtarı sunucu ortamına ekleyin; liste kendiliğinden güncellenir."])}</p>
      <div className="llm-custom" aria-busy={!list}>{list?.map((p) => (
        <div key={p.id} className={"access-row" + (p.configured ? "" : " off")}>
          <div><strong>{p.name}</strong> <span className="badge">{tx(CAP[p.capability])}</span><small>{p.usedFor}</small></div>
          <div className="domain-actions"><span className={"badge " + (p.configured ? "green" : "red")}>{p.configured ? tx(["تنظیم شده", "Configured", "Eingerichtet", "Ayarlı"]) : tx(["تنظیم‌نشده", "Not configured", "Nicht eingerichtet", "Ayarlı değil"])}</span><code dir="ltr">{p.envKey}</code></div>
        </div>
      ))}</div>
    </section>
  );
}
