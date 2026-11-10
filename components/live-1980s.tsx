"use client";
import { useEffect, useRef, useState } from "react";
import Link from "./site-link";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import { downscaleImage } from "@/lib/image-downscale";

type Prompt = { id: string; title: string; titleEn: string | null; titleDe?: string | null; guideFa: string | null; guideEn: string | null; guideDe?: string | null; thumbnailUrl: string | null; category?: string };

/** The public 1980s photo gallery: one free generation, billed to the site, then the plans. */
export function Live1980s() {
  const { locale, fa, tl } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch("/api/prompts?toolType=image").then((r) => r.json())
      .then((d) => setPrompts((d.prompts || []).filter((p: Prompt) => p.category === "1980s")))
      .catch(() => {});
  }, []);
  const selected = prompts.find((p) => p.id === selectedId) ?? null;
  const title = (p: Prompt) => (locale === "de" && p.titleDe) || (!fa && p.titleEn) || p.title;
  const guide = selected ? (fa ? selected.guideFa : (locale === "de" && selected.guideDe) || selected.guideEn || tl("", "Upload a clear photo to get started.")) : null;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || images.length >= 2) return;
    setUploading(true); setError("");
    try {
      const body = new FormData(); body.append("file", await downscaleImage(file));
      const response = await fetch("/api/public/upload-1980s", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (response.status === 402 && data.limitReached) { setLimit(true); return; }
      if (!response.ok) throw Error(data.error || "");
      setImages((prev) => [...prev, data.url]);
    } catch (err) { setError((err instanceof Error && err.message) || tl("خطا در آپلود", "Upload failed")); }
    finally { setUploading(false); if (input.current) input.current.value = ""; }
  }
  async function generate() {
    if (!selected || !images.length) return;
    setGenerating(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/public/generate-1980s", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptId: selected.id, sourceImageUrls: images }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 402 && data.limitReached) { setLimit(true); return; }
      if (!response.ok) throw Error(data.error || "");
      setResult(data.images?.[0] ?? null);
    } catch (err) { setError((err instanceof Error && err.message) || tl("خطا در تولید تصویر", "Image generation failed")); }
    finally { setGenerating(false); }
  }

  return (
    <div className="link-page retro-page">
      <main className="retro" id="main">
        <header className="retro-head">
          <span className="link-badge">AIFekr</span>
          <h1>{tl("عکس‌های دهه ۸۰", "1980s photos")}</h1>
          <p>{tl("عکس خودتان را آپلود کنید و آن را به سبک دهه ۸۰ تبدیل کنید — یک بار رایگان است.", "Upload your photo and turn it into a 1980s-style portrait — your first one is free.")}</p>
        </header>
        {limit ? (
          <section className="panel retro-limit">
            <strong>{tl("تعداد رایگان شما تمام شد", "You've used your free generations")}</strong>
            <p>{tl("برای ادامه، به AIFekr بپیوندید و از همه‌ی امکانات استفاده کنید.", "Join AIFekr to keep going and unlock everything else.")}</p>
            <Link className="btn primary" href="/plans">{tl("مشاهده‌ی پلن‌ها", "View plans")}</Link>
          </section>
        ) : (
          <>
            <div className="retro-grid">
              {prompts.map((p) => (
                <button key={p.id} type="button" aria-pressed={selectedId === p.id} className="retro-tile" onClick={() => { setSelectedId(p.id); setResult(null); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt={title(p)} /> : <Icon name="Camera" size={26} />}
                  <span><bdi>{title(p)}</bdi></span>
                </button>
              ))}
            </div>
            {selected && (
              <>
                {guide && <section className="retro-guide"><small>{tl("راهنما", "Guide")}</small><p><bdi>{guide}</bdi></p></section>}
                <section className="panel">
                  <div className="retro-uploads">
                    {images.map((url, i) => (
                      <div key={url} className="retro-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" />
                        <button type="button" aria-label={tl("حذف عکس", "Remove photo")} onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}><Icon name="X" size={12} /></button>
                      </div>
                    ))}
                    {images.length < 2 && (
                      <button type="button" className="retro-add" disabled={uploading} aria-label={tl("آپلود عکس", "Upload photo")} onClick={() => input.current?.click()}>
                        <Icon name={uploading ? "LoaderCircle" : "Upload"} size={20} />
                      </button>
                    )}
                  </div>
                  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
                  <p className="fine-print">{tl("برای پرامپت‌های دونفره، ۲ عکس آپلود کنید", "For two-person prompts, upload 2 photos")}</p>
                  <Button variant="primary" className="full" disabled={generating || !images.length} onClick={() => void generate()}>{generating ? tl("در حال تولید…", "Generating…") : tl("تولید عکس", "Generate photo")}</Button>
                </section>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            {result && (
              <section className="retro-result">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result} alt={tl("نتیجه", "Result")} />
                <a className="btn" href={result} download target="_blank" rel="noreferrer">{tl("دانلود", "Download")}</a>
              </section>
            )}
          </>
        )}
        <p className="retro-foot"><Link href="/">AIFekr.com</Link></p>
      </main>
    </div>
  );
}
