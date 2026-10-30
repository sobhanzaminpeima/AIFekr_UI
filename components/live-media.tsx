"use client";
// Image/video/music generation on aifekr.com, shared by the chat and the
// create studios: the classic chat's own requests, options, polling, reference
// photos, ready prompts, translation and free image mode (main site
// components/chat/ChatInterface generateMedia).
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChatData } from "@/lib/live-app";
import type { Locale } from "@/lib/i18n";

export type MediaKind = "image" | "video" | "music";
export type Media = { images?: string[]; videoUrl?: string; audioUrl?: string; error?: string; pending?: boolean; pendingLabel?: string; requiresUpgrade?: boolean };
export type Template = { id: string; title: string; titleEn: string | null; titleDe?: string | null; content: string; contentEn: string | null; contentDe?: string | null; category: string; thumbnailUrl: string | null; guideFa: string | null; guideEn: string | null; guideDe?: string | null };
export type MediaSettings = { imageStyle: string; imageRatio: string; imageQuality: "standard" | "hd"; imageCount: number; imageProvider: string; videoStyle: string; videoDuration: number; videoRatio: string; videoProvider: string; musicGenre: string; musicDuration: number; puter: boolean };

/** The classic chat's client-side downscale before a reference-photo upload (main site lib/image/downscaleImage). */
async function downscale(file: File, maxEdge = 1600, quality = 0.85, skipBelow = 500 * 1024): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= skipBelow) return file;
  try {
    const bitmap: ImageBitmap | HTMLImageElement = typeof createImageBitmap === "function" ? await createImageBitmap(file).catch(() => loadImg(file)) : await loadImg(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) bitmap.close();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch { return file; }
}
async function loadImg(file: File) {
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { URL.revokeObjectURL(url); }
}

declare global {
  interface Window { puter?: { ai: { txt2img: (p: string, o?: { model?: string }) => Promise<HTMLImageElement> } } }
}

type Handlers = { onPending: (media: Media) => void; onDone: (media: Media) => void };

/** Options, uploads and generation for one media kind (or "chat", which turns the media parts off). */
export function useMediaTools(chat: ChatData | null, kind: MediaKind | "chat", lang: Locale, s: (en: string, values?: Record<string, string | number>) => string) {
  const [imageProviders, setImageProviders] = useState<{ id: string; name: string }[]>([]);
  const [videoProviders, setVideoProviders] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<MediaSettings>({ imageStyle: "realistic", imageRatio: "1:1", imageQuality: "standard", imageCount: 1, imageProvider: "", videoStyle: chat?.videoStyles[0]?.value ?? "", videoDuration: 5, videoRatio: "16:9", videoProvider: "", musicGenre: chat?.musicGenres[0] ?? "", musicDuration: 30, puter: false });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [puterReady, setPuterReady] = useState(false);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (!chat) return;
    fetch("/api/user/profile", { credentials: "include" }).then((r) => r.json()).then((d) => setPlan(d?.user?.plan ?? null)).catch(() => {});
    fetch("/api/ai/image-providers", { credentials: "include" }).then((r) => r.json()).then((d) => { setImageProviders(d.providers || []); if (d.providers?.length) setSettings((v) => ({ ...v, imageProvider: d.providers[0].id })); }).catch(() => {});
    fetch("/api/ai/video-providers", { credentials: "include" }).then((r) => r.json()).then((d) => { setVideoProviders(d.providers || []); if (d.providers?.length) setSettings((v) => ({ ...v, videoProvider: d.providers[0].id })); }).catch(() => {});
    const running = timers.current;
    return () => running.forEach(clearInterval);
  }, [chat]);
  useEffect(() => {
    if (!chat || kind === "chat" || kind === "music") { setTemplates([]); return; }
    fetch(`/api/prompts?toolType=${kind}`).then((r) => r.json()).then((d) => setTemplates(d.prompts || [])).catch(() => {});
  }, [chat, kind]);
  // The free image mode needs Puter's script, loaded only when that mode is chosen.
  useEffect(() => {
    if (!settings.puter || window.puter) { if (window.puter) setPuterReady(true); return; }
    const el = document.createElement("script");
    el.src = "https://js.puter.com/v2/";
    el.async = true;
    el.onload = () => setPuterReady(true);
    document.body.appendChild(el);
  }, [settings.puter]);

  const refLimit = plan && plan !== "FREE" ? 7 : 2;
  const mediaCost = () => {
    const v = settings;
    if (kind === "image") return (v.imageQuality === "hd" ? 10 : 5) * v.imageCount;
    if (kind === "video") return chat?.videoDurations.find((d) => d.value === v.videoDuration)?.credits ?? 20;
    if (kind === "music") return chat?.musicDurations.find((d) => d.value === v.musicDuration)?.credits ?? 10;
    return 0;
  };
  /** The settings sent with a generation, as the classic chat records them. */
  const settingsPayload = () => {
    const v = settings;
    return kind === "image" ? { style: v.imageStyle, ratio: v.imageRatio, quality: v.imageQuality, count: v.imageCount } : kind === "video" ? { style: v.videoStyle, duration: v.videoDuration, ratio: v.videoRatio } : { genre: v.musicGenre, duration: v.musicDuration };
  };

  function poll(type: "video" | "music", predictionId: string, itemId: string, h: Handlers) {
    const t = setInterval(async () => {
      try {
        const d = await fetch(type === "video" ? `/api/video/status?predictionId=${predictionId}&videoId=${itemId}` : `/api/music/status?predictionId=${predictionId}&musicId=${itemId}`).then((r) => r.json());
        if (d.status === "succeeded") { clearInterval(t); h.onDone(type === "video" ? { videoUrl: d.output } : { audioUrl: d.output }); }
        else if (d.status === "failed") { clearInterval(t); h.onDone({ error: s(type === "video" ? "Video generation failed" : "Music generation failed") }); }
      } catch { /* keep polling */ }
    }, 6000);
    timers.current.push(t);
  }

  /** Runs one generation with the current settings; results arrive through the handlers. */
  async function run(text: string, attachments: string[], h: Handlers) {
    if (kind === "chat") return;
    const v = settings;
    try {
      if (kind === "image") {
        let images: string[];
        if (v.puter) {
          if (!window.puter) throw new Error(s("Could not connect to Puter"));
          const styled = v.imageStyle && v.imageStyle !== "realistic" ? `${text}, ${v.imageStyle} style` : text;
          images = await Promise.all(Array.from({ length: v.imageCount }, () => window.puter!.ai.txt2img(styled, { model: "gpt-image-1-mini" }).then((img) => img.src)));
        } else {
          const res = await fetch("/api/image/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, style: v.imageStyle, ratio: v.imageRatio, quality: v.imageQuality, count: v.imageCount, sourceImageUrls: attachments, provider: v.imageProvider }) });
          const d = await res.json();
          if (!res.ok) return h.onDone({ error: d.error || s("Generation failed"), requiresUpgrade: !!d.requiresUpgrade });
          images = (d.images || []).map((img: { url: string }) => img.url);
        }
        h.onDone({ images });
      } else if (kind === "video") {
        const res = await fetch("/api/video/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, style: v.videoStyle, duration: v.videoDuration, ratio: v.videoRatio, sourceImageUrl: attachments[0] || null, provider: v.videoProvider }) });
        const d = await res.json();
        if (!res.ok) return h.onDone({ error: d.error || s("Generation failed"), requiresUpgrade: !!d.requiresUpgrade });
        h.onPending({ pending: true, pendingLabel: s("Processing video... (2-5 min)") });
        poll("video", d.predictionId, d.videoId, h);
      } else {
        const res = await fetch("/api/music/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, genre: v.musicGenre, duration: v.musicDuration }) });
        const d = await res.json();
        if (!res.ok) return h.onDone({ error: d.error || s("Generation failed"), requiresUpgrade: !!d.requiresUpgrade });
        if (d.status === "succeeded" && d.output) h.onDone({ audioUrl: d.output });
        else { h.onPending({ pending: true, pendingLabel: s("Generating music...") }); poll("music", d.predictionId, d.musicId, h); }
      }
    } catch (err) {
      h.onDone({ error: err instanceof Error && err.message ? err.message : s("Generation failed") });
    }
  }

  async function uploadReference(file: File) {
    if (sourceImages.length >= refLimit) return void toast.error(plan && plan !== "FREE" ? s("Up to {n} reference photos allowed", { n: refLimit }) : s("Upgrade your plan to upload more photos"));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", await downscale(file));
      const r = await fetch("/api/upload", { method: "POST", body: form }), d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSourceImages((prev) => [...prev, d.url]);
      toast.success(s("Photo uploaded"));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : s("Upload failed"));
    } finally { setUploading(false); }
  }
  async function translate(text: string) {
    try { const d = await fetch("/api/image/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).then((r) => r.json()); return d.translated || text; }
    catch { toast.error(s("Translation failed")); return text; }
  }
  function pickTemplate(tpl: Template) {
    const text = lang === "de" && tpl.contentDe ? tpl.contentDe : lang !== "fa" && tpl.contentEn ? tpl.contentEn : tpl.content;
    if (kind === "image" && chat?.referenceRequiredCategories.includes(tpl.category)) {
      setSettings((v) => ({ ...v, puter: false }));
      if (!sourceImages.length) toast(s("This prompt applies to your own photo — upload a reference photo"), { icon: "📷" });
    }
    void fetch("/api/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tpl.id }) }).catch(() => {});
    return text;
  }

  return { settings, setSettings, imageProviders, videoProviders, templates, pickTemplate, sourceImages, setSourceImages, uploading, uploadReference, refLimit, translate, puterReady, mediaCost, settingsPayload, run };
}
