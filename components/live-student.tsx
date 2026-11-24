"use client";
import "./live-student.css";
import { AIText } from "./ai-text";
import { FlashcardDeck, type Flashcard } from "./flashcard-deck";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import Link from "./site-link";
import { Button, Icon } from "./ui";
import { AcademicProfile } from "./live-academy";
import { LiveUpload } from "./live-upload";
import { StudentDashboard } from "./live-student-dashboard";
import { StudentLocked } from "./live-student-locked";
import { LectureAudioUpload } from "./live-student-audio";
import { useShell } from "./live-shell-context";
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
    [course, setCourseState] = useState(""),
    [error, setError] = useState("");
  const items = liveRows(courses.data?.courses);
  const router = useRouter();
  // The current subject is remembered across tabs and visits.
  const setCourse = (id: string) => { setCourseState(id); try { localStorage.setItem("aifekr-student-course", id); } catch {} };
  useEffect(() => {
    if (course || !items.length) return;
    let saved = "";
    try { saved = localStorage.getItem("aifekr-student-course") || ""; } catch {}
    setCourseState(items.some((c) => String(c.id) === saved) ? saved : String(items[0].id));
  }, [items, course]);
  const choice: LiveField = {
    ...field("courseId", "درس", "Subject"),
    choices: items.map((x) => ({ value: String(x.id), label: String(x.name) })),
  };
  const shell = useShell();
  if (shell && !shell.user.studentWorkspaceEnabled) {
    return (
      <LiveModuleFrame module={module} view={view}>
        <StudentLocked pending={shell.user.pendingPaymentCount} />
      </LiveModuleFrame>
    );
  }
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...courses} />
      {error && <p role="alert">{error}</p>}
      {view.id === "overview" && <StudentSubscription />}
      {view.id === "overview" && <StudentDashboard />}
      {courses.data && view.id !== "overview" && (
        <>
          {items.length > 0 ? (
            <label className="sd-course-select">
              <span className="sd-course-icon" aria-hidden="true"><Icon name="BookOpen" size={20} /></span>
              <span className="sd-course-text">
                <small>{tl("درس فعال", "Current subject")}</small>
                <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label={tl("انتخاب درس فعال", "Choose current subject")}>
                  {items.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              </span>
              <Icon name="ChevronDown" size={18} />
            </label>
          ) : (
            <div className="panel sd-first-course">
              <span className="sd-course-icon" aria-hidden="true"><Icon name="BookOpen" size={22} /></span>
              <div>
                <b>{tl("اولین درست را بساز", "Create your first subject")}</b>
                <p>{tl("همهٔ جزوه‌ها، فلش‌کارت‌ها و آزمون‌ها به یک درس وصل می‌شوند.", "Notes, flashcards and quizzes all belong to a subject.")}</p>
              </div>
              <LiveForm title={tl("افزودن درس", "Add subject")} url={API + "courses"} fields={courseFields} onDone={courses.reload} />
            </div>
          )}
          {["courses", "path"].includes(view.id) && items.length > 0 && (
            <section className="panel sd-courses">
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
                    {course === String(c.id) ? (
                      <span className="sd-badge">✓ {tl("درس فعال", "Current subject")}</span>
                    ) : (
                      <Button onClick={() => { setCourse(String(c.id)); router.push("/student?view=upload"); }}>
                        {tl("انتخاب و ادامه", "Select and open")}
                      </Button>
                    )}
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
          {view.id === "planner" && (
            <Planner choice={choice} />
          )}
          {view.id === "reports" && (
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
const SOURCE_TYPES = ["all", "pdf", "docx", "pptx", "audio", "text"] as const;
const sourceType = (m: LiveRow) => {
  if (m.source === "audio_transcript") return "audio";
  const ext = /\.(pdf|docx|pptx)$/i.exec(String(m.title))?.[1]?.toLowerCase() || /^(pdf|docx|pptx)$/i.exec(String(m.source ?? ""))?.[1]?.toLowerCase();
  return ext || "text";
};
function Sources({ course, choice }: { course: string; choice: LiveField }) {
  const { tl, locale } = useApp(),
    r = useLiveData(API + "materials?courseId=" + enc(course)),
    [filter, setFilter] = useState<(typeof SOURCE_TYPES)[number]>("all"),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState<string | null>(null),
    [folder, setFolder] = useState<string | null>(null),
    [moveError, setMoveError] = useState("");
  const all = liveRows(r.data?.materials);
  // Folders are names on sources; a new empty folder is remembered locally until a file is put in it.
  const folderKey = "aifekr-folders-" + course;
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  useEffect(() => { try { setExtraFolders(JSON.parse(localStorage.getItem(folderKey) || "[]")); } catch { setExtraFolders([]); } }, [folderKey]);
  const folders = Array.from(new Set([...all.map((m) => (m.folder ? String(m.folder) : "")), ...extraFolders].filter(Boolean))).sort();
  function newFolder() {
    const name = window.prompt(tl("نام پوشهٔ جدید", "New folder name"))?.trim().replace(/\s+/g, " ") || "";
    if (!name) return;
    if (name.length > 60 || /[<>]/.test(name)) { setMoveError(tl("نام پوشه حداکثر ۶۰ نویسه و بدون < > باشد.", "Folder names are up to 60 characters, without < or >.")); return; }
    const next = Array.from(new Set([...extraFolders, name]));
    setExtraFolders(next);
    try { localStorage.setItem(folderKey, JSON.stringify(next)); } catch {}
    setFolder(name);
  }
  const uploadFolder = folder || "";
  const rows = all.filter((m) => (filter === "all" || sourceType(m) === filter) && (folder === null || String(m.folder ?? "") === folder) && (!query || String(m.title).toLowerCase().includes(query.toLowerCase())));
  const usage = r.data?.usage as { bytes?: number; files?: number } | undefined;
  async function move(id: string, to: string) {
    setMoveError("");
    let target: string | null = to;
    if (to === "__new") {
      target = window.prompt(tl("نام پوشهٔ جدید", "New folder name"))?.trim() || "";
      if (!target) return;
    }
    if (to === "") target = null;
    try { await liveRequest(API + "materials", "PATCH", { id, folder: target }); r.reload(); }
    catch (e) { setMoveError(e instanceof Error ? e.message : tl("جابه‌جایی انجام نشد.", "Could not move the file.")); }
  }
  const label = (t: string) => t === "all" ? tl("همه فایل‌ها", "All files") : t === "text" ? tl("متنی", "Text") : t === "audio" ? tl("صوتی", "Audio") : t.toUpperCase();
  return (
    <div className="ss">
      <section className="panel ss-drop">
        <LiveUpload
          url={API + "materials"}
          title={tl("آپلود جزوه (PDF، DOCX، PPTX)", "Upload notes (PDF, DOCX, PPTX)")}
          accept=".pdf,.docx,.pptx"
          maxBytes={10 * 1024 * 1024}
          fields={[
            { ...choice, choices: choice.choices?.filter((c) => c.value === course) },
            field("title", "عنوان", "Title", "text", true),
            { ...field("folder", "پوشه", "Folder", "text", true), choices: [...(uploadFolder ? [{ value: uploadFolder, label: uploadFolder }] : []), { value: "", label: tl("بدون پوشه", "No folder") }, ...folders.filter((f) => f !== uploadFolder).map((f) => ({ value: f, label: f }))] },
          ]}
          onDone={r.reload}
        />
        <LiveForm
          title={tl("افزودن منبع متنی", "Add text source")}
          url={API + "materials"}
          fields={[field("title", "عنوان", "Title"), { ...field("folder", "پوشه", "Folder", "text", true), choices: [...(uploadFolder ? [{ value: uploadFolder, label: uploadFolder }] : []), { value: "", label: tl("بدون پوشه", "No folder") }, ...folders.filter((f) => f !== uploadFolder).map((f) => ({ value: f, label: f }))] }, field("content", "متن منبع", "Source text", "textarea")]}
          map={(b) => ({ ...b, courseId: course })}
          onDone={r.reload}
        />
      </section>
      <LectureAudioUpload course={course} folder={uploadFolder} onDone={r.reload} />
      <div className="ss-top">
        <div className="ss-folders" role="group" aria-label={tl("پوشه‌ها", "Folders")}>
          <button type="button" aria-pressed={folder === null} onClick={() => setFolder(null)}><Icon name="FolderOpen" size={26} /><b>{tl("همه", "All")}</b><small>{all.length}</small></button>
          {folders.map((f) => <button type="button" key={f} aria-pressed={folder === f} onClick={() => setFolder(f)}><Icon name="FolderOpen" size={26} /><b>{f}</b><small>{all.filter((m) => m.folder === f).length}</small></button>)}
          <button type="button" aria-pressed={folder === ""} onClick={() => setFolder("")}><Icon name="FileText" size={26} /><b>{tl("بدون پوشه", "Unfiled")}</b><small>{all.filter((m) => !m.folder).length}</small></button>
          <button type="button" className="ss-new-folder" onClick={newFolder}><Icon name="Plus" size={26} /><b>{tl("پوشهٔ جدید", "New folder")}</b></button>
        </div>
        {usage && (
          <div className="panel ss-usage">
            <small>{tl("حجم متن ذخیره‌شده", "Stored text")}</small>
            <b>{(Number(usage.bytes ?? 0) / 1048576).toFixed(2)} MB</b>
            <small>{usage.files} {tl("فایل در همهٔ درس‌ها", "files across subjects")}</small>
          </div>
        )}
      </div>
      {moveError && <p role="alert">{moveError}</p>}
      <div className="ss-toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tl("جستجو در جزوه‌ها…", "Search sources…")} aria-label={tl("جستجو در جزوه‌ها", "Search sources")} />
        <div className="ss-chips" role="group" aria-label={tl("نوع فایل", "File type")}>
          {SOURCE_TYPES.map((t) => <button type="button" key={t} aria-pressed={filter === t} onClick={() => setFilter(t)}>{label(t)}</button>)}
        </div>
      </div>
      <LiveLoad {...r} />
      <div className="ss-grid">
        {rows.map((m) => {
          const type = sourceType(m), id = String(m.id);
          return (
            <article className="panel ss-file" key={id}>
              <span className={"ss-type " + type}>{type === "text" ? "TXT" : type === "audio" ? tl("صوت", "AUDIO") : type.toUpperCase()}</span>
              <h4>{String(m.title)}</h4>
              <small>{new Date(String(m.createdAt)).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</small>
              <div className="ss-actions">
                <Link className="btn primary" href="/student?view=practice">{tl("مطالعه هوشمند", "Smart study")}</Link>
                <Link className="btn" href="/student?view=chat">{tl("پرسش از فایل", "Ask the file")}</Link>
                <button type="button" className="btn" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>{open === id ? tl("بستن", "Close") : tl("نمایش متن", "View text")}</button>
              </div>
              <label className="ss-move">
                <span>{tl("پوشه", "Folder")}</span>
                <select value={String(m.folder ?? "")} onChange={(e) => void move(id, e.target.value)}>
                  <option value="">{tl("بدون پوشه", "Unfiled")}</option>
                  {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                  <option value="__new">{tl("+ پوشهٔ جدید…", "+ New folder…")}</option>
                </select>
              </label>
              {open === id && <p className="ss-text">{String(m.content)}</p>}
            </article>
          );
        })}
      </div>
      {r.data && !rows.length && <p className="sd-empty">{tl("فایلی پیدا نشد.", "No files found.")}</p>}
    </div>
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
  const { tl, n } = useApp(),
    r = useLiveData(API + "flashcards?courseId=" + enc(course));
  const cards = liveRows(r.data?.flashcards);
  const due = cards.filter((c) => !c.nextReviewAt || new Date(String(c.nextReviewAt)).getTime() <= Date.now()).length;
  const learned = cards.filter((c) => Number(c.masteryLevel ?? 0) >= 3).length;
  const pct = cards.length ? Math.round((learned / cards.length) * 100) : 0;
  return (
    <div className="sf-layout">
      <section className="panel sf-main">
        <LiveLoad {...r} />
        {r.data && (
          <FlashcardDeck
            key={cards.map((c) => c.id).join()}
            cards={cards as unknown as Flashcard[]}
            url={(id) => API + "flashcards/" + enc(id)}
          />
        )}
      </section>
      <aside className="sf-side">
        <div className="panel sf-ring-card">
          <h3>{tl("پیشرفت این دسته", "Deck progress")}</h3>
          <div className="sf-ring" style={{ ["--p" as string]: pct }}><strong>{n(pct)}%</strong></div>
          <ul>
            <li><i className="green" />{tl("یادگرفته‌شده", "Learned")}<b>{n(learned)}</b></li>
            <li><i className="orange" />{tl("آمادهٔ مرور", "Due now")}<b>{n(due)}</b></li>
            <li><i className="muted" />{tl("کل کارت‌ها", "All cards")}<b>{n(cards.length)}</b></li>
          </ul>
        </div>
        <div className="panel">
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
        </div>
      </aside>
    </div>
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
    sources = useLiveData(mode === "thesis" || mode === "assignment" ? null : API + "materials?courseId=" + enc(course)),
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
      {!isThesis && !assignment && sources.data && (() => {
        const list = liveRows(sources.data.materials);
        return list.length ? (
          <div className="sai-sources">
            <b><Icon name="FileText" size={16} />{tl(`از ${list.length} منبع این درس استفاده می‌شود`, `Uses this subject's ${list.length} sources`)}</b>
            <ul>{list.slice(0, 12).map((m) => <li key={String(m.id)}>{m.source === "audio_transcript" ? "🎙 " : "📄 "}{String(m.title)}</li>)}</ul>
            {list.length > 12 && <small>{tl("۱۲ منبع جدیدتر استفاده می‌شوند.", "The 12 newest sources are used.")}</small>}
          </div>
        ) : (
          <p className="sa-error">{tl("هنوز جزوه یا ویسی برای این درس نیست. اول از «جزوه و منابع» اضافه کن.", "This subject has no notes or audio yet. Add some under Sources first.")} <Link href="/student?view=upload">{tl("افزودن منبع", "Add a source")}</Link></p>
        );
      })()}
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
            isThesis || assignment
              ? field("prompt", "پرسش یا متن شما", "Your question or text", "textarea")
              : field("prompt", "پرسش، یا موضوعی که روی آن تمرکز شود (برای فلش‌کارت و آزمون اختیاری)", "Question, or a topic to focus on (optional for flashcards and quizzes)", "textarea", true),
            ...(!isThesis && !assignment
              ? [field("count", "تعداد (۳ تا ۱۵)", "Count (3–15)", "number")]
              : []),
          ]}
          initial={{ count: 5 }}
          map={(b) => ({
            ...b,
            courseId: course,
            // Flashcards and quizzes can run on the whole subject: the server always reads its sources.
            ...(!isThesis && !assignment && !String(b.prompt ?? "").trim() && b.action !== "ask"
              ? { prompt: b.action === "quiz" ? tl("آزمون از کل جزوه‌ها و منابع این درس", "Quiz on all of this subject's sources") : tl("فلش‌کارت از کل جزوه‌ها و منابع این درس", "Flashcards from all of this subject's sources") }
              : {}),
          })}
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
        <div className="sai-result" role="status">
          {result.created != null ? (
            <div className="sai-done">
              <span className="sai-done-icon"><Icon name="Layers" size={22} /></span>
              <div>
                <b>{tl(`${String(result.created)} فلش‌کارت ساخته شد`, `${String(result.created)} flashcards created`)}</b>
                <small>{tl("کردیت مصرف‌شده: ", "Credits used: ")}{String(result.creditsUsed ?? "—")}</small>
              </div>
              <Link className="btn primary" href="/student?view=review">{tl("شروع مرور فلش‌کارت‌ها", "Review the flashcards")}</Link>
            </div>
          ) : result.quiz != null ? (
            <div className="sai-done">
              <span className="sai-done-icon"><Icon name="CircleCheck" size={22} /></span>
              <div>
                <b>{tl("آزمون ساخته شد", "Quiz created")}</b>
                <small>{tl("کردیت مصرف‌شده: ", "Credits used: ")}{String(result.creditsUsed ?? "—")}</small>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setQuiz(String((result.quiz as LiveRow).id));
                  setAttemptToken(String((result.quiz as LiveRow).attemptToken ?? ""));
                  setTimeout(() => document.querySelector(".sq")?.scrollIntoView({ behavior: "smooth" }), 50);
                }}
              >
                {tl("شروع آزمون", "Start the quiz")}
              </Button>
            </div>
          ) : (
            <>
              <p className="sai-credits">{tl("کردیت مصرف‌شده: ", "Credits used: ")}{String(result.creditsUsed ?? "—")}</p>
              <AIText text={String(result.answer ?? result.content ?? "")} />
              {result.savedNoteId != null && <Link className="text-link" href="/student?view=notes">{tl("این پاسخ در یادداشت‌ها ذخیره شد ←", "Saved to your notes ←")}</Link>}
            </>
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
  const { tl, n } = useApp(),
    r = useLiveData(API + "quizzes/" + enc(id)),
    [answers, setAnswers] = useState<Record<number, number>>({}),
    [current, setCurrent] = useState(0),
    [flagged, setFlagged] = useState<Record<number, boolean>>({}),
    [started] = useState(() => Date.now()),
    [now, setNow] = useState(() => Date.now()),
    [result, setResult] = useState<LiveRow | null>(null);
  const quiz = r.data?.quiz as LiveRow | undefined;
  const questions = liveRows(quiz?.questions);
  const limit = Number(quiz?.timeLimitSeconds ?? 0);
  useEffect(() => {
    if (!limit || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [limit, result]);
  const left = Math.max(0, limit - Math.floor((now - started) / 1000));
  const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const answered = Object.keys(answers).length;
  const q = questions[current];
  return (
    <section className="sq">
      <LiveLoad {...r} />
      {quiz && (
        <>
          {quiz.timeLimitSeconds && !attemptToken ? (
            <p role="alert">
              {tl("آزمون زمان‌دار فقط با توکن شروع همان اجرای تولید قابل ثبت است؛ این آزمون را از نتیجه تولید باز کنید.", "A timed quiz requires the original start token. Open it from the generation result.")}
            </p>
          ) : null}
          <div className="sq-layout">
            <div className="panel sq-main">
              <div className="sq-head">
                <span className="sd-badge">{tl("سؤال", "Question")} {n(current + 1)} {tl("از", "of")} {n(questions.length)}</span>
                <h3>{String(quiz.title)}</h3>
              </div>
              {q && (
                <fieldset className="sq-question" key={current}>
                  <legend>{String(q.question)}</legend>
                  {(q.options as string[]).map((v, i) => (
                    <label key={i} className={answers[current] === i ? "selected" : ""}>
                      <input
                        type="radio"
                        name={"quiz-" + id + "-" + current}
                        checked={answers[current] === i}
                        onChange={() => setAnswers((a) => ({ ...a, [current]: i }))}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="sq-nav">
                <Button onClick={() => setFlagged((f) => ({ ...f, [current]: !f[current] }))} className={flagged[current] ? "sq-flagged" : ""}>{flagged[current] ? tl("حذف نشانه", "Unmark") : tl("نشانه‌گذاری", "Mark for review")}</Button>
                {answers[current] !== undefined && <Button onClick={() => setAnswers((a) => { const next = { ...a }; delete next[current]; return next; })}>{tl("حذف پاسخ", "Clear answer")}</Button>}
                <Button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>{tl("سؤال قبل", "Previous")}</Button>
                {current < questions.length - 1 ? (
                  <Button variant="primary" onClick={() => setCurrent((c) => c + 1)}>{tl("سؤال بعد", "Next")}</Button>
                ) : (
                  <LiveForm
                    title={tl("ثبت پاسخ‌ها و دریافت نمره", "Submit answers & get grade")}
                    url={API + "quizzes/" + enc(id)}
                    map={() => ({
                      answers: questions.map((_, i) => answers[i] ?? null),
                      ...(attemptToken ? { attemptToken } : {}),
                    })}
                    onDone={setResult}
                  />
                )}
              </div>
            </div>
            <aside className="sq-side">
              {limit > 0 && (
                <div className="panel sq-timer" role="timer" aria-label={tl("زمان باقی‌مانده", "Time left")}>
                  <small>{tl("زمان باقی‌مانده", "Time left")}</small>
                  <strong>{clock}</strong>
                </div>
              )}
              <div className="panel">
                <small>{tl("پیشرفت آزمون", "Progress")}</small>
                <div className="sq-progress"><i style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }} /></div>
                <p>{n(answered)} / {n(questions.length)} {tl("پاسخ داده شده", "answered")} · {n(Object.values(flagged).filter(Boolean).length)} {tl("نشانه‌گذاری شده", "marked")}</p>
              </div>
              <div className="panel">
                <small>{tl("سؤالات آزمون", "Questions")}</small>
                <div className="sq-grid">
                  {questions.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setCurrent(i)}
                      aria-current={i === current ? "step" : undefined}
                      className={(answers[i] !== undefined ? "done" : "") + (flagged[i] ? " flagged" : "")}
                    >
                      {n(i + 1)}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
          {result && (
            <div className="panel sq-result">
              <h3>{tl("نتیجه آزمون", "Your result")}</h3>
              <p className="sq-score">
                {String((result.attempt as LiveRow)?.score ?? "—")} / {String((result.attempt as LiveRow)?.total ?? "—")}
              </p>
              <LiveTable
                items={liveRows((result.attempt as LiveRow)?.review)}
                columns={[
                  field("question", "پرسش", "Question"),
                  field("correct", "درست", "Correct"),
                  field("explanation", "توضیح", "Explanation"),
                ]}
              />
            </div>
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
