"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import {
  Button,
  copy,
  download,
  Icon,
  Modal,
  SectionTitle,
  SparkChart,
} from "./ui";
import { Preferences } from "./shell";
import { DataTable } from "./data-table";
import { toast } from "sonner";
import { save } from "@/lib/api/client";
import { useLocalState } from "@/lib/use-local-state";
import {
  defaultPlans,
  defaultPromotions,
  Plan,
  Promotion,
  Purchase,
  periodDiscount,
} from "@/lib/billing";
import { useSearchParams } from "next/navigation";
export function Plans() {
  const { fa, t, n, price } = useApp();
  const [period, setPeriod] = useState(1);
  const [planCatalog] = useLocalState<Plan[]>(
    "aifekr-billing-plans",
    defaultPlans,
  );
  return (
    <div className="plans-page">
      <div className="center-heading">
        <span className="eyebrow orange-text">
          {fa
            ? "یک سرمایه‌گذاری روی ایده‌های تو"
            : "A LITTLE INVESTMENT IN YOUR IDEAS"}
        </span>
        <h1>
          {fa
            ? "فضای بیشتر، برای فکرهای بزرگ‌تر."
            : "More room for your big ideas."}
        </h1>
        <p>
          {fa
            ? "ساده شروع کن؛ همراه ایده‌هایت رشد کن. قیمت‌ها نمونه و پرداخت آزمایشی است."
            : "Start simply. Grow as your ideas do. Sample prices; demo payments only."}
        </p>
        <div className="chips">
          {[
            [1, t("monthly")],
            [3, fa ? "۳ ماهه" : "Quarterly"],
            [6, fa ? "۶ ماهه" : "6 months"],
            [12, t("yearly")],
          ].map(([p, label]) => (
            <button
              className={period === p ? "selected" : ""}
              key={p}
              onClick={() => setPeriod(Number(p))}
            >
              {label}
              {p === 12 && <span className="green"> −۲۰٪</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="pricing-grid">
        {planCatalog.map(
          (plan, i) =>
            plan.enabled && (
              <article
                key={i}
                className={`panel plan-card ${i === 1 ? "recommended" : ""}`}
              >
                {i === 1 && (
                  <span className="recommended-tag">
                    {fa ? "پیشنهاد ای آی فکر" : "THE SWEET SPOT"}
                  </span>
                )}
                <span className={`icon-chip ${["blue", "orange", "amber"][i]}`}>
                  <Icon
                    name={["Feather", "Sparkles", "Building2"][i]}
                    size={27}
                  />
                </span>
                <h2>{fa ? plan.fa : plan.en}</h2>
                <p>
                  {fa
                    ? [
                        "برای اولین جرقه‌ها",
                        "برای ایده‌هایی که جدی می‌شوند",
                        "برای تیم‌های رو به رشد",
                      ][i]
                    : [
                        "For your first little sparks",
                        "For ideas worth taking further",
                        "For teams making a difference",
                      ][i]}
                </p>
                <strong className="plan-price">
                  {price(
                    Math.round(
                      plan.price *
                        period *
                        (period === 12
                          ? 0.8
                          : period === 6
                            ? 0.9
                            : period === 3
                              ? 0.95
                              : 1),
                    ),
                  )}
                </strong>
                <small>
                  {fa ? "برای دورهٔ انتخاب‌شده" : "per selected billing period"}
                </small>
                <Link
                  href={
                    i === 0
                      ? "/register"
                      : "/checkout/" + plan.id + "?period=" + period
                  }
                  className={`btn full ${i === 1 ? "primary" : ""}`}
                >
                  {i === 0 ? t("start") : fa ? "انتخاب این طرح" : "Choose plan"}
                  <Icon name="ArrowLeft" size={17} />
                </Link>
                <ul>
                  {[
                    `${n(plan.credits)} ${t("credits")}`,
                    fa ? "دسترسی به مدل‌های هوشمند" : "Smart model access",
                    fa ? "تاریخچه و فضای شخصی" : "Personal workspace & history",
                    fa
                      ? [
                          "ابزارهای پایه",
                          "تمام ابزارهای خلاقیت",
                          "تمام ابزارها و کار تیمی",
                        ][i]
                      : [
                          "Essential tools",
                          "All creative tools",
                          "All tools & team features",
                        ][i],
                  ].map((s) => (
                    <li key={s}>
                      <Icon name="Check" size={16} />
                      {s}
                    </li>
                  ))}
                </ul>
              </article>
            ),
        )}
      </div>
      <div className="panel compare-plans">
        <SectionTitle title={fa ? "در هر طرح چه خبر است؟" : "Find your fit"} />
        {[
          "Chat",
          "Image & video",
          "Voice & music",
          "Business tools",
          "Team members",
        ].map((s, i) => (
          <div key={s}>
            <span>
              {fa
                ? [
                    "گفتگو",
                    "تصویر و ویدیو",
                    "صدا و موسیقی",
                    "ابزارهای کسب‌وکار",
                    "اعضای تیم",
                  ][i]
                : s}
            </span>
            {[0, 1, 2].map((k) => (
              <span key={k}>{i < 2 || k > 0 ? "✓" : "—"}</span>
            ))}
          </div>
        ))}
      </div>
      <FAQ />
    </div>
  );
}
export function FAQ() {
  const { fa } = useApp();
  return (
    <section className="faq">
      <h2>
        {fa ? "شاید سؤال تو هم باشد" : "A few things you might be wondering"}
      </h2>
      {(fa
        ? [
            "اعتبار چطور مصرف می‌شود؟",
            "می‌توانم طرحم را تغییر بدهم؟",
            "داده‌هایم کجا نگهداری می‌شوند؟",
            "این نسخه به مدل واقعی متصل است؟",
          ]
        : [
            "How do credits work?",
            "Can I change my plan?",
            "Where is my data stored?",
            "Does this demo use live AI models?",
          ]
      ).map((q, i) => (
        <details key={q}>
          <summary>
            {q}
            <Icon name="Plus" size={17} />
          </summary>
          <p>
            {fa
              ? [
                  "هزینهٔ هر عملیات پیش از اجرا نمایش داده می‌شود. عملیات ناموفق اعتبار را برمی‌گرداند.",
                  "بله؛ از صفحهٔ طرح‌ها، طرح مناسب خودت را انتخاب کن. در این نسخه پرداخت واقعی انجام نمی‌شود.",
                  "این نسخهٔ نمایشی تنظیمات و خروجی‌ها را فقط در مرورگر خودت نگه می‌دارد.",
                  "خیر. گفتگو، ساخت محتوا، اتصال حساب‌ها و پرداخت‌ها همگی شبیه‌سازی هستند.",
                ][i]
              : [
                  "Every action shows its credit cost before you run it. Failed jobs refund their credits.",
                  "Yes. Choose another plan whenever you need it. This demo never charges real money.",
                  "This demo stores preferences and generated sample outputs in your browser only.",
                  "No. Chats, generation, connections and payments are simulated.",
                ][i]}
          </p>
        </details>
      ))}
    </section>
  );
}
export function Credits() {
  const { fa, t, n, credits, price } = useApp();
  return (
    <>
      <SectionTitle
        title={fa ? "کیف پول اعتبار" : "Your credit wallet"}
        subtitle={
          fa
            ? "شفاف، ساده، همیشه در اختیار تو."
            : "Simple, transparent, always in your hands."
        }
      />
      <div className="wallet-hero panel">
        <Icon name="Sparkles" size={37} />
        <p>{t("balance")}</p>
        <h1>
          {n(credits)} <small>{t("credits")}</small>
        </h1>
        <SparkChart />
      </div>
      <SectionTitle
        title={fa ? "به ایده‌هایت سوخت برسان" : "Fuel your next idea"}
      />
      <div className="credit-packs">
        {[500, 1500, 5000].map((v, i) => (
          <Link className="panel" href={"/checkout/credits-" + v} key={v}>
            <span className="icon-chip orange">
              <Icon name="Sparkles" />
            </span>
            <h2>
              {n(v)} {t("credits")}
            </h2>
            <p>{price([149000, 399000, 1190000][i])}</p>
            <span className="btn full">
              {t("topup")}
              <Icon name="Plus" size={17} />
            </span>
          </Link>
        ))}
      </div>
      <DataTable title={fa ? "تاریخچهٔ تراکنش‌ها" : "Transaction history"} />
    </>
  );
}
export function Checkout({ path }: { path: string }) {
  const { fa, t, price, topup } = useApp();
  const router = useRouter();
  const id = path.split("/").pop() || "pro";
  const [discount, setDiscount] = useState("");
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  const search = useSearchParams();
  const [plans] = useLocalState<Plan[]>("aifekr-billing-plans", defaultPlans);
  const [promotions] = useLocalState<Promotion[]>(
    "aifekr-billing-promotions",
    defaultPromotions,
  );
  const [purchases, savePurchases] = useLocalState<Purchase[]>(
    "aifekr-billing-purchases",
    [],
  );
  const requestedPeriod = Number(search.get("period") || 1);
  const period = [1, 3, 6, 12].includes(requestedPeriod) ? requestedPeriod : 1;
  const plan =
    plans.find((p) => p.id === id) ||
    plans.find((p) => p.id === "pro") ||
    defaultPlans[1];
  const creditQuantity = Number(id.split("-")[1]);
  const value = id.includes("credits-")
    ? [500, 1500, 5000].includes(creditQuantity)
      ? creditQuantity
      : 500
    : plan.credits * period;
  const amount = id.includes("credits-")
    ? value === 500
      ? 149000
      : value === 1500
        ? 399000
        : 1190000
    : Math.round(plan.price * period * periodDiscount(period));
  const promotion = promotions.find(
    (p) => p.active && p.code === discount.trim().toUpperCase(),
  );
  const total = Math.round(
    amount * (applied && promotion ? 1 - promotion.percent / 100 : 1),
  );
  if (id === "success" || id === "failure")
    return (
      <div className="checkout-result panel">
        <span className={`icon-chip ${id === "success" ? "lime" : "pink"}`}>
          <Icon name={id === "success" ? "Check" : "X"} size={36} />
        </span>
        <h1>
          {id === "success"
            ? fa
              ? "اعتبار تازه، ایده‌های تازه!"
              : "Fresh credits. Fresh possibilities."
            : fa
              ? "پرداخت آزمایشی انجام نشد"
              : "Demo payment failed"}
        </h1>
        <p>{t("mock")}</p>
        <Link
          href={id === "success" ? "/home" : "/checkout/pro"}
          className="btn primary"
        >
          {id === "success" ? t("home") : t("retry")}
        </Link>
      </div>
    );
  return (
    <div className="checkout panel">
      <span className="eyebrow">AIFekr CHECKOUT</span>
      <h1>{fa ? "یک قدم تا شروع" : "One step closer"}</h1>
      <p className="badge">{t("mock")}</p>
      <dl className="cost-summary">
        <dt>{fa ? "سفارش" : "Your order"}</dt>
        <dd>{id}</dd>
        <dt>{fa ? "قابل پرداخت" : "Total"}</dt>
        <dd className="checkout-total">{price(total)}</dd>
        <dt>{fa ? "اعتبار این خرید" : "Credits for this purchase"}</dt>
        <dd>{value}</dd>
      </dl>
      <label>
        {fa ? "کد تخفیف" : "Discount code"}
        <div className="inline-field">
          <input
            value={discount}
            aria-label={fa?'کد تخفیف':'Discount code'}
            onChange={(e) => {
              setDiscount(e.target.value);
              setApplied(false);
            }}
            placeholder="AIFekr10"
          />
          <Button
            onClick={() => {
              setApplied(!!promotion);
              toast.info(
                promotion
                  ? fa
                    ? `${promotion.percent}٪ تخفیف اعمال شد`
                    : `${promotion.percent}% discount applied`
                  : fa
                    ? "کد معتبر نیست؛ AIFekr10 را امتحان کن."
                    : "Try AIFekr10",
              );
            }}
          >
            {fa ? "اعمال" : "Apply"}
          </Button>
        </div>
      </label>
      <label>
        {fa ? "روش پرداخت" : "Payment method"}
        <select>
          <option>{fa ? "زرین‌پال (آزمایشی)" : "Zarinpal (simulated)"}</option>
          <option>
            {fa ? "کارت‌به‌کارت (آزمایشی)" : "Card transfer (simulated)"}
          </option>
          <option>{fa ? "رمزارز (آزمایشی)" : "Crypto (simulated)"}</option>
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={failure}
          onChange={(e) => setFailure(e.target.checked)}
        />
        {fa ? "شبیه‌سازی پرداخت ناموفق" : "Simulate a failed payment"}
      </label>
      <Button
        variant="primary full"
        disabled={busy || (!id.includes("credits-") && !plan.enabled)}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          await new Promise((r) => setTimeout(r, 900));
          if (!failure) topup(value);
          savePurchases([
            {
              id: crypto.randomUUID(),
              plan: id,
              amount: total,
              credits: failure ? 0 : value,
              period,
              date: new Date().toISOString(),
              status: failure ? "failed" : "paid",
            },
            ...purchases,
          ]);
          router.push("/checkout/" + (failure ? "failure" : "success"));
        }}
      >
        {busy ? t("loading") : t("pay")}
        <Icon name="LockKeyhole" size={16} />
      </Button>
      <p className="fine-print">
        {fa
          ? "هیچ مبلغی از حساب واقعی کسر نمی‌شود."
          : "No real payment will be collected."}
      </p>
    </div>
  );
}
export function Settings() {
  const { fa, t, theme, setTheme, failure, setFailure, locale } = useApp();
  const [tab, setTab] = useState("profile");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("سارا محمدی");
  const [email, setEmail] = useState("sara@example.com");
  const [dialog, setDialog] = useState(false);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  const tabs = fa
    ? [
        "پروفایل",
        "امنیت",
        "اعلان‌ها",
        "زبان و ظاهر",
        "حساب‌های متصل",
        "کلید API",
        "داده‌ها",
      ]
    : [
        "Profile",
        "Security",
        "Notifications",
        "Language & theme",
        "Connections",
        "API keys",
        "Your data",
      ];
  return (
    <>
      <SectionTitle title={t("settings")} subtitle={t("personal")} />
      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            "profile",
            "security",
            "notifications",
            "appearance",
            "connections",
            "api",
            "data",
          ].map((id, i) => (
            <button
              className={tab === id ? "selected" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {tabs[i]}
            </button>
          ))}
        </nav>
        <form
          className="panel settings-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await save({ name, email, locale, theme });
              setDirty(false);
              toast.success(t("success"));
            } catch {
              toast.error(t("error"));
            }
            setBusy(false);
          }}
        >
          <h2>
            {
              tabs[
                [
                  "profile",
                  "security",
                  "notifications",
                  "appearance",
                  "connections",
                  "api",
                  "data",
                ].indexOf(tab)
              ]
            }
          </h2>
          {tab === "profile" ? (
            <>
              <div className="profile-photo">
                <span className="avatar">س</span>
                <p>{fa ? "تصویر پروفایل" : "Profile picture"}</p>
                <input
                  type="file"
                  accept="image/*"
                  aria-label={t("profile")}
                  onChange={() => setDirty(true)}
                />
              </div>
              <label>
                {t("name")}
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setDirty(true);
                  }}
                  required
                />
              </label>
              <label>
                {t("email")}
                <input
                  value={email}
                  type="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setDirty(true);
                  }}
                  required
                />
              </label>
              <label>
                {fa ? "دربارهٔ من" : "About me"}
                <textarea rows={3} onChange={() => setDirty(true)} />
              </label>
            </>
          ) : tab === "appearance" ? (
            <>
              <Preferences />
              <div className="theme-options">
                {["dark", "light"].map((s) => (
                  <button
                    type="button"
                    className={theme === s ? "selected" : ""}
                    key={s}
                    onClick={() => {
                      setTheme(s);
                      setDirty(true);
                    }}
                  >
                    <Icon name={s === "dark" ? "Moon" : "Sun"} size={25} />
                    {t(s as "dark")}
                  </button>
                ))}
              </div>
              <label className="check-label">
                <input
                  checked={failure}
                  onChange={(e) => setFailure(e.target.checked)}
                  type="checkbox"
                />
                {fa
                  ? "فعال‌سازی خطای تصادفی برای بررسی حالت‌ها (۳۵٪)"
                  : "Enable random failures for testing (35%)"}
              </label>
            </>
          ) : tab === "security" ? (
            <>
              <label>
                {fa ? "گذرواژهٔ جدید" : "New password"}
                <input
                  type="password"
                  minLength={8}
                  required
                  onChange={() => setDirty(true)}
                />
              </label>
              <label className="check-label">
                <input type="checkbox" onChange={() => setDirty(true)} />
                {fa
                  ? "تأیید دومرحله‌ای (نمایشی)"
                  : "Two-factor authentication (demo)"}
              </label>
              <div className="inline-banner">
                Chrome · Windows · {t("today")}
                <span className="badge green">{t("ready")}</span>
              </div>
            </>
          ) : tab === "notifications" ? (
            <>
              {(fa
                ? ["ایمیل", "اعلان درون برنامه", "گزارش هفتگی"]
                : [
                    "Email notifications",
                    "In-app notifications",
                    "Weekly summary",
                  ]
              ).map((s) => (
                <label className="toggle-row" key={s}>
                  {s}
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={() => setDirty(true)}
                  />
                </label>
              ))}
            </>
          ) : tab === "connections" ? (
            <>
              {["Instagram", "Google", "WordPress"].map((s) => (
                <div className="toggle-row" key={s}>
                  <span>
                    {s}
                    <small>
                      {fa
                        ? "نیازمند اتصال؛ عملیات آزمایشی"
                        : "Connection required · demo only"}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="btn"
                    onClick={(e) => {
                      e.currentTarget.textContent = "✓ Demo";
                      toast.info(t("mock"));
                    }}
                  >
                    {fa ? "اتصال" : "Connect"}
                  </button>
                </div>
              ))}
            </>
          ) : tab === "api" ? (
            <>
              <label>
                API key
                <input readOnly value="af_demo_••••••••••••" />
              </label>
              <Button onClick={() => copy("af_demo_not_a_real_key")}>
                {t("copy")}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() =>
                  download(
                    "aifekr-data.json",
                    JSON.stringify(
                      Object.fromEntries(
                        Object.keys(localStorage)
                          .filter((key) => key.startsWith("aifekr-"))
                          .map((key) => [
                            key,
                            JSON.parse(localStorage.getItem(key) || "null"),
                          ]),
                      ),
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                {fa ? "خروجی داده‌ها" : "Export my data"}
              </Button>
              <div className="danger-zone">
                <h3>{fa ? "حذف حساب آزمایشی" : "Delete demo data"}</h3>
                <p>
                  {fa
                    ? "اطلاعات ذخیره‌شده در این مرورگر پاک می‌شوند."
                    : "This clears AIFekr data saved in this browser."}
                </p>
                <Button variant="danger" onClick={() => setDialog(true)}>
                  {t("delete")}
                </Button>
              </div>
            </>
          )}
          <div className="form-footer">
            {dirty && (
              <span className="amber-text">
                {fa ? "تغییرات ذخیره نشده" : "Unsaved changes"}
              </span>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? t("loading") : t("save")}
            </Button>
          </div>
        </form>
      </div>
      {dialog && (
        <Modal title={t("delete")} onClose={() => setDialog(false)}>
          <p>
            {fa
              ? "برای حذف، DELETE را بنویس."
              : "Type DELETE to clear your demo data."}
          </p>
          <input
            aria-label="DELETE"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button
            variant="danger"
            disabled={typed !== "DELETE"}
            onClick={() => {
              Object.keys(localStorage)
                .filter((key) => key.startsWith("aifekr-"))
                .forEach((key) => localStorage.removeItem(key));
              location.href = "/login";
            }}
          >
            {t("delete")}
          </Button>
        </Modal>
      )}
    </>
  );
}
export function Referral() {
  const { fa, t, n } = useApp();
  const [withdraw, setWithdraw] = useState(false);
  return (
    <>
      <SectionTitle
        title={t("referral")}
        subtitle={
          fa
            ? "فکرهای خوب را با دوستانت قسمت کن."
            : "Good ideas deserve good company."
        }
      />
      <div className="referral-hero panel">
        <span className="icon-chip orange">
          <Icon name="Gift" size={38} />
        </span>
        <h1>{fa ? "با هم، بیشتر می‌سازیم." : "Make more. Together."}</h1>
        <p>
          {fa
            ? "هر دعوت موفق، ۱۰۰ اعتبار برای هر دوی شما."
            : "Every successful invitation means 100 credits for both of you."}
        </p>
        <div className="inline-field">
          <input
            readOnly
            value="https://aifekr.example/invite/sara"
            dir="ltr"
            aria-label={fa ? "لینک دعوت" : "Referral link"}
          />
          <Button
            variant="primary"
            onClick={() => copy("https://aifekr.example/invite/sara")}
          >
            {t("copy")}
            <Icon name="Copy" size={16} />
          </Button>
        </div>
        <p className="fine-print">{t("mock")}</p>
      </div>
      <div className="stats-grid">
        {[12, 8, 3, 300].map((v, i) => (
          <div className="panel stat" key={i}>
            <p>
              {fa
                ? ["دعوت‌شده", "ثبت‌نام موفق", "خرید موفق", "اعتبار هدیه"][i]
                : ["Invited", "Signed up", "Paid", "Credits earned"][i]}
            </p>
            <strong>{n(v)}</strong>
          </div>
        ))}
      </div>
      <Button onClick={() => setWithdraw(true)}>
        {fa ? "درخواست برداشت" : "Request withdrawal"}
      </Button>
      {withdraw && (
        <Modal
          title={fa ? "کیف پول درآمد" : "Earnings wallet"}
          onClose={() => setWithdraw(false)}
        >
          <p>
            {fa
              ? "این کیف پول آزمایشی است و موجودی قابل برداشت ندارد."
              : "This demo wallet has no withdrawable funds."}
          </p>
        </Modal>
      )}
    </>
  );
}
export function Notifications() {
  const { fa, t } = useApp();
  const [read, setRead] = useState(false);
  return (
    <>
      <SectionTitle title={t("notifications")}>
        <Button variant="primary" onClick={() => setRead(true)}>
          {fa ? "همه را خواندم" : "Mark all as read"}
        </Button>
      </SectionTitle>
      <div className="panel notification-list">
        {read ? (
          <div className="empty">
            <Icon name="BellOff" size={35} />
            <h3>{t("notificationsEmpty")}</h3>
          </div>
        ) : (
          ["image", "credits", "learn"].map((s, i) => (
            <Link key={s} href={["/gallery", "/credits", "/learn"][i]}>
              <span className={`icon-chip ${["orange", "purple", "blue"][i]}`}>
                <Icon name={["Image", "Wallet", "GraduationCap"][i]} />
              </span>
              <div>
                <h3>
                  {fa
                    ? [
                        "تصویرت آماده است",
                        "کیف پولت شارژ شد",
                        "مسیر یادگیری‌ات منتظر توست",
                      ][i]
                    : [
                        "Your image is ready",
                        "Your wallet is topped up",
                        "Your next lesson is waiting",
                      ][i]}
                </h3>
                <p>
                  {t("mock")} · {fa ? "چند دقیقه پیش" : "A few minutes ago"}
                </p>
              </div>
              <i className="tiny-dot" />
            </Link>
          ))
        )}
      </div>
    </>
  );
}
