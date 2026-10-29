"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Modal, download } from "./ui";
import { toast } from "sonner";
type LeadForm = {
  id: string;
  title: string;
  description: string;
  fields: { name: string; label: string; type: string; required: boolean }[];
  active: boolean;
  source: string;
};
type Lead = {
  id: string;
  form: string;
  source: string;
  date: string;
  values: Record<string, string>;
  status: string;
  contactId?: string;
};
const fieldTemplates = [
  { name: "name", label: "نام", type: "text", required: true },
  { name: "email", label: "ایمیل", type: "email", required: true },
  { name: "phone", label: "تلفن", type: "tel", required: false },
  { name: "message", label: "پیام", type: "textarea", required: false },
];
export function LeadsWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [forms, saveForms] = useLocalState<LeadForm[]>(
    "aifekr-lead-forms-v2",
    [],
  );
  const [leads, saveLeads] = useLocalState<Lead[]>("aifekr-leads-v2", []);
  const [edit, setEdit] = useState<LeadForm | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [filter, setFilter] = useState("all");
  function convert(lead: Lead) {
    let contacts: Record<string, unknown>[] = [];
    try {
      contacts = JSON.parse(
        localStorage.getItem("aifekr-domain:CrmContact") || "[]",
      );
    } catch {}
    const email = lead.values.email?.trim().toLowerCase();
    const existing = email
      ? contacts.find((c) => String(c.email || "").toLowerCase() === email)
      : undefined;
    const contactId = existing ? String(existing.id) : crypto.randomUUID();
    if (!existing)
      localStorage.setItem(
        "aifekr-domain:CrmContact",
        JSON.stringify([
          {
            id: contactId,
            name: lead.values.name || (fa ? "سرنخ فرم" : "Form lead"),
            email: email || "",
            phone: lead.values.phone || "",
            company: "",
            notes: lead.values.message || "",
            status: "lead",
            source: lead.source,
          },
          ...contacts,
        ]),
      );
    saveLeads(
      leads.map((l) =>
        l.id === lead.id ? { ...l, status: "converted", contactId } : l,
      ),
    );
    toast.success(fa ? "مخاطب در CRM ثبت شد" : "Contact saved to CRM");
  }
  if(view==='sources'){const sources=[...new Set([...forms.map(f=>f.source),...leads.map(l=>l.source)])];return <section className="panel"><h2>{fa?'منابع ورود سرنخ':'Lead acquisition sources'}</h2><p>{fa?'منبع هر فرم هنگام ساخت آن تعیین می‌شود؛ آمار زیر از پاسخ‌های ثبت‌شده در همین مرورگر است.':'Each form defines its source. Counts below come from responses stored in this browser.'}</p><div className="tool-grid">{sources.map(source=><article className="domain-card" key={source}><h3>{source}</h3><p>{n(forms.filter(f=>f.source===source).length)} {fa?'فرم':'forms'}</p><strong>{n(leads.filter(l=>l.source===source).length)} {fa?'سرنخ':'leads'}</strong><p>{n(leads.filter(l=>l.source===source&&l.status==='converted').length)} {fa?'تبدیل به مخاطب CRM':'converted CRM contacts'}</p></article>)}</div>{!sources.length&&<Empty/>}</section>;}
  if (["overview", "reports"].includes(view))
    return (
      <>
        <div className="stats-grid">
          {[
            [
              fa ? "فرم فعال" : "Active forms",
              forms.filter((f) => f.active).length,
            ],
            [fa ? "کل سرنخ‌ها" : "Total leads", leads.length],
            [
              fa ? "تبدیل به مخاطب" : "Converted contacts",
              leads.filter((l) => l.status === "converted").length,
            ],
            [
              fa ? "نرخ تبدیل" : "Conversion rate",
              leads.length
                ? Math.round(
                    (leads.filter((l) => l.status === "converted").length /
                      leads.length) *
                      100,
                  )
                : 0,
            ],
          ].map(([label, count]) => (
            <div className="panel stat" key={String(label)}>
              <span>{label}</span>
              <strong>{n(Number(count))}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <h3>{fa ? "سرنخ به تفکیک منبع" : "Leads by source"}</h3>
          {[...new Set(leads.map((l) => l.source))].map((source) => (
            <div className="domain-card" key={source}>
              <div className="row-between">
                <strong>{source}</strong>
                <span>
                  {n(leads.filter((l) => l.source === source).length)}
                </span>
              </div>
              <progress
                max={Math.max(leads.length, 1)}
                value={leads.filter((l) => l.source === source).length}
              />
            </div>
          ))}
        </section>
      </>
    );
  if (view === "inbox")
    return (
      <section className="panel">
        <div className="domain-toolbar">
          <select
            aria-label={fa ? "وضعیت سرنخ" : "Lead status"}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              ["all", "همه", "All"],
              ["new", "جدید", "New"],
              ["contacted", "پیگیری‌شده", "Contacted"],
              ["converted", "تبدیل‌شده", "Converted"],
            ].map(([id, a, b]) => (
              <option key={id} value={id}>
                {fa ? a : b}
              </option>
            ))}
          </select>
          <Button
            onClick={() =>
              download(
                "leads.json",
                JSON.stringify(leads, null, 2),
                "application/json",
              )
            }
          >
            {t("export")}
          </Button>
        </div>
        {!leads.length ? (
          <Empty />
        ) : (
          leads
            .filter((l) => filter === "all" || l.status === filter)
            .map((l) => (
              <article className="domain-card" key={l.id}>
                <div className="row-between">
                  <h3>{l.values.name || l.values.email}</h3>
                  <span className="badge">{l.status}</span>
                </div>
                <p>
                  {l.source} · {l.date.slice(0, 16).replace("T", " ")}
                </p>
                <div className="domain-actions">
                  <Button onClick={() => setDetail(l)}>
                    {fa ? "مشاهده پاسخ" : "View response"}
                  </Button>
                  <Button
                    disabled={l.status === "converted"}
                    onClick={() => convert(l)}
                  >
                    {fa ? "تبدیل به مخاطب CRM" : "Convert to CRM contact"}
                  </Button>
                  <Button
                    disabled={l.status !== "new"}
                    onClick={() =>
                      saveLeads(
                        leads.map((x) =>
                          x.id === l.id ? { ...x, status: "contacted" } : x,
                        ),
                      )
                    }
                  >
                    {fa ? "ثبت پیگیری" : "Mark contacted"}
                  </Button>
                </div>
              </article>
            ))
        )}
        {detail && (
          <Modal
            title={fa ? "پاسخ فرم" : "Form response"}
            onClose={() => setDetail(null)}
          >
            <dl className="domain-detail">
              {Object.entries(detail.values).map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {forms
                      .find((f) => f.id === detail.form)
                      ?.fields.find((f) => f.name === key)?.label || key}
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </Modal>
        )}
      </section>
    );
  return (
    <>
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: crypto.randomUUID(),
              title: "",
              description: "",
              fields: structuredClone(fieldTemplates),
              active: true,
              source: "website",
            })
          }
        >
          {fa ? "ساخت فرم جذب" : "Create lead form"}
        </Button>
      </div>
      <div className="tool-grid">
        {forms.map((f) => (
          <article className="panel" key={f.id}>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
            <span className="badge">
              {n(leads.filter((l) => l.form === f.id).length)}{" "}
              {fa ? "پاسخ" : "responses"}
            </span>
            <div className="domain-actions">
              <Button onClick={() => setEdit(f)}>
                {fa ? "ویرایش فرم" : "Edit form"}
              </Button>
              <Link className="btn" href={"/f/" + f.id}>
                {fa ? "پیش‌نمایش فرم" : "Preview form"}
              </Link>
              <Button
                onClick={() =>
                  saveForms(
                    forms.map((x) =>
                      x.id === f.id ? { ...x, active: !x.active } : x,
                    ),
                  )
                }
              >
                {f.active
                  ? fa
                    ? "غیرفعال"
                    : "Deactivate"
                  : fa
                    ? "فعال"
                    : "Activate"}
              </Button>
            </div>
          </article>
        ))}
      </div>
      {edit && (
        <Modal
          title={fa ? "سازنده فرم جذب" : "Lead form builder"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!edit.fields.length) return;
              saveForms(
                forms.some((f) => f.id === edit.id)
                  ? forms.map((f) => (f.id === edit.id ? edit : f))
                  : [...forms, edit],
              );
              setEdit(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان فرم" : "Form title"}
                <input
                  required
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <label>
                {fa ? "منبع ورودی" : "Acquisition source"}
                <input
                  required
                  value={edit.source}
                  onChange={(e) => setEdit({ ...edit, source: e.target.value })}
                />
              </label>
              <label>
                {fa ? "توضیح" : "Description"}
                <textarea
                  value={edit.description}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                />
              </label>
            </div>
            {edit.fields.map((field, i) => (
              <div className="domain-card" key={field.name}>
                <div className="domain-fields">
                  <label>
                    {fa ? "برچسب فیلد" : "Field label"}
                    <input
                      required
                      value={field.label}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          fields: edit.fields.map((x) =>
                            x.name === field.name
                              ? { ...x, label: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    {fa ? "اجباری" : "Required"}
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          fields: edit.fields.map((x) =>
                            x.name === field.name
                              ? { ...x, required: e.target.checked }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="domain-actions">
                  <Button
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...edit.fields];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setEdit({ ...edit, fields: next });
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() =>
                      setEdit({
                        ...edit,
                        fields: edit.fields.filter(
                          (x) => x.name !== field.name,
                        ),
                      })
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              onClick={() =>
                setEdit({
                  ...edit,
                  fields: [
                    ...edit.fields,
                    {
                      name: "field-" + crypto.randomUUID(),
                      label: "",
                      type: "text",
                      required: false,
                    },
                  ],
                })
              }
            >
              {fa ? "افزودن پرسش" : "Add field"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!edit.fields.length}
            >
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function PublicLeadForm({ id }: { id: string }) {
  const { fa } = useApp();
  const [forms, , ready] = useLocalState<LeadForm[]>(
    "aifekr-lead-forms-v2",
    [],
  );
  const [leads, save] = useLocalState<Lead[]>("aifekr-leads-v2", []);
  const [sent, setSent] = useState(false);
  const form = forms.find((f) => f.id === id);
  return (
    <div className="public-section">
      <section className="panel">
        {!ready ? (
          <p>{fa ? "در حال بارگذاری" : "Loading"}</p>
        ) : !form || !form.active ? (
          <>
            <h1>{fa ? "فرم فعال پیدا نشد" : "No active form found"}</h1>
            <p>
              {fa
                ? "پیش‌نمایش فرم فقط در مرورگری که فرم را ساخته است در دسترس است."
                : "A form preview is available in the browser where it was created."}
            </p>
          </>
        ) : sent ? (
          <h1 role="status">
            {fa
              ? "پاسخ در این مرورگر ثبت شد"
              : "Response saved in this browser"}
          </h1>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              save([
                {
                  id: crypto.randomUUID(),
                  form: form.id,
                  source: form.source,
                  date: new Date().toISOString(),
                  values,
                  status: "new",
                },
                ...leads,
              ]);
              setSent(true);
            }}
          >
            <h1>{form.title}</h1>
            <p>{form.description}</p>
            <div className="domain-fields">
              {form.fields.map((f) => (
                <label key={f.name}>
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea name={f.name} required={f.required} rows={4} />
                  ) : (
                    <input name={f.name} type={f.type} required={f.required} />
                  )}
                </label>
              ))}
            </div>
            <Button type="submit" variant="primary">
              {fa ? "ثبت پاسخ محلی" : "Save local response"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
