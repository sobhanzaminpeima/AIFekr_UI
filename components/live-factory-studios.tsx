"use client";
// The video factory's project studios in the design's production-workspace.tsx
// layouts, on the real studios (main site components/video-factory/
// ProjectStudios and AdvancedStudio): sources and script intake, the
// character bible, shot timing, the private asset library, YouTube publishing
// and the audio & quality settings.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { configOf, manifestOf, timeline, type Configuration, type Manifest, type Shot } from "@/lib/factory";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";
import { ErrorBanner, type FactoryCtx } from "./live-factory";

type Asset = { id: string; projectId: string; name: string; kind: string; mimeType: string; bytes: number; provenance: string; expiresAt: string };
type Publication = { id: string; status: string; scheduledAt: string; providerId: string | null; errorCode: string | null };

/** Saves the manifest (and optionally the style bible) as a new version, free of charge. */
async function saveManifest(x: FactoryCtx, manifest: Manifest, styleBible?: string) {
  const p = x.project!;
  await x.api(`/api/video-factory/projects/${p.id}`, { action: "edit", expectedVersion: p.version, manifest, ...(styleBible !== undefined ? { configuration: { ...configOf(p), styleBible } } : {}) });
  await x.refresh(p.id);
}
function useAssets(x: FactoryCtx, search = "") {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const id = x.project!.id;
  const load = useCallback(async () => {
    const d = await x.api<{ assets: Asset[] }>(`/api/video-factory/assets?projectId=${id}&q=${encodeURIComponent(search)}`);
    setAssets(d.assets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, x.api]);
  useEffect(() => { load().catch(() => setAssets([])); }, [load]);
  return { assets, load };
}

// ── Ideas & sources ────────────────────────────────────────────────────────
export function IdeasStudio({ x }: { x: FactoryCtx }) {
  const { fa } = useApp();
  const { f, project, api, run, busy, refresh } = x;
  const [script, setScript] = useState(project!.brief);
  const [url, setUrl] = useState("");
  useEffect(() => setScript(project!.brief), [project]);
  const sources = (() => { try { return JSON.parse(project!.research || "[]") as { url: string; title: string; excerpt: string }[]; } catch { return []; } })();
  const plan = (() => {
    try { return project!.planning && project!.planning !== "{}" ? JSON.parse(project!.planning) as { titles: string[]; hooks: string[]; outline: string[]; audienceStrategy: string; evidence: { sourceUrl: string; claim: string; quote: string }[]; uncertainties: string[] } : null; } catch { return null; }
  })();
  return (
    <div className="production-ideas">
      <div className="panel">
        <span className="eyebrow">AIFekr / STORY SEED</span>
        <h2>{f("Idea lab & sources")}</h2>
        <p>{f("Import sources before starting. Optional AI ideation runs inside the approved production budget.")}</p>
        <h3>{f("Existing script or text file")}</h3>
        <label className="file-drop"><Icon name="Upload" />{f("TXT file")}
          <input type="file" accept=".txt,text/plain" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(async () => { if (file.size > 100000) throw new Error("SCRIPT_TOO_LARGE"); setScript((await file.text()).slice(0, 30000)); }); }} />
        </label>
        <label>{f("Project script")}<textarea rows={9} maxLength={30000} value={script} onChange={(e) => setScript(e.target.value)} /></label>
        <Button variant="primary" disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}/intake`, { action: "script", text: script }); await refresh(project!.id); toast.success(f("Save script · no charge")); })}>{f("Save script · no charge")}</Button>
        <form className="factory-inline-form" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api(`/api/video-factory/projects/${project!.id}/intake`, { action: "article", url }); setUrl(""); await refresh(project!.id); }); }}>
          <label>{f("Article URL")}<input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} /></label>
          <Button type="submit" disabled={busy}>{f("Import source · no AI charge")}</Button>
        </form>
      </div>
      <aside className="panel">
        <Icon name="Film" size={40} />
        <h3>{fa ? "راهنمای شرح پروژه" : "Project brief checklist"}</h3>
        {(fa ? ["مخاطب و نتیجه مورد انتظار", "لحن و مدت تقریبی", "شخصیت‌ها و مکان‌ها", "منابع و محدودیت‌ها"] : ["Audience and desired outcome", "Tone and approximate duration", "Characters and locations", "Sources and constraints"]).map((a, i) => <p className="domain-card" key={a}>0{i + 1} · {a}</p>)}
        {sources.map((s) => (
          <article className="domain-card" key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
            <p>{s.excerpt.slice(0, 500)}</p>
          </article>
        ))}
        {plan && (
          <div className="factory-plan">
            <h3>{f("Suggested titles & hooks")}</h3>
            <ul>{[...plan.titles, ...plan.hooks].map((v, i) => <li key={i}>{v}</li>)}</ul>
            <p>{plan.audienceStrategy}</p>
            <ol>{plan.outline.map((v, i) => <li key={i}>{v}</li>)}</ol>
            {plan.evidence.map((v, i) => <blockquote key={i}><p>{v.claim}</p><a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">{v.sourceUrl}</a><p>{v.quote}</p></blockquote>)}
            {plan.uncertainties.length > 0 && <p>{f("Needs review:")} {plan.uncertainties.join(" · ")}</p>}
          </div>
        )}
        <a className="btn" href="/video-factory?tab=production">{fa ? "ادامه در تولید" : "Continue to production"}</a>
      </aside>
    </div>
  );
}

// ── Characters & continuity ────────────────────────────────────────────────
export function CharactersStudio({ x }: { x: FactoryCtx }) {
  const { f, project, run, busy } = x;
  const [manifest, setManifest] = useState<Manifest | null>(manifestOf(project!));
  const [styleBible, setStyleBible] = useState(configOf(project!).styleBible);
  useEffect(() => { setManifest(manifestOf(project!)); setStyleBible(configOf(project!).styleBible); }, [project]);
  return (
    <section className="panel">
      <h2>{f("Character & continuity bible")}</h2>
      {manifest ? (
        <>
          <label>{f("Style & location bible")}<textarea rows={5} maxLength={6000} value={styleBible} onChange={(e) => setStyleBible(e.target.value)} /></label>
          {manifest.characters.map((c, index) => (
            <article className="domain-card factory-character" key={index}>
              <div className="domain-fields">
                <label>{f("Character name")}<input maxLength={100} value={c.name} onChange={(e) => setManifest({ ...manifest, characters: manifest.characters.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)) })} /></label>
                <label>{f("Appearance, wardrobe, setting & continuity")}<textarea maxLength={2000} value={c.description} onChange={(e) => setManifest({ ...manifest, characters: manifest.characters.map((v, i) => (i === index ? { ...v, description: e.target.value } : v)) })} /></label>
              </div>
              <Button disabled={busy} onClick={() => setManifest({ ...manifest, characters: manifest.characters.filter((_, i) => i !== index) })}>{f("Remove")}</Button>
            </article>
          ))}
          <div className="domain-actions">
            <Button disabled={busy || manifest.characters.length >= 30} onClick={() => setManifest({ ...manifest, characters: [...manifest.characters, { name: "", description: "" }] })}><Icon name="Plus" size={16} />{f("Add character")}</Button>
            <Button variant="primary" disabled={busy} onClick={() => run(async () => { await saveManifest(x, manifest, styleBible); toast.success(f("Save bible · no charge")); })}>{f("Save bible · no charge")}</Button>
          </div>
          <p className="fine-print">{f("This bible guides textual and visual consistency. Voice cloning and verified identity likeness are not provided by this form.")}</p>
        </>
      ) : <p>{f("Generate the script and shots first.")}</p>}
    </section>
  );
}

// ── Edit shots (timing, order, motion, data) ───────────────────────────────
export function EditStudio({ x }: { x: FactoryCtx }) {
  const { fa, n } = useApp();
  const { f, project, run, busy } = x;
  const config = configOf(project!);
  const [manifest, setManifest] = useState<Manifest | null>(manifestOf(project!));
  const { assets } = useAssets(x);
  useEffect(() => setManifest(manifestOf(project!)), [project]);
  if (!manifest) return <><h1>{fa ? "صحنه‌به‌صحنه، داستان را ببین." : "See the story, scene by scene."}</h1><p>{f("Generate the script and shots first.")}</p></>;
  const allShots = manifest.chapters.flatMap((c) => c.shots).length;
  const setShots = (ci: number, shots: Shot[]) => setManifest({ ...manifest, chapters: manifest.chapters.map((c, i) => (i === ci ? { ...c, shots } : c)) });
  const update = (ci: number, si: number, patch: Partial<Shot>) => setShots(ci, manifest.chapters[ci].shots.map((s, j) => (j === si ? { ...s, ...patch } : s)));
  const move = (ci: number, si: number, delta: number) => { const copy = [...manifest.chapters[ci].shots]; [copy[si], copy[si + delta]] = [copy[si + delta], copy[si]]; setShots(ci, copy); };
  return (
    <>
      <h1>{f("Edit shot timing & order")}</h1>
      <p>{f("Times are relative weights within the film duration. Unchanged shots are reused on the next production; review the estimate before starting.")}</p>
      {manifest.chapters.map((chapter, ci) => (
        <section className="factory-chapter" key={ci}>
          <label>{f("Chapter title")}<input maxLength={180} value={chapter.title} onChange={(e) => setManifest({ ...manifest, chapters: manifest.chapters.map((c, i) => (i === ci ? { ...c, title: e.target.value } : c)) })} /></label>
          <div className="storyboard-grid">
            {chapter.shots.map((shot, si) => (
              <article className="panel storyboard-card" key={shot.id} draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", `${ci}:${si}`)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const [fromChapter, from] = e.dataTransfer.getData("text/plain").split(":").map(Number); if (fromChapter === ci && Number.isInteger(from) && from >= 0 && from < chapter.shots.length) { const copy = [...chapter.shots]; const [moved] = copy.splice(from, 1); copy.splice(si, 0, moved); setShots(ci, copy); } }}>
                <div className="row-between">
                  <h3>{n(si + 1)}. {shot.title}</h3>
                  <div>
                    <Button label={f("Move up")} disabled={si === 0} onClick={() => move(ci, si, -1)}><Icon name="ChevronUp" size={15} /></Button>
                    <Button label={f("Move down")} disabled={si === chapter.shots.length - 1} onClick={() => move(ci, si, 1)}><Icon name="ChevronDown" size={15} /></Button>
                  </div>
                </div>
                <label>{f("Timing weight (seconds)")}<input type="number" step="0.5" min="0.5" max="600" value={shot.durationSeconds || config.durationSeconds / allShots} onChange={(e) => update(ci, si, { durationSeconds: +e.target.value })} /></label>
                <label>{f("Image motion")}<select value={shot.motion} onChange={(e) => update(ci, si, { motion: e.target.value as Shot["motion"] })}>{["STATIC", "PUSH_IN", "PAN", "TITLE", "CHART", "MAP"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label>{f("Library image or video (optional)")}<select value={shot.assetId || ""} onChange={(e) => update(ci, si, { assetId: e.target.value || undefined })}>
                  <option value="">{f("Generate from plan")}</option>
                  {(assets ?? []).filter((a) => a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/")).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></label>
                {shot.motion === "CHART" && (
                  <label>{f("Chart data: label, value; one per line")}<textarea rows={5} defaultValue={shot.chart ? shot.chart.labels.map((l, i) => `${l},${shot.chart!.values[i]}`).join("\n") : ""} onChange={(e) => {
                    const rows = e.target.value.split("\n").slice(0, 10).map((line) => line.split(",")).filter((r) => r[0]?.trim() && Number.isFinite(Number(r[1])) && Number(r[1]) >= 0);
                    update(ci, si, { chart: rows.length ? { labels: rows.map((r) => r[0].trim().slice(0, 60)), values: rows.map((r) => Number(r[1])), unit: shot.chart?.unit || "" } : undefined });
                  }} /></label>
                )}
                {shot.motion === "MAP" && (
                  <label>{f("Map locations: label, latitude, longitude")}<textarea rows={5} defaultValue={shot.map ? shot.map.locations.map((p) => `${p.label},${p.latitude},${p.longitude}`).join("\n") : ""} onChange={(e) => {
                    const rows = e.target.value.split("\n").slice(0, 10).map((line) => line.split(",")).filter((r) => r[0]?.trim() && Number.isFinite(Number(r[1])) && Number.isFinite(Number(r[2])) && Math.abs(Number(r[1])) <= 90 && Math.abs(Number(r[2])) <= 180);
                    update(ci, si, { map: rows.length ? { locations: rows.map((r) => ({ label: r[0].trim().slice(0, 60), latitude: Number(r[1]), longitude: Number(r[2]) })) } : undefined });
                  }} /></label>
                )}
                <div className="domain-actions">
                  <Button disabled={busy} onClick={() => update(ci, si, { revision: (shot.revision || 0) + 1, assetId: undefined })}>{f("Mark for regeneration · priced in next estimate")}</Button>
                  <span className="badge">{f("Shot revision")} {n(shot.revision || 0)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      <div className="domain-actions">
        <Button variant="primary" disabled={busy} onClick={() => run(async () => { await saveManifest(x, manifest); toast.success(f("Save timeline · no charge")); })}>{f("Save timeline · no charge")}</Button>
        <small>{n(timeline(manifest, config.durationSeconds).totalFrames)} {f("frames")}</small>
      </div>
    </>
  );
}

// ── Asset library ──────────────────────────────────────────────────────────
export function LibraryStudio({ x }: { x: FactoryCtx }) {
  const { n } = useApp();
  const { f, project, api, run, busy } = x;
  const [search, setSearch] = useState("");
  const [rights, setRights] = useState(false);
  const { assets, load } = useAssets(x, search);
  return (
    <>
      <section className="panel production-library-upload">
        <span className="icon-chip orange"><Icon name="Upload" size={36} /></span>
        <h2>{f("Private asset library")}</h2>
        <label className="check-label"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />{f("I hold usage rights and consent from people represented in the file.")}</label>
        <label>{f("Upload image, video or audio")}
          <input disabled={busy || !rights} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav" onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(async () => {
              const form = new FormData();
              form.set("file", file); form.set("projectId", project!.id); form.set("rightsConfirmed", "true");
              const r = await fetch("/api/video-factory/assets", { method: "POST", body: form });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(d.code || "UPLOAD_FAILED");
              await load();
            });
          }} />
        </label>
      </section>
      <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); void run(load); }}>
        <input aria-label={f("Search")} placeholder={f("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" disabled={busy}>{f("Search")}</Button>
      </form>
      {assets === null ? <div className="skeleton" /> : assets.length ? (
        <div className="tool-grid">
          {assets.map((a) => (
            <article className="panel production-asset-card" key={a.id}>
              {a.mimeType.startsWith("image/") ? <img className="factory-asset-media" src={`/api/video-factory/assets/${a.id}`} alt={a.name} />
                : a.mimeType.startsWith("video/") ? <video className="factory-asset-media" controls preload="metadata" src={`/api/video-factory/assets/${a.id}`} />
                : a.mimeType.startsWith("audio/") ? <audio controls preload="metadata" src={`/api/video-factory/assets/${a.id}`} />
                : <Icon name="Paperclip" size={34} />}
              <h3>{a.name}</h3>
              <p>{a.kind} · {n(Number((a.bytes / 1000000).toFixed(1)))} MB</p>
              <details><summary>{f("Provenance & rights")}</summary><pre className="factory-json">{(() => { try { return JSON.stringify(JSON.parse(a.provenance), null, 2); } catch { return a.provenance; } })()}</pre></details>
              <Button disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/assets/${a.id}`, {}, "DELETE"); await load(); })}>{f("Delete asset")}</Button>
            </article>
          ))}
        </div>
      ) : <><Empty /><p className="muted">{f("No assets yet.")}</p></>}
    </>
  );
}

// ── Publishing ─────────────────────────────────────────────────────────────
export function PublishingStudio({ x }: { x: FactoryCtx }) {
  const { f, project, api, run, busy, lang, job } = x;
  const [channel, setChannel] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [error, setError] = useState("");
  const initial = () => { try { return project!.publishing && project!.publishing !== "{}" ? JSON.parse(project!.publishing) : null; } catch { return null; } };
  const [metadata, setMetadata] = useState<{ title: string; description: string; privacy: string; madeForKids: boolean; tags: string[] }>(() => initial() ?? { title: project!.title.slice(0, 100), description: "", privacy: "private", madeForKids: false, tags: [] });
  const [consent, setConsent] = useState(false);
  const [when, setWhen] = useState("");
  const load = useCallback(async () => {
    const d = await api<{ channel: { connected: boolean; configured: boolean }; jobs: Publication[] }>(`/api/video-factory/projects/${project!.id}/publishing`);
    setChannel(d.channel); setPublications(d.jobs);
  }, [api, project]);
  useEffect(() => { load().catch((e: Error) => setError(e.message)); }, [load]);
  const video = job?.artifacts?.find((a) => a.kind === "video");
  return (
    <div className="production-publishing">
      <form className="panel" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api(`/api/video-factory/projects/${project!.id}/publishing`, { action: "metadata", value: metadata }); await x.refresh(project!.id); toast.success(f("Save metadata · does not publish")); }); }}>
        <h2>{f("Publishing workspace")}</h2>
        <p>{f("Publishing requires a connected YouTube account, administrator enablement and your explicit authorization.")}</p>
        {error && <ErrorBanner text={x.err(error)} />}
        {channel?.connected ? <Button disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}/publishing`, { action: "disconnect" }); await load(); })}>{f("Disconnect YouTube")}</Button>
          : channel?.configured ? <a className="btn" href="/api/video-factory/youtube/connect"><Icon name="Youtube" size={16} />{f("Connect YouTube securely")}</a>
          : channel && <p className="fine-print">{f("YouTube OAuth has not been configured by the administrator.")}</p>}
        <div className="domain-fields">
          <label>{f("Publication title")}<input required maxLength={100} value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} /></label>
          <label>{f("Visibility")}<select value={metadata.privacy} onChange={(e) => setMetadata({ ...metadata, privacy: e.target.value })}><option value="private">{f("Private")}</option><option value="unlisted">{f("Unlisted")}</option><option value="public">{f("Public")}</option></select></label>
        </div>
        <label>{f("Description & chapters")}<textarea rows={6} maxLength={5000} value={metadata.description} onChange={(e) => setMetadata({ ...metadata, description: e.target.value })} /></label>
        <label className="check-label"><input type="checkbox" checked={metadata.madeForKids} onChange={(e) => setMetadata({ ...metadata, madeForKids: e.target.checked })} />{f("Made for kids")}</label>
        <Button type="submit" disabled={busy}>{f("Save metadata · does not publish")}</Button>
      </form>
      <section className="panel">
        <label>{f("Publish time in your device timezone")}<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{f("I hold publishing rights and authorize publication of this output with the settings above.")}</label>
        <Button variant="primary" disabled={busy || !channel?.connected || !consent || !when || !video} onClick={() => run(async () => {
          await api(`/api/video-factory/projects/${project!.id}/publishing`, { action: "schedule", value: { artifactId: video!.id, idempotencyKey: crypto.randomUUID(), scheduledAt: new Date(when).toISOString(), metadata, authorized: true, rightsConfirmed: true } });
          setConsent(false);
          await load();
        })}>{f("Authorize & schedule publication")}</Button>
        {publications.length ? publications.map((p) => (
          <article className="domain-card" key={p.id}>
            <span className="badge">YouTube · {p.status}</span>
            <p>{new Date(p.scheduledAt).toLocaleString(lang)}</p>
            {p.errorCode && <p className="muted">{p.errorCode}</p>}
            {p.providerId && <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(p.providerId)}`} target="_blank" rel="noopener noreferrer">{f("View video")}</a>}
            {p.status === "SCHEDULED" && <Button disabled={busy} onClick={() => run(async () => { await api(`/api/video-factory/projects/${project!.id}/publishing`, { action: "cancel", jobId: p.id }); await load(); })}>{f("Cancel scheduled publication")}</Button>}
          </article>
        )) : <Empty />}
      </section>
    </div>
  );
}

// ── Audio & quality ────────────────────────────────────────────────────────
export function AdvancedStudio({ x }: { x: FactoryCtx }) {
  const { f, project, api, run, busy, refresh } = x;
  const id = project!.id;
  const [config, setConfig] = useState<Configuration>(() => configOf(project!));
  const [audio, setAudio] = useState<{ id: string; name: string; mimeType: string }[]>([]);
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; shotId: string | null; kind: string; status: string; findings: string }[]>([]);
  const [sample, setSample] = useState(""), [name, setName] = useState(""), [statement, setStatement] = useState("");
  const [consent, setConsent] = useState(false), [removeRemote, setRemoveRemote] = useState(false);
  const [lexicon, setLexicon] = useState(() => configOf(project!).pronunciation.map((p) => `${p.word}=${p.replacement}`).join("\n"));
  const load = useCallback(async () => {
    const [a, v, q] = await Promise.all([
      api<{ assets: { id: string; name: string; mimeType: string }[] }>(`/api/video-factory/assets?projectId=${id}`),
      api<{ voices: { id: string; name: string }[] }>(`/api/video-factory/voices?projectId=${id}`),
      api<{ reports: typeof reports }>(`/api/video-factory/projects/${id}/quality`),
    ]);
    setAudio(a.assets.filter((x) => x.mimeType.startsWith("audio/")));
    setVoices(v.voices);
    setReports(q.reports);
  }, [api, id]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const change = (patch: Partial<Configuration>) => setConfig({ ...config, ...patch });
  const choices = <><option value="">{f("Choose private audio")}</option>{audio.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</>;
  return (
    <form className="panel factory-form" onSubmit={(e) => {
      e.preventDefault();
      void run(async () => {
        const pronunciation = lexicon.split("\n").filter((v) => v.trim()).map((line) => { const at = line.indexOf("="); return { word: line.slice(0, at).trim(), replacement: at < 0 ? "" : line.slice(at + 1).trim() }; });
        await api(`/api/video-factory/projects/${id}`, { action: "configuration", expectedVersion: project!.version, configuration: { ...config, mediaMode: "MULTIMEDIA", pronunciation } });
        await refresh(id);
        toast.success(f("Save settings · no charge"));
      });
    }}>
      <h2>{f("Audio & semantic review studio")}</h2>
      <p>{f("Saving settings is free. Voice generation and analysis run only after estimate and budget approval.")}</p>
      <fieldset className="factory-fieldset">
        <legend>{f("Consented personal voice")}</legend>
        <p className="fine-print">{f("Select your own voice sample you have rights to use. Revocation blocks future use; it does not erase past outputs from an external service.")}</p>
        <div className="domain-fields">
          <label>{f("Voice name")}<input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>{f("Scanned audio sample")}<select value={sample} onChange={(e) => setSample(e.target.value)}>{choices}</select></label>
        </div>
        <label>{f("Consent statement")}<textarea minLength={20} maxLength={2000} value={statement} onChange={(e) => setStatement(e.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{f("This is my voice; I hold the rights and consent to sending this sample for cloning and narration in this project.")}</label>
        <Button disabled={busy || !consent || !sample || name.length < 2 || statement.length < 20} onClick={() => run(async () => {
          const v = await api<{ id: string }>("/api/video-factory/voices", { action: "consent", value: { projectId: id, sampleAssetId: sample, name, statement, ownVoice: true, rightsConfirmed: true, processingConsent: true } });
          change({ voiceProfileId: v.id }); setConsent(false); await load();
        })}>{f("Record consent · no generation")}</Button>
        <label>{f("Project voice")}<select value={config.voiceProfileId} onChange={(e) => change({ voiceProfileId: e.target.value })}><option value="">{f("Provider default voice")}</option>{voices.map((v) => <option value={v.id} key={v.id}>{v.name}</option>)}</select></label>
        {config.voiceProfileId && (
          <>
            <label className="check-label"><input type="checkbox" checked={removeRemote} onChange={(e) => setRemoveRemote(e.target.checked)} />{f("When revoking consent, also delete this generated voice profile from the provider")}</label>
            <Button disabled={busy} onClick={() => run(async () => { await api("/api/video-factory/voices", { action: "revoke", id: config.voiceProfileId, deleteRemote: removeRemote }); change({ voiceProfileId: "" }); await load(); })}>{f("Revoke voice consent")}</Button>
          </>
        )}
      </fieldset>
      <div className="domain-fields">
        <label className="check-label"><input type="checkbox" checked={config.narration} onChange={(e) => change({ narration: e.target.checked })} />{f("Narration")}</label>
        <label className="check-label"><input type="checkbox" checked={config.forcedAlignment} onChange={(e) => change({ forcedAlignment: e.target.checked })} />{f("Forced word alignment from audio")}</label>
        <label className="check-label"><input type="checkbox" checked={config.semanticReview} onChange={(e) => change({ semanticReview: e.target.checked })} />{f("Semantic frame and source-support review")}</label>
        <label>{f("Audio for transcription & speaker diarization")}<select value={config.transcriptionAssetId} onChange={(e) => change({ transcriptionAssetId: e.target.value })}>{choices}</select></label>
      </div>
      <label>{f("Pronunciation: word=replacement, one per line")}<textarea value={lexicon} onChange={(e) => setLexicon(e.target.value)} /></label>
      <label className="toggle-row"><span>{f("Export separate narration, music and additional layer stems")}</span><input type="checkbox" checked={config.exportStems} onChange={(e) => change({ exportStems: e.target.checked })} /></label>
      <h3>{f("Audio layers")}</h3>
      {config.audioTracks.map((track, i) => (
        <fieldset className="factory-fieldset" key={i}>
          <div className="domain-fields">
            <label>{f("File")}<select value={track.assetId} onChange={(e) => change({ audioTracks: config.audioTracks.map((v, j) => (j === i ? { ...v, assetId: e.target.value } : v)) })}>{choices}</select></label>
            {(["startSeconds", "offsetSeconds", "durationSeconds", "gainDb", "fadeSeconds"] as const).map((key) => (
              <label key={key}>{key}<input type="number" step="0.1" value={track[key]} onChange={(e) => change({ audioTracks: config.audioTracks.map((v, j) => (j === i ? { ...v, [key]: Number(e.target.value) } : v)) })} /></label>
            ))}
            <label>{f("Layer type")}<select value={track.kind} onChange={(e) => change({ audioTracks: config.audioTracks.map((v, j) => (j === i ? { ...v, kind: e.target.value as typeof track.kind } : v)) })}>{["SFX", "MUSIC", "VOICE"].map((k) => <option key={k}>{k}</option>)}</select></label>
          </div>
          <Button onClick={() => change({ audioTracks: config.audioTracks.filter((_, j) => j !== i) })}>{f("Remove layer")}</Button>
        </fieldset>
      ))}
      <div className="domain-actions">
        <Button disabled={config.audioTracks.length >= 20} onClick={() => change({ audioTracks: [...config.audioTracks, { assetId: "", kind: "SFX", startSeconds: 0, offsetSeconds: 0, durationSeconds: 1, gainDb: -12, fadeSeconds: 0.2 }] })}><Icon name="Plus" size={16} />{f("Add layer")}</Button>
        <Button type="submit" variant="primary" disabled={busy}>{f("Save settings · no charge")}</Button>
      </div>
      <h3>{f("Quality reports & targeted repairs")}</h3>
      <p className="fine-print">{f("Sampled review cannot guarantee identity, truth or lip sync. Serious findings block delivery and provide repair guidance for editing and a new estimate.")}</p>
      {reports.length ? reports.map((r) => (
        <details key={r.id}><summary>{r.kind} · {r.status} · {r.shotId}</summary><pre className="factory-json">{(() => { try { return JSON.stringify(JSON.parse(r.findings), null, 2); } catch { return r.findings; } })()}</pre></details>
      )) : <p className="muted">{f("No quality reports yet.")}</p>}
    </form>
  );
}
