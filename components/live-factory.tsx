"use client";
// The design's video factory (factory.tsx wizard and production-workspace.tsx
// tabs) on aifekr.com with the real factory (main site
// components/video-factory/VideoFactory): server projects, the credit estimate
// and its approval, the production job with its review gates, the script and
// storyboard, the timeline and the private deliverables. Wording comes from
// /api/app/shell (shell.factory); the project studios are in
// live-factory-studios.tsx.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "@/components/site-link";
import { useLocalState } from "@/lib/use-local-state";
import { fill } from "@/lib/live-app";
import { ACTIVE, FINAL, NEW_CONFIGURATION, VOICES, configOf, manifestOf, timeline, type Configuration, type Estimate, type Manifest, type Project } from "@/lib/factory";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { useLiveCredits } from "./live-shell-widgets";
import { Button, download, Empty, Icon, Modal, SectionTitle } from "./ui";
import { AdvancedStudio, CharactersStudio, EditStudio, IdeasStudio, LibraryStudio, PublishingStudio } from "./live-factory-studios";
import { MediaStudio } from "./live-factory-media";
import { ChannelStudio } from "./live-factory-youtube";
import { BuyCreditsInline } from "./buy-credits-inline";

export type Template = { id: string; name: string; configuration: { brief: string; configuration: Configuration } };
/** A purchasable video package; `offer` is its price in the visitor's currency, resolved by the main site like the landing (absent = not offered). */
export type VideoPackage = { planCode: string; name: string; nameEn: string | null; credits: number; entitlements: string; publicationStatus: string; offer?: { minor: number; currency: string; compareAtMinor?: number } | null };
type Catalog = { capabilities?: { silentOnly: boolean;musicAvailable?:boolean }; templates: Template[]; packages: VideoPackage[] };

// Classic error codes and the English text the classic page shows for them.
const FAILURES: Record<string, string> = {
  NARRATED_BUNDLE_REQUIRED: "Choose the narrated Creator Pack to generate a video with voice.",
  BUNDLE_FEATURE_LIMIT: "This package supports up to eight image scenes and narration per one-minute video. Turn off additional effects.",
  AUDIO_TEMPORARILY_UNAVAILABLE: "Image and video generation is active; narration and music are temporarily unavailable. Turn off audio options.",
  VIDEO_PACKAGE_REQUIRED_OR_EXHAUSTED: "Purchase a video package or renew your quota.",
  VIDEO_MAXIMUM_8_MINUTES: "Each video is limited to 8 minutes.",
  FACTORY_DISABLED: "The administrator has not enabled Video Factory.",
  PRICING_NOT_CONFIGURED: "Production rates have not been configured.",
  RENDERER_UNAVAILABLE: "The server renderer is unavailable.",
  APPROVED_PROVIDER_UNAVAILABLE: "The approved model is unavailable; ask an administrator to check it.",
  BUDGET_EXCEEDED: "The estimate exceeds the budget cap.",
  MUSIC_UNAVAILABLE: "Background music is not available yet. Turn music off to continue.",
  NO_APPROVED_MUSIC_PROVIDER: "Background music is not available yet. Turn music off to continue.",
  LONG_FORM_DISABLED: "Long-form production is not enabled.",
  VIDEO_FACTORY_UNAVAILABLE: "The service is unavailable; check connectivity and database migrations.",
  PROJECT_BUSY: "Wait for the active job to finish or cancel it before editing.",
  INSUFFICIENT_CREDITS: "Insufficient credits.",
  VERSION_CONFLICT: "The project changed; reopen it before editing.",
  UPLOAD_SCANNER_NOT_CONFIGURED: "The upload security scanner is not configured.",
};
const STATUS: Record<string, string> = { QUEUED: "Queued", RUNNING: "Running", PAUSED: "Paused", PAUSING: "Pausing", CANCELLING: "Cancelling", AWAITING_APPROVAL: "Storyboard approval required", DELIVERED: "Ready to download", FAILED: "Failed", CANCELLED: "Cancelled" };
const STAGE: Record<string, string> = { PLANNING: "Grounded idea lab", SCRIPT_REVIEW: "Script review", STORYBOARD_REVIEW: "Storyboard review", ASSET_GENERATION: "Media generation", SCRIPTING: "Script & storyboard", SHOT_RENDERING: "Shot rendering", ASSEMBLY: "Assembly & quality checks" };
const ACTIONS: Record<string, string> = { script_storyboard: "Script & storyboard · 2", silent_animatic_render: "Render & assembly", idea_lab: "Grounded idea lab", images: "Images", video_seconds: "Generated clip seconds", voice_shots: "Shot narration", music_minutes: "Instrumental music minutes" };

/** Estimate lines the classic wording never named; they showed as raw keys like "gemini_scene_animation". */
const EXTRA_ACTIONS: Record<string, [string, string]> = {
  gemini_scene_animation: ["متحرک‌سازی صحنه‌ها", "Scene animation"],
  completed_film_package: ["بستهٔ فیلم کامل", "Finished film package"],
  rerender_package: ["رندر دوباره (تصاویر و صداهای بدون تغییر دوباره ساخته نمی‌شوند)", "Re-render (unchanged images and voices are reused)"],
  music_addon: ["موسیقی پس‌زمینه (دقیقه)", "Background music (minutes)"],
  creator_bundle_video: ["ویدیوی بستهٔ سازنده", "Creator bundle video"],
};

/** Projects, the active project (kept per browser, like the design's draft) and the classic wording. */
export function useFactory() {
  const shell = useShell();
  const lang = shell?.lang ?? "fa";
  const copy = shell?.factory ?? null;
  const f = useCallback((en: string, values?: Record<string, string | number>) => fill(copy?.[en] ?? en, values ?? {}), [copy]);
  const err = (code: string) => (FAILURES[code] ? f(FAILURES[code]) : `${f("Operation failed")} (${code})`);
  const [active, setActive, ready] = useLocalState<string>("aifekr-factory-active", "");
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState("");
  const api = useCallback(async <T,>(url: string, data?: unknown, method = "POST"): Promise<T> => {
    const r = await fetch(url, data === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.code || d.error || "REQUEST_FAILED"), { details: d.details as Record<string, number> | undefined });
    return d as T;
  }, []);
  const refresh = useCallback(async (id = active) => {
    if (!id) { setProject(null); return null; }
    try {
      const { project } = await api<{ project: Project }>(`/api/video-factory/projects/${id}`);
      setProject(project);
      return project;
    } catch (e) {
      // A project that is gone (deleted elsewhere) is simply no longer the active one.
      if ((e as Error).message === "PROJECT_NOT_FOUND") setActive("");
      else setLoadError((e as Error).message);
      setProject(null);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, api]);
  useEffect(() => { void refresh(); }, [refresh]);
  const job = project?.jobs[0];
  useEffect(() => {
    if (!project || !job || !ACTIVE.includes(job.status)) return;
    const timer = setInterval(() => { void refresh(project.id); }, 4000);
    return () => clearInterval(timer);
  }, [project, job, refresh]);
  const [busy, setBusy] = useState(false);
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try { await work(); } catch (e) { toast.error(err((e as Error).message)); } finally { setBusy(false); }
  }
  return { shell, lang, f, err, api, active, setActive, ready, project, setProject, refresh, job, busy, run, loadError };
}
export type FactoryCtx = ReturnType<typeof useFactory>;

export function LiveFactory({ view }: { view: string }) {
  const x = useFactory();
  // Until this browser's active project is read, no tab can tell "new" from "open".
  if (!x.ready) return <div className="skeleton" />;
  if (view === "packages") return <PackagesView x={x} />;
  if (view === "projects") return <ProjectsView x={x} />;
  if (["production", "script", "timeline", "edit", "assets"].includes(view)) return <Wizard x={x} view={view} />;
  if (view === "channel") return <ChannelStudio x={x} />;
  if (!x.active) return <NeedProject x={x} />;
  if (!x.project) return x.loadError ? <ErrorBanner text={x.err(x.loadError)} /> : <div className="skeleton" />;
  if (view === "history") return <HistoryView x={x} />;
  if (view === "ideas") return <IdeasStudio x={x} />;
  if (view === "characters") return <CharactersStudio x={x} />;
  if (view === "library") return <LibraryStudio x={x} />;
  if (view === "media") return <MediaStudio x={x} />;
  if (view === "publishing") return <PublishingStudio x={x} />;
  if (view === "advanced") return <AdvancedStudio x={x} />;
  return <ProjectsView x={x} />;
}

export function ErrorBanner({ text }: { text: string }) {
  return <div className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{text}</span></div>;
}

/** Project tabs need a chosen project, as in the classic factory. */
function NeedProject({ x }: { x: FactoryCtx }) {
  const { fa } = useApp();
  return (
    <section className="panel">
      <Empty />
      <div className="domain-actions">
        <Link className="btn primary" href="/video-factory?tab=projects">{x.f("Your projects")}</Link>
        <Link className="btn" href="/video-factory?tab=production&new=1">{x.f("New project")}</Link>
      </div>
      <p className="fine-print">{fa ? "این بخش مربوط به یک پروژه است؛ اول پروژه‌ای را باز یا بساز." : "This section belongs to a project; open or create one first."}</p>
    </section>
  );
}

// ── My projects ────────────────────────────────────────────────────────────
function ProjectsView({ x }: { x: FactoryCtx }) {
  const { fa, n } = useApp();
  const { f, api, setActive, lang } = x;
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setProjects(null);
    api<{ projects: Project[] }>(`/api/video-factory/projects?page=${page}`).then((d) => setProjects(d.projects)).catch((e: Error) => { setError(e.message); setProjects([]); });
  }, [api, page]);
  return (
    <>
      <div className="production-project-summary">
        <span className="icon-chip orange"><Icon name="Film" size={34} /></span>
        <div>
          <h2>{fa ? "پروژه‌های روایت و ویدیو" : "Story & video projects"}</h2>
          <p>{f("Write your idea or script; AI turns it into a chaptered video with visuals and narration. You see the cost before it starts, and failed production is refunded automatically.")}</p>
        </div>
        <Link className="btn primary" href="/video-factory?tab=production&new=1" onClick={() => setActive("")}>{f("New project")}</Link>
      </div>
      {error && <ErrorBanner text={x.err(error)} />}
      {projects === null ? <div className="skeleton" /> : projects.length ? (
        <div className="tool-grid">
          {projects.map((p) => {
            const config = configOf(p), job = p.jobs[0];
            return (
              <article className="panel production-project-card" key={p.id}>
                <div className="production-project-art"><Icon name="Film" size={44} /><span>{config.ratio}</span></div>
                <h3>{p.title}</h3>
                <p>{p.brief.slice(0, 100)}</p>
                <span className="badge">{job ? f(STATUS[job.status] || job.status) : f("Draft")}</span>
                {p.updatedAt && <small>{new Date(p.updatedAt).toLocaleString(lang)}</small>}
                <div className="domain-actions">
                  <Link className="btn" href="/video-factory?tab=production" onClick={() => setActive(p.id)}>{fa ? "باز کردن پروژه" : "Open project"}</Link>
                  <Button onClick={() => download("video-project-" + p.id + ".json", JSON.stringify({ title: p.title, brief: p.brief, configuration: config, manifest: manifestOf(p) }, null, 2), "application/json")}>{fa ? "خروجی" : "Export"}</Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty />
          <h3>{f("Your first story starts here")}</h3>
          <p>{f("Choose a video package, add your idea or script, and create videos up to 8 minutes. Failed production credits are automatically refunded.")}</p>
        </section>
      )}
      <div className="domain-actions">
        <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{f("Previous")}</Button>
        <span>{n(page + 1)}</span>
        <Button disabled={(projects?.length ?? 0) < 30} onClick={() => setPage((p) => p + 1)}>{f("Next")}</Button>
      </div>
    </>
  );
}

// ── Versions & restore ─────────────────────────────────────────────────────
function HistoryView({ x }: { x: FactoryCtx }) {
  const { n } = useApp();
  const { f, api, project, refresh, run, busy, lang } = x;
  const [versions, setVersions] = useState<{ id: string; version: number; createdAt: string }[] | null>(null);
  useEffect(() => {
    api<{ versions: { id: string; version: number; createdAt: string }[] }>(`/api/video-factory/projects/${project!.id}/versions`).then((d) => setVersions(d.versions)).catch(() => setVersions([]));
  }, [api, project]);
  return (
    <>
      <div className="production-project-summary">
        <span className="icon-chip orange"><Icon name="Layers" size={34} /></span>
        <div>
          <h2>{f("Script & project version history")}</h2>
          <p>{project!.title} · {f("Current version")}: {n(project!.version)}</p>
        </div>
      </div>
      {versions === null ? <div className="skeleton" /> : versions.length ? (
        <div className="tool-grid">
          {versions.map((v) => (
            <article className="panel production-project-card" key={v.id}>
              <div className="production-project-art"><Icon name="Film" size={44} /><span>v{n(v.version)}</span></div>
              <h3>v{n(v.version)}</h3>
              <small>{new Date(v.createdAt).toLocaleString(lang)}</small>
              <div className="domain-actions">
                <Button disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}/versions`, { version: v.version, expectedVersion: project!.version }); await refresh(project!.id); toast.success(f("Restore as a new version · no charge")); })}>
                  {f("Restore as a new version · no charge")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : <section className="panel"><p>{f("Previous versions appear after the first edit.")}</p></section>}
    </>
  );
}

// ── Video packages ─────────────────────────────────────────────────────────
export function useCatalog(x: FactoryCtx) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => { x.api<Catalog>("/api/video-factory/catalog").then(setCatalog).catch(() => setCatalog({ templates: [], packages: [] })); }, [x.api]);
  return catalog;
}
function PackagesView({ x }: { x: FactoryCtx }) {
  const { fa, n, locale } = useApp();
  const catalog = useCatalog(x);
  const rows = (catalog?.packages ?? []).filter((p) => p.publicationStatus !== "DRAFT" && p.offer);
  const money = (minor: number, currency: string) => currency === "IRT" ? `${n(minor)} ${fa ? "تومان" : "toman"}` : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);
  return (
    <div className="plans-page">
      <div className="center-heading">
        <span className="eyebrow orange-text">{x.f("Video Factory")}</span>
        <h1>{x.f("From idea to video")}</h1>
        <p>{x.f("See the credit amount before starting. Approval reserves credits from your package balance; technical production failure refunds them.")}</p>
      </div>
      {catalog === null ? <div className="skeleton" /> : rows.length ? (
        <div className="pricing-grid">
          {rows.map((p) => {
            let limits: { videoCount?: number; videoSeconds?: number; videoMaxSeconds?: number } = {};
            try { limits = JSON.parse(p.entitlements || "{}").limits ?? {}; } catch {}
            return (
              <article className="panel plan-card" key={p.planCode}>
                <span className="icon-chip orange"><Icon name="Film" size={27} /></span>
                <h2>{fa ? p.name : p.nameEn || p.name}</h2>
                {p.offer!.compareAtMinor != null && p.offer!.compareAtMinor > p.offer!.minor && <del>{money(p.offer!.compareAtMinor, p.offer!.currency)}</del>}
                <strong className="plan-price">{money(p.offer!.minor, p.offer!.currency)}</strong>
                <ul className="check-list">
                  {limits.videoCount ? <li><Icon name="Check" size={16} />{n(limits.videoCount)} {fa ? "ویدیو" : "videos"}</li> : null}
                  {limits.videoMaxSeconds ? <li><Icon name="Check" size={16} />{fa ? "تا" : "Up to"} {n(Math.round(limits.videoMaxSeconds / 60))} {x.f("minutes")}</li> : null}
                  {p.credits > 0 && <li><Icon name="Check" size={16} />{n(p.credits)} {fa ? "اعتبار" : "credits"}</li>}
                </ul>
                <Link href={`/plans?plan=${encodeURIComponent(p.planCode)}`} className="btn primary full">{fa ? "انتخاب پکیج" : "Choose plan"}<Icon name="ArrowLeft" size={17} /></Link>
              </article>
            );
          })}
        </div>
      ) : <Empty />}
    </div>
  );
}

// ── The production wizard ──────────────────────────────────────────────────
const VIEW_STEP: Record<string, number> = { script: 1, timeline: 2, edit: 2, assets: 6 };
function Wizard({ x, view }: { x: FactoryCtx; view: string }) {
  const { fa, t, n } = useApp();
  const { f, project, job, active, setActive, busy } = x;
  const query = useSearchParams();
  const creating = !active || query.get("new") === "1";
  const manifest = project ? manifestOf(project) : null;
  const delivered = job?.status === "DELIVERED";
  // The step the project is actually at; a tab opens its own step instead.
  const natural = !project ? 0 : !job || FINAL.includes(job.status) && job.status !== "DELIVERED" ? 4
    : job.status === "AWAITING_APPROVAL" ? (job.stage === "SCRIPT_REVIEW" ? 1 : 2) : delivered ? 6 : 5;
  const [step, setStep] = useState<number>(creating ? 0 : VIEW_STEP[view] ?? natural);
  useEffect(() => { if (!creating && project) setStep(VIEW_STEP[view] ?? natural); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, view]);
  useEffect(() => { if (creating) setStep(0); }, [creating]);
  const labels = fa ? ["ایده و منابع", "فیلمنامه", "استوری‌بورد", "روایت و موسیقی", "تأیید هزینه", "تولید", "بازبینی"] : ["Idea & sources", "Script", "Storyboard", "Narration & music", "Cost approval", "Production", "Review"];
  const reachable = (i: number) => (creating ? i === 0 : i <= 4 || (i === 5 && !!job) || (i === 6 && delivered));
  if (!creating && !project) return x.loadError ? <ErrorBanner text={x.err(x.loadError)} /> : <div className="skeleton" />;
  return (
    <div>
      <SectionTitle title={t("factory")} subtitle={project && !creating ? project.title : fa ? "از یک ایده، تا یک داستان یکپارچه." : "From a little idea to a complete story."}>
        {project && !creating && <Link className="btn" href="/video-factory?tab=production&new=1">{f("New project")}</Link>}
      </SectionTitle>
      {!creating && <div className="stepper">
        {labels.map((s, i) => (
          <button key={s} className={step === i ? "current" : i < step ? "completed" : ""} disabled={busy || !reachable(i)} onClick={() => setStep(i)}>
            <span>{n(i + 1)}</span>{s}
          </button>
        ))}
      </div>}
      <section className="panel factory-step">
        {step === 0 ? (creating ? <NewProject x={x} onCreated={(id) => { setActive(id); history.replaceState(null, "", "/video-factory?tab=production"); setStep(4); }} /> : <ProjectBrief x={x} />)
          : step === 1 ? <ScriptStep x={x} manifest={manifest} />
          : step === 2 ? (view === "edit" ? <EditStudio x={x} /> : <StoryboardStep x={x} manifest={manifest} />)
          : step === 3 ? <SoundStep x={x} />
          : step === 4 ? <CostStep x={x} onStarted={() => setStep(5)} />
          : step === 5 ? <ProductionStep x={x} />
          : <ReviewStep x={x} />}
      </section>
      {project && !creating && job && !["production", "assets"].includes(view) && step !== 5 && ACTIVE.includes(job.status) && (
        <div className="inline-banner"><Icon name="Loader2" className="spin" /><p>{f(STAGE[job.stage] || job.stage)} · {f(STATUS[job.status])}</p><Button onClick={() => setStep(5)}>{labels[5]}</Button></div>
      )}
    </div>
  );
}

/** Step 1 for a new project: the classic form (title, idea, quick and advanced settings). */
function NewProject({ x, onCreated }: { x: FactoryCtx; onCreated: (id: string) => void }) {
  const { locale, n } = useApp();
  const { f, api, run, busy, lang } = x;
  const tx = (c: [string, string, string, string]) => c[{ fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1];
  const catalog = useCatalog(x);
  const silentOnly = catalog?.capabilities?.silentOnly ?? false;
  const musicAvailable = !!catalog?.capabilities?.musicAvailable;
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  // YouTube-first defaults: narration on, an image for every shot, autopilot within the budget.
  const [config, setConfig] = useState<Configuration>({ ...(NEW_CONFIGURATION as unknown as Configuration), durationSeconds: 180, narration: true, imageEveryShot: true, language: lang as Configuration["language"] });
  const [style, setStyle] = useState("STICKMAN");
  const change = (patch: Partial<Configuration>) => setConfig((c) => ({ ...c, ...patch }));
  const lengths = config.ratio === "9:16" ? [30, 60] : [60, 180, 300, 480];
  // Shown before the exact server estimate: the live price is 500 credits per minute.
  const approx = Math.ceil(config.durationSeconds / 60 * 500);
  const autoTitle = (title.trim() || brief.trim().split(/\n|[.!؟?]/)[0] || "").slice(0, 120);
  const chip = (on: boolean) => "vf-chip" + (on ? " selected" : "");
  return (
    <form className="vf-quick" onSubmit={(e) => {
      e.preventDefault();
      void run(async () => {
        const base = { ...config, visualStyle: style, music: config.music && musicAvailable };
        // Silent-only service: audio options are off, as the classic form disables them.
        const configuration = silentOnly ? { ...base, narration: false, music: false } : base;
        const { project } = await api<{ project: { id: string } }>("/api/video-factory/projects", { title: autoTitle.length >= 3 ? autoTitle : brief.trim().slice(0, 60), brief, configuration });
        onCreated(project.id);
        await x.refresh(project.id);
      });
    }}>
      <span className="eyebrow orange-text">{tx(["ساخت ویدیوی یوتیوب", "Make a YouTube video", "YouTube-Video erstellen", "YouTube videosu oluştur"])}</span>
      <h1>{tx(["موضوع را بنویس؛ بقیه‌اش خودکار است.", "Write the topic; the rest is automatic.", "Schreib das Thema – der Rest läuft automatisch.", "Konuyu yazın; gerisi otomatik."])}</h1>
      <p className="vf-quick-lead">{tx(["متن، تصویر همهٔ صحنه‌ها، صدای گوینده، هم‌زمانی صدا با تصویر، زیرنویس و رندر نهایی خودکار ساخته می‌شوند. بعد از ساخت، هر چیزی را خواستی ویرایش کن.", "Script, an image for every scene, narration, voice-to-image timing, captions and the final render are made automatically. Edit anything afterwards.", "Skript, Bilder für jede Szene, Sprecher, Timing, Untertitel und Rendering entstehen automatisch. Danach kannst du alles bearbeiten.", "Senaryo, her sahne için görsel, seslendirme, zamanlama, altyazı ve render otomatik yapılır. Sonra her şeyi düzenleyebilirsiniz."])}</p>

      <label className="vf-quick-topic">{tx(["موضوع یا متن ویدیو", "Topic or script", "Thema oder Skript", "Konu veya senaryo"])}
        <textarea required minLength={10} maxLength={30000} rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={tx(["مثلاً: داستان ساخت راه‌آهن سراسری ایران، برای مخاطب عام", "e.g. The story of the first transcontinental railway, for a general audience", "z. B. Die Geschichte der ersten transkontinentalen Eisenbahn", "örn. İlk kıtalararası demiryolunun hikâyesi"])} />
      </label>

      <fieldset className="vf-quick-row">
        <legend>{tx(["قالب", "Format", "Format", "Biçim"])}</legend>
        <button type="button" className={chip(config.ratio === "16:9")} aria-pressed={config.ratio === "16:9"} onClick={() => change({ ratio: "16:9", durationSeconds: config.durationSeconds < 60 ? 180 : config.durationSeconds })}><Icon name="Monitor" size={16} />{tx(["یوتیوب ۱۶:۹", "YouTube 16:9", "YouTube 16:9", "YouTube 16:9"])}</button>
        <button type="button" className={chip(config.ratio === "9:16")} aria-pressed={config.ratio === "9:16"} onClick={() => change({ ratio: "9:16", durationSeconds: 60 })}><Icon name="Smartphone" size={16} />{tx(["شورتس ۹:۱۶", "Shorts 9:16", "Shorts 9:16", "Shorts 9:16"])}</button>
      </fieldset>

      <fieldset className="vf-quick-row">
        <legend>{tx(["مدت ویدیو", "Length", "Länge", "Süre"])}</legend>
        {lengths.map((s) => <button type="button" key={s} className={chip(config.durationSeconds === s)} aria-pressed={config.durationSeconds === s} onClick={() => change({ durationSeconds: s })}>{s < 60 ? tx([`${n(s)} ثانیه`, `${s} sec`, `${s} Sek.`, `${s} sn`]) : tx([`${n(s / 60)} دقیقه`, `${s / 60} min`, `${s / 60} Min.`, `${s / 60} dk`])}</button>)}
      </fieldset>

      <fieldset className="vf-quick-styles">
        <legend>{tx(["سبک تصویر", "Visual style", "Bildstil", "Görsel stil"])}</legend>
        {QUICK_STYLES.map((s) => (
          <button type="button" key={s.id} className={"style-card" + (style === s.id ? " selected" : "")} aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
            <Icon name={s.icon} size={20} /><strong>{tx(s.t)}</strong>
          </button>
        ))}
      </fieldset>

      {!silentOnly && (
        <fieldset className="vf-quick-row">
          <legend>{tx(["صدای گوینده", "Narration", "Sprecher", "Seslendirme"])}</legend>
          <label className="check-label"><input type="checkbox" checked={config.narration} onChange={(e) => change({ narration: e.target.checked })} />{tx(["گوینده متن را بخواند", "A narrator reads the script", "Ein Sprecher liest das Skript", "Bir anlatıcı senaryoyu okusun"])}</label>
          {config.narration && <select aria-label={f("Narrator voice")} value={config.voice} onChange={(e) => change({ voice: e.target.value })}>{VOICES.map((v) => <option key={v}>{v}</option>)}</select>}
          {musicAvailable && <label className="check-label"><input type="checkbox" checked={config.music} onChange={(e) => change({ music: e.target.checked })} />{f("Instrumental background music")}</label>}
        </fieldset>
      )}
      {silentOnly && <div className="notice-banner"><Icon name="Info" size={16} /><span>{f("Script, image and silent video generation are available. Narration and music will follow when their connections are ready.")}</span></div>}

      <div className="vf-quick-submit">
        <span>{tx([`حدود ${n(approx)} کردیت · عدد دقیق را قبل از شروع می‌بینی`, `About ${approx} credits · you see the exact number before starting`, `Etwa ${approx} Credits · den genauen Betrag siehst du vor dem Start`, `Yaklaşık ${approx} kredi · kesin tutarı başlamadan önce görürsünüz`])}</span>
        <Button type="submit" variant="primary" disabled={busy || brief.trim().length < 10}>
          <Icon name="Sparkles" size={17} />{tx(["ساخت ویدیو", "Make the video", "Video erstellen", "Videoyu oluştur"])}
        </Button>
      </div>

      <details className="factory-advanced">
        <summary><Icon name="SlidersHorizontal" size={16} />{tx(["تنظیمات حرفه‌ای (اختیاری)", "Pro settings (optional)", "Profi-Einstellungen (optional)", "Pro ayarlar (isteğe bağlı)"])}</summary>
        <fieldset disabled={silentOnly}>
          <label>{f("Title")}<input maxLength={180} value={title} placeholder={autoTitle} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="domain-fields">
            {(catalog?.templates.length ?? 0) > 0 && (
              <label>{f("Start from template")}<select defaultValue="" onChange={(e) => { const tpl = catalog!.templates.find((v) => v.id === e.target.value); if (tpl) { setConfig({ ...config, ...tpl.configuration.configuration }); setBrief(tpl.configuration.brief); } }}>
                <option value="">{f("No template")}</option>{catalog!.templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
              </select></label>
            )}
            <label>{f("Output type")}<select value={config.mediaMode} onChange={(e) => change({ mediaMode: e.target.value as Configuration["mediaMode"], ...(e.target.value === "ANIMATIC" ? { quality: "SMART" as const, narration: false, music: false } : {}) })}>
              <option value="MULTIMEDIA">{f("Film with images, clips & audio")}</option><option value="ANIMATIC">{f("Silent storyboard film")}</option>
            </select></label>
            <label>{f("Output resolution")}<select value={config.resolution} onChange={(e) => change({ resolution: e.target.value as Configuration["resolution"] })}><option>720p</option><option>1080p</option></select></label>
            <label>{f("Production mode")}<select value={config.mode} onChange={(e) => change({ mode: e.target.value as Configuration["mode"] })}><option value="AUTOPILOT">{f("Autopilot within budget")}</option><option value="REVIEW_GATES">{f("Review before render")}</option><option value="PRO_STUDIO">{f("Studio with review")}</option></select></label>
            <label>{f("Language")}<select value={config.language} onChange={(e) => change({ language: e.target.value as Configuration["language"] })}><option value="fa">فارسی</option><option value="en">English</option><option value="de">Deutsch</option><option value="tr">Türkçe</option></select></label>
            <label>{f("Audience")}<input maxLength={500} value={config.audience} onChange={(e) => change({ audience: e.target.value })} /></label>
            <label>{f("Genre")}<select value={config.genre} onChange={(e) => change({ genre: e.target.value })}>{["educational", "documentary", "marketing", "real-estate", "narrative"].map((g) => <option key={g}>{g}</option>)}</select></label>
            <label>{f("Maximum shots per chapter")}<input type="number" min="1" max="20" value={config.shotsPerChapter} onChange={(e) => change({ shotsPerChapter: +e.target.value })} /></label>
            <label>{f("Credit budget cap")}<input type="number" min="1" max="1000000" required value={config.budgetCap} onChange={(e) => change({ budgetCap: +e.target.value })} /></label>
            {config.music && <label>{f("Music direction")}<input maxLength={2000} value={config.musicPrompt} onChange={(e) => change({ musicPrompt: e.target.value })} /></label>}
            <label className="check-label"><input type="checkbox" checked={config.ideaLab} onChange={(e) => change({ ideaLab: e.target.checked })} />{f("Include ideation & outline in project budget")}</label>
          </div>
          <label>{f("Style & character continuity bible")}<textarea maxLength={6000} rows={3} value={config.styleBible} onChange={(e) => change({ styleBible: e.target.value })} /></label>
        </fieldset>
      </details>
    </form>
  );
}
const QUICK_STYLES: { id: string; icon: string; t: [string, string, string, string] }[] = [
  { id: "STICKMAN", icon: "PersonStanding", t: ["مستند استیکمن", "Stickman documentary", "Strichmännchen-Doku", "Çöp adam belgesel"] },
  { id: "CUSTOM_CHARACTER", icon: "UserRound", t: ["کاراکتر اختصاصی", "Custom character", "Eigene Figur", "Özel karakter"] },
  { id: "CINEMATIC", icon: "Clapperboard", t: ["مستند سینمایی", "Cinematic documentary", "Kino-Doku", "Sinematik belgesel"] },
  { id: "HYBRID", icon: "LayoutGrid", t: ["روایت ترکیبی", "Hybrid storytelling", "Hybrides Erzählen", "Karma anlatım"] },
  { id: "NONE", icon: "Sparkles", t: ["آزاد", "Free style", "Freier Stil", "Serbest"] },
];

/** Step 1 for an existing project: what it is about, and where its sources are edited. */
function ProjectBrief({ x }: { x: FactoryCtx }) {
  const { fa, n } = useApp();
  const { f, project } = x;
  const config = configOf(project!);
  return (
    <>
      <span className="eyebrow orange-text">01 / {fa ? "اولین جرقه" : "THE FIRST SPARK"}</span>
      <h1>{project!.title}</h1>
      <p className="factory-brief">{project!.brief}</p>
      <dl className="cost-summary">
        <div className="cost-row"><dt>{f("Target duration")}</dt><dd>{config.durationSeconds < 60 ? `${n(config.durationSeconds)} ${f("seconds")}` : `${n(config.durationSeconds / 60)} ${f("minutes")}`}</dd></div>
        <div className="cost-row"><dt>{f("Aspect ratio")}</dt><dd>{config.ratio}</dd></div>
        <div className="cost-row"><dt>{f("Output type")}</dt><dd>{config.mediaMode === "ANIMATIC" ? f("Silent storyboard film") : f("Film with images, clips & audio")}</dd></div>
      </dl>
      <div className="domain-actions">
        <Link className="btn" href="/video-factory?tab=ideas">{f("Ideas & sources")}</Link>
        <Link className="btn" href="/video-factory?tab=characters">{f("Characters")}</Link>
      </div>
    </>
  );
}

/** Script & storyboard text: each chapter's shots, editable during review. */
function ScriptStep({ x, manifest: initial }: { x: FactoryCtx; manifest: Manifest | null }) {
  const { fa, n } = useApp();
  const { f, project, job, api, run, busy, refresh } = x;
  const [manifest, setManifest] = useState<Manifest | null>(initial);
  useEffect(() => setManifest(initial), [initial, project?.version]);
  if (!manifest) return <><h1>{fa ? "به داستانت شکل بده." : "Give your story a little shape."}</h1><p>{f("Chapters and shots appear here after writing completes.")}</p></>;
  const set = (ci: number, si: number, key: "title" | "narration" | "sfxPrompt" | "visualPrompt", value: string) =>
    setManifest({ ...manifest, chapters: manifest.chapters.map((c, i) => (i !== ci ? c : { ...c, shots: c.shots.map((s, j) => (j !== si ? s : { ...s, [key]: value })) })) });
  return (
    <>
      <h1>{fa ? "به داستانت شکل بده." : "Give your story a little shape."}</h1>
      <p>{f("Edit during script/storyboard review. Once production starts, wait for completion or cancel before editing. Every save creates a new version.")}</p>
      {manifest.chapters.map((chapter, ci) => (
        <section key={ci} className="factory-chapter">
          <h3>{n(ci + 1)}. {chapter.title}</h3>
          {chapter.continuity && <p className="fine-print">{chapter.continuity}</p>}
          {chapter.shots.map((shot, si) => (
            <div className="scene-script" key={shot.id}>
              <span className="eyebrow">{shot.id}</span>
              {([["title", "Shot title", 180, 2], ["narration", "Narration script", 3000, 4], ["sfxPrompt", "Sound effect prompt", 2000, 3], ["visualPrompt", "Visual prompt", 2000, 3]] as const).map(([key, label, max, rows]) => (
                <label key={key}>{f(label)}<textarea maxLength={max} rows={rows} value={shot[key] ?? ""} onChange={(e) => set(ci, si, key, e.target.value)} /></label>
              ))}
            </div>
          ))}
        </section>
      ))}
      <div className="domain-actions">
        <Button variant="primary" disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}`, { action: "edit", expectedVersion: project!.version, manifest }); await refresh(project!.id); toast.success(f("Save version · no charge")); })}>{f("Save version · no charge")}</Button>
        {job?.status === "AWAITING_APPROVAL" && job.stage === "SCRIPT_REVIEW" && <ApproveButton x={x} />}
      </div>
    </>
  );
}

function ApproveButton({ x }: { x: FactoryCtx }) {
  const { f, job, busy, run } = x;
  const label = job!.stage === "SCRIPT_REVIEW" ? f("Approve script & review storyboard") : job!.stage === "STORYBOARD_REVIEW" ? f("Approve storyboard & produce within reserved budget") : f("Approve storyboard & render within reserved budget");
  return <Button variant="primary" disabled={busy} onClick={() => run(() => control(x, "approve"))}>{label}</Button>;
}
async function control(x: FactoryCtx, action: string) {
  await x.api(`/api/video-factory/projects/${x.project!.id}`, { action });
  await x.refresh(x.project!.id);
}

/** Storyboard: the deterministic timeline, shot by shot. */
function StoryboardStep({ x, manifest }: { x: FactoryCtx; manifest: Manifest | null }) {
  const { fa, n } = useApp();
  const { f, project, job } = x;
  const seconds = configOf(project!).durationSeconds;
  const plan = useMemo(() => (manifest ? timeline(manifest, seconds) : null), [manifest, seconds]);
  return (
    <>
      <h1>{fa ? "صحنه‌به‌صحنه، داستان را ببین." : "See the story, scene by scene."}</h1>
      <p><Icon name="Play" size={16} /> {f("Deterministic timeline · 24 fps")}</p>
      {plan ? (
        <div className="storyboard-grid">
          {plan.shots.map((shot, i) => (
            <article className="panel storyboard-card" key={shot.id}>
              <span className="factory-shot-time">{(shot.startFrame / 24).toFixed(1)}s → {((shot.startFrame + shot.durationFrames) / 24).toFixed(1)}s</span>
              <h3>{n(i + 1)}. {shot.title}</h3>
              <p>{shot.visualPrompt}</p>
              <span className="meter"><i style={{ width: `${Math.max(5, (shot.durationFrames / (seconds * 24)) * 100)}%` }} /></span>
              <small>{shot.motion}</small>
            </article>
          ))}
        </div>
      ) : <p>{f("No shots have been planned yet.")}</p>}
      <div className="domain-actions">
        <Link className="btn" href="/video-factory?tab=edit">{f("Edit shots")}</Link>
        {job?.status === "AWAITING_APPROVAL" && job.stage !== "SCRIPT_REVIEW" && <ApproveButton x={x} />}
      </div>
    </>
  );
}

/** Narration & music: the project's audio settings, saved free of charge before a run. */
function SoundStep({ x }: { x: FactoryCtx }) {
  const { fa } = useApp();
  const { f, project, job, api, run, busy, refresh } = x;
  const catalog = useCatalog(x);
  const silentOnly = catalog?.capabilities?.silentOnly ?? false;
  const [config, setConfig] = useState(() => configOf(project!));
  useEffect(() => setConfig(configOf(project!)), [project]);
  const change = (patch: Partial<Configuration>) => setConfig({ ...config, ...patch });
  const locked = !!job && !FINAL.includes(job.status);
  return (
    <>
      <h1>{fa ? "صدای داستانت را پیدا کن." : "Find the sound of your story."}</h1>
      {silentOnly && <div className="notice-banner"><Icon name="Info" size={16} /><span>{f("Script, image and silent video generation are available. Narration and music will follow when their connections are ready.")}</span></div>}
      {locked && <div className="notice-banner"><Icon name="Lock" size={16} /><span>{f("Wait for the active job to finish or cancel it before editing.")}</span></div>}
      <fieldset disabled={silentOnly || locked || config.mediaMode !== "MULTIMEDIA"}>
        <label className="toggle-row"><span>{f("AI-generated narration")}</span><input type="checkbox" checked={config.narration} onChange={(e) => change({ narration: e.target.checked })} /></label>
        <div className="voice-options">
          {VOICES.map((v) => (
            <button type="button" key={v} className={config.voice === v ? "selected" : ""} disabled={!config.narration} onClick={() => change({ voice: v })}>
              <span className="icon-chip purple"><Icon name="AudioLines" size={26} /></span>
              <h3>{v}</h3>
              {config.voice === v && <Icon name="Check" size={18} />}
            </button>
          ))}
        </div>
        <label className="toggle-row"><span>{f("Instrumental background music")}</span><input type="checkbox" disabled={!catalog?.capabilities?.musicAvailable} checked={config.music} onChange={(e) => change({ music: e.target.checked })} /></label>
        <label>{f("Music direction")}<input disabled={!config.music} maxLength={2000} value={config.musicPrompt} onChange={(e) => change({ musicPrompt: e.target.value })} /></label>
      </fieldset>
      {config.mediaMode !== "MULTIMEDIA" && <p className="fine-print">{f("Output type")}: {f("Silent storyboard film")}</p>}
      <Button variant="primary" disabled={busy || locked || silentOnly} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}`, { action: "configuration", expectedVersion: project!.version, configuration: config }); await refresh(project!.id); toast.success(f("Save settings · no charge")); })}>
        {f("Save settings · no charge")}
      </Button>
    </>
  );
}

/** Cost approval: the classic estimate, then approve & start with the estimate as the ceiling. */
function CostStep({ x, onStarted }: { x: FactoryCtx; onStarted: () => void }) {
  const { fa, t, n, tl } = useApp();
  const { f, project, job, api, run, busy, refresh, shell } = x;
  const credits = useLiveCredits(shell?.user.credits ?? 0);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [confirm, setConfirm] = useState(false);
  // Set when the server refuses the start for lack of credits (package wallets are checked there, not here).
  const [short, setShort] = useState(false);
  // Set when the estimate is above the project's own budget cap; the server says how many credits the cap must cover.
  const [over, setOver] = useState<{ required: number; budgetCap: number; maxProjectCredits: number } | null>(null);
  // Set when music is on but no music service is enabled on the server.
  const [noMusic, setNoMusic] = useState(false);
  const estimateNow = async () => {
    setOver(null);
    setNoMusic(false);
    try { const d = await api<{ estimate: Estimate }>(`/api/video-factory/projects/${project!.id}`, { action: "estimate" }); setEstimate(d.estimate); }
    catch (e) { const d = (e as Error & { details?: Record<string, number> }).details; if (/^(MUSIC_UNAVAILABLE|NO_APPROVED_MUSIC_PROVIDER)$/.test((e as Error).message)) { setEstimate(null); setNoMusic(true); return; } if ((e as Error).message === "BUDGET_EXCEEDED" && d?.required) { setEstimate(null); setOver({ required: d.required, budgetCap: d.budgetCap, maxProjectCredits: d.maxProjectCredits }); return; } throw e; }
  };
  const musicOff = async () => {
    const latest = await refresh(project!.id);
    const p = latest || project!;
    await api(`/api/video-factory/projects/${p.id}`, { action: "configuration", expectedVersion: p.version, configuration: { ...JSON.parse(String(p.configuration || "{}")), music: false } });
    await refresh(p.id);
    await estimateNow();
  };
  const raiseCap = async () => {
    const latest = await refresh(project!.id);
    const p = latest || project!;
    await api(`/api/video-factory/projects/${p.id}`, { action: "configuration", expectedVersion: p.version, configuration: { ...JSON.parse(String(p.configuration || "{}")), budgetCap: over!.required } });
    await refresh(p.id);
    await estimateNow();
  };
  const canStart = !job || FINAL.includes(job.status);
  // The price is fetched as soon as this step opens, so starting is one click plus the confirmation.
  useEffect(() => { if (canStart && project) void run(estimateNow); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);
  return (
    <>
      <h1>{fa ? "هزینه، روشن و قابل پیش‌بینی." : "A clear cost. No surprises."}</h1>
      <p>{f("Actual product usage is recorded; unused authorization returns to the original wallet. Uncertain provider calls are not automatically repeated.")}</p>
      {!canStart && <div className="notice-banner"><Icon name="Info" size={16} /><span>{f(STATUS[job!.status] || job!.status)} · {f(STAGE[job!.stage] || job!.stage)}</span></div>}
      {estimate && (
        <dl className="cost-summary">
          {estimate.items.map((item) => <div className="cost-row" key={item.action}><dt>{EXTRA_ACTIONS[item.action] ? EXTRA_ACTIONS[item.action][fa ? 0 : 1] : f(ACTIONS[item.action] || item.action)} × {n(item.quantity)}</dt><dd>~✦ {n(item.credits)}</dd></div>)}
          <div className="cost-row total"><dt>{fa ? "مجموع" : "Total"}</dt><dd>~✦ {n(estimate.credits)}</dd></div>
          <div className="cost-row"><dt>{t("balance")}</dt><dd>{n(credits)}</dd></div>
          {estimate.characterConsistency
            ? <div className="cost-row"><dt>{tl("شخصیت ثابت در همهٔ تصویرها", "Same character in every image")}</dt><dd><Icon name="CircleCheck" size={16} /></dd></div>
            : JSON.parse(String(project?.configuration || "{}")).characterReferenceAssetId
              ? <div className="cost-row"><dt>{tl("شخصیت مرجع فعلاً فقط به‌عنوان راهنمای متنی استفاده می‌شود.", "The character image is used as text guidance only for now.")}</dt><dd>—</dd></div>
              : null}
        </dl>
      )}
      <div className="domain-actions">
        {canStart && <Button disabled={busy} onClick={() => run(estimateNow)}>{f("Estimate credits")}</Button>}
        {canStart && estimate && <Button variant="primary" disabled={busy} onClick={() => setConfirm(true)}><Icon name="Sparkles" size={18} />{f("Approve & start · ~{0} credits", { 0: estimate.credits })}</Button>}
      </div>
      {canStart && noMusic && (
        <div className="notice-banner budget-over">
          <Icon name="Info" size={16} />
          <span>{tl("موسیقی پس‌زمینه فعلاً روی سایت فعال نیست. برای ادامه، ویدیو را بدون موسیقی بساز.", "Background music is not available yet. Make this video without music to continue.")}</span>
          <Button variant="primary" disabled={busy} onClick={() => run(musicOff)}>{tl("بدون موسیقی ادامه بده", "Continue without music")}</Button>
        </div>
      )}
      {canStart && over && (
        <div className="notice-banner budget-over">
          <Icon name="Info" size={16} />
          {over.required <= over.maxProjectCredits ? (
            <>
              <span>{fa ? `این ویدیو حدود ${n(over.required)} کردیت لازم دارد، ولی سقف بودجهٔ این پروژه ${n(over.budgetCap)} کردیت است.` : `This video needs about ${over.required} credits, but this project's budget cap is ${over.budgetCap}.`}</span>
              <Button variant="primary" disabled={busy} onClick={() => run(raiseCap)}>{fa ? `افزایش سقف به ${n(over.required)} و برآورد دوباره` : `Raise cap to ${over.required} and re-estimate`}</Button>
            </>
          ) : (
            <span>{fa ? `این ویدیو حدود ${n(over.required)} کردیت لازم دارد که از حداکثر مجاز هر پروژه (${n(over.maxProjectCredits)}) بیشتر است. مدت ویدیو یا تعداد نماها را کم کنید.` : `This video needs about ${over.required} credits, above the per-project maximum of ${over.maxProjectCredits}. Shorten the video or use fewer shots.`}</span>
          )}
        </div>
      )}
      {canStart && estimate && short && <BuyCreditsInline need={estimate.credits} balance={credits} returnPath="/video-factory" />}
      {confirm && estimate && (
        <Modal title={fa ? "تأیید تولید" : "Approve production"} onClose={() => setConfirm(false)}>
          <h3><Icon name="Coins" size={18} /> {f("Estimate before reservation")}</h3>
          <p>✦ {n(estimate.credits)} {t("credits")}</p>
          <Button variant="primary full" disabled={busy} onClick={() => run(async () => {
            setConfirm(false);
            setShort(false);
            try { await api(`/api/video-factory/projects/${project!.id}`, { action: "start", idempotencyKey: crypto.randomUUID(), expectedCredits: estimate.credits }); }
            catch (e) { if (/INSUFFICIENT_CREDITS/.test((e as Error).message)) setShort(true); if (/^(MUSIC_UNAVAILABLE|NO_APPROVED_MUSIC_PROVIDER)$/.test((e as Error).message)) { setEstimate(null); setNoMusic(true); return; } throw e; }
            setEstimate(null);
            await refresh(project!.id);
            onStarted();
          })}>{t("confirm")}</Button>
        </Modal>
      )}
    </>
  );
}

/** Production: the job's status, stage, credits and controls. */
function ProductionStep({ x }: { x: FactoryCtx }) {
  const { fa, n } = useApp();
  const { f, job, busy, run, err } = x;
  if (!job) return <p>{f("Draft")}</p>;
  return (
    <>
      <h1>{fa ? "داستانت در حال شکل گرفتن است." : "Your story is coming together."}</h1>
      <dl className="cost-summary">
        <div className="cost-row"><dt>{f("Status")}</dt><dd>{f(STATUS[job.status] || job.status)}</dd></div>
        <div className="cost-row"><dt>{f("Stage")}</dt><dd>{f(STAGE[job.stage] || job.stage)}</dd></div>
        <div className="cost-row"><dt>{f("Used / reserved credits")}</dt><dd>{n(job.spentCredits)} / {n(job.credits)}</dd></div>
      </dl>
      {job.errorCode && <ErrorBanner text={err(job.errorCode)} />}
      <div className="domain-actions">
        {job.status === "AWAITING_APPROVAL" && <ApproveButton x={x} />}
        {["QUEUED", "RUNNING"].includes(job.status) && <Button disabled={busy} onClick={() => run(() => control(x, "pause"))}>{f("Pause")}</Button>}
        {job.status === "PAUSED" && <Button disabled={busy} onClick={() => run(() => control(x, "resume"))}>{f("Resume")}</Button>}
        {["QUEUED", "RUNNING", "PAUSED", "AWAITING_APPROVAL"].includes(job.status) && <Button disabled={busy} onClick={() => run(() => control(x, "cancel"))}>{f("Cancel & release unused credits")}</Button>}
      </div>
      {!!job.steps?.length && (
        <div className="production-board">
          {job.steps.map((step) => (
            <div className="inline-banner" key={step.key}>
              <span className={`icon-chip ${step.status === "SUCCEEDED" || step.status === "DONE" ? "lime" : "orange"}`}><Icon name={step.status === "SUCCEEDED" || step.status === "DONE" ? "Check" : "Film"} /></span>
              <h3>{step.key}</h3>
              <span className="badge">{step.status}</span>
              <small>{step.model || step.provider || f("Local render")}</small>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Review: the delivered film and its private downloads. */
function ReviewStep({ x }: { x: FactoryCtx }) {
  const { fa } = useApp();
  const { f, project, job, api, run, busy } = x;
  const [link, setLink] = useState("");
  const video = job?.artifacts?.find((a) => a.kind === "video");
  if (job?.status !== "DELIVERED") return <><h1>{fa ? "یک داستان تازه، با امضای تو." : "A fresh story, with your signature."}</h1><p>{f("Deliverables appear after rendering and duration validation.")}</p></>;
  return (
    <>
      {video && (
        <div className="storyboard-preview">
          <video controls preload="metadata" aria-label={f("Project preview")} src={`/api/video-factory/artifacts/${video.id}?preview=1`}>
            {job.artifacts!.filter((a) => a.kind === "vtt").map((a) => <track key={a.id} kind="captions" src={`/api/video-factory/artifacts/${a.id}?preview=1`} srcLang={configOf(project!).language} label={f("Narration script")} />)}
          </video>
        </div>
      )}
      <h1>{fa ? "یک داستان تازه، با امضای تو." : "A fresh story, with your signature."}</h1>
      <h3>{f("Private deliverables")}</h3>
      <div className="tool-grid">
        {job.artifacts?.map((a) => (
          <article className="panel production-asset-card" key={a.id}>
            <Icon name={a.kind === "video" ? "Clapperboard" : a.kind === "vtt" ? "Captions" : "FileText"} size={30} />
            <h3>{a.fileName}</h3>
            {a.kind === "youtube" && <p>{fa ? "عنوان، توضیحات با زمان فصل‌ها و برچسب‌ها؛ آمادهٔ کپی در یوتیوب." : "Title, description with chapter times and tags, ready to paste into YouTube."}</p>}
            <div className="domain-actions">
              <a className="btn" href={`/api/video-factory/artifacts/${a.id}`}><Icon name="Download" size={16} />{fa ? "دانلود" : "Download"}</a>
              <Button disabled={busy} onClick={() => run(async () => setLink((await api<{ url: string }>(`/api/video-factory/artifacts/${a.id}/link`, {})).url))}>{f("Create 10-minute link")}</Button>
            </div>
          </article>
        ))}
      </div>
      {link && <p><a href={link} rel="noreferrer">{f("Private download link · valid for 10 minutes")}</a></p>}
      <div className="inline-banner"><Icon name="LockKeyhole" /><p>{f("Use the Publishing tab to prepare metadata and authorize publication.")}</p><Link className="btn" href="/video-factory?tab=publishing">{f("Publishing")}</Link></div>
    </>
  );
}
