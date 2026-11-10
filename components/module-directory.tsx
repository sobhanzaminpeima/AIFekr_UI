"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./ui";

export function BusinessDoctorEntry(){
  const {fa, tl }=useApp();
  return <Link href="/business-doctor" className="directory-doctor">
    <span className="icon-chip amber"><Icon name="HeartPulse" size={30}/></span>
    <div><span className="eyebrow">{tl('نقطهٔ شروع پیشنهادی برای کسب‌وکار', 'A STARTING POINT FOR YOUR BUSINESS')}</span>
    <h3>{fa?'نمی‌دانی از کجا شروع کنی؟ دکتر کسب‌وکار':'Not sure where to begin? Business Doctor'}</h3>
    <p>{fa?'ابتدا مسئله و هدف را روشن کن؛ سپس مسیر فروش، مالی یا محتوا را انتخاب کن.':'Clarify the challenge and goal, then choose a sales, finance or content workflow.'}</p></div>
    <Icon name="ArrowLeft" className="directional"/>
  </Link>;
}

export const moduleDestinations = [
  {
    href: "/business-doctor",
    fa: "دکتر کسب‌وکار",
    en: "Business Doctor",
    icon: "HeartPulse",
    group: "business",
    description: [
      "از مسئله و ارزیابی تا برنامهٔ اقدام و شاخص‌ها",
      "Assess your business, plan actions and track metrics",
    ],
    terms: "دکتر تشخیص تحلیل ارزیابی swot business doctor",
    links: [
      ["/business-doctor", "ارزیابی", "Assessment"],
      ["/business-doctor?tab=action-plan", "برنامهٔ اقدام", "Action plan"],
    ],
  },
  {
    href: "/crm",
    fa: "CRM",
    en: "CRM",
    icon: "Users",
    group: "business",
    description: [
      "مشتری، فرصت فروش، قرارداد و پیگیری در یک فضای کاری",
      "Contacts, sales pipeline, contracts and follow-ups",
    ],
    terms: "مشتری فروش مخاطب ارتباط crm customer sales",
    links: [
      ["/crm?tab=contacts", "مخاطبان", "Contacts"],
      ["/crm?tab=board", "مسیر فروش", "Pipeline"],
    ],
  },
  {
    href: "/crm?tab=agent",
    fa: "ایجنت فروش",
    en: "Sales Agent",
    icon: "Bot",
    group: "business",
    description: [
      "دستیار پیگیری مشتری و آماده‌سازی اقدام بعدی فروش",
      "Prepare follow-ups and the next sales action",
    ],
    terms: "ایجنت عامل نماینده دستیار فروش agent sales followup",
    links: [
      ["/crm?tab=agent", "دستیار فروش", "Sales assistant"],
      ["/crm?tab=automation", "اتوماسیون", "Automation"],
    ],
  },
  {
    href: "/voice-agent",
    fa: "مرکز تماس‌های هوشمند",
    en: "Intelligent Call Center",
    icon: "Phone",
    group: "business",
    description: [
      "منشی، دانش پاسخ‌گویی، تماس‌ها و قرارهای مشتری",
      "Call agents, knowledge, call logs and appointments",
    ],
    terms: "تلفن تماس منشی صوت voice phone call center",
    links: [
      ["/voice-agent?tab=setup", "ساخت منشی", "Set up agent"],
      ["/voice-agent?tab=calls", "سوابق تماس", "Call logs"],
    ],
  },
  {
    href: "/social",
    fa: "شبکه‌های اجتماعی",
    en: "Social Media",
    icon: "Instagram",
    group: "content",
    description: [
      "محتوا، تقویم انتشار، برند و پیگیری رشد",
      "Content, publishing calendar, brand and growth",
    ],
    terms: "شبکه اجتماعی اینستاگرام پست social instagram publish",
    links: [
      ["/social?tab=content", "تولید محتوا", "Content"],
      ["/social?tab=calendar", "تقویم انتشار", "Calendar"],
    ],
  },
  {
    href: "/lead-gen",
    fa: "تولید لید",
    en: "Lead Generation",
    icon: "Magnet",
    group: "business",
    description: [
      "فرم جذب، ورودی‌ها و تبدیل سرنخ به مخاطب CRM",
      "Capture leads and move qualified contacts into CRM",
    ],
    terms: "لید سرنخ جذب فرم lead generation form",
    links: [
      ["/lead-gen?tab=forms", "فرم‌های جذب", "Lead forms"],
      ["/lead-gen?tab=inbox", "سرنخ‌ها", "Lead inbox"],
    ],
  },
  {
    href: "/seo",
    fa: "فضای کار سئو",
    en: "SEO Workspace",
    icon: "Search",
    group: "business",
    description: [
      "سایت، کلمهٔ کلیدی و برنامهٔ محتوای جست‌وجو",
      "Sites, keywords and search content planning",
    ],
    terms: "سئو سایت کلمات کلیدی جستجو seo keyword",
    links: [
      ["/seo?view=sites", "سایت‌ها", "Sites"],
      ["/seo?view=keyword", "کلمات کلیدی", "Keywords"],
    ],
  },
  {
    href: "/seo/intelligence",
    fa: "SEO Intelligence",
    en: "SEO Intelligence",
    icon: "ChartNoAxesCombined",
    group: "business",
    description: [
      "پژوهش، رتبه و بک‌لینک؛ با وضعیت روشن منبع داده",
      "Research, rankings and backlinks with clear data provenance",
    ],
    terms: "رتبه بک لینک داده واقعی سرچ seo intelligence rank backlink",
    links: [
      ["/seo?tab=rankings", "رتبه‌ها", "Rankings"],
      ["/seo?tab=backlinks", "بک‌لینک‌ها", "Backlinks"],
    ],
  },
  {
    href: "/accounting",
    fa: "حسابداری",
    en: "Accounting",
    icon: "Calculator",
    group: "business",
    description: [
      "اسناد، هزینه‌ها، بانک، حقوق و صورت‌حساب مالک",
      "Journals, expenses, banking, payroll and owner statements",
    ],
    terms: "حسابداری مالی دفتر سند هزینه حقوق accounting finance",
    links: [
      ["/accounting?tab=journal", "اسناد", "Journals"],
      ["/accounting?tab=expenses", "هزینه‌ها", "Expenses"],
    ],
  },
  {
    href: "/meeting",
    fa: "اتاق جلسه هوش مصنوعی",
    en: "AI Meeting Room",
    icon: "MessagesSquare",
    group: "business",
    description: [
      "موضوع جلسه، دیدگاه مشاوران و اقدام‌های پس از جلسه",
      "Meeting context, advisor perspectives and follow-up actions",
    ],
    terms: "جلسه اتاق مشاور meeting room",
    links: [
      ["/meeting", "جلسهٔ تازه", "New meeting"],
      ["/meeting?tab=history", "جلسه‌های قبلی", "History"],
    ],
  },
  {
    href: "/ceo",
    fa: "مشاور مدیرعامل",
    en: "CEO Advisor",
    icon: "BriefcaseBusiness",
    group: "business",
    description: [
      "هدف‌ها، تصمیم‌ها و کارهای راهبردی کسب‌وکار",
      "Strategic goals, decisions and business tasks",
    ],
    terms: "مدیرعامل مدیریت هدف استراتژی ceo strategy",
    links: [
      ["/ceo?tab=goals", "هدف‌ها", "Goals"],
      ["/ceo?tab=orchestrator", "کارها", "Tasks"],
    ],
  },
  {
    href: "/video-factory",
    fa: "کارخانهٔ ویدیو",
    en: "Video Factory",
    icon: "Clapperboard",
    group: "content",
    description: [
      "ایده، سناریو، نماها، دارایی‌ها و برنامهٔ انتشار",
      "Ideas, scripts, scenes, assets and publishing plans",
    ],
    terms: "کارخانه ویدیو ویدی ویدئو سناریو فیلم video factory",
    links: [
      ["/video-factory?tab=production", "تولید", "Production"],
      ["/video-factory?tab=projects", "پروژه‌ها", "Projects"],
    ],
  },
  {
    href: "/student",
    fa: "فضای دانشجویی",
    en: "Student Workspace",
    icon: "GraduationCap",
    group: "study",
    description: [
      "درس‌ها، منابع، یادداشت و برنامهٔ مطالعه",
      "Subjects, resources, notes and study planning",
    ],
    terms: "دانشجو دانشجویی درس مطالعه دانشگاه student study",
    links: [
      ["/student?view=courses", "درس‌های من", "Subjects"],
      ["/student?view=planner", "برنامهٔ مطالعه", "Study plan"],
    ],
  },
  {
    href: "/fitness",
    fa: "فیتنس",
    en: "Fitness",
    icon: "Dumbbell",
    group: "fit",
    description: [
      "برنامهٔ تمرین، تغذیه و پیگیری روند ورزشی",
      "Workouts, nutrition and training progress",
    ],
    terms: "فیتنس ورزش تمرین بدنسازی تغذیه fitness fit workout",
    links: [
      ["/fitness?tab=programs", "برنامهٔ تمرین", "Programmes"],
      ["/fitness?tab=nutrition", "تغذیه", "Nutrition"],
    ],
  },
] as const;
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s‌ـ]/g, "");
export function ModuleDirectory({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { fa, tl } = useApp();
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("all");
  const rows = moduleDestinations.filter(
    (m) =>
      (group === "all" || group === m.group) &&
      normalize(
        m.fa + " " + m.en + " " + m.terms + " " + m.description.join(" "),
      ).includes(normalize(query)),
  );
  return (
    <section
      className={"module-directory " + (compact ? "compact" : "")}
      aria-label={tl("راهنمای ماژول‌ها", "Module directory")}
      id={compact ? undefined : "modules"}
    >
      <div className="directory-heading">
        <div>
          <span className="eyebrow orange-text">
            {tl("از هدفت شروع کن", "START WITH YOUR GOAL")}
          </span>
          <h2>
            {fa
              ? "امروز کدام کار را جلو می‌بری؟"
              : "What would you like to work on?"}
          </h2>
          <p>
            {fa
              ? "فضای مناسب کارت را پیدا کن و مستقیم وارد همان بخش شو."
              : "Find the right workspace and go straight to the task."}
          </p>
        </div>
        <label className="directory-search">
          <Icon name="Search" size={19} />
          <input
            aria-label={
              tl("جست‌وجوی ماژول یا هدف", "Search modules or goals")
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tl("مثلاً فروش، درس، تماس یا سئو…", "Try sales, study, calls or SEO…")
            }
          />
        </label>
      </div>
      <div
        className="chips directory-groups"
        aria-label={tl("دسته‌های ماژول", "Module categories")}
      >
        {[
          ["all", "همه", "All"],
          ["business", "کسب‌وکار", "Business"],
          ["content", "محتوا و ویدیو", "Content & video"],
          ["study", "یادگیری", "Learning"],
          ["fit", "سلامت و ورزش", "Fitness"],
        ].map(([id, a, b]) => (
          <button
            key={id}
            aria-pressed={id === group}
            className={id === group ? "selected" : ""}
            onClick={() => setGroup(id)}
          >
            {fa ? a : b}
          </button>
        ))}
      </div>
      {!compact && !query && group === "all" && (
        <Link
          onClick={onNavigate}
          href="/business-doctor"
          className="directory-doctor"
        >
          <span className="icon-chip amber">
            <Icon name="HeartPulse" size={30} />
          </span>
          <div>
            <span className="eyebrow">
              {tl("نقطهٔ شروع پیشنهادی برای کسب‌وکار", "A STARTING POINT FOR YOUR BUSINESS")}
            </span>
            <h3>
              {fa
                ? "نمی‌دانی از کجا شروع کنی؟ دکتر کسب‌وکار"
                : "Not sure where to begin? Business Doctor"}
            </h3>
            <p>
              {fa
                ? "ابتدا مسئله و هدف را روشن کن؛ سپس مسیر فروش، مالی یا محتوا را انتخاب کن."
                : "Clarify the challenge and goal, then choose a sales, finance or content workflow."}
            </p>
          </div>
          <Icon name="ArrowLeft" className="directional" />
        </Link>
      )}
      <div className="directory-grid">
        {rows.map((m) => (
          <article className="directory-card" key={m.fa}>
            <Link
              onClick={onNavigate}
              className="directory-card-main"
              href={m.href}
            >
              <span className="icon-chip orange">
                <Icon name={m.icon} size={23} />
              </span>
              <h3>{tl(m.fa, m.en)}</h3>
              <p>{tl(m.description[0], m.description[1])}</p>
              <span className="directory-enter">
                {fa ? "ورود به ماژول" : "Open workspace"}
                <Icon name="ArrowLeft" size={15} className="directional" />
              </span>
            </Link>
            {!compact && (
              <nav
                aria-label={
                  (tl("میان‌برهای ", "Shortcuts for ")) + (tl(m.fa, m.en))
                }
              >
                {m.links.map(([href, a, b]) => (
                  <Link key={href} href={href} onClick={onNavigate}>
                    {fa ? a : b}
                  </Link>
                ))}
              </nav>
            )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="panel" role="status">
          <h3>
            {fa ? "ماژولی با این عبارت پیدا نشد" : "No matching workspace"}
          </h3>
          <p>
            {tl("عبارت کوتاه‌تری مثل «فروش» یا «مطالعه» امتحان کن.", "Try a shorter task such as sales or study.")}
          </p>
          <button
            className="btn"
            onClick={() => {
              setQuery("");
              setGroup("all");
            }}
          >
            {tl("نمایش همهٔ ماژول‌ها", "Show all workspaces")}
          </button>
        </div>
      )}
    </section>
  );
}
