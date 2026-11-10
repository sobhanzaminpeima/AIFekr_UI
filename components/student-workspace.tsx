"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { Learning } from "./learning";
import { toast } from "sonner";
type Subject = {
  id: string;
  name: string;
  teacher: string;
  color: string;
  progress: number;
};
type Material = {
  id: string;
  subject: string;
  name: string;
  size: number;
  type: string;
  text: string;
  date: string;
};
type Note = {
  id: string;
  subject: string;
  title: string;
  text: string;
  date: string;
};
type Task = {
  id: string;
  subject: string;
  title: string;
  due: string;
  kind: string;
  done: boolean;
};
type Session = { id: string; subject: string; seconds: number; date: string };
type Group = {
  id: string;
  name: string;
  subject: string;
  messages: { id: string; text: string; date: string }[];
};
const uid = () => crypto.randomUUID();
export function StudentWorkspace({ view }: { view: string }) {
  const { fa, t, n, tl } = useApp();
  const [subjects, saveSubjects] = useLocalState<Subject[]>(
    "aifekr-study-subjects",
    [],
  );
  const [materials, saveMaterials] = useLocalState<Material[]>(
    "aifekr-study-materials",
    [],
  );
  const [notes, saveNotes] = useLocalState<Note[]>("aifekr-study-notes", []);
  const [tasks, saveTasks] = useLocalState<Task[]>("aifekr-study-tasks", []);
  const [sessions, saveSessions] = useLocalState<Session[]>(
    "aifekr-study-sessions",
    [],
  );
  const [groups, saveGroups] = useLocalState<Group[]>(
    "aifekr-study-groups",
    [],
  );
  const [profile, saveProfile] = useLocalState("aifekr-study-profile", {
    name: "",
    institution: "",
    major: "",
    level: "undergraduate",
    language: "fa",
    goal: "",
  });
  const [subject, setSubject] = useState<Subject | null>(null);
  const [selected, setSelected] = useState("all");
  const [note, setNote] = useState<Note | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [message, setMessage] = useState("");
  const [activeTimer, setActiveTimer] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(0);
  const [topic, setTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [outline, setOutline] = useState("");
  useEffect(() => {
    if (!activeTimer) return;
    const timer = setInterval(
      () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [activeTimer, started]);
  const selectSubject = (required = false) => (
    <select
      aria-label={tl("انتخاب درس", "Choose subject")}
      required={required}
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
    >
      <option value="all">
        {required
          ? tl("انتخاب درس", "Choose subject")
          : tl("همه درس‌ها", "All subjects")}
      </option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
  if (view === "practice") return <Learning path="/student/quiz" />;
  if (view === "review") return <Learning path="/student/flashcards" />;
  if (view === "courses" || view === "path")
    return (
      <>
        <div className="domain-toolbar">
          <Button
            variant="primary"
            onClick={() =>
              setSubject({
                id: uid(),
                name: "",
                teacher: "",
                color: "#6ba6bd",
                progress: 0,
              })
            }
          >
            {tl("افزودن درس", "Add subject")}
          </Button>
        </div>
        {subjects.length ? (
          <div className="study-subject-grid">
            {subjects.map((s) => (
              <article
                className="panel study-subject-card"
                key={s.id}
                style={{ borderTopColor: s.color }}
              >
                <div className="row-between">
                  <span className="icon-chip blue">
                    <Icon name="BookOpen" size={26} />
                  </span>
                  <Button onClick={() => setSubject(s)}>
                    {tl("ویرایش", "Edit")}
                  </Button>
                </div>
                <h3>{s.name}</h3>
                <p>
                  {s.teacher || (tl("مدرس مشخص نشده", "No teacher assigned"))}
                </p>
                <div className="row-between">
                  <span>{tl("پیشرفت ثبت‌شده", "Recorded progress")}</span>
                  <strong>{n(s.progress)}٪</strong>
                </div>
                <progress max={100} value={s.progress} />
                <div className="domain-actions">
                  <Link className="btn" href="/student?view=upload">
                    {tl("منابع", "Resources")}
                  </Link>
                  <Link className="btn" href="/student?view=planner">
                    {tl("برنامه مطالعه", "Study plan")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty />
        )}
        {subject && (
          <Modal
            title={tl("مشخصات درس", "Subject details")}
            onClose={() => setSubject(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSubjects(
                  subjects.some((s) => s.id === subject.id)
                    ? subjects.map((s) => (s.id === subject.id ? subject : s))
                    : [...subjects, subject],
                );
                setSubject(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {tl("نام درس", "Subject name")}
                  <input
                    required
                    value={subject.name}
                    onChange={(e) =>
                      setSubject({ ...subject, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tl("مدرس", "Teacher")}
                  <input
                    value={subject.teacher}
                    onChange={(e) =>
                      setSubject({ ...subject, teacher: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tl("رنگ درس", "Subject color")}
                  <input
                    type="color"
                    value={subject.color}
                    onChange={(e) =>
                      setSubject({ ...subject, color: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tl("پیشرفت (%)", "Progress (%)")}
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={subject.progress}
                    onChange={(e) =>
                      setSubject({
                        ...subject,
                        progress: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </>
    );
  if (view === "upload")
    return (
      <>
        <div className="domain-toolbar">{selectSubject()}</div>
        <section className="panel study-upload">
          <span className="icon-chip blue">
            <Icon name="Upload" size={35} />
          </span>
          <h2>
            {tl("منابع هر درس، در جای خودش.", "Every subject’s resources, in one place.")}
          </h2>
          <p>
            {tl("فایل را انتخاب کن تا نام، نوع و اندازه آن در کتابخانه محلی ثبت شود. متن فایل‌های TXT و Markdown نیز نگه‌داری می‌شود.", "Choose a file to record its name, type and size in your local library. TXT and Markdown text is also retained.")}
          </p>
          <label className="study-upload-control">
            {tl("افزودن منبع محلی", "Add local resource")}
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const next = await Promise.all(
                  files.map(async (f) => ({
                    id: uid(),
                    subject: selected === "all" ? "" : selected,
                    name: f.name,
                    size: f.size,
                    type: f.type || f.name.split(".").pop() || "",
                    text:
                      /\.(txt|md)$/i.test(f.name) && f.size <= 2000000
                        ? await f.text()
                        : "",
                    date: new Date().toISOString(),
                  })),
                );
                saveMaterials([...next, ...materials]);
                e.target.value = "";
              }}
            />
          </label>
          <small>
            {tl("PDF و DOCX فقط به صورت اطلاعات فایل ثبت می‌شوند؛ پردازش محتوای آن‌ها متصل نیست.", "PDF and DOCX are recorded as metadata; content processing is not connected.")}
          </small>
        </section>
        <section className="panel">
          <h3>{tl("کتابخانه منابع", "Resource library")}</h3>
          {materials
            .filter((m) => selected === "all" || m.subject === selected)
            .map((m) => (
              <article className="study-resource" key={m.id}>
                <span className="icon-chip blue">
                  <Icon name="BookOpen" size={22} />
                </span>
                <div>
                  <strong>{m.name}</strong>
                  <small>
                    {subjects.find((s) => s.id === m.subject)?.name ||
                      (tl("بدون درس", "Unassigned"))}{" "}
                    · {n(Math.round(m.size / 1024))} KB
                  </small>
                </div>
                <div className="domain-actions">
                  {m.text && (
                    <Button onClick={() => download(m.name, m.text)}>
                      {t("download")}
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      saveMaterials(materials.filter((x) => x.id !== m.id))
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </article>
            ))}
          {!materials.length && <Empty />}
        </section>
      </>
    );
  if (view === "notes")
    return (
      <>
        <div className="domain-toolbar">
          {selectSubject()}
          <Button
            variant="primary"
            onClick={() =>
              setNote({
                id: uid(),
                subject: selected === "all" ? "" : selected,
                title: "",
                text: "",
                date: new Date().toISOString(),
              })
            }
          >
            {tl("یادداشت تازه", "New note")}
          </Button>
        </div>
        <div className="study-notes-grid">
          {notes
            .filter((note) => selected === "all" || note.subject === selected)
            .map((note) => (
              <article className="panel study-note" key={note.id}>
                <span className="eyebrow">
                  {subjects.find((s) => s.id === note.subject)?.name ||
                    (tl("دفتر شخصی", "Personal notebook"))}
                </span>
                <h3>{note.title}</h3>
                <p>{note.text}</p>
                <div className="domain-actions">
                  <Button onClick={() => setNote(note)}>
                    {tl("ویرایش", "Edit")}
                  </Button>
                  <Button
                    onClick={() => download(note.title + ".txt", note.text)}
                  >
                    {t("download")}
                  </Button>
                  <Button
                    onClick={() =>
                      saveNotes(notes.filter((x) => x.id !== note.id))
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </article>
            ))}
        </div>
        {!notes.length && <Empty />}
        {note && (
          <Modal
            title={tl("دفتر یادداشت", "Study notebook")}
            onClose={() => setNote(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveNotes(
                  notes.some((x) => x.id === note.id)
                    ? notes.map((x) => (x.id === note.id ? note : x))
                    : [note, ...notes],
                );
                setNote(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {tl("عنوان یادداشت", "Note title")}
                  <input
                    required
                    value={note.title}
                    onChange={(e) =>
                      setNote({ ...note, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tl("درس مرتبط", "Related subject")}
                  <select
                    value={note.subject}
                    onChange={(e) =>
                      setNote({ ...note, subject: e.target.value })
                    }
                  >
                    <option value="">
                      {tl("دفتر شخصی", "Personal notebook")}
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                {tl("متن یادداشت", "Note content")}
                <textarea
                  required
                  rows={13}
                  value={note.text}
                  onChange={(e) => setNote({ ...note, text: e.target.value })}
                />
              </label>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </>
    );
  if (view === "planner")
    return (
      <>
        <div className="domain-toolbar">
          {selectSubject()}
          <Button
            variant="primary"
            onClick={() =>
              setTask({
                id: uid(),
                subject: selected === "all" ? "" : selected,
                title: "",
                due: "",
                kind: "study",
                done: false,
              })
            }
          >
            {tl("کار یا امتحان تازه", "New task or exam")}
          </Button>
        </div>
        <section className="panel">
          <h2>{tl("تقویم مطالعه و امتحان‌ها", "Study & exam agenda")}</h2>
          {[...tasks]
            .filter((x) => selected === "all" || x.subject === selected)
            .sort((a, b) => a.due.localeCompare(b.due))
            .map((task) => (
              <label className="toggle-row" key={task.id}>
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {subjects.find((s) => s.id === task.subject)?.name} ·{" "}
                    {task.due.replace("T", " ")} ·{" "}
                    {task.kind === "exam"
                      ? tl("امتحان", "Exam")
                      : tl("مطالعه", "Study")}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={(e) =>
                    saveTasks(
                      tasks.map((x) =>
                        x.id === task.id ? { ...x, done: e.target.checked } : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
          {!tasks.length && <Empty />}
        </section>
        {task && (
          <Modal
            title={tl("برنامه مطالعه", "Study plan")}
            onClose={() => setTask(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTasks([...tasks, task]);
                setTask(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {tl("موضوع", "Title")}
                  <input
                    required
                    value={task.title}
                    onChange={(e) =>
                      setTask({ ...task, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  {tl("درس", "Subject")}
                  <select
                    value={task.subject}
                    onChange={(e) =>
                      setTask({ ...task, subject: e.target.value })
                    }
                  >
                    <option value="">{tl("عمومی", "General")}</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tl("زمان", "Date & time")}
                  <input
                    type="datetime-local"
                    required
                    value={task.due}
                    onChange={(e) => setTask({ ...task, due: e.target.value })}
                  />
                </label>
                <label>
                  {tl("نوع برنامه", "Task type")}
                  <select
                    value={task.kind}
                    onChange={(e) => setTask({ ...task, kind: e.target.value })}
                  >
                    <option value="study">{tl("مطالعه", "Study")}</option>
                    <option value="exam">{tl("امتحان", "Exam")}</option>
                  </select>
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </>
    );
  if (view === "reports")
    return (
      <>
        <div className="study-timer panel">
          <span className="eyebrow">FOCUS SESSION</span>
          <h2>
            {tl("برای یک قدم کوچک، تمرکز کن.", "Focus on one small step.")}
          </h2>
          {selectSubject()}
          <strong className="study-timer-value" role="timer">
            {n(Math.floor(seconds / 60)).padStart(2, tl("۰", "0"))}:
            {n(seconds % 60).padStart(2, tl("۰", "0"))}
          </strong>
          <div className="domain-actions">
            <Button
              variant="primary"
              disabled={activeTimer}
              onClick={() => {
                setStarted(Date.now());
                setSeconds(0);
                setActiveTimer(true);
              }}
            >
              {tl("شروع مطالعه", "Start studying")}
            </Button>
            <Button
              disabled={!activeTimer}
              onClick={() => {
                const elapsed = Math.max(
                  1,
                  Math.floor((Date.now() - started) / 1000),
                );
                saveSessions([
                  {
                    id: uid(),
                    subject: selected === "all" ? "" : selected,
                    seconds: elapsed,
                    date: new Date().toISOString(),
                  },
                  ...sessions,
                ]);
                setActiveTimer(false);
                toast.success(
                  tl("جلسه مطالعه ذخیره شد", "Study session saved"),
                );
              }}
            >
              {tl("پایان و ثبت جلسه", "Finish & save session")}
            </Button>
          </div>
        </div>
        <section className="panel">
          <h3>{tl("زمان واقعی ثبت‌شده", "Actual recorded study time")}</h3>
          <strong>
            {n(Math.round(sessions.reduce((s, x) => s + x.seconds, 0) / 60))}{" "}
            {tl("دقیقه", "minutes")}
          </strong>
          {sessions.map((s) => (
            <div className="domain-card row-between" key={s.id}>
              <span>
                {subjects.find((x) => x.id === s.subject)?.name ||
                  (tl("مطالعه آزاد", "Independent study"))}
              </span>
              <span>
                {n(s.seconds)} s · {s.date.slice(0, 16).replace("T", " ")}
              </span>
            </div>
          ))}
        </section>
      </>
    );
  if (view === "groups")
    return (
      <div className="study-groups">
        <section className="panel">
          <h2>{tl("گروه‌های مطالعه محلی", "Local study groups")}</h2>
          <form
            className="domain-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              const next = {
                id: uid(),
                name: groupName,
                subject: "",
                messages: [],
              };
              saveGroups([...groups, next]);
              setGroup(next);
              setGroupName("");
            }}
          >
            <input
              required
              aria-label={tl("نام گروه", "Group name")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <Button type="submit">{tl("ساخت گروه", "Create group")}</Button>
          </form>
          {groups.map((g) => (
            <button
              className="domain-card"
              key={g.id}
              onClick={() => setGroup(g)}
            >
              {g.name} · {n(g.messages.length)}
            </button>
          ))}
        </section>
        <section className="panel">
          {group ? (
            <>
              <h3>{group.name}</h3>
              <p className="fine-print">
                {tl("پیام‌ها محلی‌اند؛ به کاربران دیگر ارسال نمی‌شوند.", "Messages are local and are not sent to other users.")}
              </p>
              {(groups.find((g) => g.id === group.id)?.messages || []).map(
                (m) => (
                  <p className="domain-card" key={m.id}>
                    {m.text}
                    <small>{m.date.slice(11, 16)}</small>
                  </p>
                ),
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveGroups(
                    groups.map((g) =>
                      g.id === group.id
                        ? {
                            ...g,
                            messages: [
                              ...g.messages,
                              {
                                id: uid(),
                                text: message,
                                date: new Date().toISOString(),
                              },
                            ],
                          }
                        : g,
                    ),
                  );
                  setMessage("");
                }}
              >
                <label>
                  {tl("پیام گروه", "Group message")}
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                <Button type="submit" variant="primary">
                  {tl("ثبت پیام محلی", "Save local message")}
                </Button>
              </form>
            </>
          ) : (
            <Empty />
          )}
        </section>
      </div>
    );
  if (["thesis", "assignment"].includes(view))
    return (
      <div className="study-helper">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const sections =
              view === "thesis"
                ? fa
                  ? [
                      "بیان مسئله",
                      "پرسش‌های پژوهش",
                      "مرور منابع",
                      "روش پیشنهادی",
                      "برنامه اجرا و بازبینی",
                    ]
                  : [
                      "Problem statement",
                      "Research questions",
                      "Literature review",
                      "Proposed method",
                      "Timeline and review",
                    ]
                : fa
                  ? [
                      "صورت مسئله",
                      "اطلاعات و منابع",
                      "روش حل",
                      "پیش‌نویس پاسخ",
                      "بررسی و استناد",
                    ]
                  : [
                      "Problem description",
                      "Information and sources",
                      "Approach",
                      "Draft response",
                      "Review and attribution",
                    ];
            setOutline(
              topic +
                "\n\n" +
                requirements +
                "\n\n" +
                sections
                  .map(
                    (s, i) =>
                      i +
                      1 +
                      ". " +
                      s +
                      "\n" +
                      (tl("یادداشت و منابع خود را اینجا اضافه کن.", "Add your own notes and sources here.")),
                  )
                  .join("\n\n"),
            );
          }}
        >
          <h2>
            {view === "thesis"
              ? tl("طرح اولیه پژوهش", "Research outline")
              : tl("ساختار تکلیف", "Assignment structure")}
          </h2>
          <label>
            {tl("موضوع", "Topic")}
            <input
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <label>
            {tl("خواسته استاد و محدودیت‌ها", "Requirements & constraints")}
            <textarea
              required
              rows={7}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>
          <Button type="submit" variant="primary">
            {tl("ساخت قالب قابل‌ویرایش", "Create editable outline")}
          </Button>
          <p className="fine-print">
            {tl("این قالب ساختاری است؛ پژوهش یا پاسخ تولیدشده توسط AI نیست.", "This is a structural template, not AI-generated research or an answer.")}
          </p>
        </form>
        <section className="panel">
          <label>
            {tl("طرح و یادداشت‌های من", "My outline & notes")}
            <textarea
              rows={18}
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
            />
          </label>
          <Button
            disabled={!outline}
            onClick={() => {
              saveNotes([
                {
                  id: uid(),
                  subject: "",
                  title: topic,
                  text: outline,
                  date: new Date().toISOString(),
                },
                ...notes,
              ]);
              toast.success(t("save"));
            }}
          >
            {tl("ذخیره در یادداشت‌ها", "Save to notes")}
          </Button>
          <Button
            disabled={!outline}
            onClick={() => download("study-outline.txt", outline)}
          >
            {t("download")}
          </Button>
        </section>
      </div>
    );
  if (view === "profile")
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(t("save"));
        }}
      >
        <h2>{tl("پروفایل تحصیلی من", "My academic profile")}</h2>
        <div className="domain-fields">
          {(["name", "institution", "major", "goal"] as const).map((key, i) => (
            <label key={key}>
              {
                (fa
                  ? [
                      "نام دانشجو",
                      "دانشگاه یا مؤسسه",
                      "رشته تحصیلی",
                      "هدف یادگیری",
                    ]
                  : ["Student name", "Institution", "Major", "Learning goal"])[
                  i
                ]
              }
              <input
                value={profile[key]}
                onChange={(e) =>
                  saveProfile({ ...profile, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <label>
            {tl("مقطع", "Study level")}
            <select
              value={profile.level}
              onChange={(e) =>
                saveProfile({ ...profile, level: e.target.value })
              }
            >
              {[
                "school",
                "undergraduate",
                "masters",
                "doctorate",
                "independent",
              ].map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
    );
  if (view === "business")
    return (
      <div className="tool-grid">
        {[
          ["/startup/builder", "Rocket", "ایده و استارتاپ", "Startup ideas"],
          [
            "/website-designer",
            "PanelsTopLeft",
            "ساخت وب‌سایت",
            "Website projects",
          ],
          ["/crm", "Users", "مدیریت ارتباط‌ها", "Manage relationships"],
        ].map(([url, icon, a, b]) => (
          <Link className="tool-card" href={url} key={url}>
            <span className="icon-chip blue">
              <Icon name={icon} size={30} />
            </span>
            <h3>{fa ? a : b}</h3>
            <p>
              {tl("مهارتت را به یک پروژه واقعی نزدیک کن.", "Bring your skill closer to a real project.")}
            </p>
          </Link>
        ))}
      </div>
    );
  return (
    <>
      <div className="study-overview-hero">
        <div>
          <span className="eyebrow">AIFekr / STUDY SPACE</span>
          <h2>
            {profile.name
              ? fa
                ? `وقت یادگیریه، ${profile.name}.`
                : `Time to learn, ${profile.name}.`
              : tl("کنجکاوی امروز، توانایی فردا.", "Today’s curiosity. Tomorrow’s confidence.")}
          </h2>
          <p>
            {tl("درس‌ها، یادداشت‌ها و قدم‌های بعدی‌ات را در یک فضای روشن نگه دار.", "Keep your subjects, notes and next steps in one clear space.")}
          </p>
          <Link href="/student?view=courses" className="btn primary">
            {tl("مدیریت درس‌ها", "Manage subjects")}
          </Link>
        </div>
        <Icon name="GraduationCap" size={82} />
      </div>
      <div className="stats-grid">
        {[
          [tl("درس‌های من", "My subjects"), subjects.length],
          [tl("منابع ثبت‌شده", "Saved resources"), materials.length],
          [
            tl("کارهای باز", "Open tasks"),
            tasks.filter((t) => !t.done).length,
          ],
          [
            tl("دقیقه مطالعه", "Study minutes"),
            Math.round(sessions.reduce((s, x) => s + x.seconds, 0) / 60),
          ],
        ].map(([a, b]) => (
          <div className="panel stat" key={String(a)}>
            <span>{a}</span>
            <strong>{n(Number(b))}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>{tl("قدم‌های بعدی", "Your next steps")}</h3>
        {tasks
          .filter((t) => !t.done)
          .slice(0, 5)
          .map((t) => (
            <article className="domain-card row-between" key={t.id}>
              <strong>{t.title}</strong>
              <time>{t.due.replace("T", " ")}</time>
            </article>
          ))}
        {!tasks.some((t) => !t.done) && <Empty />}
        <Link href="/student?view=planner" className="text-link">
          {tl("برنامه مطالعه را باز کن", "Open your study plan")} ←
        </Link>
      </section>
    </>
  );
}
