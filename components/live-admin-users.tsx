"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal, download } from "./ui";

/**
 * The design's user directory on aifekr.com: same layout, real accounts from
 * /api/admin/users (20 per page, searched and filtered on the server). Block,
 * credit changes (with the ledger reason the API requires) and new accounts
 * go through the same endpoints as the classic admin page.
 */
type Account = { id: string; name: string | null; email: string | null; phone: string | null; role: string; plan: string; accountType: string | null; credits: number; isBlocked: boolean; createdAt: string; lastLoginAt: string | null; _count: { conversations: number; payments: number } };
type Summary = { total: number; active: number; blocked: number; paid: number };
type Tx = [string, string, string, string];

export function LiveAdminUsers() {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const planName = (code: string) => shell?.copy.planNames?.[code] || code;
  const seq = useRef(0);
  const [users, setUsers] = useState<Account[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Account | null>(null);
  const [create, setCreate] = useState(false);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), search: query.trim(), status: status === "all" ? "" : status });
      const res = await fetch("/api/admin/users?" + q, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (mine !== seq.current) return;
      if (!res.ok) throw Error(data.error || "");
      setUsers(data.users ?? []); setTotal(data.total ?? 0); setPages(Math.max(1, data.totalPages ?? 1)); setSummary(data.summary ?? null);
    } catch (e) {
      if (mine === seq.current) { setUsers([]); toast.error((e instanceof Error && e.message) || tx(["دریافت کاربران انجام نشد", "Could not load users", "Benutzer konnten nicht geladen werden", "Kullanıcılar yüklenemedi"])); }
    } finally { if (mine === seq.current) setLoading(false); }
  }, [page, query, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function update(id: string, body: Record<string, unknown>, done: string) {
    const res = await fetch("/api/admin/users/" + encodeURIComponent(id), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || tx(["تغییر انجام نشد", "The change was not saved", "Änderung nicht gespeichert", "Değişiklik kaydedilmedi"])); return false; }
    toast.success(done); setDetail(null); void load(); return true;
  }
  const label = (u: Account) => u.name || u.email || u.phone || u.id;

  return (
    <div className="admin-user-directory">
      <header className="admin-user-directory-header">
        <div>
          <span className="eyebrow">AIFekr / PEOPLE</span>
          <h1>{tx(["کاربران و حساب‌ها", "Users & accounts", "Benutzer & Konten", "Kullanıcılar ve hesaplar"])}</h1>
          <p>{tx(["مشخصات، اشتراک و دسترسی هر کاربر را از پروندهٔ همان حساب مدیریت کن.", "Manage each user’s details, subscription and access from their own account profile.", "Verwalte Daten, Abo und Zugriff jedes Benutzers in seinem Kontoprofil.", "Her kullanıcının bilgilerini, aboneliğini ve erişimini kendi profilinden yönet."])}</p>
        </div>
        <div className="admin-user-directory-actions">
          <Link className="btn" href="/admin/invites/manage">{tx(["مدیریت دعوت‌نامه‌ها", "Manage invites", "Einladungen verwalten", "Davetleri yönet"])}</Link>
          <Button variant="primary" onClick={() => setCreate(true)}><Icon name="Plus" size={18} />{tx(["افزودن کاربر", "Add user", "Benutzer hinzufügen", "Kullanıcı ekle"])}</Button>
        </div>
      </header>
      <div className="stats-grid">
        {([
          [tx(["کل کاربران", "Total users", "Benutzer gesamt", "Toplam kullanıcı"]), summary?.total],
          [tx(["حساب فعال", "Active accounts", "Aktive Konten", "Aktif hesap"]), summary?.active],
          [tx(["حساب مسدود", "Blocked accounts", "Gesperrte Konten", "Engelli hesap"]), summary?.blocked],
          [tx(["طرح غیررایگان", "Paid-tier profiles", "Bezahlte Tarife", "Ücretli plan"]), summary?.paid],
        ] as [string, number | undefined][]).map(([a, b]) => (
          <div className="panel stat" key={a}><span>{a}</span><strong>{b === undefined ? "—" : n(b)}</strong></div>
        ))}
      </div>
      <section className="panel data-panel">
        <div className="table-toolbar">
          <h2>{tx(["فهرست کاربران", "User directory", "Benutzerverzeichnis", "Kullanıcı dizini"])}</h2>
          <Button disabled={!users.length} onClick={() => download("users-page-" + page + ".json", JSON.stringify(users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, plan: u.plan, credits: u.credits, blocked: u.isBlocked, createdAt: u.createdAt })), null, 2), "application/json")}>
            {tx(["خروجی این صفحه", "Export this page", "Diese Seite exportieren", "Bu sayfayı dışa aktar"])}
          </Button>
        </div>
        <div className="table-filters">
          <div className="search-field">
            <Icon name="Search" size={18} />
            <input aria-label={tx(["جستجوی کاربر", "Search users", "Benutzer suchen", "Kullanıcı ara"])} placeholder={tx(["نام، ایمیل یا موبایل…", "Name, email or phone…", "Name, E-Mail oder Telefon…", "Ad, e-posta veya telefon…"])} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <select aria-label={tx(["وضعیت حساب", "Account status", "Kontostatus", "Hesap durumu"])} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">{tx(["همه حساب‌ها", "All accounts", "Alle Konten", "Tüm hesaplar"])}</option>
            <option value="active">{tx(["فعال", "Active", "Aktiv", "Aktif"])}</option>
            <option value="blocked">{tx(["مسدود", "Blocked", "Gesperrt", "Engelli"])}</option>
          </select>
        </div>
        <div className="table-wrap" aria-busy={loading}>
          <table>
            <thead><tr>{[tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["ایمیل / موبایل", "Email / phone", "E-Mail / Telefon", "E-posta / telefon"]), tx(["اشتراک", "Plan", "Tarif", "Plan"]), tx(["اعتبار", "Credits", "Credits", "Kredi"]), tx(["وضعیت حساب", "Account status", "Kontostatus", "Hesap durumu"]), tx(["عملیات", "Action", "Aktion", "İşlem"])].map((a) => <th key={a}>{a}</th>)}</tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link className="table-person admin-user-name" href={"/admin/users/" + encodeURIComponent(u.id)}>
                      <span className="avatar small">{label(u).slice(0, 1)}</span>
                      <span>{label(u)}<small>{u.role !== "USER" ? u.role + " · " : ""}{tx(["مشاهده پرونده", "View profile", "Profil ansehen", "Profili gör"])} ↗</small></span>
                    </Link>
                  </td>
                  <td dir="ltr">{u.email || u.phone || "—"}</td>
                  <td><span className="badge">{planName(u.plan)}</span></td>
                  <td>{n(u.credits)} ✦</td>
                  <td><span className={"badge " + (u.isBlocked ? "red" : "green")}>{u.isBlocked ? tx(["مسدود", "Blocked", "Gesperrt", "Engelli"]) : tx(["فعال", "Active", "Aktiv", "Aktif"])}</span></td>
                  <td><Button onClick={() => setDetail(u)}>{tx(["عملیات", "Action", "Aktion", "İşlem"])}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !users.length && <Empty />}
        <div className="pagination">
          <span>{n(total)} {tx(["حساب", "accounts", "Konten", "hesap"])}</span>
          <div>
            <Button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>{tx(["قبلی", "Previous", "Zurück", "Önceki"])}</Button>
            <span>{n(page)} / {n(pages)}</span>
            <Button disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>{tx(["بعدی", "Next", "Weiter", "Sonraki"])}</Button>
          </div>
        </div>
      </section>
      {detail && <AccountModal account={detail} tx={tx} n={n} planName={planName} label={label(detail)} onClose={() => setDetail(null)} update={update} />}
      {create && <CreateModal tx={tx} onClose={() => setCreate(false)} onCreated={() => { setCreate(false); void load(); }} />}
    </div>
  );
}

function AccountModal({ account, tx, n, planName, label, onClose, update }: { account: Account; tx: (c: Tx) => string; n: (v: number) => string; planName: (c: string) => string; label: string; onClose: () => void; update: (id: string, body: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const amount = Number(delta);
  const validCredit = Number.isSafeInteger(amount) && amount !== 0 && reason.trim().length >= 3;
  async function run(body: Record<string, unknown>, done: string) { setBusy(true); await update(account.id, body, done); setBusy(false); }
  return (
    <Modal title={label} onClose={onClose}>
      <dl className="domain-detail">
        <div><dt>{tx(["ایمیل / موبایل", "Email / phone", "E-Mail / Telefon", "E-posta / telefon"])}</dt><dd dir="ltr">{account.email || account.phone || "—"}</dd></div>
        <div><dt>{tx(["اشتراک", "Plan", "Tarif", "Plan"])}</dt><dd>{planName(account.plan)}</dd></div>
        <div><dt>{tx(["اعتبار", "Credits", "Credits", "Kredi"])}</dt><dd>{n(account.credits)}</dd></div>
        <div><dt>{tx(["گفتگو / پرداخت", "Chats / payments", "Chats / Zahlungen", "Sohbet / ödeme"])}</dt><dd>{n(account._count.conversations)} / {n(account._count.payments)}</dd></div>
      </dl>
      <form className="admin-credit-form" onSubmit={(e) => { e.preventDefault(); if (validCredit) void run({ creditDelta: amount, creditReason: reason.trim() }, amount > 0 ? tx(["اعتبار افزوده شد", "Credits added", "Credits hinzugefügt", "Kredi eklendi"]) : tx(["اعتبار کم شد", "Credits deducted", "Credits abgezogen", "Kredi düşüldü"])); }}>
        <div className="domain-fields">
          <label>{tx(["تغییر اعتبار (منفی برای کسر)", "Credit change (negative to deduct)", "Credit-Änderung (negativ zum Abziehen)", "Kredi değişikliği (düşmek için negatif)"])}<input inputMode="numeric" dir="ltr" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))} /></label>
          <label>{tx(["دلیل (در دفتر کل ثبت می‌شود)", "Reason (recorded in the ledger)", "Grund (im Hauptbuch gespeichert)", "Neden (deftere kaydedilir)"])}<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        </div>
        <Button type="submit" disabled={busy || !validCredit}>{tx(["ثبت تغییر اعتبار", "Apply credit change", "Credit-Änderung buchen", "Kredi değişikliğini uygula"])}</Button>
      </form>
      <div className="admin-user-modal-actions">
        <Button disabled={busy} variant={account.isBlocked ? "" : "danger"} onClick={() => void run({ isBlocked: !account.isBlocked }, account.isBlocked ? tx(["کاربر آزاد شد", "User unblocked", "Benutzer entsperrt", "Kullanıcının engeli kaldırıldı"]) : tx(["کاربر مسدود شد", "User blocked", "Benutzer gesperrt", "Kullanıcı engellendi"]))}>
          {account.isBlocked ? tx(["رفع مسدودی", "Unblock", "Entsperren", "Engeli kaldır"]) : tx(["مسدود کردن", "Block", "Sperren", "Engelle"])}
        </Button>
        <Link className="btn primary" href={"/admin/users/" + encodeURIComponent(account.id)}>{tx(["مشخصات کامل کاربر", "Open full user profile", "Vollständiges Profil öffnen", "Tam profili aç"])}<Icon name="ArrowLeft" size={16} /></Link>
      </div>
    </Modal>
  );
}

function CreateModal({ tx, onClose, onCreated }: { tx: (c: Tx) => string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  async function submit() {
    if (!form.firstName.trim()) return toast.error(tx(["نام الزامی است", "Name is required", "Name ist erforderlich", "Ad gerekli"]));
    if (!form.email.trim() && !form.phone.trim()) return toast.error(tx(["ایمیل یا موبایل الزامی است", "Email or phone is required", "E-Mail oder Telefon erforderlich", "E-posta veya telefon gerekli"]));
    if (form.password.length < 6) return toast.error(tx(["رمز عبور حداقل ۶ کاراکتر باشد", "Password must be at least 6 characters", "Passwort mindestens 6 Zeichen", "Şifre en az 6 karakter olmalı"]));
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, plan: "FREE", accountType: "PERSONAL", studentPackage: false }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(data.error || "");
      toast.success(tx(["کاربر ایجاد شد", "User created", "Benutzer erstellt", "Kullanıcı oluşturuldu"])); onCreated();
    } catch (e) { toast.error((e instanceof Error && e.message) || tx(["خطا در ایجاد کاربر", "Could not create the user", "Benutzer konnte nicht erstellt werden", "Kullanıcı oluşturulamadı"])); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={tx(["افزودن کاربر", "Add user", "Benutzer hinzufügen", "Kullanıcı ekle"])} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="domain-fields">
          <label>{tx(["نام", "First name", "Vorname", "Ad"])}<input required value={form.firstName} onChange={set("firstName")} /></label>
          <label>{tx(["نام خانوادگی", "Last name", "Nachname", "Soyad"])}<input value={form.lastName} onChange={set("lastName")} /></label>
          <label>{tx(["ایمیل", "Email", "E-Mail", "E-posta"])}<input type="email" dir="ltr" value={form.email} onChange={set("email")} /></label>
          <label>{tx(["موبایل (با کد کشور)", "Phone (with country code)", "Telefon (mit Ländervorwahl)", "Telefon (ülke koduyla)"])}<input dir="ltr" inputMode="tel" value={form.phone} onChange={set("phone")} /></label>
          <label>{tx(["رمز عبور اولیه", "Initial password", "Startpasswort", "İlk şifre"])}<input type="password" autoComplete="new-password" dir="ltr" value={form.password} onChange={set("password")} /></label>
        </div>
        <p className="fine-print">{tx(["حساب واقعی با طرح رایگان ساخته می‌شود؛ پیامی برای کاربر ارسال نمی‌شود.", "A real account is created on the free plan; no message is sent to the user.", "Ein echtes Konto im kostenlosen Tarif wird erstellt; es wird keine Nachricht gesendet.", "Ücretsiz planda gerçek bir hesap oluşturulur; kullanıcıya mesaj gönderilmez."])}</p>
        <Button variant="primary" type="submit" disabled={busy}>{tx(["ایجاد حساب", "Create account", "Konto erstellen", "Hesap oluştur"])}</Button>
      </form>
    </Modal>
  );
}
