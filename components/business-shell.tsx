"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { ModuleSpec, ViewSpec, moduleViewHref } from "@/lib/upstream/registry";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";
import { useLocalState } from "@/lib/use-local-state";
import { FinanceState, initialFinance, journalTotals } from "@/lib/finance";
const crmGroups = [
  [
    "فروش و ارتباطات",
    "Sales & relationships",
    ["board", "contacts", "calendar", "analytics", "performance"],
  ],
  [
    "عملیات تجاری",
    "Commercial operations",
    ["products", "invoices", "contracts", "projects"],
  ],
  [
    "املاک و دارایی‌ها",
    "Properties & assets",
    ["properties", "owners", "viewings", "matches"],
  ],
  ["هوشمندی و اتوماسیون", "Intelligence & automation", ["agent", "automation"]],
] as const;
const financeGroups = [
  [
    "دفتر و اسناد",
    "Books & journals",
    ["overview", "journal", "accounts", "ledger-setup"],
  ],
  [
    "دریافت و پرداخت",
    "Cash & payments",
    ["expenses", "bank", "payroll", "owner-statements"],
  ],
  [
    "کنترل و گزارش",
    "Control & reporting",
    ["budgets", "tax", "close-period", "automation"],
  ],
  ["همکار هوشمند", "Intelligent assistant", ["assistant"]],
] as const;
const icons: Record<string, string> = {
  board: "Layers",
  contacts: "Users",
  calendar: "CalendarDays",
  analytics: "ChartNoAxesCombined",
  performance: "TrendingUp",
  products: "Package",
  invoices: "Receipt",
  contracts: "FileText",
  projects: "FolderOpen",
  properties: "Building2",
  owners: "UserRound",
  viewings: "CalendarDays",
  matches: "Search",
  agent: "Sparkles",
  automation: "Workflow",
  overview: "LayoutDashboard",
  journal: "BookOpen",
  accounts: "ListChecks",
  "ledger-setup": "SlidersHorizontal",
  expenses: "Wallet",
  bank: "Landmark",
  payroll: "Users",
  "owner-statements": "Receipt",
  budgets: "ChartNoAxesCombined",
  tax: "Percent",
  "close-period": "LockKeyhole",
  assistant: "Sparkles",
};
type Deal = {
  id: string;
  title: string;
  value: number;
  probability: number;
  status: string;
  expectedCloseDate: string;
};
type Task = { id: string; title: string; dueDate: string; done: boolean };
export function BusinessShell({
  module,
  view,
  children,
}: {
  module: ModuleSpec;
  view: ViewSpec;
  children: React.ReactNode;
}) {
  const { fa, n, price } = useApp();
  const crm = module.id === "crm";
  const [copilot, setCopilot] = useState(false);
  const [menu, setMenu] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [deals] = useLocalState<Deal[]>("aifekr-domain:CrmDeal", []);
  const [tasks] = useLocalState<Task[]>("aifekr-crm-tasks", []);
  const [finance] = useLocalState<FinanceState>(
    "aifekr-finance-v2",
    initialFinance,
  );
  const openDeals = deals.filter(
    (d) => !["completed", "lost"].includes(d.status),
  );
  const won = deals
    .filter((d) => d.status === "completed")
    .reduce((s, d) => s + Number(d.value), 0);
  const overdue = tasks.filter(
    (t) => !t.done && new Date(t.dueDate) < new Date(),
  );
  const unmatched = finance.bank.filter((b) => !b.match);
  const pending = finance.expenses.filter((e) => e.status === "pending");
  const groups = crm ? crmGroups : financeGroups;
  useEffect(() => {
    setMenu(false);
    setAnswer("");
  }, [view.id]);
  const insights = crm
    ? [
        {
          title: fa ? "فرصت‌های باز" : "Open opportunities",
          value: n(openDeals.length),
          body: fa
            ? `${price(openDeals.reduce((s, d) => s + Number(d.value), 0))} در قیف فروش قرار دارد.`
            : `${price(openDeals.reduce((s, d) => s + Number(d.value), 0))} remains in your pipeline.`,
          tab: "board",
          icon: "TrendingUp",
        },
        {
          title: fa ? "پیگیری‌های عقب‌افتاده" : "Overdue follow-ups",
          value: n(overdue.length),
          body: overdue.length
            ? fa
              ? "برای حفظ ارتباط، پیگیری‌های امروز را اولویت‌بندی کن."
              : "Prioritize outstanding follow-ups to keep relationships moving."
            : fa
              ? "پیگیری عقب‌افتاده‌ای در داده‌های ثبت‌شده نیست."
              : "No overdue follow-ups in your recorded data.",
          tab: "calendar",
          icon: "CalendarDays",
        },
        {
          title: fa ? "پیش‌بینی وزنی فروش" : "Weighted sales forecast",
          value: price(
            openDeals.reduce(
              (s, d) => s + (d.value * (d.probability || 0)) / 100,
              0,
            ),
          ),
          body: fa
            ? "بر اساس ارزش و احتمال ثبت‌شدهٔ هر فرصت؛ نه پیش‌بینی مدل."
            : "Calculated from recorded opportunity values and probabilities.",
          tab: "analytics",
          icon: "ChartNoAxesCombined",
        },
      ]
    : [
        {
          title: fa ? "تراکنش‌های تطبیق‌نشده" : "Unmatched bank entries",
          value: n(unmatched.length),
          body: fa
            ? "پیش از بستن دوره، ارتباط تراکنش‌های بانکی و اسناد دفتر را بررسی کن."
            : "Review bank-to-journal matches before closing the period.",
          tab: "bank",
          icon: "Landmark",
        },
        {
          title: fa ? "هزینه‌های منتظر تأیید" : "Expenses awaiting approval",
          value: n(pending.length),
          body: price(pending.reduce((s, e) => s + e.amount, 0)),
          tab: "expenses",
          icon: "Receipt",
        },
        {
          title: fa ? "دوره‌های قفل‌شده" : "Locked fiscal periods",
          value: n(finance.closedPeriods.length),
          body: fa
            ? "ثبت سند در دوره‌های بسته محدود شده است."
            : "Posting is restricted in closed periods.",
          tab: "close-period",
          icon: "LockKeyhole",
        },
      ];
  function analyze() {
    setAnswer(
      crm
        ? fa
          ? `از داده‌های ثبت‌شده: ${n(openDeals.length)} فرصت باز، ${price(won)} فروش قطعی و ${n(overdue.length)} پیگیری عقب‌افتاده داری. ${overdue.length ? "ابتدا پیگیری‌های عقب‌افتاده را مرور کن." : "قدم بعدی، بازبینی تاریخ و احتمال فرصت‌های باز است."}`
          : `Your recorded data contains ${openDeals.length} open opportunities, ${price(won)} won revenue and ${overdue.length} overdue follow-ups. Review follow-ups and expected close dates next.`
        : fa
          ? `در دفتر محلی ${n(finance.journals.length)} سند ثبت شده، ${n(unmatched.length)} تراکنش بانکی تطبیق نشده و ${n(pending.length)} هزینه در انتظار تأیید است. پیش از بستن دوره، موارد باز را بررسی کن.`
          : `Your local books contain ${finance.journals.length} journals, ${unmatched.length} unmatched bank entries and ${pending.length} expenses awaiting approval. Review these before closing a period.`,
    );
  }
  return (
    <div className={`business-suite ${crm ? "crm-suite" : "accounting-suite"}`}>
      <aside className={`suite-sidebar ${menu ? "is-open" : ""}`}>
        <div className="suite-identity">
          <span className="suite-mark">
            <Icon name={crm ? "Users" : "BookOpen"} size={24} />
          </span>
          <div>
            <strong>
              {crm ? "AIFekr CRM" : fa ? "دفتر مالی ای آی فکر" : "AIFekr BOOKS"}
            </strong>
            <small>{fa ? "فضای کسب‌وکار من" : "My business workspace"}</small>
          </div>
          <Button
            label={fa ? "بستن منوی ماژول" : "Close module menu"}
            className="suite-close"
            onClick={() => setMenu(false)}
          >
            ×
          </Button>
        </div>
        <div className="suite-workspace">
          <span className="suite-workspace-avatar">N</span>
          <div>
            <strong>{fa ? "فضای کاری من" : "My workspace"}</strong>
            <small>{fa ? "نسخه نمایشی محلی" : "Local preview"}</small>
          </div>
          <Icon name="ChevronDown" size={15} />
        </div>
        <nav
          aria-label={
            fa ? "ناوبری تخصصی ماژول" : "Specialist module navigation"
          }
        >
          {groups.map(([a, b, ids]) => (
            <section key={b}>
              <span className="suite-nav-label">{fa ? a : b}</span>
              {ids.map((id) => {
                const v = module.views.find((v) => v.id === id);
                if (!v) return null;
                return (
                  <Link
                    key={id}
                    href={moduleViewHref(module, v)}
                    className={view.id === id ? "selected" : ""}
                    aria-current={view.id === id ? "page" : undefined}
                  >
                    <Icon name={icons[id] || module.icon} size={17} />
                    <span>{v.title[fa ? 0 : 1]}</span>
                    {id === (crm ? "calendar" : "bank") && (
                      <small>
                        {n(crm ? overdue.length : unmatched.length)}
                      </small>
                    )}
                    {["agent", "assistant"].includes(id) && (
                      <small className="suite-ai-label">AI</small>
                    )}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <button
          className="suite-copilot-launch"
          onClick={() => setCopilot(true)}
        >
          <Icon name="Sparkles" size={22} />
          <div>
            <strong>
              {fa ? "همکار هوشمند تو" : "Your intelligent copilot"}
            </strong>
            <small>
              {fa ? "بینش از اطلاعات همین فضا" : "Insights from this workspace"}
            </small>
          </div>
          <Icon name="ArrowUpLeft" size={16} />
        </button>
      </aside>
      <div className="suite-main">
        <header className="suite-topbar">
          <div>
            <button
              className="suite-menu-button icon-btn"
              aria-label={fa ? "منوی ماژول" : "Module menu"}
              onClick={() => setMenu(!menu)}
            >
              <Icon name="Menu" size={20} />
            </button>
            <span className="suite-breadcrumb">
              {crm ? "CRM" : fa ? "حسابداری" : "Accounting"} <span>/</span>{" "}
              {view.title[fa ? 0 : 1]}
            </span>
          </div>
          <div>
            <span className="suite-live">
              <i />
              {fa ? "اطلاعات محلی" : "Local data"}
            </span>
            <button
              className={"suite-ai-button " + (copilot ? "selected" : "")}
              onClick={() => setCopilot(!copilot)}
            >
              <Icon name="Sparkles" size={16} />
              {fa ? "همکار هوشمند" : "AI copilot"}
            </button>
          </div>
        </header>
        <div className="suite-page-heading">
          <div>
            <span className="eyebrow">
              {crm ? "RELATIONSHIP INTELLIGENCE" : "FINANCIAL INTELLIGENCE"}
            </span>
            <h1>{view.title[fa ? 0 : 1]}</h1>
            <p>
              {crm
                ? fa
                  ? "هر ارتباط، یک قدم نزدیک‌تر به رشد."
                  : "Every relationship, a step toward growth."
                : fa
                  ? "تصویر روشن کسب‌وکار، از دل هر ثبت مالی."
                  : "A clear business picture, built from every entry."}
            </p>
          </div>
          <span className="suite-heading-symbol" aria-hidden="true">
            <Icon name={icons[view.id] || module.icon} size={35} />
          </span>
        </div>
        <div className="suite-intelligence-strip">
          <span>
            <Icon name="Sparkles" size={17} />
            <strong>{fa ? "نبض فضای کاری" : "Workspace pulse"}</strong>
          </span>
          <p>
            {crm
              ? fa
                ? `${n(openDeals.length)} فرصت باز · ${n(overdue.length)} پیگیری نیازمند توجه`
                : `${openDeals.length} open opportunities · ${overdue.length} follow-ups need attention`
              : fa
                ? `${n(unmatched.length)} تطبیق بانکی باز · ${n(pending.length)} هزینه منتظر تأیید`
                : `${unmatched.length} unmatched bank entries · ${pending.length} expenses awaiting approval`}
          </p>
          <button
            onClick={() => {
              setCopilot(true);
              analyze();
            }}
          >
            {fa ? "بررسی وضعیت" : "Review status"}{" "}
            <Icon name="ArrowLeft" size={15} />
          </button>
        </div>
        <div className="suite-work-area">
          <div className="suite-content" key={view.id}>
            {children}
          </div>
          {copilot && (
            <aside className="suite-copilot">
              <header>
                <span className="suite-ai-orb">
                  <Icon name="Sparkles" size={24} />
                </span>
                <div>
                  <strong>{crm ? "CRM COPILOT" : "FINANCE COPILOT"}</strong>
                  <small>
                    {fa
                      ? "همراه تصمیم‌های روزانه"
                      : "Your daily decision companion"}
                  </small>
                </div>
                <button
                  className="icon-btn"
                  aria-label={fa ? "بستن همکار" : "Close copilot"}
                  onClick={() => setCopilot(false)}
                >
                  ×
                </button>
              </header>
              <p className="suite-copilot-intro">
                {fa
                  ? "چه چیزی در فضای کاری تو نیاز به توجه دارد؟"
                  : "What needs your attention in this workspace?"}
              </p>
              {insights.map((insight) => (
                <Link
                  className="suite-insight"
                  href={module.base + "?tab=" + insight.tab}
                  key={insight.tab}
                >
                  <div>
                    <Icon name={insight.icon} size={16} />
                    <span>{insight.title}</span>
                  </div>
                  <strong>{insight.value}</strong>
                  <p>{insight.body}</p>
                  <small>{fa ? "بررسی جزئیات" : "Review details"} ↗</small>
                </Link>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  analyze();
                }}
              >
                <label>
                  {fa
                    ? "خلاصه وضعیت و قدم بعدی"
                    : "Status summary and next step"}
                  <textarea
                    rows={3}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={
                      fa
                        ? "چه مواردی را اول بررسی کنم؟"
                        : "What should I review first?"
                    }
                  />
                </label>
                <Button type="submit" variant="primary">
                  <Icon name="Sparkles" size={15} />
                  {fa ? "خلاصه داده‌های من" : "Summarize my data"}
                </Button>
              </form>
              {answer && (
                <div className="suite-answer" role="status">
                  {answer}
                </div>
              )}
              <p className="suite-ai-disclosure">
                {fa
                  ? "بینش‌ها از داده‌های ثبت‌شده و قواعد محلی محاسبه می‌شوند. مدل هوش مصنوعی زنده متصل نیست."
                  : "Insights are calculated from recorded data using local rules. A live AI model is not connected."}
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
