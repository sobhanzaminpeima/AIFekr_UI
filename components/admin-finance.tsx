"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocalState } from "@/lib/use-local-state";
import { contacts } from "@/mocks/catalog";
import { defaultPlans, Plan, Purchase } from "@/lib/billing";
import { modules } from "@/lib/upstream/registry";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
import { useShell } from "./live-shell-context";
import { LiveAdminPayments } from "./live-admin-payments";
import { LiveAdminCustomers } from "./live-admin-customers";
import { LiveCreditTiers, LiveExchangeRates } from "./live-admin-pricing";

type Payment = Purchase & { userId?: string; currency?: string };
const exportJson = (name: string, data: unknown) =>
  download(name + ".json", JSON.stringify(data, null, 2), "application/json");

export function AdminFinance({ section }: { section: string }) {
  const live = !!useShell();
  if (live && (section === "payments" || section === "revenue")) return <LiveAdminPayments />;
  if (live && section === "tiers") return <LiveCreditTiers />;
  if (live && section === "rates") return <LiveExchangeRates />;
  if (live && (section === "customers" || section === "subscriptions")) return <LiveAdminCustomers subscriptions={section === "subscriptions"} />;
  return <PreviewAdminFinance section={section} />;
}
function PreviewAdminFinance({ section }: { section: string }) {
  const { fa, t, n, price } = useApp();
  const path = usePathname();
  const [payments] = useLocalState<Payment[]>("aifekr-billing-purchases", []);
  const [users] = useLocalState("aifekr-admin-users", contacts);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const visible = payments.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (!from || p.date.slice(0, 10) >= from) &&
      (!to || p.date.slice(0, 10) <= to) &&
      (p.id + " " + p.plan + " " + (p.userId || ""))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const paid = visible.filter((p) => p.status === "paid");
  const currency = (p: Payment) => p.currency || "IRT";
  const currencies = [...new Set(paid.map(currency))];
  const totals = currencies.map((code) => ({
    code,
    amount: paid
      .filter((p) => currency(p) === code)
      .reduce((s, p) => s + p.amount, 0),
  }));
  const money = (amount: number, code: string) =>
    code === "IRT" ? price(amount) : `${n(amount)} ${code}`;
  const filters = (
    <div className="admin-finance-filters">
      <label>
        {fa ? "جست‌وجوی رسید" : "Search receipts"}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fa ? "شناسه، طرح یا کاربر" : "ID, plan or user"}
        />
      </label>
      <label>
        {fa ? "وضعیت پرداخت" : "Payment status"}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{fa ? "همه" : "All"}</option>
          <option value="paid">{fa ? "موفق" : "Paid"}</option>
          <option value="failed">{fa ? "ناموفق" : "Failed"}</option>
        </select>
      </label>
      <label>
        {fa ? "از تاریخ" : "From date"}
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        {fa ? "تا تاریخ" : "To date"}
        <input
          type="date"
          min={from || undefined}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <Button onClick={() => exportJson("filtered-payments", visible)}>
        {fa ? "دریافت خروجی" : "Download export"}
      </Button>
    </div>
  );
  if (section === "invoice") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    const payment = payments.find((p) => p.id === id);
    if (!payment)
      return (
        <section className="panel admin-invoice">
          <Icon name="FileSearch" size={42} />
          <h2>{fa ? "رسید این شناسه پیدا نشد" : "Receipt not found"}</h2>
          <p>
            {fa
              ? "برای این شناسه خریدی در داده‌های محلی ثبت نشده است."
              : "No local purchase matches this ID."}
          </p>
          <Link className="btn" href="/admin/financial">
            {fa ? "بازگشت به خریدها" : "Back to purchases"}
          </Link>
        </section>
      );
    const buyer = users.find((u) => u.id === payment.userId);
    return (
      <section className="panel admin-invoice">
        <div className="row-between">
          <div>
            <span className="eyebrow">AIFekr / LOCAL RECEIPT</span>
            <h2>{fa ? "رسید خرید محلی" : "Local purchase receipt"}</h2>
            <code>{payment.id}</code>
          </div>
          <span
            className={"badge " + (payment.status === "paid" ? "green" : "red")}
          >
            {payment.status === "paid"
              ? fa
                ? "موفق"
                : "Paid"
              : fa
                ? "ناموفق"
                : "Failed"}
          </span>
        </div>
        <div className="admin-invoice-parties">
          <div>
            <small>{fa ? "خریدار مرتبط" : "Linked buyer"}</small>
            {buyer ? (
              <Link href={"/admin/users/" + buyer.id}>{buyer.name}</Link>
            ) : (
              <p>
                {fa
                  ? "خریدار به این رسید مرتبط نشده"
                  : "No buyer linked to this receipt"}
              </p>
            )}
          </div>
          <div>
            <small>{fa ? "تاریخ ثبت" : "Recorded date"}</small>
            <p dir="ltr">{payment.date.slice(0, 16).replace("T", " ")}</p>
          </div>
        </div>
        <dl className="domain-detail">
          {[
            [fa ? "طرح" : "Plan", payment.plan],
            [fa ? "دوره (ماه)" : "Period (months)", n(payment.period)],
            [fa ? "اعتبار" : "Credits", n(payment.credits)],
            [
              fa ? "مبلغ ثبت‌شده" : "Recorded amount",
              money(payment.amount, currency(payment)),
            ],
          ].map(([a, b]) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
        <p className="fine-print">
          {fa
            ? "این رسید پیش‌نمایش محلی است؛ سند مالیاتی یا تأیید درگاه بانکی نیست."
            : "This is a local preview receipt, not a tax invoice or bank confirmation."}
        </p>
        <div className="domain-actions">
          <Button onClick={() => exportJson("receipt-" + payment.id, payment)}>
            {t("download")}
          </Button>
          <Link className="btn" href="/admin/financial">
            {fa ? "همه خریدها" : "All purchases"}
          </Link>
        </div>
      </section>
    );
  }
  if (section === "customers" || section === "subscriptions")
    return <CustomerAccounts subscriptions={section === "subscriptions"} />;
  if (section === "rates") return <ExchangeRates />;
  if (section === "tiers") return <CreditTiers />;
  if (section === "revenue") {
    const months = [...new Set(paid.map((p) => p.date.slice(0, 7)))]
      .sort()
      .reverse();
    return (
      <>
        <div className="admin-finance-heading">
          <span className="icon-chip orange">
            <Icon name="ChartNoAxesCombined" size={28} />
          </span>
          <div>
            <h2>
              {fa
                ? "عملکرد فروش بر مبنای رسیدها"
                : "Sales from recorded receipts"}
            </h2>
            <p>
              {fa
                ? "فقط پرداخت‌های موفق در جمع فروش محاسبه می‌شوند. ارزها جدا هستند."
                : "Only paid receipts contribute to sales. Currencies remain separate."}
            </p>
          </div>
        </div>
        {filters}
        <div className="stats-grid">
          <div className="panel stat">
            <span>{fa ? "خرید موفق" : "Paid purchases"}</span>
            <strong>{n(paid.length)}</strong>
          </div>
          <div className="panel stat">
            <span>{fa ? "خرید ناموفق" : "Failed purchases"}</span>
            <strong>
              {n(visible.filter((p) => p.status === "failed").length)}
            </strong>
          </div>
          {totals.map((total) => (
            <div key={total.code} className="panel stat">
              <span>
                {fa ? "فروش ثبت‌شده" : "Recorded sales"} · {total.code}
              </span>
              <strong>{money(total.amount, total.code)}</strong>
            </div>
          ))}
        </div>
        <section className="panel">
          <h3>
            {fa ? "روند ماهانه به تفکیک ارز" : "Monthly sales by currency"}
          </h3>
          {months.length ? (
            months.map((month) => (
              <article className="admin-sales-month" key={month}>
                <strong dir="ltr">{month}</strong>
                {currencies.map((code) => {
                  const total = paid
                    .filter(
                      (p) => p.date.startsWith(month) && currency(p) === code,
                    )
                    .reduce((s, p) => s + p.amount, 0);
                  const max = Math.max(
                    1,
                    ...months.map((m) =>
                      paid
                        .filter(
                          (p) => p.date.startsWith(m) && currency(p) === code,
                        )
                        .reduce((s, p) => s + p.amount, 0),
                    ),
                  );
                  return (
                    <div key={code}>
                      <span>{money(total, code)}</span>
                      <progress
                        aria-label={month + " " + code}
                        max={max}
                        value={total}
                      />
                    </div>
                  );
                })}
              </article>
            ))
          ) : (
            <Empty />
          )}
        </section>
      </>
    );
  }
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange">
          <Icon name="Receipt" size={28} />
        </span>
        <div>
          <h2>{fa ? "دفتر خریدها و رسیدها" : "Purchase & receipt register"}</h2>
          <p>
            {fa
              ? "رسید هر خرید را با شناسه خودش باز کن؛ سوابق این محیط محلی هستند."
              : "Open each purchase by its own ID. Records belong to this local preview."}
          </p>
        </div>
      </div>
      {filters}
      <section className="panel">
        {visible.length ? (
          <div className="table-scroll">
            <table className="admin-finance-table">
              <thead>
                <tr>
                  {(fa
                    ? ["رسید و تاریخ", "خریدار", "طرح", "مبلغ", "وضعیت"]
                    : ["Receipt & date", "Buyer", "Plan", "Amount", "Status"]
                  ).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={
                          "/admin/financial/invoices/" +
                          encodeURIComponent(p.id)
                        }
                      >
                        {p.id}
                      </Link>
                      <small>{p.date.slice(0, 10)}</small>
                    </td>
                    <td>
                      {users.find((u) => u.id === p.userId)?.name ||
                        (fa ? "ارتباط ثبت نشده" : "Unlinked")}
                    </td>
                    <td>{p.plan}</td>
                    <td>{money(p.amount, currency(p))}</td>
                    <td>
                      <span
                        className={
                          "badge " + (p.status === "paid" ? "green" : "red")
                        }
                      >
                        {p.status === "paid"
                          ? fa
                            ? "موفق"
                            : "Paid"
                          : fa
                            ? "ناموفق"
                            : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}

function CustomerAccounts({ subscriptions }: { subscriptions: boolean }) {
  const { fa, n, t } = useApp();
  const [users] = useLocalState("aifekr-admin-users", contacts);
  const [plans] = useLocalState<Plan[]>("aifekr-billing-plans", defaultPlans);
  const [payments] = useLocalState<Payment[]>("aifekr-billing-purchases", []);
  const [profiles, setProfiles] = useState<
    Record<
      string,
      { plan?: string; expiry?: string; blocked?: boolean; credits?: number }
    >
  >({});
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    const read = () => {
      const result: typeof profiles = {};
      for (const user of users) {
        try {
          result[user.id] = JSON.parse(
            localStorage.getItem("aifekr-admin-user:" + user.id) || "{}",
          );
        } catch {}
      }
      setProfiles(result);
    };
    read();
    window.addEventListener("aifekr-local-update", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("aifekr-local-update", read);
      window.removeEventListener("storage", read);
    };
  }, [users]);
  const today = new Date().toISOString().slice(0, 10);
  const state = (id: string) => {
    const p = profiles[id];
    return p?.blocked
      ? "blocked"
      : p?.expiry && p.expiry < today
        ? "expired"
        : p?.plan && p.plan !== "free" && p.plan !== "starter"
          ? "subscribed"
          : "free";
  };
  const labels: Record<string, string> = fa
    ? {
        all: "همه",
        blocked: "مسدود",
        expired: "منقضی",
        subscribed: "دارای اشتراک",
        free: "رایگان",
      }
    : {
        all: "All",
        blocked: "Blocked",
        expired: "Expired",
        subscribed: "Subscribed",
        free: "Free",
      };
  const visible = users.filter(
    (u) =>
      (u.name + " " + u.email + " " + u.id)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || state(u.id) === filter),
  );
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange">
          <Icon name={subscriptions ? "BadgeCheck" : "Users"} size={28} />
        </span>
        <div>
          <h2>
            {subscriptions
              ? fa
                ? "وضعیت اشتراک حساب‌ها"
                : "Account subscriptions"
              : fa
                ? "حساب مشتری و خریدهای مرتبط"
                : "Customer accounts & linked purchases"}
          </h2>
          <p>
            {fa
              ? "ویرایش دسترسی از پروندهٔ همان کاربر انجام می‌شود. خرید بدون شناسهٔ کاربر به کسی نسبت داده نمی‌شود."
              : "Edit access in the matching user profile. Unlinked purchases are not assigned to a customer."}
          </p>
        </div>
      </div>
      <div className="domain-toolbar">
        <label>
          {fa ? "جست‌وجوی مشتری" : "Search customers"}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {fa ? "وضعیت حساب" : "Account status"}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {Object.entries(labels).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() =>
            exportJson(
              "customer-accounts",
              visible.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                ...profiles[u.id],
              })),
            )
          }
        >
          {fa ? "دریافت خروجی" : "Download export"}
        </Button>
      </div>
      <div className="tool-grid">
        {visible.map((user) => {
          const profile = profiles[user.id];
          const linked = payments.filter((p) => p.userId === user.id);
          const plan = plans.find((p) => p.id === profile?.plan);
          return (
            <article className="panel admin-customer-card" key={user.id}>
              <div className="row-between">
                <span className="icon-chip orange">
                  <Icon name="User" />
                </span>
                <span className="badge">{labels[state(user.id)]}</span>
              </div>
              <h3>
                <Link href={"/admin/users/" + user.id}>{user.name}</Link>
              </h3>
              <p dir="ltr">{user.email}</p>
              <dl className="domain-detail">
                <div>
                  <dt>{fa ? "طرح" : "Plan"}</dt>
                  <dd>
                    {plan ? (fa ? plan.fa : plan.en) : profile?.plan || "free"}
                  </dd>
                </div>
                <div>
                  <dt>{fa ? "انقضا" : "Expiry"}</dt>
                  <dd>{profile?.expiry || "—"}</dd>
                </div>
                <div>
                  <dt>{fa ? "اعتبار پرونده" : "Profile credits"}</dt>
                  <dd>{n(profile?.credits || 0)}</dd>
                </div>
                <div>
                  <dt>{fa ? "خریدهای مرتبط" : "Linked purchases"}</dt>
                  <dd>{n(linked.length)}</dd>
                </div>
              </dl>
              <Link className="btn" href={"/admin/users/" + user.id}>
                {fa
                  ? "مدیریت پرونده و اشتراک"
                  : "Manage profile & subscription"}
              </Link>
            </article>
          );
        })}
      </div>
      {!visible.length && <Empty />}
    </>
  );
}

type Rate = {
  id: string;
  from: string;
  to: string;
  value: number;
  date: string;
};
function ExchangeRates() {
  const { fa, t, n } = useApp();
  const [rates, save] = useLocalState<Rate[]>("aifekr-billing-rates-v2", []);
  const [draft, setDraft] = useState<Rate | null>(null),
    [amount, setAmount] = useState(1),
    [selected, setSelected] = useState("");
  const active = rates.find((r) => r.id === selected) || rates[0];
  return (
    <div className="admin-rate-layout">
      <section className="panel">
        <div className="row-between">
          <h2>{fa ? "نرخ‌های تبدیل دستی" : "Manual exchange rates"}</h2>
          <Button
            variant="primary"
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                from: "USD",
                to: "IRT",
                value: 1,
                date: new Date().toISOString().slice(0, 10),
              })
            }
          >
            {fa ? "ثبت نرخ" : "Add rate"}
          </Button>
        </div>
        <p>
          {fa
            ? "نرخ‌ها ورودی دستی هستند و به پرداخت یا قیمت‌گذاری متصل نیستند."
            : "Rates are manual inputs and do not change payments or product pricing."}
        </p>
        {rates.map((r) => (
          <article className="domain-card" key={r.id}>
            <div className="row-between">
              <strong dir="ltr">
                1 {r.from} = {n(r.value)} {r.to}
              </strong>
              <Button onClick={() => setDraft(r)}>
                {fa ? "ویرایش" : "Edit"}
              </Button>
            </div>
            <small>{r.date}</small>
          </article>
        ))}
        {!rates.length && <Empty />}
      </section>
      <section className="panel">
        <h3>{fa ? "محاسبهٔ نمونهٔ تبدیل" : "Conversion preview"}</h3>
        <label>
          {fa ? "جفت ارز" : "Currency pair"}
          <select
            value={active?.id || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {rates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.from} → {r.to}
              </option>
            ))}
          </select>
        </label>
        <label>
          {fa ? "مبلغ مبدا" : "Source amount"}
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <output className="admin-calculator-output">
          {active ? `${n(amount * active.value)} ${active.to}` : "—"}
        </output>
      </section>
      {draft && (
        <Modal
          title={fa ? "نرخ تبدیل دستی" : "Manual exchange rate"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = {
                ...draft,
                from: draft.from.toUpperCase(),
                to: draft.to.toUpperCase(),
              };
              if (
                next.from === next.to ||
                !Number.isFinite(next.value) ||
                next.value <= 0
              ) {
                toast.error(
                  fa
                    ? "جفت ارز و نرخ را بررسی کن."
                    : "Check the currency pair and rate.",
                );
                return;
              }
              if (
                rates.some(
                  (r) =>
                    r.id !== next.id &&
                    r.from === next.from &&
                    r.to === next.to,
                )
              ) {
                toast.error(
                  fa
                    ? "این جفت ارز قبلاً ثبت شده است."
                    : "This currency pair already exists.",
                );
                return;
              }
              save(
                rates.some((r) => r.id === next.id)
                  ? rates.map((r) => (r.id === next.id ? next : r))
                  : [...rates, next],
              );
              setDraft(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "ارز مبدا" : "Source currency"}
                <input
                  required
                  pattern="[A-Za-z]{3}"
                  maxLength={3}
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label>
                {fa ? "ارز مقصد" : "Target currency"}
                <input
                  required
                  pattern="[A-Za-z]{3}"
                  maxLength={3}
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
              </label>
              <label>
                {fa ? "نرخ تبدیل" : "Exchange rate"}
                <input
                  required
                  type="number"
                  min={0.000001}
                  step="any"
                  value={draft.value}
                  onChange={(e) =>
                    setDraft({ ...draft, value: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "تاریخ نرخ" : "Rate date"}
                <input
                  required
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </label>
            </div>
            <Button variant="primary" type="submit">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}

type Tier = {
  id: string;
  name: string;
  credits: number;
  amount: number;
  enabled: boolean;
};
function CreditTiers() {
  const { fa, t, n, price } = useApp();
  const [tiers, save] = useLocalState<Tier[]>("aifekr-credit-tiers-v2", []);
  const [draft, setDraft] = useState<Tier | null>(null);
  return (
    <>
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              credits: 100,
              amount: 0,
              enabled: false,
            })
          }
        >
          {fa ? "بستهٔ اعتبار تازه" : "New credit tier"}
        </Button>
      </div>
      <p>
        {fa
          ? "بسته‌ها به‌صورت پیکربندی محلی ذخیره می‌شوند و هنوز به خرید متصل نیستند."
          : "Tiers are local configuration and are not connected to checkout."}
      </p>
      <div className="tool-grid">
        {tiers.map((tier) => (
          <article className="panel admin-credit-tier" key={tier.id}>
            <Icon name="Sparkles" size={30} />
            <h3>{tier.name}</h3>
            <strong>
              {n(tier.credits)} {t("credits")}
            </strong>
            <p>{price(tier.amount)}</p>
            <small>
              {fa ? "هزینهٔ هر اعتبار" : "Cost per credit"}:{" "}
              {price(tier.amount / tier.credits)}
            </small>
            <label>
              {fa ? "فعال در پیکربندی" : "Enabled in configuration"}
              <input
                type="checkbox"
                checked={tier.enabled}
                onChange={(e) =>
                  save(
                    tiers.map((x) =>
                      x.id === tier.id
                        ? { ...x, enabled: e.target.checked }
                        : x,
                    ),
                  )
                }
              />
            </label>
            <Button onClick={() => setDraft(tier)}>
              {fa ? "ویرایش بسته" : "Edit tier"}
            </Button>
          </article>
        ))}
      </div>
      {!tiers.length && <Empty />}
      {draft && (
        <Modal
          title={fa ? "بستهٔ اعتبار" : "Credit tier"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                tiers.some(
                  (x) =>
                    x.id !== draft.id &&
                    x.name.trim().toLowerCase() ===
                      draft.name.trim().toLowerCase(),
                )
              ) {
                toast.error(
                  fa ? "نام بسته تکراری است." : "Tier name already exists.",
                );
                return;
              }
              save(
                tiers.some((x) => x.id === draft.id)
                  ? tiers.map((x) =>
                      x.id === draft.id
                        ? { ...draft, name: draft.name.trim() }
                        : x,
                    )
                  : [...tiers, { ...draft, name: draft.name.trim() }],
              );
              setDraft(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "نام بسته" : "Tier name"}
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                {fa ? "تعداد اعتبار" : "Credit count"}
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={draft.credits}
                  onChange={(e) =>
                    setDraft({ ...draft, credits: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "مبلغ به تومان" : "Price in IRT"}
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: Number(e.target.value) })
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
    </>
  );
}

type IndustryPack = {
  id: string;
  name: string;
  description: string;
  modules: string[];
  monthlyPrice: number;
  enabled: boolean;
};
export function AdminIndustryPacks() {
  const { fa, t, n, price } = useApp();
  const [packs, save] = useLocalState<IndustryPack[]>(
    "aifekr-industry-packs-v2",
    [],
  );
  const [draft, setDraft] = useState<IndustryPack | null>(null);
  return (
    <>
      <div className="domain-toolbar">
        <Button
          variant="primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              description: "",
              modules: [],
              monthlyPrice: 0,
              enabled: false,
            })
          }
        >
          {fa ? "بستهٔ صنعتی تازه" : "New industry pack"}
        </Button>
        <Button onClick={() => exportJson("industry-packs", packs)}>
          {fa ? "دریافت خروجی" : "Download export"}
        </Button>
      </div>
      <p>
        {fa
          ? "ترکیب ماژول و قیمت هر بسته در این محیط ذخیره می‌شود. اعمال دسترسی واقعی به اتصال سرور نیاز دارد."
          : "Configure module bundles and pricing locally. Enforcing access requires a server connection."}
      </p>
      <div className="tool-grid">
        {packs.map((pack) => (
          <article className="panel" key={pack.id}>
            <div className="row-between">
              <span className="icon-chip orange">
                <Icon name="Boxes" size={28} />
              </span>
              <span className="badge">
                {pack.enabled
                  ? fa
                    ? "فعال در پیکربندی"
                    : "Enabled"
                  : fa
                    ? "پیش‌نویس"
                    : "Draft"}
              </span>
            </div>
            <h3>{pack.name}</h3>
            <p>{pack.description}</p>
            <strong>
              {price(pack.monthlyPrice)} / {fa ? "ماه" : "month"}
            </strong>
            <p>
              {n(pack.modules.length)}{" "}
              {fa ? "ماژول در بسته" : "modules included"}
            </p>
            <div className="chips">
              {pack.modules.map((id) => (
                <span className="badge" key={id}>
                  {modules.find((m) => m.id === id)?.title[fa ? 0 : 1] || id}
                </span>
              ))}
            </div>
            <Button onClick={() => setDraft(pack)}>
              {fa ? "ویرایش ترکیب بسته" : "Edit bundle"}
            </Button>
          </article>
        ))}
      </div>
      {!packs.length && <Empty />}
      {draft && (
        <Modal
          title={fa ? "پیکربندی بستهٔ صنعتی" : "Industry pack configuration"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.name.trim() || !draft.modules.length) {
                toast.error(
                  fa
                    ? "نام و دست‌کم یک ماژول لازم است."
                    : "Provide a name and at least one module.",
                );
                return;
              }
              if (
                packs.some(
                  (p) =>
                    p.id !== draft.id &&
                    p.name.trim().toLowerCase() ===
                      draft.name.trim().toLowerCase(),
                )
              ) {
                toast.error(
                  fa ? "نام بسته تکراری است." : "Bundle name already exists.",
                );
                return;
              }
              const next = { ...draft, name: draft.name.trim() };
              save(
                packs.some((p) => p.id === draft.id)
                  ? packs.map((p) => (p.id === draft.id ? next : p))
                  : [...packs, next],
              );
              setDraft(null);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "نام بسته" : "Bundle name"}
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                {fa ? "توضیحات بسته" : "Bundle description"}
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "قیمت ماهانه به تومان" : "Monthly price in IRT"}
                <input
                  type="number"
                  min={0}
                  required
                  value={draft.monthlyPrice}
                  onChange={(e) =>
                    setDraft({ ...draft, monthlyPrice: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "فعال در پیکربندی" : "Enabled in configuration"}
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) =>
                    setDraft({ ...draft, enabled: e.target.checked })
                  }
                />
              </label>
            </div>
            <fieldset className="admin-pack-options">
              <legend>{fa ? "ماژول‌های بسته" : "Included modules"}</legend>
              {modules
                .filter((m) =>
                  ["business", "fit", "learn", "create"].includes(m.group),
                )
                .map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={draft.modules.includes(m.id)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          modules: e.target.checked
                            ? [...draft.modules, m.id]
                            : draft.modules.filter((id) => id !== m.id),
                        })
                      }
                    />
                    <Icon name={m.icon} size={18} />
                    {m.title[fa ? 0 : 1]}
                  </label>
                ))}
            </fieldset>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
