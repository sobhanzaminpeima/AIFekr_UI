"use client";
/**
 * Video Factory media library (/video-factory?tab=media), Google-Flow style:
 * every shot of the script in order (SHOT_001…) with its image prompt and its
 * image. Prompts download as one list for bulk tools; a folder of images can be
 * dropped and is matched to shots by filename; each shot can be replaced or
 * queued for a new image; all images download as one ZIP. Backed by
 * /api/video-factory/projects/<id>/media.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import type { FactoryCtx } from "./live-factory";

type Shot = { order: number; code: string; id: string; chapter: number; title: string; narration: string; visualPrompt: string; image: { id: string; url: string; source: "chosen" | "generated" } | null };
type Media = { version: number; ready: boolean; shots: Shot[]; withImage?: number };
type Tx = [string, string, string, string];

/** SHOT_012.png, shot-12.jpg, 012.webp → 12. */
export function orderFromFilename(name: string): number | null {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  const m = base.match(/shot[\s_-]*0*(\d{1,4})/i) ?? base.match(/^0*(\d{1,4})$/);
  return m ? Number(m[1]) : null;
}

export function MediaStudio({ x }: { x: FactoryCtx }) {
  const { locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const id = x.project!.id;
  const base = `/api/video-factory/projects/${encodeURIComponent(id)}/media`;
  const [media, setMedia] = useState<Media | null>(null);
  const [error, setError] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Shot | null>(null);
  const one = useRef<HTMLInputElement>(null);
  const target = useRef<string>("");

  const load = useCallback(async () => {
    setError("");
    try { setMedia(await x.api<Media>(base)); } catch (e) { setError(x.err((e as Error).message)); }
  }, [base, x]);
  useEffect(() => { void load(); }, [load]);
  // While a production job runs, images arrive one by one: keep the grid current.
  useEffect(() => {
    if (!x.job || !["QUEUED", "RUNNING"].includes(String(x.job.status))) return;
    const t = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(t);
  }, [x.job, load]);

  const upload = async (file: File) => {
    const form = new FormData();
    form.set("file", file); form.set("projectId", id); form.set("rightsConfirmed", "true");
    const r = await fetch("/api/video-factory/assets", { method: "POST", body: form });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.code || "UPLOAD_FAILED");
    return String(d.asset.id);
  };
  const attach = async (items: { shotId: string; assetId: string }[]) => {
    await x.api(base, { action: "attach", expectedVersion: media!.version, items });
    await x.refresh(id);
    await load();
  };
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); } catch (e) { toast.error(x.err((e as Error).message)); } finally { setBusy(false); setProgress(""); }
  };

  /** A dropped folder: each file goes to the shot its name points to; the rest are reported, not guessed. */
  const bulk = (files: File[]) => act(async () => {
    const shots = media!.shots, items: { shotId: string; assetId: string }[] = [], skipped: string[] = [];
    let n = 0;
    for (const file of files) {
      const shot = shots.find((s) => s.order === orderFromFilename(file.name));
      if (!shot || !/^image\/(png|jpeg|webp)$/.test(file.type)) { skipped.push(file.name); continue; }
      n += 1;
      setProgress(`${n} / ${files.length}`);
      items.push({ shotId: shot.id, assetId: await upload(file) });
    }
    if (items.length) await attach(items);
    toast.success(`${items.length} ${tx(["تصویر روی شات‌ها قرار گرفت", "images placed on their shots", "Bilder den Shots zugeordnet", "görsel shot'lara yerleştirildi"])}${skipped.length ? ` · ${skipped.length} ${tx(["فایل بدون شمارهٔ شات کنار گذاشته شد", "files without a shot number skipped", "Dateien ohne Shot-Nummer übersprungen", "shot numarası olmayan dosya atlandı"])}` : ""}`);
  });

  if (error) return <div className="notice-banner" role="alert"><Icon name="AlertCircle" size={16} /><span>{error}</span></div>;
  if (!media) return <div className="skeleton" />;
  if (!media.ready) return (
    <section className="panel">
      <p className="crm-empty">{tx(["هنوز متن و استوری‌بورد این پروژه ساخته نشده است. بعد از ساخت متن، پرامپت تصویر هر شات این‌جا فهرست می‌شود.", "This project has no script and storyboard yet. Once the script exists, every shot's image prompt is listed here.", "Noch kein Skript. Danach erscheint hier jeder Bild-Prompt.", "Henüz senaryo yok. Senaryo oluşunca her shot'ın görsel prompt'u burada listelenir."])}</p>
    </section>
  );

  const done = media.shots.filter((s) => s.image).length, total = media.shots.length;
  return (
    <div className="factory-media">
      <section className="panel">
        <div className="row-between">
          <div>
            <h2>{tx(["مدیا و پرامپت‌ها", "Media & prompts", "Medien & Prompts", "Medya ve prompt'lar"])}</h2>
            <p className="muted" role="status">{done} / {total} {tx(["شات تصویر دارد", "shots have an image", "Shots haben ein Bild", "shot'ın görseli var"])}</p>
            <progress max={total} value={done} aria-label={tx(["پیشرفت تصاویر", "Image progress", "Bildfortschritt", "Görsel ilerlemesi"])} />
          </div>
          <div className="domain-actions">
            <a className="btn" href={`${base}?format=prompts`} download>{tx(["دانلود همهٔ پرامپت‌ها", "Download all prompts", "Alle Prompts laden", "Tüm prompt'ları indir"])}</a>
            <a className={"btn primary" + (done ? "" : " disabled")} aria-disabled={!done} href={done ? `${base}?format=zip` : undefined} download>{tx(["دانلود همهٔ تصاویر (ZIP)", "Download all images (ZIP)", "Alle Bilder (ZIP)", "Tüm görseller (ZIP)"])}</a>
          </div>
        </div>
        <label className="check-label"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />{tx(["حق استفاده از تصاویری که بارگذاری می‌کنم را دارم.", "I hold the rights to the images I upload.", "Ich habe die Rechte an den hochgeladenen Bildern.", "Yüklediğim görsellerin haklarına sahibim."])}</label>
        <label className={"production-library-upload" + (rights ? "" : " disabled")}>
          <Icon name="Upload" size={20} /> {tx(["بارگذاری گروهی: فایل‌هایی با نام SHOT_001.png، SHOT_002.png و… را انتخاب کنید تا هرکدام روی شات خودش بنشیند.", "Bulk upload: pick files named SHOT_001.png, SHOT_002.png… and each lands on its own shot.", "Massen-Upload: Dateien SHOT_001.png… landen beim passenden Shot.", "Toplu yükleme: SHOT_001.png… adlı dosyalar kendi shot'ına yerleşir."])}
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={!rights || busy} onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ""; if (files.length) void bulk(files); }} />
        </label>
        {progress && <p role="status">{tx(["در حال بارگذاری ", "Uploading ", "Lade hoch ", "Yükleniyor "])}{progress}</p>}
        {selected.size > 0 && (
          <div className="domain-actions">
            <Button disabled={busy} onClick={() => void act(async () => { await x.api(base, { action: "regenerate", expectedVersion: media.version, shotIds: [...selected] }); setSelected(new Set()); await x.refresh(id); await load(); toast.success(tx(["این شات‌ها در اجرای بعدی تصویر تازه می‌گیرند.", "These shots get new images on the next run.", "Diese Shots erhalten beim nächsten Lauf neue Bilder.", "Bu shot'lar sonraki çalıştırmada yeni görsel alır."])); })}>
              {tx(["ساخت دوبارهٔ ", "Regenerate ", "Neu erzeugen: ", "Yeniden üret: "])}{selected.size}{tx([" شات", " shots", " Shots", " shot"])}
            </Button>
            <Button disabled={busy} onClick={() => setSelected(new Set())}>{tx(["لغو انتخاب", "Clear selection", "Auswahl aufheben", "Seçimi temizle"])}</Button>
          </div>
        )}
      </section>
      <input ref={one} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; const shotId = target.current; if (file && shotId) void act(async () => { await attach([{ shotId, assetId: await upload(file) }]); }); }} />
      <div className="factory-media-grid">
        {media.shots.map((s) => (
          <article key={s.id} className={"panel factory-media-card" + (selected.has(s.id) ? " selected" : "")}>
            <button type="button" className="factory-media-thumb" onClick={() => setOpen(s)} aria-label={s.code}>
              {s.image ? <img src={s.image.url} alt={s.title} loading="lazy" /> : <span className="muted">{tx(["در انتظار تصویر", "Waiting for image", "Wartet auf Bild", "Görsel bekleniyor"])}</span>}
            </button>
            <div className="row-between">
              <strong dir="ltr">{s.code}</strong>
              <input type="checkbox" aria-label={`${s.code} ${tx(["انتخاب", "select", "auswählen", "seç"])}`} checked={selected.has(s.id)} onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} />
            </div>
            <p className="cell-clamp">{s.visualPrompt}</p>
            <div className="domain-actions">
              <Button disabled={busy} onClick={() => { void navigator.clipboard?.writeText(s.visualPrompt).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"]))); }}>{tx(["کپی پرامپت", "Copy prompt", "Prompt kopieren", "Prompt'u kopyala"])}</Button>
              <Button disabled={busy || !rights} onClick={() => { target.current = s.id; one.current?.click(); }}>{s.image ? tx(["جایگزینی", "Replace", "Ersetzen", "Değiştir"]) : tx(["بارگذاری", "Upload", "Hochladen", "Yükle"])}</Button>
              {s.image && <a className="btn" href={s.image.url} download={`${s.code}.png`}>{tx(["دانلود", "Download", "Laden", "İndir"])}</a>}
            </div>
          </article>
        ))}
      </div>
      {open && (
        <div className="panel factory-media-detail" role="dialog" aria-label={open.code}>
          <div className="row-between"><strong dir="ltr">{open.code}</strong><Button onClick={() => setOpen(null)}>{tx(["بستن", "Close", "Schließen", "Kapat"])}</Button></div>
          {open.image && <img src={open.image.url} alt={open.title} />}
          <p><strong>{tx(["روایت", "Narration", "Erzählung", "Anlatım"])}: </strong>{open.narration || "—"}</p>
          <p><strong>{tx(["پرامپت تصویر", "Image prompt", "Bild-Prompt", "Görsel prompt'u"])}: </strong>{open.visualPrompt}</p>
        </div>
      )}
    </div>
  );
}
