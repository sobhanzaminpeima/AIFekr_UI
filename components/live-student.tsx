"use client";
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
export function LiveStudent({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa } = useApp(),
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
      {courses.data && (
        <>
          <label>
            {fa ? "درس فعال" : "Current subject"}
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">{fa ? "انتخاب درس" : "Choose subject"}</option>
              {items.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)}
                </option>
              ))}
            </select>
          </label>
          {["overview", "courses", "path"].includes(view.id) && (
            <section className="panel">
              <h2>{fa ? "درس‌های من" : "My subjects"}</h2>
              <LiveForm
                title={fa ? "افزودن درس" : "Add subject"}
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
                      {fa ? "انتخاب" : "Select"}
                    </Button>
                    <LiveForm
                      title={fa ? "ویرایش" : "Edit"}
                      url={API + "courses/" + enc(String(c.id))}
                      method="PATCH"
                      initial={c}
                      fields={courseFields}
                      onDone={courses.reload}
                    />
                    <LiveForm
                      title={
                        fa
                          ? "حذف درس و منابع وابسته"
                          : "Delete subject and its materials"
                      }
                      url={API + "courses/" + enc(String(c.id))}
                      method="DELETE"
                      caution={
                        fa
                          ? "درس و محتوای وابسته به آن حذف می‌شود."
                          : "This deletes the subject and its dependent content."
                      }
                      onDone={courses.reload}
                    />
                  </>
                )}
              />
              <p>
                {fa
                  ? "ابتدا یک درس اضافه کن، سپس منابع را بارگذاری کن و از تمرین، فلش‌کارت و دستیار درس استفاده کن."
                  : "Add a subject, upload its sources, then use practice, flashcards and the tutor."}
              </p>
              <div className="domain-actions">
                <Link className="btn" href="/student?view=upload">
                  {fa ? "منابع درس" : "Course sources"}
                </Link>
                <Link className="btn" href="/learn">
                  {fa ? "مسیرهای آکادمی" : "Academy learning paths"}
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
                {fa ? "ابزارهای کسب‌وکار دانشجویی" : "Student business tools"}
              </h2>
              <p>
                {fa
                  ? "دسترسی هر ابزار با پکیج واقعی حساب شما بررسی می‌شود."
                  : "Each tool checks your current account entitlement."}
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
                {fa
                  ? "ابتدا درس را اضافه یا انتخاب کنید."
                  : "Add or select a subject first."}
              </p>
            )}
        </>
      )}
    </LiveModuleFrame>
  );
}
function Sources({ course, choice }: { course: string; choice: LiveField }) {
  const { fa } = useApp(),
    r = useLiveData(API + "materials?courseId=" + enc(course));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveUpload
        url={API + "materials"}
        title={
          fa
            ? "ارسال جزوه (PDF، DOCX، PPTX)"
            : "Upload course sources (PDF, DOCX, PPTX)"
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
        title={fa ? "افزودن منبع متنی" : "Add text source"}
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
  const { fa } = useApp(),
    r = useLiveData(API + "notes" + (course ? "?courseId=" + enc(course) : ""));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "یادداشت جدید" : "New note"}
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
            title={fa ? "ویرایش یادداشت" : "Edit note"}
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
  const { fa } = useApp(),
    r = useLiveData(API + "flashcards?courseId=" + enc(course));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "افزودن فلش‌کارت" : "Add flashcard"}
        url={API + "flashcards"}
        fields={[
          field("question", "پرسش", "Question", "textarea"),
          field("answer", "پاسخ", "Answer", "textarea"),
        ]}
        map={(b) => ({ ...b, courseId: course })}
        onDone={r.reload}
      />
      {liveRows(r.data?.flashcards).map((c) => (
        <details className="panel" key={String(c.id)}>
          <summary>{String(c.question)}</summary>
          <p>{String(c.answer)}</p>
          <p>
            {fa ? "مرور بعدی: " : "Next review: "}
            {String(c.nextReviewAt ?? "—")}
          </p>
          {["hard", "good", "easy"].map((rating, i) => (
            <LiveForm
              key={rating}
              title={
                (fa ? ["سخت", "مناسب", "آسان"] : ["Hard", "Good", "Easy"])[i]
              }
              url={API + "flashcards/" + enc(String(c.id))}
              method="PATCH"
              map={() => ({ rating })}
              onDone={r.reload}
            />
          ))}
        </details>
      ))}
    </section>
  );
}
function Planner({ choice }: { choice: LiveField }) {
  const { fa } = useApp(),
    tasks = useLiveData(API + "tasks"),
    exams = useLiveData(API + "exams");
  return (
    <section className="panel">
      <h2>{fa ? "تکلیف‌ها و امتحان‌ها" : "Tasks & exams"}</h2>
      <LiveLoad {...tasks} />
      <LiveForm
        title={fa ? "کار جدید" : "New task"}
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
                  ? fa
                    ? "بازگشایی"
                    : "Reopen"
                  : fa
                    ? "انجام شد"
                    : "Complete"
              }
              url={API + "tasks/" + enc(String(t.id))}
              method="PATCH"
              map={() => ({ completed: !t.completedAt })}
              onDone={tasks.reload}
            />
            <LiveForm
              title={fa ? "حذف" : "Delete"}
              url={API + "tasks/" + enc(String(t.id))}
              method="DELETE"
              caution={
                fa ? "این کار حذف می‌شود." : "This task will be deleted."
              }
              onDone={tasks.reload}
            />
          </>
        )}
      />
      <LiveLoad {...exams} />
      <LiveForm
        title={fa ? "امتحان جدید" : "New exam"}
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
              title={fa ? "ساخت برنامه مطالعه" : "Build study plan"}
              url={API + "study-plan"}
              map={() => ({ examId: e.id })}
              onDone={tasks.reload}
            />
            <LiveForm
              title={fa ? "حذف امتحان" : "Delete exam"}
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
  const { fa } = useApp(),
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
        {fa
          ? "زمان‌سنج و گزارش واقعی مطالعه"
          : "Study timer & recorded progress"}
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
                ? fa
                  ? "ادامه"
                  : "Resume"
                : fa
                  ? "توقف موقت"
                  : "Pause"}
            </Button>
            <Button disabled={busy} onClick={() => void act("stop")}>
              {fa ? "پایان و ذخیره" : "Finish & save"}
            </Button>
          </>
        ) : (
          <Button disabled={busy || !r.data} onClick={() => void act("start")}>
            {fa ? "شروع مطالعه" : "Start studying"}
          </Button>
        )}
      </div>
      <select
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        aria-label={fa ? "بازه گزارش" : "Report period"}
      >
        <option value={7}>{fa ? "هفتگی" : "Weekly"}</option>
        <option value={30}>{fa ? "ماهانه" : "Monthly"}</option>
      </select>
      <p>
        {fa ? "مجموع ثانیه‌های ثبت‌شده: " : "Recorded seconds: "}
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
  const { fa } = useApp(),
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
          ? fa
            ? "کردیت این درخواست: "
            : "Credits per request: "
          : fa
            ? "هزینه وابسته به مدل انتخاب‌شدهٔ سرور است؛ حداکثر نرخ مدل‌های فعلی: "
            : "Cost depends on the server-selected model; highest current model rate: "}
        {String(estimate ?? "—")}
        {!isThesis && (
          <>
            <br />
            {fa ? "حداقل موجودی لازم: " : "Minimum balance required: "}
            {String(costs?.minimumBalance ?? "—")}
          </>
        )}
      </p>
      {typeof estimate === "number" && (
        <LiveForm
          title={fa ? "تأیید و اجرای دستیار" : "Confirm & run assistant"}
          url={url}
          caution={
            fa
              ? "این درخواست از کردیت حساب استفاده می‌کند. خروجی باید توسط شما بررسی شود؛ ارسال خودکار یا تحویل تکلیف انجام نمی‌شود."
              : "This uses account credits. Review the output; nothing is submitted on your behalf."
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
                      ask: fa ? "پرسش از منابع" : "Ask sources",
                      flashcards: fa ? "ساخت فلش‌کارت" : "Generate flashcards",
                      quiz: fa ? "ساخت آزمون" : "Generate quiz",
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
        <div className="prose" style={{ whiteSpace: "pre-wrap" }}>
          <p role="status">
            {fa ? "کردیت مصرف‌شده: " : "Credits used: "}
            {String(result.creditsUsed ?? "—")}
          </p>
          <p>{String(result.answer ?? result.content ?? "")}</p>
          {result.created != null && (
            <p>
              {fa ? "فلش‌کارت‌های ذخیره‌شده: " : "Saved flashcards: "}
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
              {fa ? "باز کردن آزمون" : "Open quiz"}
            </Button>
          )}
        </div>
      )}
      {mode === "practice" && (
        <>
          <h3>{fa ? "آزمون‌های ذخیره‌شده" : "Saved quizzes"}</h3>
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
                {fa ? "شروع آزمون" : "Start quiz"}
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
  const { fa } = useApp(),
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
              {fa
                ? "آزمون زمان‌دار فقط با توکن شروع همان اجرای تولید قابل ثبت است؛ این آزمون را از نتیجه تولید باز کنید."
                : "A timed quiz requires the original start token. Open it from the generation result."}
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
              fa ? "ثبت پاسخ‌ها و دریافت نمره" : "Submit answers & get grade"
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
              <h3>{fa ? "نتیجه سرور" : "Server result"}</h3>
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
  const { fa } = useApp(),
    r = useLiveData(API + "groups"),
    [group, setGroup] = useState("");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "ایجاد گروه" : "Create study group"}
        url={API + "groups"}
        fields={[field("name", "نام", "Name"), { ...choice, optional: true }]}
        onDone={r.reload}
      />
      <LiveForm
        title={fa ? "پیوستن با کد دعوت" : "Join by invite code"}
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
            {fa ? "پیام‌های گروه" : "Group messages"}
          </Button>
        )}
      />
      {group && <GroupMessages key={group} id={group} />}
    </section>
  );
}
function GroupMessages({ id }: { id: string }) {
  const { fa } = useApp(),
    url = API + "groups/" + enc(id) + "/messages",
    r = useLiveData(url);
  return (
    <>
      <LiveLoad {...r} />
      <Button onClick={r.reload}>
        {fa ? "دریافت پیام‌های جدید" : "Refresh messages"}
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
          fa ? "ارسال پیام به اعضای گروه" : "Send message to group members"
        }
        url={url}
        fields={[field("content", "پیام", "Message", "textarea")]}
        caution={
          fa
            ? "این پیام برای اعضای گروه ارسال می‌شود."
            : "This message will be visible to group members."
        }
        onDone={r.reload}
      />
    </>
  );
}
function StudentPublicProfile() {
  const { fa } = useApp(),
    r = useLiveData(API + "profile"),
    p = r.data?.profile as LiveRow | undefined;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {p && (
        <>
          <h3>{fa ? "نمایه عمومی دانشجو" : "Public student profile"}</h3>
          <LiveForm
            title={fa ? "ذخیره تنظیمات انتشار" : "Save publishing settings"}
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
              fa
                ? "با انتشار، اطلاعات نمایه عمومی می‌شوند."
                : "Publishing makes your profile publicly accessible."
            }
            onDone={r.reload}
          />
          <Link className="btn" href="/settings">
            {fa ? "ویرایش نام و عکس حساب" : "Edit account name & photo"}
          </Link>
        </>
      )}
    </section>
  );
}
