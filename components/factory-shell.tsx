"use client";
// Compact frame for the Video Factory (a faceless YouTube video editor):
// one slim header and an icon toolbar instead of the generic module banner,
// a 15-link text tab strip and the "related sections" block. Each tool keeps
// its full name and description as a tooltip; specialist tools sit in a
// "Pro tools" menu.
import { useEffect, useRef, useState } from "react";
import Link from "@/components/site-link";
import { moduleViewHref, type ModuleSpec, type ViewSpec } from "@/lib/upstream/registry";
import { useApp } from "./providers";
import { Icon } from "./ui";

type Tx = [string, string, string, string];
const MAIN: { id: string; icon: string; t: Tx; tip: Tx }[] = [
  { id: "production", icon: "Sparkles", t: ["ساخت", "Make", "Erstellen", "Oluştur"], tip: ["ساخت ویدیوی جدید از یک موضوع", "Make a new video from a topic", "Neues Video aus einem Thema", "Bir konudan yeni video"] },
  { id: "projects", icon: "LayoutGrid", t: ["پروژه‌ها", "Projects", "Projekte", "Projeler"], tip: ["همهٔ ویدیوهای شما", "All your videos", "Alle deine Videos", "Tüm videolarınız"] },
  { id: "edit", icon: "Scissors", t: ["ویرایش", "Edit", "Bearbeiten", "Düzenle"], tip: ["تایم‌لاین، ترتیب صحنه‌ها و هم‌زمانی با صدا", "Timeline, scene order and voice sync", "Zeitleiste, Reihenfolge und Stimm-Sync", "Zaman çizelgesi, sıra ve ses eşitleme"] },
  { id: "characters", icon: "Palette", t: ["سبک", "Style", "Stil", "Stil"], tip: ["سبک تصویر و شخصیت ثابت", "Visual style and fixed character", "Bildstil und feste Figur", "Görsel stil ve sabit karakter"] },
  { id: "media", icon: "Image", t: ["تصاویر", "Images", "Bilder", "Görseller"], tip: ["تصاویر صحنه‌ها، لوگو و تامبنیل", "Scene images, logo and thumbnail", "Szenenbilder, Logo und Thumbnail", "Sahne görselleri, logo ve küçük resim"] },
  { id: "assets", icon: "Download", t: ["دانلود", "Download", "Download", "İndir"], tip: ["ویدیو، زیرنویس و متن آمادهٔ یوتیوب", "Video, captions and YouTube text", "Video, Untertitel und YouTube-Text", "Video, altyazı ve YouTube metni"] },
  { id: "publishing", icon: "Send", t: ["انتشار", "Publish", "Veröffentlichen", "Yayınla"], tip: ["انتشار در کانال یوتیوب", "Publish to your YouTube channel", "Auf YouTube veröffentlichen", "YouTube kanalında yayınla"] },
  { id: "channel", icon: "Tv", t: ["کانال", "Channel", "Kanal", "Kanal"], tip: ["اطلاعات کانال یوتیوب شما برای متن‌نویسی", "Your YouTube channel details for the writer", "Kanaldaten für das Skript", "Senaryo için kanal bilgileri"] },
];
const PRO: { id: string; icon: string }[] = [
  { id: "ideas", icon: "Lightbulb" }, { id: "script", icon: "FileText" }, { id: "library", icon: "FolderOpen" },
  { id: "advanced", icon: "SlidersHorizontal" }, { id: "timeline", icon: "ListChecks" }, { id: "history", icon: "History" }, { id: "packages", icon: "Package" },
];

export function FactoryShell({ module, view, children }: { module: ModuleSpec; view: ViewSpec; children: React.ReactNode }) {
  const { locale, tl } = useApp();
  const tx = (c: Tx) => c[{ fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1];
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const href = (id: string) => { const v = module.views.find((x) => x.id === id); return v ? moduleViewHref(module, v) : module.base; };
  const pro = PRO.map((p) => ({ ...p, view: module.views.find((v) => v.id === p.id) })).filter((p) => p.view);
  const inPro = pro.some((p) => p.id === view.id);
  return (
    <div className={`factory-shell accent-${module.accent}`} data-module={module.id}>
      <header className="factory-bar">
        <span className="factory-bar-title"><Icon name={module.icon} size={20} />{tl(module.title[0], module.title[1])}</span>
        <nav className="factory-tools" aria-label={tl(module.title[0], module.title[1])}>
          {MAIN.map((m) => (
            <Link key={m.id} href={href(m.id)} title={tx(m.tip)} aria-label={`${tx(m.t)} · ${tx(m.tip)}`} aria-current={view.id === m.id ? "page" : undefined} className={view.id === m.id ? "selected" : ""}>
              <Icon name={m.icon} size={18} /><span>{tx(m.t)}</span>
            </Link>
          ))}
          <div className="factory-pro" ref={menu}>
            <button type="button" className={inPro ? "selected" : ""} aria-expanded={open} aria-haspopup="menu" title={tx(["ابزارهای حرفه‌ای", "Pro tools", "Profi-Werkzeuge", "Pro araçlar"])} onClick={() => setOpen(!open)}>
              <Icon name="Ellipsis" size={18} /><span>{tx(["حرفه‌ای", "Pro", "Profi", "Pro"])}</span>
            </button>
            {open && (
              <div className="factory-pro-menu" role="menu">
                {pro.map((p) => (
                  <Link key={p.id} role="menuitem" href={moduleViewHref(module, p.view!)} aria-current={view.id === p.id ? "page" : undefined} onClick={() => setOpen(false)}>
                    <Icon name={p.icon} size={16} />{tl(p.view!.title[0], p.view!.title[1]).replace(/\s*\((حرفه‌ای|pro)\)$/i, "")}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </header>
      <div className="factory-body">{children}</div>
    </div>
  );
}

/** A small "?" that shows a short help text on hover, focus or tap, instead of a paragraph on the page. */
export function Hint({ text, label }: { text: string; label?: string }) {
  return (
    <span className="hint" tabIndex={0} role="note" aria-label={label ? `${label}: ${text}` : text} data-tip={text}>
      <Icon name="CircleHelp" size={15} />
    </span>
  );
}
