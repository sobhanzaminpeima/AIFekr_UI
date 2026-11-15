"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { Button, Modal } from "./ui";

type Post = { id: string; caption: string; hashtags: string; imageUrl: string | null; videoUrl: string | null; scheduledFor: string; mode: string; status: string; errorMessage: string | null };
type Q = [string, string, string, string];
const IG = "/api/social/instagram/";

const L: Record<string, Q> = {
  title: ["تقویم انتشار", "Publishing calendar", "Veröffentlichungskalender", "Yayın takvimi"],
  hint: ["پست در صف را به روز دیگری بکشید تا زمانش عوض شود؛ برای ویرایش رویش بزنید.", "Drag a waiting post to another day to move it; tap it to edit.", "Wartenden Beitrag auf einen anderen Tag ziehen, um ihn zu verschieben; zum Bearbeiten antippen.", "Bekleyen gönderiyi başka güne sürükleyerek taşıyın; düzenlemek için dokunun."],
  prev: ["ماه قبل", "Previous month", "Vorheriger Monat", "Önceki ay"],
  next: ["ماه بعد", "Next month", "Nächster Monat", "Sonraki ay"],
  edit: ["ویرایش پست", "Edit post", "Beitrag bearbeiten", "Gönderiyi düzenle"],
  caption: ["کپشن", "Caption", "Bildunterschrift", "Açıklama"],
  hashtags: ["هشتگ‌ها", "Hashtags", "Hashtags", "Hashtag'ler"],
  when: ["زمان انتشار", "Publish at", "Veröffentlichen am", "Yayın zamanı"],
  image: ["تصویر", "Image", "Bild", "Görsel"],
  upload: ["بارگذاری تصویر", "Upload image", "Bild hochladen", "Görsel yükle"],
  save: ["ذخیره", "Save", "Speichern", "Kaydet"],
  saved: ["ذخیره شد.", "Saved.", "Gespeichert.", "Kaydedildi."],
  noStorage: ["فضای ذخیرهٔ عمومی تنظیم نشده؛ اینستاگرام به لینک عمومی تصویر نیاز دارد. لینک یک تصویر عمومی را وارد کنید.", "Public storage is not set up, and Instagram needs a public image link. Paste the link of a public image instead.", "Öffentlicher Speicher fehlt; Instagram braucht einen öffentlichen Bildlink. Fügen Sie einen öffentlichen Bildlink ein.", "Genel depolama kurulu değil; Instagram herkese açık görsel bağlantısı ister. Herkese açık bir görsel bağlantısı yapıştırın."],
  locked: ["این پست دیگر در صف نیست و تغییر نمی‌کند.", "This post is no longer waiting and cannot change.", "Dieser Beitrag wartet nicht mehr und kann nicht geändert werden.", "Bu gönderi artık beklemede değil, değiştirilemez."],
  failed: ["تقویم خوانده نشد.", "Could not load the calendar.", "Kalender nicht ladbar.", "Takvim yüklenemedi."],
};
const ERRORS: Record<string, Q> = {
  PAST_TIME: ["زمان انتخابی گذشته است.", "That time has passed.", "Dieser Zeitpunkt ist vorbei.", "Bu zaman geçti."],
  NOT_PENDING: L.locked,
  AUTO_NEEDS_MEDIA: ["انتشار خودکار به تصویر یا ویدیو نیاز دارد.", "Automatic publishing needs an image or video.", "Automatisches Veröffentlichen braucht Bild oder Video.", "Otomatik yayın görsel veya video ister."],
  MEDIA_NOT_PUBLIC: ["لینک رسانه باید یک آدرس عمومی https باشد.", "The media link must be a public https address.", "Der Medienlink muss eine öffentliche https-Adresse sein.", "Medya bağlantısı herkese açık bir https adresi olmalı."],
  EMPTY_CAPTION: ["کپشن خالی است.", "The caption is empty.", "Die Bildunterschrift ist leer.", "Açıklama boş."],
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
/** The month's grid, Saturday first for Persian and Monday first otherwise, as whole weeks. */
export function monthGrid(year: number, month: number, weekStartsOn: number): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(year, month, 1 - lead);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
/** The same time of day, on the day the post was dropped on. */
export function moveToDay(original: string, day: Date): Date {
  const o = new Date(original);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), o.getHours(), o.getMinutes());
}

export function SocialCalendar() {
  const { locale } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const fa = locale === "fa";
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const load = useCallback(() => {
    fetch(IG + "status", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { posts?: Post[] }) => setPosts(d.posts ?? []))
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);
  const grid = useMemo(() => monthGrid(cursor.y, cursor.m, fa ? 6 : 1), [cursor, fa]);
  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts ?? []) { const k = dayKey(new Date(p.scheduledFor)); m.set(k, [...(m.get(k) ?? []), p]); }
    return m;
  }, [posts]);
  async function patch(id: string, body: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(IG + "schedule/" + encodeURIComponent(id), { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage({ ok: false, text: ERRORS[d.code]?.[i] ?? String(d.error ?? res.status) }); return false; }
    setMessage({ ok: true, text: L.saved[i] });
    load();
    return true;
  }
  const monthName = new Intl.DateTimeFormat(fa ? "fa-IR" : locale, { month: "long", year: "numeric" }).format(new Date(cursor.y, cursor.m, 15));
  const dayNumber = (d: Date) => new Intl.DateTimeFormat(fa ? "fa-IR" : locale, { day: "numeric" }).format(d);
  const time = (v: string) => new Intl.DateTimeFormat(fa ? "fa-IR" : locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(v));
  return (
    <section className="panel">
      <div className="row-between">
        <h3>{L.title[i]}</h3>
        <div className="domain-actions">
          <Button onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>{L.prev[i]}</Button>
          <strong>{monthName}</strong>
          <Button onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>{L.next[i]}</Button>
        </div>
      </div>
      <p className="muted">{L.hint[i]}</p>
      {failed && <p role="alert">{L.failed[i]}</p>}
      {message && <p role={message.ok ? "status" : "alert"}>{message.text}</p>}
      <div className="ig-calendar" role="grid">
        {grid.map((day) => {
          const list = byDay.get(dayKey(day)) ?? [];
          const outside = day.getMonth() !== cursor.m;
          return (
            <div key={day.toISOString()} role="gridcell" className={"ig-day" + (outside ? " outside" : "")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); const p = posts?.find((x) => x.id === id); if (p) void patch(id, { scheduledFor: moveToDay(p.scheduledFor, day).toISOString() }); }}>
              <small>{dayNumber(day)}</small>
              {list.map((p) => (
                <button type="button" key={p.id} className={"ig-chip " + p.status.toLowerCase()} draggable={p.status === "PENDING"}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)} onClick={() => setEditing(p)} title={p.caption}>
                  {time(p.scheduledFor)} · {p.caption.slice(0, 24)}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {editing && <PostEditor post={editing} i={i} onClose={() => setEditing(null)} onSave={async (body) => { if (await patch(editing.id, body)) setEditing(null); }} />}
    </section>
  );
}

function PostEditor({ post, i, onClose, onSave }: { post: Post; i: number; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const local = (v: string) => { const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const [f, setF] = useState({ caption: post.caption, hashtags: post.hashtags, imageUrl: post.imageUrl ?? "", when: local(post.scheduledFor) });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = post.status !== "PENDING";
  async function upload(file: File) {
    setBusy(true); setNote("");
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(String(d.error ?? res.status));
      if (typeof d.url !== "string" || !d.url.startsWith("https://")) { setNote(L.noStorage[i]); return; }
      setF((v) => ({ ...v, imageUrl: d.url }));
    } catch (e) { setNote(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={L.edit[i]} onClose={onClose}>
      {locked ? <p>{L.locked[i]}</p> : (
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); void onSave({ caption: f.caption, hashtags: f.hashtags, imageUrl: f.imageUrl, scheduledFor: new Date(f.when).toISOString() }); }}>
          <label className="span-2">{L.caption[i]}<textarea required rows={4} value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></label>
          <label>{L.hashtags[i]}<input value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></label>
          <label>{L.when[i]}<input type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
          <label className="span-2">{L.image[i]}<input type="url" dir="ltr" value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} /></label>
          <label className="span-2">{L.upload[i]}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
          {note && <p className="span-2" role="alert">{note}</p>}
          <Button type="submit" variant="primary" disabled={busy}>{L.save[i]}</Button>
        </form>
      )}
    </Modal>
  );
}
