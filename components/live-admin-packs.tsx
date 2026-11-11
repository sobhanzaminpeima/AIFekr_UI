"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Industry packs on aifekr.com (/api/admin/industry-packs): the classic
 * page's fields (name, slug, emoji, tagline, tier, colour, price, order),
 * show/hide and delete, in the design's cards.
 */
type Tx = [string, string, string, string];
type Pack = { id?: string; slug: string; name: string; emoji: string; tagline: string; tier: string; price: number; color: string; isActive: boolean; sortOrder: number; _count?: { users: number; companies: number } };

export function LiveIndustryPacks() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Pack | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/industry-packs", { credentials: "include" }); const d = await r.json(); if (!r.ok) throw Error(d.error || ""); setPacks(d.packs ?? []); }
    catch (e) { setPacks([]); toast.error((e instanceof Error && e.message) || tx(["خطا در دریافت بسته‌ها", "Could not load packs", "Pakete konnten nicht geladen werden", "Paketler yüklenemedi"])); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!edit) return;
    if (!edit.name.trim() || (!edit.id && !edit.slug.trim())) return toast.error(tx(["نام و شناسهٔ بسته الزامی است", "Name and slug are required", "Name und Slug sind erforderlich", "Ad ve kısa ad gerekli"]));
    setBusy(true);
    try {
      const r = await fetch("/api/admin/industry-packs", { method: edit.id ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(edit.id ? tx(["بسته ویرایش شد", "Pack updated", "Paket aktualisiert", "Paket güncellendi"]) : tx(["بسته ایجاد شد", "Pack created", "Paket erstellt", "Paket oluşturuldu"]));
      setEdit(null); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setBusy(false); }
  }
  async function toggle(p: Pack) { const r = await fetch("/api/admin/industry-packs", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, isActive: !p.isActive }) }); if (r.ok) await load(); }
  async function remove(p: Pack) {
    if (!confirm(tx(["این بسته حذف شود؟", "Delete this pack?", "Dieses Paket löschen?", "Bu paket silinsin mi?"]))) return;
    const r = await fetch("/api/admin/industry-packs?id=" + encodeURIComponent(p.id!), { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success(tx(["حذف شد", "Deleted", "Gelöscht", "Silindi"])); await load(); } else toast.error(tx(["خطا در حذف", "Could not delete", "Löschen fehlgeschlagen", "Silinemedi"]));
  }
  const visible = (packs ?? []).filter((p) => p.name.includes(q) || p.slug.includes(q));
  const text = (k: keyof Pack, label: Tx, ltr = false, disabled = false) => edit && <label key={k}>{tx(label)}<input dir={ltr ? "ltr" : undefined} disabled={disabled} value={String(edit[k] ?? "")} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></label>;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Boxes" size={28} /></span>
        <div>
          <h2>{tx(["بسته‌های صنعتی", "Industry packs", "Branchenpakete", "Sektör paketleri"])}</h2>
          <p>{packs ? n(packs.length) + " " + tx(["بسته", "packs", "Pakete", "paket"]) : ""}</p>
        </div>
        <Button variant="primary" onClick={() => setEdit({ slug: "", name: "", emoji: "🏢", tagline: "", tier: "professional", price: 299, color: "#ea580c", isActive: true, sortOrder: 0 })}><Icon name="Plus" size={16} />{tx(["بستهٔ جدید", "New pack", "Neues Paket", "Yeni paket"])}</Button>
      </div>
      <div className="domain-toolbar"><label>{tx(["جست‌وجو", "Search", "Suche", "Ara"])}<input value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      <div className="tool-grid" aria-busy={!packs}>
        {visible.map((p) => (
          <article className={"panel admin-category-card" + (p.isActive ? "" : " inactive")} key={p.id} style={{ ["--cat" as string]: p.color }}>
            <div className="row-between"><span className="admin-category-icon">{p.emoji}</span><span className="badge">{p.tier}</span></div>
            <h3>{p.name}</h3>
            <small dir="ltr">{p.slug}</small>
            {p.tagline && <p className="fine-print">{p.tagline}</p>}
            <dl className="domain-detail">
              <div><dt>{tx(["قیمت", "Price", "Preis", "Fiyat"])}</dt><dd>{n(p.price)}</dd></div>
              <div><dt>{tx(["کاربران / شرکت‌ها", "Users / companies", "Nutzer / Firmen", "Kullanıcı / şirket"])}</dt><dd>{n(p._count?.users ?? 0)} / {n(p._count?.companies ?? 0)}</dd></div>
            </dl>
            <label className="toggle-row"><span>{tx(["فعال", "Active", "Aktiv", "Aktif"])}</span><input type="checkbox" checked={p.isActive} onChange={() => void toggle(p)} /></label>
            <div className="domain-actions">
              <Button onClick={() => setEdit({ ...p })}>{tx(["ویرایش", "Edit", "Bearbeiten", "Düzenle"])}</Button>
              <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(p)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
      {packs && !visible.length && <Empty />}
      {edit && (
        <Modal title={edit.id ? tx(["ویرایش بسته", "Edit pack", "Paket bearbeiten", "Paketi düzenle"]) : tx(["بستهٔ جدید", "New pack", "Neues Paket", "Yeni paket"])} onClose={() => setEdit(null)}>
          <form className="admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              {text("name", ["نام", "Name", "Name", "Ad"])}
              {text("slug", ["شناسه (slug)", "Slug", "Slug", "Kısa ad"], true, !!edit.id)}
              {text("emoji", ["ایموجی", "Emoji", "Emoji", "Emoji"])}
              {text("tagline", ["شعار کوتاه", "Tagline", "Slogan", "Slogan"])}
              {text("tier", ["سطح", "Tier", "Stufe", "Seviye"], true)}
              <label>{tx(["رنگ", "Color", "Farbe", "Renk"])}<input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></label>
              <label>{tx(["قیمت", "Price", "Preis", "Fiyat"])}<input type="number" min={0} dir="ltr" value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} /></label>
              <label>{tx(["ترتیب نمایش", "Sort order", "Reihenfolge", "Sıra"])}<input type="number" dir="ltr" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: +e.target.value })} /></label>
            </div>
            <label className="toggle-row"><span>{tx(["فعال", "Active", "Aktiv", "Aktif"])}</span><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /></label>
            <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
