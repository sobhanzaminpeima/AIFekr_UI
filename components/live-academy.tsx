"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  liveRequest,
  type LiveRow,
} from "./live-module-kit";
import {
  assessmentAnswers,
  type PublicAssessmentQuestion,
} from "@/lib/academy-contract";
const API = "/api/learn/",
  enc = encodeURIComponent;
export function LiveAcademy({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa";
  const [query, setQuery] = useState(""),
    [course, setCourse] = useState<string | null>(null),
    [path, setPath] = useState<string | undefined>();
  const r = useLiveData(API + "courses" + query),
    paths = useLiveData(view.id === "paths" ? API + "paths" : null);
  return (
    <LiveModuleFrame module={module} view={view}>
      {view.id === "profile" ? (
        <AcademicProfile />
      ) : view.id === "paths" ? (
        <section className="panel">
          <LiveLoad {...paths} />
          {paths.data &&
            liveRows(paths.data.paths).map((p) => (
              <section className="domain-card" key={String(p.id)}>
                <h3>{String(p.title ?? p.name)}</h3>
                <p>{String(p.description ?? "")}</p>
                <LiveTable
                  items={liveRows(p.courses)}
                  columns={[
                    field("title", "دوره", "Course"),
                    field("completed", "تکمیل‌شده", "Completed"),
                    field("locked", "نیازمند پیش‌نیاز", "Prerequisite locked"),
                  ]}
                  actions={(c) => (
                    <Button
                      disabled={!!c.locked}
                      onClick={() => {
                        setPath(String(p.id));
                        setCourse(String(c.courseId));
                      }}
                    >
                      {fa ? "باز کردن" : "Open"}
                    </Button>
                  )}
                />
              </section>
            ))}
        </section>
      ) : view.id === "certificates" ? (
        <AcademicProfile certificates />
      ) : (
        <section className="panel">
          <form
            className="home-composer"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              setQuery(
                "?search=" +
                  enc(String(d.get("search") ?? "")) +
                  "&filter=" +
                  enc(String(d.get("filter") ?? "")),
              );
            }}
          >
            <input
              name="search"
              placeholder={fa ? "جستجوی دوره" : "Search courses"}
              aria-label={fa ? "جستجوی دوره" : "Search courses"}
            />
            <select name="filter">
              <option value="">{fa ? "همه دوره‌ها" : "All courses"}</option>
              <option value="recommended">
                {fa ? "پیشنهادشده" : "Recommended"}
              </option>
              <option value="progress">
                {fa ? "در حال مطالعه" : "In progress"}
              </option>
              <option value="completed">
                {fa ? "تکمیل‌شده" : "Completed"}
              </option>
            </select>
            <Button type="submit">{fa ? "جستجو" : "Search"}</Button>
          </form>
          <LiveLoad {...r} />
          {r.data && (
            <LiveTable
              items={liveRows(r.data.courses).map((c) => ({
                ...c,
                progressPercent: liveRows(c.progress)[0]?.progressPercent,
              }))}
              columns={[
                field("title", "عنوان دوره", "Course"),
                field("difficulty", "سطح", "Difficulty"),
                field("language", "زبان", "Language"),
                field("durationMinutes", "مدت (دقیقه)", "Duration (minutes)"),
                field("progressPercent", "پیشرفت ٪", "Progress %"),
              ]}
              actions={(c) => (
                <Button
                  onClick={() => {
                    setPath(undefined);
                    setCourse(String(c.id));
                  }}
                >
                  {fa
                    ? "درس‌ها و ادامه مطالعه"
                    : "Lessons and continue learning"}
                </Button>
              )}
            />
          )}
          {!!r.data?.nextCursor && (
            <Button
              onClick={() => {
                const params = new URLSearchParams(query);
                params.set("cursor", String(r.data!.nextCursor));
                setQuery("?" + params.toString());
              }}
            >
              {fa ? "صفحه بعد" : "Next page"}
            </Button>
          )}
        </section>
      )}
      {course && (
        <Course
          key={course}
          id={course}
          pathId={path}
          final={view.id === "assessment"}
        />
      )}
    </LiveModuleFrame>
  );
}
function Course({
  id,
  pathId,
  final,
}: {
  id: string;
  pathId?: string;
  final: boolean;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "courses/" + enc(id));
  const [lesson, setLesson] = useState(final ? "final" : "");
  const course = r.data?.course as LiveRow | undefined,
    content = course?.content as LiveRow | undefined;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {course && (
        <>
          <h2>{String(course.title)}</h2>
          <ReactMarkdown>
            {String(content?.overview ?? course.description ?? "")}
          </ReactMarkdown>
          <p>
            {fa ? "پیشرفت تأییدشده: " : "Verified progress: "}
            {String((r.data?.progress as LiveRow | null)?.progressPercent ?? 0)}
            ٪
          </p>
          {!r.data?.progress && (
            <LiveForm
              title={
                fa ? "شروع مطالعه و ثبت‌نام دوره" : "Start learning and enroll"
              }
              url={API + "courses/" + enc(id) + "/enroll"}
              map={() => (pathId ? { pathId } : {})}
              onDone={r.reload}
              caution={
                fa
                  ? "ثبت‌نام، نسخه فعلی دوره و شرایط تکمیل آن را برای شما ثبت می‌کند."
                  : "Enrollment locks the current course version and completion requirements for your learning record."
              }
            />
          )}
          <div className="module-tabs">
            {liveRows(content?.chapters).map((c, ci) => (
              <div key={ci}>
                <strong>{String(c.title)}</strong>
                {liveRows(c.lessons).map((l, li) => (
                  <Button
                    key={String(l.id ?? li)}
                    onClick={() => setLesson(String(l.id ?? `${ci}:${li}`))}
                  >
                    {String(l.title)}
                  </Button>
                ))}
              </div>
            ))}
            <Button onClick={() => setLesson("final")}>
              {fa ? "پروژه و آزمون پایانی" : "Final project and assessment"}
            </Button>
          </div>
          {r.data?.certificate && (
            <a href={API + "courses/" + enc(id) + "/certificate"} download>
              {fa ? "دانلود گواهی تأییدشده" : "Download earned certificate"}
            </a>
          )}
          {lesson && (
            <Lesson
              key={id + lesson}
              courseId={id}
              lessonId={lesson}
              onProgress={r.reload}
            />
          )}
        </>
      )}
    </section>
  );
}
function Lesson({
  courseId,
  lessonId,
  onProgress,
}: {
  courseId: string;
  lessonId: string;
  onProgress: () => void;
}) {
  const fa = useShell()!.lang === "fa",
    base = API + "courses/" + enc(courseId),
    r = useLiveData(base + "/lesson?lesson=" + enc(lessonId)),
    notes = useLiveData(base + "/notes?lesson=" + enc(lessonId)),
    tutor = useLiveData(lessonId !== "final" ? base + "/tutor" : null);
  const [answer, setAnswer] = useState("");
  const lesson = r.data?.lesson as LiveRow | undefined;
  const requestKey = useRef("");
  return (
    <section className="domain-card">
      <LiveLoad {...r} />
      {lesson && (
        <>
          <h3>{String(lesson.title)}</h3>
          <ReactMarkdown>{String(lesson.content ?? "")}</ReactMarkdown>
          {liveRows(lesson.blocks).map((b, i) => (
            <LearningBlock key={i} block={b} />
          ))}
          <h4>{fa ? "فعالیت" : "Activity"}</h4>
          <ReactMarkdown>{String(lesson.activity ?? "")}</ReactMarkdown>
          <LiveForm
            title={
              fa
                ? "ثبت مطالعه و تکمیل فعالیت"
                : "Record lesson/activity completion"
            }
            url={base + "/progress"}
            map={() => {
              requestKey.current ||= crypto.randomUUID();
              return {
                lessonId,
                action: "complete",
                requestKey: requestKey.current,
              };
            }}
            onDone={() => {
              requestKey.current = "";
              onProgress();
            }}
            caution={
              fa
                ? "فقط زمانی تأیید کنید که متن و فعالیت درس را انجام داده‌اید. نمره آزمون و شرایط گواهی توسط سرور بررسی می‌شود."
                : "Confirm after studying and completing the activity. Assessment grades and certificate requirements are checked by the server."
            }
          />
          <Assessment
            questions={
              liveRows(lesson.quiz) as unknown as PublicAssessmentQuestion[]
            }
            url={base + "/progress"}
            lessonId={lessonId}
            token={
              typeof lesson.assessmentToken === "string"
                ? lesson.assessmentToken
                : undefined
            }
            onDone={() => {}}
          />
          <Button onClick={onProgress}>
            {fa
              ? "به‌روزرسانی پیشرفت پس از مشاهده نتیجه"
              : "Refresh course progress after reviewing the result"}
          </Button>
          <LiveLoad {...notes} />
          {notes.data && (
            <LiveForm
              title={fa ? "ذخیره یادداشت درس" : "Save lesson note"}
              url={base + "/notes?lesson=" + enc(lessonId)}
              method="PUT"
              fields={[
                field("content", "یادداشت من", "My note", "textarea", true),
              ]}
              initial={{
                content: (notes.data.note as LiveRow | null)?.content ?? "",
              }}
              onDone={notes.reload}
            />
          )}
          {lessonId !== "final" && (
            <>
              <LiveLoad {...tutor} />
              {typeof tutor.data?.cost === "number" && (
                <>
                  <p>
                    {fa ? "هزینه هر پرسش از مدرس: " : "Tutor question cost: "}
                    {tutor.data.cost} {fa ? "کردیت" : "credits"}
                  </p>
                  <LiveForm
                    title={fa ? "پرسش از مدرس AI" : "Ask the AI tutor"}
                    url={base + "/tutor"}
                    fields={[
                      field(
                        "prompt",
                        "پرسش درباره همین درس",
                        "Question about this lesson",
                        "textarea",
                      ),
                    ]}
                    map={(b) => ({
                      ...b,
                      lessonId,
                      expectedCredits: tutor.data!.cost,
                    })}
                    onDone={(d) => setAnswer(String(d.text ?? ""))}
                    caution={
                      fa
                        ? "پاسخ بر پایه درس تولید و هزینه نمایش‌داده‌شده کسر می‌شود."
                        : "An answer grounded in this lesson is generated at the displayed credit cost."
                    }
                  />
                </>
              )}
              {answer && <ReactMarkdown>{answer}</ReactMarkdown>}
            </>
          )}
        </>
      )}
    </section>
  );
}
function LearningBlock({ block: b }: { block: LiveRow }) {
  if (b.type === "code")
    return (
      <pre>
        <code>{String(b.code)}</code>
      </pre>
    );
  if (["steps", "flashcards"].includes(String(b.type)))
    return (
      <ol>
        {(Array.isArray(b.items) ? b.items : []).map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ol>
    );
  if (b.type === "table")
    return (
      <div className="domain-table-wrap">
        <table className="domain-table">
          <thead>
            <tr>
              {(Array.isArray(b.headers) ? b.headers : []).map((v, i) => (
                <th key={i}>{String(v)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(b.rows) ? b.rows : []).map((row, i) => (
              <tr key={i}>
                {(Array.isArray(row) ? row : []).map((v, j) => (
                  <td key={j}>{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (
    ["image", "resource", "videoEmbed"].includes(String(b.type)) &&
    typeof b.url === "string" &&
    b.url.startsWith("https://")
  )
    return b.type === "image" ? (
      <figure>
        <img
          src={b.url}
          alt={String(b.alt ?? "")}
          loading="lazy"
          style={{ maxWidth: "100%" }}
        />
        <figcaption>{String(b.caption ?? "")}</figcaption>
      </figure>
    ) : (
      <a href={b.url} target="_blank" rel="noopener noreferrer">
        {String(b.alt ?? b.caption ?? b.url)}
      </a>
    );
  if (b.prompt)
    return (
      <details>
        <summary>{String(b.prompt)}</summary>
        <p>{String(b.answer ?? "")}</p>
      </details>
    );
  return <ReactMarkdown>{String(b.text ?? "")}</ReactMarkdown>;
}
function Assessment({
  questions,
  url,
  lessonId,
  token,
  onDone,
}: {
  questions: PublicAssessmentQuestion[];
  url: string;
  lessonId: string;
  token?: string;
  onDone: () => void;
}) {
  const fa = useShell()!.lang === "fa";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<LiveRow | null>(null);
  const lock = useRef(false),
    prior = useRef({ signature: "", key: "" });
  if (!questions.length) return null;
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        setError("");
        try {
          const answers = assessmentAnswers(
              questions,
              new FormData(e.currentTarget),
            ),
            signature = JSON.stringify(answers);
          if (prior.current.signature !== signature)
            prior.current = { signature, key: crypto.randomUUID() };
          lock.current = true;
          setBusy(true);
          const d = await liveRequest(url, "POST", {
            lessonId,
            action: "quiz",
            answers,
            ...(token ? { assessmentToken: token } : {}),
            requestKey: prior.current.key,
          });
          setResult((d.result ?? {}) as LiveRow);
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <h4>{fa ? "آزمون با ارزیابی سرور" : "Server-graded assessment"}</h4>
      {questions.map((q, i) => (
        <fieldset key={i} disabled={busy}>
          <legend>
            {i + 1}. {q.question}
          </legend>
          {q.type === "shortAnswer" ? (
            <textarea name={"q" + i} required maxLength={2000} />
          ) : q.type === "trueFalse" ? (
            <select name={"q" + i} required defaultValue="">
              <option value="" disabled>
                {fa ? "انتخاب پاسخ" : "Choose answer"}
              </option>
              <option value="true">{fa ? "درست" : "True"}</option>
              <option value="false">{fa ? "نادرست" : "False"}</option>
            </select>
          ) : ["multipleChoice", "multipleSelect"].includes(q.type) ? (
            q.options?.map((option, j) => (
              <label key={j}>
                <input
                  name={"q" + i}
                  value={j}
                  type={q.type === "multipleChoice" ? "radio" : "checkbox"}
                  required={q.type === "multipleChoice"}
                />
                {option}
              </label>
            ))
          ) : (
            (q.type === "ordering" ? q.items : q.left)?.map((item, j) => (
              <label key={j}>
                {q.type === "ordering"
                  ? fa
                    ? `جایگاه ${j + 1}`
                    : `Position ${j + 1}`
                  : item}
                <select name={`q${i}_${j}`} required defaultValue="">
                  <option value="" disabled>
                    {fa ? "انتخاب" : "Choose"}
                  </option>
                  {(q.type === "ordering" ? q.items : q.right)?.map(
                    (choice, k) => (
                      <option key={k} value={k}>
                        {choice}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ))
          )}
        </fieldset>
      ))}
      {error && <p role="alert">{error}</p>}
      {result && (
        <p role="status">
          {fa ? "نتیجه ثبت‌شده: " : "Recorded result: "}
          {String(result.score ?? "—")} ·{" "}
          {result.passed
            ? fa
              ? "قبول"
              : "Passed"
            : fa
              ? "نیازمند مرور"
              : "Review required"}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy
          ? fa
            ? "در حال ارزیابی…"
            : "Grading…"
          : fa
            ? "ارسال پاسخ‌ها"
            : "Submit answers"}
      </Button>
    </form>
  );
}
export function AcademicProfile({
  certificates = false,
}: {
  certificates?: boolean;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/student/academic-profile");
  const p = r.data?.profile as LiveRow | null;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          {certificates ? (
            <LiveTable
              items={liveRows(r.data.completions).map((c) => ({
                ...c,
                certificateId: (c.certificate as LiveRow | null)?.id,
                certificateStatus: (c.certificate as LiveRow | null)?.status,
              }))}
              columns={[
                field("completedAt", "تاریخ تکمیل", "Completed"),
                field("score", "نمره نهایی", "Final score"),
                field("certificateStatus", "وضعیت گواهی", "Certificate status"),
              ]}
              actions={(c) =>
                c.certificateId ? (
                  <a
                    href={
                      API +
                      "courses/" +
                      enc(String(c.courseId)) +
                      "/certificate?certificate=" +
                      enc(String(c.certificateId))
                    }
                    download
                  >
                    {fa ? "دانلود PDF" : "Download PDF"}
                  </a>
                ) : null
              }
            />
          ) : (
            <LiveForm
              title={fa ? "ذخیره پروفایل تحصیلی" : "Save academic profile"}
              url="/api/student/academic-profile"
              method="PATCH"
              fields={[
                {
                  ...field("majorId", "رشته", "Major"),
                  choices: [
                    { value: "", label: fa ? "انتخاب‌نشده" : "Not selected" },
                    ...liveRows(r.data.majors).map((m) => ({
                      value: String(m.id),
                      label: String(m.name),
                    })),
                  ],
                },
                field(
                  "educationLevel",
                  "مقطع",
                  "Education level",
                  "text",
                  true,
                ),
                field(
                  "institution",
                  "دانشگاه / مؤسسه",
                  "Institution",
                  "text",
                  true,
                ),
                field("faculty", "دانشکده", "Faculty", "text", true),
                field(
                  "academicYear",
                  "سال تحصیلی",
                  "Academic year",
                  "number",
                  true,
                ),
                field(
                  "expectedGraduationYear",
                  "سال پایان (میلادی)",
                  "Graduation year",
                  "number",
                  true,
                ),
                field(
                  "interests",
                  "علاقه‌ها؛ هر خط یک مورد",
                  "Interests; one per line",
                  "textarea",
                  true,
                ),
                field(
                  "learningGoals",
                  "اهداف یادگیری",
                  "Learning goals",
                  "textarea",
                  true,
                ),
              ]}
              initial={{
                ...p,
                interests: (() => {
                  try {
                    return JSON.parse(String(p?.interests ?? "[]")).join("\n");
                  } catch {
                    return "";
                  }
                })(),
              }}
              map={(b) => ({
                ...b,
                majorId: b.majorId || null,
                ...(b.academicYear === "" ? { academicYear: null } : {}),
                ...(b.expectedGraduationYear === ""
                  ? { expectedGraduationYear: null }
                  : {}),
                interests: String(b.interests ?? "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })}
              onDone={r.reload}
            />
          )}
        </>
      )}
    </section>
  );
}
