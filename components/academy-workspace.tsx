"use client";
import { useState } from "react";
import Link from "@/components/site-link";
import { useSearchParams } from "next/navigation";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, download } from "./ui";
import { Learning } from "./learning";
import { StudentWorkspace } from "./student-workspace";
type Lesson = {
  id: string;
  fa: string;
  en: string;
  bodyFa: string;
  bodyEn: string;
  exerciseFa: string;
  exerciseEn: string;
};
type Course = {
  id: string;
  fa: string;
  en: string;
  descriptionFa: string;
  descriptionEn: string;
  icon: string;
  lessons: Lesson[];
};
const courses: Course[] = [
  {
    id: "ai-basics",
    fa: "شروع کار با ابزارهای هوش مصنوعی",
    en: "Getting started with AI tools",
    descriptionFa: "هدف روشن، ورودی دقیق و بازبینی خروجی در یک مسیر کوتاه.",
    descriptionEn:
      "Clear goals, precise inputs and thoughtful review in a short learning path.",
    icon: "Sparkles",
    lessons: [
      {
        id: "brief",
        fa: "از خواسته روشن شروع کن",
        en: "Start with a clear brief",
        bodyFa:
          "پیش از باز کردن ابزار، نتیجه‌ای را که می‌خواهی در یک جمله بنویس. سپس مخاطب، قالب خروجی و محدودیت‌ها را اضافه کن. برای مثال، متن کوتاه معرفی یک فروشگاه برای صفحهٔ شبکه اجتماعی با لحن دوستانه.",
        bodyEn:
          "Before opening a tool, describe the result you want in one sentence. Add the audience, output format and constraints. For example, a short introduction to a shop for a social page, in a friendly tone.",
        exerciseFa: "یک خواسته با هدف، مخاطب و قالب خروجی بنویس.",
        exerciseEn:
          "Write a brief with a goal, an audience and an output format.",
      },
      {
        id: "iterate",
        fa: "با نسخه کوچک آزمایش کن",
        en: "Try a small first version",
        bodyFa:
          "ابتدا بخشی کوچک از کار را انجام بده. نتیجه را با خواسته‌ات مقایسه کن و فقط مشخصات لازم را اصلاح کن. نگه‌داشتن نسخه‌های قبلی کمک می‌کند تغییرات را آگاهانه بررسی کنی.",
        bodyEn:
          "Begin with a small part of the work. Compare the result with your brief and refine the necessary details. Keeping previous versions helps you judge changes deliberately.",
        exerciseFa: "سه معیار برای مقایسه نسخه اول و دوم انتخاب کن.",
        exerciseEn:
          "Choose three criteria for comparing the first and second versions.",
      },
      {
        id: "review",
        fa: "بازبینی پیش از استفاده",
        en: "Review before use",
        bodyFa:
          "خروجی را پیش از انتشار یا استفاده بررسی کن. نام‌ها، اعداد، استنادها و جزئیات مرتبط با مخاطب را با منابع و اطلاعات خودت تطبیق بده. تصمیم نهایی و مسئولیت استفاده با توست.",
        bodyEn:
          "Review outputs before publishing or using them. Check names, numbers, references and audience-specific details against your own sources and information. The final decision remains yours.",
        exerciseFa: "یک چک‌لیست کوتاه برای بازبینی محتوای خودت بساز.",
        exerciseEn: "Create a short checklist for reviewing your content.",
      },
    ],
  },
  {
    id: "customer-workflow",
    fa: "مرتب‌کردن مسیر ارتباط با مشتری",
    en: "Organizing a customer workflow",
    descriptionFa: "از مخاطب و فرصت فروش تا پیگیری و مرور نتیجه.",
    descriptionEn: "From contacts and opportunities to follow-ups and review.",
    icon: "Users",
    lessons: [
      {
        id: "contacts",
        fa: "پرونده مخاطب",
        en: "Contact records",
        bodyFa:
          "اطلاعات ضروری مخاطب را در یک جای مشخص نگه دار: نام، راه تماس و دلیل ارتباط. یادداشت‌ها باید به اقدام بعدی کمک کنند و از ثبت اطلاعات غیرضروری پرهیز شود.",
        bodyEn:
          "Keep essential contact details together: a name, a way to reach them and the reason for the relationship. Notes should support the next action; avoid recording unnecessary information.",
        exerciseFa: "فیلدهای ضروری پرونده مخاطب کسب‌وکار خودت را مشخص کن.",
        exerciseEn: "Define the essential contact fields for your business.",
      },
      {
        id: "followup",
        fa: "قدم بعدی مشخص",
        en: "A specific next step",
        bodyFa:
          "برای هر فرصت باز، قدم بعدی و موعد آن را تعیین کن. با مرور دوره‌ای پیگیری‌ها می‌توانی ببینی کدام ارتباط نیازمند توجه است و کدام کار واقعاً انجام شده است.",
        bodyEn:
          "Give every open opportunity a next step and a deadline. Reviewing follow-ups regularly helps identify relationships that need attention and tasks that are actually completed.",
        exerciseFa: "برای یک فرصت فرضی، اقدام بعدی، مسئول و موعد تعریف کن.",
        exerciseEn:
          "Define a next action, an owner and a deadline for a sample opportunity.",
      },
    ],
  },
];
type Progress = Record<
  string,
  { done: string[]; answers: Record<string, string> }
>;
export function AcademyWorkspace({ view }: { view: string }) {
  const { fa, n, t } = useApp();
  const search = useSearchParams();
  const [progress, saveProgress] = useLocalState<Progress>(
    "aifekr-academy-progress",
    {},
  );
  const [notes, saveNotes] = useLocalState<Record<string, string>>(
    "aifekr-academy-notes",
    {},
  );
  const [selected, setSelected] = useState(
    search.get("course") || courses[0].id,
  );
  const [lessonId, setLessonId] = useState("");
  const [query, setQuery] = useState("");
  const course = courses.find((c) => c.id === selected) || courses[0];
  const lesson =
    course.lessons.find((l) => l.id === lessonId) || course.lessons[0];
  const current = progress[course.id] || { done: [], answers: {} };
  const index = course.lessons.findIndex((l) => l.id === lesson.id);
  const isComplete = (c: Course) =>
    c.lessons.every((l) => progress[c.id]?.done.includes(l.id));
  if (view === "profile") return <StudentWorkspace view="profile" />;
  if (view === "assessment") return <Learning path="/learn/exam" />;
  if (view === "catalogue")
    return (
      <>
        <div className="academy-catalogue-heading">
          <div>
            <span className="eyebrow">AIFekr / ACADEMY</span>
            <h2>
              {fa
                ? "یک مهارت تازه، با قدم‌های کوچک."
                : "A new skill, one small step at a time."}
            </h2>
          </div>
          <input
            aria-label={fa ? "جستجوی دوره" : "Search courses"}
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="academy-course-grid">
          {courses
            .filter((c) =>
              (
                c[fa ? "fa" : "en"] +
                " " +
                c[fa ? "descriptionFa" : "descriptionEn"]
              )
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <article className="panel academy-course-card" key={c.id}>
                <div className="academy-course-art">
                  <Icon name={c.icon} size={52} />
                  <span>AIFekr / LEARN</span>
                </div>
                <div className="academy-course-copy">
                  <span className="badge">
                    {fa ? "درس متنی نمونه" : "Sample text course"}
                  </span>
                  <h3>{c[fa ? "fa" : "en"]}</h3>
                  <p>{c[fa ? "descriptionFa" : "descriptionEn"]}</p>
                  <div className="row-between">
                    <span>
                      {n(c.lessons.length)} {fa ? "درس" : "lessons"}
                    </span>
                    <span>
                      {n(progress[c.id]?.done.length || 0)}{" "}
                      {fa ? "تکمیل‌شده" : "completed"}
                    </span>
                  </div>
                  <progress
                    max={c.lessons.length}
                    value={progress[c.id]?.done.length || 0}
                  />
                  <Link
                    className="btn primary"
                    href={"/learn?tab=lesson&course=" + c.id}
                  >
                    {fa ? "شروع یا ادامه دوره" : "Start or continue course"}
                    <Icon name="ArrowLeft" size={16} />
                  </Link>
                </div>
              </article>
            ))}
        </div>
      </>
    );
  if (view === "notes")
    return (
      <section className="panel">
        <label>
          {fa ? "دوره" : "Course"}
          <select
            value={course.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c[fa ? "fa" : "en"]}
              </option>
            ))}
          </select>
        </label>
        <h2>{fa ? "دفتر یادگیری من" : "My learning notebook"}</h2>
        <label>
          {fa ? "نکته‌ها و پرسش‌ها" : "Notes & questions"}
          <textarea
            rows={16}
            value={notes[course.id] || ""}
            onChange={(e) =>
              saveNotes({ ...notes, [course.id]: e.target.value })
            }
          />
        </label>
        <Button
          onClick={() =>
            download(course.id + "-notes.txt", notes[course.id] || "")
          }
        >
          {t("download")}
        </Button>
      </section>
    );
  if (view === "certificates")
    return (
      <div className="tool-grid">
        {courses.map((c) => (
          <section
            className={
              "panel academy-certificate " + (isComplete(c) ? "complete" : "")
            }
            key={c.id}
          >
            <Icon name="Award" size={46} />
            <span className="eyebrow">AIFekr / LEARNING RECORD</span>
            <h3>{c[fa ? "fa" : "en"]}</h3>
            <p>
              {isComplete(c)
                ? fa
                  ? "تمام درس‌های متنی در این مرورگر مرور شده‌اند."
                  : "All text lessons have been completed in this browser."
                : fa
                  ? "برای باز شدن سابقه تکمیل، همه درس‌ها را مرور و تمرین‌ها را ثبت کن."
                  : "Complete every lesson and save its exercise to unlock the completion record."}
            </p>
            <span className="badge">
              {fa
                ? "نمونه؛ فاقد اعتبار آموزشی رسمی"
                : "Sample; not an accredited credential"}
            </span>
            <Button
              disabled={!isComplete(c)}
              onClick={() =>
                download(
                  c.id + "-completion.json",
                  JSON.stringify(
                    {
                      course: c[fa ? "fa" : "en"],
                      lessons: c.lessons.length,
                      completed: progress[c.id]?.done,
                      date: new Date().toISOString(),
                      type: "local-sample-learning-record",
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              {fa ? "دریافت سابقه تکمیل" : "Download completion record"}
            </Button>
          </section>
        ))}
      </div>
    );
  if (view === "paths")
    return (
      <section className="panel">
        <h2>
          {fa ? "مسیر قدم‌به‌قدم یادگیری" : "Your step-by-step learning path"}
        </h2>
        {courses.map((c, i) => (
          <article className="domain-card" key={c.id}>
            <div className="row-between">
              <span className="badge">0{i + 1}</span>
              <strong>{c[fa ? "fa" : "en"]}</strong>
              <Icon
                name={isComplete(c) ? "CheckCircle2" : "BookOpen"}
                size={22}
              />
            </div>
            <progress
              max={c.lessons.length}
              value={progress[c.id]?.done.length || 0}
            />
            <Link href={"/learn?tab=lesson&course=" + c.id} className="btn">
              {fa ? "ادامه یادگیری" : "Continue learning"}
            </Link>
          </article>
        ))}
      </section>
    );
  return (
    <div className="academy-player">
      <article className="panel academy-lesson">
        <div className="row-between">
          <span className="eyebrow">{course[fa ? "fa" : "en"]}</span>
          <span className="badge">
            {n(index + 1)} / {n(course.lessons.length)}
          </span>
        </div>
        <div className="academy-lesson-art">
          <Icon name={course.icon} size={64} />
          <span>{fa ? "درس متنی" : "TEXT LESSON"}</span>
        </div>
        <h2>{lesson[fa ? "fa" : "en"]}</h2>
        <p className="academy-lesson-body">
          {lesson[fa ? "bodyFa" : "bodyEn"]}
        </p>
        <form
          className="academy-exercise"
          onSubmit={(e) => {
            e.preventDefault();
            const done = current.done.includes(lesson.id)
              ? current.done
              : [...current.done, lesson.id];
            saveProgress({ ...progress, [course.id]: { ...current, done } });
            if (index < course.lessons.length - 1)
              setLessonId(course.lessons[index + 1].id);
          }}
        >
          <h3>{fa ? "یک قدم برای خودت" : "A small step for you"}</h3>
          <label>
            {lesson[fa ? "exerciseFa" : "exerciseEn"]}
            <textarea
              rows={5}
              required
              value={current.answers[lesson.id] || ""}
              onChange={(e) =>
                saveProgress({
                  ...progress,
                  [course.id]: {
                    ...current,
                    answers: {
                      ...current.answers,
                      [lesson.id]: e.target.value,
                    },
                  },
                })
              }
            />
          </label>
          <div className="domain-actions">
            <Button
              disabled={index === 0}
              onClick={() => setLessonId(course.lessons[index - 1].id)}
            >
              {fa ? "درس قبل" : "Previous lesson"}
            </Button>
            <Button variant="primary" type="submit">
              {index === course.lessons.length - 1
                ? fa
                  ? "ثبت تکمیل درس"
                  : "Complete lesson"
                : fa
                  ? "ثبت تمرین و درس بعد"
                  : "Save & continue"}
            </Button>
          </div>
        </form>
      </article>
      <aside className="panel academy-syllabus">
        <span className="eyebrow">
          {fa ? "مسیر این دوره" : "COURSE SYLLABUS"}
        </span>
        <h3>{course[fa ? "fa" : "en"]}</h3>
        <progress max={course.lessons.length} value={current.done.length} />
        {course.lessons.map((l, i) => (
          <button
            className={lesson.id === l.id ? "selected" : ""}
            key={l.id}
            onClick={() => setLessonId(l.id)}
          >
            <span>{current.done.includes(l.id) ? "✓" : n(i + 1)}</span>
            {l[fa ? "fa" : "en"]}
          </button>
        ))}
        <Link className="btn" href={"/learn?tab=notes&course=" + course.id}>
          {fa ? "یادداشت‌های دوره" : "Course notes"}
        </Link>
        <Link className="text-link" href="/learn?tab=certificates">
          {fa ? "سوابق تکمیل" : "Completion records"} ←
        </Link>
      </aside>
    </div>
  );
}
