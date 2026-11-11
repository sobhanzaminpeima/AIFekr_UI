"use client";
// The design's voice studio (voice-workspace.tsx tabs and the voice Studio of
// studio.tsx) on aifekr.com with the real studio (main site
// components/voice-studio/VoiceStudio): projects, the approved voice catalog,
// saved presets and queued generations through /api/voice-studio, billed per
// started interval with the reservation returned. Wording comes from
// /api/app/shell (shell.voice).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "@/components/site-link";
import { useLocalState } from "@/lib/use-local-state";
import { fill } from "@/lib/live-app";
import { creditsFor, estimatedSeconds, graphemes, splitProject, type VoicePolicy } from "@/lib/voice";
import { tools } from "@/mocks/catalog";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { useLiveCredits } from "./live-shell-widgets";
import { Button, download, Empty, Icon, Modal, SectionTitle } from "./ui";

type Project = { id: string; name: string; text: string; language: string; archivedAt: string | null; updatedAt: string };
type Generation = {
  id: string; status: string; segmentIndex: number; voiceId: string; modelId: string; durationMs: number | null;
  chargedCredits: number; reservedCredits: number; refundedCredits: number; errorCode: string | null;
  waveform: string | null; createdAt: string; providerStartedAt?: string | null;
};
type Settings = { stability?: number; style?: number; use_speaker_boost?: boolean; emotion?: string };
/** Delivery moods the main site sends as ElevenLabs audio tags (voice-studio/provider.ts VOICE_EMOTIONS). */
const EMOTIONS: [string, string, string][] = [["", "بدون حالت خاص", "Neutral"], ["happy", "شاد", "Happy"], ["excited", "هیجان‌زده", "Excited"], ["calm", "آرام", "Calm"], ["sad", "غمگین", "Sad"], ["serious", "جدی", "Serious"], ["whispers", "نجواگونه", "Whispering"]];
const supportsEmotion = (modelId: string) => /^eleven_v(3|4)/.test(modelId);
type Preset = { id: string; name: string; modelId: string; voiceId: string; settings: Settings };
type Model = { id: string; name: string; languages: { id: string; name: string }[]; maxCharacters: number; style: boolean; speakerBoost: boolean };
type Voice = { id: string; name: string; preview: string | null; labels: Record<string, string> };
type Data = {
  access?: { planAllowed: boolean; storageReady: boolean; trialRemaining?: number; trialMaxSeconds?: number };
  policy: VoicePolicy & {trialFree?:boolean};
  catalog: { models: Model[]; voices: Voice[] } | null;
  catalogError: string | null;
  credits: number;
  projects: Project[];
  presets: Preset[];
};
type Choice = { voiceId: string; modelId: string; settings: Settings };
const STATUSES = ["READY", "QUEUED", "RUNNING", "REVIEW", "FAILED", "CANCELLED"];
// The site-wide limiter answers RATE_LIMITED; the studio's own message for it is RATE_LIMIT.
const codeOf = (d: { code?: string }, fallback: string) => (d.code === "RATE_LIMITED" ? "RATE_LIMIT" : d.code || fallback);
const paragraphs = (text: string) => (text.trim() ? text.split(/\n\s*\n/) : [""]);

/** Studio data, the voice/model choice kept per browser, and the classic wording. */
function useVoice() {
  const shell = useShell();
  const lang = shell?.lang ?? "fa";
  const copy = shell?.voice ?? null;
  const k = useCallback((en: string, values?: Record<string, string | number>) => fill(copy?.strings[en] ?? en, values ?? {}), [copy]);
  const err = (code: string) => copy?.errors[code] ?? `${k("Action failed")}: ${code}`;
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState("");
  const [active, setActive] = useLocalState<string>("aifekr-voice-active", "");
  const [choice, setChoice, choiceReady] = useLocalState<Choice>("aifekr-voice-choice", { voiceId: "", modelId: "", settings: {} });
  const load = useCallback(async () => {
    const r = await fetch("/api/voice-studio", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(codeOf(d, "LOAD_FAILED"));
    setData(d);
    return d as Data;
  }, []);
  useEffect(() => { load().catch((e: Error) => setLoadError(e.message)); }, [load]);
  async function post(body: unknown) {
    const r = await fetch("/api/voice-studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(codeOf(d, "REQUEST_FAILED"));
    return d;
  }
  // As in the classic studio: a model that speaks the visitor's language (a fast one first) and the first approved voice.
  useEffect(() => {
    if (!data?.catalog || !choiceReady) return;
    const approved = data.catalog.models.filter((m) => data.policy.allowedModels.includes(m.id) && m.languages.some((l) => l.id === lang));
    const recommended = approved.find((m) => /turbo|flash|conversational/i.test(m.id)) || approved.find((m) => m.id === "eleven_v3") || approved[0];
    const firstVoice = data.catalog.voices.find((v) => !data.policy.allowedVoices.length || data.policy.allowedVoices.includes(v.id));
    if ((!choice.modelId && recommended) || (!choice.voiceId && firstVoice))
      setChoice({ ...choice, modelId: choice.modelId || recommended?.id || "", voiceId: choice.voiceId || firstVoice?.id || "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, choiceReady]);
  return { shell, lang, k, err, data, load, loadError, post, active, setActive, choice, setChoice };
}
type VoiceCtx = ReturnType<typeof useVoice>;

/** What the catalog allows for one language: models, the effective model, voices and language names. */
function catalogFor(v: VoiceCtx, language: string) {
  const { data, choice, k } = v;
  const allowedModels = data?.catalog?.models.filter((m) => data.policy.allowedModels.includes(m.id)) || [];
  const models = allowedModels.filter((m) => m.languages.some((l) => l.id === language));
  const names = new Map(allowedModels.flatMap((m) => m.languages.map((l) => [l.id, l.name] as const)));
  const languageLabel = (id: string) => (id === "fa" ? k("Persian") : names.get(id) || id);
  const languages = [...names.keys()].sort((a, b) => (a === language ? -1 : b === language ? 1 : languageLabel(a).localeCompare(languageLabel(b))));
  // The effective model always speaks the chosen language; the picked one is kept if it can.
  const modelId = models.some((m) => m.id === choice.modelId) ? choice.modelId : models[0]?.id ?? choice.modelId;
  const model = data?.catalog?.models.find((m) => m.id === modelId);
  const voices = data?.catalog?.voices.filter((x) => !data.policy.allowedVoices.length || data.policy.allowedVoices.includes(x.id)) || [];
  const voice = voices.find((x) => x.id === choice.voiceId);
  return { models, modelId, model, voices, voice, languages: languages.length ? languages : [language], languageLabel };
}

/** The studio's notices, as in the classic studio. */
function Notices({ v, offline }: { v: VoiceCtx; offline?: boolean }) {
  const { data, k, err, lang } = v;
  if (!data) return null;
  const a = data.access;
  const banner = (key: string, text: React.ReactNode, icon = "Info") => <div className="notice-banner" role="status" key={key}><Icon name={icon} size={16} /><span>{text}</span></div>;
  return (
    <>
      {!data.policy.enabled && banner("off", err("VOICE_STUDIO_DISABLED"))}
      {data.policy.enabled && a && !a.planAllowed && (a.trialRemaining ?? 0) > 0 &&
        banner("trial", data.policy.trialFree ? (lang==="fa"?`${a.trialRemaining} نوبت صدای رایگان تا ${a.trialMaxSeconds??30} ثانیه؛ بدون کسر کردیت.`:lang==="de"?`${a.trialRemaining} kostenlose Sprachproben bis ${a.trialMaxSeconds??30} Sekunden.`:lang==="tr"?`${a.trialRemaining} ücretsiz ses denemesi, en fazla ${a.trialMaxSeconds??30} saniye.`:`${a.trialRemaining} free voice samples, up to ${a.trialMaxSeconds??30} seconds. No credits charged.`) : k("You can create {0} short sample(s) of up to {1} seconds. It uses your credits as usual and is refunded if it fails.", { 0: (a.trialRemaining ?? 0).toLocaleString(lang), 1: (a.trialMaxSeconds ?? 30).toLocaleString(lang) }), "Sparkles")}
      {data.policy.enabled && a && !a.planAllowed && !(a.trialRemaining ?? 0) &&
        banner("plan", data.policy.paidAccess
          ? <>{err("CREDITS_TO_CONTINUE")} <Link href="/credits">{lang === "fa" ? "خرید کردیت" : lang === "de" ? "Credits kaufen" : lang === "tr" ? "Kredi satın al" : "Buy credits"}</Link></>
          : <>{err("PLAN_REQUIRED")} <Link href="/pricing">{k("See plans")}</Link></>, "Lock")}
      {data.policy.enabled && a && !a.storageReady && banner("storage", err("PRIVATE_STORAGE_REQUIRED"))}
      {data.catalogError && banner("catalog", err(data.catalogError), "AlertCircle")}
      {offline && banner("offline", k("You are offline. Your text is kept on this device."), "WifiOff")}
    </>
  );
}

export function LiveVoice({ view }: { view: string }) {
  const v = useVoice();
  if (!v.data) return v.loadError ? <div className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{v.err(v.loadError)}</span></div> : <div className="skeleton" />;
  if (view === "text") return <ScriptView v={v} />;
  if (view === "voice" || view === "presets") return <LibraryView v={v} />;
  if (view === "generate") return <GenerateView v={v} />;
  if (view === "history") return <AudioFiles v={v} />;
  return <ProjectsView v={v} archived={view === "archive"} />;
}

/** The design's voice stepper (studio.tsx): script, voice, generate — each step is its tab. */
function VoiceStepper({ current }: { current: number }) {
  const { fa, n } = useApp();
  const steps = fa ? ["متن و زبان", "انتخاب صدا", "ساخت و شنیدن"] : ["Script", "Voice", "Generate"];
  const href = ["/voice-studio?tab=text", "/voice-studio?tab=voice", "/voice-studio?tab=generate"];
  return (
    <div className="stepper">
      {steps.map((s, i) => <Link key={s} href={href[i]} className={i === current ? "current" : i < current ? "completed" : ""} aria-current={i === current ? "step" : undefined}><span>{n(i + 1)}</span>{s}</Link>)}
    </div>
  );
}

// ── Voice projects / Archive ───────────────────────────────────────────────
function ProjectsView({ v, archived }: { v: VoiceCtx; archived: boolean }) {
  const { fa, t, n } = useApp();
  const { data, k, err, post, load, setActive, lang } = v;
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const visible = data!.projects.filter((p) => !!p.archivedAt === archived && p.name.toLowerCase().includes(query.toLowerCase()));
  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); await load(); } catch (e) { toast.error(err((e as Error).message)); } finally { setBusy(""); }
  }
  return (
    <>
      <div className="domain-toolbar">
        <input aria-label={fa ? "جستجوی پروژه‌های صوتی" : "Search voice projects"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} />
        {!archived && <Link className="btn primary" href="/voice-studio?tab=text&new=1">{fa ? "پروژه تازه" : "New project"}</Link>}
      </div>
      {visible.length ? (
        <div className="tool-grid">
          {visible.map((p) => (
            <article className="panel voice-project-card" key={p.id}>
              <span className="icon-chip purple"><Icon name="AudioLines" size={28} /></span>
              <h3>{p.name}</h3>
              <p>{n(paragraphs(p.text).filter((x) => x.trim()).length)} {fa ? "بخش" : "segments"} · {n(graphemes(p.text))} {k("characters")} · {p.language.toUpperCase()}</p>
              <small>{new Date(p.updatedAt).toLocaleString(lang)}</small>
              <div className="domain-actions">
                {!archived && <Link className="btn" href="/voice-studio?tab=text" onClick={() => setActive(p.id)}>{fa ? "باز کردن پروژه" : "Open project"}</Link>}
                <Button disabled={busy === p.id} onClick={() => act(p.id, () => post({ action: "save", id: p.id, name: p.name, text: p.text, language: p.language, archive: !archived }))}>
                  {archived ? (fa ? "بازگردانی" : "Restore") : fa ? "بایگانی" : "Archive"}
                </Button>
                <Button onClick={() => download(p.name + ".json", JSON.stringify({ name: p.name, language: p.language, text: p.text }, null, 2), "application/json")}>{t("export")}</Button>
                <Button disabled={busy === p.id} onClick={() => { if (confirm(k("Delete this project?"))) void act(p.id, async () => { await post({ action: "deleteProject", id: p.id }); if (v.active === p.id) setActive(""); }); }}>{t("delete")}</Button>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty />}
    </>
  );
}

// ── Script & segments ──────────────────────────────────────────────────────
type Draft = { id: string; name: string; language: string; segments: string[] };
function ScriptView({ v }: { v: VoiceCtx }) {
  const { fa, t, n } = useApp();
  const { data, k, err, post, load, active, setActive, lang } = v;
  const query = useSearchParams();
  const project = data!.projects.find((p) => p.id === active && !p.archivedAt);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const fromProject = (p: Project): Draft => ({ id: p.id, name: p.name, language: p.language, segments: paragraphs(p.text) });
  const create = () => setDraft({ id: "", name: fa ? "پروژه صوتی تازه" : "New voice project", language: lang, segments: [""] });
  useEffect(() => { if (query.get("new") === "1") create(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const current = draft || (project ? fromProject(project) : null);
  const { languages, languageLabel } = catalogFor(v, current?.language || lang);
  const edit = (patch: Partial<Draft>) => current && setDraft({ ...current, ...patch });
  async function commit(next: Draft) {
    setBusy(true);
    try {
      const d = await post({ action: "save", ...(next.id ? { id: next.id } : {}), name: next.name.trim() || k("Voice project"), text: next.segments.map((s) => s.trim()).filter(Boolean).join("\n\n"), language: next.language });
      setActive(d.project.id);
      setDraft(null);
      await load();
      toast.success(k("Project saved"));
      return d.project as Project;
    } catch (e) {
      toast.error(err((e as Error).message));
      return null;
    } finally { setBusy(false); }
  }
  return (
    <>
      <VoiceStepper current={0} />
      <div className="domain-toolbar">
        <select aria-label={fa ? "پروژه صوتی" : "Voice project"} value={current?.id || ""} onChange={(e) => { setActive(e.target.value); setDraft(null); }}>
          <option value="">{fa ? "انتخاب پروژه" : "Choose project"}</option>
          {data!.projects.filter((p) => !p.archivedAt).map((p, _i, all) => <option key={p.id} value={p.id}>{projectLabel(p, all, fa)}</option>)}
        </select>
        <Button variant="primary" onClick={create}>{fa ? "پروژه صوتی تازه" : "New voice project"}</Button>
      </div>
      {current ? (
        <form className="panel" onSubmit={(e) => { e.preventDefault(); void commit(current); }}>
          <div className="domain-fields">
            <label>
              {fa ? "نام پروژه" : "Project name"}
              <input required maxLength={120} value={current.name} onChange={(e) => edit({ name: e.target.value })} />
            </label>
            <label>
              {fa ? "زبان متن" : "Script language"}
              <select value={current.language} onChange={(e) => edit({ language: e.target.value })}>
                {languages.map((id) => <option key={id} value={id}>{languageLabel(id)}</option>)}
              </select>
            </label>
          </div>
          {current.segments.map((s, i) => (
            <article className="voice-segment" key={i}>
              <div className="row-between">
                <strong>{fa ? "بخش" : "Segment"} {n(i + 1)}</strong>
                <div className="domain-actions">
                  <Button disabled={i === 0} label={fa ? "انتقال بخش به بالا" : "Move segment up"} onClick={() => { const segments = [...current.segments]; [segments[i - 1], segments[i]] = [segments[i], segments[i - 1]]; edit({ segments }); }}>↑</Button>
                  <Button disabled={current.segments.length === 1} onClick={() => edit({ segments: current.segments.filter((_, x) => x !== i) })}>{t("delete")}</Button>
                </div>
              </div>
              <label>
                {fa ? "متن گویندگی" : "Narration script"}
                <textarea rows={5} required value={s} onChange={(e) => edit({ segments: current.segments.map((x, j) => (j === i ? e.target.value : x)) })} />
              </label>
            </article>
          ))}
          <p className="fine-print">{n(graphemes(current.segments.join("\n\n")))} / {n(data!.policy.maxCharacters)} {k("characters")}</p>
          <div className="domain-actions">
            <Button onClick={() => edit({ segments: [...current.segments, ""] })}>{fa ? "افزودن بخش" : "Add segment"}</Button>
            <Button type="submit" variant="primary" disabled={busy}>{t("save")}</Button>
            <Button disabled={busy} onClick={async () => { if (await commit(current)) location.assign("/voice-studio?tab=voice"); }}>
              {t("next")}
              <Icon name="ArrowLeft" size={16} />
            </Button>
          </div>
        </form>
      ) : <Empty onAction={create} />}
    </>
  );
}

// ── Voice library / Saved presets ──────────────────────────────────────────
function VoiceSettings({ v, language }: { v: VoiceCtx; language: string }) {
  const { data, k, err, post, load, choice, setChoice } = v;
  const { models, modelId, model } = catalogFor(v, language);
  const { fa } = useApp();
  const [presetId, setPresetId] = useState("");
  const settings = choice.settings;
  const setSettings = (next: Settings) => setChoice({ ...choice, settings: next });
  async function act(fn: () => Promise<unknown>) { try { await fn(); await load(); } catch (e) { toast.error(err((e as Error).message)); } }
  return (
    <>
      <label>
        {k("Model")}
        <select value={modelId} onChange={(e) => setChoice({ ...choice, modelId: e.target.value, settings: {} })}>
          {!models.length && <option value="">—</option>}
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label>
        {k("Stability")}
        <input type="range" min="0" max="1" step={modelId === "eleven_v3" ? "0.5" : "0.1"} value={settings.stability ?? 0.5} onChange={(e) => setSettings({ ...settings, stability: Number(e.target.value) })} />
      </label>
      {supportsEmotion(modelId) && (
        <label>
          {fa ? "حس و حال صدا" : "Voice mood"}
          <select value={settings.emotion ?? ""} onChange={(e) => setSettings({ ...settings, emotion: e.target.value || undefined })}>
            {EMOTIONS.map(([id, faName, enName]) => <option key={id} value={id}>{fa ? faName : enName}</option>)}
          </select>
        </label>
      )}
      {model?.style && (
        <label>
          {k("Style strength")}
          <input type="range" min="0" max="1" step="0.1" value={settings.style ?? 0} onChange={(e) => setSettings({ ...settings, style: Number(e.target.value) })} />
        </label>
      )}
      {model?.speakerBoost && (
        <label className="check-label"><input type="checkbox" checked={settings.use_speaker_boost ?? false} onChange={(e) => setSettings({ ...settings, use_speaker_boost: e.target.checked })} />Speaker boost</label>
      )}
      <label>
        {k("Saved presets")}
        <select value={presetId} onChange={(e) => { setPresetId(e.target.value); const p = data!.presets.find((x) => x.id === e.target.value); if (p) setChoice({ voiceId: p.voiceId, modelId: p.modelId, settings: p.settings }); }}>
          <option value="">—</option>
          {data!.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="domain-actions">
        <Button disabled={!choice.voiceId || !modelId} onClick={() => { const name = prompt(k("Preset name")); if (name) void act(() => post({ action: "savePreset", name, voiceId: choice.voiceId, modelId, settings })); }}>
          <Icon name="Save" size={15} />{k("Save these settings")}
        </Button>
        {presetId && <Button onClick={() => void act(async () => { await post({ action: "deletePreset", id: presetId }); setPresetId(""); })}><Icon name="Trash2" size={15} />{k("Delete selected preset")}</Button>}
      </div>
    </>
  );
}

function LibraryView({ v }: { v: VoiceCtx }) {
  const { fa, t } = useApp();
  const { data, k, choice, setChoice, active, lang } = v;
  const language = data!.projects.find((p) => p.id === active)?.language || lang;
  const { voices } = catalogFor(v, language);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [playing, setPlaying] = useState("");
  const player = useRef<HTMLAudioElement | null>(null);
  const genders = [...new Set(voices.map((x) => x.labels.gender).filter(Boolean))];
  const shown = voices.filter((x) => `${x.name} ${Object.values(x.labels).join(" ")}`.toLowerCase().includes(search.toLowerCase()) && (!gender || x.labels.gender === gender));
  const genderLabel = (g: string) => (g === "" ? k("All") : g === "female" ? k("Female") : g === "male" ? k("Male") : g === "neutral" ? k("Neutral") : g);
  // One shared player for voice previews instead of a full audio control per card.
  function preview(id: string, src: string) {
    const audio = player.current;
    if (!audio) return;
    if (playing === id) return audio.pause();
    audio.src = src;
    void audio.play().then(() => setPlaying(id)).catch(() => setPlaying(""));
  }
  return (
    <>
    <VoiceStepper current={1} />
    <div className="voice-library">
      <section>
        <div className="domain-toolbar">
          <input aria-label={k("Search voices")} placeholder={k("Search name or style…")} value={search} onChange={(e) => setSearch(e.target.value)} />
          {genders.length > 1 && (
            <div className="chips" role="group" aria-label={k("Voice filter")}>
              {["", ...genders].map((g) => <button key={g || "all"} className={gender === g ? "selected" : ""} aria-pressed={gender === g} onClick={() => setGender(g)}>{genderLabel(g)}</button>)}
            </div>
          )}
        </div>
        <div className="tool-grid">
          {shown.map((x) => {
            const [title, subtitle] = x.name.split(" - ");
            const selected = choice.voiceId === x.id;
            return (
              <div className={"panel voice-choice " + (selected ? "selected" : "")} key={x.id}>
                <button className="voice-choice-pick" aria-pressed={selected} onClick={() => setChoice({ ...choice, voiceId: x.id })}>
                  <span className="voice-library-avatar"><Icon name="AudioLines" size={34} /></span>
                  <h3 dir="auto">{title}</h3>
                  <p dir="auto">{subtitle || [x.labels.accent, x.labels.description || x.labels.age].filter(Boolean).join(" · ")}</p>
                  <span className="badge">{selected ? (fa ? "انتخاب‌شده" : "Selected") : fa ? "انتخاب صدا" : "Choose voice"}</span>
                </button>
                {x.preview && (
                  <button className="voice-preview" aria-label={`${k("Preview")} ${x.name}`} onClick={() => preview(x.id, x.preview!)}>
                    <Icon name={playing === x.id ? "Pause" : "Play"} size={16} />
                  </button>
                )}
                <div className="voice-waveform" aria-hidden="true">
                  {[25, 58, 90, 43, 72, 100, 62, 35, 81, 48, 68, 30].map((height, i) => <i key={i} style={{ height: height + "%" }} />)}
                </div>
              </div>
            );
          })}
        </div>
        {!shown.length && <p className="muted">{k("No verified voices match this filter.")}</p>}
        <audio ref={player} hidden onEnded={() => setPlaying("")} onPause={() => setPlaying("")} />
      </section>
      <aside className="panel">
        <h3>{fa ? "تنظیمات پیش‌فرض صدا" : "Default voice settings"}</h3>
        <Notices v={v} />
        <VoiceSettings v={v} language={language} />
        <Link className="btn primary full" href="/voice-studio?tab=generate" aria-disabled={!choice.voiceId}>{t("next")}<Icon name={fa ? "ArrowLeft" : "ArrowRight"} size={16} /></Link>
      </aside>
    </div>
    </>
  );
}

// ── Generate & listen ──────────────────────────────────────────────────────
function GenerateView({ v }: { v: VoiceCtx }) {
  const { t, fa, n } = useApp();
  const { data, k, err, post, load, active, setActive, choice, setChoice, lang, shell } = v;
  const credits = useLiveCredits(shell?.user.credits ?? 0);
  const tool = tools.find((x) => x.slug === "create/voice")!;
  const project = data!.projects.find((p) => p.id === active);
  const [name, setName] = useState(project?.name ?? "");
  const [text, setText] = useState(project?.text ?? "");
  const [language, setLanguage] = useState(project?.language ?? lang);
  const [segment, setSegment] = useState(0);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [tab, setTab] = useState("prompt");
  const [advanced, setAdvanced] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [audioVersion, setAudioVersion] = useState(0);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { models, modelId, model, voices, voice, languages, languageLabel } = catalogFor(v, language);
  const pending = generations.some((g) => g.status === "QUEUED" || g.status === "RUNNING");
  const job = generations.find((g) => g.status === "QUEUED" || g.status === "RUNNING") || generations[0];
  const wasPending = useRef(false);
  // Opening another project (or this one after it loads) shows its saved text.
  useEffect(() => { setName(project?.name ?? ""); setText(project?.text ?? ""); setLanguage(project?.language ?? lang); setSegment(0); setGenerations([]); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);
  const history = useCallback(async () => {
    if (!project) return;
    const r = await fetch(`/api/voice-studio?project=${encodeURIComponent(project.id)}`, { cache: "no-store" });
    if (r.ok) setGenerations((await r.json()).generations);
  }, [project]);
  useEffect(() => {
    const first = setTimeout(() => void history(), 0);
    const timer = setInterval(() => { if (document.visibilityState === "visible") void history(); }, pending ? 1000 : 12000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [history, pending]);
  useEffect(() => { if (wasPending.current && !pending) void load().catch(() => {}); wasPending.current = pending; }, [pending, load]);
  useEffect(() => { if (!pending) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [pending]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    addEventListener("online", update); addEventListener("offline", update);
    return () => { removeEventListener("online", update); removeEventListener("offline", update); };
  }, []);

  const { segments, splitError } = useMemo(() => {
    try { return { segments: splitProject(text, language, data!.policy.maxDurationSeconds || 60, model?.maxCharacters || 5000), splitError: "" }; }
    catch { return { segments: [] as string[], splitError: "UNSPLITTABLE_TEXT" }; }
  }, [text, language, data, model?.maxCharacters]);
  const policy = data!.policy;
  const selected = segments[segment] || "";
  const estimate = estimatedSeconds(selected || " ", language);
  const freeSample = !data!.access?.planAllowed && !!policy.trialFree && (data!.access?.trialRemaining??0)>0;
  const cost = freeSample ? 0 : creditsFor(estimate, policy);
  const reserved = freeSample ? 0 : creditsFor(policy.maxDurationSeconds, policy);
  const a = data!.access;
  const blockedReason = !policy.enabled ? err("VOICE_STUDIO_DISABLED")
    : a && !a.planAllowed && !(a.trialRemaining ?? 0) ? err(policy.paidAccess ? "CREDITS_TO_CONTINUE" : "PLAN_REQUIRED")
    : !text.trim() ? k("Write the narration text first.")
    : !choice.voiceId ? k("Choose a voice from the voice list.")
    : !model ? k("No enabled model supports this language.")
    : graphemes(text) > policy.maxCharacters ? err("PROJECT_TEXT_TOO_LONG")
    : data!.credits < reserved ? err("INSUFFICIENT_CREDITS")
    : offline ? k("You are offline.") : "";
  const statusName = (s: string) => ({ READY: k("Ready"), QUEUED: k("Queued"), RUNNING: k("Generating"), REVIEW: k("Needs review"), FAILED: k("Failed"), CANCELLED: k("Cancelled") } as Record<string, string>)[s] || s;
  // The progress stages of the classic GenerationProgress.
  const stage = submitting ? 0 : !job || job.status === "QUEUED" ? 0 : job.status === "READY" ? 3 : job.durationMs ? 2 : job.providerStartedAt ? 1 : 0;
  const stageLabels = [k("Queued · 2"), k("Generating audio"), k("Saving audio"), k("Ready to play")];

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(err((e as Error).message)); } finally { setBusy(false); }
  }
  async function save() {
    const d = await post({ action: "save", ...(project ? { id: project.id } : {}), name: name.trim() || k("Voice project"), text, language });
    setActive(d.project.id);
    await load();
    return d.project as Project;
  }
  async function generate() {
    setConfirmOpen(false);
    setSubmitting(true);
    setTab("results");
    try {
      const saved = await save();
      // A retried request reuses its key, so a lost answer never charges twice.
      const fingerprint = JSON.stringify({ projectId: saved.id, text, segment, voiceId: choice.voiceId, modelId, settings: choice.settings });
      const storageKey = `aifekr-voice-request:${saved.id}`;
      let pendingKey: { fingerprint: string; key: string } | null = null;
      try { pendingKey = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch {}
      if (!pendingKey || pendingKey.fingerprint !== fingerprint) pendingKey = { fingerprint, key: crypto.randomUUID() };
      sessionStorage.setItem(storageKey, JSON.stringify(pendingKey));
      const queued = await post({ action: "generate", projectId: saved.id, segmentIndex: segment, voiceId: choice.voiceId, modelId, idempotencyKey: pendingKey.key, settings: choice.settings });
      setGenerations((current) => [queued.generation, ...current.filter((g) => g.id !== queued.generation.id)]);
      sessionStorage.removeItem(storageKey);
      await load();
      const r = await fetch(`/api/voice-studio?project=${encodeURIComponent(saved.id)}`, { cache: "no-store" });
      if (r.ok) setGenerations((await r.json()).generations);
      toast.success(k("Queued for generation"));
    } catch (e) {
      toast.error(err((e as Error).message));
    } finally { setSubmitting(false); }
  }
  return (
    <div className="studio-page">
      <SectionTitle title={fa ? tool.fa : tool.en} subtitle={fa ? tool.description : tool.descriptionEn} />
      <VoiceStepper current={2} />
      <Notices v={v} offline={offline} />
      <div className="studio-tabs chips">
        {["prompt", "results", "history"].map((key) => <button className={tab === key ? "selected" : ""} onClick={() => setTab(key)} key={key}>{t(key as "prompt")}</button>)}
      </div>
      <div className="studio-layout">
        <section className={`panel prompt-panel mobile-${tab === "prompt" ? "show" : "hide"}`}>
          <label className="field-label">{k("Project")}</label>
          <select aria-label={k("Project")} value={project?.id || ""} onChange={(e) => setActive(e.target.value)}>
            <option value="">{k("New project")}</option>
            {data!.projects.filter((p) => !p.archivedAt || p.id === project?.id).map((p, _i, all) => <option key={p.id} value={p.id}>{projectLabel(p, all, fa)}</option>)}
          </select>
          <input aria-label={k("Project name")} placeholder={k("Project name (optional)")} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <label className="field-label">{k("Narration text")}</label>
          <textarea id="voice-narration" aria-label={k("Narration text")} rows={6} value={text} maxLength={400000} placeholder={k("Type or paste the narration here…")} onChange={(e) => { setText(e.target.value); setSegment(0); }} />
          <p className={"fine-print" + (graphemes(text) > policy.maxCharacters ? " voice-over" : "")}>
            {graphemes(text).toLocaleString(lang)} / {policy.maxCharacters.toLocaleString(lang)} {k("characters")}
            {text.trim() ? ` · ≈ ${Math.ceil(estimatedSeconds(text || " ", language)).toLocaleString(lang)} ${k("s")}` : ""}
            {segments.length > 1 ? ` · ${segments.length.toLocaleString(lang)} ${k("segments")}` : ""}
          </p>
          <div className="form-grid">
            <label>
              {fa ? "زبان" : "Language"}
              <select value={language} onChange={(e) => { setLanguage(e.target.value); setSegment(0); }}>
                {languages.map((id) => <option key={id} value={id}>{languageLabel(id)}</option>)}
              </select>
            </label>
            <label>
              {t("model")}
              <select value={modelId} onChange={(e) => { setChoice({ ...choice, modelId: e.target.value, settings: {} }); setSegment(0); }}>
                {!models.length && <option value="">—</option>}
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          </div>
          <label>
            {fa ? "صدا" : "Voice"}
            <select value={choice.voiceId} onChange={(e) => setChoice({ ...choice, voiceId: e.target.value })}>
              {!voices.length && <option value="">—</option>}
              {voices.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          {segments.length > 1 && (
            <label>
              {k("Which part to generate?")}
              <select value={segment} onChange={(e) => setSegment(Number(e.target.value))}>
                {segments.map((s, i) => <option key={i} value={i}>{(i + 1).toLocaleString(lang)} / {segments.length.toLocaleString(lang)} · {s.slice(0, 40)}…</option>)}
              </select>
            </label>
          )}
          <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>
            <Icon name="SlidersHorizontal" size={16} />
            {t("advanced")}
            <Icon name={advanced ? "ChevronUp" : "ChevronDown"} size={16} />
          </button>
          {advanced && <div className="advanced-fields"><VoiceSettings v={v} language={language} /></div>}
          {splitError && <p className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{err(splitError)}</span></p>}
          <Button variant="primary full" disabled={busy || submitting || pending || !!blockedReason || !selected} onClick={() => setConfirmOpen(true)}>
            <Icon name={submitting || pending ? "Loader2" : "AudioLines"} size={18} className={submitting || pending ? "spin" : ""} />
            {submitting ? k("Submitting…") : pending ? k("Generating…") : k("Generate audio")}
            {selected && <span>✦ {n(cost)}</span>}
          </Button>
          <p className="fine-print" role="status">
            {blockedReason && !busy && !pending ? blockedReason : k("Charged by actual duration; unused reservation is returned. Long text is split into separate segments.")} · {t("balance")}: {n(credits)}
          </p>
        </section>
        <section className={`panel studio-canvas mobile-${tab === "results" ? "show" : "hide"}`}>
          <div className="row-between">
            <h3>{k("Audio files")}</h3>
            {generations.some((g) => g.status === "READY") && !submitting && !pending && (
              // Back to the text, voice and mood with everything kept, to make another version straight away.
              <Button variant="primary" onClick={() => { setTab("prompt"); requestAnimationFrame(() => { const box = document.getElementById("voice-narration"); box?.scrollIntoView({ behavior: "smooth", block: "center" }); box?.focus(); }); }}>
                <Icon name="Plus" size={15} />{fa ? "ساخت صدای جدید" : "Make a new voice"}
              </Button>
            )}
            {generations.length > 0 && (
              <select aria-label={k("Status")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{k("All")}</option>
                {STATUSES.map((s) => <option key={s} value={s}>{statusName(s)}</option>)}
              </select>
            )}
          </div>
          {(submitting || pending) && (
            <div className="job-progress">
              <div className="big-spark thinking">✦</div>
              <h3>{submitting ? k("Submitting…") : stageLabels[stage]}</h3>
              <ol className="voice-steps">{stageLabels.map((label, i) => <li key={i} className={i <= stage ? "done" : ""}><span>{i < stage ? "✓" : n(i + 1)}</span>{label}</li>)}</ol>
              {pending && job && <p>{Math.max(0, Math.floor((now - Date.parse(job.createdAt)) / 1000)).toLocaleString(lang)} {k("seconds elapsed")}</p>}
              <span className="meter indeterminate"><i /></span>
              <small>{k("Your request is being processed. No need to submit again. You can leave and return to your library.")}</small>
            </div>
          )}
          {!generations.length && !submitting && <p className="muted">{project ? k("No audio for this project yet.") : k("Your files will appear here after the first generation.")}</p>}
          <div className="voice-generations">
            {generations.filter((g) => !statusFilter || g.status === statusFilter).map((g) => (
              <article className="generated-result" key={g.id}>
                <div className="row-between">
                  <strong>{k("Part")} {(g.segmentIndex + 1).toLocaleString(lang)}</strong>
                  <span className={"badge voice-status-" + g.status.toLowerCase()}>{statusName(g.status)}</span>
                </div>
                <small>{g.durationMs ? `${(g.durationMs / 1000).toFixed(1)} s · ` : ""}{g.chargedCredits} {k("credits")}{g.refundedCredits ? ` · ${g.refundedCredits} ${k("refunded")}` : ""}</small>
                {g.status === "REVIEW" && <p>{k("Provider outcome is uncertain. Credits are held for admin review. Do not regenerate yet.")}</p>}
                {g.errorCode && <p className="muted">{err(g.errorCode)}</p>}
                {g.status === "READY" && (
                  <>
                    <svg className="voice-wave" viewBox="0 0 400 48" role="img" aria-label={k("Actual audio waveform")}>
                      {(JSON.parse(g.waveform || "[]") as number[]).map((x, i) => <rect key={i} x={i * 5} y={24 - Math.max(1, x * 23)} width="3" height={Math.max(2, x * 46)} rx="1" />)}
                    </svg>
                    <audio key={audioVersion} controls preload="none" src={`/api/voice-studio?audio=${g.id}&v=${audioVersion}`} />
                    <div className="domain-actions">
                      <a className="btn" href={`/api/voice-studio?audio=${g.id}&download=1`}><Icon name="Download" size={15} />MP3</a>
                      <Button label={k("Refresh playback link")} onClick={() => setAudioVersion((x) => x + 1)}><Icon name="RefreshCw" size={15} /></Button>
                      <Button label={k("Delete audio")} disabled={busy} onClick={() => { if (confirm(k("Delete this audio?"))) void act(async () => { await post({ action: "deleteAudio", id: g.id }); await history(); }); }}><Icon name="Trash2" size={15} /></Button>
                    </div>
                  </>
                )}
                {g.status === "QUEUED" && <Button disabled={busy} onClick={() => void act(async () => { await post({ action: "cancel", id: g.id }); await history(); await load(); })}>{k("Cancel and release credits")}</Button>}
              </article>
            ))}
          </div>
        </section>
        <aside className={`panel studio-history mobile-${tab === "history" ? "show" : "hide"}`}>
          <h3>{t("history")}</h3>
          {data!.projects.filter((p) => !p.archivedAt).map((p) => (
            <button key={p.id} onClick={() => { setActive(p.id); setTab("prompt"); }}>
              <img src="/art/voice.svg" alt="" />
              <span>{p.name}</span>
            </button>
          ))}
          {!data!.projects.length && <p className="muted">{t("empty")}</p>}
        </aside>
      </div>
      {confirmOpen && (
        <Modal title={fa ? "آماده‌ای ایده‌ات را بسازی؟" : "Ready to bring your idea to life?"} onClose={() => setConfirmOpen(false)}>
          <p dir="auto">{selected.slice(0, 280)}{selected.length > 280 ? "…" : ""}</p>
          <dl className="cost-summary">
            <dt>{k("Voice")}</dt><dd>{voice?.name || "—"}</dd>
            <dt>{k("Approx. length")}</dt><dd>≈ {Math.ceil(estimate).toLocaleString(lang)} {k("s")}</dd>
            <dt>{k("Approx. cost")}</dt><dd>✦ {n(cost)} {t("credits")}</dd>
            <dt>{k("Maximum reservation")}</dt><dd>✦ {n(reserved)}</dd>
            <dt>{t("balance")}</dt><dd>{n(credits)}</dd>
          </dl>
          <Button variant="primary full" onClick={() => void generate()}>{t("confirm")}</Button>
        </Modal>
      )}
    </div>
  );
}

// ── Audio files ────────────────────────────────────────────────────────────
type AudioItem = { id: string; prompt: string; url: string; projectId?: string; durationMs?: number | null; createdAt: string };
function AudioFiles({ v }: { v: VoiceCtx }) {
  const { k, err, post, lang } = v;
  const [items, setItems] = useState<AudioItem[] | null>(null);
  useEffect(() => {
    fetch("/api/gallery?type=voice").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, []);
  async function remove(id: string) {
    if (!confirm(k("Delete this audio?"))) return;
    try { await post({ action: "deleteAudio", id }); setItems((prev) => prev?.filter((x) => x.id !== id) ?? prev); }
    catch (e) { toast.error(err((e as Error).message)); }
  }
  return (
    <section className="panel">
      <h2>{k("Audio files")}</h2>
      {items === null ? <div className="skeleton" /> : items.length ? (
        items.map((item) => (
          <article className="domain-card voice-audio-card" key={item.id}>
            <Icon name="AudioLines" size={24} />
            <h3 dir="auto">{item.prompt.slice(0, 120)}{item.prompt.length > 120 ? "…" : ""}</h3>
            <time>{new Date(item.createdAt).toLocaleString(lang)}{item.durationMs ? ` · ${(item.durationMs / 1000).toFixed(1)} s` : ""}</time>
            <audio controls preload="none" src={item.url} />
            <div className="domain-actions">
              <a className="btn" href={`/api/voice-studio?audio=${item.id}&download=1`}><Icon name="Download" size={15} />MP3</a>
              <Button label={k("Delete audio")} onClick={() => void remove(item.id)}><Icon name="Trash2" size={15} /></Button>
            </div>
          </article>
        ))
      ) : <Empty />}
    </section>
  );
}

/** Several projects share a default name; the list adds when each was last edited, so each option can be told apart. */
function projectLabel(p: { id: string; name: string; updatedAt?: string }, all: { name: string }[], fa: boolean) {
  if (all.filter((x) => x.name === p.name).length < 2 || !p.updatedAt) return p.name;
  return `${p.name} · ${new Date(p.updatedAt).toLocaleString(fa ? "fa-IR" : "en", { dateStyle: "short", timeStyle: "short" })}`;
}
