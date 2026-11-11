"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downscaleImage } from "@/lib/image-downscale";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * The ready-prompt library on aifekr.com (main site /api/admin/prompts): the
 * classic page's tool tabs, categories, three languages, guide text and
 * thumbnail upload (/api/upload), in the design's cards.
 */
type Prompt = { id: string; title: string; titleEn: string | null; titleDe: string | null; content: string; contentEn: string | null; contentDe: string | null; category: string; toolType: string; thumbnailUrl: string | null; guideFa: string | null; guideEn: string | null; guideDe: string | null; isActive: boolean; sortOrder: number };
type Tx = [string, string, string, string];
const TOOLS: [string, Tx][] = [["chat", ["چت", "Chat", "Chat", "Sohbet"]], ["image", ["تولید تصویر", "Image generation", "Bilderstellung", "Görsel üretimi"]], ["video", ["تولید ویدیو", "Video generation", "Videoerstellung", "Video üretimi"]]];
const CATEGORIES = ["عمومی", "کسب‌وکار", "آموزش", "سلامت", "فناوری", "هنر و خلاقیت", "سفر", "مالی", "halloween"];
const EMPTY = { title: "", titleEn: "", titleDe: "", content: "", contentEn: "", contentDe: "", category: "عمومی", toolType: "chat", thumbnailUrl: "", guideFa: "", guideEn: "", guideDe: "" };
type Form = typeof EMPTY;

export function LiveAdminPrompts() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [tool, setTool] = useState("chat");
  const [prompts, setPrompts] = useState<Prompt[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setPrompts(null);
    try { const r = await fetch("/api/admin/prompts?toolType=" + tool, { credentials: "include" }); setPrompts(r.ok ? (await r.json()).prompts ?? [] : []); }
    catch { setPrompts([]); toast.error(tx(["خطا در بارگذاری", "Could not load", "Laden fehlgeschlagen", "Yüklenemedi"])); }
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function call(method: string, body: unknown) {
    const r = await fetch("/api/admin/prompts", { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(out.error || "");
  }
  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.content.trim()) return toast.error(tx(["عنوان و محتوای فارسی الزامی است", "The Persian title and content are required", "Persischer Titel und Inhalt sind erforderlich", "Farsça başlık ve içerik gerekli"]));
    setBusy(true);
    try {
      await call(editing ? "PUT" : "POST", editing ? { id: editing.id, ...form } : form);
      toast.success(editing ? tx(["پرامپت به‌روز شد", "Prompt updated", "Prompt aktualisiert", "İstem güncellendi"]) : tx(["پرامپت اضافه شد", "Prompt added", "Prompt hinzugefügt", "İstem eklendi"]));
      setForm(null); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا در ذخیره", "Could not save", "Speichern fehlgeschlagen", "Kaydedilemedi"])); }
    finally { setBusy(false); }
  }
  async function toggle(p: Prompt) { try { await call("PUT", { id: p.id, isActive: !p.isActive }); await load(); } catch { toast.error(tx(["تغییر انجام نشد", "Not changed", "Nicht geändert", "Değiştirilmedi"])); } }
  async function remove(p: Prompt) {
    if (!confirm(tx(["این پرامپت برای همیشه حذف شود؟", "Delete this prompt permanently?", "Diesen Prompt endgültig löschen?", "Bu istem kalıcı olarak silinsin mi?"]))) return;
    try { await call("DELETE", { id: p.id }); toast.success(tx(["حذف شد", "Deleted", "Gelöscht", "Silindi"])); await load(); } catch { toast.error(tx(["حذف انجام نشد", "Not deleted", "Nicht gelöscht", "Silinemedi"])); }
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !form) return;
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", await downscaleImage(f));
      const r = await fetch("/api/upload", { method: "POST", credentials: "include", body });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(out.error || "");
      setForm((p) => (p ? { ...p, thumbnailUrl: out.url } : p));
    } catch (err) { toast.error((err instanceof Error && err.message) || tx(["خطا در آپلود تصویر", "Image upload failed", "Bild-Upload fehlgeschlagen", "Görsel yüklenemedi"])); }
    finally { setUploading(false); if (file.current) file.current.value = ""; }
  }
  const open = (p?: Prompt) => {
    setEditing(p ?? null);
    setForm(p ? { title: p.title, titleEn: p.titleEn || "", titleDe: p.titleDe || "", content: p.content, contentEn: p.contentEn || "", contentDe: p.contentDe || "", category: p.category, toolType: p.toolType, thumbnailUrl: p.thumbnailUrl || "", guideFa: p.guideFa || "", guideEn: p.guideEn || "", guideDe: p.guideDe || "" } : { ...EMPTY, toolType: tool });
  };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((p) => (p ? { ...p, [k]: e.target.value } : p));
  const title = (p: Prompt) => (i === 0 ? p.title : i === 2 ? p.titleDe || p.titleEn || p.title : p.titleEn || p.title);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="WandSparkles" size={28} /></span>
        <div>
          <h2>{tx(["کتابخانهٔ پرامپت‌های آماده", "Ready prompt library", "Prompt-Bibliothek", "Hazır istem kütüphanesi"])}</h2>
          <p>{tx(["پرامپت‌هایی که کاربران در چت، تولید تصویر و ویدیو با یک کلیک استفاده می‌کنند.", "Prompts users pick with one click in chat, image and video generation.", "Prompts, die Nutzer im Chat, bei Bildern und Videos mit einem Klick wählen.", "Kullanıcıların sohbette, görsel ve video üretiminde tek tıkla seçtiği istemler."])}</p>
        </div>
        <Button variant="primary" onClick={() => open()}><Icon name="Plus" size={16} />{tx(["پرامپت تازه", "New prompt", "Neuer Prompt", "Yeni istem"])}</Button>
      </div>
      <nav className="module-tabs">
        {TOOLS.map(([k, label]) => <button key={k} className={tool === k ? "selected" : ""} aria-pressed={tool === k} onClick={() => setTool(k)}>{tx(label)}</button>)}
      </nav>
      <p className="fine-print">{prompts ? n(prompts.length) + " " + tx(["پرامپت", "prompts", "Prompts", "istem"]) + " · " + n(prompts.filter((p) => p.isActive).length) + " " + tx(["فعال", "active", "aktiv", "aktif"]) : ""}</p>
      <div className="tool-grid" aria-busy={!prompts}>
        {prompts?.map((p) => (
          <article className={"panel admin-prompt-card" + (p.isActive ? "" : " inactive")} key={p.id}>
            {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" loading="lazy" /> : <span className="icon-chip orange"><Icon name="Sparkles" /></span>}
            <div className="row-between"><h3>{title(p)}</h3><span className="badge">{p.category}</span></div>
            <p dir="auto">{p.content}</p>
            <label className="toggle-row"><span>{tx(["نمایش به کاربران", "Shown to users", "Für Nutzer sichtbar", "Kullanıcılara görünür"])}</span><input type="checkbox" checked={p.isActive} onChange={() => void toggle(p)} /></label>
            <div className="domain-actions">
              <Button onClick={() => open(p)}>{tx(["ویرایش", "Edit", "Bearbeiten", "Düzenle"])}</Button>
              <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(p)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
      {prompts && !prompts.length && <Empty />}
      {form && (
        <Modal title={editing ? tx(["ویرایش پرامپت", "Edit prompt", "Prompt bearbeiten", "İstemi düzenle"]) : tx(["پرامپت تازه", "New prompt", "Neuer Prompt", "Yeni istem"])} onClose={() => setForm(null)}>
          <form className="admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              <label>{tx(["ابزار", "Tool", "Werkzeug", "Araç"])}<select value={form.toolType} onChange={set("toolType")}>{TOOLS.map(([k, label]) => <option key={k} value={k}>{tx(label)}</option>)}</select></label>
              <label>{tx(["دسته", "Category", "Kategorie", "Kategori"])}<select value={form.category} onChange={set("category")}>{(CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]).map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>{tx(["عنوان فارسی", "Persian title", "Persischer Titel", "Farsça başlık"])} *<input required value={form.title} onChange={set("title")} /></label>
              <label>{tx(["عنوان انگلیسی", "English title", "Englischer Titel", "İngilizce başlık"])}<input dir="ltr" value={form.titleEn} onChange={set("titleEn")} /></label>
              <label>{tx(["عنوان آلمانی", "German title", "Deutscher Titel", "Almanca başlık"])}<input dir="ltr" value={form.titleDe} onChange={set("titleDe")} /></label>
            </div>
            <label>{tx(["متن پرامپت فارسی", "Persian prompt", "Persischer Prompt", "Farsça istem"])} *<textarea required rows={4} value={form.content} onChange={set("content")} /></label>
            <label>{tx(["متن انگلیسی", "English prompt", "Englischer Prompt", "İngilizce istem"])}<textarea rows={3} dir="ltr" value={form.contentEn} onChange={set("contentEn")} /></label>
            <label>{tx(["متن آلمانی", "German prompt", "Deutscher Prompt", "Almanca istem"])}<textarea rows={3} dir="ltr" value={form.contentDe} onChange={set("contentDe")} /></label>
            <div className="domain-fields">
              <label>{tx(["راهنمای فارسی", "Persian guide", "Persische Anleitung", "Farsça rehber"])}<textarea rows={2} value={form.guideFa} onChange={set("guideFa")} /></label>
              <label>{tx(["راهنمای انگلیسی", "English guide", "Englische Anleitung", "İngilizce rehber"])}<textarea rows={2} dir="ltr" value={form.guideEn} onChange={set("guideEn")} /></label>
              <label>{tx(["راهنمای آلمانی", "German guide", "Deutsche Anleitung", "Almanca rehber"])}<textarea rows={2} dir="ltr" value={form.guideDe} onChange={set("guideDe")} /></label>
            </div>
            <div className="admin-prompt-thumb">
              {form.thumbnailUrl && <img src={form.thumbnailUrl} alt="" />}
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void upload(e)} />
              <Button disabled={uploading} onClick={() => file.current?.click()}><Icon name="ImagePlus" size={16} />{uploading ? tx(["در حال آپلود…", "Uploading…", "Wird hochgeladen…", "Yükleniyor…"]) : tx(["تصویر کوچک", "Thumbnail", "Vorschaubild", "Küçük görsel"])}</Button>
              {form.thumbnailUrl && <Button onClick={() => setForm({ ...form, thumbnailUrl: "" })}>{tx(["حذف تصویر", "Remove image", "Bild entfernen", "Görseli kaldır"])}</Button>}
            </div>
            <Button type="submit" variant="primary" disabled={busy || uploading}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
