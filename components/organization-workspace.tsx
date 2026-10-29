"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { modules } from "@/lib/upstream/registry";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};
type Invite = {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "revoked";
  date: string;
};
type Workspace = {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  members: Member[];
  invites: Invite[];
  access: Record<string, boolean>;
  permissions: Record<string, boolean>;
  audit: { id: string; action: string; date: string }[];
};
const roles = [
  ["owner", "مالک", "Owner"],
  ["manager", "مدیر", "Manager"],
  ["member", "همکار", "Member"],
  ["viewer", "مشاهده‌گر", "Viewer"],
];
export function OrganizationWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [spaces, save] = useLocalState<Workspace[]>(
    "aifekr-team-workspaces",
    [],
  );
  const [selected, select] = useLocalState<string>("aifekr-team-active", "");
  const [draft, setDraft] = useState<Workspace | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [step, setStep] = useState(0);
  const workspace = spaces.find((s) => s.id === selected) || spaces[0];
  const initial = (): Workspace => ({
    id: crypto.randomUUID(),
    name: "",
    industry: "services",
    website: "",
    phone: "",
    members: [
      {
        id: "owner",
        name: fa ? "مدیر فضای کاری" : "Workspace owner",
        email: "owner@example.com",
        role: "owner",
        active: true,
      },
    ],
    invites: [],
    access: {},
    permissions: {},
    audit: [],
  });
  function update(next: Workspace, action: string) {
    save(
      spaces.map((s) =>
        s.id === next.id
          ? {
              ...next,
              audit: [
                {
                  id: crypto.randomUUID(),
                  action,
                  date: new Date().toISOString(),
                },
                ...next.audit,
              ],
            }
          : s,
      ),
    );
    toast.success(t("save"));
  }
  if (view === "identity" || !workspace) {
    const current = draft || workspace;
    return (
      <section className="panel team-onboarding">
        <div className="team-intro">
          <span className="icon-chip amber">
            <Icon name="Building2" size={34} />
          </span>
          <div>
            <h2>{fa ? "یک خانه برای کار تیمی" : "A home for teamwork"}</h2>
            <p>
              {fa
                ? "هویت کسب‌وکار را تعریف کن؛ سپس همکاران و ابزارهای مشترک را مشخص کن."
                : "Define your business, then choose your teammates and shared tools."}
            </p>
          </div>
        </div>
        {!current ? (
          <Button variant="primary" onClick={() => setDraft(initial())}>
            {fa ? "راه‌اندازی فضای تیم" : "Set up team workspace"}
          </Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 0) {
                setStep(1);
                return;
              }
              const next = {
                ...current,
                audit: [
                  {
                    id: crypto.randomUUID(),
                    action: fa
                      ? "ذخیره هویت کسب‌وکار"
                      : "Business identity saved",
                    date: new Date().toISOString(),
                  },
                  ...current.audit,
                ],
              };
              save(
                spaces.some((s) => s.id === next.id)
                  ? spaces.map((s) => (s.id === next.id ? next : s))
                  : [...spaces, next],
              );
              select(next.id);
              setDraft(null);
              toast.success(fa ? "فضای کاری ذخیره شد" : "Workspace saved");
            }}
          >
            <ol className="wizard-steps">
              <li className={step === 0 ? "selected" : ""}>
                {fa ? "۱. مشخصات کسب‌وکار" : "1. Business details"}
              </li>
              <li className={step === 1 ? "selected" : ""}>
                {fa ? "۲. بررسی و راه‌اندازی" : "2. Review & create"}
              </li>
            </ol>
            {step === 0 ? (
              <div className="domain-fields">
                <label>
                  {fa ? "نام کسب‌وکار" : "Business name"}
                  <input
                    required
                    value={current.name}
                    onChange={(e) =>
                      setDraft({ ...current, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "حوزه فعالیت" : "Industry"}
                  <select
                    value={current.industry}
                    onChange={(e) =>
                      setDraft({ ...current, industry: e.target.value })
                    }
                  >
                    {[
                      ["services", "خدمات", "Services"],
                      ["retail", "فروشگاه", "Retail"],
                      ["property", "املاک", "Real estate"],
                      ["agency", "آژانس", "Agency"],
                      ["education", "آموزش", "Education"],
                    ].map(([id, a, b]) => (
                      <option key={id} value={id}>
                        {fa ? a : b}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {fa ? "وب‌سایت" : "Website"}
                  <input
                    type="url"
                    value={current.website}
                    onChange={(e) =>
                      setDraft({ ...current, website: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "تلفن کسب‌وکار" : "Business phone"}
                  <input
                    type="tel"
                    value={current.phone}
                    onChange={(e) =>
                      setDraft({ ...current, phone: e.target.value })
                    }
                  />
                </label>
              </div>
            ) : (
              <dl className="domain-detail">
                {[
                  [fa ? "نام" : "Name", current.name],
                  [fa ? "صنعت" : "Industry", current.industry],
                  [fa ? "وب‌سایت" : "Website", current.website || "—"],
                  [fa ? "تلفن" : "Phone", current.phone || "—"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <dt>{a}</dt>
                    <dd>{b}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="domain-actions">
              {step > 0 && (
                <Button onClick={() => setStep(0)}>
                  {fa ? "قبلی" : "Back"}
                </Button>
              )}
              <Button variant="primary" type="submit">
                {step === 0
                  ? fa
                    ? "بررسی اطلاعات"
                    : "Review details"
                  : t("save")}
              </Button>
            </div>
          </form>
        )}
      </section>
    );
  }
  const toolbar = (
    <div className="team-toolbar">
      <span className="team-logo">
        <Icon name="Building2" size={20} />
      </span>
      <label>
        {fa ? "فضای کاری فعال" : "Active workspace"}
        <select
          aria-label={fa ? "فضای کاری فعال" : "Active workspace"}
          value={workspace.id}
          onChange={(e) => select(e.target.value)}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <span className="badge">
        {n(workspace.members.filter((m) => m.active).length)}{" "}
        {fa ? "عضو فعال" : "active members"}
      </span>
    </div>
  );
  if (view === "workspaces")
    return (
      <>
        {toolbar}
        <div className="tool-grid">
          {spaces.map((s) => (
            <article className="panel team-space-card" key={s.id}>
              <Icon name="Building2" size={32} />
              <h3>{s.name}</h3>
              <p>
                {s.industry} · {n(s.members.length)} {fa ? "عضو" : "members"}
              </p>
              <Button
                onClick={() => {
                  select(s.id);
                  toast.success(
                    fa ? "فضای کاری انتخاب شد" : "Workspace selected",
                  );
                }}
              >
                {fa ? "انتخاب این فضا" : "Select workspace"}
              </Button>
            </article>
          ))}
        </div>
      </>
    );
  if (view === "members")
    return (
      <>
        {toolbar}
        <section className="panel">
          <h2>{fa ? "اعضا و مسئولیت‌ها" : "People & responsibilities"}</h2>
          {workspace.members.map((m) => (
            <article className="team-member" key={m.id}>
              <span className="avatar">{m.name.slice(0, 1)}</span>
              <div>
                <strong>{m.name}</strong>
                <small dir="ltr">{m.email}</small>
              </div>
              <select
                aria-label={(fa ? "نقش " : "Role ") + m.email}
                disabled={m.role === "owner"}
                value={m.role}
                onChange={(e) =>
                  update(
                    {
                      ...workspace,
                      members: workspace.members.map((x) =>
                        x.id === m.id ? { ...x, role: e.target.value } : x,
                      ),
                    },
                    (fa ? "تغییر نقش عضو: " : "Member role changed: ") +
                      m.email,
                  )
                }
              >
                {roles.map(([id, a, b]) => (
                  <option key={id} value={id}>
                    {fa ? a : b}
                  </option>
                ))}
              </select>
              <Button
                disabled={m.role === "owner"}
                onClick={() =>
                  update(
                    {
                      ...workspace,
                      members: workspace.members.map((x) =>
                        x.id === m.id ? { ...x, active: !x.active } : x,
                      ),
                    },
                    (fa ? "تغییر وضعیت عضو: " : "Member status changed: ") +
                      m.email,
                  )
                }
              >
                {m.active
                  ? fa
                    ? "غیرفعال کردن"
                    : "Deactivate"
                  : fa
                    ? "فعال کردن"
                    : "Activate"}
              </Button>
            </article>
          ))}
          <p className="fine-print">
            {fa
              ? "نقش مالک در این پیش‌نمایش تغییر نمی‌کند. تغییرات فقط روی فضای محلی ثبت می‌شوند."
              : "The owner role cannot be changed here. Changes apply only to this local workspace."}
          </p>
        </section>
      </>
    );
  if (view === "invites")
    return (
      <>
        {toolbar}
        <div className="team-invite-layout">
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const normalized = email.trim().toLowerCase();
              if (
                workspace.members.some(
                  (m) => m.email.toLowerCase() === normalized,
                ) ||
                workspace.invites.some(
                  (i) => i.email === normalized && i.status === "pending",
                )
              ) {
                toast.error(
                  fa
                    ? "این ایمیل عضو است یا دعوت فعال دارد."
                    : "This email is a member or already has a pending invitation.",
                );
                return;
              }
              update(
                {
                  ...workspace,
                  invites: [
                    {
                      id: crypto.randomUUID(),
                      email: normalized,
                      role,
                      status: "pending",
                      date: new Date().toISOString(),
                    },
                    ...workspace.invites,
                  ],
                },
                (fa ? "ایجاد دعوت: " : "Invitation created: ") + normalized,
              );
              setEmail("");
            }}
          >
            <span className="icon-chip amber">
              <Icon name="Users" size={28} />
            </span>
            <h2>{fa ? "فکرهای بیشتر، در یک تیم." : "More ideas, one team."}</h2>
            <label>
              {t("email")}
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              {fa ? "نقش همکار" : "Teammate role"}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {roles
                  .filter((r) => r[0] !== "owner")
                  .map(([id, a, b]) => (
                    <option key={id} value={id}>
                      {fa ? a : b}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="submit" variant="primary">
              {fa ? "ایجاد دعوت محلی" : "Create local invitation"}
            </Button>
            <p className="fine-print">
              {fa
                ? "ایمیلی ارسال نمی‌شود. پذیرش دعوت در همین پیش‌نمایش شبیه‌سازی می‌شود."
                : "No email is sent. Acceptance can be simulated in this preview."}
            </p>
          </form>
          <section className="panel">
            <h3>{fa ? "دعوت‌های ثبت‌شده" : "Recorded invitations"}</h3>
            {!workspace.invites.length ? (
              <Empty />
            ) : (
              workspace.invites.map((i) => (
                <article className="domain-card" key={i.id}>
                  <strong dir="ltr">{i.email}</strong>
                  <p>
                    {roles.find((r) => r[0] === i.role)?.[fa ? 1 : 2]} ·{" "}
                    {i.status}
                  </p>
                  <div className="domain-actions">
                    <Button
                      disabled={i.status !== "pending"}
                      onClick={() => setInvite(i)}
                    >
                      {fa ? "پیش‌نمایش پذیرش" : "Preview acceptance"}
                    </Button>
                    <Button
                      disabled={i.status !== "pending"}
                      onClick={() =>
                        update(
                          {
                            ...workspace,
                            invites: workspace.invites.map((x) =>
                              x.id === i.id ? { ...x, status: "revoked" } : x,
                            ),
                          },
                          (fa ? "لغو دعوت: " : "Invitation revoked: ") +
                            i.email,
                        )
                      }
                    >
                      {fa ? "لغو دعوت" : "Revoke"}
                    </Button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
        {invite && (
          <Modal
            title={fa ? "پذیرش دعوت آزمایشی" : "Demo invitation acceptance"}
            onClose={() => setInvite(null)}
          >
            <h3>{workspace.name}</h3>
            <p dir="ltr">{invite.email}</p>
            <p>
              {fa
                ? "این کار عضو نمونه را فقط در همین فضای محلی اضافه می‌کند."
                : "This adds a sample member to this local workspace only."}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                update(
                  {
                    ...workspace,
                    members: [
                      ...workspace.members,
                      {
                        id: crypto.randomUUID(),
                        name: invite.email.split("@")[0],
                        email: invite.email,
                        role: invite.role,
                        active: true,
                      },
                    ],
                    invites: workspace.invites.map((x) =>
                      x.id === invite.id ? { ...x, status: "accepted" } : x,
                    ),
                  },
                  (fa ? "پذیرش دعوت: " : "Invitation accepted: ") +
                    invite.email,
                );
                setInvite(null);
              }}
            >
              {fa ? "پذیرش در پیش‌نمایش" : "Accept in preview"}
            </Button>
          </Modal>
        )}
      </>
    );
  if (view === "roles")
    return (
      <>
        {toolbar}
        <section className="panel">
          <h2>
            {fa ? "ماتریس مسئولیت‌های تیم" : "Team responsibilities matrix"}
          </h2>
          <div className="domain-table-wrap">
            <table className="domain-table">
              <thead>
                <tr>
                  <th>{fa ? "بخش" : "Module"}</th>
                  {roles.map(([id, a, b]) => (
                    <th key={id}>{fa ? a : b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules
                  .filter((m) => m.group === "business")
                  .map((m) => (
                    <tr key={m.id}>
                      <td>{m.title[fa ? 0 : 1]}</td>
                      {roles.map(([id]) => (
                        <td key={id}>
                          <input
                            type="checkbox"
                            aria-label={m.title[fa ? 0 : 1] + " " + id}
                            disabled={id === "owner"}
                            checked={
                              id === "owner" ||
                              (workspace.permissions[m.id + ":" + id] ??
                                id === "manager")
                            }
                            onChange={(e) =>
                              update(
                                {
                                  ...workspace,
                                  permissions: {
                                    ...workspace.permissions,
                                    [m.id + ":" + id]: e.target.checked,
                                  },
                                },
                                (fa
                                  ? "ویرایش ماتریس نقش: "
                                  : "Role matrix updated: ") +
                                  m.id +
                                  " / " +
                                  id,
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  if (view === "modules")
    return (
      <>
        {toolbar}
        <div className="tool-grid">
          {modules
            .filter((m) => ["business", "create", "learn"].includes(m.group))
            .map((m) => (
              <article className="panel" key={m.id}>
                <span className={`icon-chip ${m.accent}`}>
                  <Icon name={m.icon} size={24} />
                </span>
                <h3>{m.title[fa ? 0 : 1]}</h3>
                <p>{m.subtitle[fa ? 0 : 1]}</p>
                <label className="toggle-row">
                  <span>
                    {fa ? "فعال در این فضا" : "Enabled in this workspace"}
                  </span>
                  <input
                    type="checkbox"
                    checked={workspace.access[m.id] ?? true}
                    onChange={(e) =>
                      update(
                        {
                          ...workspace,
                          access: {
                            ...workspace.access,
                            [m.id]: e.target.checked,
                          },
                        },
                        (fa
                          ? "تغییر دسترسی ماژول: "
                          : "Module access changed: ") + m.id,
                      )
                    }
                  />
                </label>
              </article>
            ))}
        </div>
      </>
    );
  return (
    <>
      {toolbar}
      <section className="panel">
        <div className="row-between">
          <h2>{fa ? "رویدادهای فضای کاری" : "Workspace audit trail"}</h2>
          <Button
            onClick={() =>
              download(
                "workspace-audit.json",
                JSON.stringify(workspace.audit, null, 2),
                "application/json",
              )
            }
          >
            {t("export")}
          </Button>
        </div>
        {workspace.audit.length ? (
          workspace.audit.map((a) => (
            <article className="activity-item" key={a.id}>
              <Icon name="CheckCircle2" size={18} />
              <div>
                <strong>{a.action}</strong>
                <p>{a.date.slice(0, 19).replace("T", " ")}</p>
              </div>
            </article>
          ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
