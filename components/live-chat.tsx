"use client";
// The design's chat (components/chat.tsx) on aifekr.com: the classic chat's
// own requests and behaviour (main site components/chat/ChatInterface) —
// streaming answers, saved conversations, expert modes, models, files,
// image/video/music generation in the thread, ready prompts, voice input,
// read-aloud, suggestions, prompt boxes and action confirmations. Wording and
// options come from the main site through /api/app/shell.
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useShell } from "./live-shell-context";
import { Icon } from "./ui";
import { fill } from "@/lib/live-app";
import { useMediaTools, type Media, type Template } from "./live-media";

export type MediaType = "chat" | "image" | "video" | "music";
type PromptBox = { name: string; type: string; targetAI: string; language: string; category: string; content: string };
type Action = { id: string; summary: string; expiresAt: string };
type Doc = { name: string; text: string; expires?: number; nonce?: string; signature?: string };
export type LiveMessage = {
  id: string; role: "user" | "assistant"; content: string; display: string; suggestions: string[]; promptBox: PromptBox | null;
  media?: Media; attachments?: string[]; actions?: Action[]; dataSources?: string[]; documents?: { name: string; text: string }[];
};
type Provider = { id: string; name: string; model: string; creditCost?: number };

const CHAT_HISTORY_UPDATED = "aifekr:chat-history-updated";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** <SUGGESTIONS> and <PROMPTBOX> blocks, exactly as the classic chat reads them. */
function parseAnswer(raw: string): { display: string; suggestions: string[]; promptBox: PromptBox | null } {
  let content = raw, suggestions: string[] = [], promptBox: PromptBox | null = null;
  const s = content.match(/<SUGGESTIONS>([\s\S]*?)<\/SUGGESTIONS>/);
  if (s) {
    content = content.replace(/<SUGGESTIONS>[\s\S]*?<\/SUGGESTIONS>/g, "").trimEnd();
    try { const parsed = JSON.parse(s[1]); suggestions = Array.isArray(parsed) ? parsed.slice(0, 5) : []; } catch {}
  }
  const p = content.match(/<PROMPTBOX>([\s\S]*?)<\/PROMPTBOX>/);
  if (p) {
    content = content.replace(/<PROMPTBOX>[\s\S]*?<\/PROMPTBOX>/g, "").trim();
    try {
      const parsed = JSON.parse(p[1]);
      if (parsed && typeof parsed.content === "string") promptBox = { name: parsed.name || "", type: parsed.type || "", targetAI: parsed.targetAI || "", language: parsed.language || "", category: parsed.category || "", content: parsed.content };
    } catch {}
  }
  return { display: content, suggestions, promptBox };
}

/** Generated-media turns are stored as JSON marked with __media (see the classic chat). */
function parseStored(raw: string): { text: string; media?: Media; attachments?: string[] } | null {
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.__media) return null;
    if (p.__media === "user") return { text: typeof p.text === "string" ? p.text : "", attachments: Array.isArray(p.sourceImageUrls) ? p.sourceImageUrls : p.sourceImageUrl ? [p.sourceImageUrl] : [] };
    return { text: "", media: { images: p.images, videoUrl: p.videoUrl, audioUrl: p.audioUrl, error: p.error } };
  } catch { return null; }
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => any;
  }
}

export function useLiveChat(conversationFromPath: string | null) {
  const shell = useShell();
  const chat = shell?.chat ?? null;
  const lang = shell?.lang ?? "fa";
  const s = (en: string, values?: Record<string, string | number>) => fill(chat?.strings[en] ?? en, values ?? {});
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [model, setModel] = useState("auto");
  const [baseCost, setBaseCost] = useState<number | null>(null);
  const [expertMode, setExpertMode] = useState("default");
  const [mediaType, setMediaType] = useState<MediaType>("chat");
  const [streaming, setStreaming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const tools = useMediaTools(chat, mediaType, lang, s);
  const { settings, setSettings, sourceImages, setSourceImages } = tools;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognition = useRef<any>(null);

  // Same reference data as the classic chat.
  useEffect(() => {
    if (!chat) return;
    fetch("/api/ai/chat-providers", { credentials: "include" }).then((r) => r.json()).then((d) => setProviders(d.providers ?? [])).catch(() => {});
    fetch("/api/credits/costs", { credentials: "include" }).then((r) => r.json()).then((d) => setBaseCost(typeof d.costs?.chat === "number" ? d.costs.chat : null)).catch(() => {});
    return () => { window.speechSynthesis?.cancel(); };
  }, [chat]);
  // A saved conversation (/chat/<id>), with any action still awaiting confirmation.
  const load = useCallback((id: string) => {
    setConversationId(id);
    setMessages([]);
    fetch(`/api/chat/history?conversationId=${id}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data?.conversation?.tool?.startsWith("student:")) {
        const course = data.conversation.tool.slice(8);
        location.assign(`/student/chat?conversationId=${encodeURIComponent(id)}${course ? `&courseId=${encodeURIComponent(course)}` : ""}`);
        return;
      }
      if (!data?.messages?.length) return;
      const restored: LiveMessage[] = data.messages.map((m: { id: string; role: "user" | "assistant"; content: string }) => {
        const stored = parseStored(m.content);
        if (stored) return { id: m.id, role: m.role, content: stored.text, display: stored.text, suggestions: [], promptBox: null, media: stored.media, attachments: stored.attachments };
        try {
          const d = JSON.parse(m.content);
          if (d.__documents === 1 && typeof d.text === "string" && Array.isArray(d.documents) && d.documents.length <= 3 && d.documents.every((x: { name?: unknown; text?: unknown } | null) => x && typeof x.name === "string" && typeof x.text === "string"))
            return { id: m.id, role: m.role, content: m.content, display: d.text, suggestions: [], promptBox: null, documents: d.documents };
        } catch {}
        return { id: m.id, role: m.role, content: m.content, ...parseAnswer(m.content) };
      });
      const pending: Action[] = Array.isArray(data.pendingActions) ? data.pendingActions : [];
      if (pending.length) for (let i = restored.length - 1; i >= 0; i--) if (restored[i].role === "assistant") { restored[i] = { ...restored[i], actions: pending }; break; }
      setMessages(restored);
    }).catch(() => {});
  }, []);
  // The address follows the conversation (/chat/<id> once it has one); only a
  // move to a different conversation, or to a new chat, reloads the thread.
  const current = useRef<string | null>(null);
  useEffect(() => { current.current = conversationId; }, [conversationId]);
  useEffect(() => {
    if (!chat || conversationFromPath === current.current) return;
    if (conversationFromPath) load(conversationFromPath);
    else { abort.current?.abort(); setConversationId(null); setMessages([]); }
  }, [chat, conversationFromPath, load]);

  const announce = (id: string, title?: string) => dispatchEvent(new CustomEvent(CHAT_HISTORY_UPDATED, { detail: { id, ...(title ? { title } : {}), updatedAt: new Date().toISOString(), projectId: null } }));

  async function send(text: string, history: LiveMessage[] = messages) {
    if (!chat || (!text.trim() && !documents.length) || streaming || generating || documentBusy) return;
    const attached = documents;
    const question = text.trim() || s("Review and summarize these files.");
    const user: LiveMessage = { id: uid(), role: "user", content: attached.length ? JSON.stringify({ __documents: 1, text: question, documents: attached.map((d) => ({ name: d.name, text: d.text })) }) : question, display: question, documents: attached.map((d) => ({ name: d.name, text: d.text })), suggestions: [], promptBox: null };
    const answerId = uid();
    setMessages((prev) => [...prev, user, { id: answerId, role: "assistant", content: "", display: "", suggestions: [], promptBox: null }]);
    setStreaming(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.current.signal,
        body: JSON.stringify({ message: question, attachments: attached, conversationId, model, expertMode, history: history.slice(-10).filter((m) => !m.media).map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || chat.error); }
      const convId = res.headers.get("X-Conversation-Id");
      if (convId && !conversationId) { current.current = convId; setConversationId(convId); history_replace(`/chat/${convId}`); }
      if (convId) announce(convId, !conversationId ? text.slice(0, 50) : undefined);
      const reader = res.body?.getReader();
      if (!reader) throw new Error(chat.error);
      const decoder = new TextDecoder();
      let text2 = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          let parsed: { provider?: string; reset?: boolean; error?: string; text?: string; actions?: Action[]; dataSources?: string[] };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.provider) setActiveProvider(parsed.provider);
          if (parsed.reset) { text2 = ""; setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, content: "", display: "", suggestions: [], promptBox: null } : m))); }
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            setDocuments([]);
            text2 += parsed.text;
            const snapshot = text2, view = parseAnswer(text2);
            setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, content: snapshot, ...view } : m)));
          }
          if (parsed.actions || parsed.dataSources) setMessages((prev) => prev.map((m) => (m.id === answerId ? { ...m, actions: parsed.actions ?? [], dataSources: parsed.dataSources ?? [] } : m)));
        }
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error(err instanceof Error ? err.message : chat.error);
        setMessages((prev) => prev.filter((m) => m.id !== answerId));
      }
    } finally {
      setStreaming(false);
      abort.current = null;
    }
  }
  function history_replace(url: string) { window.history.replaceState(window.history.state, "", url); }

  // ── Media in the thread (classic generateMedia) ───────────────────────────
  async function ensureConversation(title: string) {
    if (conversationId) return conversationId;
    try {
      const d = await fetch("/api/create/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ type: mediaType, title: title.slice(0, 50) }) }).then((r) => r.json());
      const id = d?.conversation?.id as string | undefined;
      if (!id) return null;
      current.current = id;
      setConversationId(id);
      announce(id, title.slice(0, 50));
      history_replace(`/chat/${id}`);
      return id;
    } catch { return null; }
  }
  const saveTurn = (convId: string, role: "user" | "assistant", payload: Record<string, unknown>) => {
    void fetch("/api/create/chat/messages", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ conversationId: convId, role, content: JSON.stringify({ __media: role, ...payload }) }) }).catch(() => {});
  };
  const setMedia = (id: string, media: Media) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, media } : m)));
  async function generate(text: string) {
    if (!chat || !text.trim() || streaming || generating || mediaType === "chat") return;
    if (mediaType === "image" && settings.puter && !window.puter) return void toast.error(s("Could not connect to Puter"));
    const settingsPayload = tools.settingsPayload();
    const attachments = mediaType !== "music" ? sourceImages : [];
    const answerId = uid();
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text, display: text, suggestions: [], promptBox: null, attachments }, { id: answerId, role: "assistant", content: "", display: "", suggestions: [], promptBox: null, media: { pending: true } }]);
    setSourceImages([]);
    setGenerating(true);
    const convId = await ensureConversation(text);
    if (convId) saveTurn(convId, "user", { text, sourceImageUrls: attachments, settings: settingsPayload, mediaType });
    await tools.run(text, attachments, {
      onPending: (media) => setMedia(answerId, media),
      onDone: ({ requiresUpgrade: _upgrade, ...media }) => { setMedia(answerId, media); if (convId) saveTurn(convId, "assistant", media); },
    });
    setGenerating(false);
  }
  const chatCost = model === "auto" ? baseCost : providers.find((p) => p.model === model)?.creditCost ?? null;

  // ── Files ──────────────────────────────────────────────────────────────────
  async function attachDocument(file: File) {
    if (documents.length >= 3) return void toast.error(s("Up to 3 files"));
    setDocumentBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const r = await fetch("/api/chat/attachments", { method: "POST", body: form }), d = await r.json();
      if (!r.ok) throw Error(d.error);
      setDocuments((prev) => [...prev, d.attachment]);
    } catch (e) {
      toast.error((e as Error).message === "NO_SELECTABLE_TEXT" ? s("No selectable text. Use Student OCR for scanned PDFs.") : s("Could not read file. Choose a text PDF, DOCX, TXT, CSV or XLSX up to 5 MB."));
    } finally { setDocumentBusy(false); }
  }
  // ── Voice ──────────────────────────────────────────────────────────────────
  const locale = ({ fa: "fa-IR", en: "en-US", de: "de-DE", tr: "tr-TR" } as const)[lang];
  function toggleVoice(onText: (text: string) => void) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return void toast.error(s("Your browser doesn't support voice input"));
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = locale;
    r.interimResults = true;
    r.continuous = false;
    recognition.current = r;
    let final = "";
    r.onstart = () => setListening(true);
    r.onend = () => { setListening(false); recognition.current = null; };
    r.onerror = () => { setListening(false); recognition.current = null; };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) final += t; else interim += t; }
      onText(final + interim);
    };
    r.start();
  }
  function toggleSpeak(id: string, text: string) {
    if (speakingId === id) { window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    u.rate = 1;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang));
    if (voice) u.voice = voice;
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }

  return {
    enabled: !!chat, chat, s, lang, messages, setMessages, conversationId, providers, model, setModel, chatCost, expertMode, setExpertMode,
    mediaType, setMediaType, streaming, generating, activeProvider, send, generate, stop: () => abort.current?.abort(), mediaCost: tools.mediaCost,
    documents, setDocuments, documentBusy, attachDocument, sourceImages, setSourceImages, uploading: tools.uploading, uploadReference: tools.uploadReference, refLimit: tools.refLimit,
    translate: tools.translate, templates: tools.templates, pickTemplate: tools.pickTemplate, settings, setSettings, imageProviders: tools.imageProviders, videoProviders: tools.videoProviders, puterReady: tools.puterReady,
    listening, toggleVoice, speakingId, toggleSpeak,
  };
}
export type LiveChat = ReturnType<typeof useLiveChat>;

/** Markdown answer, as the classic chat renders it. */
export function Answer({ text }: { text: string }) {
  return <div className="message-text markdown"><ReactMarkdown>{text}</ReactMarkdown></div>;
}

export function MediaResult({ media, lc }: { media: Media; lc: LiveChat }) {
  if (media.pending) return <p className="thinking"><Icon name="Loader2" size={15} className="spin" /> {media.pendingLabel || lc.s("Generating...")}</p>;
  if (media.error) return <p className="error-text">{media.error}</p>;
  if (media.images?.length) return (
    <div className="media-grid" style={{ gridTemplateColumns: `repeat(${Math.min(media.images.length, 2)}, minmax(0, 1fr))` }}>
      {media.images.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer" download className="media-tile"><img src={url} alt={String(i + 1)} /><span><Icon name="Download" size={14} /></span></a>)}
    </div>
  );
  if (media.videoUrl) return <div className="media-tile video"><video src={media.videoUrl} controls /><a href={media.videoUrl} download><Icon name="Download" size={13} />{lc.s("Download")}</a></div>;
  if (media.audioUrl) return <div className="media-tile audio"><audio src={media.audioUrl} controls /><a href={media.audioUrl} download><Icon name="Download" size={13} />{lc.s("Download MP3")}</a></div>;
  return null;
}

export function PromptBoxCard({ data, lc }: { data: PromptBox; lc: LiveChat }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);
  const words = data.content.trim().split(/\s+/).filter(Boolean).length;
  const download = (ext: "txt" | "md", mime: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ext === "md" ? `# ${data.name}\n\n${data.content}` : data.content], { type: mime }));
    a.download = `${(data.name || "prompt").replace(/[^a-zA-Z0-9؀-ۿ_-]+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="prompt-box panel" dir="ltr">
      <div className="prompt-box-head">
        <strong><Icon name="FileText" size={15} />{data.name || lc.s("Prompt")}</strong>
        <div className="chips">{[data.type, data.targetAI, data.language, data.category].filter(Boolean).map((m) => <span key={m} className="badge orange">{m}</span>)}</div>
      </div>
      {open && <pre>{data.content}</pre>}
      <div className="prompt-box-foot">
        <small>{words} {lc.s("words")} · ~{Math.round(words * 1.3)} tokens</small>
        <div>
          <button className="icon-btn" aria-label={open ? lc.s("Collapse") : lc.s("Expand")} onClick={() => setOpen(!open)}><Icon name={open ? "ChevronUp" : "ChevronDown"} size={15} /></button>
          <button className="icon-btn" aria-label="TXT" onClick={() => download("txt", "text/plain")}><Icon name="FileDown" size={15} /></button>
          <button className="icon-btn" aria-label="Markdown" onClick={() => download("md", "text/markdown")}><Icon name="FileText" size={15} /></button>
          <button className="btn primary" onClick={async () => { await navigator.clipboard.writeText(data.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Icon name={copied ? "Check" : "Copy"} size={14} />{copied ? lc.s("Copied") : lc.s("Copy")}</button>
        </div>
      </div>
    </div>
  );
}

/** Confirmation card for a staged action (classic OrchestratorActionCard): confirming sends only the action's id. */
export function ActionCard({ action, lc }: { action: Action; lc: LiveChat }) {
  const [state, setState] = useState<"pending" | "running" | "executed" | "rejected" | "failed" | "expired">(new Date(action.expiresAt).getTime() < Date.now() ? "expired" : "pending");
  const [error, setError] = useState<string | null>(null);
  async function resolve(confirm: boolean) {
    setState("running");
    setError(null);
    try {
      const res = await fetch(`/api/orchestrator/action/${action.id}`, { method: confirm ? "POST" : "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 410) return setState("expired");
        setState(confirm ? "failed" : "pending");
        setError(typeof body.error === "string" ? body.error : null);
        return;
      }
      setState(confirm ? "executed" : "rejected");
    } catch { setState(confirm ? "failed" : "pending"); }
  }
  const resolved = !["pending", "running"].includes(state);
  return (
    <div className={`action-card panel state-${state}`}>
      <Icon name={state === "executed" ? "Check" : state === "failed" || state === "expired" ? "AlertTriangle" : "ShieldCheck"} size={16} />
      <div>
        {!resolved && <small>{lc.s("This needs your confirmation")}</small>}
        <p>{action.summary}</p>
        {state === "expired" && <small>{lc.s("This request expired — ask again")}</small>}
        {state === "failed" && <small>{lc.s("Couldn't be done — something went wrong")}{error ? ` (${error})` : ""}</small>}
        {state === "executed" && <small>{lc.s("Done")}</small>}
        {state === "rejected" && <small>{lc.s("Not done")}</small>}
        {!resolved && (
          <div className="row-actions">
            <button className="btn primary" disabled={state === "running"} onClick={() => resolve(true)}><Icon name={state === "running" ? "Loader2" : "Check"} size={14} className={state === "running" ? "spin" : ""} />{lc.s("Confirm and do it")}</button>
            <button className="btn" disabled={state === "running"} onClick={() => resolve(false)}><Icon name="X" size={14} />{lc.s("Cancel")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Based on your CRM and your accounting", as the classic chat words it. */
export function dataSourceLabel(keys: string[], lc: LiveChat) {
  const labels = keys.map((k) => lc.chat?.dataSources[k]).filter(Boolean) as string[];
  if (!labels.length) return lc.s("your own real data");
  const joined = labels.length === 1 ? labels[0] : labels.slice(0, -1).join(lc.s(", ")) + lc.s(" and ") + labels[labels.length - 1];
  return lc.s("Based on {n}", { n: joined });
}

/** The image/video/music settings row under the composer (classic chat's options). */
export function MediaSettings({ lc, onTemplates }: { lc: LiveChat; onTemplates: () => void }) {
  const { chat, settings: v, setSettings, mediaType } = lc;
  if (!chat || mediaType === "chat") return null;
  const set = (patch: Partial<typeof v>) => setSettings((old) => ({ ...old, ...patch }));
  return (
    <div className="media-settings">
      {mediaType === "image" && (
        <>
          <div className="chips" role="group">
            <button type="button" className={!v.puter ? "selected" : ""} aria-pressed={!v.puter} onClick={() => set({ puter: false })} title="Credits"><Icon name="Coins" size={14} /></button>
            <button type="button" className={v.puter ? "selected" : ""} aria-pressed={v.puter} onClick={() => set({ puter: true })} title="Puter"><Icon name="Gift" size={14} /></button>
          </div>
          {!v.puter && lc.imageProviders.length > 0 && <select aria-label={lc.s("Image model")} value={v.imageProvider} onChange={(e) => set({ imageProvider: e.target.value })}>{lc.imageProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          <select value={v.imageStyle} onChange={(e) => set({ imageStyle: e.target.value })}>{chat.imageStyles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={v.imageRatio} onChange={(e) => set({ imageRatio: e.target.value })}>{chat.ratios.map((o) => <option key={o.value} value={o.value}>{o.label} · {o.value}</option>)}</select>
          {!v.puter && <select value={v.imageQuality} onChange={(e) => set({ imageQuality: e.target.value as "standard" | "hd" })}><option value="standard">{lc.s("Economy · Fast")}</option><option value="hd">{lc.s("High quality")}</option></select>}
          <select value={v.imageCount} onChange={(e) => set({ imageCount: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? lc.s("1 output") : lc.s("{n} outputs", { n })}</option>)}</select>
          {lc.templates.length > 0 && <button type="button" className="chip-btn" onClick={onTemplates}><Icon name="Sparkles" size={13} />{lc.s("Ready prompts")}</button>}
          <a className="chip-btn" href="/image/generate?tab=character"><Icon name="UserSquare2" size={13} />{lc.s("Character")}</a>
        </>
      )}
      {mediaType === "video" && (
        <>
          {lc.videoProviders.length > 0 && <select aria-label={lc.s("Video model")} value={v.videoProvider} onChange={(e) => set({ videoProvider: e.target.value })}>{lc.videoProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          <select value={v.videoStyle} onChange={(e) => set({ videoStyle: e.target.value })}>{chat.videoStyles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={v.videoRatio} onChange={(e) => set({ videoRatio: e.target.value })}>{chat.videoRatios.map((o) => <option key={o.value} value={o.value}>{o.label} · {o.value}</option>)}</select>
          <select value={v.videoDuration} onChange={(e) => set({ videoDuration: Number(e.target.value) })}>{chat.videoDurations.map((d) => <option key={d.value} value={d.value}>{d.value}s · {d.credits}</option>)}</select>
          {lc.templates.length > 0 && <button type="button" className="chip-btn" onClick={onTemplates}><Icon name="Sparkles" size={13} />{lc.s("Ready prompts")}</button>}
        </>
      )}
      {mediaType === "music" && (
        <>
          <select value={v.musicGenre} onChange={(e) => set({ musicGenre: e.target.value })}>{chat.musicGenres.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          <select value={v.musicDuration} onChange={(e) => set({ musicDuration: Number(e.target.value) })}>{chat.musicDurations.map((d) => <option key={d.value} value={d.value}>{d.value}s · {d.credits}</option>)}</select>
        </>
      )}
    </div>
  );
}

/** The ready-prompt gallery (classic chat's template modal). */
export function TemplateGallery({ lc, onPick, onClose }: { lc: LiveChat; onPick: (text: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState("all");
  const { chat, lang, templates, mediaType } = lc;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel template-gallery" role="dialog" aria-modal="true" aria-label={lc.s("Prompt Gallery")} onClick={(e) => e.stopPropagation()}>
        <div className="template-head"><h2><Icon name="Sparkles" size={16} />{lc.s("Prompt Gallery")}</h2><button className="icon-btn" aria-label="×" onClick={onClose}><Icon name="X" size={18} /></button></div>
        {mediaType === "image" && <div className="chips template-cats">{chat?.imageCategories.map((c) => <button key={c.id} className={category === c.id ? "selected" : ""} onClick={() => setCategory(c.id)}>{c.label}</button>)}</div>}
        <div className="template-grid">
          {!templates.length && <p className="muted">{lc.s("No prompts added yet")}</p>}
          {templates.filter((t) => mediaType !== "image" || category === "all" || t.category === category).map((t) => {
            const title = (lang === "de" && t.titleDe) || (lang !== "fa" && t.titleEn) || t.title;
            const guide = (lang === "de" && t.guideDe) || (lang !== "fa" && t.guideEn) || t.guideFa;
            return (
              <div key={t.id} className="template-card">
                {t.thumbnailUrl && <img src={t.thumbnailUrl} alt={title} />}
                <strong>{title}</strong>
                <div className="template-guide"><small>{lc.s("Guide")}</small><p>{guide || lc.s('Tap "Try it" to load this prompt into the chat.')}</p></div>
                <button className="btn primary" onClick={() => onPick(lc.pickTemplate(t))}>{lc.s("Try it")}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
