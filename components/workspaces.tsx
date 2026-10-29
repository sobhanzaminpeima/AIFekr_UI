"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./providers";
import {
  Button,
  download,
  Icon,
  Modal,
  SectionTitle,
  SparkChart,
  ToolCard,
} from "./ui";
import { tools, adminSections, contacts } from "@/mocks/catalog";
import { DataTable } from "./data-table";
import { Chat } from "./chat";
import { toast } from "sonner";
import { AdminSpecial, isSpecialAdmin } from "./admin-special";
import { modules, moduleViewHref } from "@/lib/upstream/registry";
export function Hub({
  group,
}: {
  group: "create" | "business" | "learn" | "fit";
}) {
  const { fa, t, n } = useApp();
  return (
    <div>
      <div className={`module-hero ${group}`}>
        <span
          className={`icon-chip ${group === "fit" ? "lime" : group === "learn" ? "blue" : "orange"}`}
        >
          <Icon
            name={
              group === "create"
                ? "Sparkles"
                : group === "business"
                  ? "BriefcaseBusiness"
                  : group === "learn"
                    ? "GraduationCap"
                    : "Dumbbell"
            }
            size={30}
          />
        </span>
        <span className="eyebrow">AIFekr {group.toUpperCase()}</span>
        <h1>
          {group === "create"
            ? fa
              ? "خیال کن. خلق کن. بدرخش."
              : "Imagine. Create. Make your mark."
            : group === "business"
              ? fa
                ? "همراه فکرهای بزرگ کسب‌وکار تو"
                : "A little intelligence for your big ambitions."
              : group === "learn"
                ? fa
                  ? "کنجکاوی، شروع یک مسیر تازه است."
                  : "Stay curious. Go somewhere new."
                : fa
                  ? "هر روز، قوی‌تر از دیروز."
                  : "A little stronger, every day."}
        </h1>
        <p>
          {fa
            ? "همهٔ ابزارهایی که نیاز داری، در یک فضای ساده و یکپارچه."
            : "Everything you need, thoughtfully brought together."}
        </p>
      </div>
      {group === "business" && <Stats />}
      {group === "fit" && <FitDashboard />}
      {group === "learn" && <CourseCards />}
      <SectionTitle
        title={t("tools")}
        subtitle={
          fa
            ? "ابزار مناسب مسیر خودت را انتخاب کن."
            : "Find the tool for your next step."
        }
      />
      <div className="tool-grid module-directory">
        {modules
          .filter((m) => m.group === group)
          .map((m) => (
            <Link className="tool-card" key={m.id} href={m.base}>
              <span className={`icon-chip ${m.accent}`}>
                <Icon name={m.icon} />
              </span>
              <h3>{m.title[fa ? 0 : 1]}</h3>
              <p>{m.subtitle[fa ? 0 : 1]}</p>
              <span className="badge">
                {n(m.views.length)} {fa ? "بخش" : "sections"}
              </span>
            </Link>
          ))}
      </div>
      <div className="tool-grid">
        {tools
          .filter((x) => x.group === group)
          .map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
      </div>
      {group === "create" && (
        <div className="inline-banner">
          <Icon name="FolderHeart" />
          <div>
            <h3>{t("gallery")}</h3>
            <p>
              {fa
                ? "همهٔ ساخته‌های تو، در یک جای امن."
                : "All the things you’ve made, in one place."}
            </p>
          </div>
          <Link className="btn" href="/gallery">
            {t("viewAll")}
          </Link>
          <Link className="btn" href="/play">
            {fa ? "زمین بازی" : "Playground"}
          </Link>
        </div>
      )}
    </div>
  );
}
export function Stats() {
  const { fa, n, price } = useApp();
  return (
    <div className="stats-grid">
      {[
        ["درآمد این ماه", "Monthly revenue", price(28650000), "Wallet"],
        ["مشتریان فعال", "Active customers", n(248), "Users"],
        ["فرصت‌های فروش", "Sales opportunities", n(32), "TrendingUp"],
        ["نرخ تبدیل", "Conversion", n(18) + "٪", "ChartNoAxesCombined"],
      ].map(([a, b, v, icon], i) => (
        <div className="panel stat" key={a}>
          <div className="row-between">
            <span>{fa ? a : b}</span>
            <Icon name={icon} size={17} />
          </div>
          <strong>{v}</strong>
          <small className="green">
            ↗ {n(8 + i * 3)}٪{" "}
            <span className="muted">
              {fa ? "نسبت به ماه قبل" : "vs last month"}
            </span>
          </small>
          <SparkChart color={i % 2 ? "#6ba6bd" : "#f39961"} />
        </div>
      ))}
    </div>
  );
}
export function RevenueChart() {
  const { fa, n } = useApp();
  return (
    <div className="panel revenue-chart">
      <SectionTitle title={fa ? "روند درآمد" : "Revenue overview"}>
        <span className="badge">{fa ? "۶ ماه گذشته" : "Last 6 months"}</span>
      </SectionTitle>
      <div className="bar-chart">
        {[35, 53, 42, 69, 60, 85, 74, 93, 68, 82, 95, 88].map((h, i) => (
          <div key={i}>
            <span style={{ height: h + "%" }} title={n(h * 1000000)} />
            <small>{n(i + 1)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
export function BusinessTool({ path }: { path: string }) {
  const { fa, t, n } = useApp();
  const tool = tools.find((x) => "/" + x.slug === path) || tools[5];
  const [modal, setModal] = useState(false);
  const [stage, setStage] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState(false);
  const [deals, setDeals] = useState([0, 1, 2, 0, 1]);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const kind = tool.kind;
  const title = fa ? tool.fa : tool.en;
  if (path.includes("ceo"))
    return (
      <>
        <SectionTitle title={title} />
        <Board />
      </>
    );
  if (path === "/meeting" || path === "/agents")
    return (
      <>
        <SectionTitle title={title} />
        <div className="tool-grid">
          {["Strategy", "Marketing", "Finance", "Operations"].map((s, i) => (
            <div className="panel agent-card" key={s}>
              <span
                className={`icon-chip ${["orange", "purple", "blue", "amber"][i]}`}
              >
                <Icon name="Bot" size={28} />
              </span>
              <h3>
                {fa
                  ? ["استراتژیست", "بازاریاب", "مشاور مالی", "مدیر عملیات"][i]
                  : s}
              </h3>
              <span className="badge green">{t("ready")}</span>
              <p>
                {fa
                  ? "همراه تو برای تصمیم بعدی."
                  : "Your partner in the next decision."}
              </p>
              <Button
                onClick={() => {
                  setValue(s);
                  setModal(true);
                }}
              >
                {fa ? "شروع جلسه" : "Start session"}
              </Button>
            </div>
          ))}
        </div>
        {modal && (
          <Modal title={value} onClose={() => setModal(false)}>
            <Chat persona={value} />
          </Modal>
        )}
      </>
    );
  return (
    <div>
      <SectionTitle
        title={title}
        subtitle={fa ? tool.description : tool.descriptionEn}
      >
        <Button variant="primary" onClick={() => setModal(true)}>
          <Icon name="Plus" size={17} />
          {[
            "Assessment",
            "Canvas",
            "Projects",
            "Ideas",
            "Solver",
            "Meals",
            "Try",
          ].includes(kind || "")
            ? t("generate")
            : t("add")}
        </Button>
      </SectionTitle>
      {kind === "Pipeline" ? (
        <div className="kanban">
          {[0, 1, 2].map((col) => (
            <section
              className="kanban-column"
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = Number(e.dataTransfer.getData("deal"));
                setDeals((d) => d.map((x, i) => (i === id ? col : x)));
              }}
            >
              <h3>
                <span className={`tiny-dot color-${col}`} />
                {fa
                  ? ["جدید", "در مذاکره", "برنده‌شده"][col]
                  : ["New leads", "Negotiating", "Won"][col]}
                <small>{n(deals.filter((x) => x === col).length)}</small>
              </h3>
              {contacts
                .filter((_, i) => deals[i] === col)
                .map((c) => (
                  <article
                    key={c.id}
                    className="deal-card"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("deal", String(Number(c.id) - 1))
                    }
                  >
                    <span className="badge amber">
                      {fa ? "فرصت فروش" : "Opportunity"}
                    </span>
                    <h4>{fa ? c.name : c.en}</h4>
                    <p>
                      {n(c.amount)} {fa ? "تومان" : "Toman"}
                    </p>
                    <select
                      aria-label={t("status")}
                      value={deals[Number(c.id) - 1]}
                      onChange={(e) =>
                        setDeals((d) =>
                          d.map((x, i) =>
                            i === Number(c.id) - 1 ? Number(e.target.value) : x,
                          ),
                        )
                      }
                    >
                      {[0, 1, 2].map((v) => (
                        <option value={v} key={v}>
                          {fa
                            ? ["جدید", "مذاکره", "برنده"][v]
                            : ["New", "Negotiating", "Won"][v]}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : kind === "Calendar" ? (
        <>
          <div className="inline-banner">
            <Icon name="Instagram" />
            <p>
              {connected
                ? fa
                  ? "اتصال آزمایشی فعال است"
                  : "Demo account connected"
                : fa
                  ? "برای انتشار واقعی، اتصال اینستاگرام لازم است."
                  : "Connect Instagram to publish to a real account."}
            </p>
            <Button
              onClick={() => {
                setConnected(!connected);
                toast.info(t("mock"));
              }}
            >
              {connected
                ? t("cancel")
                : fa
                  ? "اتصال آزمایشی"
                  : "Simulate connection"}
            </Button>
          </div>
          <Calendar />
        </>
      ) : kind === "Listings" ? (
        <div className="tool-grid">
          {[1, 2, 3].map((i) => (
            <div className="panel property-card" key={i}>
              <div className="property-visual">
                <Icon name="Building2" size={70} />
              </div>
              <h3>
                {fa ? "آپارتمان در سعادت‌آباد" : "Apartment in Saadat Abad"}
              </h3>
              <p>
                {n(90 + i * 20)} m² · {n(i + 1)} {fa ? "اتاق" : "rooms"}
              </p>
              <strong>
                {n(12500000000 + i * 500000000)} {fa ? "تومان" : "Toman"}
              </strong>
              <Button
                onClick={() => {
                  setValue(String(i));
                  setModal(true);
                }}
              >
                {t("action")}
              </Button>
            </div>
          ))}
        </div>
      ) : kind === "Audit" ? (
        <>
          <Stats />
          <RevenueChart />
          <DataTable
            title={fa ? "کلیدواژه‌ها و فرصت‌ها" : "Keywords & opportunities"}
          />
        </>
      ) : [
          "Assessment",
          "Canvas",
          "Projects",
          "Ideas",
          "Solver",
          "Meals",
          "Try",
        ].includes(kind || "") ? (
        <div className="panel wizard-box">
          <div className="stepper">
            {[0, 1, 2].map((s) => (
              <button
                className={s === stage ? "current" : ""}
                key={s}
                onClick={() => setStage(s)}
              >
                <span>{n(s + 1)}</span>
                {fa
                  ? ["هدف تو", "جزئیات", "برنامهٔ پیشنهادی"][s]
                  : ["Your goal", "The details", "Your action plan"][s]}
              </button>
            ))}
          </div>
          <h2>
            {fa
              ? "از هدف خودت برایمان بگو."
              : "Tell us what you’d like to achieve."}
          </h2>
          <textarea
            rows={5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              fa
                ? "چه چیزی را می‌خواهی بهتر کنی؟"
                : "What would you like to improve?"
            }
          />
          <Button
            disabled={!value || busy}
            onClick={async () => {
              setBusy(true);
              await new Promise((r) => setTimeout(r, 600));
              setStage((s) => Math.min(2, s + 1));
              if (stage >= 1) setResult(true);
              setBusy(false);
            }}
          >
            {busy ? t("loading") : t("next")}
          </Button>
          {result && (
            <div className="report">
              <h3>
                {fa ? "برنامهٔ پیشنهادی آزمایشی" : "Your sample action plan"}
              </h3>
              <ol>
                {(fa
                  ? [
                      "هدف را به یک معیار قابل اندازه‌گیری تبدیل کن.",
                      "یک نسخهٔ کوچک را در هفتهٔ اول اجرا کن.",
                      "نتیجه را بسنج و برنامه را اصلاح کن.",
                    ]
                  : [
                      "Define one measurable outcome.",
                      "Launch a small first version this week.",
                      "Measure the outcome and refine the plan.",
                    ]
                ).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {kind === "Projects" && (
                <div className="site-preview">
                  <h2>{value}</h2>
                  <p>
                    {fa
                      ? "آیندهٔ کسب‌وکار شما، از اینجا شروع می‌شود."
                      : "Your business starts here."}
                  </p>
                </div>
              )}
              <Button
                onClick={() =>
                  download(
                    "action-plan.txt",
                    value +
                      "\n" +
                      (fa
                        ? "هدف ← اجرا ← ارزیابی"
                        : "Define → Build → Measure"),
                  )
                }
              >
                {t("download")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <Stats />
          <DataTable title={title} />
        </>
      )}
      {modal && (
        <Modal title={t("add") + " · " + title} onClose={() => setModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success(t("success"));
              setModal(false);
            }}
          >
            <label>
              {t("name")}
              <input
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label>
              {fa ? "یادداشت" : "Notes"}
              <textarea rows={4} />
            </label>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function Board() {
  const { fa, n } = useApp();
  const [approved, setApproved] = useState(false);
  return (
    <div className="kanban">
      {[0, 1, 2].map((i) => (
        <section className="kanban-column" key={i}>
          <h3>
            {fa
              ? ["برنامه‌ریزی", "در حال اجرا", "نیازمند تأیید"][i]
              : ["Planned", "In progress", "Awaiting approval"]}
          </h3>
          {[0, 1].map((j) => (
            <div className="deal-card" key={j}>
              <span className="badge">
                {fa ? "دستیار بازاریابی" : "Marketing agent"}
              </span>
              <h4>
                {fa
                  ? ["تحلیل مخاطبان", "نوشتن تقویم محتوا"][j]
                  : ["Audience research", "Create content calendar"][j]}
              </h4>
              <small>
                ✦ {n(5)} {fa ? "اعتبار" : "credits"}
              </small>
              {i === 2 && (
                <Button
                  onClick={() => {
                    setApproved(true);
                    toast.success(fa ? "تأیید شد" : "Approved");
                  }}
                  disabled={approved}
                >
                  {approved ? "✓" : fa ? "تأیید" : "Approve"}
                </Button>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
export function Calendar() {
  const { fa, n } = useApp();
  const [day, setDay] = useState<number | null>(null);
  return (
    <div className="panel">
      <SectionTitle title={fa ? "تقویم این ماه" : "Your monthly calendar"}>
        <span className="badge">{fa ? "آبان ۱۴۰۵" : "October 2026"}</span>
      </SectionTitle>
      <div className="calendar-grid">
        {Array.from({ length: 28 }, (_, i) => (
          <button key={i} onClick={() => setDay(i + 1)}>
            <span>{n(i + 1)}</span>
            {i % 6 === 2 && (
              <small>
                {fa ? "انتشار محتوای آموزشی" : "Publish a learning post"}
              </small>
            )}
          </button>
        ))}
      </div>
      {day && (
        <Modal
          title={(fa ? "برنامه روز " : "Day ") + n(day)}
          onClose={() => setDay(null)}
        >
          <label>
            {fa ? "عنوان برنامه" : "Event title"}
            <input />
          </label>
          <input type="time" aria-label={fa ? "ساعت" : "Time"} />
          <Button
            onClick={() => {
              toast.success(fa ? "برنامه ذخیره شد" : "Event saved");
              setDay(null);
            }}
          >
            {fa ? "ذخیره کن" : "Save event"}
          </Button>
        </Modal>
      )}
    </div>
  );
}
export function CourseCards() {
  const { fa, n } = useApp();
  return (
    <div className="course-grid">
      {["ai-basics", "prompting", "creative-ai"].map((id, i) => (
        <Link
          className="panel course-card"
          href={"/learn/courses/" + id}
          key={id}
        >
          <div className={`course-cover cover-${i}`}>
            <Icon
              name={["BrainCircuit", "MessagesSquare", "Shapes"][i]}
              size={60}
            />
            <span>0{i + 1}</span>
          </div>
          <span className="eyebrow blue-text">
            {fa ? "آکادمی ای آی فکر" : "AIFekr ACADEMY"}
          </span>
          <h3>
            {fa
              ? [
                  "مقدمات هوش مصنوعی",
                  "هنر پرسیدن سؤال خوب",
                  "خلاقیت با هوش مصنوعی",
                ][i]
              : [
                  "Introduction to AI",
                  "The art of a good prompt",
                  "Creative intelligence",
                ][i]}
          </h3>
          <p>
            {n(8 + i * 2)} {fa ? "درس · سطح مقدماتی" : "lessons · Beginner"}
          </p>
          <div className="meter">
            <i style={{ width: 35 - i * 12 + "%" }} />
          </div>
        </Link>
      ))}
    </div>
  );
}
export function FitDashboard() {
  const { fa, n, t } = useApp();
  return (
    <div className="fit-bento">
      <Link href="/fit/workout/1" className="panel workout-today">
        <span className="eyebrow lime-text">FIT / {t("today")}</span>
        <h2>
          {fa ? "وقتشه برای خودت وقت بذاری." : "Make a little time for you."}
        </h2>
        <p>
          {fa
            ? "تمرین بالاتنه · ۳۰ دقیقه · سطح متوسط"
            : "Upper body · 30 minutes · Intermediate"}
        </p>
        <span className="btn">
          {fa ? "شروع تمرین" : "Start workout"}
          <Icon name="Play" size={17} />
        </span>
        <Icon name="Dumbbell" size={90} />
      </Link>
      <div className="panel nutrition">
        <SectionTitle title={fa ? "تغذیهٔ امروز" : "Today’s nutrition"} />
        <div className="nutrition-ring">
          <strong>
            {n(1450)}
            <small>/ {n(2100)} kcal</small>
          </strong>
        </div>
        <div className="nutrition-macros">
          {[85, 180, 42].map((v, i) => (
            <span key={i}>
              <strong>{n(v)}g</strong>
              <small>
                {fa
                  ? ["پروتئین", "کربوهیدرات", "چربی"][i]
                  : ["Protein", "Carbs", "Fat"][i]}
              </small>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
export function Admin({ path }: { path: string }) {
  const { fa, t } = useApp();
  const section = path.split("/")[2] || "overview";
  const entry = adminSections.find((x) => x[0] === section) || adminSections[0];
  return (
    <>
      <SectionTitle title={fa ? entry[1] : entry[2]} subtitle={t("mock")}>
        <Link className="btn primary" href="/admin/users">
          <Icon name="Users" size={17} />
          {fa ? "مدیریت کاربران" : "Manage users"}
        </Link>
      </SectionTitle>
      <div className="health-strip">
        <span>
          <i className="tiny-dot green" />
          {fa ? "همهٔ سرویس‌ها در وضعیت عادی" : "All services operational"}
        </span>
        <span>API 99.98% · 142ms</span>
        <span className="badge">{t("mock")}</span>
      </div>
      {isSpecialAdmin(section) ? (
        <AdminSpecial key={section} section={section} />
      ) : section === "overview" ? (
        <>
          <Stats />
          <div className="admin-overview">
            <RevenueChart />
            <div className="panel">
              <h3>{fa ? "فعالیت‌های اخیر" : "Live activity"}</h3>
              {contacts.slice(0, 4).map((c, i) => (
                <div className="activity-item" key={c.id}>
                  <span className="avatar small">
                    {fa ? c.name[0] : c.en[0]}
                  </span>
                  <div>
                    <strong>{fa ? c.name : c.en}</strong>
                    <p>
                      {fa
                        ? [
                            "اشتراک حرفه‌ای فعال شد",
                            "ثبت‌نام انجام شد",
                            "یک تصویر ساخت",
                            "اعتبار شارژ شد",
                          ][i]
                        : [
                            "Activated a Pro plan",
                            "Created an account",
                            "Generated an image",
                            "Topped up credits",
                          ][i]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DataTable title={fa ? "آخرین تراکنش‌ها" : "Recent transactions"} />
        </>
      ) : section === "status" ? (
        <>
          <Stats />
          <RevenueChart />
        </>
      ) : (
        <DataTable
          title={fa ? entry[1] : entry[2]}
          userLinks={section === "users"}
        />
      )}
    </>
  );
}
