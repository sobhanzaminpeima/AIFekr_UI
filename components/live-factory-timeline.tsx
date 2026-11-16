"use client";
// Timeline editor for the video factory (the AICut-style editing step): a
// strip of shots sized by their time on screen, each image with its own
// narration clip underneath, drag-to-reorder across chapters, Ken Burns
// motion per shot, a browser preview that plays images and voices in order,
// and one-click sync of every shot to the length of its narration.
// Everything here edits the manifest only; saving is free and the server
// renders the film on the next production (priced in its estimate).
import { Hint } from "./factory-shell";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { timeline, type Manifest, type Shot } from "@/lib/factory";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import type { FactoryCtx } from "./live-factory";

type Media = { id: string; image: { url: string } | null; voice: { url: string } | null };
type Flat = Shot & { chapter: number; index: number; startFrame: number; durationFrames: number };

/** Four-language copy; Persian and English are the source, German and Turkish follow them. */
function useCopy() {
  const { locale } = useApp();
  return useCallback((fa: string, en: string, de: string, tr: string) => (locale === "fa" ? fa : locale === "de" ? de : locale === "tr" ? tr : en), [locale]);
}

const PAD = 0.3;
const SILENT_STILL = 3; // seconds on screen for a shot without narration // breathing room after each narration clip, in seconds
const KEN_BURNS: Shot["motion"][] = ["PUSH_IN", "PAN", "STATIC"];

/** Moves one shot to another position (possibly in another chapter); chapters never become empty. */
export function moveShot(manifest: Manifest, from: { c: number; s: number }, to: { c: number; s: number }): Manifest {
  if (from.c === to.c && from.s === to.s) return manifest;
  if (from.c !== to.c && manifest.chapters[from.c].shots.length < 2) return manifest;
  const chapters = manifest.chapters.map((c) => ({ ...c, shots: [...c.shots] }));
  const [moved] = chapters[from.c].shots.splice(from.s, 1);
  chapters[to.c].shots.splice(Math.min(to.s, chapters[to.c].shots.length), 0, moved);
  return { ...manifest, chapters };
}

export function TimelineEditor({ x, manifest, setManifest, durationSeconds, onLength }: { x: FactoryCtx; manifest: Manifest; setManifest: (m: Manifest) => void; durationSeconds: number; onLength: (seconds: number) => Promise<void> }) {
  const { n } = useApp();
  const L = useCopy();
  const { project, api, run, busy } = x;
  const [media, setMedia] = useState<Record<string, Media>>({});
  const [voiceSeconds, setVoiceSeconds] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shot images and narration clips (owner-only URLs on the factory's asset route).
  useEffect(() => {
    let live = true;
    api<{ shots: Media[] }>(`/api/video-factory/projects/${project!.id}/media`).then((d) => {
      if (!live) return;
      setMedia(Object.fromEntries((d.shots || []).map((s) => [s.id, s])));
    }).catch(() => {});
    return () => { live = false; };
  }, [api, project]);

  // Measure each narration clip in the browser (metadata only).
  useEffect(() => {
    const pending = Object.values(media).filter((m) => m.voice && voiceSeconds[m.id] === undefined);
    const probes = pending.map((m) => {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => { if (Number.isFinite(a.duration) && a.duration > 0) setVoiceSeconds((v) => ({ ...v, [m.id]: a.duration })); };
      a.src = m.voice!.url;
      return a;
    });
    return () => probes.forEach((a) => { a.onloadedmetadata = null; a.src = ""; });
  }, [media]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = useMemo(() => timeline(manifest, durationSeconds), [manifest, durationSeconds]);
  const flat: Flat[] = useMemo(() => {
    const byId = new Map(edit.shots.map((s) => [s.id, s]));
    return manifest.chapters.flatMap((c, ci) => c.shots.map((s, si) => ({ ...s, chapter: ci, index: si, startFrame: byId.get(s.id)?.startFrame ?? 0, durationFrames: byId.get(s.id)?.durationFrames ?? 24 })));
  }, [manifest, edit]);
  const voiced = flat.filter((s) => voiceSeconds[s.id]);
  const narrationTotal = voiced.reduce((t, s) => t + voiceSeconds[s.id] + PAD, 0);
  const current = flat.find((s) => s.id === selected) ?? null;

  const patch = (id: string, change: Partial<Shot>) => setManifest({ ...manifest, chapters: manifest.chapters.map((c) => ({ ...c, shots: c.shots.map((s) => (s.id === id ? { ...s, ...change } : s)) })) });

  /** Each voiced shot gets exactly its narration length; silent shots keep their weight. */
  const fitted = (id: string) => Math.min(600, Math.round((voiceSeconds[id] + PAD) * 10) / 10);
  /** Silent shots without a set time get a default still of a few seconds. */
  const fitToNarration = () => setManifest({ ...manifest, chapters: manifest.chapters.map((c) => ({ ...c, shots: c.shots.map((s) => (voiceSeconds[s.id] ? { ...s, durationSeconds: fitted(s.id) } : s.durationSeconds ? s : { ...s, durationSeconds: SILENT_STILL })) })) });
  const synced = voiced.length > 0 && voiced.every((s) => Math.abs((s.durationSeconds || 0) - fitted(s.id)) < 0.15);
  const weightTotal = flat.reduce((t, s) => t + (s.durationSeconds || 1), 0);
  const suggestedLength = Math.max(15, Math.min(3600, Math.ceil(weightTotal)));

  // Preview: show each shot for its slot and play its narration.
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    audio.current?.pause();
    setPlaying(null);
  }, []);
  const playFrom = useCallback((i: number) => {
    if (timer.current) clearTimeout(timer.current);
    audio.current?.pause();
    if (i >= flat.length) { setPlaying(null); return; }
    const shot = flat[i];
    setPlaying(i);
    setSelected(shot.id);
    const voice = media[shot.id]?.voice;
    if (voice) {
      const a = audio.current ?? (audio.current = new Audio());
      a.src = voice.url;
      // Mirror the server: narration is never slowed; a longer clip is sped up (at most 2x).
      a.playbackRate = Math.min(2, Math.max(1, (voiceSeconds[shot.id] || 0) / (shot.durationFrames / 24)));
      void a.play().catch(() => {});
    }
    timer.current = setTimeout(() => playFrom(i + 1), (shot.durationFrames / 24) * 1000);
  }, [flat, media, voiceSeconds]);
  useEffect(() => stop, [stop]);

  const drop = (target: Flat) => {
    const source = flat.find((s) => s.id === dragged);
    setDragged(null);
    if (!source) return;
    setManifest(moveShot(manifest, { c: source.chapter, s: source.index }, { c: target.chapter, s: target.index }));
  };
  const shift = (shot: Flat, delta: -1 | 1) => {
    const i = flat.findIndex((s) => s.id === shot.id), target = flat[i + delta];
    if (target) setManifest(moveShot(manifest, { c: shot.chapter, s: shot.index }, { c: target.chapter, s: target.index }));
  };
  const clock = (seconds: number) => `${n(Math.floor(seconds / 60))}:${String(Math.floor(seconds % 60)).padStart(2, "0").replace(/\d/g, (d) => n(+d))}`;
  const stage = playing !== null ? flat[playing] : current ?? flat[0];
  const stageImage = stage ? media[stage.id]?.image?.url : undefined;

  return (
    <section className="vf-timeline" aria-label={L("تایم‌لاین ویدیو", "Video timeline", "Video-Zeitleiste", "Video zaman çizelgesi")}>
      <div className="vf-tl-head">
        <h2>{L("تایم‌لاین و پیش‌نمایش", "Timeline & preview", "Zeitleiste & Vorschau", "Zaman çizelgesi ve önizleme")} <Hint text={L("ترتیب را با کشیدن عوض کن، زمان هر نما را تنظیم کن و قبل از رندر پیش‌نمایش را ببین. ذخیره رایگان است.",
          "Drag to reorder, set each shot's time and preview before rendering. Saving is free.",
          "Ziehen zum Umordnen, Dauer je Einstellung festlegen und vor dem Rendern ansehen. Speichern ist kostenlos.",
          "Sıralamak için sürükleyin, her sahnenin süresini ayarlayın ve render öncesi önizleyin. Kaydetmek ücretsizdir.")} /></h2>
      </div>

      <div className="vf-tl-body">
        <div className={`vf-stage ratio-${(project && JSON.parse(String(project.configuration || "{}")).ratio === "9:16") ? "portrait" : "landscape"}`}>
          {stage && (stageImage
            ? <img key={`${stage.id}-${playing}`} src={stageImage} alt={stage.title} className={`kb-${(stage.motion || "PUSH_IN").toLowerCase()}`} style={{ animationDuration: `${stage.durationFrames / 24}s` }} />
            : <div className="vf-stage-empty"><Icon name="Image" size={28} /><span>{stage.title}</span></div>)}
          {stage && stage.narration && <p className="vf-stage-caption">{stage.narration}</p>}
          <div className="vf-stage-bar">
            {playing === null
              ? <Button variant="primary" disabled={!flat.length} onClick={() => playFrom(stage ? Math.max(0, flat.findIndex((s) => s.id === stage.id)) : 0)}><Icon name="Play" size={16} />{L("پخش", "Play", "Abspielen", "Oynat")}</Button>
              : <Button onClick={stop}><Icon name="Pause" size={16} />{L("توقف", "Pause", "Pause", "Duraklat")}</Button>}
            <span className="vf-clock">{stage ? clock(stage.startFrame / 24) : clock(0)} / {clock(durationSeconds)}</span>
          </div>
        </div>

        <aside className="vf-inspector">
          {current ? (
            <>
              <h3>{n(flat.indexOf(current) + 1)}. {current.title}</h3>
              <label>{L("زمان روی صفحه (ثانیه)", "Time on screen (seconds)", "Dauer im Bild (Sekunden)", "Ekran süresi (saniye)")}
                <input type="range" min="0.5" max="60" step="0.5" value={current.durationSeconds || 1} onChange={(e) => patch(current.id, { durationSeconds: +e.target.value })} />
                <small>{n(current.durationSeconds || 1)} · {L("در فیلم", "in film", "im Film", "filmde")} {n(Math.round(current.durationFrames / 24 * 10) / 10)}s</small>
              </label>
              <label>{L("حرکت تصویر (کن برنز)", "Image motion (Ken Burns)", "Bildbewegung (Ken Burns)", "Görüntü hareketi (Ken Burns)")}
                <select value={current.motion} onChange={(e) => patch(current.id, { motion: e.target.value as Shot["motion"] })}>
                  {(KEN_BURNS.includes(current.motion) ? KEN_BURNS : [current.motion, ...KEN_BURNS]).map((m) => <option key={m} value={m}>{m === "PUSH_IN" ? L("زوم آرام", "Slow zoom", "Langsamer Zoom", "Yavaş zoom") : m === "PAN" ? L("حرکت افقی", "Pan", "Schwenk", "Kaydırma") : m === "STATIC" ? L("ثابت", "Still", "Standbild", "Sabit") : m}</option>)}
                </select>
              </label>
              <div className="vf-narration">
                <strong>{L("متن روایت این نما", "This shot's narration", "Sprechertext dieser Einstellung", "Bu sahnenin anlatımı")}</strong>
                <p>{current.narration || "—"}</p>
                {voiceSeconds[current.id] !== undefined
                  ? <small>{L("صدای ساخته‌شده", "Generated voice", "Erzeugte Stimme", "Üretilen ses")}: {n(Math.round(voiceSeconds[current.id] * 10) / 10)}s</small>
                  : <small>{L("هنوز صدایی برای این نما ساخته نشده.", "No voice generated for this shot yet.", "Für diese Einstellung gibt es noch keine Stimme.", "Bu sahne için henüz ses üretilmedi.")}</small>}
              </div>
            </>
          ) : <p>{L("یک نما را در تایم‌لاین انتخاب کن.", "Select a shot on the timeline.", "Wähle eine Einstellung in der Zeitleiste.", "Zaman çizelgesinden bir sahne seçin.")}</p>}
        </aside>
      </div>

      <div className="vf-sync">
        <span>
          {voiced.length
            ? L(`صدای ${n(voiced.length)} نما: ${clock(narrationTotal)} · طول ویدیو: ${clock(durationSeconds)}`, `Narration on ${voiced.length} shots: ${clock(narrationTotal)} · video length: ${clock(durationSeconds)}`, `Sprecher in ${voiced.length} Einstellungen: ${clock(narrationTotal)} · Videolänge: ${clock(durationSeconds)}`, `${voiced.length} sahnede anlatım: ${clock(narrationTotal)} · video süresi: ${clock(durationSeconds)}`)
            : L("بعد از ساخت صدا، می‌توانی هر نما را با طول صدایش هم‌زمان کنی.", "Once narration is generated, you can sync every shot to its voice.", "Sobald Sprecher erzeugt ist, kannst du jede Einstellung an ihre Stimme anpassen.", "Anlatım üretildikten sonra her sahneyi sesine eşitleyebilirsiniz.")}
        </span>
        <Button disabled={busy || !voiced.length} onClick={fitToNarration}><Icon name="AudioLines" size={16} />{L("هم‌زمانی نماها با صدا", "Sync shots to narration", "An Sprecher anpassen", "Sahneleri anlatıma eşitle")}</Button>
        {synced && Math.abs(suggestedLength - durationSeconds) > 2 && (
          <Button disabled={busy} onClick={() => run(() => onLength(suggestedLength))}>{L(`طول ویدیو = ${clock(suggestedLength)}`, `Set video length to ${clock(suggestedLength)}`, `Videolänge auf ${clock(suggestedLength)}`, `Video süresini ${clock(suggestedLength)} yap`)}</Button>
        )}
      </div>

      <div className="vf-strip" role="list">
        {flat.map((shot, i) => {
          const slot = shot.durationFrames / 24, voice = voiceSeconds[shot.id], ratio = voice ? voice / slot : 0;
          return (
            <div key={shot.id} role="listitem" draggable tabIndex={0}
              className={`vf-clip${selected === shot.id ? " selected" : ""}${playing === i ? " playing" : ""}${dragged === shot.id ? " dragging" : ""}`}
              style={{ flexGrow: Math.max(1, slot), minWidth: `${Math.max(76, Math.min(220, slot * 14))}px` }}
              onClick={() => setSelected(shot.id)}
              onKeyDown={(e) => { if (e.key === "Enter") setSelected(shot.id); if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); shift(shot, (e.key === "ArrowRight") === (document.dir !== "rtl") ? 1 : -1); } }}
              onDragStart={(e) => { setDragged(shot.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", shot.id); }}
              onDragEnd={() => setDragged(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); drop(shot); }}>
              <div className="vf-thumb" style={media[shot.id]?.image ? { backgroundImage: `url("${media[shot.id]!.image!.url}")` } : undefined}>
                {!media[shot.id]?.image && <Icon name="Image" size={18} />}
                <span className="vf-clip-no">{n(i + 1)}</span>
              </div>
              <span className="vf-clip-title">{shot.title}</span>
              <div className={`vf-voice${!voice ? " none" : ratio > 1.05 ? " fast" : ""}`} title={voice ? `${Math.round(voice * 10) / 10}s / ${Math.round(slot * 10) / 10}s` : ""}>
                <i style={{ width: `${voice ? Math.min(100, ratio * 100) : 0}%` }} />
              </div>
              <small>{n(Math.round(slot * 10) / 10)}s{voice && ratio > 1.05 ? ` · ×${n(Math.round(Math.min(2, ratio) * 100) / 100)}` : ""}</small>
              <div className="vf-clip-move">
                <button type="button" aria-label={L("قبلی", "Earlier", "Früher", "Önceki")} disabled={i === 0} onClick={(e) => { e.stopPropagation(); shift(shot, -1); }}><Icon name="ChevronLeft" size={14} /></button>
                <button type="button" aria-label={L("بعدی", "Later", "Später", "Sonraki")} disabled={i === flat.length - 1} onClick={(e) => { e.stopPropagation(); shift(shot, 1); }}><Icon name="ChevronRight" size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <details className="reference-shot-list" open>
        <summary>{L("مدیریت نماها", "Manage shots", "Einstellungen verwalten", "Sahneleri yönet")} ({n(flat.length)})</summary>
        {flat.map((shot,i)=><button type="button" aria-pressed={current?.id===shot.id} key={shot.id} onClick={()=>setSelected(shot.id)}>
          {media[shot.id]?.image?.url && <img src={media[shot.id]!.image!.url} alt="" loading="lazy"/>}
          <strong>{n(i+1)}. {shot.title}</strong><span dir="auto">{shot.narration}</span><time>{clock(shot.durationFrames/24)}</time>
        </button>)}
      </details>
      <p className="vf-legend">
        <span><i className="ok" />{L("صدا در زمان نما جا می‌شود", "Voice fits the shot", "Stimme passt", "Ses sahneye sığıyor")}</span>
        <span><i className="fast" />{L("صدا بلندتر است و سریع‌تر پخش می‌شود", "Voice is longer and will be sped up", "Stimme ist länger und wird beschleunigt", "Ses daha uzun, hızlandırılacak")}</span>
      </p>
    </section>
  );
}
