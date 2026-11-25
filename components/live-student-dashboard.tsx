"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import Link, { useSite } from "./site-link";
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
  const insights = useLiveData(API + "insights?timeZone=" + encodeURIComponent(tz));
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
    ["Flame", tl("روز مطالعه متوالی", "Day study streak"), Number(insights.data?.streak ?? 0), "red"],
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
        <img src={(process.env.NODE_ENV === "production" ? "/_v2/art/" : "/art/") + "student-overview.webp"} alt="" aria-hidden="true" />
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

      <div className="sd-grid three">
        <StudentIdCard />
        <Badges data={insights.data?.badges as { id: string; earned: boolean }[] | undefined} />
        <Activity data={insights.data?.activity as { kind: string; title: string; at: string }[] | undefined} />
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

const BADGE_COPY: Record<string, [string, string, string, string, string]> = {
  first_course: ["BookOpen", "اولین درس", "First subject", "یک درس ساختی", "Created a subject"],
  five_sources: ["FileText", "کتابخانه‌دار", "Librarian", "۵ جزوه آپلود کردی", "Uploaded 5 sources"],
  first_quiz: ["CircleCheck", "اولین آزمون", "First quiz", "یک آزمون دادی", "Finished a quiz"],
  quiz_ace: ["Trophy", "نمرهٔ عالی", "Quiz ace", "۹۰٪ یا بیشتر در آزمون", "Scored 90%+"],
  card_reviewer: ["Layers", "مرورگر", "Reviewer", "۲۰ فلش‌کارت مرور شد", "Reviewed 20 cards"],
  streak_3: ["Flame", "۳ روز پیاپی", "3-day streak", "۳ روز پشت‌سرهم مطالعه", "Studied 3 days in a row"],
  streak_7: ["Flame", "۷ روز پیاپی", "7-day streak", "یک هفته مطالعهٔ مداوم", "Studied 7 days in a row"],
  group_member: ["Users", "مطالعهٔ گروهی", "Study buddy", "عضو گروه مطالعه شدی", "Joined a study group"],
};

function Badges({ data }: { data?: { id: string; earned: boolean }[] }) {
  const { tl, fa, n } = useApp();
  const earned = data?.filter((b) => b.earned).length ?? 0;
  return (
    <section className="panel sd-card">
      <header><h3><Icon name="Trophy" size={18} />{tl("دستاوردها و نشان‌ها", "Achievements")}</h3><small>{n(earned)} / {n(data?.length ?? 0)}</small></header>
      <div className="sd-badges">
        {(data ?? []).map((b) => {
          const c = BADGE_COPY[b.id];
          if (!c) return null;
          return (
            <div key={b.id} className={"sd-medal" + (b.earned ? " earned" : "")} title={fa ? c[3] : c[4]}>
              <span><Icon name={c[0]} size={20} /></span>
              <b>{fa ? c[1] : c[2]}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Activity({ data }: { data?: { kind: string; title: string; at: string }[] }) {
  const { tl, locale } = useApp();
  const label: Record<string, [string, string, string]> = {
    material: ["Upload", tl("آپلود جزوه", "Uploaded"), ""],
    note: ["PenLine", tl("یادداشت", "Note"), ""],
    quiz: ["CircleCheck", tl("آزمون", "Quiz"), ""],
    flashcards: ["Layers", tl("ساخت فلش‌کارت", "Flashcards"), ""],
    session: ["Clock", tl("جلسه مطالعه", "Study session"), ""],
  };
  const ago = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (mins < 60) return rtf.format(-mins, "minute");
    if (mins < 1440) return rtf.format(-Math.round(mins / 60), "hour");
    return rtf.format(-Math.round(mins / 1440), "day");
  };
  return (
    <section className="panel sd-card">
      <header><h3><Icon name="Clock" size={18} />{tl("فعالیت‌های اخیر", "Recent activity")}</h3></header>
      {(data ?? []).slice(0, 5).map((a, i) => {
        const l = label[a.kind] ?? label.note;
        return (
          <div className="sd-row" key={i}>
            <span className="sd-row-icon"><Icon name={l[0]} size={16} /></span>
            <span className="sd-row-main"><b>{l[1]}{a.title ? ": " + a.title : ""}</b><small>{ago(a.at)}</small></span>
          </div>
        );
      })}
      {data && !data.length && <p className="sd-empty">{tl("هنوز فعالیتی ثبت نشده.", "No activity yet.")}</p>}
    </section>
  );
}

/** Platform student card with a QR code that opens the public verification page. Not an official university ID. */
function StudentIdCard() {
  const { tl } = useApp();
  const profile = useSite()?.studentProfile;
  const [qr, setQr] = useState("");
  const url = profile?.slug && typeof window !== "undefined" ? `${window.location.origin}/student/${profile.slug}` : "";
  useEffect(() => {
    if (!url) return;
    let alive = true;
    void import("qrcode").then((QR) => QR.toDataURL(url, { margin: 1, width: 168, color: { dark: "#111111", light: "#ffffff" } })).then((d) => { if (alive) setQr(d); }).catch(() => {});
    return () => { alive = false; };
  }, [url]);
  return (
    <section className="panel sd-card sd-idcard">
      <header><h3><Icon name="IdCard" size={18} />{tl("کارت دانشجویی", "Student card")}</h3></header>
      {profile ? (
        <div className="sd-id">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile.avatar ? <img className="sd-id-avatar" src={profile.avatar} alt="" /> : <span className="sd-id-avatar"><Icon name="UserRound" size={28} /></span>}
          <div className="sd-id-main">
            <b>{profile.name || tl("دانشجو", "Student")}</b>
            <small>AIFekr Student · {profile.slug}</small>
            <div className="sd-id-actions">
              <Link className="btn" href={"/student/" + profile.slug}>{tl("مشاهده کارت", "View card")}</Link>
              {url && <button type="button" className="btn" onClick={() => void navigator.clipboard?.writeText(url)}>{tl("کپی لینک", "Copy link")}</button>}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img className="sd-id-qr" src={qr} alt={tl("کد QR تأیید کارت", "Card verification QR code")} />}
        </div>
      ) : (
        <p className="sd-empty">{tl("برای ساخت کارت، پروفایل دانشجویی را کامل کن.", "Complete your student profile to get your card.")} <Link href="/student?view=profile">{tl("تکمیل پروفایل", "Complete profile")}</Link></p>
      )}
      <p className="sd-fine">{tl("این کارت عضویت در AIFekr است و جایگزین کارت رسمی دانشگاه نیست.", "This is an AIFekr membership card, not an official university ID.")}</p>
    </section>
  );
}

/** Student profile header for /student?view=profile, built from the real profile, academic profile, plan and insights. */
export function StudentProfileHero() {
  const { tl, n, locale } = useApp();
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const site = useSite()?.studentProfile;
  const profile = useLiveData("/api/user/profile");
  const academic = useLiveData("/api/student/academic-profile");
  const insights = useLiveData(API + "insights?timeZone=" + encodeURIComponent(tz));
  const user = (profile.data?.user ?? profile.data) as { name?: string | null; email?: string | null; plan?: string; planExpiry?: string | null; credits?: number; createdAt?: string } | null | undefined;
  const ap = academic.data?.profile as { institution?: string; educationLevel?: string; faculty?: string; major?: { name?: string } | null } | null | undefined;
  const majors = (academic.data?.majors ?? []) as { id: string; name: string }[];
  const majorName = ap?.major?.name || majors.find((m) => m.id === (ap as { majorId?: string } | null | undefined)?.majorId)?.name || "";
  const stats = (insights.data?.stats ?? {}) as Record<string, number>;
  const left = user?.planExpiry ? Math.max(0, Math.ceil((new Date(user.planExpiry).getTime() - Date.now()) / 86400000)) : 0;
  const chips = [majorName, ap?.educationLevel, ap?.institution].filter(Boolean) as string[];
  return (
    <div className="sp">
      <section className="panel sp-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sp-cover" src={(process.env.NODE_ENV === "production" ? "/_v2/art/" : "/art/") + "student-profile.webp"} alt="" aria-hidden="true" />
        <div className="sp-avatar">{site?.avatar ? <img src={site.avatar} alt="" /> : <Icon name="UserRound" size={44} />}</div>
        <div className="sp-main">
          <h2>{tl(`سلام ${user?.name || site?.name || ""}`, `Hi ${user?.name || site?.name || ""}`)} <span aria-hidden="true">👋</span></h2>
          <p>{tl("به داشبورد دانشجویی خودت خوش آمدی", "Welcome to your student dashboard")}</p>
          <div className="sp-chips">
            {chips.length ? chips.map((c) => <span key={c}>{c}</span>) : <span className="muted">{tl("رشته و دانشگاهت را پایین همین صفحه ثبت کن", "Add your major and university below")}</span>}
          </div>
        </div>
      </section>
      <div className="sp-stats">
        {[
          ["CalendarDays", tl("روز تا پایان اشتراک", "Days left on plan"), n(left), "orange"],
          ["Sparkles", tl("کردیت", "Credits"), n(Number(user?.credits ?? 0)), "violet"],
          ["BookOpen", tl("درس فعال", "Active subjects"), n(Number(stats.courses ?? 0)), "green"],
          ["FileText", tl("جزوه و فایل", "Notes & files"), n(Number(stats.materials ?? 0)), "blue"],
          ["CircleCheck", tl("آزمون شرکت‌کرده", "Quizzes taken"), n(Number(stats.quizAttempts ?? 0)), "red"],
        ].map(([icon, label, value, tone]) => (
          <div className={`panel sd-stat ${tone}`} key={label}>
            <span className="sd-stat-icon"><Icon name={icon} size={22} /></span>
            <div><strong>{value}</strong><small>{label}</small></div>
          </div>
        ))}
      </div>
      <div className="sd-grid">
        <StudentIdCard />
        <Badges data={insights.data?.badges as { id: string; earned: boolean }[] | undefined} />
      </div>
      {user?.planExpiry && <p className="sd-fine">{tl("اعتبار اشتراک تا ", "Plan valid until ")}{new Date(user.planExpiry).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })}</p>}
    </div>
  );
}
