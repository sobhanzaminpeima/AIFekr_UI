export type JournalLine = {
  id: string;
  account: string;
  debit: number;
  credit: number;
  memo: string;
};
export type Journal = {
  id: string;
  date: string;
  memo: string;
  lines: JournalLine[];
  reversed?: boolean;
};
export type Employee = {
  id: string;
  name: string;
  salary: number;
  bonus: number;
  commission: number;
  deductions: number;
  active: boolean;
};
export type Payroll = {
  id: string;
  period: string;
  status: "draft" | "approved" | "paid";
  employees: Employee[];
};
export type BankEntry = {
  id: string;
  date: string;
  memo: string;
  amount: number;
  match?: string;
};
export type Expense = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: "pending" | "approved" | "paid";
};
export type Budget = { id: string; category: string; limit: number };
export type FinanceState = {
  journals: Journal[];
  employees: Employee[];
  payrolls: Payroll[];
  bank: BankEntry[];
  expenses: Expense[];
  budgets: Budget[];
  closedPeriods: string[];
};
export const initialFinance: FinanceState = {
  journals: [],
  employees: [
    {
      id: "EMP-001",
      name: "سارا احمدی",
      salary: 18000000,
      bonus: 0,
      commission: 0,
      deductions: 0,
      active: true,
    },
  ],
  payrolls: [],
  bank: [
    {
      id: "BNK-001",
      date: "2026-10-25",
      memo: "دریافت مشتری",
      amount: 2500000,
    },
    { id: "BNK-002", date: "2026-10-26", memo: "هزینه خدمات", amount: -500000 },
  ],
  expenses: [],
  budgets: [
    { id: "BUD-001", category: "operations", limit: 10000000 },
    { id: "BUD-002", category: "marketing", limit: 5000000 },
  ],
  closedPeriods: [],
};
export const netPay = (employee: Employee) =>
  Math.max(
    0,
    employee.salary +
      employee.bonus +
      employee.commission -
      employee.deductions,
  );
export function journalTotals(lines: JournalLine[]) {
  return lines.reduce(
    (s, l) => ({ debit: s.debit + l.debit, credit: s.credit + l.credit }),
    { debit: 0, credit: 0 },
  );
}
export function journalError(
  lines: JournalLine[],
): "empty" | "invalid" | "unbalanced" | null {
  if (lines.length < 2) return "empty";
  if (
    lines.some(
      (l) =>
        !l.account ||
        ![l.debit, l.credit].every((v) => Number.isFinite(v) && v >= 0) ||
        l.debit > 0 === l.credit > 0,
    )
  )
    return "invalid";
  const total = journalTotals(lines);
  return total.debit > 0 && Math.abs(total.debit - total.credit) < 0.005
    ? null
    : "unbalanced";
}
export const periodLocked = (state: FinanceState, date: string) =>
  state.closedPeriods.includes(date.slice(0, 7));
export const financeAccounts = [
  ["1101", "بانک", "Bank"],
  ["1102", "دریافتنی مشتریان", "Accounts receivable"],
  ["2101", "پرداختنی تأمین‌کنندگان", "Accounts payable"],
  ["3101", "سرمایه", "Capital"],
  ["4101", "درآمد خدمات", "Service revenue"],
  ["5101", "هزینه‌های عملیاتی", "Operating expenses"],
  ["5102", "هزینه بازاریابی", "Marketing expenses"],
  ["5103", "حقوق و دستمزد", "Payroll expense"],
];
