"use client";
// SEO dashboard (the SEO workspace's overview): a site's health over its
// audits and, when Google Search Console is connected, its search traffic.
// Everything comes from existing endpoints on the main site:
//   /api/seo/sites/<id>/audits   audit history (score, mobile score, checks)
//   /api/seo/audits/<id>         the latest audit in full (pages, issues, diff)
//   /api/seo/gsc/status, /data   Search Console: 28-day trend, queries, opportunities
// Charts are plain SVG: one y-axis each (clicks and impressions are two charts),
// a legend for two or more series, a hover/tap tooltip, and a table view.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/site-link";
import { useApp } from "./providers";
import { Icon } from "./ui";
import { liveRequest, type LiveRow } from "./live-module-kit";

const API = "/api/seo/";
type Audit = { id: string; score: number; mobileScore: number | null; pagesCrawled: number; failCount: number; warnCount: number; passCount: number; createdAt: string };
type Issue = { id: string; label: string; status: "warning" | "fail" };
type Page = { url: string; score: number; responseMs: number; wordCount: number; issues: Issue[] };
type AuditDetail = { pages: Page[]; siteIssues: Issue[]; diff: { scoreDelta: number; fixed: Issue[]; added: Issue[]; remaining: number } | null };
type Query = { query: string; clicks: number; impressions: number; ctr: number; position: number };
type Gsc = { siteUrl: string; totals: { clicks: number; impressions: number; avgCtr: number; avgPosition: number }; trend: { date: string; clicks: number; impressions: number }[]; topQueries: Query[]; opportunities: (Query & { reason?: string })[] };

/* ---------- small helpers ---------- */
function useT() {
  const { fa, locale, n } = useApp();
  const tx = (a: string, b: string) => (fa ? a : b);
  const date = (iso: string) => new Intl.DateTimeFormat(fa ? "fa-IR" : locale, { month: "short", day: "numeric" }).format(new Date(iso));
  const num = (v: number, digits = 0) => (digits ? new Intl.NumberFormat(fa ? "fa-IR" : locale, { maximumFractionDigits: digits }).format(v) : n(Math.round(v)));
  return { fa, tx, date, num };
}
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
};
/** A bar with its data end rounded and its baseline end square. */
function barPath(x: number, y: number, w: number, h: number, r: number, end: "top" | "right") {
  if (h <= 0 || w <= 0) return "";
  if (end === "top") { r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  r = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  const { tx } = useT();
  return (
    <details className="seo-viz-table">
      <summary>{tx("نمایش جدول", "Show table")}</summary>
      <div className="table-scroll"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    </details>
  );
}
function Legend({ items }: { items: { label: string; color: string; icon?: string }[] }) {
  return <ul className="seo-viz-legend">{items.map((i) => <li key={i.label}><i style={{ background: i.color }} />{i.icon && <Icon name={i.icon} size={12} />}{i.label}</li>)}</ul>;
}
function Tip({ at, children }: { at: { x: number; y: number } | null; children: React.ReactNode }) {
  if (!at) return null;
  return <div className="seo-viz-tip" style={{ left: `${Math.min(84, Math.max(16, at.x))}%`, top: at.y }} role="status">{children}</div>;
}

/* ---------- charts ---------- */
const H = 220, PAD = { l: 40, r: 16, t: 14, b: 26 };
/** The plot's real width, so text and marks keep their true size on a phone. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Lines over time on one axis. */
function LineChart({ labels, series, max, unit = "" }: { labels: string[]; series: { label: string; color: string; values: (number | null)[] }[]; max?: number; unit?: string }) {
  const { num } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const [wrap, W] = useWidth();
  const top = max ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (labels.length < 2 ? iw / 2 : (i * iw) / (labels.length - 1));
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const every = Math.max(1, Math.ceil(labels.length / Math.max(3, Math.floor(W / 90))));
  const showLabel = (i: number) => i === labels.length - 1 || (i % every === 0 && labels.length - 1 - i >= Math.max(1, every * 0.6));
  const move = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / iw) * (labels.length - 1));
    setHover(Math.max(0, Math.min(labels.length - 1, labels.length < 2 ? 0 : i)));
  };
  return (
    <div className="seo-viz-plot" ref={wrap}>
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.label).join(", ")} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} /><text className="axis" x={PAD.l - 6} y={y(t) + 4} textAnchor="end">{num(t)}</text></g>)}
        <line className="baseline" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
        {labels.map((l, i) => showLabel(i) && <text key={i} className="axis" x={x(i)} y={H - 6} textAnchor="middle">{l}</text>)}
        {series.map((s) => {
          let d = "";
          s.values.forEach((v, i) => { if (v == null) return; d += `${d && s.values[i - 1] != null ? "L" : "M"}${x(i)},${y(v)}`; });
          const last = s.values.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {labels.length <= 12 && s.values.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={s.color} className="ring" />)}
              {last >= 0 && <circle cx={x(last)} cy={y(s.values[last]!)} r={4} fill={s.color} className="ring" />}
            </g>
          );
        })}
        {hover != null && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} />}
        {hover != null && series.map((s) => s.values[hover] != null && <circle key={s.label} cx={x(hover)} cy={y(s.values[hover]!)} r={5} fill={s.color} className="ring" />)}
      </svg>
      <Tip at={hover == null ? null : { x: (x(hover) / W) * 100, y: 8 }}>
        <strong>{hover != null && labels[hover]}</strong>
        {hover != null && series.map((s) => <span key={s.label}><i style={{ background: s.color }} />{s.label}: {s.values[hover] == null ? "—" : num(s.values[hover]!) + unit}</span>)}
      </Tip>
    </div>
  );
}

/** Columns split into stacked parts (with a 2px gap between parts). */
function StackedBars({ labels, parts }: { labels: string[]; parts: { label: string; color: string; values: number[] }[] }) {
  const { num } = useT();
  const [hover, setHover] = useState<number | null>(null);
  const [wrap, W] = useWidth();
  const totals = labels.map((_, i) => parts.reduce((s, p) => s + p.values[i], 0));
  const top = niceMax(Math.max(1, ...totals));
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b, slot = iw / Math.max(1, labels.length), bw = Math.min(36, slot * 0.6);
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  const every = Math.max(1, Math.ceil(labels.length / Math.max(3, Math.floor(W / 90))));
  const showLabel = (i: number) => i === labels.length - 1 || (i % every === 0 && labels.length - 1 - i >= Math.max(1, every * 0.6));
  return (
    <div className="seo-viz-plot" ref={wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={parts.map((p) => p.label).join(", ")} onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => <g key={f}><line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(f * top)} y2={y(f * top)} /><text className="axis" x={PAD.l - 6} y={y(f * top) + 4} textAnchor="end">{num(f * top)}</text></g>)}
        {labels.map((l, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          let base = 0;
          const visible = parts.filter((p) => p.values[i] > 0);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={cx - slot / 2} y={PAD.t} width={slot} height={ih} fill="transparent" />
              {visible.map((p, k) => {
                const h = (p.values[i] / top) * ih, yTop = y(base + p.values[i]);
                base += p.values[i];
                const gap = k < visible.length - 1 ? 2 : 0;
                return <path key={p.label} d={barPath(cx - bw / 2, yTop + gap, bw, Math.max(0, h - gap), k === visible.length - 1 ? 4 : 0, "top")} fill={p.color} opacity={hover == null || hover === i ? 1 : 0.55} />;
              })}
              {showLabel(i) && <text className="axis" x={cx} y={H - 6} textAnchor="middle">{l}</text>}
            </g>
          );
        })}
        <line className="baseline" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
      </svg>
      <Tip at={hover == null ? null : { x: ((PAD.l + slot * hover + slot / 2) / W) * 100, y: 8 }}>
        <strong>{hover != null && labels[hover]}</strong>
        {hover != null && parts.map((p) => <span key={p.label}><i style={{ background: p.color }} />{p.label}: {num(p.values[hover])}</span>)}
      </Tip>
    </div>
  );
}

/** Ranked horizontal bars, value at the bar end. */
function HBars({ rows, color, format }: { rows: { label: string; value: number; note?: string; icon?: string; tone?: string }[]; color: string; format: (v: number) => string }) {
  const top = niceMax(Math.max(1, ...rows.map((r) => r.value)));
  return (
    <ul className="seo-viz-hbars">
      {rows.map((r) => (
        <li key={r.label} title={r.note ? `${r.label} — ${r.note}` : r.label}>
          <span className="label" dir="auto">{r.icon && <span className="tone" style={{ color: r.tone }}><Icon name={r.icon} size={14} /></span>}{r.label}</span>
          <span className="track">
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d={barPath(0, 1, Math.max(1.5, (r.value / top) * 100), 8, 1.2, "right")} fill={color} /></svg>
          </span>
          <span className="value">{format(r.value)}</span>
          {r.note && <small className="note">{r.note}</small>}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, delta, good, hint }: { label: string; value: string; delta?: { text: string; up: boolean } | null; good?: boolean; hint?: string }) {
  return (
    <div className="seo-stat" title={hint}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {delta && <small className={good ? "up" : "down"}><Icon name={delta.up ? "ArrowUp" : "ArrowDown"} size={12} />{delta.text}</small>}
    </div>
  );
}

/* ---------- the dashboard ---------- */
const SERIES = ["var(--viz-1)", "var(--viz-2)"];
const STATUS = { fail: "var(--viz-critical)", warn: "var(--viz-warning)", pass: "var(--viz-good)" };

export function SeoDashboard({ siteId }: { siteId: string }) {
  const { fa, tx, date, num } = useT();
  const [audits, setAudits] = useState<Audit[] | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [gscState, setGscState] = useState<"loading" | "off" | "nosite" | "ready" | "error">("loading");
  const [gsc, setGsc] = useState<Gsc | null>(null);
  const [gscError, setGscError] = useState("");

  useEffect(() => {
    let live = true;
    setAudits(null); setDetail(null);
    liveRequest(API + "sites/" + encodeURIComponent(siteId) + "/audits").then((d: LiveRow) => {
      if (!live) return;
      const list = ((d.audits as Audit[]) || []).slice().reverse();
      setAudits(list);
      const last = list[list.length - 1];
      if (last) liveRequest(API + "audits/" + encodeURIComponent(last.id)).then((x) => { if (live) setDetail(x as unknown as AuditDetail); }).catch(() => {});
    }).catch(() => { if (live) setAudits([]); });
    return () => { live = false; };
  }, [siteId]);

  useEffect(() => {
    let live = true;
    liveRequest(API + "gsc/status").then((s: LiveRow) => {
      if (!live) return;
      if (!s.connected) return setGscState("off");
      if (!s.siteUrl) return setGscState("nosite");
      liveRequest(API + "gsc/data").then((d) => { if (live) { setGsc(d as unknown as Gsc); setGscState("ready"); } }).catch((e) => { if (live) { setGscError(e instanceof Error ? e.message : ""); setGscState("error"); } });
    }).catch(() => { if (live) setGscState("off"); });
    return () => { live = false; };
  }, []);

  const last = audits?.[audits.length - 1], prev = audits && audits.length > 1 ? audits[audits.length - 2] : undefined;
  const labels = (audits ?? []).map((a) => date(a.createdAt));

  // Problems across the crawled pages: how many pages have each one.
  const common = useMemo(() => {
    if (!detail) return [];
    const m = new Map<string, { label: string; status: string; pages: number }>();
    for (const i of detail.siteIssues) m.set("site|" + i.id, { label: i.label, status: i.status, pages: Math.max(1, detail.pages.length) });
    for (const p of detail.pages) for (const i of p.issues) { const k = "page|" + i.id; const e = m.get(k) ?? { label: i.label, status: i.status, pages: 0 }; e.pages++; m.set(k, e); }
    return [...m.values()].sort((a, b) => (b.status === "fail" ? 1 : 0) - (a.status === "fail" ? 1 : 0) || b.pages - a.pages).slice(0, 8);
  }, [detail]);
  const slow = useMemo(() => (detail?.pages ?? []).filter((p) => p.responseMs > 0).sort((a, b) => b.responseMs - a.responseMs).slice(0, 6), [detail]);
  const pathOf = (u: string) => { try { const x = new URL(u); return decodeURIComponent(x.pathname) || "/"; } catch { return u; } };

  const buckets = useMemo(() => {
    const q = gsc?.topQueries ?? [];
    const b = [[1, 3], [4, 10], [11, 20], [21, 1000]].map(([a, z]) => q.filter((r) => r.position >= a && r.position < z + 1).length);
    return [
      { label: tx("رتبه ۱ تا ۳", "Positions 1–3"), value: b[0] },
      { label: tx("صفحهٔ اول (۴ تا ۱۰)", "Page one (4–10)"), value: b[1] },
      { label: tx("صفحهٔ دوم (۱۱ تا ۲۰)", "Page two (11–20)"), value: b[2] },
      { label: tx("بعد از صفحهٔ دوم", "Beyond page two"), value: b[3] },
    ];
  }, [gsc, tx]);

  if (audits === null) return <section className="panel seo-viz"><div className="skeleton" style={{ height: 160 }} /></section>;
  return (
    <div className="seo-viz">
      {/* Health at a glance */}
      <section className="panel">
        <div className="row-between"><h3>{tx("سلامت سایت در یک نگاه", "Site health at a glance")}</h3>{last && <small className="muted">{tx("آخرین بررسی", "Last audit")}: {date(last.createdAt)}</small>}</div>
        {!last ? (
          <p className="muted">{tx("هنوز بررسی‌ای برای این سایت انجام نشده است. با «اجرای بررسی فنی سایت» در پایین همین صفحه، اولین نمودارها ساخته می‌شوند.", "No audit has run for this site yet. Run the technical audit below and the first charts appear.")}</p>
        ) : (
          <div className="seo-stats">
            <Stat label={tx("امتیاز سلامت", "Health score")} value={`${num(last.score)} / ${num(100)}`} delta={prev ? { text: num(Math.abs(last.score - prev.score)), up: last.score >= prev.score } : null} good={!prev || last.score >= prev.score} hint={tx("نسبت به بررسی قبلی", "Change since the previous audit")} />
            <Stat label={tx("امتیاز موبایل", "Mobile score")} value={last.mobileScore == null ? "—" : num(last.mobileScore)} delta={prev && prev.mobileScore != null && last.mobileScore != null ? { text: num(Math.abs(last.mobileScore - prev.mobileScore)), up: last.mobileScore >= prev.mobileScore } : null} good={!prev || (last.mobileScore ?? 0) >= (prev.mobileScore ?? 0)} />
            <Stat label={tx("خطاهای باز", "Open errors")} value={num(last.failCount)} delta={prev ? { text: num(Math.abs(last.failCount - prev.failCount)), up: last.failCount > prev.failCount } : null} good={!prev || last.failCount <= prev.failCount} />
            <Stat label={tx("صفحات بررسی‌شده", "Pages crawled")} value={num(last.pagesCrawled)} />
          </div>
        )}
        {detail?.diff && (detail.diff.fixed.length > 0 || detail.diff.added.length > 0) && (
          <p className="seo-diff">
            {detail.diff.fixed.length > 0 && <span className="up"><Icon name="CircleCheck" size={14} />{tx(`${num(detail.diff.fixed.length)} مشکل نسبت به بررسی قبل رفع شد`, `${detail.diff.fixed.length} issues fixed since the last audit`)}</span>}
            {detail.diff.added.length > 0 && <span className="down"><Icon name="CircleAlert" size={14} />{tx(`${num(detail.diff.added.length)} مشکل تازه پیدا شد`, `${detail.diff.added.length} new issues found`)}</span>}
          </p>
        )}
      </section>

      {audits.length > 0 && (
        <div className="seo-viz-grid">
          <section className="panel">
            <h3>{tx("روند امتیاز سلامت", "Health score trend")}</h3>
            <Legend items={[{ label: tx("امتیاز کل", "Overall"), color: SERIES[0] }, { label: tx("موبایل", "Mobile"), color: SERIES[1] }]} />
            <LineChart labels={labels} max={100} series={[{ label: tx("امتیاز کل", "Overall"), color: SERIES[0], values: audits.map((a) => a.score) }, { label: tx("موبایل", "Mobile"), color: SERIES[1], values: audits.map((a) => a.mobileScore) }]} />
            <TableView head={[tx("تاریخ", "Date"), tx("امتیاز کل", "Overall"), tx("موبایل", "Mobile")]} rows={audits.map((a, i) => [labels[i], num(a.score), a.mobileScore == null ? "—" : num(a.mobileScore)])} />
          </section>
          <section className="panel">
            <h3>{tx("خطا، هشدار و موارد درست در هر بررسی", "Errors, warnings and passed checks per audit")}</h3>
            <Legend items={[{ label: tx("خطا", "Errors"), color: STATUS.fail, icon: "CircleX" }, { label: tx("هشدار", "Warnings"), color: STATUS.warn, icon: "TriangleAlert" }, { label: tx("درست", "Passed"), color: STATUS.pass, icon: "CircleCheck" }]} />
            <StackedBars labels={labels} parts={[{ label: tx("خطا", "Errors"), color: STATUS.fail, values: audits.map((a) => a.failCount) }, { label: tx("هشدار", "Warnings"), color: STATUS.warn, values: audits.map((a) => a.warnCount) }, { label: tx("درست", "Passed"), color: STATUS.pass, values: audits.map((a) => a.passCount) }]} />
            <TableView head={[tx("تاریخ", "Date"), tx("خطا", "Errors"), tx("هشدار", "Warnings"), tx("درست", "Passed")]} rows={audits.map((a, i) => [labels[i], num(a.failCount), num(a.warnCount), num(a.passCount)])} />
          </section>
          {common.length > 0 && (
            <section className="panel">
              <h3>{tx("رایج‌ترین مشکلات (تعداد صفحات)", "Most common problems (pages affected)")}</h3>
              <HBars color="var(--viz-1)" rows={common.map((c) => ({ label: c.label, icon: c.status === "fail" ? "CircleX" : "TriangleAlert", tone: c.status === "fail" ? STATUS.fail : STATUS.warn, value: c.pages, note: c.status === "fail" ? tx("خطا", "Error") : tx("هشدار", "Warning") }))} format={(v) => num(v)} />
            </section>
          )}
          {slow.length > 0 && (
            <section className="panel">
              <h3>{tx("کندترین صفحات (زمان پاسخ)", "Slowest pages (response time)")}</h3>
              <HBars color="var(--viz-2)" rows={slow.map((p) => ({ label: pathOf(p.url), value: p.responseMs, note: tx(`امتیاز ${num(p.score)}`, `score ${p.score}`) }))} format={(v) => (v >= 1000 ? num(v / 1000, 1) + tx(" ثانیه", " s") : num(v) + tx(" میلی‌ثانیه", " ms"))} />
            </section>
          )}
        </div>
      )}

      {/* Search traffic */}
      <section className="panel">
        <div className="row-between"><h3>{tx("ترافیک جست‌وجوی گوگل (۲۸ روز)", "Google search traffic (28 days)")}</h3>{gsc && <small className="muted" dir="ltr">{gsc.siteUrl}</small>}</div>
        {gscState === "loading" && <div className="skeleton" style={{ height: 120 }} />}
        {gscState === "off" && <p className="muted">{tx("برای دیدن کلیک، نمایش و رتبهٔ کلمات در گوگل، Google Search Console را وصل کنید.", "Connect Google Search Console to see clicks, impressions and keyword positions.")} <Link href="/seo?view=gsc" className="text-link">{tx("اتصال کنسول جستجو", "Connect Search Console")}</Link></p>}
        {gscState === "nosite" && <p className="muted">{tx("کنسول جستجو وصل است؛ سایت آن را انتخاب کنید.", "Search Console is connected; choose its site.")} <Link href="/seo?view=gsc" className="text-link">{tx("انتخاب سایت", "Choose site")}</Link></p>}
        {gscState === "error" && <p role="alert" className="error-text">{gscError || tx("دریافت داده از گوگل ممکن نشد؛ کمی بعد دوباره امتحان کنید.", "Google's data couldn't be loaded; try again shortly.")}</p>}
        {gsc && (
          <div className="seo-stats">
            <Stat label={tx("کلیک", "Clicks")} value={num(gsc.totals.clicks)} />
            <Stat label={tx("نمایش در نتایج", "Impressions")} value={num(gsc.totals.impressions)} />
            <Stat label={tx("نرخ کلیک", "Click-through rate")} value={num(gsc.totals.avgCtr, 1) + (fa ? "٪" : "%")} />
            <Stat label={tx("میانگین رتبه", "Average position")} value={gsc.totals.avgPosition ? num(gsc.totals.avgPosition, 1) : "—"} hint={tx("هرچه کمتر، بهتر", "Lower is better")} />
          </div>
        )}
      </section>
      {gsc && gsc.trend.length > 0 && (
        <div className="seo-viz-grid">
          <section className="panel">
            <h3>{tx("کلیک روزانه", "Daily clicks")}</h3>
            <LineChart labels={gsc.trend.map((t) => date(t.date))} series={[{ label: tx("کلیک", "Clicks"), color: SERIES[0], values: gsc.trend.map((t) => t.clicks) }]} />
            <TableView head={[tx("تاریخ", "Date"), tx("کلیک", "Clicks"), tx("نمایش", "Impressions")]} rows={gsc.trend.map((t) => [date(t.date), num(t.clicks), num(t.impressions)])} />
          </section>
          <section className="panel">
            <h3>{tx("نمایش روزانه در نتایج", "Daily impressions")}</h3>
            <LineChart labels={gsc.trend.map((t) => date(t.date))} series={[{ label: tx("نمایش", "Impressions"), color: SERIES[1], values: gsc.trend.map((t) => t.impressions) }]} />
          </section>
          {gsc.topQueries.length > 0 && (
            <section className="panel">
              <h3>{tx("پرکلیک‌ترین کلمات", "Top keywords by clicks")}</h3>
              <HBars color="var(--viz-1)" rows={gsc.topQueries.slice(0, 10).map((q) => ({ label: q.query, value: q.clicks, note: tx(`رتبه ${num(q.position, 1)} · ${num(q.impressions)} نمایش`, `position ${q.position.toFixed(1)} · ${q.impressions} impressions`) }))} format={(v) => num(v)} />
              <TableView head={[tx("کلمه", "Keyword"), tx("کلیک", "Clicks"), tx("نمایش", "Impressions"), tx("نرخ کلیک", "CTR"), tx("رتبه", "Position")]} rows={gsc.topQueries.map((q) => [q.query, num(q.clicks), num(q.impressions), num(q.ctr, 1) + (fa ? "٪" : "%"), num(q.position, 1)])} />
            </section>
          )}
          {gsc.topQueries.length > 0 && (
            <section className="panel">
              <h3>{tx("کلمات در کدام رتبه‌ها هستند", "Where your keywords rank")}</h3>
              <HBars color="var(--viz-1)" rows={buckets} format={(v) => num(v)} />
              <small className="muted">{tx("از میان پرکلیک‌ترین کلمات سایت.", "Among the site's top keywords.")}</small>
            </section>
          )}
        </div>
      )}
      {gsc && gsc.opportunities.length > 0 && (
        <section className="panel">
          <h3>{tx("فرصت‌های سریع", "Quick wins")}</h3>
          <p className="muted">{tx("کلماتی که زیاد دیده می‌شوند ولی هنوز در رتبهٔ اول نیستند؛ بهتر کردن همین صفحه‌ها کم‌هزینه‌ترین راه رشد است.", "Keywords that are seen a lot but don't rank first yet; improving these pages is the cheapest way to grow.")}</p>
          <ul className="seo-wins">
            {gsc.opportunities.slice(0, 8).map((o) => (
              <li key={o.query}>
                <strong dir="auto">{o.query}</strong>
                <span className="muted">{tx(`رتبه ${num(o.position, 1)} · ${num(o.impressions)} نمایش · نرخ کلیک ${num(o.ctr, 1)}٪`, `position ${o.position.toFixed(1)} · ${o.impressions} impressions · CTR ${o.ctr.toFixed(1)}%`)}</span>
                <Link className="text-link" href="/seo?view=content">{tx("نوشتن محتوا برای این کلمه", "Write content for it")}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
