/** Only implemented accounting views can receive the live frame. */
export const ACCOUNTING_VIEWS = ["overview", "journal", "accounts", "ledger-setup", "expenses", "bank", "payroll", "budgets", "tax", "close-period", "owner-statements", "assistant", "automation"] as const;
export function accountingPath(path: string) {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return clean === "/accounting" || ACCOUNTING_VIEWS.some(v => clean === `/accounting/${v}`) || /^\/accounting\/accounts\/[^/]+$/.test(clean);
}
