"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link, { useSite } from "./site-link";
import { useApp } from "./providers";
import { Button } from "./ui";

type Status = { signedIn: boolean; currentPackSlug: string | null; hasBusinessSubscription: boolean };

function Tier({ tier }: { tier: string }) {
  const { tl } = useApp();
  return <span className={"industry-tier " + (tier === "gold" ? "gold" : "pro")}>{tier === "gold" ? tl("طلایی", "Gold") : tl("حرفه‌ای", "Professional")}</span>;
}

export function LiveIndustries() {
  const { tl } = useApp();
  const list = useSite()?.industries ?? [];
  return (
    <main className="industry-page" id="main">
      <header className="content-hero">
        <h1>{tl("بازار بسته‌های صنعتی", "Industry pack marketplace")}</h1>
        <p>{tl("صنعت مناسب را انتخاب کنید؛ فعال‌سازی به اشتراک کسب‌وکار و دسترسی شما بستگی دارد.", "Choose the right industry; activation depends on your business subscription and access.")}</p>
      </header>
      <section className="industry-student">
        <div><span className="eyebrow orange-text">{tl("آموزش و یادگیری", "Education & learning")}</span><h2>{tl("فضای دانشجویی AIFekr", "AIFekr student workspace")}</h2></div>
        <Link className="btn primary" href="/student">{tl("فضای دانشجویی", "Student workspace")}</Link>
      </section>
      {list.length === 0 ? <p className="crm-empty">{tl("بسته‌ای یافت نشد", "No packs found")}</p> : (
        <div className="industry-grid">
          {list.map((p) => (
            <Link key={p.slug} href={"/industry/" + p.slug} className="industry-card">
              <div className="industry-card-head" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
                <span aria-hidden="true">{p.emoji}</span>
                <div><h3><bdi>{p.name}</bdi></h3><p><bdi>{p.tagline}</bdi></p></div>
              </div>
              <div className="industry-card-body">
                <Tier tier={p.tier} />
                <small>{p.agentCount} {tl("عامل AI", "AI agents")}</small>
              </div>
              <strong style={{ color: p.color }}>{p.slug === "university" ? tl("نیازمند بستهٔ دانشجویی فعال", "Requires an active student package") : tl("نیازمند CRM فعال", "Requires an active CRM")}</strong>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export function LiveIndustry() {
  const { tl } = useApp();
  const router = useRouter();
  const p = useSite()?.industry;
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/industry/status", { credentials: "include" }).then((r) => r.json()).then(setStatus).catch(() => setStatus({ signedIn: false, currentPackSlug: null, hasBusinessSubscription: false }));
  }, []);
  if (!p) return null;
  async function activate() {
    if (!p) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/packs/" + encodeURIComponent(p.slug), { method: "POST", credentials: "include" });
      if (!response.ok) throw Error((await response.json().catch(() => ({}))).error || "");
      router.push("/business-doctor?activated=1");
    } catch (e) { setError((e instanceof Error && e.message) || tl("خطا در فعال‌سازی", "Activation failed")); setBusy(false); }
  }
  const current = status?.currentPackSlug === p.slug;
  const action = p.slug === "university"
    ? <Link className="btn primary full" href="/student">{tl("ورود یا فعال‌سازی فضای دانشجویی", "Open or activate Student Workspace")}</Link>
    : !status ? null
    : current ? <><p className="industry-active">✓ {tl("بسته شما فعال است", "Your pack is active")}</p><Link className="btn primary full" href="/business-doctor">{tl("رفتن به داشبورد کسب‌وکار", "Go to the business dashboard")}</Link></>
    : status.signedIn && status.hasBusinessSubscription ? <Button variant="primary" className="full" disabled={busy} onClick={() => void activate()}>{busy ? tl("در حال فعال‌سازی…", "Activating…") : tl("فعال‌سازی بسته", "Activate pack")}</Button>
    : status.signedIn ? <Link className="btn primary full" href="/plans">{tl("مشاهده پلن‌های کسب‌وکار", "View business plans")}</Link>
    : <><Link className="btn primary full" href={"/register?pack=" + encodeURIComponent(p.slug)}>{tl("ثبت‌نام و فعال‌سازی", "Register and activate")}</Link><Link className="industry-login" href="/login">{tl("برای فعال‌سازی وارد شوید", "Sign in to activate")}</Link></>;
  return (
    <main className="industry-page" id="main" style={{ "--industry": p.color } as React.CSSProperties}>
      <section className="industry-hero" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
        <span aria-hidden="true">{p.emoji}</span>
        <h1><bdi>{p.name}</bdi></h1>
        <p><bdi>{p.tagline}</bdi></p>
        <p className="industry-value"><bdi>{p.valueProposition}</bdi></p>
        {p.targetCustomers.length > 0 && <div className="industry-chips">{p.targetCustomers.map((c) => <span key={c}><bdi>{c}</bdi></span>)}</div>}
      </section>
      <div className="industry-layout">
        <div className="industry-main">
          <section className="panel">
            <h2>{tl("عوامل هوش مصنوعی", "AI agents")} ({p.agents.length})</h2>
            <div className="content-cards">{p.agents.map((a) => <article key={a.name}><span aria-hidden="true">{a.icon}</span><h3><bdi>{a.name}</bdi></h3><p><bdi>{a.description}</bdi></p></article>)}</div>
          </section>
          {p.painPoints.length > 0 && <section className="panel"><h2>{tl("مشکلاتی که حل می‌کند", "Problems it solves")}</h2><ul className="industry-list">{p.painPoints.map((x) => <li key={x}><bdi>{x}</bdi></li>)}</ul></section>}
          {p.outcomes.length > 0 && <section className="panel"><h2>{tl("نتایج بالقوه", "Potential outcomes")}</h2><div className="industry-outcomes">{p.outcomes.map((o) => <div key={o.metric}><strong><bdi>{o.metric}</bdi></strong><small><bdi>{o.description}</bdi></small></div>)}</div></section>}
        </div>
        <aside className="industry-aside">
          <section className="panel">
            <Tier tier={p.tier} />
            <strong className="industry-price">{p.slug === "university" ? tl("ویژهٔ بستهٔ دانشجویی فعال", "For active student packages") : tl("همراه اشتراک CRM", "Included with a CRM subscription")}</strong>
            <p>{status?.hasBusinessSubscription ? tl("پس از خرید اشتراک CRM، انتخاب صنعت هزینه جداگانه ندارد.", "Once CRM is active, selecting an industry has no separate charge.") : tl("ابتدا پلن CRM را تهیه کن؛ سپس بستهٔ صنعت و ابزارهای مرتبط در پورتال فعال می‌شوند.", "Choose a CRM plan first; then this industry pack and its related tools can be activated in your portal.")}</p>
            {action}
            {error && <p role="alert">{error}</p>}
          </section>
          {p.kpis.length > 0 && <section className="panel"><h3>{tl("شاخص‌های کلیدی داشبورد", "Dashboard KPIs")}</h3><ul className="industry-list kpi">{p.kpis.map((k) => <li key={k}><bdi>{k}</bdi></li>)}</ul></section>}
          <Link className="industry-login" href="/industry">{tl("بازگشت به همه بسته‌ها", "Back to all packs")}</Link>
        </aside>
      </div>
    </main>
  );
}
