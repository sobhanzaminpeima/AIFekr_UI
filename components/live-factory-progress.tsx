"use client";
// Live "production line" for a Video Factory job: every stage the creator's video goes
// through, with its state and a count (e.g. 12 of 40 images), refreshed by the factory's
// own 4-second polling. Built only from the job's stage, cursor, plan and steps.
import { manifestOf, type Job, type Project } from "@/lib/factory";
import { useApp } from "./providers";
import { Icon } from "./ui";

type Tx = [string, string, string, string];
type State = "done" | "active" | "waiting" | "failed" | "pending";
type Row = { id: string; icon: string; t: Tx; state: State; done?: number; total?: number };

const PHASE: Record<string, number> = { PLANNING: 0, SCRIPTING: 0, SCRIPT_REVIEW: 1, STORYBOARD_REVIEW: 1, ASSET_GENERATION: 2, SAMPLE_REVIEW: 2, SHOT_RENDERING: 3, SEMANTIC_QC: 3, ASSEMBLY: 4 };

export function ProductionLine({ job, project }: { job: Job; project: Project }) {
  const { locale, n } = useApp();
  const tx = (c: Tx) => c[{ fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1];
  const delivered = job.status === "DELIVERED", failed = job.status === "FAILED", cancelled = job.status === "CANCELLED";
  const phase = delivered ? 5 : PHASE[job.stage] ?? 0;
  let tasks: { kind: string; key: string }[] = [];
  try { tasks = (JSON.parse((job as Job & { plan?: string }).plan || "{}").tasks ?? []) as { kind: string; key: string }[]; } catch { /* plan not ready yet */ }
  const steps = job.steps ?? [];
  const finished = (prefix: string) => steps.filter((s) => s.key.startsWith(prefix) && s.status === "COMPLETED").length;
  const count = (kind: string) => tasks.filter((t) => t.kind === kind).length;
  const manifest = manifestOf(project);
  const shots = manifest ? manifest.chapters.reduce((t, c) => t + c.shots.length, 0) : 0;
  const chapters = manifest?.chapters.length ?? 0;
  const configuration = JSON.parse(String(project.configuration || "{}")) as { durationSeconds?: number; narration?: boolean; music?: boolean };
  const totalChapters = Math.max(1, Math.ceil((configuration.durationSeconds || 60) / 300));
  const media = (prefix: string, kind: string): Pick<Row, "state" | "done" | "total"> => {
    const total = count(kind), done = Math.min(total, finished(prefix));
    const currentKind = tasks[job.cursor]?.kind;
    return { total, done, state: phase > 2 || (total > 0 && done >= total) ? "done" : phase === 2 && currentKind === kind ? "active" : "pending" };
  };
  const rows: Row[] = [
    { id: "write", icon: "FileText", t: ["نوشتن متن و صحنه‌ها", "Writing script & scenes", "Skript & Szenen schreiben", "Senaryo ve sahneleri yazma"], state: phase > 0 ? "done" : "active", done: phase > 0 ? totalChapters : Math.min(job.cursor, totalChapters), total: totalChapters },
  ];
  if (["SCRIPT_REVIEW", "STORYBOARD_REVIEW"].includes(job.stage) && job.status === "AWAITING_APPROVAL")
    rows.push({ id: "review", icon: "Eye", t: ["منتظر تأیید متن و استوری‌بورد شما", "Waiting for your script/storyboard approval", "Wartet auf deine Freigabe", "Onayınız bekleniyor"], state: "waiting" });
  const images = media("image-", "IMAGE");
  if (images.total || phase < 2) rows.push({ id: "images", icon: "Image", t: ["ساخت تصویر صحنه‌ها", "Making scene images", "Szenenbilder erstellen", "Sahne görselleri"], ...images });
  if (job.stage === "SAMPLE_REVIEW" && job.status === "AWAITING_APPROVAL")
    rows.push({ id: "samples", icon: "Eye", t: ["منتظر تأیید سه تصویر نمونه", "Waiting for you to approve 3 sample images", "Wartet auf Freigabe der 3 Beispielbilder", "3 örnek görselin onayı bekleniyor"], state: "waiting" });
  if (count("VIDEO")) rows.push({ id: "videos", icon: "Video", t: ["ساخت ویدیوی صحنه‌ها", "Making scene videos", "Szenenvideos erstellen", "Sahne videoları"], ...media("video-", "VIDEO") });
  if (configuration.narration) rows.push({ id: "voice", icon: "AudioLines", t: ["صدای گوینده", "Narration", "Sprecher", "Seslendirme"], ...media("tts-", "TTS") });
  if (configuration.music) rows.push({ id: "music", icon: "Music", t: ["موسیقی پس‌زمینه", "Background music", "Hintergrundmusik", "Arka plan müziği"], ...media("music-", "MUSIC") });
  if (configuration.narration) rows.push({ id: "sync", icon: "SlidersHorizontal", t: ["هم‌زمانی صدا، تصویر و زیرنویس", "Syncing voice, images & captions", "Stimme, Bild & Untertitel synchronisieren", "Ses, görsel ve altyazı eşitleme"], state: phase > 2 ? "done" : "pending" });
  rows.push({ id: "render", icon: "Film", t: ["رندر صحنه‌ها", "Rendering scenes", "Szenen rendern", "Sahneleri render etme"], state: phase > 3 ? "done" : phase === 3 ? "active" : "pending", done: phase > 3 ? shots : phase === 3 ? Math.min(job.cursor, shots) : 0, total: shots || undefined });
  rows.push({ id: "assemble", icon: "Clapperboard", t: ["مونتاژ نهایی و کنترل کیفیت", "Final assembly & quality check", "Endschnitt & Qualitätsprüfung", "Son montaj ve kalite kontrolü"], state: phase > 4 ? "done" : phase === 4 ? "active" : "pending" });
  rows.push({ id: "deliver", icon: "Download", t: ["آماده برای دانلود", "Ready to download", "Bereit zum Download", "İndirmeye hazır"], state: delivered ? "done" : "pending" });

  // A failed or cancelled job marks the stage it stopped in.
  if (failed || cancelled) { const at = rows.find((r) => r.state === "active" || r.state === "waiting"); if (at) at.state = "failed"; }
  if (job.status === "PAUSED") { const at = rows.find((r) => r.state === "active"); if (at) at.state = "waiting"; }
  const weight = (r: Row) => (r.state === "done" ? 1 : r.total ? (r.done ?? 0) / r.total : 0);
  const progress = Math.round((rows.reduce((t, r) => t + weight(r), 0) / rows.length) * 100);
  const label: Record<State, Tx> = {
    done: ["انجام شد", "Done", "Fertig", "Tamam"], active: ["در حال انجام", "In progress", "Läuft", "Sürüyor"],
    waiting: ["منتظر شما", "Waiting for you", "Wartet auf dich", "Sizi bekliyor"], failed: ["متوقف شد", "Stopped", "Gestoppt", "Durdu"], pending: ["در صف", "Up next", "Als Nächstes", "Sırada"],
  };
  return (
    <section className="vf-line" aria-label={tx(["مراحل تولید", "Production steps", "Produktionsschritte", "Üretim adımları"])}>
      <div className="vf-line-bar" role="progressbar" aria-label={tx(["پیشرفت تولید", "Production progress", "Produktionsfortschritt", "Üretim ilerlemesi"])} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <i style={{ width: `${progress}%` }} />
        <span>{n(progress)}٪</span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.id} className={`vf-line-row ${r.state}`}>
            <span className="vf-line-icon">
              <Icon name={r.state === "done" ? "Check" : r.state === "active" ? "Loader2" : r.state === "failed" ? "CircleX" : r.icon} size={16} className={r.state === "active" ? "spin" : undefined} />
            </span>
            <strong>{tx(r.t)}</strong>
            {r.total ? <small>{n(r.done ?? 0)} / {n(r.total)}</small> : null}
            <em>{tx(label[r.state])}</em>
          </li>
        ))}
      </ol>
      {chapters > 0 && shots > 0 && <p className="vf-line-meta">{tx([`${n(chapters)} فصل · ${n(shots)} صحنه`, `${chapters} chapters · ${shots} scenes`, `${chapters} Kapitel · ${shots} Szenen`, `${chapters} bölüm · ${shots} sahne`])}</p>}
    </section>
  );
}
