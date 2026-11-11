"use client";
import { AIText } from "./ai-text";
import { FlashcardDeck, type Flashcard } from "./flashcard-deck";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import Link from "./site-link";
import { Button } from "./ui";
import { AcademicProfile } from "./live-academy";
import { LiveUpload } from "./live-upload";
import {
  LiveModuleFrame,
  LiveLoad,
  LiveTable,
  LiveForm,
  useLiveData,
  liveRequest,
  liveRows,
  field,
  type LiveRow,
  type LiveField,
} from "./live-module-kit";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
const API = "/api/student/",
  enc = encodeURIComponent;
const courseFields = [
  field("name", "نام درس", "Subject name"),
  field("courseCode", "کد درس", "Course code", "text", true),
  field("institution", "دانشگاه", "Institution", "text", true),
  field("term", "ترم", "Term", "text", true),
  field("instructor", "مدرس", "Instructor", "text", true),
  field("description", "توضیحات", "Description", "textarea", true),
];
function StudentSubscription() {
  const { tl, locale, n } = useApp();
  const profile = useLiveData("/api/user/profile");
  const user = (profile.data?.user ?? profile.data) as { plan?: string; planExpiry?: string | null } | null | undefined;
  if (!user?.plan?.startsWith("STUDENT_") || !user.planExpiry) return null;
  const end = new Date(user.planExpiry);
  const left = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (left <= 0) return null;
  return (
    <section className="panel" aria-label={tl("پکیج دانشجویی", "Student package")}>
      <strong>{tl("پکیج دانشجویی", "Student package")}</strong> · {tl("فعال", "Active")}
      <p>
        {tl("پایان اعتبار", "Ends on")}: {end.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })} · {n(left)} {tl("روز مانده", "days left")}
      </p>
    </section>
  );
}
export function LiveStudent({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa, tl } = useApp(),
    courses = useLiveData(API + "courses"),
    [course, setCourse] = useState(""),
    [error, setError] = useState("");
  const items = liveRows(courses.data?.courses);
  useEffect(() => {
    if (!course && items[0]) setCourse(String(items[0].id));
  }, [items, course]);
  const choice: LiveField = {
    ...field("courseId", "درس", "Subject"),
    choices: items.map((x) => ({ value: String(x.id), label: String(x.name) })),
  };
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...courses} />
      {error && <p role="alert">{error}</p>}
      {view.id === "overview" && <StudentSubscription />}
      {courses.data && (
        <>
          <label>
            {tl("درس فعال", "Current subject")}
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">{tl("انتخاب درس", "Choose subject")}</option>
              {items.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)}
                </option>
              ))}
            </select>
          </label>
          {["overview", "courses", "path"].includes(view.id) && (
            <section className="panel">
              <h2>{tl("درس‌های من", "My subjects")}</h2>
              <LiveForm
                title={tl("افزودن درس", "Add subject")}
                url={API + "courses"}
                fields={courseFields}
                onDone={courses.reload}
              />
              <LiveTable
                items={items}
                columns={[
                  field("name", "درس", "Subject"),
                  field("institution", "دانشگاه", "Institution"),
                  field("term", "ترم", "Term"),
                ]}
                actions={(c) => (
                  <>
                    <Button onClick={() => setCourse(String(c.id))}>
                      {tl("انتخاب", "Select")}
                    </Button>
                    <LiveForm
                      title={tl("ویرایش", "Edit")}
                      url={API + "courses/" + enc(String(c.id))}
                      method="PATCH"
                      initial={c}
                      fields={courseFields}
                      onDone={courses.reload}
                    />
                    <LiveForm
                      title={
                        tl("حذف درس و منابع وابسته", "Delete subject and its materials")
                      }
                      url={API + "courses/" + enc(String(c.id))}
                      method="DELETE"
                      caution={
                        tl("درس و محتوای وابسته به آن حذف می‌شود.", "This deletes the subject and its dependent content.")
                      }
                      onDone={courses.reload}
                    />
                  </>
                )}
              />
              <p>
                {tl("ابتدا یک درس اضافه کن، سپس منابع را بارگذاری کن و از تمرین، فلش‌کارت و دستیار درس استفاده کن.", "Add a subject, upload its sources, then use practice, flashcards and the tutor.")}
              </p>
              <div className="domain-actions">
                <Link className="btn" href="/student?view=upload">
                  {tl("منابع درس", "Course sources")}
                </Link>
                <Link className="btn" href="/learn">
                  {tl("مسیرهای آکادمی", "Academy learning paths")}
                </Link>
              </div>
            </section>
          )}
          {course && view.id === "upload" && (
            <Sources key={course} course={course} choice={choice} />
          )}
          {view.id === "notes" && <Notes course={course} choice={choice} />}
          {course && view.id === "review" && (
            <Cards key={course} course={course} />
          )}
          {["planner", "overview"].includes(view.id) && (
            <Planner choice={choice} />
          )}
          {["reports", "overview"].includes(view.id) && (
            <StudyTimer course={course} />
          )}
          {["practice", "chat", "assignment", "thesis"].includes(view.id) &&
            course && (
              <StudyAi key={course + view.id} course={course} mode={view.id} />
            )}
          {view.id === "groups" && <Groups choice={choice} />}
          {view.id === "profile" && (
            <>
              <AcademicProfile />
              <StudentPublicProfile />
            </>
          )}
          {view.id === "business" && (
            <section className="panel">
              <h2>
                {tl("ابزارهای کسب‌وکار دانشجویی", "Student business tools")}
              </h2>
              <p>
                {tl("دسترسی هر ابزار با پکیج واقعی حساب شما بررسی می‌شود.", "Each tool checks your current account entitlement.")}
              </p>
              <div className="domain-actions">
                {[
                  ["/business-doctor", "تحلیل کسب‌وکار", "Business analysis"],
                  ["/startup/builder", "ساخت استارتاپ", "Startup builder"],
                  ["/website-designer", "وب‌سایت", "Website"],
                  ["/crm", "مشتریان", "CRM"],
                ].map(([h, a, b]) => (
                  <Link className="btn" key={h} href={h}>
                    {fa ? a : b}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {!course &&
            [
              "upload",
              "practice",
              "review",
              "chat",
              "assignment",
              "thesis",
            ].includes(view.id) && (
              <p>
                {tl("ابتدا درس را اضافه یا انتخاب کنید.", "Add or select a subject first.")}
              </p>
            )}
        </>
      )}
    </LiveModuleFrame>
  );
}
function Sources({ course, choice }: { course: string; choice: LiveField }) {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "materials?courseId=" + enc(course));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveUpload
        url={API + "materials"}
        title={
          tl("ارسال جزوه (PDF، DOCX، PPTX)", "Upload course sources (PDF, DOCX, PPTX)")
        }
        accept=".pdf,.docx,.pptx"
        maxBytes={10 * 1024 * 1024}
        fields={[
          {
            ...choice,
            choices: choice.choices?.filter((c) => c.value === course),
          },
          field("title", "عنوان", "Title", "text", true),
        ]}
        onDone={r.reload}
      />
      <LiveForm
        title={tl("افزودن منبع متنی", "Add text source")}
        url={API + "materials"}
        fields={[
          field("title", "عنوان", "Title"),
          field("content", "متن منبع", "Source text", "textarea"),
        ]}
        map={(b) => ({ ...b, courseId: course })}
        onDone={r.reload}
      />
      {r.data &&
        liveRows(r.data.materials).map((m) => (
          <details key={String(m.id)}>
            <summary>{String(m.title)}</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{String(m.content)}</p>
          </details>
        ))}
    </section>
  );
}
function Notes({ course, choice }: { course: string; choice: LiveField }) {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "notes" + (course ? "?courseId=" + enc(course) : ""));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={tl("یادداشت جدید", "New note")}
        url={API + "notes"}
        fields={[
          choice,
          field("title", "عنوان", "Title"),
          field("content", "یادداشت", "Note", "textarea"),
        ]}
        initial={{ courseId: course }}
        onDone={r.reload}
      />
      {liveRows(r.data?.notes).map((n) => (
        <details key={String(n.id)}>
          <summary>{String(n.title)}</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{String(n.content)}</p>
          <LiveForm
            title={tl("ویرایش یادداشت", "Edit note")}
            url={API + "notes"}
            initial={n}
            fields={[
              field("title", "عنوان", "Title"),
              field("content", "متن", "Content", "textarea"),
            ]}
            map={(b) => ({ ...b, id: n.id, courseId: n.courseId })}
            onDone={r.reload}
          />
        </details>
      ))}
    </section>
  );
}
function Cards({ course }: { course: string }) {
  const { tl } = useApp(),
    r = useLiveData(API + "flashcards?courseId=" + enc(course));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={tl("افزودن فلش‌کارت", "Add flashcard")}
        url={API + "flashcards"}
        fields={[
          field("question", "پرسش", "Question", "textarea"),
          field("answer", "پاسخ", "Answer", "textarea"),
        ]}
        map={(b) => ({ ...b, courseId: course })}
        onDone={r.reload}
      />
      {r.data && (
        <FlashcardDeck
          key={liveRows(r.data.flashcards).map((c) => c.id).join()}
          cards={liveRows(r.data.flashcards) as unknown as Flashcard[]}
          url={(id) => API + "flashcards/" + enc(id)}
        />
      )}
    </section>
  );
}
function Planner({ choice }: { choice: LiveField }) {
  const { fa, tl } = useApp(),
    tasks = useLiveData(API + "tasks"),
    exams = useLiveData(API + "exams");
  return (
    <section className="panel">
      <h2>{tl("تکلیف‌ها و امتحان‌ها", "Tasks & exams")}</h2>
      <LiveLoad {...tasks} />
      <LiveForm
        title={tl("کار جدید", "New task")}
        url={API + "tasks"}
        fields={[
          choice,
          field("title", "عنوان", "Title"),
          field("description", "توضیح", "Description", "textarea", true),
          field(
            "dueAt",
            "مهلت (زمان محلی)",
            "Due date (local time)",
            "datetime-local",
            true,
          ),
          {
            ...field("priority", "اولویت", "Priority", "number"),
            choices: [1, 2, 3].map((n) => ({
              value: String(n),
              label: String(n),
            })),
          },
        ]}
        initial={{ priority: 2 }}
        map={(b) => ({
          ...b,
          priority: Number(b.priority),
          dueAt: b.dueAt ? new Date(String(b.dueAt)).toISOString() : null,
        })}
        onDone={tasks.reload}
      />
      <LiveTable
        items={liveRows(tasks.data?.tasks)}
        columns={[
          field("title", "کار", "Task"),
          field("dueAt", "مهلت", "Due"),
          field("completedAt", "زمان تکمیل", "Completed"),
        ]}
        actions={(t) => (
          <>
            <LiveForm
              title={
                t.completedAt
                  ? tl("بازگشایی", "Reopen")
                  : tl("انجام شد", "Complete")
              }
              url={API + "tasks/" + enc(String(t.id))}
              method="PATCH"
              map={() => ({ completed: !t.completedAt })}
              onDone={tasks.reload}
            />
            <LiveForm
              title={tl("حذف", "Delete")}
              url={API + "tasks/" + enc(String(t.id))}
              method="DELETE"
              caution={
                tl("این کار حذف می‌شود.", "This task will be deleted.")
              }
              onDone={tasks.reload}
            />
          </>
        )}
      />
      <LiveLoad {...exams} />
      <LiveForm
        title={tl("امتحان جدید", "New exam")}
        url={API + "exams"}
        fields={[
          choice,
          field("title", "عنوان", "Title"),
          field(
            "examAt",
            "زمان محلی امتحان",
            "Exam local time",
            "datetime-local",
          ),
        ]}
        map={(b) => ({
          ...b,
          examAt: new Date(String(b.examAt)).toISOString(),
        })}
        onDone={exams.reload}
      />
      <LiveTable
        items={liveRows(exams.data?.exams)}
        columns={[
          field("title", "امتحان", "Exam"),
          field("examAt", "زمان", "Time"),
        ]}
        actions={(e) => (
          <>
            <LiveForm
              title={tl("ساخت برنامه مطالعه", "Build study plan")}
              url={API + "study-plan"}
              map={() => ({ examId: e.id })}
              onDone={tasks.reload}
            />
            <LiveForm
              title={tl("حذف امتحان", "Delete exam")}
              url={API + "exams/" + enc(String(e.id))}
              method="DELETE"
              onDone={exams.reload}
            />
          </>
        )}
      />
    </section>
  );
}
function StudyTimer({ course }: { course: string }) {
  const { fa, tl } = useApp(),
    [days, setDays] = useState(7),
    r = useLiveData(
      API +
        "study-sessions?days=" +
        days +
        "&timeZone=" +
        enc(Intl.DateTimeFormat().resolvedOptions().timeZone),
    ),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const active = r.data?.active as LiveRow | undefined;
  useEffect(() => {
    setSeconds(Number(active?.elapsedSeconds ?? 0));
    if (!active || active.pausedAt) return;
    const started = Date.now(),
      initial = Number(active.elapsedSeconds);
    const id = setInterval(
      () => setSeconds(initial + Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [active]);
  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await liveRequest(
        API + "study-sessions",
        action === "start" ? "POST" : "PATCH",
        action === "start" ? { courseId: course || null } : { action },
      );
      r.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>
        {tl("زمان‌سنج و گزارش واقعی مطالعه", "Study timer & recorded progress")}
      </h2>
      <LiveLoad {...r} />
      {error && <p role="alert">{error}</p>}
      <p role="timer">
        {Math.floor(seconds / 3600)}:
        {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </p>
      <div className="domain-actions">
        {active ? (
          <>
            <Button
              disabled={busy}
              onClick={() => void act(active.pausedAt ? "resume" : "pause")}
            >
              {active.pausedAt
                ? tl("ادامه", "Resume")
                : tl("توقف موقت", "Pause")}
            </Button>
            <Button disabled={busy} onClick={() => void act("stop")}>
              {tl("پایان و ذخیره", "Finish & save")}
            </Button>
          </>
        ) : (
          <Button disabled={busy || !r.data} onClick={() => void act("start")}>
            {tl("شروع مطالعه", "Start studying")}
          </Button>
        )}
      </div>
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        aria-label={tl("بازه گزارش", "Report period")}
      >
        <option value={7}>{tl("هفتگی", "Weekly")}</option>
        <option value={30}>{tl("ماهانه", "Monthly")}</option>
      </select>
      <p>
        {tl("مجموع ثانیه‌های ثبت‌شده: ", "Recorded seconds: ")}
        {String(r.data?.totalSeconds ?? 0)}
      </p>
      <LiveTable
        items={liveRows(r.data?.byDay)}
        columns={[
          field("day", "روز", "Day"),
          field("seconds", "ثانیه", "Seconds"),
        ]}
      />
    </section>
  );
}
function StudyAi({ course, mode }: { course: string; mode: string }) {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "workspace"),
    thesis = useLiveData(mode === "thesis" ? API + "thesis-assist" : null),
    [result, setResult] = useState<LiveRow | null>(null),
    [quiz, setQuiz] = useState(""),
    [attemptToken, setAttemptToken] = useState("");
  const costs = r.data?.ai as LiveRow | undefined;
  const isThesis = mode === "thesis",
    assignment = mode === "assignment",
    url =
      API +
      (isThesis ? "thesis-assist" : assignment ? "assignment-assist" : "ai");
  const modes = isThesis
    ? ["proposal", "outline", "methodology", "literature", "review"]
    : assignment
      ? ["understand", "steps", "outline", "feedback", "hint"]
      : ["ask", "flashcards", "quiz"];
  const estimate = isThesis ? thesis.data?.credits : costs?.maximumCredits;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {isThesis && <LiveLoad {...thesis} />}
      <p>
        {isThesis
          ? tl("کردیت این درخواست: ", "Credits per request: ")
          : tl("هزینه وابسته به مدل انتخاب‌شدهٔ سرور است؛ حداکثر نرخ مدل‌های فعلی: ", "Cost depends on the server-selected model; highest current model rate: ")}
        {String(estimate ?? "—")}
        {!isThesis && (
          <>
            <br />
            {tl("حداقل موجودی لازم: ", "Minimum balance required: ")}
            {String(costs?.minimumBalance ?? "—")}
          </>
        )}
      </p>
      {typeof estimate === "number" && (
        <LiveForm
          title={tl("تأیید و اجرای دستیار", "Confirm & run assistant")}
          url={url}
          caution={
            tl("این درخواست از کردیت حساب استفاده می‌کند. خروجی باید توسط شما بررسی شود؛ ارسال خودکار یا تحویل تکلیف انجام نمی‌شود.", "This uses account credits. Review the output; nothing is submitted on your behalf.")
          }
          fields={[
            {
              ...field(
                isThesis || assignment ? "mode" : "action",
                "نوع کمک",
                "Assistance",
              ),
              choices: modes.map((value) => ({
                value,
                label:
                  (
                    {
                      ask: tl("پرسش از منابع", "Ask sources"),
                      flashcards: tl("ساخت فلش‌کارت", "Generate flashcards"),
                      quiz: tl("ساخت آزمون", "Generate quiz"),
                      understand: tl("فهمیدن صورت تکلیف", "Understand the brief"),
                      steps: tl("گام‌های انجام", "Steps to do it"),
                      outline: tl("طرح کلی", "Outline"),
                      feedback: tl("بازخورد روی متن من", "Feedback on my draft"),
                      hint: tl("فقط راهنمایی", "Just a hint"),
                      proposal: tl("پروپوزال", "Proposal"),
                      methodology: tl("روش تحقیق", "Methodology"),
                      literature: tl("پیشینهٔ پژوهش", "Literature review"),
                      review: tl("بازبینی متن", "Review my text"),
                    } as Record<string, string>
                  )[value] ?? value,
              })),
            },
            field(
              "prompt",
              "پرسش یا متن شما",
              "Your question or text",
              "textarea",
            ),
            ...(!isThesis && !assignment
              ? [field("count", "تعداد (۳ تا ۱۵)", "Count (3–15)", "number")]
              : []),
          ]}
          initial={{ count: 5 }}
          map={(b) => ({ ...b, courseId: course })}
          onDone={(d) => {
            const q = d.quiz as LiveRow | undefined;
            if (q?.id && q.attemptToken) {
              try {
                sessionStorage.setItem(
                  "aifekr-student-quiz:" + String(q.id),
                  String(q.attemptToken),
                );
              } catch {}
            }
            setResult(d);
            r.reload();
          }}
        />
      )}
      {result && (
        <div>
          <p role="status">
            {tl("کردیت مصرف‌شده: ", "Credits used: ")}
            {String(result.creditsUsed ?? "—")}
          </p>
          <AIText text={String(result.answer ?? result.content ?? "")} />
          {result.created != null && (
            <p>
              {tl("فلش‌کارت‌های ذخیره‌شده: ", "Saved flashcards: ")}
              {String(result.created)}
            </p>
          )}
          {result.quiz != null && (
            <Button
              onClick={() => {
                setQuiz(String((result.quiz as LiveRow).id));
                setAttemptToken(
                  String((result.quiz as LiveRow).attemptToken ?? ""),
                );
              }}
            >
              {tl("باز کردن آزمون", "Open quiz")}
            </Button>
          )}
        </div>
      )}
      {mode === "practice" && (
        <>
          <h3>{tl("آزمون‌های ذخیره‌شده", "Saved quizzes")}</h3>
          <LiveTable
            items={liveRows(r.data?.quizzes).filter(
              (q) => q.courseId === course,
            )}
            columns={[
              field("title", "آزمون", "Quiz"),
              field(
                "timeLimitSeconds",
                "مهلت به ثانیه",
                "Time limit (seconds)",
              ),
            ]}
            actions={(q) => (
              <Button
                onClick={() => {
                  setQuiz(String(q.id));
                  try {
                    setAttemptToken(
                      sessionStorage.getItem(
                        "aifekr-student-quiz:" + String(q.id),
                      ) ?? "",
                    );
                  } catch {
                    setAttemptToken("");
                  }
                }}
              >
                {tl("شروع آزمون", "Start quiz")}
              </Button>
            )}
          />
        </>
      )}
      {quiz && <StudentQuiz key={quiz} id={quiz} attemptToken={attemptToken} />}
    </section>
  );
}
function StudentQuiz({
  id,
  attemptToken,
}: {
  id: string;
  attemptToken: string;
}) {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "quizzes/" + enc(id)),
    [answers, setAnswers] = useState<Record<number, number>>({}),
    [result, setResult] = useState<LiveRow | null>(null);
  const quiz = r.data?.quiz as LiveRow | undefined;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {quiz && (
        <>
          <h3>{String(quiz.title)}</h3>
          {quiz.timeLimitSeconds && !attemptToken ? (
            <p role="alert">
              {tl("آزمون زمان‌دار فقط با توکن شروع همان اجرای تولید قابل ثبت است؛ این آزمون را از نتیجه تولید باز کنید.", "A timed quiz requires the original start token. Open it from the generation result.")}
            </p>
          ) : null}
          {liveRows(quiz.questions).map((q, i) => (
            <fieldset key={i}>
              <legend>{String(q.question)}</legend>
              {(q.options as string[]).map((v, n) => (
                <label key={n}>
                  <input
                    type="radio"
                    name={"quiz-" + id + "-" + i}
                    checked={answers[i] === n}
                    onChange={() => setAnswers((a) => ({ ...a, [i]: n }))}
                  />
                  {v}
                </label>
              ))}
            </fieldset>
          ))}
          <LiveForm
            title={
              tl("ثبت پاسخ‌ها و دریافت نمره", "Submit answers & get grade")
            }
            url={API + "quizzes/" + enc(id)}
            map={() => ({
              answers: liveRows(quiz.questions).map(
                (_, i) => answers[i] ?? null,
              ),
              ...(attemptToken ? { attemptToken } : {}),
            })}
            onDone={setResult}
          />
          {result && (
            <>
              <h3>{tl("نتیجه سرور", "Server result")}</h3>
              <p>
                {String((result.attempt as LiveRow)?.score ?? "—")} /{" "}
                {String((result.attempt as LiveRow)?.total ?? "—")}
              </p>
              <LiveTable
                items={liveRows((result.attempt as LiveRow)?.review)}
                columns={[
                  field("question", "پرسش", "Question"),
                  field("correct", "درست", "Correct"),
                  field("explanation", "توضیح", "Explanation"),
                ]}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
function Groups({ choice }: { choice: LiveField }) {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "groups"),
    [group, setGroup] = useState("");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={tl("ایجاد گروه", "Create study group")}
        url={API + "groups"}
        fields={[field("name", "نام", "Name"), { ...choice, optional: true }]}
        onDone={r.reload}
      />
      <LiveForm
        title={tl("پیوستن با کد دعوت", "Join by invite code")}
        url={API + "groups/join"}
        fields={[field("inviteCode", "کد دعوت", "Invite code")]}
        onDone={r.reload}
      />
      <LiveTable
        items={liveRows(r.data?.groups)}
        columns={[
          field("name", "گروه", "Group"),
          field("inviteCode", "کد دعوت خصوصی", "Private invite code"),
        ]}
        actions={(g) => (
          <Button onClick={() => setGroup(String(g.id))}>
            {tl("پیام‌های گروه", "Group messages")}
          </Button>
        )}
      />
      {group && <GroupMessages key={group} id={group} />}
    </section>
  );
}
function GroupMessages({ id }: { id: string }) {
  const { fa, tl } = useApp(),
    url = API + "groups/" + enc(id) + "/messages",
    r = useLiveData(url);
  return (
    <>
      <LiveLoad {...r} />
      <Button onClick={r.reload}>
        {tl("دریافت پیام‌های جدید", "Refresh messages")}
      </Button>
      <LiveTable
        items={liveRows(r.data?.messages).map((m) => ({
          ...m,
          sender: (m.user as LiveRow)?.name,
        }))}
        columns={[
          field("sender", "فرستنده", "Sender"),
          field("content", "پیام", "Message"),
          field("createdAt", "زمان", "Time"),
        ]}
      />
      <LiveForm
        title={
          tl("ارسال پیام به اعضای گروه", "Send message to group members")
        }
        url={url}
        fields={[field("content", "پیام", "Message", "textarea")]}
        caution={
          tl("این پیام برای اعضای گروه ارسال می‌شود.", "This message will be visible to group members.")
        }
        onDone={r.reload}
      />
    </>
  );
}
function StudentPublicProfile() {
  const { fa, tl } = useApp(),
    r = useLiveData(API + "profile"),
    p = r.data?.profile as LiveRow | undefined;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {p && (
        <>
          <h3>{tl("نمایه عمومی دانشجو", "Public student profile")}</h3>
          <LiveForm
            title={tl("ذخیره تنظیمات انتشار", "Save publishing settings")}
            url={API + "profile"}
            method="PATCH"
            initial={{
              slug: p.studentPublicSlug ?? "",
              isPublic: p.studentProfilePublic === true,
            }}
            fields={[
              field("slug", "شناسه انگلیسی عمومی", "Public slug", "text", true),
              field(
                "isPublic",
                "نمایش عمومی پروفایل",
                "Publish profile",
                "checkbox",
                true,
              ),
            ]}
            caution={
              tl("با انتشار، اطلاعات نمایه عمومی می‌شوند.", "Publishing makes your profile publicly accessible.")
            }
            onDone={r.reload}
          />
          <Link className="btn" href="/settings">
            {tl("ویرایش نام و عکس حساب", "Edit account name & photo")}
          </Link>
        </>
      )}
    </section>
  );
}
