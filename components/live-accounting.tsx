"use client";
// The design's accounting workspace, backed by the existing tenant-scoped APIs.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/site-link";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  accountName,
  readStream,
  type Account,
  type Dashboard,
  type JournalEntry,
} from "@/lib/accounting";
import { AccountingProvider, useAcc } from "./live-accounting-context";
import { AccountingDocumentForm } from "./accounting-document-form";
import { BusinessShell } from "./business-shell";
import { Button, Modal } from "./ui";

type Row = Record<string, unknown> & { id?: string };
type Field = {
  key: string;
  fa: string;
  en: string;
  type?: string;
  options?: string[];
  choices?: { value: string; label: string }[];
  optional?: boolean;
};
const field = (
  key: string,
  fa: string,
  en: string,
  type = "text",
  options?: string[],
  optional = false,
): Field => ({ key, fa, en, type, options, optional });
const base = "/api/accounting/";
const enc = encodeURIComponent;
const today = () => new Date().toISOString().slice(0, 10);
const month = () => today().slice(0, 7);
const money = field("amount", "مبلغ", "Amount", "number");
const name = field("name", "نام", "Name");
const code = field("accountCode", "کد حساب", "Account code");
const description = field("description", "شرح", "Description");
const currency = field("currency", "واحد پول", "Currency", "select", [
  "IRT",
  "IRR",
  "USD",
  "EUR",
  "GBP",
  "TRY",
]);
const period = field("period", "ماه", "Month", "month");

/** No demo fallback, and stale requests cannot overwrite a different view. */
function useRemote<T>(url: string) {
  const { get } = useAcc();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void get<T>(url)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [url, get, version]);
  return { data, error, reload };
}

function Notice({ error, loading }: { error: string; loading: boolean }) {
  return error ? (
    <p role="alert" className="plan-notice">
      {error}
    </p>
  ) : loading ? (
    <div className="skeleton" aria-busy="true" />
  ) : null;
}
function Cell({ value }: { value: unknown }) {
  const { fmt, date } = useAcc();
  if (value === null || value === undefined) return <>—</>;
  if (typeof value === "number") return <bdi>{fmt(value)}</bdi>;
  if (typeof value === "boolean") return <>{value ? "✓" : "—"}</>;
  if (typeof value === "string")
    return <bdi>{/^\d{4}-\d\d-\d\dT/.test(value) ? date(value) : value}</bdi>;
  return <>—</>;
}
function Table({
  rows,
  columns,
  actions,
}: {
  rows: Row[];
  columns: Field[];
  actions?: (r: Row) => React.ReactNode;
}) {
  const { lang } = useAcc();
  const fa = lang === "fa";
  return rows.length ? (
    <div className="domain-table-wrap">
      <table className="domain-table">
        <thead>
          <tr>
            {columns.map((f) => (
              <th key={f.key}>{fa ? f.fa : f.en}</th>
            ))}
            {actions && <th>{fa ? "عملیات" : "Actions"}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map((f) => (
                <td key={f.key}>
                  <Cell
                    value={f.key
                      .split(".")
                      .reduce<unknown>(
                        (v, k) =>
                          v && typeof v === "object" ? (v as Row)[k] : null,
                        r,
                      )}
                  />
                </td>
              ))}
              {actions && (
                <td>
                  <div className="domain-actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="crm-empty">
      {fa ? "هنوز رکوردی ثبت نشده است." : "No records yet."}
    </p>
  );
}

/** A single explicit request, followed by a server reload; no automatic paid retries. */
function Action({
  label,
  url,
  body,
  method = "PUT",
  onDone,
  caution,
}: {
  label: string;
  url: string;
  body?: unknown;
  method?: string;
  onDone: () => void;
  caution?: string;
}) {
  const { api, lang, canWrite } = useAcc();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  if (!canWrite) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      {open && (
        <Modal
          title={label}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            {caution ||
              (lang === "fa"
                ? "این تغییر روی اطلاعات واقعی همین فضای کاری ثبت می‌شود. ادامه می‌دهید؟"
                : "This changes the records in this workspace. Continue?")}
          </p>
          {error && <p role="alert">{error}</p>}
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await api(url, body, method);
                setOpen(false);
                onDone();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? (lang === "fa" ? "در حال ثبت…" : "Saving…") : label}
          </Button>
        </Modal>
      )}
    </>
  );
}

function Create({
  title,
  url,
  fields,
  onDone,
  defaults = {},
  map,
  method = "POST",
}: {
  title: string;
  url: string;
  fields: Field[];
  onDone: () => void;
  defaults?: Row;
  map?: (data: Row) => Row;
  method?: string;
}) {
  const { api, lang, canWrite } = useAcc();
  const fa = lang === "fa";
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  if (!canWrite) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>{title}</Button>
      {open && (
        <Modal
          title={title}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current) return;
              const form = new FormData(e.currentTarget),
                values: Row = {};
              for (const f of fields) {
                const v = String(form.get(f.key) ?? "");
                if (!v && f.optional) continue;
                values[f.key] =
                  f.type === "number"
                    ? Number(v)
                    : f.type === "month"
                      ? v + "-01"
                      : v;
              }
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await api(url, map ? map(values) : values, method);
                setOpen(false);
                onDone();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {fields.map((f) => (
              <label key={f.key}>
                {fa ? f.fa : f.en}
                {f.options || f.choices ? (
                  <select
                    name={f.key}
                    defaultValue={String(
                      defaults[f.key] ??
                        f.choices?.[0]?.value ??
                        f.options?.[0] ??
                        "",
                    )}
                  >
                    {(
                      f.choices ??
                      f.options!.map((o) => ({ value: o, label: o }))
                    ).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.key}
                    required={!f.optional}
                    rows={6}
                    defaultValue={String(defaults[f.key] ?? "")}
                  />
                ) : (
                  <input
                    name={f.key}
                    type={f.type ?? "text"}
                    step={f.type === "number" ? "any" : undefined}
                    required={!f.optional}
                    defaultValue={String(
                      defaults[f.key] ??
                        (f.type === "month"
                          ? month()
                          : f.type === "date"
                            ? today()
                            : ""),
                    )}
                  />
                )}
              </label>
            ))}
            {error && <p role="alert">{error}</p>}
            <Button variant="primary" disabled={busy} type="submit">
              {busy ? (fa ? "در حال ثبت…" : "Saving…") : fa ? "ذخیره" : "Save"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function LiveAccounting({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  return (
    <AccountingProvider>
      <AccountingGate module={module} view={view} />
    </AccountingProvider>
  );
}
function AccountingGate({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { shell, lang, canWrite } = useAcc();
  const fa = lang === "fa";
  if (!shell?.accountingAccess?.allowed)
    return (
      <section className="panel plan-notice">
        <p>
          {fa
            ? "حسابداری به دسترسی CRM فعال نیاز دارد."
            : "Accounting requires active CRM access."}
        </p>
        <Link href="/plans" className="btn primary">
          {fa ? "بررسی پکیج‌ها" : "Review packages"}
        </Link>
      </section>
    );
  return (
    <BusinessShell module={module} view={view}>
      {!canWrite && (
        <p className="plan-notice">
          {fa
            ? "دسترسی شما به این دفتر فقط خواندنی است."
            : "Your access to these books is read-only."}
        </p>
      )}
      <AccountingView key={view.id} view={view.id} />
    </BusinessShell>
  );
}

function AccountingView({ view }: { view: string }) {
  const { lang } = useAcc();
  const fa = lang === "fa";
  if (view === "overview") return <><Overview /><CashFlow /><Commissions /></>;
  if (["accounts", "ledger-setup"].includes(view))
    return <Accounts setup={view === "ledger-setup"} />;
  if (view === "journal") return <Journal />;
  if (view === "expenses") return <Expenses />;
  if (view === "bank") return <Bank />;
  if (view === "payroll") return <Payroll />;
  if (view === "budgets") return <Budgets />;
  if (view === "tax") return <Tax />;
  if (view === "close-period") return <Periods />;
  if (view === "owner-statements") return <><Statements /><ManagementFees /></>;
  if (view === "assistant")
    return (
      <>
        <Assistant />
        <FinancialIntelligence />
      </>
    );
  if (view === "automation")
    return (
      <>
        <Automation />
        <BiAccess />
      </>
    );
  return (
    <p role="alert">
      {fa
        ? "این بخش هنوز متصل نشده است."
        : "This section is not connected yet."}
    </p>
  );
}

function Commissions() {
  const { lang } = useAcc(); const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ records: Row[] }>(base + "commissions");
  return <section className="panel"><h3>{fa ? "کمیسیون‌های معاملات" : "Deal commissions"}</h3><Link className="btn" href="/crm?tab=owners">{fa ? "مدیریت معاملات و سهم‌ها در CRM" : "Manage deals and splits in CRM"}</Link><Notice error={error} loading={!data} />{data?.records.map(record => <article key={record.id}><h4><Cell value={(record.deal as Row)?.title} /></h4><Table rows={record.splits as Row[]} columns={[field("agentUserId", "شناسه همکار", "Agent ID"), field("percent", "درصد سهم", "Split %"), field("amount", "مبلغ", "Amount"), field("status", "وضعیت", "Status")]} actions={split => split.status !== "paid" && <Action label={fa ? "ثبت پرداخت سهم" : "Record split payment"} url={base + `commissions/splits/${enc(split.id!)}`} body={{ action: "pay" }} onDone={reload} caution={fa ? "این گزینه فقط پرداخت انجام‌شده را در دفتر ثبت می‌کند و انتقال بانکی ندارد." : "This records an already completed payment; it does not transfer money."} />} /></article>)}</section>;
}

function CashFlow() {
  const { lang, canWrite } = useAcc(); const fa = lang === "fa";
  const forecast = useRemote<{ forecast: Row[] }>(base + "reports/cash-flow-forecast");
  const costs = useRemote<{ costs: Record<string, number> }>("/api/credits/costs");
  const rate = costs.data?.costs.tool_accounting_cash_flow_narrative ?? costs.data?.costs.tool;
  const [text, setText] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return <section className="panel"><h3>{fa ? "پیش‌بینی جریان نقدی" : "Cash-flow forecast"}</h3><p>{fa ? "برآورد ساده بر پایهٔ فاکتورهای سررسیدشده و میانگین هزینه‌های قبلی؛ تضمین درآمد نیست." : "A heuristic from due invoices and historical expenses; not guaranteed income."}</p><Notice error={forecast.error} loading={!forecast.data} />{forecast.data && <Table rows={forecast.data.forecast} columns={[field("month", "ماه", "Month"), field("expectedInflow", "ورودی مورد انتظار", "Expected inflow"), field("expectedOutflow", "خروجی مورد انتظار", "Expected outflow")]} />}{canWrite && <Button disabled={busy || rate == null} onClick={async () => { if (lock.current || rate == null) return; lock.current = true; setBusy(true); setText(""); setError(""); try { const r = await fetch(base + "ai/cash-flow-narrative", { method: "POST", credentials: "include" }); if (!r.ok) { const d = await r.json(); throw Error(d.error); } await readStream(r, chunk => setText(t => t + chunk)); } catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); } }}>{busy ? (fa ? "در حال تولید…" : "Generating…") : `${fa ? "خلاصهٔ هوشمند" : "AI summary"} · ${rate ?? "—"} ${fa ? "کردیت" : "credits"}`}</Button>}{error && <p role="alert">{error}</p>}{text && <p style={{ whiteSpace: "pre-wrap" }} aria-live="polite">{text}</p>}</section>;
}

function ManagementFees() {
  const { lang } = useAcc(); const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ rules: Row[] }>(base + "management-fee-rules");
  const properties = useRemote<{ properties: Row[] }>("/api/crm/properties");
  return <section className="panel"><h3>{fa ? "کارمزد مدیریت ملک" : "Property management fees"}</h3><Create title={fa ? "ثبت درصد کارمزد" : "Set management fee"} url={base + "management-fee-rules"} fields={[{ ...field("propertyId", "ملک یا پیش‌فرض فضا", "Property or workspace default", "select", undefined, true), choices: [{ value: "", label: fa ? "پیش‌فرض فضا" : "Workspace default" }, ...(properties.data?.properties ?? []).map(p => ({ value: p.id!, label: String(p.title) }))] }, field("feePercent", "درصد", "Fee percent", "number")]} onDone={reload} /><Notice error={error || properties.error} loading={!data} />{data && <Table rows={data.rules} columns={[field("propertyId", "ملک (خالی: پیش‌فرض)", "Property (empty: default)"), field("feePercent", "درصد کارمزد", "Fee percent")]} />}</section>;
}

/** Suggestions never change a record until a manager explicitly approves. */
function FinancialIntelligence() {
  const { lang, api, canWrite } = useAcc();
  const fa = lang === "fa";
  const anomalies = useRemote<{ alerts: Row[] }>(base + "ai/anomalies");
  const proposals = useRemote<{ proposals: Row[] }>(base + "ai/proposals");
  const expenses = useRemote<{ expenses: Row[] }>(base + "expenses");
  const costs = useRemote<{ costs: Record<string, number> }>(
    "/api/credits/costs",
  );
  const [expense, setExpense] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const rate =
    costs.data?.costs.tool_accounting_propose ?? costs.data?.costs.tool;
  return (
    <>
      <section className="panel">
        <h3>{fa ? "ناهنجاری‌های دفتر" : "Ledger anomalies"}</h3>
        <Notice error={anomalies.error} loading={!anomalies.data} />
        {anomalies.data && (
          <Table
            rows={anomalies.data.alerts}
            columns={[
              field("accountCode", "کد حساب", "Account code"),
              field("accountName", "حساب", "Account"),
              field("currentMonthAmount", "مبلغ ماه", "Current month"),
              field("trailingAverage", "میانگین قبلی", "Trailing average"),
              field("deviationPercent", "درصد انحراف", "Deviation %"),
            ]}
          />
        )}
      </section>
      <section className="panel">
        <h3>
          {fa ? "پیشنهاد دسته‌بندی هزینه" : "Expense categorization proposals"}
        </h3>
        {canWrite && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current || !expense || rate == null) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await api(base + "ai/proposals", { expenseId: expense });
                proposals.reload();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <label>
              {fa ? "هزینه" : "Expense"}
              <select
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                required
              >
                <option value="">—</option>
                {expenses.data?.expenses.map((r) => (
                  <option value={r.id} key={r.id}>
                    {String(r.description)}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {rate == null
                ? fa
                  ? "تعرفه در دسترس نیست"
                  : "Cost unavailable"
                : `${rate} ${fa ? "کردیت" : "credits"}`}
            </p>
            <Button disabled={busy || rate == null || !expense} type="submit">
              {busy
                ? fa
                  ? "در حال بررسی…"
                  : "Analyzing…"
                : fa
                  ? "دریافت پیشنهاد"
                  : "Request proposal"}
            </Button>
          </form>
        )}
        <Notice error={error || proposals.error} loading={!proposals.data} />
        {proposals.data && (
          <Table
            rows={proposals.data.proposals.map((r) => {
              let payload: Row = {};
              try {
                payload = JSON.parse(String(r.payload));
              } catch {}
              return { ...payload, ...r };
            })}
            columns={[
              field("suggestedAccountCode", "کد پیشنهادی", "Suggested account"),
              field("reasoning", "دلیل پیشنهاد", "Reasoning"),
              field("status", "وضعیت", "Status"),
            ]}
            actions={(r) =>
              r.status === "pending" && (
                <>
                  {["approve", "reject"].map((action) => (
                    <Action
                      key={action}
                      label={
                        fa
                          ? action === "approve"
                            ? "تأیید پیشنهاد"
                            : "رد پیشنهاد"
                          : action === "approve"
                            ? "Approve proposal"
                            : "Reject proposal"
                      }
                      url={base + `ai/proposals/${enc(r.id!)}`}
                      body={{ action }}
                      onDone={proposals.reload}
                    />
                  ))}
                </>
              )
            }
          />
        )}
      </section>
    </>
  );
}

function BiAccess() {
  const { lang, api, canWrite } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ tokens: Row[] }>(
    base + "bi-tokens",
  );
  const [token, setToken] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return (
    <section className="panel">
      <h3>{fa ? "دسترسی گزارش‌گیری BI" : "BI reporting access"}</h3>
      <p>
        {fa
          ? "توکن فقط یک بار نمایش داده می‌شود؛ آن را در محل امن نگه دارید."
          : "The token is shown once. Store it securely."}
      </p>
      {canWrite && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current) return;
            const label = String(
              new FormData(e.currentTarget).get("label") ?? "",
            );
            lock.current = true;
            setBusy(true);
            setFailure("");
            try {
              const d = await api<{ token: string }>(base + "bi-tokens", {
                label,
              });
              setToken(d.token);
              reload();
            } catch (e) {
              setFailure((e as Error).message);
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          <label>
            {fa ? "عنوان اتصال" : "Connection label"}
            <input name="label" required />
          </label>
          <Button type="submit" disabled={busy}>
            {fa ? "ساخت توکن گزارش‌گیری" : "Create reporting token"}
          </Button>
        </form>
      )}
      <Notice error={error || failure} loading={!data} />
      {data && (
        <Table
          rows={data.tokens}
          columns={[
            field("label", "عنوان", "Label"),
            field("createdAt", "ساخته‌شده", "Created"),
            field("lastUsedAt", "آخرین استفاده", "Last used"),
            field("revokedAt", "لغوشده", "Revoked"),
          ]}
          actions={(r) =>
            !r.revokedAt && (
              <Action
                label={fa ? "لغو دسترسی" : "Revoke access"}
                url={base + `bi-tokens/${enc(r.id!)}`}
                method="DELETE"
                onDone={reload}
              />
            )
          }
        />
      )}
      {token && (
        <Modal
          title={fa ? "ذخیرهٔ امن توکن" : "Save your token securely"}
          onClose={() => setToken("")}
        >
          <input
            readOnly
            value={token}
            aria-label={fa ? "توکن گزارش‌گیری" : "Reporting token"}
            autoComplete="off"
          />
          <p>
            {fa
              ? "با بستن این پنجره دوباره قابل نمایش نیست."
              : "It cannot be displayed again after closing this window."}
          </p>
        </Modal>
      )}
    </section>
  );
}

function Overview() {
  const { lang, fmt } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<Dashboard>(base + "dashboard");
  const cards: [keyof Dashboard, string, string][] = [
    ["cashBalance", "مانده نقد", "Cash balance"],
    ["receivablesOutstanding", "مطالبات", "Receivables"],
    ["payablesOutstanding", "بدهی‌ها", "Payables"],
    ["monthRevenue", "درآمد ماه", "Monthly revenue"],
    ["monthExpense", "هزینه ماه", "Monthly expense"],
    ["monthNetProfit", "سود خالص ماه", "Monthly net profit"],
  ];
  return (
    <>
      <div className="domain-toolbar">
        <Button onClick={reload}>{fa ? "تازه‌سازی" : "Refresh"}</Button>
        <span>{fa ? "ارقام دفتر به تومان" : "Ledger figures in Toman"}</span>
      </div>
      <Notice error={error} loading={!data} />
      {data && (
        <>
          <div className="stat-grid">
            {cards.map(([key, a, b]) => (
              <article className="panel" key={key}>
                <small>{fa ? a : b}</small>
                <h3>
                  <bdi>{fmt(Number(data[key]), "IRT")}</bdi>
                </h3>
              </article>
            ))}
          </div>
          <section className="panel">
            <h3>{fa ? "فاکتورهای سررسیدگذشته" : "Overdue invoices"}</h3>
            <Table
              rows={data.overdueInvoices as unknown as Row[]}
              columns={[
                field("invoiceNumber", "شماره", "Number"),
                field("contactName", "مخاطب", "Contact"),
                field("total", "مبلغ", "Amount"),
                field("dueDate", "سررسید", "Due date"),
              ]}
            />
          </section>
          <section className="panel">
            <h3>{fa ? "روند درآمد و هزینه" : "Revenue and expense trend"}</h3>
            <Table
              rows={data.trend as unknown as Row[]}
              columns={[
                field("label", "دوره", "Period"),
                field("revenue", "درآمد", "Revenue"),
                field("expense", "هزینه", "Expense"),
              ]}
            />
          </section>
        </>
      )}
    </>
  );
}

function Accounts({ setup }: { setup: boolean }) {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const path = usePathname();
  const accountCode = /^\/accounting\/accounts\/([^/]+)$/.exec(path)?.[1];
  const accounts = useRemote<{ accounts: Account[] }>(base + "accounts");
  const balance = useRemote<{ rows: Row[] }>(base + "reports/trial-balance");
  const [selected, setSelected] = useState(
    accountCode ? decodeURIComponent(accountCode) : "",
  );
  const columns = [
    field("code", "کد", "Code"),
    name,
    field("type", "نوع", "Type"),
  ];
  return (
    <section className="panel">
      <div className="domain-toolbar">
        <Create
          title={fa ? "حساب جدید" : "New account"}
          url={base + "accounts"}
          fields={[
            field("code", "کد", "Code"),
            name,
            field(
              "nameEn",
              "نام انگلیسی",
              "English name",
              "text",
              undefined,
              true,
            ),
            field("type", "نوع", "Type", "select", [
              "asset",
              "liability",
              "equity",
              "revenue",
              "expense",
            ]),
          ]}
          onDone={accounts.reload}
        />
        <Button
          onClick={() => {
            accounts.reload();
            balance.reload();
          }}
        >
          {fa ? "تازه‌سازی" : "Refresh"}
        </Button>
      </div>
      <Notice error={accounts.error} loading={!accounts.data} />
      {accounts.data && (
        <Table
          rows={accounts.data.accounts.map((a) => ({
            ...a,
            name: accountName(a, lang),
          }))}
          columns={columns}
          actions={(r) => (
            <Button onClick={() => setSelected(String(r.code))}>
              {fa ? "گردش حساب" : "Account entries"}
            </Button>
          )}
        />
      )}
      {!setup && (
        <>
          <h3>{fa ? "تراز آزمایشی" : "Trial balance"}</h3>
          <Notice error={balance.error} loading={!balance.data} />
          {balance.data && (
            <Table
              rows={balance.data.rows}
              columns={[
                field("code", "کد", "Code"),
                name,
                field("debitTotal", "بدهکار", "Debit"),
                field("creditTotal", "بستانکار", "Credit"),
                field("balance", "مانده", "Balance"),
              ]}
            />
          )}
        </>
      )}
      {selected && (
        <Modal
          title={(fa ? "گردش حساب " : "Account entries ") + selected}
          onClose={() => setSelected("")}
        >
          <AccountEntries code={selected} />
        </Modal>
      )}
    </section>
  );
}
function AccountEntries({ code }: { code: string }) {
  const { data, error } = useRemote<{ lines: Row[] }>(
    base + `accounts/${enc(code)}/entries`,
  );
  return (
    <>
      <Notice error={error} loading={!data} />
      {data && (
        <Table
          rows={data.lines}
          columns={[
            field("entry.entryDate", "تاریخ", "Date"),
            field("entry.memo", "شرح", "Memo"),
            field("debit", "بدهکار", "Debit"),
            field("credit", "بستانکار", "Credit"),
          ]}
        />
      )}
    </>
  );
}
function Journal() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ entries: JournalEntry[] }>(
    base + "journal-entries",
  );
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  return (
    <section className="panel">
      <div className="domain-toolbar">
        <AccountingDocumentForm kind="journal" onDone={reload} />
        <Button onClick={reload}>{fa ? "تازه‌سازی" : "Refresh"}</Button>
      </div>
      <Notice error={error} loading={!data} />
      {data && (
        <Table
          rows={data.entries as unknown as Row[]}
          columns={[
            field("entryDate", "تاریخ", "Date"),
            field("memo", "شرح", "Memo"),
            field("isReversed", "برگشت‌خورده", "Reversed"),
          ]}
          actions={(r) => (
            <>
              <Button onClick={() => setSelected(r as unknown as JournalEntry)}>
                {fa ? "ردیف‌ها" : "Lines"}
              </Button>
              {!r.isReversed && (
                <Action
                  label={fa ? "برگشت سند" : "Reverse entry"}
                  url={base + `journal-entries/${enc(r.id!)}`}
                  method="POST"
                  body={{ action: "reverse" }}
                  onDone={reload}
                />
              )}
            </>
          )}
        />
      )}
      {selected && (
        <Modal
          title={selected.memo ?? (fa ? "سند" : "Journal")}
          onClose={() => setSelected(null)}
        >
          <Table
            rows={selected.lines as unknown as Row[]}
            columns={[
              field("account.code", "کد حساب", "Account code"),
              field("debit", "بدهکار", "Debit"),
              field("credit", "بستانکار", "Credit"),
              field("memo", "شرح", "Memo"),
            ]}
          />
        </Modal>
      )}
    </section>
  );
}

function Expenses() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ expenses: Row[] }>(
    base + "expenses",
  );
  const vendors = useRemote<{ vendors: Row[] }>(base + "vendors");
  return (
    <section className="panel">
      <Create
        title={fa ? "ثبت هزینه" : "Record expense"}
        url={base + "expenses"}
        fields={[
          code,
          money,
          currency,
          description,
          field("kind", "نوع", "Kind", "select", ["cash_expense", "bill"]),
          field("expenseDate", "تاریخ", "Date", "date"),
          {
            ...field(
              "vendorId",
              "تأمین‌کننده",
              "Vendor",
              "select",
              undefined,
              true,
            ),
            choices: [
              { value: "", label: "—" },
              ...(vendors.data?.vendors ?? []).map((v) => ({
                value: v.id!,
                label: String(v.name),
              })),
            ],
          },
        ]}
        onDone={reload}
      />
      <Create
        title={fa ? "تأمین‌کننده جدید" : "New vendor"}
        url={base + "vendors"}
        fields={[
          name,
          field("phone", "تلفن", "Phone", "tel", undefined, true),
          field("email", "ایمیل", "Email", "email", undefined, true),
        ]}
        onDone={vendors.reload}
      />
      <Notice error={vendors.error} loading={!vendors.data} />
      {vendors.data && (
        <details>
          <summary>{fa ? "تأمین‌کنندگان" : "Vendors"}</summary>
          <Table
            rows={vendors.data.vendors}
            columns={[
              name,
              field("phone", "تلفن", "Phone"),
              field("email", "ایمیل", "Email"),
            ]}
          />
        </details>
      )}
      <Notice error={error} loading={!data} />
      {data && (
        <Table
          rows={data.expenses}
          columns={[
            description,
            field("accountCode", "کد حساب", "Account code"),
            money,
            currency,
            field("status", "وضعیت", "Status"),
            field("vendor.name", "تأمین‌کننده", "Vendor"),
          ]}
          actions={(r) => (
            <>
              {(r.status === "pending_approval"
                ? ["approve", "reject"]
                : r.status === "approved"
                  ? ["pay"]
                  : []
              ).map((action) => (
                <Action
                  key={action}
                  label={
                    fa
                      ? { approve: "تأیید", reject: "رد", pay: "ثبت پرداخت" }[
                          action
                        ]!
                      : {
                          approve: "Approve",
                          reject: "Reject",
                          pay: "Record payment",
                        }[action]!
                  }
                  url={base + `expenses/${enc(r.id!)}`}
                  body={{ action }}
                  onDone={reload}
                  caution={
                    action === "pay"
                      ? fa
                        ? "این گزینه پرداخت بانکی انجام نمی‌دهد؛ فقط پرداخت انجام‌شده را در دفتر ثبت می‌کند."
                        : "This records an already completed payment in the ledger; it does not make a bank transfer."
                      : undefined
                  }
                />
              ))}
            </>
          )}
        />
      )}
    </section>
  );
}

function Bank() {
  const { lang, get } = useAcc();
  const fa = lang === "fa";
  const accounts = useRemote<{ bankAccounts: Row[] }>(base + "bank-accounts");
  const tx = useRemote<{ transactions: Row[] }>(base + "bank-transactions");
  const [candidates, setCandidates] = useState<{
      id: string;
      rows: Row[];
    } | null>(null),
    [error, setError] = useState("");
  return (
    <>
      <section className="panel">
        <Create
          title={fa ? "حساب بانکی جدید" : "New bank account"}
          url={base + "bank-accounts"}
          fields={[
            name,
            field(
              "accountNumber",
              "شماره حساب",
              "Account number",
              "text",
              undefined,
              true,
            ),
            currency,
            field(
              "openingBalance",
              "مانده افتتاحیه",
              "Opening balance",
              "number",
            ),
          ]}
          defaults={{ openingBalance: 0 }}
          onDone={accounts.reload}
        />
        <Notice error={accounts.error} loading={!accounts.data} />
        {accounts.data && (
          <Table
            rows={accounts.data.bankAccounts}
            columns={[
              field("id", "شناسه", "ID"),
              name,
              currency,
              field("accountNumber", "شماره حساب", "Account number"),
            ]}
          />
        )}
      </section>
      <section className="panel">
        <Create
          title={fa ? "ورود گردش CSV" : "Import CSV transactions"}
          url={base + "bank-transactions/import"}
          fields={[
            field("bankAccountId", "شناسه حساب بانکی", "Bank account ID"),
            field(
              "csv",
              "CSV با ستون‌های date,description,amount",
              "CSV: date,description,amount",
              "textarea",
            ),
          ]}
          onDone={tx.reload}
        />
        <Notice error={tx.error || error} loading={!tx.data} />
        {tx.data && (
          <Table
            rows={tx.data.transactions}
            columns={[
              field("date", "تاریخ", "Date"),
              description,
              money,
              field("status", "وضعیت", "Status"),
            ]}
            actions={(r) =>
              r.status === "unmatched" && (
                <>
                  <Button
                    onClick={async () => {
                      try {
                        const d = await get<{ candidates: Row[] }>(
                          base + `bank-transactions/${enc(r.id!)}`,
                        );
                        setCandidates({ id: r.id!, rows: d.candidates });
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {fa ? "پیشنهادهای تطبیق" : "Match candidates"}
                  </Button>
                  <Action
                    label={fa ? "نادیده گرفتن" : "Ignore"}
                    url={base + `bank-transactions/${enc(r.id!)}`}
                    body={{ action: "ignore" }}
                    onDone={tx.reload}
                  />
                </>
              )
            }
          />
        )}
        {candidates && (
          <Modal
            title={fa ? "تطبیق با انتخاب شما" : "Choose a match"}
            onClose={() => setCandidates(null)}
          >
            <Table
              rows={candidates.rows}
              columns={[description, money, field("type", "نوع", "Type")]}
              actions={(r) => (
                <Action
                  label={fa ? "تطبیق" : "Match"}
                  url={base + `bank-transactions/${enc(candidates.id)}`}
                  body={{
                    action: "match",
                    matchedType: r.type,
                    matchedId: r.id,
                  }}
                  onDone={() => {
                    setCandidates(null);
                    tx.reload();
                  }}
                />
              )}
            />
          </Modal>
        )}
      </section>
    </>
  );
}

function Payroll() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const people = useRemote<{ employees: Row[] }>(base + "employees");
  const runs = useRemote<{ runs: Row[] }>(base + "payroll-runs");
  return (
    <>
      <section className="panel">
        <Create
          title={fa ? "کارمند جدید" : "New employee"}
          url={base + "employees"}
          fields={[
            name,
            field("baseSalary", "حقوق پایه", "Base salary", "number"),
          ]}
          onDone={people.reload}
        />
        <Notice error={people.error} loading={!people.data} />
        {people.data && (
          <Table
            rows={people.data.employees}
            columns={[
              name,
              field("baseSalary", "حقوق پایه", "Base salary"),
              field("isActive", "فعال", "Active"),
            ]}
          />
        )}
      </section>
      <section className="panel">
        <Create
          title={fa ? "ساخت پیش‌نویس حقوق" : "Generate draft payroll"}
          url={base + "payroll-runs"}
          fields={[period]}
          onDone={runs.reload}
        />
        <Notice error={runs.error} loading={!runs.data} />
        {runs.data?.runs.map((r) => (
          <article key={r.id}>
            <h3>
              <Cell value={r.period} /> · <Cell value={r.status} />
            </h3>
            <Table
              rows={r.payslips as Row[]}
              columns={[
                field("employee.name", "کارمند", "Employee"),
                field("baseSalary", "حقوق پایه", "Base salary"),
                field("bonus", "پاداش", "Bonus"),
                field("deductions", "کسورات", "Deductions"),
                field("netPay", "خالص", "Net pay"),
              ]}
              actions={(slip) =>
                r.status === "draft" && (
                  <Create
                    title={
                      fa ? "ویرایش پاداش و کسورات" : "Edit bonus and deductions"
                    }
                    url={base + `payslips/${enc(slip.id!)}`}
                    method="PUT"
                    fields={[
                      field("bonus", "پاداش", "Bonus", "number"),
                      field("deductions", "کسورات", "Deductions", "number"),
                    ]}
                    defaults={slip}
                    onDone={runs.reload}
                  />
                )
              }
            />
            {r.status !== "paid" && (
              <Action
                label={
                  r.status === "draft"
                    ? fa
                      ? "تأیید حقوق"
                      : "Approve payroll"
                    : fa
                      ? "ثبت پرداخت حقوق"
                      : "Record payroll payment"
                }
                url={base + `payroll-runs/${enc(r.id!)}`}
                body={{ action: r.status === "draft" ? "approve" : "pay" }}
                onDone={runs.reload}
                caution={
                  fa
                    ? "این تغییر فقط در دفتر مالی ثبت می‌شود و انتقال بانکی انجام نمی‌دهد."
                    : "This updates the ledger only; it does not make a bank transfer."
                }
              />
            )}
          </article>
        ))}
      </section>
    </>
  );
}

function Budgets() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const [date, setDate] = useState(month());
  const { data, error, reload } = useRemote<{ rows: Row[] }>(
    base + "budgets?period=" + date + "-01",
  );
  return (
    <section className="panel">
      <div className="domain-toolbar">
        <label>
          {fa ? "ماه" : "Month"}
          <input
            type="month"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <Create
          title={fa ? "بودجه حساب" : "Account budget"}
          url={base + "budgets"}
          fields={[code, period, money]}
          defaults={{ period: date }}
          onDone={reload}
        />
      </div>
      <Notice error={error} loading={!data} />
      {data && (
        <Table
          rows={data.rows}
          columns={[
            code,
            field("accountName", "حساب", "Account"),
            field("budgeted", "بودجه", "Budget"),
            field("actual", "واقعی", "Actual"),
            field("variance", "انحراف", "Variance"),
            field("variancePercent", "درصد انحراف", "Variance %"),
          ]}
        />
      )}
    </section>
  );
}

function Tax() {
  const { lang, fmt } = useAcc();
  const fa = lang === "fa";
  const rates = useRemote<{ taxRates: Row[] }>(base + "tax-rates");
  const vat = useRemote<{
    inputTax: number;
    outputTax: number;
    netPayable: number;
  }>(base + "reports/vat");
  return (
    <>
      <section className="panel">
        <Create
          title={fa ? "نرخ مالیات جدید" : "New tax rate"}
          url={base + "tax-rates"}
          fields={[name, field("ratePercent", "درصد", "Rate %", "number")]}
          onDone={rates.reload}
        />
        <Notice error={rates.error} loading={!rates.data} />
        {rates.data && (
          <Table
            rows={rates.data.taxRates}
            columns={[
              name,
              field("ratePercent", "درصد", "Rate %"),
              field("isDefault", "پیش‌فرض", "Default"),
            ]}
          />
        )}
      </section>
      <section className="panel">
        <h3>{fa ? "ارزش افزودهٔ ماه جاری" : "Current-month VAT"}</h3>
        <Notice error={vat.error} loading={!vat.data} />
        {vat.data && (
          <dl className="cost-summary">
            {["outputTax", "inputTax", "netPayable"].map((k) => (
              <div key={k}>
                <dt>
                  {fa
                    ? {
                        outputTax: "مالیات فروش",
                        inputTax: "مالیات خرید",
                        netPayable: "خالص پرداختنی",
                      }[k]
                    : k}
                </dt>
                <dd>{fmt(vat.data![k as keyof typeof vat.data], "IRT")}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>
  );
}

function Periods() {
  const { lang, api } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ periods: Row[] }>(
    base + "fiscal-periods",
  );
  const [audit, setAudit] = useState<Row | null>(null),
    [auditError, setAuditError] = useState("");
  return (
    <section className="panel">
      <Create
        title={fa ? "دوره مالی جدید" : "New fiscal period"}
        url={base + "fiscal-periods"}
        fields={[
          field("startDate", "شروع", "Start", "date"),
          field("endDate", "پایان", "End", "date"),
        ]}
        onDone={reload}
      />
      <Notice error={error || auditError} loading={!data} />
      {data && (
        <Table
          rows={data.periods}
          columns={[
            field("startDate", "شروع", "Start"),
            field("endDate", "پایان", "End"),
            field("isLocked", "بسته", "Locked"),
          ]}
          actions={(r) => (
            <>
              <Button
                onClick={async () => {
                  setAuditError("");
                  try {
                    const d = await api<{ report: Row }>(
                      base + "ai/audit-copilot",
                      { from: r.startDate, to: r.endDate },
                    );
                    setAudit(d.report);
                  } catch (e) {
                    setAuditError((e as Error).message);
                  }
                }}
              >
                {fa ? "بررسی پیش از بستن" : "Pre-close review"}
              </Button>
              <Action
                label={
                  r.isLocked
                    ? fa
                      ? "بازگشایی دوره"
                      : "Reopen period"
                    : fa
                      ? "بستن دوره"
                      : "Close period"
                }
                url={base + `fiscal-periods/${enc(r.id!)}`}
                body={{ action: r.isLocked ? "reopen" : "close" }}
                onDone={reload}
              />
            </>
          )}
        />
      )}
      {audit && (
        <Modal
          title={fa ? "بررسی دوره" : "Period review"}
          onClose={() => setAudit(null)}
        >
          <p>
            {fa ? "تراز بودن دفتر" : "Ledger balanced"}:{" "}
            <Cell value={audit.ledgerBalanced} />
          </p>
          <p>
            {fa ? "آمادهٔ بستن" : "Ready to close"}:{" "}
            <Cell value={audit.readyToClose} />
          </p>
          <Table
            rows={audit.findings as Row[]}
            columns={[
              field("category", "دسته", "Category"),
              field("count", "تعداد", "Count"),
              field("detail", "جزئیات", "Detail"),
            ]}
          />
        </Modal>
      )}
    </section>
  );
}

function Statements() {
  const { lang, get } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ statements: Row[] }>(
    base + "owner-statements",
  );
  const [detail, setDetail] = useState<Row | null>(null),
    [detailError, setDetailError] = useState("");
  return (
    <section className="panel">
      <AccountingDocumentForm kind="statement" onDone={reload} />
      <Notice error={error || detailError} loading={!data} />
      {data && (
        <Table
          rows={data.statements}
          columns={[
            field("property.title", "ملک", "Property"),
            field("month", "ماه", "Month"),
            field("netProfit", "سود", "Net profit"),
            field("ownerShare", "سهم مالک", "Owner share"),
            currency,
            field("status", "وضعیت", "Status"),
          ]}
          actions={(r) => (
            <>
              <Button
                onClick={async () => {
                  try {
                    const d = await get<{ statement: Row }>(
                      base + `owner-statements/${enc(r.id!)}`,
                    );
                    setDetail(d.statement);
                  } catch (e) {
                    setDetailError((e as Error).message);
                  }
                }}
              >
                {fa ? "جزئیات" : "Details"}
              </Button>
              {(r.status === "draft" ? ["approve"] : ["reopen", "send"]).map(
                (action) => (
                  <Action
                    key={action}
                    label={
                      fa
                        ? {
                            approve: "تأیید و ثبت سند",
                            reopen: "بازگشایی",
                            send: "ارسال ایمیل به مالک",
                          }[action]!
                        : {
                            approve: "Approve and post",
                            reopen: "Reopen",
                            send: "Email owner",
                          }[action]!
                    }
                    url={base + `owner-statements/${enc(r.id!)}`}
                    body={{ action, emailLang: lang }}
                    onDone={reload}
                    caution={
                      action === "send"
                        ? fa
                          ? "این گزارش به ایمیل مالک ثبت‌شدهٔ ملک ارسال می‌شود."
                          : "This emails the statement to the property's recorded owner."
                        : undefined
                    }
                  />
                ),
              )}
            </>
          )}
        />
      )}
      {detail && (
        <Modal
          title={fa ? "ردیف‌های تسویه" : "Statement lines"}
          onClose={() => setDetail(null)}
        >
          <Table
            rows={detail.entries as Row[]}
            columns={[
              field("date", "تاریخ", "Date"),
              description,
              field("income", "درآمد", "Income"),
              field("expense", "هزینه", "Expense"),
            ]}
          />
        </Modal>
      )}
    </section>
  );
}

function Assistant() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const costs = useRemote<{ costs: Record<string, number> }>(
    "/api/credits/costs",
  );
  const rate = costs.data?.costs.tool_accounting_ask ?? costs.data?.costs.tool;
  const lock = useRef(false);
  return (
    <section className="panel">
      <h3>{fa ? "پرسش از دفتر مالی" : "Ask your ledger"}</h3>
      <p>
        {fa
          ? "پاسخ از اطلاعات همین فضای کاری؛ بدون ثبت خودکار سند."
          : "Answers from this workspace; no automatic journal posting."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current || rate == null) return;
          lock.current = true;
          setBusy(true);
          setError("");
          setAnswer("");
          try {
            const r = await fetch(base + "ai/ask", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question }),
            });
            if (!r.ok) {
              const d = await r.json();
              throw Error(d.error);
            }
            await readStream(r, (text) => setAnswer((a) => a + text));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <label>
          {fa ? "سؤال شما" : "Your question"}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={4}
          />
        </label>
        <p>
          {rate == null
            ? fa
              ? "تعرفه هنوز دریافت نشده است."
              : "Cost not loaded yet."
            : `${rate} ${fa ? "کردیت" : "credits"}`}
        </p>
        <Button
          variant="primary"
          type="submit"
          disabled={busy || !question.trim() || rate == null}
        >
          {busy
            ? fa
              ? "در حال پاسخ…"
              : "Answering…"
            : fa
              ? "دریافت پاسخ"
              : "Get answer"}
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {answer && (
        <div
          className="panel"
          aria-live="polite"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {answer}
        </div>
      )}
    </section>
  );
}

function Automation() {
  const { lang } = useAcc();
  const fa = lang === "fa";
  const { data, error, reload } = useRemote<{ reports: Row[] }>(
    base + "scheduled-reports",
  );
  return (
    <section className="panel">
      <h3>{fa ? "گزارش‌های زمان‌بندی‌شده" : "Scheduled reports"}</h3>
      <p>
        {fa
          ? "ارسال پس از بررسی و تأیید اولین گزارش انجام می‌شود."
          : "Delivery requires review and approval of the first report."}
      </p>
      <Create
        title={fa ? "گزارش جدید" : "New report"}
        url={base + "scheduled-reports"}
        fields={[
          field("reportType", "نوع گزارش", "Report type", "select", [
            "weekly_summary",
            "monthly_pl",
            "monthly_vat",
          ]),
          field("frequency", "تناوب", "Frequency", "select", [
            "weekly",
            "monthly",
          ]),
          field("recipientEmail", "ایمیل گیرنده", "Recipient email", "email"),
          currency,
        ]}
        map={(d) => ({ ...d, lang })}
        onDone={reload}
      />
      <Notice error={error} loading={!data} />
      {data && (
        <Table
          rows={data.reports}
          columns={[
            field("reportType", "نوع", "Type"),
            field("frequency", "تناوب", "Frequency"),
            field("recipientEmail", "گیرنده", "Recipient"),
            field("status", "وضعیت", "Status"),
            field("lastRunAt", "آخرین اجرا", "Last run"),
          ]}
          actions={(r) => (
            <>
              <ReportPreview row={r} />
              {(r.status === "awaiting_approval"
                ? ["approve-first-run"]
                : r.status === "active"
                  ? ["pause"]
                  : r.status === "paused"
                    ? ["resume"]
                    : []
              ).map((action) => (
                <Action
                  key={action}
                  label={
                    fa
                      ? {
                          "approve-first-run": "تأیید اولین گزارش",
                          pause: "توقف",
                          resume: "ادامه",
                        }[action]!
                      : {
                          "approve-first-run": "Approve first report",
                          pause: "Pause",
                          resume: "Resume",
                        }[action]!
                  }
                  url={base + `scheduled-reports/${enc(r.id!)}`}
                  body={{ action }}
                  onDone={reload}
                />
              ))}
            </>
          )}
        />
      )}
    </section>
  );
}
function ReportPreview({ row }: { row: Row }) {
  const { lang } = useAcc();
  const [open, setOpen] = useState(false);
  return row.firstRunPreview ? (
    <>
      <Button onClick={() => setOpen(true)}>
        {lang === "fa" ? "پیش‌نمایش" : "Preview"}
      </Button>
      {open && (
        <Modal
          title={lang === "fa" ? "پیش‌نمایش گزارش" : "Report preview"}
          onClose={() => setOpen(false)}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>
            {String(row.firstRunPreview)}
          </div>
        </Modal>
      )}
    </>
  ) : null;
}
