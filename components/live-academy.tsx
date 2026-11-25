"use client";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import { Button, Icon } from "./ui";
import Link from "./site-link";
import "./live-student.css";
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
        <Catalog
          data={r.data}
          query={query}
          setQuery={setQuery}
          loading={<LiveLoad {...r} />}
          onOpen={(id) => { setPath(undefined); setCourse(id); }}
        />
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
  const progress = r.data?.progress as LiveRow | null | undefined;
  const pct = Number(progress?.progressPercent ?? 0);
  const done = new Set<string>(parseIds(progress?.completed));
  const chapters = liveRows(content?.chapters);
  const lessonIds = chapters.flatMap((c, ci) => liveRows(c.lessons).map((l, li) => String(l.id ?? `${ci}:${li}`)));
  const next = lessonIds.find((l) => !done.has(l)) ?? lessonIds[0];
  const [openChapter, setOpenChapter] = useState(0);
  const t = (a: string, b: string) => (fa ? a : b);
  return (
    <section className="ac-course">
      <LiveLoad {...r} />
      {course && (
        <>
          <header className="ac-course-hero panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={course.coverUrl ? String(course.coverUrl) : "/art/student-hero.webp"} alt="" aria-hidden="true" />
            <div>
              <span className="sd-badge">{t("دوره آموزشی", "Course")}</span>
              <h2>{String(course.title)}</h2>
              <div className="ac-chips">
                {course.difficulty ? <span><Icon name="BarChart3" size={14} />{String(course.difficulty)}</span> : null}
                {course.durationMinutes ? <span><Icon name="Clock" size={14} />{String(course.durationMinutes)} {t("دقیقه", "min")}</span> : null}
                <span><Icon name="BookOpen" size={14} />{lessonIds.length} {t("درس", "lessons")}</span>
              </div>
            </div>
          </header>
          <div className="ac-course-body">
            <div className="ac-main">
              <div className="panel">
                <ReactMarkdown>{String(content?.overview ?? course.description ?? "")}</ReactMarkdown>
              </div>
              {chapters.map((c, ci) => {
                const ids = liveRows(c.lessons).map((l, li) => String(l.id ?? `${ci}:${li}`));
                const chapterDone = ids.length > 0 && ids.every((x) => done.has(x));
                return (
                  <section className={"panel ac-chapter" + (openChapter === ci ? " open" : "")} key={ci}>
                    <button type="button" className="ac-chapter-head" aria-expanded={openChapter === ci} onClick={() => setOpenChapter(openChapter === ci ? -1 : ci)}>
                      <span className={"ac-step" + (chapterDone ? " done" : "")}>{chapterDone ? <Icon name="Check" size={14} /> : ci + 1}</span>
                      <b>{String(c.title)}</b>
                      <small>{ids.length} {t("درس", "lessons")}</small>
                      <Icon name="ChevronDown" size={16} />
                    </button>
                    {openChapter === ci && (
                      <ol className="ac-lessons">
                        {liveRows(c.lessons).map((l, li) => {
                          const lid = String(l.id ?? `${ci}:${li}`);
                          return (
                            <li key={lid} className={(done.has(lid) ? "done " : "") + (lesson === lid ? "current" : "")}>
                              <button type="button" onClick={() => setLesson(lid)}>
                                <span className="ac-dot">{done.has(lid) ? <Icon name="Check" size={12} /> : <Icon name="Play" size={12} />}</span>
                                <span>{String(l.title)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                );
              })}
              <Button onClick={() => setLesson("final")}>{t("پروژه و آزمون پایانی", "Final project and assessment")}</Button>
              {lesson && <Lesson key={id + lesson} courseId={id} lessonId={lesson} onProgress={r.reload} />}
            </div>
            <aside className="ac-side">
              <div className="panel ac-progress">
                <h3>{t("پیشرفت دوره", "Course progress")}</h3>
                <div className="sf-ring" style={{ ["--p" as string]: pct }}><strong>{pct}%</strong></div>
                <p>{done.size} / {lessonIds.length} {t("درس تکمیل شده", "lessons completed")}</p>
                {progress ? (
                  next && <Button variant="primary" onClick={() => setLesson(next)}>{t("ادامه یادگیری", "Continue learning")}</Button>
                ) : (
                  <LiveForm
                    title={t("شروع مطالعه و ثبت‌نام دوره", "Start learning and enroll")}
                    url={API + "courses/" + enc(id) + "/enroll"}
                    map={() => (pathId ? { pathId } : {})}
                    onDone={r.reload}
                    caution={t("ثبت‌نام، نسخه فعلی دوره و شرایط تکمیل آن را برای شما ثبت می‌کند.", "Enrollment locks the current course version and completion requirements for your learning record.")}
                  />
                )}
              </div>
              <div className="panel ac-info">
                <h3>{t("اطلاعات دوره", "Course info")}</h3>
                <dl>
                  <dt>{t("تعداد درس‌ها", "Lessons")}</dt><dd>{lessonIds.length}</dd>
                  {course.durationMinutes ? <><dt>{t("مدت کل", "Duration")}</dt><dd>{String(course.durationMinutes)} {t("دقیقه", "min")}</dd></> : null}
                  {course.language ? <><dt>{t("زبان", "Language")}</dt><dd>{String(course.language)}</dd></> : null}
                  <dt>{t("گواهی تکمیل", "Completion certificate")}</dt><dd>{t("پس از قبولی در آزمون پایانی", "After passing the final assessment")}</dd>
                </dl>
                {r.data?.certificate ? (
                  <a className="btn" href={API + "courses/" + enc(id) + "/certificate"} download>{t("دانلود گواهی", "Download certificate")}</a>
                ) : null}
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
function parseIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  try { const v = JSON.parse(String(value ?? "[]")); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
function Catalog({ data, query, setQuery, loading, onOpen }: { data: Record<string, unknown> | null | undefined; query: string; setQuery: (q: string) => void; loading: React.ReactNode; onOpen: (id: string) => void }) {
  const fa = useShell()!.lang === "fa";
  const t = (a: string, b: string) => (fa ? a : b);
  const courses = liveRows(data?.courses);
  const mine = courses.map((c) => liveRows(c.progress)[0]).filter(Boolean);
  const inProgress = mine.filter((p) => p.state === "IN_PROGRESS").length;
  const completed = mine.filter((p) => p.state === "COMPLETED").length;
  const certs = mine.filter((p) => p.certificateId).length;
  const current = courses.find((c) => liveRows(c.progress)[0]?.state === "IN_PROGRESS");
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const filter = params.get("filter") || "";
  const go = (f: string, search = params.get("search") || "") => setQuery("?search=" + enc(search) + "&filter=" + enc(f));
  const pct = (c: LiveRow) => Number(liveRows(c.progress)[0]?.progressPercent ?? 0);
  const filters: [string, string][] = [["", t("همه دوره‌ها", "All")], ["recommended", t("پیشنهادشده", "Recommended")], ["progress", t("در حال مطالعه", "In progress")], ["completed", t("تکمیل‌شده", "Completed")], ["new", t("جدیدترین", "Newest")], ["popular", t("محبوب‌ترین", "Popular")]];
  return (
    <div className="ac">
      <section className="panel ac-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={(process.env.NODE_ENV === "production" ? "/_v2/art/" : "/art/") + "student-academy.webp"} alt="" aria-hidden="true" />
        <div>
          <span className="sd-badge">{t("آکادمی ای آی فکر", "AIFekr Academy")}</span>
          <h2>{t("آموزش مهارت‌های آینده با هوش مصنوعی", "Learn future skills with AI")}</h2>
          <p>{t("دوره‌های کاربردی، مسیرهای یادگیری و گواهی تکمیل برای دانشجویان و حرفه‌ای‌ها.", "Practical courses, learning paths and completion certificates.")}</p>
          <div className="ac-hero-actions">
            <a className="btn primary" href="#ac-catalog">{t("کاتالوگ دوره‌ها", "Course catalog")}</a>
            <Link className="btn" href="/learn?view=paths">{t("مسیرهای یادگیری", "Learning paths")}</Link>
          </div>
        </div>
      </section>
      <div className="ac-top">
        {current ? (
          <section className="panel ac-continue">
            <h3>{t("ادامه یادگیری", "Continue learning")}</h3>
            <div className="ac-continue-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.coverUrl ? String(current.coverUrl) : "/art/student-hero.webp"} alt="" />
              <div>
                <b>{String(current.title)}</b>
                <div className="sq-progress"><i style={{ width: pct(current) + "%" }} /></div>
                <small>{pct(current)}%</small>
              </div>
              <Button variant="primary" onClick={() => onOpen(String(current.id))}>{t("ادامه", "Continue")}</Button>
            </div>
          </section>
        ) : null}
        <section className="panel ac-mine">
          <h3>{t("پیشرفت یادگیری من", "My learning")}</h3>
          <ul>
            <li><Icon name="Play" size={16} />{inProgress} {t("دوره در حال یادگیری", "in progress")}</li>
            <li><Icon name="CircleCheck" size={16} />{completed} {t("دوره تکمیل‌شده", "completed")}</li>
            <li><Icon name="Trophy" size={16} />{certs} {t("گواهی دریافت‌شده", "certificates")}</li>
          </ul>
        </section>
      </div>
      <section id="ac-catalog" className="ac-catalog">
        <header>
          <h3>{t("دوره‌های آکادمی", "Academy courses")}</h3>
          <form role="search" onSubmit={(e) => { e.preventDefault(); go(filter, String(new FormData(e.currentTarget).get("search") ?? "")); }}>
            <input name="search" defaultValue={params.get("search") || ""} placeholder={t("جستجوی دوره…", "Search courses…")} aria-label={t("جستجوی دوره", "Search courses")} />
          </form>
        </header>
        <div className="ss-chips" role="group" aria-label={t("فیلتر دوره‌ها", "Course filter")}>
          {filters.map(([v, l]) => (
            <button type="button" key={v} aria-pressed={filter === v} onClick={() => go(v)}>{l}</button>
          ))}
        </div>
        {loading}
        <div className="ac-grid">
          {courses.map((c) => {
            const p = liveRows(c.progress)[0];
            return (
              <article className="panel ac-card" key={String(c.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.coverUrl ? String(c.coverUrl) : "/art/student-hero.webp"} alt="" />
                {c.recommended && !p ? <span className="ac-flag">{t("پیشنهاد برای تو", "For you")}</span> : null}
                <h4>{String(c.title)}</h4>
                <p>{String(c.description ?? "").slice(0, 110)}</p>
                <div className="ac-chips">
                  {c.durationMinutes ? <span><Icon name="Clock" size={13} />{String(c.durationMinutes)} {t("دقیقه", "min")}</span> : null}
                  {c.moduleCount ? <span><Icon name="BookOpen" size={13} />{String(c.moduleCount)} {t("بخش", "modules")}</span> : null}
                  {c.difficulty ? <span>{String(c.difficulty)}</span> : null}
                </div>
                {p ? <div className="sq-progress"><i style={{ width: pct(c) + "%" }} /></div> : null}
                <Button variant={p ? "primary" : ""} onClick={() => onOpen(String(c.id))}>
                  {p?.state === "COMPLETED" ? t("مرور دوره", "Review") : p ? t("ادامه یادگیری", "Continue") : t("شروع دوره", "Start course")}
                </Button>
              </article>
            );
          })}
        </div>
        {data && !courses.length ? <p className="sd-empty">{t("دوره‌ای پیدا نشد.", "No courses found.")}</p> : null}
        {data?.nextCursor ? (
          <Button onClick={() => { const next = new URLSearchParams(params); next.set("cursor", String(data.nextCursor)); setQuery("?" + next.toString()); }}>{t("صفحه بعد", "Next page")}</Button>
        ) : null}
      </section>
    </div>
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
