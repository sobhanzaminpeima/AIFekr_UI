"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Business categories and companies on aifekr.com, in the design's cards:
 * /api/admin/categories (create, edit, show/hide, delete) and
 * /api/admin/companies (read-only), as on the classic pages.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i] }; };

type Category = { id?: string; name: string; nameEn: string; icon: string; color: string; isActive: boolean; sortOrder: number; _count?: { companies: number } };

export function LiveAdminCategories() {
  const { n, i, tx } = useTx();
  const [cats, setCats] = useState<Category[] | null>(null);
  const [edit, setEdit] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/admin/categories", { credentials: "include" }); setCats(r.ok ? (await r.json()).categories ?? [] : []); }, []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/categories", { method: edit.id ? "PUT" : "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); setEdit(null); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setBusy(false); }
  }
  async function toggle(c: Category) { await fetch("/api/admin/categories", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) }); await load(); }
  async function remove(c: Category) {
    if (!confirm(tx(["این دسته‌بندی حذف شود؟", "Delete this category?", "Diese Kategorie löschen?", "Bu kategori silinsin mi?"]))) return;
    const r = await fetch("/api/admin/categories?id=" + encodeURIComponent(c.id!), { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success(tx(["حذف شد", "Deleted", "Gelöscht", "Silindi"])); await load(); } else toast.error(tx(["خطا در حذف", "Could not delete", "Löschen fehlgeschlagen", "Silinemedi"]));
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Tags" size={28} /></span>
        <div>
          <h2>{tx(["دسته‌بندی کسب‌وکار", "Business categories", "Branchenkategorien", "İşletme kategorileri"])}</h2>
          <p>{cats ? n(cats.length) + " " + tx(["دسته‌بندی", "categories", "Kategorien", "kategori"]) : ""}</p>
        </div>
        <Button variant="primary" onClick={() => setEdit({ name: "", nameEn: "", icon: "🏢", color: "#ea580c", isActive: true, sortOrder: 0 })}><Icon name="Plus" size={16} />{tx(["دسته‌بندی تازه", "New category", "Neue Kategorie", "Yeni kategori"])}</Button>
      </div>
      <div className="tool-grid" aria-busy={!cats}>
        {cats?.map((c) => (
          <article className={"panel admin-category-card" + (c.isActive ? "" : " inactive")} key={c.id} style={{ ["--cat" as string]: c.color }}>
            <div className="row-between"><span className="admin-category-icon">{c.icon}</span><span className="badge">{n(c._count?.companies ?? 0)} {tx(["شرکت", "companies", "Firmen", "şirket"])}</span></div>
            <h3>{i === 0 ? c.name : c.nameEn || c.name}</h3>
            <small>{i === 0 ? c.nameEn : c.name}</small>
            <label className="toggle-row"><span>{tx(["فعال", "Active", "Aktiv", "Aktif"])}</span><input type="checkbox" checked={c.isActive} onChange={() => void toggle(c)} /></label>
            <div className="domain-actions">
              <Button onClick={() => setEdit({ ...c })}>{tx(["ویرایش", "Edit", "Bearbeiten", "Düzenle"])}</Button>
              <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(c)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
      {cats && !cats.length && <Empty />}
      {edit && (
        <Modal title={edit.id ? tx(["ویرایش دسته‌بندی", "Edit category", "Kategorie bearbeiten", "Kategoriyi düzenle"]) : tx(["دسته‌بندی تازه", "New category", "Neue Kategorie", "Yeni kategori"])} onClose={() => setEdit(null)}>
          <form className="admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <div className="domain-fields">
              <label>{tx(["نام فارسی", "Persian name", "Persischer Name", "Farsça ad"])}<input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
              <label>{tx(["نام انگلیسی", "English name", "Englischer Name", "İngilizce ad"])}<input dir="ltr" value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} /></label>
              <label>{tx(["آیکون (ایموجی)", "Icon (emoji)", "Symbol (Emoji)", "Simge (emoji)"])}<input value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} /></label>
              <label>{tx(["رنگ", "Color", "Farbe", "Renk"])}<input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></label>
              <label>{tx(["ترتیب نمایش", "Sort order", "Reihenfolge", "Sıra"])}<input type="number" dir="ltr" value={edit.sortOrder || 0} onChange={(e) => setEdit({ ...edit, sortOrder: +e.target.value })} /></label>
            </div>
            <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

type Company = { id: string; name: string; industry: string; website?: string; phone?: string; email?: string; size?: string; isActive: boolean; createdAt: string; user: { name?: string; email?: string; phone?: string } | null; industryPack?: { name: string; emoji: string } | null; category?: { name: string } | null };

export function LiveAdminCompanies() {
  const { n, tx } = useTx();
  const [rows, setRows] = useState<Company[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { fetch("/api/admin/companies", { credentials: "include" }).then((r) => (r.ok ? r.json() : { companies: [] })).then((d) => setRows(d.companies ?? [])).catch(() => setRows([])); }, []);
  const term = q.toLowerCase();
  const visible = (rows ?? []).filter((c) => (c.name + " " + (c.user?.name || "") + " " + c.industry).toLowerCase().includes(term));
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Building2" size={28} /></span>
        <div>
          <h2>{tx(["شرکت‌ها و کسب‌وکارها", "Companies", "Unternehmen", "Şirketler"])}</h2>
          <p>{rows ? n(rows.length) + " " + tx(["شرکت", "companies", "Unternehmen", "şirket"]) : ""}</p>
        </div>
        <Link className="btn" href="/admin/categories">{tx(["دسته‌بندی‌ها", "Categories", "Kategorien", "Kategoriler"])}</Link>
      </div>
      <div className="domain-toolbar"><label>{tx(["جست‌وجو", "Search", "Suche", "Ara"])}<input value={q} placeholder={tx(["نام شرکت، صاحب یا صنعت", "Company, owner or industry", "Firma, Inhaber oder Branche", "Şirket, sahip veya sektör"])} onChange={(e) => setQ(e.target.value)} /></label></div>
      <div className="tool-grid" aria-busy={!rows}>
        {visible.map((c) => (
          <article className="panel admin-customer-card" key={c.id}>
            <div className="row-between"><span className="icon-chip orange"><Icon name="Building2" /></span><span className={"badge " + (c.isActive ? "green" : "red")}>{c.isActive ? tx(["فعال", "Active", "Aktiv", "Aktif"]) : tx(["غیرفعال", "Inactive", "Inaktiv", "Pasif"])}</span></div>
            <h3>{c.name}</h3>
            <p>{c.industry}{c.size ? " · " + c.size : ""}</p>
            <div className="domain-actions">
              {c.industryPack && <span className="badge orange">{c.industryPack.emoji} {c.industryPack.name}</span>}
              {c.category && <span className="badge">{c.category.name}</span>}
            </div>
            <dl className="domain-detail">
              <div><dt>{tx(["صاحب حساب", "Owner", "Inhaber", "Sahip"])}</dt><dd>{c.user?.name || c.user?.email || c.user?.phone || "—"}</dd></div>
              {c.email && <div><dt>{tx(["ایمیل", "Email", "E-Mail", "E-posta"])}</dt><dd dir="ltr">{c.email}</dd></div>}
              {c.phone && <div><dt>{tx(["تلفن", "Phone", "Telefon", "Telefon"])}</dt><dd dir="ltr">{c.phone}</dd></div>}
              {c.website && <div><dt>{tx(["وب‌سایت", "Website", "Website", "Web sitesi"])}</dt><dd dir="ltr"><a href={/^https?:\/\//.test(c.website) ? c.website : "https://" + c.website} target="_blank" rel="noopener noreferrer nofollow">{c.website}</a></dd></div>}
            </dl>
          </article>
        ))}
      </div>
      {rows && !visible.length && <Empty />}
    </>
  );
}
