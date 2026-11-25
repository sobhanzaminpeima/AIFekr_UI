"use client";
import { useState } from "react";
import { useApp } from "./providers";
import Link from "./site-link";
import { Icon } from "./ui";
import { useLiveData, liveRows } from "./live-module-kit";

const API = "/api/student/";
type CoachTask = { id: string; title: string; dueAt?: string | null; completedAt?: string | null; generated?: boolean };
type CoachExam = { id: string; title: string; examAt: string };

/**
 * Study coach: follows the student's own exams, generated study-plan tasks and
 * timer sessions, and says plainly what to do next. Rule-based, from real data only.
 */
export function StudyCoach() {
  const { tl, n, locale } = useApp();
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const tasks = useLiveData(API + "tasks");
  const exams = useLiveData(API + "exams");
  const report = useLiveData(API + "study-sessions?days=7&timeZone=" + encodeURIComponent(tz));
  const [busy, setBusy] = useState("");
  const now = Date.now();
  const all = liveRows(tasks.data?.tasks) as unknown as CoachTask[];
  const open = all.filter((t) => !t.completedAt);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now);
  const today = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= now && new Date(t.dueAt).getTime() <= dayEnd.getTime());
  const upcoming = (liveRows(exams.data?.exams) as unknown as CoachExam[])
    .filter((e) => new Date(e.examAt).getTime() > now)
    .sort((a, b) => a.examAt.localeCompare(b.examAt));
  const next = upcoming[0];
  const plan = next ? all.filter((t) => t.generated && t.title.includes(next.title)) : [];
  const planDone = plan.filter((t) => t.completedAt).length;
  const planDue = plan.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= now).length;
  const daysLeft = next ? Math.max(0, Math.ceil((new Date(next.examAt).getTime() - now) / 86400000)) : 0;
  const byDay = (report.data?.byDay ?? []) as { day: string; seconds: number }[];
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const studiedToday = Math.round((byDay.find((d) => d.day === todayKey)?.seconds ?? 0) / 60);
  const timerRunning = !!report.data?.active;

  const tips: { tone: "red" | "orange" | "green" | "blue"; icon: string; text: string; href?: string; cta?: string }[] = [];
  if (next && !plan.length)
    tips.push({ tone: "orange", icon: "CalendarDays", text: tl(`برای «${next.title}» هنوز برنامهٔ مطالعه نساخته‌ای؛ ${n(daysLeft)} روز وقت داری.`, `No study plan yet for "${next.title}"; ${daysLeft} days left.`), href: "/student?view=planner", cta: tl("ساخت برنامه", "Build plan") });
  if (overdue.length)
    tips.push({ tone: "red", icon: "Clock", text: tl(`${n(overdue.length)} کار از برنامه‌ات عقب افتاده؛ امروز جبرانش کن.`, `${overdue.length} planned tasks are overdue; catch up today.`) });
  if (next && planDue > planDone)
    tips.push({ tone: "orange", icon: "BarChart3", text: tl(`برای «${next.title}» ${n(planDue - planDone)} جلسه از برنامه عقبی؛ امروز دو جلسهٔ ۲۵ دقیقه‌ای مطالعه کن.`, `You are ${planDue - planDone} sessions behind for "${next.title}"; do two 25-minute sessions today.`) });
  if (!studiedToday && !timerRunning)
    tips.push({ tone: "blue", icon: "Play", text: tl("امروز هنوز مطالعه‌ای ثبت نشده؛ تایمر را روشن کن تا پیشرفتت حساب شود.", "No study logged today; start the timer so it counts."), href: "/student?view=reports", cta: tl("شروع تایمر", "Start timer") });
  if (studiedToday >= 50)
    tips.push({ tone: "green", icon: "Flame", text: tl(`عالی! امروز ${n(studiedToday)} دقیقه مطالعه کردی.`, `Great! ${studiedToday} minutes studied today.`) });
  if (!next && !open.length)
    tips.push({ tone: "blue", icon: "CalendarDays", text: tl("امتحان‌هایت را ثبت کن تا برایت برنامه بچینم و روزبه‌روز پیگیری کنم.", "Add your exams and I will plan and track your study day by day."), href: "/student?view=planner", cta: tl("ثبت امتحان", "Add exam") });

  async function done(id: string) {
    setBusy(id);
    try {
      await fetch(API + "tasks/" + encodeURIComponent(id), { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: true }) });
      tasks.reload();
    } finally {
      setBusy("");
    }
  }
  const list = [...overdue, ...today].slice(0, 5);
  return (
    <section className="panel coach">
      <header>
        <span className="sd-ai">AI</span>
        <div>
          <h3>{tl("دستیار پیگیری تحصیلی", "Study coach")}</h3>
          <small>{tl("امتحان‌ها، برنامهٔ مطالعه و زمان مطالعه‌ات را هر روز دنبال می‌کند.", "Follows your exams, study plan and study time every day.")}</small>
        </div>
      </header>
      <div className="coach-grid">
        <div className="coach-exam">
          {next ? (
            <>
              <small>{tl("نزدیک‌ترین امتحان", "Next exam")}</small>
              <b>{next.title}</b>
              <div className="coach-count"><strong>{n(daysLeft)}</strong><span>{tl("روز مانده", "days left")}</span></div>
              <small>{new Date(next.examAt).toLocaleString(locale, { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
              {plan.length > 0 && (
                <>
                  <div className="sq-progress"><i style={{ width: `${Math.round((planDone / plan.length) * 100)}%` }} /></div>
                  <small>{tl(`برنامهٔ مطالعه: ${n(planDone)} از ${n(plan.length)} جلسه انجام شده`, `Study plan: ${planDone} of ${plan.length} sessions done`)}</small>
                </>
              )}
            </>
          ) : (
            <p className="sd-empty">{tl("امتحانی در پیش نداری.", "No upcoming exams.")}</p>
          )}
        </div>
        <div className="coach-tips">
          {tips.slice(0, 3).map((t, i) => (
            <div className={"coach-tip " + t.tone} key={i}>
              <Icon name={t.icon} size={18} />
              <span>{t.text}</span>
              {t.href && <Link className="btn" href={t.href}>{t.cta}</Link>}
            </div>
          ))}
          {list.length > 0 && (
            <ul className="coach-tasks">
              {list.map((t) => (
                <li key={t.id} className={t.dueAt && new Date(t.dueAt).getTime() < now ? "late" : ""}>
                  <span>{t.title}</span>
                  <small>{t.dueAt ? new Date(t.dueAt).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</small>
                  <button type="button" className="btn" disabled={busy === t.id} onClick={() => void done(t.id)}>✓ {tl("انجام شد", "Done")}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Eye-catching explanation of the study timer: why to keep it on while studying. */
export function TimerCallout() {
  const { tl } = useApp();
  return (
    <section className="timer-callout">
      <span className="timer-callout-icon"><Icon name="Clock" size={30} /></span>
      <div>
        <b>{tl("هر وقت درس می‌خوانی، تایمر را روشن کن ⏱", "Turn the timer on whenever you study ⏱")}</b>
        <p>{tl("تایمر زمان واقعی مطالعه‌ات را برای هر درس ثبت می‌کند. نمودار هفتگی، روزهای مطالعهٔ پیاپی، نشان‌ها و پیگیری برنامهٔ امتحان همه از همین زمان ساخته می‌شوند. هر دور ۲۵ دقیقه است؛ برای استراحت «توقف موقت» بزن و آخر کار «پایان و ذخیره».", "The timer records your real study time per subject. Your weekly chart, streak, badges and exam-plan tracking all come from it. Each round is 25 minutes; pause for breaks and press Finish & save at the end.")}</p>
      </div>
      <Link className="btn primary" href="/student?view=reports">{tl("شروع تایمر", "Start timer")}</Link>
    </section>
  );
}
