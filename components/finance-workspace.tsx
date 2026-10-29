"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { useLocalState } from "@/lib/use-local-state";
import { OwnerStatementManager } from './owner-workspace';
import {
  BankEntry,
  Employee,
  Expense,
  FinanceState,
  JournalLine,
  financeAccounts,
  initialFinance,
  journalError,
  journalTotals,
  netPay,
  periodLocked,
} from "@/lib/finance";

const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): JournalLine => ({
  id: uid(),
  account: "1101",
  debit: 0,
  credit: 0,
  memo: "",
});
const categories = [
  ["operations", "عملیات", "Operations"],
  ["marketing", "بازاریابی", "Marketing"],
  ["payroll", "حقوق", "Payroll"],
  ["other", "سایر", "Other"],
];
export const financeViews = [
  "overview",
  "journal",
  "accounts",
  "ledger-setup",
  "expenses",
  "bank",
  "payroll",
  "budgets",
  "close-period",
  "owner-statements",
  "tax",
];
export function FinanceWorkspace({ view }: { view: string }) {
  const [state, save, ready] = useLocalState<FinanceState>(
    "aifekr-finance-v2",
    initialFinance,
  );
  const { fa, price, n } = useApp();
  const expenses = state.expenses.reduce((s, e) => s + e.amount, 0);
  const total = state.journals.reduce(
    (s, j) => s + journalTotals(j.lines).debit,
    0,
  );
  return (
    <div className="finance-workspace" aria-busy={!ready}>
      <div className="stats-grid">
        {[
          [fa ? "گردش اسناد" : "Journal turnover", price(total)],
          [fa ? "هزینه‌های ثبت‌شده" : "Recorded expenses", price(expenses)],
          [fa ? "اسناد ثبت‌شده" : "Posted journals", n(state.journals.length)],
          [
            fa ? "دوره‌های بسته" : "Closed periods",
            n(state.closedPeriods.length),
          ],
        ].map(([label, value]) => (
          <div className="panel stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {view === "journal" ? (
        <JournalEditor state={state} save={save} />
      ) : view === "payroll" ? (
        <PayrollWorkspace state={state} save={save} />
      ) : view === "bank" ? (
        <BankWorkspace state={state} save={save} />
      ) : view === "expenses" ? (
        <ExpenseWorkspace state={state} save={save} />
      ) : view === "close-period" ? (
        <ClosePeriod state={state} save={save} />
      ) : view === "budgets" ? (
        <BudgetWorkspace state={state} save={save} />
      ) : view === "owner-statements" ? (
        <OwnerStatementManager />
      ) : view === "tax" ? (
        <TaxWorksheet />
      ) : (
        <Ledger state={state} save={save} setup={view === "ledger-setup"} />
      )}
    </div>
  );
}
type Props = { state: FinanceState; save: (s: FinanceState) => void };
function JournalEditor({ state, save }: Props) {
  const { fa, price, t } = useApp();
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([]);
  const totals = journalTotals(lines),
    error = journalError(lines);
  const locked = periodLocked(state, date);
  const update = (id: string, patch: Partial<JournalLine>) =>
    setLines(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (error || locked) return;
          save({
            ...state,
            journals: [{ id: uid(), date, memo, lines }, ...state.journals],
          });
          setLines([]);
          setMemo("");
          toast.success(fa ? "سند تراز ثبت شد" : "Balanced journal posted");
        }}
      >
        <div className="domain-fields">
          <label>
            {fa ? "تاریخ سند" : "Entry date"}
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            {fa ? "شرح سند" : "Memo"}
            <input
              required
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
        </div>
        <div className="domain-table-wrap">
          <table className="domain-table">
            <thead>
              <tr>
                {[
                  fa ? "حساب" : "Account",
                  fa ? "بدهکار" : "Debit",
                  fa ? "بستانکار" : "Credit",
                  fa ? "شرح ردیف" : "Line memo",
                  "",
                ].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id}>
                  <td>
                    <select
                      aria-label={
                        (fa ? "حساب ردیف " : "Account line ") + (i + 1)
                      }
                      value={line.account}
                      onChange={(e) =>
                        update(line.id, { account: e.target.value })
                      }
                    >
                      {financeAccounts.map(([code, a, b]) => (
                        <option value={code} key={code}>
                          {code} · {fa ? a : b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={
                        (fa ? "بدهکار ردیف " : "Debit line ") + (i + 1)
                      }
                      type="number"
                      min={0}
                      step="any"
                      value={line.debit}
                      onChange={(e) =>
                        update(line.id, { debit: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={
                        (fa ? "بستانکار ردیف " : "Credit line ") + (i + 1)
                      }
                      type="number"
                      min={0}
                      step="any"
                      value={line.credit}
                      onChange={(e) =>
                        update(line.id, { credit: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={(fa ? "شرح ردیف " : "Line memo ") + (i + 1)}
                      value={line.memo}
                      onChange={(e) =>
                        update(line.id, { memo: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <Button
                      onClick={() =>
                        setLines(lines.filter((l) => l.id !== line.id))
                      }
                    >
                      {t("delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={() => setLines([...lines, blankLine()])}>
          <Icon name="Plus" size={16} />
          {fa ? "افزودن آرتیکل" : "Add line"}
        </Button>
        <div className="finance-summary">
          <span>
            {fa ? "بدهکار" : "Debit"}: {price(totals.debit)}
          </span>
          <span>
            {fa ? "بستانکار" : "Credit"}: {price(totals.credit)}
          </span>
          <strong>
            {fa ? "اختلاف" : "Difference"}:{" "}
            {price(Math.abs(totals.debit - totals.credit))}
          </strong>
        </div>
        {locked ? (
          <p role="alert">
            {fa
              ? "این دوره بسته است؛ تاریخ دیگری انتخاب کن."
              : "This period is closed. Choose another date."}
          </p>
        ) : error && lines.length > 0 ? (
          <p role="status">
            {fa
              ? "هر ردیف باید فقط بدهکار یا بستانکار باشد و جمع دو طرف برابر شود."
              : "Each line must have either a debit or credit, and both totals must balance."}
          </p>
        ) : null}
        <Button type="submit" variant="primary" disabled={!!error || locked}>
          {fa ? "ثبت سند تراز" : "Post balanced entry"}
        </Button>
      </form>
      <JournalList state={state} save={save} />
    </>
  );
}
function JournalList({ state, save }: Props) {
  const { fa, price } = useApp();
  return (
    <section className="panel">
      <h3>{fa ? "اسناد و برگشت‌ها" : "Posted entries and reversals"}</h3>
      {!state.journals.length ? (
        <Empty />
      ) : (
        state.journals.map((j) => (
          <article className="domain-card" key={j.id}>
            <div className="row-between">
              <strong>{j.memo}</strong>
              <time>{j.date}</time>
            </div>
            <p>
              {price(journalTotals(j.lines).debit)} ·{" "}
              {j.reversed
                ? fa
                  ? "برگشت‌شده"
                  : "Reversed"
                : fa
                  ? "ثبت‌شده"
                  : "Posted"}
            </p>
            <Button
              disabled={j.reversed || periodLocked(state, j.date)}
              onClick={() => {
                save({
                  ...state,
                  journals: [
                    {
                      id: uid(),
                      date: j.date,
                      memo: (fa ? "برگشت: " : "Reversal: ") + j.memo,
                      lines: j.lines.map((l) => ({
                        ...l,
                        id: uid(),
                        debit: l.credit,
                        credit: l.debit,
                      })),
                    },
                    ...state.journals.map((x) =>
                      x.id === j.id ? { ...x, reversed: true } : x,
                    ),
                  ],
                });
              }}
            >
              {fa ? "ثبت سند معکوس" : "Post reversal"}
            </Button>
          </article>
        ))
      )}
    </section>
  );
}
function Ledger({
  state,
  save,
  setup,
}: {
  state: FinanceState;
  save: Props["save"];
  setup: boolean;
}) {
  const { fa, price } = useApp();
  const [account, setAccount] = useState("all");
  const rows = financeAccounts
    .filter(([code]) => account === "all" || code === account)
    .map(([code, a, b]) => {
      const lines = state.journals
        .flatMap((j) => j.lines)
        .filter((l) => l.account === code);
      return { code, title: fa ? a : b, ...journalTotals(lines) };
    });
  return (
    <>
      <section className="panel">
        <div className="domain-toolbar">
          <h3>
            {setup
              ? fa
                ? "کدینگ و تراز حساب‌ها"
                : "Chart of accounts"
              : fa
                ? "دفتر و تراز آزمایشی"
                : "Ledger and trial balance"}
          </h3>
          <select
            aria-label={fa ? "انتخاب حساب" : "Choose account"}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="all">{fa ? "همه حساب‌ها" : "All accounts"}</option>
            {financeAccounts.map(([code, a, b]) => (
              <option key={code} value={code}>
                {fa ? a : b}
              </option>
            ))}
          </select>
          <Button
            onClick={() =>
              download(
                "trial-balance.csv",
                "\ufeff" +
                  [
                    ["code", "account", "debit", "credit", "balance"],
                    ...rows.map((r) => [
                      r.code,
                      r.title,
                      r.debit,
                      r.credit,
                      r.debit - r.credit,
                    ]),
                  ]
                    .map((r) => r.join(","))
                    .join("\n"),
                "text/csv",
              )
            }
          >
            {fa ? "خروجی تراز" : "Export trial balance"}
          </Button>
        </div>
        <div className="domain-table-wrap">
          <table className="domain-table">
            <thead>
              <tr>
                {[
                  fa ? "کد" : "Code",
                  fa ? "حساب" : "Account",
                  fa ? "بدهکار" : "Debit",
                  fa ? "بستانکار" : "Credit",
                  fa ? "مانده" : "Balance",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>{r.code}</td>
                  <td>{r.title}</td>
                  <td>{price(r.debit)}</td>
                  <td>{price(r.credit)}</td>
                  <td>{price(r.debit - r.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <JournalList state={state} save={save} />
    </>
  );
}
function PayrollWorkspace({ state, save }: Props) {
  const { fa, price, t } = useApp();
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [slip, setSlip] = useState<Employee | null>(null);
  const active = state.employees.filter((e) => e.active);
  const run = state.payrolls.find((r) => r.period === period);
  const locked = state.closedPeriods.includes(period);
  function transition(status: "approved" | "paid") {
    if (!run || locked) return;
    save({
      ...state,
      payrolls: state.payrolls.map((r) =>
        r.id === run.id ? { ...r, status } : r,
      ),
    });
  }
  return (
    <>
      <section className="panel">
        <div className="domain-toolbar">
          <label>
            {fa ? "دوره حقوق" : "Payroll month"}
            <input
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
          <Button
            onClick={() =>
              setEmployee({
                id: uid(),
                name: "",
                salary: 0,
                bonus: 0,
                commission: 0,
                deductions: 0,
                active: true,
              })
            }
          >
            {fa ? "افزودن کارمند" : "Add employee"}
          </Button>
          <span className="badge">
            {locked
              ? fa
                ? "دوره بسته"
                : "Period closed"
              : run?.status || (fa ? "بدون لیست" : "Not calculated")}
          </span>
        </div>
        <div className="domain-table-wrap">
          <table className="domain-table">
            <thead>
              <tr>
                {[
                  fa ? "کارمند" : "Employee",
                  fa ? "حقوق پایه" : "Base salary",
                  fa ? "پاداش و کمیسیون" : "Bonus & commission",
                  fa ? "کسورات" : "Deductions",
                  fa ? "خالص پرداختی" : "Net pay",
                  fa ? "عملیات" : "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(run?.employees || active).map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{price(e.salary)}</td>
                  <td>{price(e.bonus + e.commission)}</td>
                  <td>{price(e.deductions)}</td>
                  <td className="payroll-net">{price(netPay(e))}</td>
                  <td>
                    <div className="domain-actions">
                      <Button
                        disabled={!!run || locked}
                        onClick={() => setEmployee(e)}
                      >
                        {fa ? "ویرایش" : "Edit"}
                      </Button>
                      <Button onClick={() => setSlip(e)}>
                        {fa ? "فیش حقوق" : "Payslip"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="finance-summary">
          <strong>
            {fa ? "جمع خالص پرداختی" : "Total net pay"}:{" "}
            <span className="payroll-total">
              {price(
                (run?.employees || active).reduce((s, e) => s + netPay(e), 0),
              )}
            </span>
          </strong>
        </div>
        <div className="domain-actions">
          <Button
            variant="primary"
            disabled={!!run || !active.length || locked || !period}
            onClick={() =>
              save({
                ...state,
                payrolls: [
                  {
                    id: uid(),
                    period,
                    status: "draft",
                    employees: structuredClone(active),
                  },
                  ...state.payrolls,
                ],
              })
            }
          >
            {fa ? "محاسبه و ایجاد لیست" : "Calculate payroll"}
          </Button>
          <Button
            disabled={run?.status !== "draft" || locked}
            onClick={() => transition("approved")}
          >
            {fa ? "تأیید لیست" : "Approve payroll"}
          </Button>
          <Button
            disabled={run?.status !== "approved" || locked}
            onClick={() => transition("paid")}
          >
            {fa ? "ثبت پرداخت محلی" : "Record local payment"}
          </Button>
          {run?.status === "draft" && (
            <Button
              onClick={() =>
                save({
                  ...state,
                  payrolls: state.payrolls.filter((r) => r.id !== run.id),
                })
              }
            >
              {fa ? "حذف پیش‌نویس" : "Discard draft"}
            </Button>
          )}
        </div>
        <p className="fine-print">
          {fa
            ? "مقادیر پاداش و کسورات را وارد کن. نرخ قانونی یا پرداخت بانکی در این پیش‌نمایش اعمال نمی‌شود."
            : "Enter bonuses and deductions. This preview applies no statutory rates and makes no bank payments."}
        </p>
      </section>
      {employee && (
        <Modal
          title={fa ? "اطلاعات حقوق کارمند" : "Employee compensation"}
          onClose={() => setEmployee(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({
                ...state,
                employees: state.employees.some((x) => x.id === employee.id)
                  ? state.employees.map((x) =>
                      x.id === employee.id ? employee : x,
                    )
                  : [...state.employees, employee],
              });
              setEmployee(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {t("name")}
                <input
                  required
                  value={employee.name}
                  onChange={(e) =>
                    setEmployee({ ...employee, name: e.target.value })
                  }
                />
              </label>
              {(["salary", "bonus", "commission", "deductions"] as const).map(
                (key, i) => (
                  <label key={key}>
                    {
                      (fa
                        ? ["حقوق پایه", "پاداش", "کمیسیون", "کسورات"]
                        : ["Base salary", "Bonus", "Commission", "Deductions"])[
                        i
                      ]
                    }
                    <input
                      type="number"
                      min={0}
                      required
                      value={employee[key]}
                      onChange={(e) =>
                        setEmployee({
                          ...employee,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ),
              )}
            </div>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
      {slip && (
        <Modal
          title={fa ? "فیش حقوق" : "Payslip"}
          onClose={() => setSlip(null)}
        >
          <div className="finance-slip">
            <h2>{slip.name}</h2>
            <p>{period}</p>
            <dl className="domain-detail">
              {[
                [fa ? "حقوق پایه" : "Salary", slip.salary],
                [fa ? "پاداش" : "Bonus", slip.bonus],
                [fa ? "کمیسیون" : "Commission", slip.commission],
                [fa ? "کسورات" : "Deductions", slip.deductions],
                [fa ? "خالص پرداختی" : "Net pay", netPay(slip)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd>{price(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <Button
              onClick={() =>
                download(
                  "payslip-" + period + ".json",
                  JSON.stringify(
                    { period, ...slip, netPay: netPay(slip) },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              {fa ? "دریافت فیش" : "Download payslip"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function BankWorkspace({ state, save }: Props) {
  const { fa, price } = useApp();
  const [selected, setSelected] = useState<BankEntry | null>(null);
  const [entryId, setEntryId] = useState("");
  const candidates = state.journals.filter(
    (j) =>
      !state.bank.some((b) => b.match === j.id) &&
      j.lines.some(
        (l) =>
          l.account === "1101" &&
          Math.abs(l.debit - l.credit - (selected?.amount || 0)) < 0.005,
      ),
  );
  return (
    <>
      <section className="panel">
        <h3>
          {fa
            ? "تطبیق تراکنش با سند دفتر"
            : "Match bank transactions to journal entries"}
        </h3>
        <p>
          {fa
            ? "تطبیق فقط با سند بانکی هم‌مبلغ و استفاده‌نشده ممکن است."
            : "Only an unused journal with an equal bank amount can be matched."}
        </p>
        {state.bank.map((b) => (
          <article className="domain-card row-between" key={b.id}>
            <div>
              <strong>{b.memo}</strong>
              <p>
                {b.date} · {price(b.amount)}
              </p>
              <span className="badge">
                {b.match
                  ? fa
                    ? "تطبیق‌شده"
                    : "Matched"
                  : fa
                    ? "تطبیق‌نشده"
                    : "Unmatched"}
              </span>
            </div>
            <Button
              disabled={periodLocked(state, b.date)}
              onClick={() => {
                if (b.match) {
                  save({
                    ...state,
                    bank: state.bank.map((x) =>
                      x.id === b.id ? { ...x, match: undefined } : x,
                    ),
                  });
                } else {
                  setSelected(b);
                  setEntryId("");
                }
              }}
            >
              {b.match
                ? fa
                  ? "لغو تطبیق"
                  : "Unmatch"
                : fa
                  ? "انتخاب سند"
                  : "Choose journal"}
            </Button>
          </article>
        ))}
      </section>
      {selected && (
        <Modal
          title={fa ? "سند متناظر" : "Matching journal"}
          onClose={() => setSelected(null)}
        >
          <p>
            {selected.memo} · {price(selected.amount)}
          </p>
          <label>
            {fa ? "سند هم‌مبلغ" : "Equal-amount journal"}
            <select
              aria-label={fa ? 'سند هم‌مبلغ' : 'Equal-amount journal'}
              value={entryId}
              onChange={(e) => setEntryId(e.target.value)}
            >
              <option value="">{fa ? "انتخاب سند" : "Choose journal"}</option>
              {candidates.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.memo} · {j.date}
                </option>
              ))}
            </select>
          </label>
          {!candidates.length && (
            <p>
              {fa
                ? "ابتدا سند بانکی با همین مبلغ در تب اسناد ثبت کن."
                : "First post a bank journal with the same amount in Journal entries."}
            </p>
          )}
          <Button
            variant="primary"
            disabled={!candidates.some((j) => j.id === entryId)}
            onClick={() => {
              save({
                ...state,
                bank: state.bank.map((b) =>
                  b.id === selected.id ? { ...b, match: entryId } : b,
                ),
              });
              setSelected(null);
            }}
          >
            {fa ? "تأیید تطبیق" : "Confirm match"}
          </Button>
        </Modal>
      )}
    </>
  );
}
function ExpenseWorkspace({ state, save }: Props) {
  const { fa, price, t } = useApp();
  const [draft, setDraft] = useState<Expense | null>(null);
  const [filter, setFilter] = useState("all");
  return (
    <section className="panel">
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setDraft({
              id: uid(),
              date: today(),
              description: "",
              category: "operations",
              amount: 0,
              status: "pending",
            })
          }
        >
          {fa ? "ثبت هزینه" : "Add expense"}
        </Button>
        <select
          aria-label={fa ? "وضعیت هزینه" : "Expense status"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{fa ? "همه" : "All"}</option>
          {["pending", "approved", "paid"].map((s, i) => (
            <option key={s} value={s}>
              {
                (fa
                  ? ["در انتظار", "تأییدشده", "پرداخت‌شده"]
                  : ["Pending", "Approved", "Paid"])[i]
              }
            </option>
          ))}
        </select>
      </div>
      {!state.expenses.length ? (
        <Empty />
      ) : (
        state.expenses
          .filter((e) => filter === "all" || e.status === filter)
          .map((e) => (
            <article className="domain-card row-between" key={e.id}>
              <div>
                <strong>{e.description}</strong>
                <p>
                  {price(e.amount)} · {e.date}
                </p>
                <span className="badge">{e.status}</span>
              </div>
              <div className="domain-actions">
                <Button
                  disabled={e.status === "paid" || periodLocked(state, e.date)}
                  onClick={() =>
                    save({
                      ...state,
                      expenses: state.expenses.map((x) =>
                        x.id === e.id
                          ? {
                              ...x,
                              status:
                                e.status === "pending" ? "approved" : "paid",
                            }
                          : x,
                      ),
                    })
                  }
                >
                  {e.status === "pending"
                    ? fa
                      ? "تأیید هزینه"
                      : "Approve expense"
                    : fa
                      ? "ثبت پرداخت"
                      : "Record payment"}
                </Button>
                <Button
                  disabled={
                    e.status !== "pending" || periodLocked(state, e.date)
                  }
                  onClick={() => setDraft(e)}
                >
                  {fa ? "ویرایش" : "Edit"}
                </Button>
              </div>
            </article>
          ))
      )}
      {draft && (
        <Modal
          title={fa ? "هزینه و رسید" : "Expense details"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (periodLocked(state, draft.date) || draft.amount <= 0) return;
              save({
                ...state,
                expenses: state.expenses.some((x) => x.id === draft.id)
                  ? state.expenses.map((x) => (x.id === draft.id ? draft : x))
                  : [draft, ...state.expenses],
              });
              setDraft(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "شرح هزینه" : "Description"}
                <input
                  required
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "مبلغ" : "Amount"}
                <input
                  type="number"
                  min={1}
                  required
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "تاریخ" : "Date"}
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </label>
              <label>
                {fa ? "دسته" : "Category"}
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                >
                  {categories.map(([id, a, b]) => (
                    <option key={id} value={id}>
                      {fa ? a : b}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {periodLocked(state, draft.date) && (
              <p role="alert">
                {fa ? "دوره مالی بسته است" : "Fiscal period is closed"}
              </p>
            )}
            <Button
              type="submit"
              disabled={periodLocked(state, draft.date)}
              variant="primary"
            >
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </section>
  );
}
function BudgetWorkspace({ state, save }: Props) {
  const { fa, price } = useApp();
  return (
    <section className="panel">
      <h3>{fa ? "بودجه در برابر هزینه واقعی" : "Budget vs actual expenses"}</h3>
      {categories.map(([id, a, b]) => {
        const budget = state.budgets.find((x) => x.category === id);
        const actual = state.expenses
          .filter((e) => e.category === id)
          .reduce((s, e) => s + e.amount, 0);
        const limit = budget?.limit || 0;
        return (
          <article className="domain-card" key={id}>
            <h3>{fa ? a : b}</h3>
            <label>
              {fa ? "سقف بودجه" : "Budget limit"}
              <input
                type="number"
                min={0}
                value={limit}
                onChange={(e) =>
                  save({
                    ...state,
                    budgets: budget
                      ? state.budgets.map((x) =>
                          x.id === budget.id
                            ? {
                                ...x,
                                limit: Math.max(0, Number(e.target.value)),
                              }
                            : x,
                        )
                      : [
                          ...state.budgets,
                          {
                            id: uid(),
                            category: id,
                            limit: Math.max(0, Number(e.target.value)),
                          },
                        ],
                  })
                }
              />
            </label>
            <progress max={Math.max(limit, actual, 1)} value={actual} />
            <div className="row-between">
              <span>
                {fa ? "هزینه واقعی" : "Actual"}: {price(actual)}
              </span>
              <strong className={actual > limit ? "amber-text" : ""}>
                {fa ? "مانده" : "Remaining"}: {price(limit - actual)}
              </strong>
            </div>
          </article>
        );
      })}
    </section>
  );
}
function ClosePeriod({ state, save }: Props) {
  const { fa } = useApp();
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [confirm, setConfirm] = useState(false);
  const unmatched = state.bank.filter(
    (b) => b.date.startsWith(period) && !b.match,
  ).length;
  const unpaid = state.payrolls.filter(
    (r) => r.period === period && r.status !== "paid",
  ).length;
  const pending = state.expenses.filter(
    (e) => e.date.startsWith(period) && e.status === "pending",
  ).length;
  const closed = state.closedPeriods.includes(period);
  return (
    <section className="panel">
      <label>
        {fa ? "دوره مالی" : "Fiscal month"}
        <input
          type="month"
          required
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setConfirm(false);
          }}
        />
      </label>
      <div className="close-checks">
        {[
          [fa ? "تطبیق بانک" : "Bank reconciliation", unmatched],
          [fa ? "لیست حقوق پرداخت‌نشده" : "Unpaid payroll", unpaid],
          [fa ? "هزینه تأییدنشده" : "Unapproved expenses", pending],
        ].map(([label, count]) => (
          <p key={String(label)}>
            <Icon name={count ? "CircleAlert" : "CheckCircle2"} size={18} />{" "}
            {label} · {count}
          </p>
        ))}
      </div>
      {closed ? (
        <p className="badge">
          {fa
            ? "دوره بسته و ثبت سند غیرفعال است"
            : "Period closed; new postings are disabled"}
        </p>
      ) : (
        <>
          <label className="toggle-row">
            <span>
              {fa
                ? "بررسی گزارش‌ها و قفل ثبت‌های این دوره را تأیید می‌کنم."
                : "I reviewed the reports and confirm locking this period."}
            </span>
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
          </label>
          <Button
            variant="primary"
            disabled={!period || !confirm || !!(unmatched + unpaid + pending)}
            onClick={() => {
              save({
                ...state,
                closedPeriods: [...state.closedPeriods, period],
              });
              toast.success(fa ? "دوره مالی بسته شد" : "Fiscal period closed");
            }}
          >
            {fa ? "بستن و قفل دوره" : "Close and lock period"}
          </Button>
        </>
      )}
    </section>
  );
}
function OwnerStatement() {
  const { fa, price } = useApp();
  const [rent, setRent] = useState(20000000),
    [expenses, setExpenses] = useState(1000000),
    [rate, setRate] = useState(10);
  const fee = (rent * rate) / 100,
    net = rent - expenses - fee;
  return (
    <section className="panel">
      <h3>{fa ? "محاسبه تسویه مالک" : "Owner settlement worksheet"}</h3>
      <div className="domain-fields">
        {[
          [fa ? "اجاره وصول‌شده" : "Collected rent", rent, setRent],
          [fa ? "هزینه ملک" : "Property expenses", expenses, setExpenses],
          [fa ? "درصد مدیریت" : "Management fee %", rate, setRate],
        ].map(([label, value, setter], i) => (
          <label key={i}>
            {String(label)}
            <input
              type="number"
              min={0}
              max={i === 2 ? 100 : undefined}
              value={Number(value)}
              onChange={(e) =>
                (setter as (n: number) => void)(
                  Math.max(
                    0,
                    Math.min(i === 2 ? 100 : Infinity, Number(e.target.value)),
                  ),
                )
              }
            />
          </label>
        ))}
      </div>
      <div className="finance-summary">
        <span>
          {fa ? "کارمزد" : "Fee"}: {price(fee)}
        </span>
        <strong>
          {fa ? "خالص مالک" : "Net to owner"}: {price(net)}
        </strong>
      </div>
      <Button
        onClick={() =>
          download(
            "owner-statement.json",
            JSON.stringify({ rent, expenses, rate, fee, net }, null, 2),
            "application/json",
          )
        }
      >
        {fa ? "دریافت صورت‌حساب" : "Download statement"}
      </Button>
    </section>
  );
}
function TaxWorksheet() {
  const { fa, price } = useApp();
  const [base, setBase] = useState(0),
    [rate, setRate] = useState(0),
    [input, setInput] = useState(0);
  return (
    <section className="panel">
      <h3>
        {fa
          ? "کاربرگ مالیات با نرخ انتخابی"
          : "Tax worksheet with your chosen rate"}
      </h3>
      <div className="domain-fields">
        {[
          [fa ? "فروش مشمول" : "Taxable sales", base, setBase],
          [fa ? "نرخ انتخابی (%)" : "Chosen rate (%)", rate, setRate],
          [fa ? "اعتبار خرید" : "Input tax credit", input, setInput],
        ].map(([label, value, setter], i) => (
          <label key={i}>
            {String(label)}
            <input
              type="number"
              min={0}
              max={i === 1 ? 100 : undefined}
              value={Number(value)}
              onChange={(e) =>
                (setter as (n: number) => void)(
                  Math.max(
                    0,
                    Math.min(i === 1 ? 100 : Infinity, Number(e.target.value)),
                  ),
                )
              }
            />
          </label>
        ))}
      </div>
      <strong>
        {fa ? "مالیات خالص محاسباتی" : "Calculated net tax"}:{" "}
        {price((base * rate) / 100 - input)}
      </strong>
      <p>
        {fa
          ? "این نرخ توسط شما وارد می‌شود و نرخ قانونی پیشنهاد نمی‌کند."
          : "The rate is supplied by you; no statutory rate is assumed."}
      </p>
    </section>
  );
}
