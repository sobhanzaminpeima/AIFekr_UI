"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { contacts } from "@/mocks/catalog";
import { modules } from "@/lib/upstream/registry";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Profile = {
  phone: string;
  country: string;
  currency: string;
  role: string;
  plan: string;
  expiry: string;
  crmPlan: string;
  crmExpiry: string;
  blocked: boolean;
  credits: number;
  commission: number;
  fitness: boolean;
  academy: boolean;
  notes: string;
  overrides: Record<string, string>;
  history: { id: string; action: string; date: string }[];
};
const initial: Profile = {
  phone: "",
  country: "",
  currency: "IRT",
  role: "user",
  plan: "free",
  expiry: "",
  crmPlan: "none",
  crmExpiry: "",
  blocked: false,
  credits: 0,
  commission: 0,
  fitness: false,
  academy: false,
  notes: "",
  overrides: {},
  history: [],
};
export function AdminUserDetail({ id }: { id: string }) {
  const { fa, t, n, price } = useApp();
  const [users, saveUsers, ready] = useLocalState(
    "aifekr-admin-users",
    contacts,
  );
  const [profile, saveProfile] = useLocalState<Profile>(
    "aifekr-admin-user:" + id,
    initial,
  );
  const user = users.find((u) => u.id === id);
  const [tab, setTab] = useState("overview");
  const [draft, setDraft] = useState<Profile | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"block" | "credits" | null>(null);
  const [amount, setAmount] = useState(0),
    [reason, setReason] = useState("");
  function update(next: Profile, action: string) {
    saveProfile({
      ...next,
      history: [
        { id: crypto.randomUUID(), action, date: new Date().toISOString() },
        ...profile.history,
      ],
    });
    toast.success(fa ? "تغییرات محلی ذخیره شد" : "Local changes saved");
  }
  if (!ready) return <div className="panel">{t("loading")}</div>;
  if (!user)
    return (
      <div className="panel">
        <h1>{fa ? "کاربر پیدا نشد" : "User not found"}</h1>
        <p>
          {fa
            ? "این شناسه در فهرست کاربران این پیش‌نمایش نیست."
            : "This ID is not present in the preview user list."}
        </p>
        <Link className="btn" href="/admin/users">
          {fa ? "بازگشت به کاربران" : "Back to users"}
        </Link>
      </div>
    );
  const current = draft || profile;
  const tabs = [
    ["overview", "نمای کلی", "Overview"],
    ["profile", "اطلاعات حساب", "Account details"],
    ["access", "اشتراک و دسترسی", "Plans & access"],
    ["payments", "پرداخت‌ها", "Payments"],
    ["usage", "مصرف و گفتگوها", "Usage & conversations"],
    ["notes", "یادداشت مدیریت", "Admin notes"],
    ["history", "سابقه تغییرات", "Audit history"],
  ];
  return (
    <div className="admin-user-detail">
      <Link className="text-link" href="/admin/users">
        <Icon name="ArrowRight" size={16} />
        {fa ? "همه کاربران" : "All users"}
      </Link>
      <header className="user-profile-hero">
        <div className="user-profile-avatar">
          {(fa ? user.name : user.en).slice(0, 1)}
        </div>
        <div>
          <span className="eyebrow">AIFekr / USER PROFILE</span>
          <h1>{fa ? user.name : user.en}</h1>
          <p dir="ltr">{user.email}</p>
          <div className="domain-actions">
            <span className={"badge " + (profile.blocked ? "red" : "green")}>
              {profile.blocked
                ? fa
                  ? "مسدود"
                  : "Blocked"
                : fa
                  ? "فعال"
                  : "Active"}
            </span>
            <span className="badge">{profile.plan.toUpperCase()}</span>
            <code>#{id}</code>
          </div>
        </div>
        <div className="user-profile-actions">
          <Button
            onClick={() =>
              download(
                "user-" + id + ".json",
                JSON.stringify({ user, profile }, null, 2),
                "application/json",
              )
            }
          >
            <Icon name="Download" size={16} />
            {fa ? "خروجی پرونده" : "Export profile"}
          </Button>
          <Button
            variant={profile.blocked ? "" : "danger"}
            onClick={() => setDialog("block")}
          >
            {profile.blocked
              ? fa
                ? "فعال‌سازی حساب"
                : "Unblock account"
              : fa
                ? "مسدودسازی حساب"
                : "Block account"}
          </Button>
        </div>
      </header>
      <nav
        className="module-tabs"
        aria-label={fa ? "بخش‌های پرونده کاربر" : "User profile sections"}
      >
        {tabs.map(([key, a, b]) => (
          <button
            className={tab === key ? "selected" : ""}
            aria-pressed={tab === key}
            key={key}
            onClick={() => setTab(key)}
          >
            {fa ? a : b}
          </button>
        ))}
      </nav>
      <div className="user-profile-layout">
        <aside className="panel user-profile-summary">
          <h2>{fa ? "خلاصه حساب" : "Account summary"}</h2>
          <dl className="domain-detail">
            {[
              [fa ? "شناسه کاربر" : "User ID", id],
              [fa ? "نقش" : "Role", profile.role],
              [fa ? "شماره تماس" : "Phone", profile.phone || "—"],
              [fa ? "کشور" : "Country", profile.country || "—"],
              [fa ? "ارز" : "Currency", profile.currency],
              [
                fa ? "انقضای طرح" : "Plan expiry",
                profile.expiry?.replace("T", " ") || "—",
              ],
            ].map(([a, b]) => (
              <div key={a}>
                <dt>{a}</dt>
                <dd>{b}</dd>
              </div>
            ))}
          </dl>
          <div className="user-credit-summary">
            <span>
              {fa ? "اعتبار ثبت‌شده در پرونده" : "Credits recorded in profile"}
            </span>
            <strong>{n(profile.credits)} ✦</strong>
            <Button
              onClick={() => {
                setDialog("credits");
                setAmount(0);
                setReason("");
              }}
            >
              {fa ? "اصلاح اعتبار" : "Adjust credits"}
            </Button>
          </div>
          <p className="fine-print">
            {fa
              ? "پروندهٔ نمایشی محلی؛ اطلاعات و عملیات به حساب واقعی متصل نیستند."
              : "Local preview profile. Data and actions are not connected to a real account."}
          </p>
        </aside>
        <section className="user-profile-main">
          {tab === "overview" && (
            <>
              <div className="stats-grid">
                <div className="panel stat">
                  <span>{fa ? "اعتبار" : "Credits"}</span>
                  <strong>{n(profile.credits)}</strong>
                </div>
                <div className="panel stat">
                  <span>{fa ? "تغییرات مدیریتی" : "Admin changes"}</span>
                  <strong>{n(profile.history.length)}</strong>
                </div>
                <div className="panel stat">
                  <span>{fa ? "دسترسی اختصاصی" : "Custom overrides"}</span>
                  <strong>
                    {n(
                      Object.values(profile.overrides).filter(
                        (v) => v !== "default",
                      ).length,
                    )}
                  </strong>
                </div>
              </div>
              <div className="panel">
                <h2>{fa ? "اشتراک‌های کاربر" : "User subscriptions"}</h2>
                <div className="user-entitlements">
                  {[
                    ["Package", fa ? "پلتفرم" : "Platform", profile.plan],
                    ["Users", "CRM", profile.crmPlan],
                    [
                      "Dumbbell",
                      fa ? "فیتنس" : "FIT",
                      profile.fitness
                        ? fa
                          ? "فعال"
                          : "Enabled"
                        : fa
                          ? "غیرفعال"
                          : "Disabled",
                    ],
                    [
                      "GraduationCap",
                      fa ? "آکادمی" : "Academy",
                      profile.academy
                        ? fa
                          ? "فعال"
                          : "Enabled"
                        : fa
                          ? "غیرفعال"
                          : "Disabled",
                    ],
                  ].map(([icon, a, b]) => (
                    <article key={a}>
                      <Icon name={icon} size={22} />
                      <span>{a}</span>
                      <strong>{b}</strong>
                    </article>
                  ))}
                </div>
                <Button onClick={() => setTab("access")}>
                  {fa ? "مدیریت اشتراک و دسترسی" : "Manage plans & access"}
                </Button>
              </div>
              <div className="panel">
                <h2>{fa ? "آخرین تغییرات" : "Recent changes"}</h2>
                {profile.history.length ? (
                  profile.history.slice(0, 4).map((h) => (
                    <div className="activity-item" key={h.id}>
                      <Icon name="CheckCircle2" size={18} />
                      <div>
                        <strong>{h.action}</strong>
                        <p>{h.date.slice(0, 16).replace("T", " ")}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty />
                )}
              </div>
            </>
          )}
          {tab === "profile" && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                const normalized = (email ?? user.email).trim();
                if (
                  users.some(
                    (u) =>
                      u.id !== id &&
                      u.email.toLowerCase() === normalized.toLowerCase(),
                  )
                ) {
                  toast.error(
                    fa
                      ? "ایمیل برای کاربر دیگری ثبت شده است"
                      : "Email belongs to another user",
                  );
                  return;
                }
                saveUsers(
                  users.map((u) =>
                    u.id === id
                      ? {
                          ...u,
                          name: name ?? u.name,
                          en: name ?? u.en,
                          email: normalized,
                        }
                      : u,
                  ),
                );
                update(
                  current,
                  fa ? "ویرایش مشخصات حساب" : "Account details updated",
                );
                setDraft(null);
              }}
            >
              <h2>
                {fa ? "اطلاعات شخصی و حساب" : "Personal & account details"}
              </h2>
              <div className="domain-fields">
                <label>
                  {t("name")}
                  <input
                    required
                    value={name ?? user.name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  {t("email")}
                  <input
                    required
                    type="email"
                    value={email ?? user.email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  {fa ? "شماره تماس" : "Phone"}
                  <input
                    type="tel"
                    value={current.phone}
                    onChange={(e) =>
                      setDraft({ ...current, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "کشور" : "Country"}
                  <input
                    value={current.country}
                    onChange={(e) =>
                      setDraft({ ...current, country: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "ارز حساب" : "Account currency"}
                  <select
                    value={current.currency}
                    onChange={(e) =>
                      setDraft({ ...current, currency: e.target.value })
                    }
                  >
                    <option>IRT</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </label>
                <label>
                  {fa ? "نقش حساب" : "Account role"}
                  <select
                    value={current.role}
                    onChange={(e) =>
                      setDraft({ ...current, role: e.target.value })
                    }
                  >
                    <option value="user">{fa ? "کاربر" : "User"}</option>
                    <option value="support">
                      {fa ? "پشتیبان" : "Support"}
                    </option>
                    <option value="admin">{fa ? "مدیر" : "Admin"}</option>
                  </select>
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          )}
          {tab === "access" && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                update(
                  current,
                  fa
                    ? "ویرایش اشتراک‌ها و دسترسی"
                    : "Subscriptions and access updated",
                );
                setDraft(null);
              }}
            >
              <h2>
                {fa
                  ? "طرح، اعتبار زمانی و دسترسی‌ها"
                  : "Plans, expiry & permissions"}
              </h2>
              <div className="domain-fields">
                <label>
                  {fa ? "طرح پلتفرم" : "Platform plan"}
                  <select
                    value={current.plan}
                    onChange={(e) =>
                      setDraft({ ...current, plan: e.target.value })
                    }
                  >
                    {["free", "basic", "pro", "business", "student"].map(
                      (p) => (
                        <option key={p}>{p}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  {fa ? "انقضای طرح" : "Plan expiry"}
                  <input
                    type="datetime-local"
                    value={current.expiry}
                    onChange={(e) =>
                      setDraft({ ...current, expiry: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "اشتراک CRM" : "CRM subscription"}
                  <select
                    value={current.crmPlan}
                    onChange={(e) =>
                      setDraft({ ...current, crmPlan: e.target.value })
                    }
                  >
                    {["none", "solo", "team"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {fa ? "انقضای CRM" : "CRM expiry"}
                  <input
                    type="datetime-local"
                    value={current.crmExpiry}
                    onChange={(e) =>
                      setDraft({ ...current, crmExpiry: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "درصد همکاری اختصاصی" : "Custom commission %"}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={current.commission}
                    onChange={(e) =>
                      setDraft({
                        ...current,
                        commission: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              {(["fitness", "academy"] as const).map((key, i) => (
                <label className="toggle-row" key={key}>
                  <span>
                    {
                      (fa
                        ? ["دسترسی فیتنس", "دسترسی آکادمی"]
                        : ["FIT access", "Academy access"])[i]
                    }
                  </span>
                  <input
                    type="checkbox"
                    checked={current[key]}
                    onChange={(e) =>
                      setDraft({ ...current, [key]: e.target.checked })
                    }
                  />
                </label>
              ))}
              <h3>
                {fa ? "استثنای دسترسی ماژول‌ها" : "Module access overrides"}
              </h3>
              <div className="user-module-access">
                {modules
                  .filter((m) => m.group !== "account")
                  .map((m) => (
                    <label key={m.id}>
                      <span>
                        <Icon name={m.icon} size={17} />
                        {m.title[fa ? 0 : 1]}
                      </span>
                      <select
                        aria-label={m.title[fa ? 0 : 1]}
                        value={current.overrides[m.id] || "default"}
                        onChange={(e) =>
                          setDraft({
                            ...current,
                            overrides: {
                              ...current.overrides,
                              [m.id]: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="default">
                          {fa ? "طبق طرح" : "Plan default"}
                        </option>
                        <option value="allow">{fa ? "مجاز" : "Allow"}</option>
                        <option value="deny">{fa ? "مسدود" : "Deny"}</option>
                      </select>
                    </label>
                  ))}
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          )}
          {["payments", "usage"].includes(tab) && (
            <div className="panel">
              <h2>
                {tab === "payments"
                  ? fa
                    ? "پرداخت‌های این کاربر"
                    : "This user’s payments"
                  : fa
                    ? "مصرف، گفتگو و خروجی‌ها"
                    : "Usage, conversations & outputs"}
              </h2>
              <Empty />
              <p className="fine-print">
                {fa
                  ? "دادهٔ مرتبط با این شناسه در پیش‌نمایش موجود نیست. سوابق عمومی یا کاربران دیگر در این پرونده نمایش داده نمی‌شود."
                  : "No records linked to this user ID are available in the preview. Unrelated users’ records are not shown here."}
              </p>
            </div>
          )}
          {tab === "notes" && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                update(current, fa ? "ثبت یادداشت مدیریت" : "Admin note saved");
                setDraft(null);
              }}
            >
              <h2>{fa ? "یادداشت داخلی مدیریت" : "Internal admin notes"}</h2>
              <label>
                {fa ? "یادداشت پرونده" : "Profile note"}
                <textarea
                  rows={10}
                  value={current.notes}
                  onChange={(e) =>
                    setDraft({ ...current, notes: e.target.value })
                  }
                />
              </label>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          )}
          {tab === "history" && (
            <div className="panel">
              <h2>{fa ? "سابقه عملیات مدیریت" : "Admin audit trail"}</h2>
              {!profile.history.length ? (
                <Empty />
              ) : (
                profile.history.map((h) => (
                  <article className="domain-card" key={h.id}>
                    <strong>{h.action}</strong>
                    <p>{h.date.slice(0, 19).replace("T", " ")}</p>
                    <small>
                      {fa
                        ? "عامل: مدیر پیش‌نمایش محلی"
                        : "Actor: local preview administrator"}
                    </small>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>
      {dialog && (
        <Modal
          title={
            dialog === "credits"
              ? fa
                ? "اصلاح اعتبار کاربر"
                : "Adjust user credits"
              : profile.blocked
                ? fa
                  ? "فعال‌سازی کاربر"
                  : "Unblock user"
                : fa
                  ? "مسدودسازی کاربر"
                  : "Block user"
          }
          onClose={() => setDialog(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dialog === "credits") {
                if (
                  !Number.isSafeInteger(amount) ||
                  profile.credits + amount < 0
                )
                  return;
                update(
                  { ...profile, credits: profile.credits + amount },
                  `${fa ? "اصلاح اعتبار" : "Credit adjustment"}: ${amount > 0 ? "+" : ""}${amount} · ${reason}`,
                );
              } else {
                update(
                  { ...profile, blocked: !profile.blocked },
                  (profile.blocked
                    ? fa
                      ? "فعال‌سازی حساب"
                      : "Account unblocked"
                    : fa
                      ? "مسدودسازی حساب"
                      : "Account blocked") +
                    " · " +
                    reason,
                );
              }
              setDialog(null);
            }}
          >
            {dialog === "credits" && (
              <label>
                {fa
                  ? "مقدار تغییر (مثبت یا منفی)"
                  : "Adjustment (positive or negative)"}
                <input
                  type="number"
                  step={1}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
            )}
            <label>
              {fa ? "دلیل تغییر" : "Reason for change"}
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {dialog === "credits" && profile.credits + amount < 0 && (
              <p role="alert">
                {fa
                  ? "مانده اعتبار نمی‌تواند منفی شود."
                  : "Credit balance cannot become negative."}
              </p>
            )}
            <Button
              type="submit"
              variant={dialog === "block" ? "danger" : "primary"}
              disabled={
                dialog === "credits" &&
                (!Number.isSafeInteger(amount) ||
                  !amount ||
                  profile.credits + amount < 0)
              }
            >
              {fa ? "تأیید و ثبت تغییر" : "Confirm and record change"}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
