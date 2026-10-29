"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  status: string;
};
type Deal = {
  id: string;
  title: string;
  contactId: string;
  value: number;
  probability: number;
  status: string;
  expectedCloseDate: string;
  lostReason?: string;
};
type Task = {
  id: string;
  title: string;
  contactId: string;
  dueDate: string;
  done: boolean;
};
const contactsSeed: Contact[] = [
  {
    id: "contact-1",
    name: "سارا احمدی",
    email: "sara@example.com",
    phone: "09120000001",
    company: "استودیو نارنج",
    notes: "",
    status: "active",
  },
  {
    id: "contact-2",
    name: "آرمان رضایی",
    email: "arman@example.com",
    phone: "09120000002",
    company: "گروه آفتاب",
    notes: "",
    status: "lead",
  },
];
const stages = [
  ["draft", "سرنخ جدید", "New lead"],
  ["active", "در مذاکره", "Negotiation"],
  ["completed", "برنده‌شده", "Won"],
  ["lost", "ازدست‌رفته", "Lost"],
];
const uid = () => crypto.randomUUID();
const csv = (rows: (string | number)[][]) =>
  "\ufeff" +
  rows
    .map((r) =>
      r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
export const crmViews = [
  "board",
  "contacts",
  "calendar",
  "analytics",
  "performance",
  "projects",
  "products",
  "contracts",
  "properties",
  "owners",
  "viewings",
  "matches",
  "automation",
];
export function CrmWorkspace({ view }: { view: string }) {
  const [contacts, setContacts] = useLocalState<Contact[]>(
    "aifekr-domain:CrmContact",
    contactsSeed,
  );
  const [deals, setDeals] = useLocalState<Deal[]>("aifekr-domain:CrmDeal", []);
  const [tasks, setTasks] = useLocalState<Task[]>("aifekr-crm-tasks", []);
  if (["contacts", "owners"].includes(view))
    return (
      <Contacts
        contacts={contacts}
        save={setContacts}
        deals={deals}
        tasks={tasks}
        saveTasks={setTasks}
      />
    );
  if (view === "board")
    return <Pipeline contacts={contacts} deals={deals} save={setDeals} />;
  if (view === "calendar")
    return <Tasks contacts={contacts} tasks={tasks} save={setTasks} />;
  if (["analytics", "performance"].includes(view))
    return <SalesReport deals={deals} contacts={contacts} />;
  if (view === "matches") return <PropertyMatcher />;
  return <CrmOperations view={view} contacts={contacts} />;
}
function Contacts({
  contacts,
  save,
  deals,
  tasks,
  saveTasks,
}: {
  contacts: Contact[];
  save: (v: Contact[]) => void;
  deals: Deal[];
  tasks: Task[];
  saveTasks: (v: Task[]) => void;
}) {
  const { fa, t, price } = useApp();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Contact | null>(null);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [tab, setTab] = useState("profile");
  const [remove, setRemove] = useState<Contact | null>(null);
  const [note, setNote] = useState("");
  const filtered = contacts.filter((c) =>
    [c.name, c.email, c.phone, c.company]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function open(c: Contact) {
    setDetail(c);
    setTab("profile");
    setNote(c.notes || "");
  }
  return (
    <>
      <div className="domain-toolbar">
        <input
          aria-label={fa ? "جستجوی رکوردها" : "Search records"}
          placeholder={
            fa ? "نام، تلفن، ایمیل یا شرکت" : "Name, phone, email or company"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: uid(),
              name: "",
              phone: "",
              email: "",
              company: "",
              notes: "",
              status: "lead",
            })
          }
        >
          {t("add")}
        </Button>
        <Button
          onClick={() =>
            download(
              "contacts.csv",
              csv([
                ["Name", "Email", "Phone", "Company"],
                ...filtered.map((c) => [
                  c.name,
                  c.email || "",
                  c.phone || "",
                  c.company || "",
                ]),
              ]),
              "text/csv",
            )
          }
        >
          {t("export")}
        </Button>
      </div>
      {!filtered.length ? (
        <Empty
          onAction={() =>
            setEdit({
              id: uid(),
              name: "",
              phone: "",
              email: "",
              company: "",
              notes: "",
              status: "lead",
            })
          }
        />
      ) : (
        <div className="panel domain-table-wrap">
          <table className="domain-table">
            <thead>
              <tr>
                {[
                  fa ? "نام" : "Name",
                  fa ? "شرکت" : "Company",
                  fa ? "تلفن" : "Phone",
                  fa ? "ایمیل" : "Email",
                  fa ? "عملیات" : "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.company || "—"}</td>
                  <td dir="ltr">{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>
                    <div className="domain-actions">
                      <Button onClick={() => open(c)}>
                        {fa ? "پرونده مخاطب" : "Contact details"}
                      </Button>
                      <Button onClick={() => setEdit(c)}>
                        {fa ? "ویرایش" : "Edit"}
                      </Button>
                      <Button onClick={() => setRemove(c)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && (
        <Modal
          title={fa ? "اطلاعات مخاطب" : "Contact details"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(
                contacts.some((c) => c.id === edit.id)
                  ? contacts.map((c) => (c.id === edit.id ? edit : c))
                  : [edit, ...contacts],
              );
              setEdit(null);
              toast.success(fa ? "مخاطب ذخیره شد" : "Contact saved");
            }}
          >
            <div className="domain-fields">
              {(["name", "company", "phone", "email"] as const).map(
                (key, i) => (
                  <label key={key}>
                    {
                      (fa
                        ? ["نام", "شرکت", "تلفن", "ایمیل"]
                        : ["Name", "Company", "Phone", "Email"])[i]
                    }
                    <input
                      required={key === "name"}
                      type={
                        key === "email"
                          ? "email"
                          : key === "phone"
                            ? "tel"
                            : "text"
                      }
                      value={edit[key] || ""}
                      onChange={(e) =>
                        setEdit({ ...edit, [key]: e.target.value })
                      }
                    />
                  </label>
                ),
              )}
              <label>
                {fa ? "یادداشت" : "Notes"}
                <textarea
                  value={edit.notes || ""}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                />
              </label>
            </div>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="chips">
            {[
              ["profile", "پروفایل", "Profile"],
              ["deals", "فرصت‌ها", "Deals"],
              ["tasks", "پیگیری‌ها", "Follow-ups"],
              ["notes", "یادداشت", "Notes"],
            ].map(([id, a, b]) => (
              <button
                key={id}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id)}
              >
                {fa ? a : b}
              </button>
            ))}
          </div>
          {tab === "profile" ? (
            <dl className="domain-detail">
              {[
                [fa ? "شرکت" : "Company", detail.company],
                [fa ? "ایمیل" : "Email", detail.email],
                [fa ? "تلفن" : "Phone", detail.phone],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : tab === "deals" ? (
            <div>
              {deals
                .filter((d) => d.contactId === detail.id)
                .map((d) => (
                  <article className="domain-card" key={d.id}>
                    <strong>{d.title}</strong>
                    <p>
                      {price(d.value)} ·{" "}
                      {stages.find((s) => s[0] === d.status)?.[fa ? 1 : 2] ||
                        d.status}
                    </p>
                  </article>
                ))}
              {!deals.some((d) => d.contactId === detail.id) && <Empty />}
            </div>
          ) : tab === "tasks" ? (
            <Tasks
              contacts={[detail]}
              tasks={tasks.filter((x) => x.contactId === detail.id)}
              save={(next) =>
                saveTasks([
                  ...tasks.filter((x) => x.contactId !== detail.id),
                  ...next,
                ])
              }
            />
          ) : (
            <>
              <label>
                {fa ? "یادداشت پرونده" : "Contact notes"}
                <textarea
                  rows={6}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <Button
                onClick={() => {
                  save(
                    contacts.map((c) =>
                      c.id === detail.id ? { ...c, notes: note } : c,
                    ),
                  );
                  setDetail({ ...detail, notes: note });
                  toast.success(t("save"));
                }}
              >
                {t("save")}
              </Button>
            </>
          )}
        </Modal>
      )}
      {remove && (
        <Modal
          title={fa ? "حذف مخاطب" : "Delete contact"}
          onClose={() => setRemove(null)}
        >
          <p>
            {deals.some((d) => d.contactId === remove.id)
              ? fa
                ? "این مخاطب فرصت فروش دارد؛ ابتدا فرصت‌های مرتبط را انتقال بده."
                : "This contact has deals. Reassign them before deletion."
              : fa
                ? "مخاطب و پیگیری‌هایش حذف شوند؟"
                : "Delete this contact and its follow-ups?"}
          </p>
          <Button
            disabled={deals.some((d) => d.contactId === remove.id)}
            onClick={() => {
              save(contacts.filter((c) => c.id !== remove.id));
              saveTasks(tasks.filter((t) => t.contactId !== remove.id));
              setRemove(null);
            }}
          >
            {fa ? "تأیید حذف" : "Confirm deletion"}
          </Button>
        </Modal>
      )}
    </>
  );
}
function Pipeline({
  contacts,
  deals,
  save,
}: {
  contacts: Contact[];
  deals: Deal[];
  save: (v: Deal[]) => void;
}) {
  const { fa, price, n, t } = useApp();
  const [edit, setEdit] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [lost, setLost] = useState<Deal | null>(null);
  const [reason, setReason] = useState("");
  const [drag, setDrag] = useState<string | null>(null);
  function move(deal: Deal, status: string) {
    if (status === "lost") {
      setLost(deal);
      setReason("");
      return;
    }
    save(deals.map((d) => (d.id === deal.id ? { ...d, status } : d)));
  }
  const filtered = deals.filter((d) =>
    (d.title + " " + contacts.find((c) => c.id === d.contactId)?.name)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="stats-grid">
        {[
          [
            fa ? "ارزش کل قیف" : "Pipeline value",
            deals
              .filter((d) => !["lost", "completed"].includes(d.status))
              .reduce((s, d) => s + Number(d.value), 0),
          ],
          [
            fa ? "فروش قطعی" : "Won revenue",
            deals
              .filter((d) => d.status === "completed")
              .reduce((s, d) => s + Number(d.value), 0),
          ],
          [
            fa ? "پیش‌بینی وزنی" : "Weighted forecast",
            deals
              .filter((d) => !["lost", "completed"].includes(d.status))
              .reduce((s, d) => s + (d.value * d.probability) / 100, 0),
          ],
        ].map(([label, value]) => (
          <div className="panel stat" key={String(label)}>
            <span>{label}</span>
            <strong>{price(Number(value))}</strong>
          </div>
        ))}
      </div>
      <div className="domain-toolbar">
        <input
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: uid(),
              title: "",
              contactId: contacts[0]?.id || "",
              value: 0,
              probability: 50,
              status: "draft",
              expectedCloseDate: "",
            })
          }
        >
          {fa ? "فرصت فروش جدید" : "New opportunity"}
        </Button>
      </div>
      <div className="crm-pipeline" tabIndex={0} role="region" aria-label={fa?'مراحل فروش':'Sales pipeline'}>
        {stages.map(([id, a, b]) => (
          <section
            className="panel"
            key={id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const deal = deals.find((d) => d.id === drag);
              if (deal) move(deal, id);
              setDrag(null);
            }}
          >
            <h3>
              {fa ? a : b}{" "}
              <span className="badge">
                {n(filtered.filter((d) => d.status === id).length)}
              </span>
            </h3>
            {filtered
              .filter((d) => d.status === id)
              .map((d) => (
                <article
                  draggable
                  onDragStart={() => setDrag(d.id)}
                  className="domain-card"
                  key={d.id}
                >
                  <button className="text-link" onClick={() => setEdit(d)}>
                    {d.title}
                  </button>
                  <p>
                    {contacts.find((c) => c.id === d.contactId)?.name || "—"}
                  </p>
                  <strong>{price(d.value)}</strong>
                  <p>
                    {fa ? "احتمال" : "Probability"} {n(d.probability || 0)}٪
                  </p>
                  <select
                    aria-label={
                      (fa ? "مرحله فرصت " : "Opportunity stage ") + d.title
                    }
                    value={d.status}
                    onChange={(e) => move(d, e.target.value)}
                  >
                    {stages.map(([key, faName, en]) => (
                      <option key={key} value={key}>
                        {fa ? faName : en}
                      </option>
                    ))}
                  </select>
                  {d.lostReason && <p>{d.lostReason}</p>}
                </article>
              ))}
          </section>
        ))}
      </div>
      {edit && (
        <Modal
          title={fa ? "فرصت فروش" : "Sales opportunity"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!contacts.some((c) => c.id === edit.contactId)) return;
              save(
                deals.some((d) => d.id === edit.id)
                  ? deals.map((d) => (d.id === edit.id ? edit : d))
                  : [edit, ...deals],
              );
              setEdit(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان فرصت" : "Opportunity title"}
                <input
                  required
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <label>
                {fa ? "مخاطب" : "Contact"}
                <select
                  required
                  value={edit.contactId}
                  aria-label={fa?'مخاطب':'Contact'}
                  onChange={(e) =>
                    setEdit({ ...edit, contactId: e.target.value })
                  }
                >
                  <option value="">
                    {fa ? "انتخاب مخاطب" : "Choose contact"}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {fa ? "ارزش فرصت" : "Deal value"}
                <input
                  type="number"
                  min={0}
                  required
                  value={edit.value}
                  onChange={(e) =>
                    setEdit({ ...edit, value: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "احتمال موفقیت (%)" : "Win probability (%)"}
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={edit.probability}
                  onChange={(e) =>
                    setEdit({ ...edit, probability: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "تاریخ پیش‌بینی بستن" : "Expected close date"}
                <input
                  type="date"
                  value={edit.expectedCloseDate?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setEdit({ ...edit, expectedCloseDate: e.target.value })
                  }
                />
              </label>
            </div>
            {!contacts.length && (
              <p>
                {fa
                  ? "ابتدا در بخش مخاطبان یک مخاطب بساز."
                  : "Create a contact before adding an opportunity."}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={!contacts.length}>
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
      {lost && (
        <Modal
          title={
            fa ? "دلیل از دست رفتن فرصت" : "Why was this opportunity lost?"
          }
          onClose={() => setLost(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(
                deals.map((d) =>
                  d.id === lost.id
                    ? { ...d, status: "lost", lostReason: reason }
                    : d,
                ),
              );
              setLost(null);
            }}
          >
            <label>
              {fa ? "دلیل" : "Reason"}
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Tasks({
  contacts,
  tasks,
  save,
}: {
  contacts: Contact[];
  tasks: Task[];
  save: (v: Task[]) => void;
}) {
  const { fa, t } = useApp();
  const [title, setTitle] = useState(""),
    [contact, setContact] = useState(contacts[0]?.id || ""),
    [date, setDate] = useState("");
  return (
    <div className="panel">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save([
            ...tasks,
            {
              id: uid(),
              title,
              contactId: contact,
              dueDate: date,
              done: false,
            },
          ]);
          setTitle("");
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "موضوع پیگیری" : "Follow-up"}
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            {fa ? "مخاطب" : "Contact"}
            <select
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            >
              <option value="">{fa ? "انتخاب کنید" : "Select"}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {fa ? "موعد" : "Due date"}
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <Button type="submit" disabled={!contacts.length} variant="primary">
          {fa ? "افزودن پیگیری" : "Add follow-up"}
        </Button>
      </form>
      {[...tasks]
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((task) => (
          <label className="toggle-row" key={task.id}>
            <span>
              <strong>{task.title}</strong>
              <small>
                {contacts.find((c) => c.id === task.contactId)?.name} ·{" "}
                {task.dueDate.replace("T", " ")}
              </small>
            </span>
            <input
              type="checkbox"
              checked={task.done}
              onChange={(e) =>
                save(
                  tasks.map((x) =>
                    x.id === task.id ? { ...x, done: e.target.checked } : x,
                  ),
                )
              }
            />
          </label>
        ))}
    </div>
  );
}
function SalesReport({
  deals,
  contacts,
}: {
  deals: Deal[];
  contacts: Contact[];
}) {
  const { fa, price, n } = useApp();
  const total = deals.reduce((s, d) => s + Number(d.value), 0);
  return (
    <>
      <div className="stats-grid">
        <div className="panel stat">
          <span>{fa ? "مخاطبان" : "Contacts"}</span>
          <strong>{n(contacts.length)}</strong>
        </div>
        <div className="panel stat">
          <span>{fa ? "ارزش فرصت‌ها" : "Opportunity value"}</span>
          <strong>{price(total)}</strong>
        </div>
        <div className="panel stat">
          <span>{fa ? "نرخ برد" : "Win rate"}</span>
          <strong>
            {n(
              deals.length
                ? Math.round(
                    (deals.filter((d) => d.status === "completed").length /
                      deals.length) *
                      100,
                  )
                : 0,
            )}
            ٪
          </strong>
        </div>
      </div>
      <section className="panel">
        <h3>
          {fa
            ? "قیف فروش بر اساس اطلاعات ثبت‌شده"
            : "Sales funnel from recorded opportunities"}
        </h3>
        {stages.map(([id, a, b]) => (
          <div className="domain-card" key={id}>
            <div className="row-between">
              <span>{fa ? a : b}</span>
              <strong>
                {price(
                  deals
                    .filter((d) => d.status === id)
                    .reduce((s, d) => s + d.value, 0),
                )}
              </strong>
            </div>
            <progress
              max={Math.max(deals.length, 1)}
              value={deals.filter((d) => d.status === id).length}
            />
          </div>
        ))}
      </section>
    </>
  );
}
type Operation = {
  id: string;
  title: string;
  contactId: string;
  date: string;
  amount: number;
  status: string;
  description: string;
};
const operationCopy: Record<string, [string, string, string, string]> = {
  projects: ["پروژه", "Project", "موعد تحویل", "Delivery date"],
  products: ["محصول", "Product", "تاریخ عرضه", "Available date"],
  contracts: ["قرارداد", "Contract", "تاریخ پایان", "Expiry date"],
  properties: ["ملک", "Property", "تاریخ انتشار", "Listing date"],
  viewings: ["بازدید", "Viewing", "زمان بازدید", "Viewing time"],
  automation: ["قانون خودکار", "Automation rule", "زمان اجرا", "Run date"],
};
function CrmOperations({
  view,
  contacts,
}: {
  view: string;
  contacts: Contact[];
}) {
  const { fa, price, t } = useApp();
  const copy = operationCopy[view] || operationCopy.projects;
  const [rows, save] = useLocalState<Operation[]>("aifekr-crm:" + view, []);
  const [edit, setEdit] = useState<Operation | null>(null);
  return (
    <section className="panel">
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setEdit({
              id: uid(),
              title: "",
              contactId: "",
              date: "",
              amount: 0,
              status: "draft",
              description: "",
            })
          }
        >
          {fa ? "افزودن " + copy[0] : "Add " + copy[1]}
        </Button>
        <Button
          onClick={() =>
            download(
              view + ".json",
              JSON.stringify(rows, null, 2),
              "application/json",
            )
          }
        >
          {t("export")}
        </Button>
      </div>
      {!rows.length ? (
        <Empty />
      ) : (
        rows.map((row) => (
          <article className="domain-card row-between" key={row.id}>
            <div>
              <h3>{row.title}</h3>
              <p>
                {contacts.find((c) => c.id === row.contactId)?.name} ·{" "}
                {row.date.replace("T", " ")}
              </p>
              <p>{row.description}</p>
              {view !== "automation" && <strong>{price(row.amount)}</strong>}
              <span className="badge">{row.status}</span>
            </div>
            <Button onClick={() => setEdit(row)}>
              {fa ? "ویرایش" : "Edit"}
            </Button>
          </article>
        ))
      )}
      {edit && (
        <Modal title={copy[fa ? 0 : 1]} onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(
                rows.some((x) => x.id === edit.id)
                  ? rows.map((x) => (x.id === edit.id ? edit : x))
                  : [edit, ...rows],
              );
              setEdit(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان" : "Title"}
                <input
                  required
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <label>
                {fa ? "مخاطب مرتبط" : "Related contact"}
                <select
                  value={edit.contactId}
                  onChange={(e) =>
                    setEdit({ ...edit, contactId: e.target.value })
                  }
                >
                  <option value="">{fa ? "بدون مخاطب" : "No contact"}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy[fa ? 2 : 3]}
                <input
                  type="datetime-local"
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                />
              </label>
              <label>
                {fa ? "مبلغ" : "Amount"}
                <input
                  type="number"
                  min={0}
                  value={edit.amount}
                  onChange={(e) =>
                    setEdit({ ...edit, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "وضعیت" : "Status"}
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                >
                  {[
                    ["draft", "پیش‌نویس", "Draft"],
                    ["active", "فعال", "Active"],
                    ["completed", "تکمیل‌شده", "Completed"],
                    ["archived", "بایگانی", "Archived"],
                  ].map(([id, a, b]) => (
                    <option key={id} value={id}>
                      {fa ? a : b}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {fa ? "شرح و شرایط" : "Description & terms"}
                <textarea
                  rows={5}
                  value={edit.description}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                />
              </label>
            </div>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
function PropertyMatcher() {
  const { fa, price } = useApp();
  const [properties] = useLocalState<Operation[]>("aifekr-crm:properties", []);
  const [budget, setBudget] = useState(0),
    [query, setQuery] = useState("");
  const matches = properties.filter(
    (p) =>
      (!budget || p.amount <= budget) &&
      (p.title + " " + p.description).includes(query) &&
      p.status === "active",
  );
  return (
    <section className="panel">
      <div className="domain-fields">
        <label>
          {fa ? "حداکثر بودجه خریدار" : "Buyer maximum budget"}
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>
        <label>
          {fa ? "منطقه یا ویژگی" : "Area or feature"}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {matches.length ? (
        matches.map((p) => (
          <article className="domain-card" key={p.id}>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <strong>{price(p.amount)}</strong>
          </article>
        ))
      ) : (
        <Empty />
      )}
      <p>
        {fa
          ? "نتایج از ملک‌های فعالِ ثبت‌شده در بخش ملک‌ها انتخاب می‌شوند."
          : "Results come from active properties entered in the Properties section."}
      </p>
    </section>
  );
}
