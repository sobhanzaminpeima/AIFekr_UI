"use client";
// The design's character workspace (media-library.tsx CharacterWorkspace) on
// aifekr.com with the real character creator (main site
// components/image/CharacterCreationPanel): a source photo or sample person,
// the character brief, the multi-panel board from /api/image/character-board
// and the saved boards. Wording, styles and samples come from /api/app/shell.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSite } from "@/components/site-link";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Icon, Modal } from "./ui";
import { useMediaTools } from "./live-media";
import { fill } from "@/lib/live-app";

type SavedSheet = { id: string; url: string; createdAt: string };
type Source = { kind: "upload"; url: string } | { kind: "sample"; id: string; url: string } | null;

export function LiveCharacters() {
  const { fa, t, n } = useApp();
  const shell = useShell();
  const chat = shell?.chat ?? null;
  const lang = shell?.lang ?? "fa";
  const s = (en: string, values?: Record<string, string | number>) => fill(chat?.strings[en] ?? en, values ?? {});
  const cc = chat?.characters;
  const k = (en: string) => cc?.strings[en] ?? en;
  const media = useMediaTools(chat, "image", lang, s);
  const imageCost = useSite()?.costs.imageStandard ?? 5;
  const [sheets, setSheets] = useState<SavedSheet[] | null>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>(null);
  const [uploading, setUploading] = useState(false);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<string | null>(null);
  const [brief, setBrief] = useState({ name: "", title: "", role: "", genre: cc?.genres[0]?.value ?? "cinematic_drama", personality: "", wardrobe: "", age: "", quote: "" });
  const [customColors, setCustomColors] = useState(false);
  const [colors, setColors] = useState({ primary: "", secondary: "", accent: "" });
  const load = useCallback(() => {
    fetch("/api/image/gallery?kind=character_sheet", { credentials: "include" }).then((r) => r.json()).then((d) => setSheets(d.images || [])).catch(() => setSheets([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function upload(file: File) {
    setUploading(true);
    setBoard(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form }), d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSource({ kind: "upload", url: d.url });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : k("Photo upload failed"));
    } finally { setUploading(false); }
  }
  async function pickSample(id: string) {
    const sample = cc?.samples.find((x) => x.id === id);
    if (!sample) return;
    setBoard(null);
    setSource(null);
    setPortrait(id);
    try {
      const r = await fetch("/api/image/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: sample.portraitPrompt, style: "realistic", ratio: "1:1", quality: "standard", count: 1, provider: media.settings.imageProvider }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const url = d.images?.[0]?.url;
      if (!url) throw new Error(k("Reference image generation failed"));
      setSource({ kind: "sample", id, url });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : k("Reference image generation failed"));
    } finally { setPortrait(null); }
  }
  async function generate() {
    if (!source) return;
    if (!brief.name.trim()) return void toast.error(k("Enter the character's name"));
    setBusy(true);
    setBoard(null);
    try {
      const trim = (v: string) => v.trim() || undefined;
      const r = await fetch("/api/image/character-board", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImageUrl: source.url, name: brief.name.trim(), title: trim(brief.title), role: trim(brief.role), genre: brief.genre,
          personality: trim(brief.personality), wardrobe: trim(brief.wardrobe), age: trim(brief.age), quote: trim(brief.quote),
          primaryColor: customColors ? colors.primary : undefined, secondaryColor: customColors ? colors.secondary : undefined, accentColor: customColors ? colors.accent : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const url = d.image?.url;
      if (!url) throw new Error(k("Character sheet generation failed"));
      setBoard(url);
      load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : k("Character sheet generation failed"));
    } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setSheets((prev) => prev?.filter((x) => x.id !== id) ?? prev);
    await fetch("/api/image/gallery", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }
  const field = (key: keyof typeof brief, label: string, placeholder?: string) => (
    <label>{label}<input aria-label={label} value={brief[key]} placeholder={placeholder} onChange={(e) => setBrief({ ...brief, [key]: e.target.value })} /></label>
  );

  return (
    <>
      <div className="domain-toolbar">
        <Button variant="primary" onClick={() => { setOpen(true); setBoard(null); }}>{fa ? "شخصیت تازه" : "New character"}</Button>
      </div>
      <div className="tool-grid">
        {(sheets ?? []).map((sheet) => (
          <article className="panel character-card" key={sheet.id}>
            <img className="character-sheet" src={sheet.url} alt="character sheet" />
            <span className="badge">{new Date(sheet.createdAt).toLocaleDateString(lang)}</span>
            <div className="domain-actions">
              <a className="btn" href={sheet.url} download target="_blank" rel="noreferrer"><Icon name="Download" size={15} />{k("Download Character Sheet")}</a>
              <Button onClick={() => remove(sheet.id)}><Icon name="Trash2" size={15} />{t("delete")}</Button>
            </div>
          </article>
        ))}
      </div>
      {sheets === null ? <div className="skeleton" /> : !sheets.length && <p className="muted">{k("No character sheets saved yet")}</p>}
      {open && (
        <Modal title={fa ? "شناسنامه شخصیت" : "Character identity"} onClose={() => !busy && setOpen(false)}>
          <div className="character-creator">
            <p className="notice">{k("Upload a photo or pick a sample character, fill in your character's brief, and we'll build a cinematic multi-panel \"Character Design Board\" (turnaround, portraits, expressions, wardrobe/materials) — with that same face throughout.")}</p>
            <p className="notice muted"><Icon name="AlertCircle" size={15} />{k("Only upload your own photo, or a photo you have permission to use.")}</p>
            <h3>{k("1. Choose a source")}</h3>
            <label className="file-drop">
              {source?.kind === "upload" ? <img className="character-source" src={source.url} alt="reference" /> : <Icon name={uploading ? "Loader2" : "Upload"} className={uploading ? "spin" : ""} />}
              {k("Upload your own photo")}
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            </label>
            <p className="field-label">{k("Or pick a sample character")}</p>
            <div className="sample-grid">
              {(cc?.samples ?? []).map((sample) => {
                const selected = source?.kind === "sample" && source.id === sample.id;
                return (
                  <button key={sample.id} className={selected ? "selected" : ""} disabled={portrait !== null} onClick={() => pickSample(sample.id)}>
                    {selected && source ? <img src={source.url} alt={sample.label} /> : <span className="character-avatar"><Icon name={portrait === sample.id ? "Loader2" : "UserRound"} size={26} className={portrait === sample.id ? "spin" : ""} /></span>}
                    <small>{sample.label}</small>
                    <em>✦ {n(imageCost)}</em>
                  </button>
                );
              })}
            </div>
            <h3>{k("2. Character brief")}</h3>
            <div className="domain-fields">
              {field("name", k("Name (required)"), k("e.g. Ava"))}
              {field("title", k("Title/tagline (optional)"), k("e.g. \"The Protagonist\""))}
              {field("role", k("Role (optional)"))}
              <label>{k("Production style")}<select value={brief.genre} onChange={(e) => setBrief({ ...brief, genre: e.target.value })}>{cc?.genres.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
              {field("personality", k("Personality (optional, 3-6 words)"), k("e.g. calm, sharp, determined"))}
              {field("wardrobe", k("Wardrobe/style inspiration (optional)"), k("e.g. silk evening wear"))}
              {field("age", k("Age appearance (optional)"), k("e.g. mid-30s"))}
              {field("quote", k("Signature quote (optional)"))}
            </div>
            <label className="check-label"><input type="checkbox" checked={customColors} onChange={(e) => setCustomColors(e.target.checked)} />{k("Custom colors (otherwise a palette matching the style is chosen automatically)")}</label>
            {customColors && (
              <div className="color-row">
                {([["primary", k("Primary")], ["secondary", k("Secondary")], ["accent", k("Accent")]] as const).map(([key, label]) => (
                  <label key={key}><input type="color" value={colors[key] || "#888888"} onChange={(e) => setColors({ ...colors, [key]: e.target.value })} />{label}</label>
                ))}
              </div>
            )}
            <Button variant="primary full" disabled={!source || !brief.name.trim() || busy} onClick={generate}>
              <Icon name={busy ? "Loader2" : "Sparkles"} size={17} className={busy ? "spin" : ""} />
              {busy ? k("Building the character board (this takes a bit)...") : k("Generate Character Board")}
              <span>✦ {n(imageCost * 3)}</span>
            </Button>
            {board && (
              <div className="character-board">
                <img src={board} alt="character sheet" />
                <a className="btn full" href={board} download target="_blank" rel="noreferrer"><Icon name="Download" size={16} />{k("Download Character Sheet")}</a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
