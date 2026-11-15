"use client";
import Link from "@/components/site-link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "./providers";
import { Empty, Icon } from "./ui";

/**
 * Admin CRM oversight (/admin/crm): GET /api/admin/crm, read-only and cross-tenant.
 * Rows are grouped by workspace owner (CrmContact.userId is always the owner). Editing a
 * tenant's real contacts happens only inside that tenant's own /crm, so this page has
 * no write actions; it links to the owner's account file instead.
 */
type Tx = [string, string, string, string];
type Owner = { id: string; name: string | null; email: string | null; phone: string | null; plan: string; crmPlan: string };
type Workspace = { ownerId: string; owner: Owner | null; count: number; statuses: Record<string, number>; lastCreatedAt: string };
type Data = { totalContacts: number; totalWorkspaces: number; workspaces: Workspace[] };

const STATUS: Record<string, [Tx, string]> = {
  lead: [["لید", "Lead", "Lead", "Aday"], ""],
  prospect: [["احتمالی", "Prospect", "Interessent", "Potansiyel"], "blue"],
  active: [["فعال", "Active", "Aktiv", "Aktif"], "green"],
  vip: [["VIP", "VIP", "VIP", "VIP"], "orange"],
  churned: [["از دست رفته", "Churned", "Verloren", "Kaybedildi"], "red"],
};

export function LiveAdminCrm() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"count" | "recent">("count");

  useEffect(() => {
    fetch("/api/admin/crm", { credentials: "include", cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw Error(); setData(await r.json()); })
      .catch(() => setFailed(true));
  }, []);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const w of data?.workspaces ?? []) for (const [k, v] of Object.entries(w.statuses)) t[k] = (t[k] || 0) + v;
    return t;
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.workspaces ?? [])
      .filter((w) => !q || [w.owner?.name, w.owner?.email, w.owner?.phone].some((v) => v?.toLowerCase().includes(q)))
      .filter((w) => status === "all" || (w.statuses[status] || 0) > 0)
      .sort((a, b) => sort === "count" ? b.count - a.count : b.lastCreatedAt.localeCompare(a.lastCreatedAt));
  }, [data, query, status, sort]);

  const label = (s: string) => STATUS[s] ? tx(STATUS[s][0]) : s;
  const date = (iso: string) => new Date(iso).toLocaleDateString(tag, { year: "numeric", month: "short", day: "numeric" });
  const avg = data && data.totalWorkspaces ? Math.round(data.totalContacts / data.totalWorkspaces) : 0;

  return (
    <div className="admin-user-directory">
      <header className="admin-user-directory-header">
        <div>
          <span className="eyebrow">AIFekr / CRM</span>
          <h1>{tx(["نمای کلی CRM کسب‌وکارها", "CRM overview across workspaces", "CRM-Übersicht aller Arbeitsbereiche", "Çalışma alanları CRM genel bakışı"])}</h1>
          <p>{tx([
            "فقط برای نظارت است. ویرایش مخاطبین واقعی هر کسب‌وکار فقط از داخل CRM خود آن‌ها انجام می‌شود.",
            "Oversight only. Each business edits its real contacts only inside its own CRM.",
            "Nur zur Aufsicht. Echte Kontakte bearbeitet jedes Unternehmen nur in seinem eigenen CRM.",
            "Yalnızca gözetim içindir. Her işletme gerçek kişilerini yalnızca kendi CRM’inde düzenler.",
          ])}</p>
        </div>
      </header>
      {failed && <p className="fine-print" role="alert">{tx(["اطلاعات CRM دریافت نشد. دوباره تلاش کنید.", "CRM data could not be loaded. Please try again.", "CRM-Daten konnten nicht geladen werden.", "CRM verileri yüklenemedi."])}</p>}
      <div className="stats-grid">
        {([
          [tx(["کل مخاطبین", "Total contacts", "Kontakte gesamt", "Toplam kişi"]), data?.totalContacts],
          [tx(["فضای کاری فعال", "Active workspaces", "Aktive Arbeitsbereiche", "Aktif çalışma alanı"]), data?.totalWorkspaces],
          [tx(["میانگین مخاطب هر فضا", "Avg. contacts per workspace", "Ø Kontakte pro Bereich", "Alan başına ort. kişi"]), data ? avg : undefined],
          [tx(["مشتری فعال و VIP", "Active and VIP customers", "Aktive und VIP-Kunden", "Aktif ve VIP müşteri"]), data ? (totals.active || 0) + (totals.vip || 0) : undefined],
        ] as [string, number | undefined][]).map(([a, b]) => (
          <div className="panel stat" key={a}><span>{a}</span><strong>{b === undefined ? "—" : n(b)}</strong></div>
        ))}
      </div>
      <section className="panel data-panel">
        <div className="table-toolbar">
          <h2>{tx(["فضاهای کاری", "Workspaces", "Arbeitsbereiche", "Çalışma alanları"])}</h2>
          <span className="muted">{n(rows.length)} / {n(data?.workspaces.length ?? 0)}</span>
        </div>
        <div className="table-filters">
          <div className="search-field">
            <Icon name="Search" size={18} />
            <input aria-label={tx(["جستجوی صاحب فضای کاری", "Search workspace owners", "Inhaber suchen", "Alan sahibini ara"])} placeholder={tx(["نام، ایمیل یا موبایل صاحب فضا…", "Owner name, email or phone…", "Name, E-Mail oder Telefon…", "Ad, e-posta veya telefon…"])} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select aria-label={tx(["وضعیت مخاطب", "Contact status", "Kontaktstatus", "Kişi durumu"])} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{tx(["همه وضعیت‌ها", "All statuses", "Alle Status", "Tüm durumlar"])}</option>
            {Object.keys(totals).map((s) => <option key={s} value={s}>{label(s)} · {n(totals[s])}</option>)}
          </select>
          <select aria-label={tx(["مرتب‌سازی", "Sort", "Sortierung", "Sıralama"])} value={sort} onChange={(e) => setSort(e.target.value as "count" | "recent")}>
            <option value="count">{tx(["بیشترین مخاطب", "Most contacts", "Meiste Kontakte", "En çok kişi"])}</option>
            <option value="recent">{tx(["جدیدترین فعالیت", "Most recent contact", "Neuester Kontakt", "En yeni kişi"])}</option>
          </select>
        </div>
        <div className="table-wrap table-scroll" aria-busy={!data && !failed}>
          <table>
            <thead><tr>{[
              tx(["صاحب فضای کاری", "Workspace owner", "Inhaber", "Alan sahibi"]),
              tx(["پلن / پلن CRM", "Plan / CRM plan", "Tarif / CRM-Tarif", "Plan / CRM planı"]),
              tx(["وضعیت مخاطبین", "Contacts by status", "Kontakte nach Status", "Duruma göre kişiler"]),
              tx(["مخاطبین", "Contacts", "Kontakte", "Kişiler"]),
              tx(["آخرین مخاطب", "Latest contact", "Letzter Kontakt", "Son kişi"]),
            ].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((w) => {
                const name = w.owner?.name || w.owner?.email || w.owner?.phone || tx(["حساب حذف‌شده", "Deleted account", "Gelöschtes Konto", "Silinmiş hesap"]);
                return (
                  <tr key={w.ownerId}>
                    <td>
                      {w.owner ? (
                        <Link className="table-person admin-user-name" href={"/admin/users/" + encodeURIComponent(w.ownerId)}>
                          <span className="avatar small">{name.slice(0, 1)}</span>
                          <span>{name}<small dir="ltr">{w.owner.email || w.owner.phone || "—"}</small></span>
                        </Link>
                      ) : <span className="muted">{name}</span>}
                    </td>
                    <td><span className="badge">{w.owner?.plan || "—"}</span> <span className="badge">{w.owner?.crmPlan || "—"}</span></td>
                    <td>{Object.entries(w.statuses).sort((a, b) => b[1] - a[1]).map(([s, c]) => <span key={s} className={"badge " + (STATUS[s]?.[1] || "")} style={{ marginInlineEnd: 4 }}>{label(s)}: {n(c)}</span>)}</td>
                    <td><strong>{n(w.count)}</strong></td>
                    <td>{date(w.lastCreatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && !rows.length && <Empty />}
      </section>
    </div>
  );
}
