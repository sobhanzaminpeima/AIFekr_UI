"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * The admin team on aifekr.com: staff accounts (/api/admin/users?role=staff)
 * and role changes through /api/admin/set-role, which only a super admin may
 * make and never on their own account. Plain admins see the team read-only.
 */
type Tx = [string, string, string, string];
type Staff = { id: string; name: string | null; email: string | null; phone: string | null; role: string; isBlocked: boolean; createdAt: string; lastLoginAt: string | null };
const ROLES: [string, Tx, Tx, string][] = [
  ["SUPER_ADMIN", ["سوپر ادمین", "Super admin", "Super-Admin", "Süper yönetici"], ["دسترسی کامل به همه بخش‌ها", "Full access to every section", "Vollzugriff auf alle Bereiche", "Tüm bölümlere tam erişim"], "red"],
  ["ADMIN", ["ادمین", "Admin", "Admin", "Yönetici"], ["دسترسی به اکثر بخش‌ها", "Access to most sections", "Zugriff auf die meisten Bereiche", "Çoğu bölüme erişim"], "orange"],
  ["MODERATOR", ["مدیر محتوا", "Moderator", "Moderator", "Moderatör"], ["مدیریت چت و محتوا", "Chat and content moderation", "Chat- und Inhaltsmoderation", "Sohbet ve içerik yönetimi"], ""],
];

export function LiveAdminTeam() {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const isSuper = shell?.user.role === "SUPER_ADMIN";
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => { const r = await fetch("/api/admin/users?role=staff", { credentials: "include" }); setStaff(r.ok ? (await r.json()).users ?? [] : []); }, []);
  useEffect(() => { void load(); }, [load]);
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i]) : "—");
  async function setRole(userId: string, role: string) {
    const r = await fetch("/api/admin/set-role", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(d.code === "CANNOT_CHANGE_OWN_ROLE" ? tx(["نقش خودتان را نمی‌توانید تغییر دهید", "You cannot change your own role", "Eigene Rolle kann nicht geändert werden", "Kendi rolünüzü değiştiremezsiniz"]) : r.status === 403 ? tx(["فقط سوپر ادمین می‌تواند نقش‌ها را تغییر دهد", "Only a super admin can change roles", "Nur ein Super-Admin kann Rollen ändern", "Rolleri yalnızca süper yönetici değiştirebilir"]) : tx(["خطا در تعیین نقش", "Could not set the role", "Rolle konnte nicht gesetzt werden", "Rol atanamadı"]));
      return false;
    }
    toast.success(tx(["نقش ذخیره شد", "Role saved", "Rolle gespeichert", "Rol kaydedildi"])); await load(); return true;
  }
  async function remove(s: Staff) {
    if (!confirm(tx(["دسترسی مدیریتی این حساب برداشته شود؟", "Remove this account’s staff access?", "Admin-Zugang dieses Kontos entfernen?", "Bu hesabın yönetici erişimi kaldırılsın mı?"]))) return;
    await setRole(s.id, "USER");
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Shield" size={28} /></span>
        <div>
          <h2>{tx(["تیم مدیریت", "Admin team", "Admin-Team", "Yönetim ekibi"])}</h2>
          <p>{isSuper ? tx(["نقش‌ها را فقط سوپر ادمین تغییر می‌دهد و هر تغییر در سابقه ثبت می‌شود.", "Only a super admin changes roles, and every change is recorded.", "Nur Super-Admins ändern Rollen; jede Änderung wird protokolliert.", "Rolleri yalnızca süper yönetici değiştirir; her değişiklik kaydedilir."]) : tx(["این فهرست برای شما فقط خواندنی است؛ تغییر نقش با سوپر ادمین است.", "This list is read-only for you; role changes are made by a super admin.", "Für Sie nur lesbar; Rollen ändert ein Super-Admin.", "Bu liste sizin için salt okunur; rolleri süper yönetici değiştirir."])}</p>
        </div>
        {isSuper && <Button variant="primary" onClick={() => setAdding(true)}><Icon name="Plus" size={16} />{tx(["افزودن عضو", "Add member", "Mitglied hinzufügen", "Üye ekle"])}</Button>}
      </div>
      <div className="stats-grid">
        {ROLES.map(([role, label, desc, tone]) => <div className="panel stat" key={role}><span className={"badge " + tone}>{tx(label)}</span><strong>{staff ? n(staff.filter((s) => s.role === role).length) : "—"}</strong><small>{tx(desc)}</small></div>)}
      </div>
      <div className="tool-grid" aria-busy={!staff}>
        {staff?.map((s) => {
          const role = ROLES.find(([r]) => r === s.role);
          return (
            <article className="panel admin-customer-card" key={s.id}>
              <div className="row-between"><span className="icon-chip orange"><Icon name="UserCog" /></span><span className={"badge " + (role?.[3] ?? "")}>{role ? tx(role[1]) : s.role}</span></div>
              <h3><Link href={"/admin/users/" + encodeURIComponent(s.id)}>{s.name || s.email || s.phone || s.id}</Link></h3>
              <p dir="ltr">{s.email || s.phone || "—"}</p>
              <dl className="domain-detail">
                <div><dt>{tx(["عضویت", "Joined", "Registriert", "Katılım"])}</dt><dd>{date(s.createdAt)}</dd></div>
                <div><dt>{tx(["آخرین ورود", "Last sign-in", "Letzte Anmeldung", "Son giriş"])}</dt><dd>{date(s.lastLoginAt)}</dd></div>
                {s.isBlocked && <div><dt>{tx(["وضعیت", "Status", "Status", "Durum"])}</dt><dd><span className="badge red">{tx(["مسدود", "Blocked", "Gesperrt", "Engelli"])}</span></dd></div>}
              </dl>
              {isSuper && (
                <div className="domain-actions">
                  <select aria-label={tx(["نقش", "Role", "Rolle", "Rol"])} value={s.role} onChange={(e) => void setRole(s.id, e.target.value)}>
                    {ROLES.map(([r, label]) => <option key={r} value={r}>{tx(label)}</option>)}
                  </select>
                  <Button variant="danger" onClick={() => void remove(s)}><Icon name="UserMinus" size={16} />{tx(["برداشتن دسترسی", "Remove access", "Zugang entfernen", "Erişimi kaldır"])}</Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {staff && !staff.length && <Empty />}
      {adding && <AddMember tx={tx} onClose={() => setAdding(false)} onAdd={async (id, role) => { if (await setRole(id, role)) setAdding(false); }} />}
    </>
  );
}

function AddMember({ tx, onClose, onAdd }: { tx: (c: Tx) => string; onClose: () => void; onAdd: (id: string, role: string) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Staff[]>([]);
  const [picked, setPicked] = useState<Staff | null>(null);
  const [role, setRole] = useState("ADMIN");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => { fetch("/api/admin/users?" + new URLSearchParams({ search: q.trim() }), { credentials: "include" }).then((r) => (r.ok ? r.json() : { users: [] })).then((d) => setResults((d.users ?? []).filter((u: Staff) => u.role === "USER").slice(0, 8))).catch(() => setResults([])); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Modal title={tx(["افزودن عضو تیم مدیریت", "Add a team member", "Teammitglied hinzufügen", "Ekip üyesi ekle"])} onClose={onClose}>
      <form className="admin-package-form" onSubmit={async (e) => { e.preventDefault(); if (!picked) return toast.error(tx(["کاربر را انتخاب کنید", "Choose a user", "Benutzer wählen", "Kullanıcı seçin"])); setBusy(true); await onAdd(picked.id, role); setBusy(false); }}>
        <label>{tx(["جست‌وجوی کاربر", "Find a user", "Benutzer suchen", "Kullanıcı ara"])}<input value={q} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} onChange={(e) => { setQ(e.target.value); setPicked(null); }} /></label>
        {results.length > 0 && !picked && <div className="admin-pick-list">{results.map((u) => <button type="button" key={u.id} onClick={() => setPicked(u)}>{u.name || u.email || u.phone}<small dir="ltr">{u.email || u.phone}</small></button>)}</div>}
        {picked && <p className="badge green">{picked.name || picked.email || picked.phone}</p>}
        <label>{tx(["نقش", "Role", "Rolle", "Rol"])}<select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map(([r, label]) => <option key={r} value={r}>{tx(label)}</option>)}</select></label>
        <Button type="submit" variant="primary" disabled={busy || !picked}>{tx(["تعیین نقش", "Assign role", "Rolle zuweisen", "Rol ata"])}</Button>
      </form>
    </Modal>
  );
}
