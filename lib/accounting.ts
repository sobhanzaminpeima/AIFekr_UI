// The real accounting module's records and the classic accounting pages'
// display rules (main site lib/accounting/useAccountingLocale.ts and
// accountName.ts), kept identical so both themes show the same figures.
import type { Locale } from "./i18n";

export interface Account { id: string; code: string; name: string; nameEn?: string | null; nameDe?: string | null; nameTr?: string | null; type: string; isSystem?: boolean }
export interface Dashboard {
  cashBalance: number; receivablesOutstanding: number; payablesOutstanding: number;
  monthRevenue: number; monthExpense: number; monthNetProfit: number;
  trend: { label: string; revenue: number; expense: number }[];
  expenseByCategory: { code: string; name: string; nameEn: string | null; nameDe: string | null; nameTr: string | null; amount: number }[];
  overdueInvoices: { id: string; invoiceNumber: string; total: number; dueDate: string | null; contactName: string }[];
  pendingCommissions: { id: string; dealTitle: string; agentUserId: string; amount: number }[];
  bankUnreconciledCount: number;
  shortTermRental: { activeUnits: number; monthManagementFeeTotal: number; pendingStatements: number };
}
export interface JournalEntry {
  id: string; entryDate: string; memo: string | null; sourceRef: string | null; postedBy: string; isReversed: boolean; reversesEntryId: string | null;
  lines: { id: string; debit: number; credit: number; memo: string | null; account: { code: string; name: string; nameEn: string | null; nameDe: string | null; nameTr: string | null } }[];
}
export interface TrialBalanceRow { accountId: string; code: string; name: string; nameEn: string | null; type: string; debitTotal: number; creditTotal: number; balance: number }
export interface AccountLine { id: string; debit: number; credit: number; memo: string | null; entry: { id: string; entryDate: string; memo: string | null; sourceRef: string | null; postedBy: string; isReversed: boolean } }
export interface Vendor { id: string; name: string; phone: string | null; email: string | null }
export interface Expense {
  id: string; vendorId: string | null; accountCode: string; amount: number; currency: string; description: string;
  status: "pending_approval" | "approved" | "rejected" | "paid"; expenseDate: string; vendor: Vendor | null; property: { id: string; title: string } | null;
}
export interface BankAccount { id: string; name: string; accountNumber: string | null; currency: string }
export interface BankTransaction { id: string; bankAccountId: string; date: string; description: string; amount: number; status: "unmatched" | "matched" | "ignored"; matchedType: string | null; matchedId: string | null }
export interface MatchCandidate { type: string; id: string; description: string; amount: number; date: string; confidence: number }
export interface Employee { id: string; name: string; userId: string | null; baseSalary: number; isActive: boolean }
export interface Payslip { id: string; employeeId: string; baseSalary: number; commissionTotal: number; bonus: number; deductions: number; netPay: number; employee: Employee }
export interface PayrollRun { id: string; period: string; status: "draft" | "approved" | "paid"; payslips: Payslip[] }
export interface BudgetRow { accountCode: string; accountName: string; budgeted: number; actual: number; variance: number; variancePercent: number }
export interface TaxRate { id: string; name: string; ratePercent: number; isDefault: boolean }
export interface VatReport { outputTax: number; inputTax: number; netPayable: number }
export interface FiscalPeriod { id: string; startDate: string; endDate: string; isLocked: boolean; lockedAt: string | null; lockedBy: string | null }
export interface AuditReport { from: string; to: string; ledgerBalanced: boolean; findings: { category: string; count: number; detail: string }[]; readyToClose: boolean }
export interface ScheduledReport {
  id: string; reportType: "weekly_summary" | "monthly_pl" | "monthly_vat"; frequency: "weekly" | "monthly"; recipientEmail: string;
  status: "pending_first_approval" | "awaiting_approval" | "active" | "paused"; firstRunPreview: string | null; lastRunAt: string | null;
}
export interface BiToken { id: string; label: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
export type LineCategory = "guest_stay" | "maintenance" | "utilities" | "consumables" | "other";
export interface StatementProperty { id: string; title: string; listingType: string; currency: string; ownerContactId: string | null; ownerContact: { id: string; name: string; phone: string | null; email: string | null } | null }
export interface StatementLine { date: string; description: string; category: LineCategory; income: string; expense: string; source?: "booking" | "tracked_expense" | "ai_parsed" }
export interface Statement {
  id: string; month: string; status: "draft" | "approved" | "sent"; incomeTotal: number; expenseTotal: number; netProfit: number;
  managementFee: number; ownerShare: number; currency: string; shareToken?: string | null; property: { title: string };
}
export interface StatementDetail extends Statement { entries: { id: string; date: string; description: string; category: LineCategory; income: number; expense: number }[] }

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];
export const CURRENCIES = ["IRT", "IRR", "USD", "EUR", "GBP", "TRY"];

const IRANIAN = new Set(["IRT", "IRR"]);
/** Persian digits only for a Persian reader and an Iranian (or unknown) currency. */
export function amountLocale(lang: Locale, currency?: string | null) {
  if (lang === "fa" && (currency == null || IRANIAN.has(currency))) return "fa-IR";
  return lang === "de" ? "de-DE" : "en-US";
}
export const fmtNum = (lang: Locale, n: number, currency?: string | null) => Math.round(n).toLocaleString(amountLocale(lang, currency));
export const fmtDate = (lang: Locale, d: string | Date, currency?: string | null) => new Date(d).toLocaleDateString(amountLocale(lang, currency));
export const fmtMonth = (lang: Locale, d: string | Date, currency?: string | null) => new Date(d).toLocaleDateString(amountLocale(lang, currency), { year: "numeric", month: "long" });
/** The owner-statement amounts: digits follow the statement's currency only. */
export const fmtStatement = (n: number, currency?: string) => Math.round(n).toLocaleString(currency === "IRT" || currency === "IRR" ? "fa-IR" : "en-US");

/** A ledger account's name for a reader; the account's own (Persian) name when untranslated. */
export function accountName(account: { name: string; nameEn?: string | null; nameDe?: string | null; nameTr?: string | null }, lang: Locale) {
  if (lang === "en") return account.nameEn || account.name;
  if (lang === "de") return account.nameDe || account.nameEn || account.name;
  if (lang === "tr") return account.nameTr || account.nameEn || account.name;
  return account.name;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** Splits the finance assistant's "(account 5200)" citations out of its text, so each can link to that account's ledger. */
export function citationParts(text: string): (string | { word: string; digits: string; code: string })[] {
  const re = /(حساب|account)\s*([۰-۹\d]{3,5})/gi;
  const parts: (string | { word: string; digits: string; code: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push(text.slice(last, m.index));
    parts.push({ word: m[1], digits: m[2], code: m[2].replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))) });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

/** Reads a streamed (server-sent events) AI answer, calling onText for each piece. */
export async function readStream(res: Response, onText: (text: string) => void) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      const parsed = JSON.parse(payload) as { text?: string; error?: string };
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) onText(parsed.text);
    }
  }
}
