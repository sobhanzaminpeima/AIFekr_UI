// The video factory's project shapes and its deterministic timeline, as the
// main site's lib/video-factory/domain.ts defines them. The server validates
// and fills defaults; this side only reads and sends them back.

export type Shot = {
  id: string; title: string; narration: string; visualPrompt: string; sfxPrompt?: string;
  durationSeconds?: number; assetId?: string; motion: "STATIC" | "PUSH_IN" | "PAN" | "TITLE" | "CHART" | "MAP";
  chart?: { labels: string[]; values: number[]; unit: string };
  map?: { locations: { label: string; latitude: number; longitude: number }[] };
  notes?: string; revision?: number;
  animation?: { fadeFrames: number; zoom: number; panPercent: number };
};
export type Chapter = { title: string; continuity: string; shots: Shot[] };
export type Manifest = { chapters: Chapter[]; characters: { name: string; description: string }[] };
export type AudioTrack = { assetId: string; kind: "SFX" | "MUSIC" | "VOICE"; startSeconds: number; offsetSeconds: number; durationSeconds: number; gainDb: number; fadeSeconds: number };
export type Configuration = {
  durationSeconds: number; language: "fa" | "en" | "de" | "tr"; ratio: "16:9" | "9:16" | "1:1";
  mode: "AUTOPILOT" | "REVIEW_GATES" | "PRO_STUDIO"; quality: "SMART" | "CINEMATIC_HYBRID" | "FILM_STUDIO";
  budgetCap: number; audience: string; genre: string; styleBible: string; mediaMode: "ANIMATIC" | "MULTIMEDIA";
  shotsPerChapter: number; narration: boolean; music: boolean; musicPrompt: string; voice: string;
  resolution: "720p" | "1080p"; captions: boolean; captionStyle: string; transition: string; ideaLab: boolean;
  voiceProfileId: string; forcedAlignment: boolean; semanticReview: boolean; exportStems: boolean;
  transcriptionAssetId: string; pronunciation: { word: string; replacement: string }[]; audioTracks: AudioTrack[];
};
export type Artifact = { id: string; kind: string; fileName: string };
export type Job = {
  id: string; status: string; stage: string; cursor: number; credits: number; spentCredits: number; errorCode: string | null;
  artifacts?: Artifact[]; steps?: { key: string; status: string; provider: string | null; model: string | null }[];
};
export type Project = {
  id: string; title: string; brief: string; configuration: string; manifest: string; version: number; jobs: Job[];
  research?: string; planning?: string; publishing?: string; updatedAt?: string;
};
export type Estimate = { credits: number; items: { action: string; quantity: number; credits: number }[] };

/** The classic new-project defaults (the server fills the remaining schema defaults). */
export const NEW_CONFIGURATION = {
  durationSeconds: 360, ratio: "16:9", mode: "AUTOPILOT", quality: "SMART", budgetCap: 3000, mediaMode: "MULTIMEDIA",
  narration: false, music: false, audience: "", genre: "educational", styleBible: "", shotsPerChapter: 8,
  musicPrompt: "Instrumental background, no vocals", voice: "alloy", resolution: "720p", ideaLab: false,
} as const;
export const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse", "marin", "cedar"];
export const ACTIVE = ["RUNNING", "QUEUED", "PAUSING", "CANCELLING"];
export const FINAL = ["DELIVERED", "FAILED", "CANCELLED"];

export const configOf = (p: Project) => JSON.parse(p.configuration) as Configuration;
export function manifestOf(p: Project): Manifest | null {
  try {
    const m = JSON.parse(p.manifest);
    return Array.isArray(m?.chapters) && m.chapters.length ? { characters: [], ...m } : null;
  } catch { return null; }
}

/** Deterministic 24 fps timeline: each shot's share of the film follows its timing weight. */
export function timeline(manifest: Manifest, seconds: number) {
  const source = manifest.chapters.flatMap((c, chapter) => c.shots.map((s) => ({ ...s, chapter })));
  const totalFrames = seconds * 24;
  let cursor = 0;
  const weight = source.reduce((n, s) => n + (s.durationSeconds || 1), 0);
  let elapsedWeight = 0;
  const shots = source.map((shot) => {
    elapsedWeight += shot.durationSeconds || 1;
    const end = Math.round((elapsedWeight * totalFrames) / weight);
    const result = { ...shot, startFrame: cursor, durationFrames: end - cursor };
    cursor = end;
    return result;
  });
  return { fps: 24, totalFrames, shots };
}
