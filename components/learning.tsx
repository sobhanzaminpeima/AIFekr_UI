"use client";
import Link from "@/components/site-link";
import { useState, useEffect } from "react";
import { useApp } from "./providers";
import { Button, download, Icon, SectionTitle } from "./ui";
import { Calendar, CourseCards } from "./workspaces";
import { Chat } from "./chat";
import { toast } from "sonner";
export function Learning({ path }: { path: string }) {
  const { fa, t, n } = useApp();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(-1);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [lesson, setLesson] = useState(0);
  if (path.includes("certificate"))
    return (
      <>
        <div className="certificate">
          <div className="certificate-brand">✦ AIFekr ACADEMY</div>
          <span className="eyebrow">CERTIFICATE OF COMPLETION</span>
          <h1>{fa ? "گواهی پایان دوره" : "A well-earned little milestone."}</h1>
          <p>
            {fa
              ? "این گواهی نمونه برای"
              : "This sample certificate is presented to"}
          </p>
          <h2>{fa ? "سارا محمدی" : "Sara Mohammadi"}</h2>
          <p>
            {fa
              ? "برای تکمیل مسیر مقدمات هوش مصنوعی"
              : "for completing Introduction to Artificial Intelligence"}
          </p>
          <div className="certificate-seal">
            <Icon name="Award" size={55} />
          </div>
          <small>AIF-2026 · DEMO CERTIFICATE</small>
          <Link href="/verify-certificate/AIF-2026">
            {fa ? "بررسی گواهی نمونه" : "Verify sample certificate"}
          </Link>
        </div>
        <div className="center">
          <Button variant="primary" onClick={() => window.print()}>
            <Icon name="Printer" size={18} />
            {fa ? "چاپ گواهی" : "Print certificate"}
          </Button>
        </div>
      </>
    );
  if (path.includes("planner")) return <Calendar />;
  if (path.includes("flashcards"))
    return (
      <>
        <SectionTitle title={fa ? "فلش‌کارت‌های من" : "Your flashcards"} />
        <button
          className={`flashcard ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped(!flipped)}
        >
          <span className="eyebrow">
            {n(index + 1)} / {n(5)}
          </span>
          <h2>
            {flipped
              ? fa
                ? "یادگیری الگوها از داده برای پیش‌بینی یا تولید پاسخ."
                : "Learning patterns from data to make predictions or generate responses."
              : fa
                ? "یادگیری ماشین چیست؟"
                : "What is machine learning?"}
          </h2>
          <small>
            {fa ? "برای چرخاندن کارت، لمس کن." : "Tap to flip the card."}
          </small>
        </button>
        <div className="center">
          <Button
            onClick={() => {
              setIndex((i) => (i + 1) % 5);
              setFlipped(false);
            }}
          >
            {t("next")}
          </Button>
        </div>
      </>
    );
  if (path.includes("quiz") || path.includes("exam"))
    return (
      <div className="panel quiz">
        <span className="eyebrow">
          {n(index + 1)} / {n(3)}
        </span>
        <h1>
          {complete
            ? fa
              ? "یک قدم جلوتر رفتی!"
              : "A little further than yesterday."
            : fa
              ? "کدام گزینه یک پرامپت روشن‌تر است؟"
              : "Which is the clearer prompt?"}
        </h1>
        {complete ? (
          <>
            <strong className="quiz-score">
              {n(score)} / {n(3)}
            </strong>
            <p>
              {fa
                ? "برای بهتر شدن، پاسخ‌های مبهم را با هدف و مخاطب مشخص کن."
                : "For better results, be specific about your goal and your audience."}
            </p>
            <Link className="btn primary" href="/learn/certificate">
              {fa ? "گواهی نمونه" : "Sample certificate"}
            </Link>
          </>
        ) : (
          <>
            <div className="quiz-answers">
              {(fa
                ? [
                    "یک متن بنویس",
                    "سه ایدهٔ پست دوستانه برای فروشگاه کتاب بنویس",
                    "چیزی بگو",
                  ]
                : [
                    "Write something",
                    "Write three friendly post ideas for a bookshop",
                    "Say something",
                  ]
              ).map((s, i) => (
                <button
                  className={answer === i ? "selected" : ""}
                  key={s}
                  onClick={() => setAnswer(i)}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              disabled={answer < 0}
              onClick={() => {
                if (answer === 1) setScore((s) => s + 1);
                if (index === 2) setComplete(true);
                else {
                  setIndex((i) => i + 1);
                  setAnswer(-1);
                }
              }}
            >
              {t("next")}
            </Button>
          </>
        )}
      </div>
    );
  if (path.includes("/lesson/") || path.includes("/courses/"))
    return (
      <div className="lesson-layout">
        <section className="panel lesson-body">
          <div className="lesson-visual">
            <Icon name="BrainCircuit" size={90} />
            <span>
              {fa
                ? "درس متنی · مقدمات هوش مصنوعی"
                : "Text lesson · Introduction to AI"}
            </span>
          </div>
          <span className="eyebrow blue-text">
            {fa ? "درس" : "LESSON"} {n(lesson + 1)}
          </span>
          <h1>
            {fa
              ? [
                  "هوش مصنوعی، به زبان ساده",
                  "یک سؤال خوب، یک شروع خوب",
                  "تمرین کن و بهتر شو",
                ][lesson]
              : [
                  "Intelligence, simply explained",
                  "A good question changes everything",
                  "Practice a little. Learn a lot.",
                ][lesson]}
          </h1>
          <p className="lead">
            {fa
              ? "هوش مصنوعی از الگوهای داده یاد می‌گیرد. برای دریافت پاسخ مفید، زمینه، هدف و قالب دلخواهت را مشخص کن. پاسخ‌ها را بازبینی کن و برای تصمیم‌های مهم از منابع معتبر کمک بگیر."
              : "AI learns patterns from data. For a useful response, provide context, a clear goal and a preferred format. Review the output and use reliable sources for important decisions."}
          </p>
          <div className="inline-banner">
            {fa
              ? "تمرین: سه ایده برای یک پروژهٔ شخصی بنویس و بهترین را با دلیل انتخاب کن."
              : "Try it: write three ideas for a personal project and explain your favorite."}
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (lesson < 2) setLesson((l) => l + 1);
              else location.href = "/learn/exam";
            }}
          >
            {lesson === 2 ? (fa ? "شروع آزمون" : "Take the quiz") : t("next")}
          </Button>
        </section>
        <aside className="panel lesson-sidebar">
          <h3>{fa ? "مسیر یادگیری" : "Your learning path"}</h3>
          {[0, 1, 2].map((i) => (
            <button
              className={lesson === i ? "selected" : ""}
              key={i}
              onClick={() => setLesson(i)}
            >
              <span>{n(i + 1)}</span>
              {fa
                ? ["آشنایی با مدل‌ها", "پرامپت‌نویسی", "پروژهٔ اول"][i]
                : [
                    "Meet the models",
                    "Write a better prompt",
                    "Your first project",
                  ][i]}
            </button>
          ))}
          <Link href="/chat?prompt=Explain%20AI%20simply" className="btn">
            <Icon name="Bot" />
            {fa ? "از دستیار بپرس" : "Ask your AI tutor"}
          </Link>
        </aside>
      </div>
    );
  if (path === "/student")
    return (
      <>
        <SectionTitle
          title={fa ? "فضای دانشجو" : "Student workspace"}
          subtitle={
            fa
              ? "هر روز، یک چیز تازه بفهم."
              : "A little understanding, every day."
          }
        />
        <div className="student-shortcuts">
          {[
            ["quiz", "آزمون", "Quiz", "ListChecks"],
            ["flashcards", "فلش‌کارت", "Flashcards", "Layers"],
            ["planner", "برنامه مطالعه", "Study planner", "CalendarDays"],
          ].map(([slug, a, b, icon]) => (
            <Link href={"/student/" + slug} className="panel" key={slug}>
              <Icon name={icon} size={28} />
              <h3>{fa ? a : b}</h3>
            </Link>
          ))}
        </div>
        <label className="panel file-drop">
          <Icon name="Upload" size={30} />
          <h3>{fa ? "جزوه‌ات را اینجا اضافه کن" : "Bring your notes"}</h3>
          <p>
            {fa
              ? "پیش‌نمایش بارگذاری آزمایشی؛ OCR فعال نیست."
              : "Demo upload preview; OCR is not connected."}
          </p>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={(e) =>
              toast.success(e.target.files?.[0]?.name || t("attached"))
            }
          />
        </label>
        <CourseCards />
      </>
    );
  return (
    <>
      <SectionTitle title={t("learn")} />
      <CourseCards />
    </>
  );
}
export function Workout() {
  const { fa, t, n } = useApp();
  const [exercise, setExercise] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return (
    <div className="panel workout-player">
      <span className="eyebrow lime-text">
        FIT / {fa ? "تمرین امروز" : "TODAY’S WORKOUT"}
      </span>
      <div className="workout-illustration">
        <Icon name="Dumbbell" size={110} />
      </div>
      <h1>
        {fa
          ? ["پرس سینه", "قایقی نشسته", "پلانک"][exercise]
          : ["Chest press", "Seated row", "Plank"][exercise]}
      </h1>
      <p>
        {n(3)} {fa ? "ست" : "sets"} × {n(exercise === 2 ? 30 : 12)}{" "}
        {fa ? "تکرار / ثانیه" : "reps / seconds"}
      </p>
      <strong className="workout-time">
        {n(Math.floor(seconds / 60))}:{String(seconds % 60).padStart(2, "0")}
      </strong>
      <div className="center">
        <Button variant="primary" onClick={() => setRunning(!running)}>
          <Icon name={running ? "Pause" : "Play"} size={18} />
          {running ? t("stop") : fa ? "شروع" : "Start"}
        </Button>
        <Button
          onClick={() => {
            setExercise((e) => (e + 1) % 3);
            setSeconds(0);
            setRunning(false);
          }}
        >
          {t("next")}
        </Button>
      </div>
      <p className="fine-print">
        {fa
          ? "برنامهٔ تمرین نمونه است و شخصی‌سازی پزشکی نشده است."
          : "Sample workout for demonstrating the player."}
      </p>
    </div>
  );
}
