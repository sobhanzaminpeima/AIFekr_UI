"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import Link from "./site-link";
import { Icon } from "./ui";
import { useLiveData, liveRows, type LiveRow } from "./live-module-kit";

/**
 * Student overview, after the owner's 2026-11-24 mockups. Everything shown is
 * read from the real student APIs; sections with no data show an empty state
 * instead of sample content.
 */
const API = "/api/student/";
const DAY = 86400000;

export function StudentDashboard() {
  const { tl, n, locale } = useApp();
  const router = useRouter();
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const profile = useLiveData("/api/user/profile");
  const courses = useLiveData(API + "courses");
  const exams = useLiveData(API + "exams");
  const report = useLiveData(API + "study-sessions?days=7&timeZone=" + encodeURIComponent(tz));
  const [question, setQuestion] = useState("");

  const user = (profile.data?.user ?? profile.data) as { name?: string | null; firstName?: string | null } | null | undefined;
  const name = user?.firstName || user?.name?.split(" ")[0] || "";
  const courseRows = liveRows(courses.data?.courses);
  const count = (key: string) => courseRows.reduce((s, c) => s + Number((c._count as LiveRow | undefined)?.[key] ?? 0), 0);
  const upcoming = liveRows(exams.data?.exams).filter((e) => new Date(String(e.examAt)).getTime() >= Date.now() - DAY).slice(0, 4);
  const byDay = (report.data?.byDay ?? []) as { day: string; seconds: number }[];
  const week = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * DAY);
      const key = fmt.format(date);
      return { label: date.toLocaleDateString(locale, { weekday: "narrow" }), seconds: byDay.find((d) => d.day === key)?.seconds ?? 0 };
    });
  }, [byDay, locale, tz]);
  const weekMinutes = Math.round(week.reduce((s, d) => s + d.seconds, 0) / 60);
  const peak = Math.max(1, ...week.map((d) => d.seconds));
  const daysLeft = (iso: unknown) => Math.max(0, Math.ceil((new Date(String(iso)).getTime() - Date.now()) / DAY));

  const stats: [string, string, number | string, string][] = [
    ["BookOpen", tl("درس فعال", "Active subjects"), courseRows.length, "violet"],
    ["FileText", tl("جزوه و منبع", "Sources"), count("materials"), "blue"],
    ["CircleCheck", tl("آزمون ساخته‌شده", "Quizzes made"), count("quizzes"), "green"],
    ["Clock", tl("دقیقه مطالعه این هفته", "Study minutes this week"), weekMinutes, "orange"],
  ];
  const quick: [string, string, string][] = [
    ["/student?view=upload", "Upload", tl("آپلود جزوه", "Upload notes")],
    ["/student?view=practice", "CircleCheck", tl("ساخت آزمون", "Make a quiz")],
    ["/student?view=review", "Layers", tl("فلش‌کارت", "Flashcards")],
    ["/student?view=planner", "CalendarDays", tl("برنامه امتحان", "Exam plan")],
    ["/student?view=courses", "Plus", tl("افزودن درس", "Add subject")],
    ["/student?view=groups", "Users", tl("گروه مطالعه", "Study group")],
  ];

  return (
    <div className="sd">
      <section className="sd-welcome panel">
        <img src="/art/student-hero.webp" alt="" aria-hidden="true" />
        <div>
          <h2>{name ? tl(`سلام ${name}!`, `Hi ${name}!`) : tl("سلام، دانشجوی عزیز!", "Hi there!")} <span aria-hidden="true">👋</span></h2>
          <p>{tl("درس بخوان، جزوه بساز، تمرین کن، آزمون بده و با هوش مصنوعی موفق‌تر باش.", "Study, upload notes, practise, take quizzes and learn faster with AI.")}</p>
        </div>
      </section>

      <div className="sd-stats">
        {stats.map(([icon, label, value, tone]) => (
          <div className={`panel sd-stat ${tone}`} key={label}>
            <span className="sd-stat-icon"><Icon name={icon} size={22} /></span>
            <div><strong>{typeof value === "number" ? n(value) : value}</strong><small>{label}</small></div>
          </div>
        ))}
      </div>

      <div className="sd-grid">
        <section className="panel sd-card">
          <header><h3><Icon name="Layers" size={18} />{tl("درس‌های فعال من", "My active subjects")}</h3></header>
          {courseRows.slice(0, 4).map((c) => {
            const k = c._count as LiveRow | undefined;
            return (
              <Link className="sd-row" key={String(c.id)} href="/student?view=courses">
                <span className="sd-row-icon"><Icon name="BookOpen" size={18} /></span>
                <span className="sd-row-main"><b>{String(c.name)}</b><small>{n(Number(k?.materials ?? 0))} {tl("منبع", "sources")} · {n(Number(k?.flashcards ?? 0))} {tl("فلش‌کارت", "cards")}</small></span>
              </Link>
            );
          })}
          {!courseRows.length && <p className="sd-empty">{tl("هنوز درسی نساخته‌ای.", "No subjects yet.")}</p>}
          <Link className="sd-more" href="/student?view=courses">{tl("مدیریت درس‌ها", "Manage subjects")} ←</Link>
        </section>

        <section className="panel sd-card">
          <header><h3><Icon name="CalendarDays" size={18} />{tl("امتحان‌های پیش‌رو", "Upcoming exams")}</h3></header>
          {upcoming.map((e) => (
            <div className="sd-row" key={String(e.id)}>
              <span className="sd-row-icon"><Icon name="GraduationCap" size={18} /></span>
              <span className="sd-row-main"><b>{String(e.title)}</b><small>{new Date(String(e.examAt)).toLocaleDateString(locale, { month: "long", day: "numeric" })}{(e.course as LiveRow | undefined)?.name ? " · " + String((e.course as LiveRow).name) : ""}</small></span>
              <span className={"sd-badge" + (daysLeft(e.examAt) <= 3 ? " hot" : "")}>{n(daysLeft(e.examAt))} {tl("روز مانده", "days left")}</span>
            </div>
          ))}
          {!upcoming.length && <p className="sd-empty">{tl("امتحانی ثبت نشده.", "No exams scheduled.")}</p>}
          <Link className="sd-more" href="/student?view=planner">{tl("مشاهده برنامه کامل", "Open full plan")} ←</Link>
        </section>

        <section className="panel sd-card">
          <header><h3><Icon name="LayoutGrid" size={18} />{tl("دسترسی سریع", "Quick access")}</h3></header>
          <div className="sd-quick">
            {quick.map(([href, icon, label], i) => (
              <Link key={href} href={href} className={i === 0 ? "primary" : ""}><Icon name={icon} size={20} /><span>{label}</span></Link>
            ))}
          </div>
        </section>

        <section className="panel sd-card">
          <header><h3><Icon name="BarChart3" size={18} />{tl("پیشرفت هفتگی مطالعه", "Weekly study")}</h3><small>{n(weekMinutes)} {tl("دقیقه", "min")}</small></header>
          <div className="sd-chart" role="img" aria-label={tl("دقیقه‌های مطالعه در ۷ روز اخیر", "Study minutes over the last 7 days")}>
            {week.map((d, i) => (
              <div key={i} title={`${n(Math.round(d.seconds / 60))} ${tl("دقیقه", "min")}`}>
                <i style={{ height: `${Math.max(4, (d.seconds / peak) * 100)}%` }} className={i === 6 ? "today" : ""} />
                <span>{d.label}</span>
              </div>
            ))}
          </div>
          {!weekMinutes && <p className="sd-empty">{tl("با زمان‌سنج مطالعه، نمودارت پر می‌شود.", "Use the study timer to fill this chart.")}</p>}
        </section>
      </div>

      <form className="panel sd-ask" onSubmit={(e) => { e.preventDefault(); router.push("/student?view=chat" + (question.trim() ? "&q=" + encodeURIComponent(question.trim()) : "")); }}>
        <span className="sd-ai">AI</span>
        <div>
          <h3>{tl("دستیار هوشمند دانشجو", "Student AI assistant")}</h3>
          <p>{tl("هر سؤال درسی، مفهومی یا پژوهشی داری بپرس.", "Ask any study, concept or research question.")}</p>
          <div className="sd-ask-input">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={tl("سؤال خود را بنویسید…", "Type your question…")} aria-label={tl("سؤال برای دستیار", "Question for the assistant")} />
            <button type="submit" aria-label={tl("ارسال", "Send")}><Icon name="ArrowLeft" size={18} /></button>
          </div>
        </div>
      </form>
    </div>
  );
}
