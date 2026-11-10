"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { useShell } from "./live-shell-context";
import { Button, Empty, Icon, Modal, download } from "./ui";

/**
 * The design's user profile on aifekr.com: same hero, tabs and summary card,
 * filled from /api/admin/users/<id> (account, last payments, usage, audit
 * history, credit ledger). Every change goes through the same endpoints as
 * the classic admin page; the server checks what each admin may change.
 */
type Payment = { id: string; amount: number; plan: string; status: string; gateway: string | null; refId: string | null; createdAt: string; transferMinor: number | null; transferCurrency: string | null };
type Usage = { id: string; type: string; model?: string | null; credits?: number | null; createdAt: string };
type User = {
  id: string; name: string | null; email: string | null; phone: string | null; country: string | null; currency: string | null; role: string; plan: string; planExpiry: string | null;
  crmPlan: string | null; crmPlanExpiry: string | null; accountType: string | null; credits: number; isBlocked: boolean; commissionPercentOverride: number | null;
  fitnessAccessExpiry: string | null; createdAt: string; lastLoginAt: string | null;
  _count: { conversations: number; images: number; videos: number; payments: number };
  payments: Payment[]; usageLogs: Usage[];
};
type Event = { id: string; action: string; createdAt: string; actorId: string | null };
type Ledger = { id: string; delta: number; balanceAfter: number; type: string; module: string | null; reason: string | null; createdAt: string };
type ModuleRow = { key: string; labelFa: string; labelEn: string; labelDe?: string; override: boolean | null };
type Tx = [string, string, string, string];

const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function LiveAdminUserDetail({ id }: { id: string }) {
  const { n, locale } = useApp();
  const shell = useShell();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const planNames = shell?.copy.planNames ?? {};
  const planName = (code: string) => planNames[code] || code;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "medium", timeStyle: "short" }) : "—");
  const [data, setData] = useState<{ user: User; history: Event[]; creditLedger: Ledger[] } | null>(null);
  const [missing, setMissing] = useState(false);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [tab, setTab] = useState("overview");
  const [dialog, setDialog] = useState<"block" | "credits" | "delete" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users/" + encodeURIComponent(id), { credentials: "include" });
    if (res.status === 404) return setMissing(true);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) return toast.error(body?.error || tx(["دریافت پرونده انجام نشد", "Could not load the profile", "Profil konnte nicht geladen werden", "Profil yüklenemedi"]));
    setData(body);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadModules = useCallback(async () => {
    const res = await fetch("/api/admin/users/" + encodeURIComponent(id) + "/module-overrides", { credentials: "include" });
    const body = await res.json().catch(() => null);
    if (res.ok && body) setModules(body.modules ?? []);
  }, [id]);
  useEffect(() => { void load(); void loadModules(); }, [load, loadModules]);

  async function put(body: Record<string, unknown>, done: string) {
    const res = await fetch("/api/admin/users/" + encodeURIComponent(id), { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = out.code as string | undefined;
      toast.error(res.status === 403 ? tx(["فقط مدیر ارشد اجازهٔ این تغییر را دارد", "Only a super admin can do this", "Nur ein Super-Admin darf das", "Bunu yalnızca süper yönetici yapabilir"])
        : code === "INSUFFICIENT_CREDITS" ? tx(["مانده اعتبار نمی‌تواند منفی شود", "The balance cannot go below zero", "Das Guthaben darf nicht negativ werden", "Bakiye sıfırın altına inemez"])
        : out.error || tx(["تغییر ذخیره نشد", "The change was not saved", "Änderung nicht gespeichert", "Değişiklik kaydedilmedi"]));
      return false;
    }
    toast.success(done); await load(); return true;
  }

  if (missing) return (
    <div className="panel">
      <h1>{tx(["کاربر پیدا نشد", "User not found", "Benutzer nicht gefunden", "Kullanıcı bulunamadı"])}</h1>
      <Link className="btn" href="/admin/users">{tx(["بازگشت به کاربران", "Back to users", "Zurück zu Benutzern", "Kullanıcılara dön"])}</Link>
    </div>
  );
  if (!data) return <div className="panel" aria-busy="true">{tx(["در حال بارگذاری…", "Loading…", "Wird geladen…", "Yükleniyor…"])}</div>;
  const { user, history, creditLedger } = data;
  const label = user.name || user.email || user.phone || user.id;
  const active = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();
  const overrides = modules.filter((m) => m.override !== null).length;
  const tabs: [string, Tx][] = [
    ["overview", ["نمای کلی", "Overview", "Übersicht", "Genel bakış"]],
    ["profile", ["اطلاعات حساب", "Account details", "Kontodaten", "Hesap bilgileri"]],
    ["access", ["اشتراک و دسترسی", "Plans & access", "Tarife & Zugriff", "Plan ve erişim"]],
    ["payments", ["پرداخت‌ها", "Payments", "Zahlungen", "Ödemeler"]],
    ["usage", ["مصرف و اعتبار", "Usage & credits", "Nutzung & Credits", "Kullanım ve kredi"]],
    ["history", ["سابقه تغییرات", "Audit history", "Änderungsverlauf", "Değişiklik geçmişi"]],
  ];
  return (
    <div className="admin-user-detail">
      <Link className="text-link" href="/admin/users"><Icon name="ArrowRight" size={16} />{tx(["همه کاربران", "All users", "Alle Benutzer", "Tüm kullanıcılar"])}</Link>
      <header className="user-profile-hero">
        <div className="user-profile-avatar">{label.slice(0, 1)}</div>
        <div>
          <span className="eyebrow">AIFekr / USER PROFILE</span>
          <h1>{label}</h1>
          <p dir="ltr">{user.email || user.phone || "—"}</p>
          <div className="domain-actions">
            <span className={"badge " + (user.isBlocked ? "red" : "green")}>{user.isBlocked ? tx(["مسدود", "Blocked", "Gesperrt", "Engelli"]) : tx(["فعال", "Active", "Aktiv", "Aktif"])}</span>
            <span className="badge">{planName(user.plan)}</span>
            {user.role !== "USER" && <span className="badge orange">{user.role}</span>}
            <code>#{user.id}</code>
          </div>
        </div>
        <div className="user-profile-actions">
          <Button onClick={() => download("user-" + user.id + ".json", JSON.stringify({ user: { ...user, payments: undefined, usageLogs: undefined }, payments: user.payments, history }, null, 2), "application/json")}>
            <Icon name="Download" size={16} />{tx(["خروجی پرونده", "Export profile", "Profil exportieren", "Profili dışa aktar"])}
          </Button>
          <Button variant={user.isBlocked ? "" : "danger"} onClick={() => setDialog("block")}>
            {user.isBlocked ? tx(["فعال‌سازی حساب", "Unblock account", "Konto entsperren", "Hesabın engelini kaldır"]) : tx(["مسدودسازی حساب", "Block account", "Konto sperren", "Hesabı engelle"])}
          </Button>
        </div>
      </header>
      <nav className="module-tabs" aria-label={tx(["بخش‌های پرونده کاربر", "User profile sections", "Profilbereiche", "Profil bölümleri"])}>
        {tabs.map(([key, copy]) => <button className={tab === key ? "selected" : ""} aria-pressed={tab === key} key={key} onClick={() => setTab(key)}>{tx(copy)}</button>)}
      </nav>
      <div className="user-profile-layout">
        <aside className="panel user-profile-summary">
          <h2>{tx(["خلاصه حساب", "Account summary", "Kontoübersicht", "Hesap özeti"])}</h2>
          <dl className="domain-detail">
            {([
              [tx(["نقش", "Role", "Rolle", "Rol"]), user.role],
              [tx(["نوع حساب", "Account type", "Kontotyp", "Hesap türü"]), user.accountType || "—"],
              [tx(["شماره تماس", "Phone", "Telefon", "Telefon"]), user.phone || "—"],
              [tx(["کشور", "Country", "Land", "Ülke"]), user.country || "—"],
              [tx(["ارز", "Currency", "Währung", "Para birimi"]), user.currency || "—"],
              [tx(["انقضای طرح", "Plan expiry", "Tarifende", "Plan bitişi"]), date(user.planExpiry)],
              [tx(["عضویت", "Joined", "Registriert", "Katılım"]), date(user.createdAt)],
              [tx(["آخرین ورود", "Last sign-in", "Letzte Anmeldung", "Son giriş"]), date(user.lastLoginAt)],
            ] as [string, string][]).map(([a, b]) => <div key={a}><dt>{a}</dt><dd dir={/^[+\d\s]+$/.test(b) ? "ltr" : undefined}>{b}</dd></div>)}
          </dl>
          <div className="user-credit-summary">
            <span>{tx(["اعتبار فعلی حساب", "Current credit balance", "Aktuelles Guthaben", "Mevcut kredi bakiyesi"])}</span>
            <strong>{n(user.credits)} ✦</strong>
            <Button onClick={() => setDialog("credits")}>{tx(["اصلاح اعتبار", "Adjust credits", "Credits anpassen", "Krediyi düzenle"])}</Button>
          </div>
        </aside>
        <section className="user-profile-main">
          {tab === "overview" && <>
            <div className="stats-grid">
              {([
                [tx(["گفتگوها", "Conversations", "Unterhaltungen", "Sohbetler"]), user._count.conversations],
                [tx(["تصویر و ویدئو", "Images & videos", "Bilder & Videos", "Görsel ve video"]), user._count.images + user._count.videos],
                [tx(["پرداخت‌ها", "Payments", "Zahlungen", "Ödemeler"]), user._count.payments],
                [tx(["دسترسی اختصاصی", "Custom overrides", "Eigene Freigaben", "Özel erişim"]), overrides],
              ] as [string, number][]).map(([a, b]) => <div className="panel stat" key={a}><span>{a}</span><strong>{n(b)}</strong></div>)}
            </div>
            <div className="panel">
              <h2>{tx(["اشتراک‌های کاربر", "User subscriptions", "Abos des Benutzers", "Kullanıcı abonelikleri"])}</h2>
              <div className="user-entitlements">
                {([
                  ["Package", tx(["پلتفرم", "Platform", "Plattform", "Platform"]), planName(user.plan)],
                  ["Users", "CRM", user.crmPlan && user.crmPlan !== "NONE" ? user.crmPlan + (active(user.crmPlanExpiry) ? "" : " · " + tx(["منقضی", "expired", "abgelaufen", "süresi doldu"])) : tx(["ندارد", "None", "Keins", "Yok"])],
                  ["Dumbbell", tx(["فیتنس", "FIT", "FIT", "FIT"]), active(user.fitnessAccessExpiry) ? tx(["فعال", "Enabled", "Aktiv", "Aktif"]) : tx(["غیرفعال", "Disabled", "Inaktiv", "Kapalı"])],
                  ["Coins", tx(["کمیسیون همکاری", "Referral commission", "Empfehlungsprovision", "Ortaklık komisyonu"]), user.commissionPercentOverride != null ? n(user.commissionPercentOverride) + "%" : tx(["پیش‌فرض", "Default", "Standard", "Varsayılan"])],
                ] as [string, string, string][]).map(([icon, a, b]) => <article key={a}><Icon name={icon} size={22} /><span>{a}</span><strong>{b}</strong></article>)}
              </div>
              <Button onClick={() => setTab("access")}>{tx(["مدیریت اشتراک و دسترسی", "Manage plans & access", "Tarife & Zugriff verwalten", "Plan ve erişimi yönet"])}</Button>
            </div>
            <div className="panel">
              <h2>{tx(["آخرین تغییرات", "Recent changes", "Letzte Änderungen", "Son değişiklikler"])}</h2>
              {history.length ? history.slice(0, 4).map((h) => (
                <div className="activity-item" key={h.id}><Icon name="CheckCircle2" size={18} /><div><strong>{actionLabel(h.action, tx)}</strong><p>{date(h.createdAt)}</p></div></div>
              )) : <Empty />}
            </div>
          </>}
          {tab === "profile" && <ProfileForm user={user} tx={tx} put={put} />}
          {tab === "access" && <AccessForm user={user} tx={tx} put={put} planNames={planNames} modules={modules} locale={i} reloadModules={loadModules} reload={load} />}
          {tab === "payments" && (
            <div className="panel">
              <h2>{tx(["پرداخت‌های این کاربر", "This user’s payments", "Zahlungen dieses Benutzers", "Bu kullanıcının ödemeleri"])}</h2>
              {user.payments.length ? (
                <div className="table-wrap"><table>
                  <thead><tr>{[tx(["تاریخ", "Date", "Datum", "Tarih"]), tx(["پکیج", "Package", "Paket", "Paket"]), tx(["مبلغ", "Amount", "Betrag", "Tutar"]), tx(["روش", "Method", "Methode", "Yöntem"]), tx(["وضعیت", "Status", "Status", "Durum"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{user.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{date(p.createdAt)}</td>
                      <td>{planName(p.plan)}</td>
                      <td dir="ltr">{p.transferMinor != null && p.transferCurrency ? n(p.transferMinor / 100) + " " + p.transferCurrency : n(p.amount)}</td>
                      <td>{p.gateway || "—"}</td>
                      <td><span className={"badge " + (p.status === "SUCCESS" || p.status === "PAID" ? "green" : p.status === "FAILED" || p.status === "REJECTED" ? "red" : "")}>{p.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <Empty />}
              <p className="fine-print">{tx(["۲۰ پرداخت آخر؛ بررسی رسیدها در بخش مالی انجام می‌شود.", "The last 20 payments; receipts are reviewed in the finance section.", "Die letzten 20 Zahlungen; Belege werden im Finanzbereich geprüft.", "Son 20 ödeme; dekontlar finans bölümünde incelenir."])} <Link className="text-link" href="/admin/financial">{tx(["بخش مالی", "Finance", "Finanzen", "Finans"])}</Link></p>
            </div>
          )}
          {tab === "usage" && <>
            <div className="panel">
              <h2>{tx(["دفتر کل اعتبار", "Credit ledger", "Credit-Hauptbuch", "Kredi defteri"])}</h2>
              {creditLedger.length ? creditLedger.map((l) => (
                <article className="domain-card" key={l.id}>
                  <strong dir="ltr">{l.delta > 0 ? "+" : ""}{n(l.delta)} ✦ → {n(l.balanceAfter)}</strong>
                  <p>{l.type}{l.module ? " · " + l.module : ""}{l.reason ? " · " + l.reason : ""}</p>
                  <small>{date(l.createdAt)}</small>
                </article>
              )) : <Empty />}
            </div>
            <div className="panel">
              <h2>{tx(["آخرین مصرف‌ها", "Recent usage", "Letzte Nutzung", "Son kullanım"])}</h2>
              {user.usageLogs.length ? user.usageLogs.map((u) => (
                <div className="activity-item" key={u.id}><Icon name="Activity" size={18} /><div><strong>{u.type}{u.model ? " · " + u.model : ""}</strong><p>{date(u.createdAt)}{u.credits ? " · " + n(u.credits) + " ✦" : ""}</p></div></div>
              )) : <Empty />}
            </div>
          </>}
          {tab === "history" && (
            <div className="panel">
              <h2>{tx(["سابقه عملیات و رویدادها", "Audit trail and events", "Prüfpfad und Ereignisse", "Denetim kaydı ve olaylar"])}</h2>
              {history.length ? history.map((h) => (
                <article className="domain-card" key={h.id}>
                  <strong>{actionLabel(h.action, tx)}</strong>
                  <p>{date(h.createdAt)}</p>
                  <small>{h.actorId && h.actorId !== user.id ? tx(["توسط مدیر", "By an admin", "Durch einen Admin", "Yönetici tarafından"]) : tx(["توسط خود کاربر", "By the user", "Durch den Benutzer", "Kullanıcının kendisi"])}</small>
                </article>
              )) : <Empty />}
              <div className="danger-zone">
                <Button variant="danger" onClick={() => setDialog("delete")}><Icon name="Trash2" size={16} />{tx(["حذف حساب", "Delete account", "Konto löschen", "Hesabı sil"])}</Button>
              </div>
            </div>
          )}
        </section>
      </div>
      {dialog && <ActionDialog kind={dialog} user={user} tx={tx} put={put} onClose={() => setDialog(null)} />}
    </div>
  );
}

function actionLabel(action: string, tx: (c: Tx) => string) {
  const known: Record<string, Tx> = {
    account_registered: ["ثبت‌نام حساب", "Account registered", "Konto registriert", "Hesap oluşturuldu"],
    last_login: ["آخرین ورود", "Last sign-in", "Letzte Anmeldung", "Son giriş"],
    account_updated: ["ویرایش حساب توسط مدیر", "Account updated by an admin", "Konto von Admin geändert", "Hesap yönetici tarafından güncellendi"],
    fitness_admin_access_changed: ["تغییر دسترسی فیتنس", "FIT access changed", "FIT-Zugang geändert", "FIT erişimi değişti"],
    fitness_subscription_activated: ["فعال‌شدن اشتراک فیتنس", "FIT subscription activated", "FIT-Abo aktiviert", "FIT aboneliği etkinleşti"],
    module_override_updated: ["تغییر دسترسی ماژول", "Module access changed", "Modulzugriff geändert", "Modül erişimi değişti"],
  };
  if (known[action]) return tx(known[action]);
  if (action.startsWith("payment_")) return tx(["پرداخت", "Payment", "Zahlung", "Ödeme"]) + " · " + action.slice(8);
  if (action.startsWith("usage_")) return tx(["مصرف", "Usage", "Nutzung", "Kullanım"]) + " · " + action.slice(6);
  return action.replace(/_/g, " ");
}

type Put = (body: Record<string, unknown>, done: string) => Promise<boolean>;

function ProfileForm({ user, tx, put }: { user: User; tx: (c: Tx) => string; put: Put }) {
  const [form, setForm] = useState({ name: user.name || "", email: user.email || "", phone: user.phone || "", country: user.country || "", currency: user.currency || "", accountType: user.accountType || "PERSONAL", role: user.role });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    const body: Record<string, unknown> = {};
    if (form.name.trim() && form.name.trim() !== (user.name || "")) body.name = form.name.trim();
    if (form.email.trim() && form.email.trim() !== (user.email || "")) body.email = form.email.trim();
    if (form.phone.trim() !== (user.phone || "")) body.phone = form.phone.trim();
    if (form.country !== (user.country || "")) body.country = form.country.toUpperCase() || null;
    if (form.currency !== (user.currency || "")) body.currency = form.currency || null;
    if (form.accountType !== (user.accountType || "PERSONAL")) body.accountType = form.accountType;
    if (form.role !== user.role) body.role = form.role;
    if (!Object.keys(body).length) return toast(tx(["تغییری ثبت نشده است", "Nothing has changed", "Keine Änderungen", "Değişiklik yok"]));
    setBusy(true); await put(body, tx(["مشخصات حساب ذخیره شد", "Account details saved", "Kontodaten gespeichert", "Hesap bilgileri kaydedildi"])); setBusy(false);
  }
  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <h2>{tx(["اطلاعات شخصی و حساب", "Personal & account details", "Persönliche & Kontodaten", "Kişisel ve hesap bilgileri"])}</h2>
      <div className="domain-fields">
        <label>{tx(["نام", "Name", "Name", "Ad"])}<input value={form.name} onChange={set("name")} /></label>
        <label>{tx(["ایمیل", "Email", "E-Mail", "E-posta"])}<input type="email" dir="ltr" value={form.email} onChange={set("email")} /></label>
        <label>{tx(["شماره تماس (با کد کشور)", "Phone (with country code)", "Telefon (mit Vorwahl)", "Telefon (ülke koduyla)"])}<input type="tel" dir="ltr" value={form.phone} onChange={set("phone")} /></label>
        <label>{tx(["کد کشور (مثلاً IR)", "Country code (e.g. IR)", "Ländercode (z. B. DE)", "Ülke kodu (örn. TR)"])}<input dir="ltr" maxLength={2} value={form.country} onChange={set("country")} /></label>
        <label>{tx(["ارز نمایشی", "Display currency", "Anzeigewährung", "Görüntüleme para birimi"])}
          <select value={form.currency} onChange={set("currency")}>
            <option value="">{tx(["پیش‌فرض (بر اساس زبان)", "Default (by language)", "Standard (nach Sprache)", "Varsayılan (dile göre)"])}</option>
            <option value="IRT">{tx(["تومان", "Toman", "Toman", "Tümen"])}</option><option value="USD">USD</option><option value="EUR">EUR</option>
          </select>
        </label>
        <label>{tx(["نوع حساب", "Account type", "Kontotyp", "Hesap türü"])}
          <select value={form.accountType} onChange={set("accountType")}>
            <option value="PERSONAL">{tx(["شخصی", "Personal", "Privat", "Kişisel"])}</option>
            <option value="STUDENT">{tx(["دانشجویی", "Student", "Studierende", "Öğrenci"])}</option>
            <option value="BUSINESS">{tx(["کسب‌وکار", "Business", "Unternehmen", "İşletme"])}</option>
          </select>
        </label>
        <label>{tx(["نقش حساب", "Account role", "Kontorolle", "Hesap rolü"])}
          <select value={form.role} onChange={set("role")}>
            <option value="USER">{tx(["کاربر", "User", "Benutzer", "Kullanıcı"])}</option>
            <option value="ADMIN">{tx(["مدیر", "Admin", "Admin", "Yönetici"])}</option>
            <option value="SUPER_ADMIN">{tx(["مدیر ارشد", "Super admin", "Super-Admin", "Süper yönetici"])}</option>
          </select>
        </label>
      </div>
      <p className="fine-print">{tx(["تغییر نقش فقط توسط مدیر ارشد انجام می‌شود و در سابقه ثبت می‌شود.", "Only a super admin can change roles; every change is recorded.", "Nur Super-Admins können Rollen ändern; jede Änderung wird protokolliert.", "Rolleri yalnızca süper yönetici değiştirebilir; her değişiklik kaydedilir."])}</p>
      <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
    </form>
  );
}

function AccessForm({ user, tx, put, planNames, modules, locale, reloadModules, reload }: { user: User; tx: (c: Tx) => string; put: Put; planNames: Record<string, string>; modules: ModuleRow[]; locale: number; reloadModules: () => Promise<unknown>; reload: () => Promise<unknown> }) {
  const [form, setForm] = useState({ plan: user.plan, planExpiry: local(user.planExpiry), crmPlan: user.crmPlan || "NONE", crmPlanExpiry: local(user.crmPlanExpiry), commission: user.commissionPercentOverride != null ? String(user.commissionPercentOverride) : "" });
  const [draft, setDraft] = useState<Record<string, boolean | null>>({});
  const [fit, setFit] = useState({ days: "30", reason: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  // Every package an admin can assign (Package table), plus the built-in plans.
  const [packages, setPackages] = useState<{ planCode: string; name: string; nameEn: string | null; isActive: boolean }[]>([]);
  useEffect(() => { fetch("/api/admin/packages", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.packages && setPackages(d.packages)).catch(() => {}); }, []);
  const packageName = (code: string) => { const p = packages.find((x) => x.planCode === code); return p ? (locale === 0 ? p.name : p.nameEn || p.name) + (p.isActive ? "" : " (" + tx(["غیرفعال", "inactive", "inaktiv", "pasif"]) + ")") : planNames[code] || code; };
  const plans = Array.from(new Set([user.plan, "FREE", ...Object.keys(planNames), ...packages.map((p) => p.planCode)]));
  async function save() {
    const body: Record<string, unknown> = {};
    if (form.plan !== user.plan) body.plan = form.plan;
    if (form.planExpiry !== local(user.planExpiry)) body.planExpiry = form.planExpiry ? new Date(form.planExpiry).toISOString() : null;
    if (form.crmPlan !== (user.crmPlan || "NONE")) { body.crmPlan = form.crmPlan; if (form.crmPlan === "NONE") body.crmPlanExpiry = null; else if (!form.crmPlanExpiry) body.crmPlanExpiry = new Date(Date.now() + 30 * 86400000).toISOString(); }
    if (form.crmPlanExpiry !== local(user.crmPlanExpiry) && form.crmPlan !== "NONE") body.crmPlanExpiry = form.crmPlanExpiry ? new Date(form.crmPlanExpiry).toISOString() : null;
    const commission = form.commission.trim() === "" ? null : Number(form.commission);
    if (commission !== null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) return toast.error(tx(["درصد کمیسیون باید بین ۰ تا ۱۰۰ باشد", "Commission must be between 0 and 100", "Provision muss zwischen 0 und 100 liegen", "Komisyon 0 ile 100 arasında olmalı"]));
    if (commission !== user.commissionPercentOverride) body.commissionPercentOverride = commission;
    setBusy(true);
    let ok = true;
    if (Object.keys(body).length) ok = await put(body, tx(["اشتراک و دسترسی ذخیره شد", "Plans and access saved", "Tarife und Zugriff gespeichert", "Plan ve erişim kaydedildi"]));
    for (const [moduleKey, enabled] of Object.entries(draft)) {
      const res = await fetch("/api/admin/users/" + encodeURIComponent(user.id) + "/module-overrides", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey, enabled }) });
      if (!res.ok) { ok = false; const out = await res.json().catch(() => ({})); toast.error(out.error || moduleKey); }
    }
    if (Object.keys(draft).length) { setDraft({}); await reloadModules(); if (ok) toast.success(tx(["دسترسی ماژول‌ها ذخیره شد", "Module access saved", "Modulzugriff gespeichert", "Modül erişimi kaydedildi"])); }
    if (!Object.keys(body).length && !Object.keys(draft).length) toast(tx(["تغییری ثبت نشده است", "Nothing has changed", "Keine Änderungen", "Değişiklik yok"]));
    setBusy(false);
  }
  async function setFitness(enabled: boolean) {
    const days = Number(fit.days);
    if (enabled && (!Number.isInteger(days) || days < 1 || days > 366)) return toast.error(tx(["مدت باید بین ۱ تا ۳۶۶ روز باشد", "Days must be between 1 and 366", "Tage müssen zwischen 1 und 366 liegen", "Gün 1 ile 366 arasında olmalı"]));
    setBusy(true);
    const res = await fetch("/api/admin/users/" + encodeURIComponent(user.id) + "/fitness", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, days: enabled ? days : 1, ...(fit.reason.trim() ? { reason: fit.reason.trim() } : {}) }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(out.error || tx(["تغییر دسترسی فیتنس انجام نشد", "FIT access was not changed", "FIT-Zugang nicht geändert", "FIT erişimi değiştirilemedi"]));
    toast.success(enabled ? tx(["دسترسی فیتنس فعال شد", "FIT access enabled", "FIT-Zugang aktiviert", "FIT erişimi açıldı"]) : tx(["دسترسی فیتنس غیرفعال شد", "FIT access disabled", "FIT-Zugang deaktiviert", "FIT erişimi kapatıldı"]));
    await reload();
  }
  const fitActive = !!user.fitnessAccessExpiry && new Date(user.fitnessAccessExpiry).getTime() > Date.now();
  const moduleLabel = (m: ModuleRow) => [m.labelFa, m.labelEn, m.labelDe || m.labelEn, m.labelEn][locale];
  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <h2>{tx(["طرح، اعتبار زمانی و دسترسی‌ها", "Plans, expiry & permissions", "Tarife, Laufzeit & Rechte", "Plan, süre ve izinler"])}</h2>
      <div className="domain-fields">
        <label>{tx(["طرح پلتفرم", "Platform plan", "Plattform-Tarif", "Platform planı"])}
          <select value={form.plan} onChange={set("plan")}>{plans.map((p) => <option key={p} value={p}>{packageName(p)}</option>)}</select>
        </label>
        <label>{tx(["انقضای طرح", "Plan expiry", "Tarifende", "Plan bitişi"])}<input type="datetime-local" value={form.planExpiry} onChange={set("planExpiry")} /></label>
        <label>{tx(["اشتراک CRM", "CRM subscription", "CRM-Abo", "CRM aboneliği"])}
          <select value={form.crmPlan} onChange={set("crmPlan")}>
            <option value="NONE">{tx(["بدون CRM", "No CRM", "Kein CRM", "CRM yok"])}</option>
            <option value="SOLO">{tx(["CRM انفرادی", "CRM solo", "CRM Solo", "CRM bireysel"])}</option>
            <option value="TEAM">{tx(["CRM تیمی", "CRM team", "CRM Team", "CRM ekip"])}</option>
          </select>
        </label>
        <label>{tx(["انقضای CRM", "CRM expiry", "CRM-Ende", "CRM bitişi"])}<input type="datetime-local" disabled={form.crmPlan === "NONE"} value={form.crmPlanExpiry} onChange={set("crmPlanExpiry")} /></label>
        <label>{tx(["درصد کمیسیون اختصاصی (خالی = پیش‌فرض)", "Custom commission % (empty = default)", "Eigene Provision % (leer = Standard)", "Özel komisyon % (boş = varsayılan)"])}<input type="number" min={0} max={100} step={0.5} dir="ltr" value={form.commission} onChange={set("commission")} /></label>
      </div>
      <p className="fine-print">{tx(["طرح پولی بدون تاریخ انقضا، به‌طور خودکار ۳۰ روز اعتبار می‌گیرد.", "A paid plan without an expiry automatically gets 30 days.", "Ein bezahlter Tarif ohne Ende erhält automatisch 30 Tage.", "Bitişi olmayan ücretli plan otomatik olarak 30 gün alır."])}</p>
      <div className="admin-fit-access">
        <h3>{tx(["دسترسی فیتنس", "FIT access", "FIT-Zugang", "FIT erişimi"])} <span className={"badge " + (fitActive ? "green" : "")}>{fitActive ? tx(["فعال", "Enabled", "Aktiv", "Aktif"]) : tx(["غیرفعال", "Disabled", "Inaktiv", "Kapalı"])}</span></h3>
        <div className="domain-fields">
          <label>{tx(["مدت (روز)", "Days", "Tage", "Gün"])}<input type="number" min={1} max={366} dir="ltr" value={fit.days} onChange={(e) => setFit({ ...fit, days: e.target.value })} /></label>
          <label>{tx(["دلیل (اختیاری)", "Reason (optional)", "Grund (optional)", "Neden (isteğe bağlı)"])}<input value={fit.reason} onChange={(e) => setFit({ ...fit, reason: e.target.value })} /></label>
        </div>
        <div className="domain-actions">
          <Button disabled={busy} onClick={() => void setFitness(true)}>{fitActive ? tx(["تمدید دسترسی", "Extend access", "Zugang verlängern", "Erişimi uzat"]) : tx(["فعال‌سازی دسترسی", "Enable access", "Zugang aktivieren", "Erişimi aç"])}</Button>
          {fitActive && <Button variant="danger" disabled={busy} onClick={() => void setFitness(false)}>{tx(["قطع دسترسی", "Disable access", "Zugang entziehen", "Erişimi kapat"])}</Button>}
        </div>
      </div>
      <h3>{tx(["استثنای دسترسی ماژول‌ها", "Module access overrides", "Modul-Ausnahmen", "Modül erişim istisnaları"])}</h3>
      <div className="user-module-access">
        {modules.map((m) => {
          const value = m.key in draft ? draft[m.key] : m.override;
          return (
            <label key={m.key}>
              <span>{moduleLabel(m)}</span>
              <select aria-label={moduleLabel(m)} value={value === null ? "default" : value ? "allow" : "deny"} onChange={(e) => setDraft({ ...draft, [m.key]: e.target.value === "default" ? null : e.target.value === "allow" })}>
                <option value="default">{tx(["طبق طرح", "Plan default", "Wie Tarif", "Plana göre"])}</option>
                <option value="allow">{tx(["مجاز", "Allow", "Erlauben", "İzin ver"])}</option>
                <option value="deny">{tx(["مسدود", "Deny", "Sperren", "Engelle"])}</option>
              </select>
            </label>
          );
        })}
      </div>
      <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
    </form>
  );
}

function ActionDialog({ kind, user, tx, put, onClose }: { kind: "block" | "credits" | "delete"; user: User; tx: (c: Tx) => string; put: Put; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const delta = Number(amount);
  const validCredit = Number.isSafeInteger(delta) && delta !== 0 && user.credits + delta >= 0 && reason.trim().length >= 3;
  async function submit() {
    setBusy(true);
    if (kind === "credits") { if (await put({ creditDelta: delta, creditReason: reason.trim() }, tx(["اعتبار اصلاح شد", "Credits adjusted", "Credits angepasst", "Kredi düzenlendi"]))) onClose(); }
    else if (kind === "block") { if (await put({ isBlocked: !user.isBlocked }, user.isBlocked ? tx(["حساب فعال شد", "Account unblocked", "Konto entsperrt", "Hesabın engeli kaldırıldı"]) : tx(["حساب مسدود شد", "Account blocked", "Konto gesperrt", "Hesap engellendi"]))) onClose(); }
    else {
      const res = await fetch("/api/admin/users/" + encodeURIComponent(user.id), { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success(tx(["حساب حذف شد", "Account deleted", "Konto gelöscht", "Hesap silindi"])); location.assign("/admin/users"); return; }
      toast.error(res.status === 403 ? tx(["فقط مدیر ارشد اجازهٔ این کار را دارد", "Only a super admin can do this", "Nur ein Super-Admin darf das", "Bunu yalnızca süper yönetici yapabilir"]) : tx(["حذف انجام نشد", "The account was not deleted", "Konto nicht gelöscht", "Hesap silinemedi"]));
    }
    setBusy(false);
  }
  const title = kind === "credits" ? tx(["اصلاح اعتبار کاربر", "Adjust user credits", "Credits anpassen", "Kullanıcı kredisini düzenle"])
    : kind === "delete" ? tx(["حذف دائمی حساب", "Delete account permanently", "Konto endgültig löschen", "Hesabı kalıcı olarak sil"])
    : user.isBlocked ? tx(["فعال‌سازی کاربر", "Unblock user", "Benutzer entsperren", "Kullanıcının engelini kaldır"]) : tx(["مسدودسازی کاربر", "Block user", "Benutzer sperren", "Kullanıcıyı engelle"]);
  const deleteWord = user.email || user.phone || user.id;
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {kind === "credits" && <>
          <label>{tx(["مقدار تغییر (مثبت یا منفی)", "Adjustment (positive or negative)", "Änderung (positiv oder negativ)", "Değişiklik (pozitif veya negatif)"])}<input inputMode="numeric" dir="ltr" required value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))} /></label>
          <label>{tx(["دلیل تغییر (در دفتر کل ثبت می‌شود)", "Reason (recorded in the ledger)", "Grund (im Hauptbuch gespeichert)", "Neden (deftere kaydedilir)"])}<textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          {Number.isSafeInteger(delta) && user.credits + delta < 0 && <p role="alert">{tx(["مانده اعتبار نمی‌تواند منفی شود.", "Credit balance cannot become negative.", "Das Guthaben darf nicht negativ werden.", "Kredi bakiyesi negatif olamaz."])}</p>}
        </>}
        {kind === "block" && <p>{user.isBlocked ? tx(["کاربر دوباره می‌تواند وارد حساب شود.", "The user will be able to sign in again.", "Der Benutzer kann sich wieder anmelden.", "Kullanıcı yeniden giriş yapabilecek."]) : tx(["کاربر تا رفع مسدودی نمی‌تواند وارد شود یا از سرویس استفاده کند.", "The user cannot sign in or use the service until unblocked.", "Der Benutzer kann sich bis zur Entsperrung nicht anmelden.", "Kullanıcı engel kaldırılana kadar giriş yapamaz."])}</p>}
        {kind === "delete" && <>
          <p role="alert">{tx(["این کار برگشت‌ناپذیر است و همهٔ داده‌های این حساب حذف می‌شود.", "This cannot be undone; all of this account’s data is removed.", "Das kann nicht rückgängig gemacht werden; alle Daten werden gelöscht.", "Bu geri alınamaz; hesabın tüm verileri silinir."])}</p>
          <label>{tx(["برای تأیید بنویسید:", "Type to confirm:", "Zur Bestätigung eingeben:", "Onaylamak için yazın:"])} <code dir="ltr">{deleteWord}</code><input dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
        </>}
        <Button type="submit" variant={kind === "credits" ? "primary" : "danger"} disabled={busy || (kind === "credits" && !validCredit) || (kind === "delete" && confirm.trim() !== deleteWord)}>
          {tx(["تأیید و ثبت تغییر", "Confirm and record change", "Bestätigen und speichern", "Onayla ve kaydet"])}
        </Button>
      </form>
    </Modal>
  );
}
