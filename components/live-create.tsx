"use client";
// The design's create screens on aifekr.com with real data: Studio
// (components/studio.tsx), MediaLibrary (media-library.tsx) and Gallery
// (platform.tsx), in the same markup. Generation goes through the shared media
// hook (live-media.tsx); creations come from /api/gallery and are deleted
// through /api/gallery/<id>.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "@/components/site-link";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, ErrorState, Icon, Modal, SectionTitle } from "./ui";
import { useMediaTools, type Media, type MediaKind } from "./live-media";
import { useLiveCredits } from "./live-shell-widgets";
import { TemplateGallery } from "./live-chat";
import { fill } from "@/lib/live-app";
import type { Tool } from "@/mocks/catalog";

export type Creation = { id: string; type: MediaKind | "voice"; prompt: string; url: string; isPublic?: boolean; createdAt: string; projectId?: string };
const ART = ["/art/orbit.svg", "/art/waves.svg", "/art/voice.svg"];
const ICON: Record<Creation["type"], string> = { image: "Image", video: "Clapperboard", music: "Music2", voice: "AudioLines" };

/** Where a creation's idea is made again on aifekr.com. */
export const remixHref = (type: Creation["type"], prompt = "") =>
  type === "voice" ? "/voice-studio"
  : `/${type}/generate${prompt ? "?prompt=" + encodeURIComponent(prompt) : ""}`;

function useStrings() {
  const shell = useShell();
  const chat = shell?.chat ?? null;
  const s = (en: string, values?: Record<string, string | number>) => fill(chat?.strings[en] ?? en, values ?? {});
  const c = (en: string, values?: Record<string, string | number>) => fill(chat?.create[en] ?? en, values ?? {});
  return { shell, chat, s, c, lang: shell?.lang ?? "fa" };
}

/** The account's creations of the given kinds, newest first. */
export function useCreations(types: Creation["type"][]) {
  const { c, chat } = useStrings();
  const [items, setItems] = useState<Creation[] | null>(null);
  const key = types.join(",");
  const load = useCallback(async () => {
    try {
      const lists = await Promise.all(key.split(",").map(async (type) => {
        const r = await fetch(`/api/gallery?type=${type}`);
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        return (d.items || []).map((i: Creation & { createdAt: string }) => ({ id: i.id, type: type as Creation["type"], prompt: i.prompt, url: i.url, isPublic: i.isPublic, createdAt: i.createdAt, projectId: i.projectId }));
      }));
      setItems(lists.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      setItems([]);
      toast.error(c("Failed to load the gallery"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { void load(); }, [load]);
  async function remove(item: Creation) {
    if (!confirm(item.type === "image" ? c("Delete this image?") : c("Are you sure?"))) return false;
    const r = await fetch(`/api/gallery/${item.id}?type=${item.type}`, { method: "DELETE" });
    if (!r.ok) { toast.error((await r.json().catch(() => ({}))).error || chat?.error || "Error"); return false; }
    setItems((prev) => prev?.filter((x) => x.id !== item.id) ?? prev);
    toast.success(item.type === "image" ? c("Image deleted") : c("Deleted"));
    return true;
  }
  async function togglePublic(item: Creation) {
    const r = await fetch("/api/image/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, isPublic: !item.isPublic }) });
    if (!r.ok) return;
    setItems((prev) => prev?.map((x) => (x.id === item.id ? { ...x, isPublic: !x.isPublic } : x)) ?? prev);
    toast.success(item.isPublic ? c("Image is now private") : c("Image is now public"));
  }
  return { items, setItems, remove, togglePublic, reload: load };
}

/** A creation's real media: image, video player or audio player. */
export function CreationMedia({ item, className }: { item: Creation; className?: string }) {
  if (item.type === "image") return <img className={className} src={item.url} alt={item.prompt} />;
  if (item.type === "video") return <video className={className} src={item.url} controls preload="metadata" />;
  return <audio className={className} src={item.url} controls preload="none" />;
}

/** The classic prompt for an account that must upgrade before using a feature. */
export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { c } = useStrings();
  return (
    <Modal title={c("This feature requires an upgraded account")} onClose={onClose}>
      <p>{c("You need to upgrade your account to use this feature — everything else stays available to you.")}</p>
      <Link href="/plans" className="btn primary full">{c("Upgrade account")}</Link>
    </Modal>
  );
}

/** The design's Studio with real generation (image/video/music). */
export function LiveStudio({ tool }: { tool: Tool }) {
  const { t, fa, n } = useApp();
  const { shell, chat, s, lang } = useStrings();
  const type = (tool.slug.split("/").pop() || "image") as MediaKind;
  const query = useSearchParams();
  const media = useMediaTools(chat, type, lang, s);
  const credits = useLiveCredits(shell?.user.credits ?? 0);
  const { items } = useCreations([type]);
  const [prompt, setPrompt] = useState(query.get("prompt") || "");
  const [confirm, setConfirm] = useState(false);
  const [stage, setStage] = useState<"" | "queued" | "running" | "done" | "failed">("");
  const [pendingLabel, setPendingLabel] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [tab, setTab] = useState("prompt");
  const [results, setResults] = useState<Creation[]>([]);
  const [upgrade, setUpgrade] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const v = media.settings;
  const set = (patch: Partial<typeof v>) => media.setSettings((old) => ({ ...old, ...patch }));
  const cost = media.mediaCost();
  const shown = [...results, ...(items ?? []).filter((i) => !results.some((r) => r.url === i.url))];
  const styles = type === "image" ? chat!.imageStyles : type === "video" ? chat!.videoStyles : chat!.musicGenres.map((g) => ({ value: g, label: g }));
  const styleValue = type === "image" ? v.imageStyle : type === "video" ? v.videoStyle : v.musicGenre;
  const providers = type === "image" ? media.imageProviders : type === "video" ? media.videoProviders : [];
  // Said before the user writes a prompt, not after a refusal: video and music outside the account's plan.
  const access = chat?.planAccess;
  const blocked = !!access && ((type === "video" && !access.video) || (type === "music" && !access.music));

  async function run() {
    setConfirm(false);
    setStage("queued");
    setTab("results");
    setPendingLabel("");
    const attachments = type !== "music" ? media.sourceImages : [];
    media.setSourceImages([]);
    await media.run(prompt, attachments, {
      onPending: (m) => { setStage("running"); setPendingLabel(m.pendingLabel ?? ""); },
      onDone: (m: Media) => {
        if (m.requiresUpgrade) { setStage(""); setUpgrade(true); return; }
        if (m.error) { setStage("failed"); toast.error(m.error); return; }
        const created = new Date().toISOString();
        const made: Creation[] = m.images ? m.images.map((url, i) => ({ id: "new-" + i + created, type, prompt, url, createdAt: created }))
          : [{ id: "new-" + created, type, prompt, url: (m.videoUrl || m.audioUrl)!, createdAt: created }];
        setResults((prev) => [...made, ...prev]);
        setStage("done");
        toast.success(t("done"));
      },
    });
  }

  return (
    <div className="studio-page">
      <SectionTitle title={fa ? tool.fa : tool.en} subtitle={fa ? tool.description : tool.descriptionEn} />
      <div className="studio-tabs chips">
        {["prompt", "results", "history"].map((k) => (
          <button className={tab === k ? "selected" : ""} onClick={() => setTab(k)} key={k}>{t(k as "prompt")}</button>
        ))}
      </div>
      <div className="studio-layout">
        <section className={`panel prompt-panel mobile-${tab === "prompt" ? "show" : "hide"}`}>
          {blocked && access && (
            <div className="plan-notice" role="status">
              <Icon name="LockKeyhole" size={18} />
              <div>
                <strong>{type === "video" ? access.notice.videoTitle : access.notice.musicTitle}</strong>
                <p>{access.notice.body}</p>
                <div className="domain-actions">
                  <Link className="btn primary" href="/image/generate">{access.notice.createImage}</Link>
                  <a className="btn" href="/plans">{access.notice.packages}</a>
                </div>
              </div>
            </div>
          )}
          <label className="field-label">{t("prompt")}</label>
          <textarea aria-label={t("prompt")} rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={type === "image" ? s("What image should I create? Describe the scene, style and light...") : type === "video" ? s("What video should I create? Describe it...") : s("What music should I create? Describe it...")} />
          <label className="field-label">{fa ? "سبک و حال‌وهوا" : "Style & mood"}</label>
          <div className="style-grid">
            {styles.map((o, i) => (
              <button className={styleValue === o.value ? "selected" : ""} key={o.value}
                onClick={() => set(type === "image" ? { imageStyle: o.value } : type === "video" ? { videoStyle: o.value } : { musicGenre: o.value })}>
                <img src={ART[i % ART.length]} alt="" />
                <span>{o.label}</span>
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label>
              {type === "music" ? (fa ? "مدت" : "Duration") : fa ? "نسبت تصویر" : "Aspect ratio"}
              {type === "music" ? (
                <select value={v.musicDuration} onChange={(e) => set({ musicDuration: Number(e.target.value) })}>{chat!.musicDurations.map((d) => <option key={d.value} value={d.value}>{d.value}s · {n(d.credits)} ✦</option>)}</select>
              ) : type === "video" ? (
                <select value={v.videoRatio} onChange={(e) => set({ videoRatio: e.target.value })}>{chat!.videoRatios.map((o) => <option key={o.value} value={o.value}>{o.value} · {o.label}</option>)}</select>
              ) : (
                <select value={v.imageRatio} onChange={(e) => set({ imageRatio: e.target.value })}>{chat!.ratios.map((o) => <option key={o.value} value={o.value}>{o.value} · {o.label}</option>)}</select>
              )}
            </label>
            {type === "video" ? (
              <label>
                {fa ? "مدت" : "Duration"}
                <select value={v.videoDuration} onChange={(e) => set({ videoDuration: Number(e.target.value) })}>{chat!.videoDurations.map((d) => <option key={d.value} value={d.value}>{d.value}s · {n(d.credits)} ✦</option>)}</select>
              </label>
            ) : type === "image" ? (
              <label>
                {fa ? "تعداد" : "Outputs"}
                <select value={v.imageCount} onChange={(e) => set({ imageCount: Number(e.target.value) })}>{[1, 2, 3, 4].map((x) => <option key={x} value={x}>{x === 1 ? s("1 output") : s("{n} outputs", { n: x })}</option>)}</select>
              </label>
            ) : null}
          </div>
          {providers.length > 0 && (
            <label>
              {t("model")}
              <select value={type === "image" ? v.imageProvider : v.videoProvider} onChange={(e) => set(type === "image" ? { imageProvider: e.target.value } : { videoProvider: e.target.value })}>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {type !== "music" && (
            <>
              <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>
                <Icon name="SlidersHorizontal" size={16} />
                {t("advanced")}
                <Icon name={advanced ? "ChevronUp" : "ChevronDown"} size={16} />
              </button>
              {advanced && (
                <div className="advanced-fields">
                  {type === "image" && (
                    <label>
                      {fa ? "کیفیت" : "Quality"}
                      <select value={v.imageQuality} onChange={(e) => set({ imageQuality: e.target.value as "standard" | "hd" })}>
                        <option value="standard">{s("Economy · Fast")}</option>
                        <option value="hd">{s("High quality")}</option>
                      </select>
                    </label>
                  )}
                  <label className="file-drop">
                    <Icon name={media.uploading ? "Loader2" : "Upload"} className={media.uploading ? "spin" : ""} />
                    {s("Reference photo")} · {n(media.sourceImages.length)}/{n(type === "video" ? 1 : media.refLimit)}
                    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={media.uploading || media.sourceImages.length >= (type === "video" ? 1 : media.refLimit)}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void media.uploadReference(f); e.target.value = ""; }} />
                  </label>
                  {media.sourceImages.length > 0 && (
                    <div className="chips attachment-chips">
                      {media.sourceImages.map((url, i) => (
                        <span className="badge reference-chip" key={url}><img src={url} alt={s("Reference photo")} /><button onClick={() => media.setSourceImages((p) => p.filter((_, x) => x !== i))} aria-label={s("Remove file")}>×</button></span>
                      ))}
                    </div>
                  )}
                  {media.templates.length > 0 && <Button onClick={() => setTemplatesOpen(true)}><Icon name="Sparkles" size={15} />{s("Ready prompts")}</Button>}
                  <Button onClick={async () => setPrompt(await media.translate(prompt))} disabled={!prompt.trim()}><Icon name="Languages" size={15} />{s("Translate to English")}</Button>
                </div>
              )}
            </>
          )}
          <Button variant="primary full" disabled={blocked || !prompt.trim() || stage === "running" || stage === "queued"} onClick={() => setConfirm(true)}>
            <Icon name="Sparkles" size={18} />
            {t("generate")}
            <span>✦ {n(cost)}</span>
          </Button>
          <p className="fine-print">
            {fa ? "اعتبار فقط برای عملیات موفق کسر می‌شود." : "Credits are refunded if generation fails."} · {t("balance")}: {n(credits)}
          </p>
        </section>
        <section className={`panel studio-canvas mobile-${tab === "results" ? "show" : "hide"}`}>
          <div className="row-between"><h3>{t("results")}</h3></div>
          {stage === "queued" || stage === "running" ? (
            <div className="job-progress">
              <div className="big-spark thinking">✦</div>
              <h3>{t(stage)}</h3>
              <p>{pendingLabel || (fa ? "در حال آماده‌سازی جزئیات ایدهٔ تو…" : "Bringing the details of your idea together…")}</p>
              <span className="meter indeterminate"><i /></span>
            </div>
          ) : stage === "failed" ? (
            <ErrorState retry={() => setConfirm(true)} />
          ) : shown.length ? (
            <div className="generated-grid">
              {shown.slice(0, 4).map((item) => (
                <div className="generated-result" key={item.id}>
                  <CreationMedia item={item} />
                  <p>{item.prompt}</p>
                  <div className="row-between">
                    <small>{new Date(item.createdAt).toLocaleDateString(lang)}</small>
                    <a className="btn" href={item.url} download target="_blank" rel="noreferrer"><Icon name="Download" size={16} />{t("download")}</a>
                  </div>
                </div>
              ))}
            </div>
          ) : items === null ? <div className="skeleton" /> : <Empty />}
        </section>
        <aside className={`panel studio-history mobile-${tab === "history" ? "show" : "hide"}`}>
          <h3>{t("history")}</h3>
          {(items ?? []).map((item) => (
            <button key={item.id} onClick={() => { setPrompt(item.prompt); setTab("prompt"); }}>
              <img src={item.type === "image" ? item.url : ART[item.type === "video" ? 1 : 2]} alt="" />
              <span>{item.prompt.slice(0, 45)}</span>
            </button>
          ))}
          {items && !items.length && <p className="muted">{t("empty")}</p>}
        </aside>
      </div>
      {confirm && (
        <Modal title={fa ? "آماده‌ای ایده‌ات را بسازی؟" : "Ready to bring your idea to life?"} onClose={() => setConfirm(false)}>
          <p>{prompt}</p>
          <dl className="cost-summary">
            <dt>{t("cost")}</dt>
            <dd>✦ {n(cost)} {t("credits")}</dd>
            <dt>{t("balance")}</dt>
            <dd>{n(Math.max(0, credits - cost))}</dd>
          </dl>
          <Button variant="primary full" onClick={run}>{t("confirm")}</Button>
        </Modal>
      )}
      {upgrade && <UpgradeModal onClose={() => setUpgrade(false)} />}
      {templatesOpen && (
        <TemplateGallery
          lc={{ chat, lang, s, templates: media.templates, mediaType: type, pickTemplate: media.pickTemplate } as unknown as Parameters<typeof TemplateGallery>[0]["lc"]}
          onClose={() => setTemplatesOpen(false)}
          onPick={(text) => { setPrompt(text); setTemplatesOpen(false); }}
        />
      )}
    </div>
  );
}

/** The design's MediaLibrary (gallery/history views) with the account's creations. */
export function LiveMediaLibrary({ type }: { type: MediaKind }) {
  const { fa, t, n } = useApp();
  const { c, lang } = useStrings();
  const { items, remove, togglePublic } = useCreations([type]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("aifekr-media-favorites") || "[]"); } catch { return []; } });
  const saveFavorites = (next: string[]) => { setFavorites(next); try { localStorage.setItem("aifekr-media-favorites", JSON.stringify(next)); } catch {} };
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const all = items ?? [];
  const visible = all.filter((i) => i.prompt.toLowerCase().includes(query.toLowerCase()) && (!onlyFavorites || favorites.includes(i.id)));
  const item = all.find((i) => i.id === selected);
  return (
    <>
      <div className="media-library-summary">
        <div>
          <span className="icon-chip orange"><Icon name={ICON[type]} size={30} /></span>
          <h2>{fa ? "ساخته‌های این استودیو" : "Your studio collection"}</h2>
          <p>{fa ? "خروجی‌های ذخیره‌شده را پیدا کن، نشانه بگذار و دوباره از ایده‌شان شروع کن." : "Find saved outputs, bookmark them and revisit their ideas."}</p>
        </div>
        <strong>{n(all.length)}</strong>
      </div>
      <div className="domain-toolbar">
        <input aria-label={fa ? "جستجوی ساخته‌ها" : "Search creations"} placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className={"btn " + (onlyFavorites ? "primary" : "")} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}>{fa ? "نشان‌شده‌ها" : "Bookmarked"}</button>
        <Link className="btn primary" href={remixHref(type)}>{fa ? "ساخت تازه" : "Create new"}<Icon name="Plus" size={16} /></Link>
      </div>
      {items === null ? <div className="skeleton" /> : visible.length ? (
        <div className="media-collection-grid">
          {visible.map((i) => (
            <article className="panel media-collection-card" key={i.id}>
              <button className="media-collection-preview" onClick={() => setSelected(i.id)} aria-label={(fa ? "پیش‌نمایش " : "Preview ") + i.prompt}>
                {i.type === "image" ? <img src={i.url} alt={i.prompt} /> : <Icon name={ICON[i.type]} size={52} />}
              </button>
              <h3>{i.prompt}</h3>
              <div className="row-between">
                <time>{new Date(i.createdAt).toLocaleDateString(lang)}</time>
                <Button onClick={() => saveFavorites(favorites.includes(i.id) ? favorites.filter((id) => id !== i.id) : [...favorites, i.id])}>
                  {favorites.includes(i.id) ? (fa ? "حذف نشان" : "Remove bookmark") : (fa ? "نشان کردن" : "Bookmark")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty />}
      {item && (
        <Modal title={fa ? "جزئیات خروجی" : "Output details"} onClose={() => setSelected(null)}>
          <CreationMedia item={item} className="full-img" />
          <h3>{item.prompt}</h3>
          <p>{new Date(item.createdAt).toLocaleString(lang)}</p>
          {item.type === "image" && <span className="badge">{item.isPublic ? c("Public") : <Icon name="LockKeyhole" size={12} />}</span>}
          <div className="domain-actions">
            <a className="btn" href={item.url} download target="_blank" rel="noreferrer"><Icon name="Download" size={16} />{c("Download")}</a>
            {item.type === "image" && <Button onClick={() => togglePublic(item)}><Icon name={item.isPublic ? "LockKeyhole" : "Globe"} size={16} />{item.isPublic ? (fa ? "خصوصی کن" : "Make private") : (fa ? "عمومی کن" : "Make public")}</Button>}
            <Button onClick={async () => { if (await remove(item)) setSelected(null); }}><Icon name="Trash2" size={16} />{t("delete")}</Button>
            <Link className="btn primary" href={remixHref(item.type, item.prompt)}>{fa ? "ساخت با همین ایده" : "Reuse this idea"}</Link>
          </div>
        </Modal>
      )}
    </>
  );
}

/** The design's Gallery (/gallery): every creation of the account. */
export function LiveGallery() {
  const { fa, t } = useApp();
  const { lang } = useStrings();
  const { items, remove } = useCreations(["image", "video", "voice", "music"]);
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<Creation | null>(null);
  const filtered = (items ?? []).filter((v) => filter === "all" || v.type === filter);
  return (
    <>
      <SectionTitle title={t("gallery")} subtitle={fa ? "هرچه ساخته‌ای، بخشی از داستان توست." : "Everything you’ve made is a part of your story."}>
        <Link href="/create" className="btn primary"><Icon name="Plus" size={17} />{t("generate")}</Link>
      </SectionTitle>
      <div className="chips">
        {(["all", "image", "video", "voice", "music"] as const).map((s) => (
          <button key={s} className={s === filter ? "selected" : ""} onClick={() => setFilter(s)}>{t(s)}</button>
        ))}
      </div>
      {items === null ? <div className="skeleton" /> : !filtered.length ? <Empty /> : (
        <div className="gallery-grid">
          {filtered.map((item) => (
            <button className="panel gallery-item" key={item.type + item.id} onClick={() => setLightbox(item)}>
              <img src={item.type === "image" ? item.url : item.type === "video" ? ART[1] : ART[2]} alt={item.prompt} />
              <h3>{item.prompt}</h3>
              <span className="badge">{t(item.type)} · {new Date(item.createdAt).toLocaleDateString(lang)}</span>
            </button>
          ))}
        </div>
      )}
      {lightbox && (
        <Modal title={t("preview")} onClose={() => setLightbox(null)}>
          <CreationMedia item={lightbox} className="full-img" />
          <p>{lightbox.prompt}</p>
          <div className="domain-actions">
            <a className="btn" href={lightbox.type === "voice" ? lightbox.url + "&download=1" : lightbox.url} download target="_blank" rel="noreferrer"><Icon name="Download" size={16} />{t("download")}</a>
            {lightbox.type !== "voice" && <Button onClick={async () => { if (await remove(lightbox)) setLightbox(null); }}><Icon name="Trash2" size={16} />{t("delete")}</Button>}
            <Link href={remixHref(lightbox.type, lightbox.prompt)} className="btn primary">{fa ? "با این ایده دوباره بساز" : "Remix this idea"}</Link>
          </div>
        </Modal>
      )}
    </>
  );
}
