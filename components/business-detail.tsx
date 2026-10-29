"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useApp } from "./providers";
import { Button, download, Icon, SectionTitle } from "./ui";
import { DataTable } from "./data-table";
import { Board, Calendar, RevenueChart, Stats } from "./workspaces";
import { businessPages } from "@/mocks/business-pages";
import { Chat } from "./chat";
import { toast } from "sonner";
export function BusinessNavigation({ path }: { path: string }) {
  const { fa } = useApp();
  const root = path.split("/")[2];
  const pages = businessPages[root];
  if (!pages) return null;
  return (
    <nav className="module-subnav">
      {pages.map(([slug, a, b]) => (
        <Link
          className={path.endsWith("/" + slug) ? "selected" : ""}
          href={"/business/" + root + "/" + slug}
          key={slug}
        >
          {fa ? a : b}
        </Link>
      ))}
    </nav>
  );
}
export function BusinessDetail({ path }: { path: string }) {
  const { fa, t, n, price } = useApp();
  const root = path.split("/")[2];
  const part = path.split("/")[3];
  const entry = businessPages[root]?.find((x) => x[0] === part);
  const [saved, setSaved] = useState(false);
  const [value, setValue] = useState("");
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState("desktop");
  const [connected, setConnected] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  if (!entry) return null;
  const [, a, b, kind] = entry;
  const title = fa ? a : b;
  return (
    <>
      <SectionTitle title={title} subtitle={t("mock")} />
      <BusinessNavigation path={path} />
      {kind === "table" ? (
        <DataTable title={title} />
      ) : kind === "calendar" ? (
        <Calendar />
      ) : kind === "board" ? (
        <Board />
      ) : kind === "chat" ? (
        <Chat persona={title} />
      ) : kind === "invoice" ? (
        <Invoice />
      ) : kind === "report" ? (
        <>
          <Stats />
          <RevenueChart />
          <div className="panel report">
            <h2>{fa ? "پیشنهاد برای قدم بعدی" : "Your next small step"}</h2>
            <p>
              {fa
                ? "روی یک شاخص تمرکز کن، تغییرات هفتگی را بسنج و بهترین اقدام را تکرار کن. همه اعداد این گزارش نمونه هستند."
                : "Focus on one metric, track weekly changes, and repeat what works. All figures in this report are samples."}
            </p>
            <Button
              onClick={() =>
                download(
                  "aifekr-report.txt",
                  title +
                    "\n" +
                    (fa
                      ? "گزارش آزمایشی - درآمد: ۲۸٬۶۵۰٬۰۰۰ تومان"
                      : "Demo report - revenue: 28,650,000 Toman"),
                )
              }
            >
              {t("download")}
            </Button>
          </div>
        </>
      ) : kind === "connect" ? (
        <div className="tool-grid">
          {["Instagram", "WordPress", "Website", "Divar"].map((s, i) => (
            <div className="panel" key={s}>
              <span className="icon-chip amber">
                <Icon
                  name={["Instagram", "Globe", "PanelsTopLeft", "Building2"][i]}
                />
              </span>
              <h3>{s}</h3>
              <p>
                {connected.includes(s)
                  ? fa
                    ? "اتصال آزمایشی فعال"
                    : "Demo connection active"
                  : fa
                    ? "برای استفادهٔ واقعی، اتصال حساب لازم است."
                    : "A connected account is required for real use."}
              </p>
              <Button
                onClick={() => {
                  setConnected((v) =>
                    v.includes(s) ? v.filter((x) => x !== s) : [...v, s],
                  );
                  toast.info(t("mock"));
                }}
              >
                {connected.includes(s)
                  ? fa
                    ? "قطع اتصال"
                    : "Disconnect"
                  : fa
                    ? "اتصال آزمایشی"
                    : "Connect demo"}
              </Button>
            </div>
          ))}
        </div>
      ) : kind === "reconcile" ? (
        <section className="panel">
          <h2>{fa ? "تراکنش‌های قابل تطبیق" : "Transactions to match"}</h2>
          <p className="fine-print">
            {fa
              ? "مبالغ بانکی و دفتر را تطبیق بده. هیچ حساب بانکی واقعی متصل نیست."
              : "Match bank entries to the ledger. No real bank is connected."}
          </p>
          {["TRX-1001", "TRX-1002", "TRX-1003"].map((s, i) => (
            <label className="toggle-row" key={s}>
              <span>
                {s} · {price(490000 + i * 200000)}
                <small>{fa ? "بانک ← دفتر فروش" : "Bank → Sales ledger"}</small>
              </span>
              <input
                type="checkbox"
                checked={checked.includes(s)}
                onChange={(e) =>
                  setChecked((c) =>
                    e.target.checked ? [...c, s] : c.filter((v) => v !== s),
                  )
                }
              />
            </label>
          ))}
          <Button
            variant="primary"
            onClick={() => {
              setSaved(true);
              toast.success(t("success"));
            }}
            disabled={!checked.length}
          >
            {saved ? "✓ " : ""}
            {fa ? "ثبت تطبیق" : "Confirm matches"} ({n(checked.length)})
          </Button>
        </section>
      ) : kind === "canvas" ? (
        <section className="panel lean-canvas">
          {(fa
            ? [
                "مسئله",
                "گروه مشتری",
                "ارزش پیشنهادی",
                "راه‌حل",
                "کانال‌ها",
                "درآمد",
                "هزینه‌ها",
                "مزیت رقابتی",
                "شاخص‌ها",
              ]
            : [
                "Problem",
                "Customers",
                "Value proposition",
                "Solution",
                "Channels",
                "Revenue",
                "Costs",
                "Unfair advantage",
                "Key metrics",
              ]
          ).map((s) => (
            <label key={s}>
              {s}
              <textarea
                rows={4}
                placeholder={fa ? "ایده‌هایت را بنویس…" : "Your thoughts…"}
              />
            </label>
          ))}
          <Button
            variant="primary"
            onClick={() => {
              setSaved(true);
              toast.success(t("success"));
            }}
          >
            {saved ? "✓ " : ""}
            {t("save")}
          </Button>
        </section>
      ) : kind === "wizard" ? (
        <section className="panel wizard-box">
          <div className="stepper">
            {[0, 1, 2].map((s) => (
              <button
                className={step === s ? "current" : ""}
                onClick={() => setStep(s)}
                key={s}
              >
                <span>{n(s + 1)}</span>
                {fa
                  ? ["تعریف", "بررسی", "تأیید"][s]
                  : ["Define", "Review", "Confirm"][s]}
              </button>
            ))}
          </div>
          <h2>{title}</h2>
          <label>
            {step === 0
              ? fa
                ? "هدف و جزئیات"
                : "Goal & details"
              : step === 1
                ? fa
                  ? "نکات قابل بررسی"
                  : "Review your notes"
                : fa
                  ? "جمع‌بندی"
                  : "Summary"}
            <textarea
              rows={5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          {part === "close-period" && (
            <label className="check-label">
              <input type="checkbox" required />
              {fa
                ? "مانده‌ها و تراکنش‌های دوره را بررسی کردم."
                : "I have reviewed period balances and transactions."}
            </label>
          )}
          <Button
            variant="primary"
            disabled={!value.trim()}
            onClick={() => {
              if (step < 2) setStep((s) => s + 1);
              else {
                setSaved(true);
                toast.success(t("success"));
              }
            }}
          >
            {saved ? "✓ " : ""}
            {step === 2 ? t("confirm") : t("next")}
          </Button>
          <p className="fine-print">{t("mock")}</p>
        </section>
      ) : (
        <section className="panel editor-panel">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
              toast.success(t("success"));
            }}
          >
            <label>
              {t("name")}
              <input
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={title}
              />
            </label>
            <label>
              {part === "compose"
                ? fa
                  ? "متن پست"
                  : "Post caption"
                : part === "knowledge"
                  ? fa
                    ? "متن دانش منشی"
                    : "Knowledge source"
                  : part === "rules"
                    ? fa
                      ? "اگر این اتفاق افتاد…"
                      : "When this happens…"
                    : fa
                      ? "توضیحات"
                      : "Description"}
              <textarea rows={6} required />
            </label>
            <div className="form-grid">
              <label>
                {part === "compose"
                  ? fa
                    ? "زمان انتشار"
                    : "Publish at"
                  : fa
                    ? "شروع"
                    : "Start"}
                <input type="datetime-local" />
              </label>
              <label>
                {fa ? "دسته‌بندی" : "Category"}
                <select>
                  <option>{fa ? "عمومی" : "General"}</option>
                  <option>{fa ? "حرفه‌ای" : "Professional"}</option>
                </select>
              </label>
            </div>
            {["expenses", "knowledge", "forms"].includes(part) && (
              <label className="file-drop">
                <Icon name="Upload" />
                {fa ? "فایل مرجع" : "Reference file"}
                <input
                  type="file"
                  onChange={() => toast.success(t("attached"))}
                />
              </label>
            )}
            {["brief", "editor", "compose"].includes(part) && (
              <>
                <div className="chips">
                  {["desktop", "tablet", "mobile"].map((d) => (
                    <button
                      type="button"
                      className={device === d ? "selected" : ""}
                      onClick={() => setDevice(d)}
                      key={d}
                    >
                      <Icon
                        name={
                          d === "desktop"
                            ? "Monitor"
                            : d === "tablet"
                              ? "Tablet"
                              : "Smartphone"
                        }
                        size={16}
                      />
                      {fa
                        ? {
                            desktop: "رایانه",
                            tablet: "تبلت",
                            mobile: "موبایل",
                          }[d]
                        : d}
                    </button>
                  ))}
                </div>
                <div
                  className="device-preview"
                  style={{
                    maxWidth:
                      device === "mobile"
                        ? 250
                        : device === "tablet"
                          ? 500
                          : "100%",
                  }}
                >
                  <span className="eyebrow">{t("preview")}</span>
                  <h2>{value || title}</h2>
                  <p>
                    {fa
                      ? "ایده‌های خوب، از یک شروع ساده می‌آیند."
                      : "Good ideas begin with a simple first step."}
                  </p>
                </div>
              </>
            )}
            <Button type="submit" variant="primary">
              {saved ? "✓ " : ""}
              {part === "compose"
                ? fa
                  ? "زمان‌بندی آزمایشی"
                  : "Schedule demo"
                : t("save")}
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
export function Invoice() {
  const { fa, t, price, n } = useApp();
  const [customer, setCustomer] = useState("سارا محمدی");
  const [lines, setLines] = useState([
    { name: fa ? "خدمات طراحی" : "Design services", qty: 1, amount: 2500000 },
  ]);
  const [saved, setSaved] = useState(false);
  const total = lines.reduce((s, l) => s + l.qty * l.amount, 0);
  return (
    <section className="panel invoice-editor">
      <div className="row-between">
        <span className="eyebrow orange-text">AIFekr / INVOICE</span>
        <span className="badge">INV-1405-001</span>
      </div>
      <label>
        {fa ? "مشتری" : "Customer"}
        <input
          required
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />
      </label>
      {lines.map((l, i) => (
        <div className="invoice-line" key={i}>
          <label>
            {fa ? "شرح" : "Item"}
            <input
              value={l.name}
              onChange={(e) =>
                setLines((s) =>
                  s.map((v, j) =>
                    j === i ? { ...v, name: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label>
            {fa ? "تعداد" : "Quantity"}
            <input
              type="number"
              min={1}
              value={l.qty}
              onChange={(e) =>
                setLines((s) =>
                  s.map((v, j) =>
                    j === i
                      ? { ...v, qty: Math.max(1, Number(e.target.value)) }
                      : v,
                  ),
                )
              }
            />
          </label>
          <label>
            {fa ? "مبلغ واحد (تومان)" : "Unit price (Toman)"}
            <input
              type="number"
              min={0}
              value={l.amount}
              onChange={(e) =>
                setLines((s) =>
                  s.map((v, j) =>
                    j === i
                      ? { ...v, amount: Math.max(0, Number(e.target.value)) }
                      : v,
                  ),
                )
              }
            />
          </label>
          <Button
            label={t("delete")}
            disabled={lines.length === 1}
            onClick={() => setLines((s) => s.filter((_, j) => j !== i))}
          >
            <Icon name="Trash2" size={16} />
          </Button>
        </div>
      ))}
      <Button
        onClick={() => setLines((s) => [...s, { name: "", qty: 1, amount: 0 }])}
      >
        <Icon name="Plus" size={16} />
        {t("add")}
      </Button>
      <div className="invoice-total">
        <span>{fa ? "مجموع" : "Total"}</span>
        <strong>{price(total)}</strong>
      </div>
      <div className="flex-wrap">
        <Button
          variant="primary"
          disabled={!customer.trim() || lines.some((l) => !l.name.trim())}
          onClick={() => {
            setSaved(true);
            toast.success(t("success"));
          }}
        >
          {saved ? "✓ " : ""}
          {t("save")}
        </Button>
        <Button onClick={() => window.print()}>
          <Icon name="Printer" size={17} />
          {fa ? "چاپ / ذخیره PDF" : "Print / save PDF"}
        </Button>
        <Button
          onClick={() =>
            download(
              "invoice.json",
              JSON.stringify({ customer, lines, total }, null, 2),
              "application/json",
            )
          }
        >
          {t("download")}
        </Button>
      </div>
      <p className="fine-print">
        {t("mock")} · {n(lines.length)} {fa ? "ردیف" : "items"}
      </p>
    </section>
  );
}
