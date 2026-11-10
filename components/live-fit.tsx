"use client";
import Link, { useSite } from "./site-link";

/** AIFekr FIT's public page: its own athletic look, inside the new design. */
export function LiveFit() {
  const c = useSite()?.fit;
  if (!c) return null;
  return (
    <main className="fit-land" id="main">
      <section className="fit-land-hero">
        <div className="fit-land-copy">
          <span className="fit-land-chip">AIFekr FIT</span>
          <p className="fit-land-kicker">{c.coaches}</p>
          <h1>{c.tagline}</h1>
          <p className="fit-land-proof">{c.proof}</p>
          <p className="fit-land-safety">{c.safety}</p>
          <div className="fit-land-actions">
            <Link className="btn primary" href="/register?plan=FIT_MONTHLY">{c.start}</Link>
            <a className="btn" href="#coaches">{c.explore}</a>
          </div>
        </div>
        <div className="fit-land-portraits" aria-label={c.trainers}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fitness/fika.png" alt="FIKA AI fitness coach" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fitness/fiko.png" alt="FIKO AI fitness coach" />
        </div>
      </section>
      <section id="coaches" className="fit-land-section">
        <h2>{c.trainers}</h2>
        <div className="fit-land-grid">
          {["FIKA", "FIKO"].map((name) => (
            <article key={name} className="fit-land-card">
              <span className="fit-land-chip">{c.ai}</span>
              <h3>{name} FIT</h3>
              <p>{c.programs} · {c.nutrition} · {c.gym}</p>
              <Link href="/fitness">{c.ai} →</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="fit-land-section fit-land-grid four">
        {[c.programs, c.gym, c.history, c.nutrition].map((x) => <article key={x} className="fit-land-card"><h3>{x}</h3><p>{c.safety}</p></article>)}
      </section>
      <section className="fit-land-section fit-land-grid">
        <article className="fit-land-card"><h2>{c.findCoach}</h2><Link href="/fitness/marketplace?tab=trainers">{c.findCoachLink} →</Link></article>
        <article className="fit-land-card"><h2>{c.sell}</h2><p>{c.sellBody}</p><Link href="/fitness/marketplace?tab=apply">{c.sellLink} →</Link></article>
      </section>
      <section id="membership" className="fit-land-section fit-land-cta">
        <h2>{c.plans}</h2>
        <p>{c.subscription}</p>
        <div className="fit-land-actions">
          <Link className="btn primary" href="/pricing?category=FITNESS">{c.plans}</Link>
          <Link className="btn" href="/register?plan=FIT_MONTHLY">{c.create}</Link>
          <Link className="btn" href="/login?redirect=/fitness">{c.login}</Link>
        </div>
      </section>
    </main>
  );
}
