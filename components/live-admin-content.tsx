"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/**
 * Generated websites (/api/admin/generated-websites, preview via the classic
 * preview endpoint) and Meta Lead Ads connector requests
 * (/api/admin/lead-connectors) on aifekr.com. Page tokens are write-only.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i], date: (iso: string | null) => (iso ? new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" }) : "—") }; };

type Site = { id: string; businessName: string; industry: string | null; sizeKb: number; createdAt: string; user: { id: string; name: string | null; phone: string | null; email: string | null } | null };

export function LiveGeneratedWebsites() {
  const { n, tx, date } = useTx();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ websites: Site[]; total: number; totalPages: number } | null>(null);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    const r = await fetch("/api/admin/generated-websites?" + new URLSearchParams({ q: q.trim(), page: String(page) }), { credentials: "include" });
    const d = r.ok ? await r.json() : { websites: [], total: 0, totalPages: 1 };
    if (mine === seq.current) setData(d);
  }, [q, page]);
  useEffect(() => { const t = setTimeout(() => void load(), 300); return () => clearTimeout(t); }, [load]);
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Globe" size={28} /></span>
        <div>
          <h2>{tx(["وب‌سایت‌های تولیدشده", "Generated websites", "Erstellte Websites", "Üretilen web siteleri"])}</h2>
          <p>{data ? n(data.total) + " " + tx(["وب‌سایت", "websites", "Websites", "web sitesi"]) : ""}</p>
        </div>
      </div>
      <div className="domain-toolbar"><label>{tx(["جست‌وجو", "Search", "Suche", "Ara"])}<input value={q} placeholder={tx(["نام کسب‌وکار", "Business name", "Firmenname", "İşletme adı"])} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label></div>
      <section className="panel" aria-busy={!data}>
        {data?.websites.length ? (
          <div className="table-scroll"><table className="admin-finance-table">
            <thead><tr>{[tx(["نام کسب‌وکار", "Business", "Firma", "İşletme"]), tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["صنعت", "Industry", "Branche", "Sektör"]), tx(["حجم کد", "Code size", "Codegröße", "Kod boyutu"]), tx(["تاریخ ساخت", "Created", "Erstellt", "Oluşturma"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>{data.websites.map((w) => (
              <tr key={w.id}>
                <td><strong>{w.businessName}</strong></td>
                <td>{w.user ? <Link href={"/admin/users/" + encodeURIComponent(w.user.id)}>{w.user.name || w.user.phone || w.user.email}</Link> : tx(["ناشناس", "Unknown", "Unbekannt", "Bilinmiyor"])}</td>
                <td>{w.industry || "—"}</td>
                <td dir="ltr">{n(w.sizeKb)} KB</td>
                <td>{date(w.createdAt)}</td>
                <td><a className="btn" href={"/api/admin/generated-websites/" + encodeURIComponent(w.id) + "/preview"} target="_blank" rel="noopener noreferrer">{tx(["پیش‌نمایش", "Preview", "Vorschau", "Önizleme"])} ↗</a></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : data && <Empty />}
        {data && data.totalPages > 1 && (
          <div className="pagination"><span /><div>
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button>
            <span>{n(page)} / {n(data.totalPages)}</span>
            <Button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button>
          </div></div>
        )}
      </section>
    </>
  );
}

type Row = { id: string; userId: string; userLabel: string; userName: string | null; externalId: string; name: string; status: string; lastError: string | null; leadsImported: number; lastLeadAt: string | null; hasToken: boolean; createdAt: string };

export function LiveLeadConnectors() {
  const { n, tx, date } = useTx();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState<Record<string, { pageId: string; pageToken: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const load = useCallback(async () => { try { const r = await fetch("/api/admin/lead-connectors", { credentials: "include" }); setRows(r.ok ? (await r.json()).rows ?? [] : []); } catch { setRows([]); toast.error(tx(["خطا در بارگذاری", "Could not load", "Laden fehlgeschlagen", "Yüklenemedi"])); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  async function fulfill(id: string) {
    const f = form[id];
    if (!f?.pageId?.trim() || !f?.pageToken?.trim()) return toast.error(tx(["Page ID و Page Token را وارد کنید", "Enter the Page ID and Page token", "Page-ID und Page-Token eingeben", "Page ID ve Page token girin"]));
    setSaving(id);
    try {
      const r = await fetch("/api/admin/lead-connectors", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, pageId: f.pageId.trim(), pageToken: f.pageToken.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || "");
      toast.success(d.warn || tx(["اتصال فعال شد", "Connection activated", "Verbindung aktiviert", "Bağlantı etkinleştirildi"]));
      setForm((p) => ({ ...p, [id]: { pageId: "", pageToken: "" } })); await load();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا", "Error", "Fehler", "Hata"])); }
    finally { setSaving(null); }
  }
  async function remove(id: string) {
    if (!confirm(tx(["این ردیف حذف شود؟", "Delete this row?", "Diese Zeile löschen?", "Bu satır silinsin mi?"]))) return;
    await fetch("/api/admin/lead-connectors?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "include" }); await load();
  }
  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  const others = rows?.filter((r) => r.status !== "pending") ?? [];
  const set = (id: string, k: "pageId" | "pageToken", v: string) => setForm((p) => ({ ...p, [id]: { pageId: p[id]?.pageId ?? "", pageToken: p[id]?.pageToken ?? "", [k]: v } }));
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Magnet" size={28} /></span>
        <div>
          <h2>{tx(["اتصال‌های Meta Lead Ads", "Meta Lead Ads connections", "Meta-Lead-Ads-Verbindungen", "Meta Lead Ads bağlantıları"])}</h2>
          <p>{tx(["درخواست‌های اتصال پیج کاربران را با Page ID و توکن پیج فعال کن؛ توکن بعد از ذخیره نمایش داده نمی‌شود.", "Activate users’ page requests with the Page ID and page token; the token is never shown after saving.", "Seitenanfragen mit Page-ID und Token aktivieren; das Token wird danach nicht angezeigt.", "Sayfa isteklerini Page ID ve token ile etkinleştir; token kaydedildikten sonra gösterilmez."])}</p>
        </div>
      </div>
      <section className="panel" aria-busy={!rows}>
        <h3>{tx(["درخواست‌های در انتظار", "Pending requests", "Offene Anfragen", "Bekleyen istekler"])} {rows && <span className="badge orange">{n(pending.length)}</span>}</h3>
        {rows && !pending.length && <p className="fine-print">{tx(["درخواستی در انتظار نیست.", "No pending requests.", "Keine offenen Anfragen.", "Bekleyen istek yok."])}</p>}
        {pending.map((r) => (
          <article className="domain-card admin-connector" key={r.id}>
            <div className="row-between"><strong><Link href={"/admin/users/" + encodeURIComponent(r.userId)}>{r.userName || r.userLabel}</Link></strong><small>{date(r.createdAt)}</small></div>
            <p>{r.name}{r.externalId ? " · " + r.externalId : ""}</p>
            <div className="domain-fields">
              <label>Page ID<input dir="ltr" value={form[r.id]?.pageId ?? ""} onChange={(e) => set(r.id, "pageId", e.target.value)} /></label>
              <label>Page Access Token<input dir="ltr" type="password" autoComplete="new-password" value={form[r.id]?.pageToken ?? ""} onChange={(e) => set(r.id, "pageToken", e.target.value)} /></label>
            </div>
            <div className="domain-actions">
              <Button variant="primary" disabled={saving === r.id} onClick={() => void fulfill(r.id)}>{tx(["فعال‌سازی اتصال", "Activate connection", "Verbindung aktivieren", "Bağlantıyı etkinleştir"])}</Button>
              <Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(r.id)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </article>
        ))}
      </section>
      <section className="panel">
        <h3>{tx(["اتصال‌ها", "Connections", "Verbindungen", "Bağlantılar"])}</h3>
        {others.length ? (
          <div className="table-scroll"><table className="admin-finance-table">
            <thead><tr>{[tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["پیج", "Page", "Seite", "Sayfa"]), tx(["وضعیت", "Status", "Status", "Durum"]), tx(["لیدها", "Leads", "Leads", "Lead"]), tx(["آخرین لید", "Last lead", "Letzter Lead", "Son lead"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
            <tbody>{others.map((r) => (
              <tr key={r.id}>
                <td><Link href={"/admin/users/" + encodeURIComponent(r.userId)}>{r.userName || r.userLabel}</Link></td>
                <td>{r.name}<small dir="ltr">{r.externalId}</small></td>
                <td><span className={"badge " + (r.status === "active" ? "green" : r.status === "error" ? "red" : "")}>{r.status}</span>{r.lastError && <small dir="ltr">{r.lastError}</small>}</td>
                <td>{n(r.leadsImported)}</td>
                <td>{date(r.lastLeadAt)}</td>
                <td><Button variant="danger" label={tx(["حذف", "Delete", "Löschen", "Sil"])} onClick={() => void remove(r.id)}><Icon name="Trash2" size={16} /></Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : rows && <p className="fine-print">{tx(["اتصالی نیست.", "No connections.", "Keine Verbindungen.", "Bağlantı yok."])}</p>}
      </section>
    </>
  );
}
