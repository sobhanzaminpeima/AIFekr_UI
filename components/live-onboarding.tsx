"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import { useShell } from "./live-shell-context";
import { fill, type WelcomeData } from "@/lib/live-app";

/** The design's option icons for the main site's onboarding ids. */
const ICONS: Record<string, string> = {
  business_owner: "BriefcaseBusiness", freelancer: "Laptop", creator: "Sparkles", agency: "Megaphone", student: "GraduationCap", real_estate: "Building2", sales: "Handshake", personal: "User",
  media: "Image", content: "PenLine", business: "BriefcaseBusiness", crm: "Users", education: "BookOpen", fitness: "Dumbbell", seo: "Search", youtube: "Clapperboard", general: "MessagesSquare",
  exploring: "Compass", project: "Target", productivity: "Gauge", automation: "Workflow", long_term: "CalendarCheck", evaluating_paid: "BadgeCheck",
  "voice-studio": "AudioLines", image: "Image", video: "Clapperboard", "video-factory": "Film", music: "Music", chat: "MessagesSquare", social: "Share2", "website-designer": "Globe",
};

/**
 * The design's onboarding on aifekr.com: who you are, your goals (several,
 * first is the main one), what matters now, then a suggested first tool.
 * Answers are saved at every step (main site /api/growth/onboarding), so the
 * page can be left and resumed or edited later; skipping is always one click.
 */
export function LiveOnboarding() {
  const { fa, locale } = useApp();
  const initial = useShell()!.welcome!;
  const c = initial.copy;
  const label = (x: [string, string]) => (fa ? x[0] : x[1]);
  const finished = initial.state === "completed";
  const [data, setData] = useState<WelcomeData>(initial);
  // A first visit resumes where it stopped; editing a finished one starts from the first question.
  const [step, setStep] = useState(finished ? 0 : Math.min(initial.step, 3));
  const [goals, setGoals] = useState(initial.answers.goals);
  const [persona, setPersona] = useState(initial.answers.persona);
  const [intent, setIntent] = useState(initial.answers.intent);
  const [chosen, setChosen] = useState(initial.recommendations[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/growth/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, goals, persona, intent }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.redirect) location.assign(d.redirect);
      return true;
    } catch {
      setError(c.error);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function go(next: number) {
    if (!(await send({ action: "save", step: next }))) return;
    if (next === 3) {
      // The suggestions follow the goals just saved.
      const d = await fetch("/api/growth/onboarding", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (d?.recommendations) {
        setData((x) => ({ ...x, recommendations: d.recommendations, credits: d.credits }));
        setChosen(d.recommendations[0]?.id ?? null);
      }
    }
    setStep(next);
  }

  const steps = [
    { options: data.options.personas, selected: persona ? [persona] : [], pick: (id: string) => setPersona((v) => (v === id ? null : id)) },
    { options: data.options.objectives, selected: goals, pick: (id: string) => setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id])) },
    { options: data.options.intents, selected: intent ? [intent] : [], pick: (id: string) => setIntent((v) => (v === id ? null : id)) },
    { options: data.recommendations.map((m) => ({ id: m.id, label: m.name })), selected: chosen ? [chosen] : [], pick: (id: string) => setChosen(id) },
  ];
  const current = steps[step];
  const rec = data.recommendations.find((m) => m.id === chosen);
  return (
    <div className="onboarding panel">
      <span className="eyebrow orange-text">{finished ? c.edit : c.welcome}</span>
      <div className="stepper">
        {steps.map((_, s) => (
          <button key={s} className={step === s ? "current" : s < step ? "completed" : ""} aria-current={step === s ? "step" : undefined} disabled={busy} onClick={() => (s > step ? go(s) : setStep(s))}>
            <span>{(s + 1).toLocaleString(locale)}</span>
          </button>
        ))}
      </div>
      <h1>{c.steps[step].title}</h1>
      <p>{c.steps[step].hint}</p>
      <div className="onboarding-options" aria-live="polite">
        {current.options.map((o) => (
          <button key={o.id} className={current.selected.includes(o.id) ? "selected" : ""} aria-pressed={current.selected.includes(o.id)} disabled={busy} onClick={() => current.pick(o.id)}>
            <Icon name={ICONS[o.id] ?? "Sparkles"} size={26} />
            {label(o.label)}
          </button>
        ))}
      </div>
      {step === 3 && rec && (
        <p>
          {c.firstTask}: {label(rec.exampleTask)} · {c.result}: {label(rec.firstValue)}
          <br />
          {fill(c.credits, { n: data.credits.toLocaleString(locale) })}
        </p>
      )}
      {error && <p role="alert" className="error-text">{error}</p>}
      <Button variant="primary full" disabled={busy} onClick={() => (step < 3 ? go(step + 1) : send({ action: "complete", module: chosen ?? undefined }))}>
        {step < 3 ? c.next : rec ? c.start : c.home}
      </Button>
      {finished ? (
        <Link className="text-link" href="/home">{c.later}</Link>
      ) : (
        <button className="text-link" disabled={busy} onClick={() => send({ action: "skip" })}>{c.skip}</button>
      )}
    </div>
  );
}
