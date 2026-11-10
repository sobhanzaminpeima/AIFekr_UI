"use client";
import Link, { useSite } from "@/components/site-link";
import { LiveLandingGuides, LiveModuleExplorer } from "./live-public";
import { useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./ui";
import { modules } from "@/lib/upstream/registry";
const journeys = [
  {
    id: "business",
    fa: "کسب‌وکار و فروش",
    en: "Business & sales",
    icon: "Building2",
    title: [
      "از اولین آشنایی، تا همکاری ماندگار.",
      "From your first hello to a lasting partnership.",
    ],
    description: [
      "مخاطب را ثبت کن، فرصت فروش را جلو ببر و قدم بعدی را با بینش روشن انتخاب کن.",
      "Capture a contact, move an opportunity forward and choose your next step with clear insights.",
    ],
    steps: [
      ["سرنخ تازه", "New lead", "Magnet"],
      ["پرونده مشتری", "Customer record", "Users"],
      ["فرصت فروش", "Opportunity", "TrendingUp"],
      ["ثبت مالی", "Financial entry", "Receipt"],
    ],
    href: "/crm?tab=board",
    cta: ["فضای CRM را ببین", "Explore the CRM"],
    insight: [
      "برای هر فرصت، مسئول، تاریخ پیگیری و احتمال موفقیت را مشخص کن.",
      "Give every opportunity an owner, a follow-up date and a probability.",
    ],
  },
  {
    id: "create",
    fa: "تولید محتوا",
    en: "Content creation",
    icon: "Sparkles",
    title: [
      "یک ایده، چند شکل برای دیده‌شدن.",
      "One idea. More ways to be seen.",
    ],
    description: [
      "ایده را بنویس، متن و رسانه را بساز و محتوایت را برای کانال مناسب آماده کن.",
      "Describe the idea, create your copy and media, and prepare content for the right channel.",
    ],
    steps: [
      ["ایده و متن", "Idea & script", "Feather"],
      ["تصویر و صدا", "Image & voice", "AudioLines"],
      ["ویدیو و روایت", "Video & story", "Clapperboard"],
      ["تقویم محتوا", "Content calendar", "CalendarDays"],
    ],
    href: "/social?tab=content",
    cta: ["استودیوی محتوا را ببین", "Explore content tools"],
    insight: [
      "پیش از انتشار، لحن برند، متن و زمان مناسب را بازبینی کن.",
      "Review brand tone, content and timing before publishing.",
    ],
  },
  {
    id: "learn",
    fa: "یادگیری و پیشرفت",
    en: "Learning & progress",
    icon: "GraduationCap",
    title: [
      "از سؤال امروز، تا توانایی فردا.",
      "From today’s question to tomorrow’s skill.",
    ],
    description: [
      "منابع و درس‌ها را مرتب کن، یادداشت بردار و با مرور و تمرین مسیرت را ادامه بده.",
      "Organize your resources and subjects, take notes and keep progressing through practice.",
    ],
    steps: [
      ["درس و منابع", "Subjects & resources", "BookOpen"],
      ["یادداشت شخصی", "Personal notes", "Feather"],
      ["تمرین و آزمون", "Practice & quizzes", "ListChecks"],
      ["برنامه مطالعه", "Study planner", "CalendarDays"],
    ],
    href: "/student",
    cta: ["فضای یادگیری را ببین", "Explore learning"],
    insight: [
      "برنامه مطالعه را با امتحان‌ها و زمان واقعی در دسترست هماهنگ کن.",
      "Match your study plan to exams and the time you actually have.",
    ],
  },
];
export function LandingJourney() {
  const { fa, tl } = useApp();
  const [selected, setSelected] = useState("business");
  const [step, setStep] = useState(0);
  const journey = journeys.find((j) => j.id === selected)!;
  return (
    <section className="public-section connected-journey" id="workspace-demo">
      <div className="center-heading">
        <span className="eyebrow orange-text">
          AIFekr / CONNECTED WORKSPACE
        </span>
        <h2>
          {fa
            ? "ابزارهای جدا؟ نه، یک مسیر روشن."
            : "Your tools, connected by a clear path."}
        </h2>
        <p>
          {fa
            ? "ببین هر ایده چطور در فضای مناسب ادامه پیدا می‌کند."
            : "See how each idea moves forward in the right workspace."}
        </p>
      </div>
      <div
        className="journey-tabs"
        role="tablist"
        onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));const current=buttons.indexOf(document.activeElement as HTMLButtonElement);const delta=e.key==='ArrowRight'?(fa?-1:1):(fa?1:-1);const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+delta+buttons.length)%buttons.length;buttons[next]?.focus();buttons[next]?.click();}}
        aria-label={fa ? "مسیرهای استفاده" : "Workspace journeys"}
      >
        {journeys.map((j) => (
          <button
            role="tab"
            aria-selected={selected === j.id}
            tabIndex={selected===j.id?0:-1}
            aria-controls="journey-panel"
            id={"journey-" + j.id}
            key={j.id}
            onClick={() => {
              setSelected(j.id);
              setStep(0);
            }}
          >
            <Icon name={j.icon} size={19} />
            {tl(j.fa, j.en)}
          </button>
        ))}
      </div>
      <div
        className="journey-panel"
        id="journey-panel"
        role="tabpanel"
        aria-labelledby={"journey-" + selected}
      >
        <div className="journey-copy">
          <span className="eyebrow">{tl(journey.fa, journey.en)}</span>
          <h3>{tl(journey.title[0], journey.title[1])}</h3>
          <p>{tl(journey.description[0], journey.description[1])}</p>
          <Link className="btn primary" href={journey.href}>
            {tl(journey.cta[0], journey.cta[1])}
            <Icon name="ArrowLeft" size={17} />
          </Link>
          <span className="journey-preview-note">
            {fa
              ? "پیش‌نمایش تعاملی؛ بدون مصرف اعتبار"
              : "Interactive preview. No credits used."}
          </span>
        </div>
        <div className="journey-canvas">
          <div className="journey-window-top">
            <span>
              <i />
              <i />
              <i />
            </span>
            <small>AIFekr WORKSPACE</small>
            <Icon name="Sparkles" size={16} />
          </div>
          <div className="journey-flow">
            {journey.steps.map(([a, b, icon], i) => (
              <button
                key={a}
                className={step === i ? "selected" : ""}
                aria-pressed={step === i}
                onClick={() => setStep(i)}
              >
                <Icon name={icon} size={22} />
                <strong>{fa ? a : b}</strong>
                <span>0{i + 1}</span>
              </button>
            ))}
          </div>
          <div className="journey-focus">
            <span className="icon-chip orange">
              <Icon name={journey.steps[step][2]} size={27} />
            </span>
            <div>
              <small>{tl("قدم انتخاب‌شده", "SELECTED STEP")}</small>
              <h4>{journey.steps[step][fa ? 0 : 1]}</h4>
            </div>
            <span className="badge">
              {fa ? "در کنترل تو" : "You’re in control"}
            </span>
          </div>
          <div className="journey-copilot">
            <Icon name="Sparkles" size={20} />
            <div>
              <strong>AIFekr COPILOT</strong>
              <p>{tl(journey.insight[0], journey.insight[1])}</p>
            </div>
          </div>
          <div className="journey-mini-bars" aria-hidden="true">
            {[32, 55, 43, 72, 63, 87, 78, 98].map((v, i) => (
              <span key={i} style={{ height: v + "%" }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingModuleExplorer() {
  return useSite() ? <LiveModuleExplorer /> : <DemoModuleExplorer />;
}
function DemoModuleExplorer() {
  const { fa, n, tl } = useApp();
  const [group, setGroup] = useState("business");
  const [query, setQuery] = useState("");
  const visible = modules.filter(
    (m) =>
      m.group === group &&
      (tl(m.title[0], m.title[1]) + " " + tl(m.subtitle[0], m.subtitle[1]))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="public-section landing-explorer" id="all-tools">
      <div className="explorer-heading">
        <div>
          <span className="eyebrow orange-text">AIFekr / YOUR TOOLKIT</span>
          <h2>
            {fa
              ? "فضای مناسب کارت را پیدا کن."
              : "Find the right workspace for your work."}
          </h2>
          <p>
            {fa
              ? "هر ماژول، ابزارها و مسیر مخصوص خودش را دارد."
              : "Every module has its own tools and workflow."}
          </p>
        </div>
        <label className="explorer-search">
          <Icon name="Search" size={17} />
          <input
            aria-label={tl("جستجوی ماژول‌ها", "Search modules")}
            placeholder={
              fa ? "دنبال چه ابزاری هستی؟" : "What tool are you looking for?"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="chips">
        {[
          ["business", "کسب‌وکار", "Business"],
          ["create", "خلاقیت", "Create"],
          ["learn", "یادگیری", "Learn"],
          ["fit", "ورزش", "FIT"],
          ["account", "حساب و درآمد", "Account & earnings"],
        ].map(([id, a, b]) => (
          <button
            key={id}
            className={group === id ? "selected" : ""}
            aria-pressed={group === id}
            onClick={() => {
              setGroup(id);
              setQuery("");
            }}
          >
            {fa ? a : b}
          </button>
        ))}
      </div>
      <div className="explorer-grid">
        {visible.map((m) => (
          <Link href={"/features/" + m.id} className="explorer-card" key={m.id}>
            <span className={`icon-chip ${m.accent}`}>
              <Icon name={m.icon} size={25} />
            </span>
            <h3>{tl(m.title[0], m.title[1])}</h3>
            <p>{tl(m.subtitle[0], m.subtitle[1])}</p>
            <div>
              <span>
                {n(m.views.length)} {fa ? "بخش تخصصی" : "specialist sections"}
              </span>
              <Icon name="ArrowUpLeft" size={17} />
            </div>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <p className="explorer-empty" role="status">
          {fa
            ? "ابزاری با این نام در این دسته پیدا نشد."
            : "No matching tools in this category."}
        </p>
      )}
    </section>
  );
}

export function LandingDetails() {
  const { fa, tl } = useApp();
  const live = useSite();
  return (
    <>
      <section className="public-section landing-business" id="business-tools">
        <div className="business-feature-copy">
          <span className="eyebrow orange-text">
            AIFekr / BUSINESS INTELLIGENCE
          </span>
          <h2>
            {fa
              ? "از رابطه با مشتری،\nتا تصویر مالی کسب‌وکار."
              : "From customer relationships\nto your financial picture."}
          </h2>
          <p>
            {fa
              ? "CRM و حسابداری، هرکدام فضای تخصصی خودشان را دارند؛ همراه با بینش‌هایی که کمک می‌کنند موضوع مهم بعدی را پیدا کنی."
              : "CRM and accounting each have specialist workspaces, with insights that help you find what needs attention next."}
          </p>
          <div className="domain-actions">
            <Link href="/crm?tab=board" className="btn primary">
              {tl("کشف CRM", "Explore CRM")}
              <Icon name="ArrowLeft" size={16} />
            </Link>
            <Link href="/accounting" className="btn">
              {fa ? "دیدن دفتر مالی" : "Explore accounting"}
            </Link>
          </div>
        </div>
        <div className="business-preview-stack">
          <div className="panel">
            <div className="row-between">
              <span className="eyebrow">RELATIONSHIP INTELLIGENCE</span>
              <Icon name="Users" size={21} />
            </div>
            <h3>
              {fa
                ? "فروش را با قدم بعدی جلو ببر."
                : "Move sales forward with a next step."}
            </h3>
            <div className="mini-pipeline">
              {(fa
                ? ["آشنایی", "مذاکره", "همکاری"]
                : ["Connect", "Discuss", "Partner"]
              ).map((s, i) => (
                <div key={s}>
                  <span>{s}</span>
                  <i />
                  <i style={{ opacity: i === 1 ? 0.4 : 0.15 }} />
                </div>
              ))}
            </div>
            <Link href="/features/crm" className="text-link">
              {fa
                ? "مخاطبان، فرصت‌ها و پیگیری‌ها"
                : "Contacts, opportunities & follow-ups"}{" "}
              ↗
            </Link>
          </div>
          <div className="panel finance-feature-card">
            <div className="row-between">
              <span className="eyebrow">FINANCIAL INTELLIGENCE</span>
              <Icon name="BookOpen" size={21} />
            </div>
            <h3>
              {fa
                ? "هر ثبت، یک تصویر روشن‌تر."
                : "Every entry makes the picture clearer."}
            </h3>
            <div className="finance-preview-check">
              <Icon name="CheckCircle2" size={18} />
              {fa
                ? "سند تراز · تطبیق بانک · کنترل دوره"
                : "Balanced journals · Bank matching · Period control"}
            </div>
            <Link href="/features/accounting" className="text-link">
              {fa
                ? "آشنایی با فضای حسابداری"
                : "Explore the financial workspace"}{" "}
              ↗
            </Link>
          </div>
        </div>
      </section>
      <section className="public-section landing-learning">
        <span className="eyebrow">LEARN. PRACTICE. KEEP GOING.</span>
        <h2>
          {fa ? "رشد، فقط برای کسب‌وکار نیست." : "Growth is personal, too."}
        </h2>
        <div className="personal-worlds">
          {[
            [
              "/student",
              "GraduationCap",
              "blue",
              "یک همراه برای مسیر یادگیری",
              "A companion for your learning",
              "درس، منابع، برنامه مطالعه و تمرین؛ کنار هم.",
              "Subjects, resources, study plans and practice together.",
              "کشف فضای دانشجویی",
              "Explore student tools",
            ],
            [
              "/fitness",
              "Dumbbell",
              "lime",
              "هر روز، کمی قوی‌تر",
              "A little stronger, every day",
              "برنامه تمرین، ثبت ست‌ها، تغذیه و مرور پیشرفت.",
              "Workout programs, set logging, nutrition and progress.",
              "کشف فضای فیتنس",
              "Explore FIT",
            ],
          ].map(([url, icon, color, a, b, c, d, cta, ctaEn]) => (
            <Link className={"personal-world " + color} href={url} key={url}>
              <span className={`icon-chip ${color}`}>
                <Icon name={icon} size={38} />
              </span>
              <h3>{fa ? a : b}</h3>
              <p>{fa ? c : d}</p>
              <span className="text-link">
                {fa ? cta : ctaEn}
                <Icon name="ArrowLeft" size={17} />
              </span>
              <div className="personal-orbit" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      {live ? <LiveLandingGuides /> : <section className="public-section landing-guides" id="practical-guides">
        <div className="row-between">
          <div>
            <span className="eyebrow orange-text">
              AIFekr / PRACTICAL GUIDES
            </span>
            <h2>
              {tl("از ابزار تا نتیجه، قدم‌به‌قدم.", "From tools to outcomes, step by step.")}
            </h2>
          </div>
          <Link href="/guides" className="text-link">
            {tl("همه راهنماها", "All guides")} ←
          </Link>
        </div>
        <div className="three-cols">
          {[
            [
              "business-workspace",
              "Users",
              "مدیریت و پیگیری مشتری",
              "Manage and follow up with customers",
              "از ثبت مخاطب تا تعیین قدم بعدی در فروش.",
              "From capturing contacts to defining the next sales action.",
            ],
            [
              "creative-studio",
              "Sparkles",
              "از ایده تا محتوای آماده",
              "From idea to prepared content",
              "شرح دقیق، انتخاب قالب و بازبینی نتیجه.",
              "A clear brief, a suitable format and a reviewed result.",
            ],
            [
              "learning",
              "BookOpen",
              "برنامه‌ریزی برای یادگیری",
              "Plan your learning",
              "منابع را مرتب کن و برای تمرین زمان بگذار.",
              "Organize resources and make time for practice.",
            ],
          ].map(([id, icon, a, b, c, d], i) => (
            <Link
              className="landing-guide-card"
              href={"/guides/" + id}
              key={id}
            >
              <div>
                <span>0{i + 1}</span>
                <Icon name={icon} size={26} />
              </div>
              <h3>{fa ? a : b}</h3>
              <p>{fa ? c : d}</p>
              <span className="text-link">
                {tl("خواندن راهنما", "Read guide")} ↗
              </span>
            </Link>
          ))}
        </div>
      </section>}
    </>
  );
}
