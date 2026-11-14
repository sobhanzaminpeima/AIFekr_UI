"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";

type Item = { kind: string; id: string; title: string; createdAt: string; openAt: string };
type Q = [string, string, string, string];

const KIND: Record<string, Q> = {
  image: ["تصویر", "Image", "Bild", "Görsel"],
  video: ["ویدیو", "Video", "Video", "Video"],
  music: ["موسیقی", "Music", "Musik", "Müzik"],
  voice: ["صدا", "Voice", "Stimme", "Ses"],
  seo: ["سئو", "SEO", "SEO", "SEO"],
  website: ["وب‌سایت", "Website", "Website", "Web sitesi"],
};
const UI: Record<string, Q> = {
  title: ["آخرین ساخته‌ها در همهٔ ماژول‌ها", "Latest creations across modules", "Neueste Werke aller Module", "Tüm modüllerdeki son üretimler"],
  open: ["باز کردن", "Open", "Öffnen", "Aç"],
  empty: ["هنوز چیزی نساخته‌ای.", "Nothing made yet.", "Noch nichts erstellt.", "Henüz bir şey üretilmedi."],
  failed: ["فهرست خوانده نشد.", "Could not load.", "Konnte nicht laden.", "Yüklenemedi."],
};

/** E1, first slice: one newest-first list of everything the account made, each opening where it lives. */
export function CreationLibrary() {
  const { locale } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/library", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { items: Item[] }) => setItems(d.items))
      .catch(() => setFailed(true));
  }, []);
  const when = (v: string) => new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : locale, { dateStyle: "medium" }).format(new Date(v));
  if (failed) return <p role="alert">{UI.failed[i]}</p>;
  if (!items) return null;
  return (
    <section className="panel">
      <h3>{UI.title[i]}</h3>
      {!items.length ? <p className="crm-empty">{UI.empty[i]}</p> : items.slice(0, 12).map((it) => (
        <div className="domain-card row-between" key={it.kind + it.id}>
          <div>
            <span className="badge">{KIND[it.kind]?.[i] ?? it.kind}</span> <strong>{it.title || "—"}</strong>
            <p className="muted">{when(it.createdAt)}</p>
          </div>
          <a className="btn" href={it.openAt}>{UI.open[i]}</a>
        </div>
      ))}
    </section>
  );
}
