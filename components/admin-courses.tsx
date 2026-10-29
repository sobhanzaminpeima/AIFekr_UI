"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Lesson = { id: string; title: string; body: string };
type Course = {
  id: string;
  title: string;
  description: string;
  status: string;
  content: string;
};
type Revision = { id: string; courseId: string; date: string; course: Course };
const parse = (content: string): Lesson[] => {
  try {
    const parsed = JSON.parse(content);
    return (parsed.lessons || parsed.sections || []).map(
      (l: Record<string, string>) => ({
        id: l.id || crypto.randomUUID(),
        title: l.title || "",
        body: l.body || l.content || "",
      }),
    );
  } catch {
    return content
      ? [{ id: crypto.randomUUID(), title: "", body: content }]
      : [];
  }
};
export function AdminCourses({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [courses, save] = useLocalState<Course[]>("aifekr-domain:AiCourse", []);
  const [revisions, saveRevisions] = useLocalState<Revision[]>(
    "aifekr-course-revisions",
    [],
  );
  const [jobs] = useLocalState<
    { id: string; title: string; status: string; date: string }[]
  >("aifekr-course-generation-jobs", []);
  const [draft, setDraft] = useState<Course | null>(null),
    [lessons, setLessons] = useState<Lesson[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const [restore, setRestore] = useState<Revision | null>(null);
  function edit(course: Course) {
    setDraft(course);
    setLessons(parse(course.content));
  }
  function commit(course: Course) {
    const old = courses.find((c) => c.id === course.id);
    if (old)
      saveRevisions([
        {
          id: crypto.randomUUID(),
          courseId: course.id,
          date: new Date().toISOString(),
          course: old,
        },
        ...revisions,
      ]);
    save(
      old
        ? courses.map((c) => (c.id === course.id ? course : c))
        : [course, ...courses],
    );
  }
  if (view === "ai-course-generation-job")
    return (
      <section className="panel">
        <h2>{fa ? "صف تولید دوره" : "Course generation queue"}</h2>
        <p>
          {fa
            ? "کار تولید فقط پس از اتصال سرویس تولید ثبت می‌شود؛ در این پیش‌نمایش، دوره را با ویرایشگر می‌سازی."
            : "Generation jobs require a connected service. Build course content with the editor in this preview."}
        </p>
        {jobs.map((job) => (
          <article className="domain-card row-between" key={job.id}>
            <strong>{job.title}</strong>
            <span className="badge">{job.status}</span>
            <time>{job.date}</time>
          </article>
        ))}
        {!jobs.length && <Empty />}
        <Link href="/admin/ai-courses" className="btn">
          {fa ? "ویرایشگر دوره" : "Course editor"}
        </Link>
      </section>
    );
  if (view === "ai-course-revision")
    return (
      <section className="panel">
        <h2>{fa ? "نسخه‌های قبلی دوره‌ها" : "Course revision history"}</h2>
        {revisions.map((r) => (
          <article className="domain-card row-between" key={r.id}>
            <div>
              <h3>{r.course.title}</h3>
              <time>{r.date.slice(0, 16).replace("T", " ")}</time>
              <p>{r.course.status}</p>
            </div>
            <div className="domain-actions">
              <Button
                onClick={() =>
                  download(
                    "course-revision-" + r.id + ".json",
                    JSON.stringify(r.course, null, 2),
                    "application/json",
                  )
                }
              >
                {t("download")}
              </Button>
              <Button onClick={() => setRestore(r)}>
                {fa ? "بازگردانی نسخه" : "Restore revision"}
              </Button>
            </div>
          </article>
        ))}
        {!revisions.length && <Empty />}
        {restore && (
          <Modal
            title={fa ? "بازگردانی نسخهٔ دوره" : "Restore course revision"}
            onClose={() => setRestore(null)}
          >
            <p>
              {fa
                ? "محتوای این نسخه جایگزین می‌شود و نسخهٔ فعلی پیش از تغییر در تاریخچه ذخیره خواهد شد."
                : "This revision replaces the course. The current version is saved before replacement."}
            </p>
            <h3>{restore.course.title}</h3>
            <Button
              variant="primary"
              onClick={() => {
                commit(restore.course);
                setRestore(null);
                toast.success(t("save"));
              }}
            >
              {fa ? "تأیید بازگردانی" : "Confirm restore"}
            </Button>
          </Modal>
        )}
      </section>
    );
  const visible = courses.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (c.title + " " + c.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange">
          <Icon name="GraduationCap" size={30} />
        </span>
        <div>
          <h2>{fa ? "کارگاه تدوین دوره" : "Course editorial workspace"}</h2>
          <p>
            {fa
              ? "سرفصل‌ها، متن درس و وضعیت انتشار را کنار هم مدیریت کن. انتشار در این نسخه فقط یک وضعیت محلی است."
              : "Manage curriculum, lesson content and publication status together. Publication is a local state in this preview."}
          </p>
        </div>
      </div>
      <div className="domain-toolbar">
        <label>
          {fa ? "جست‌وجوی دوره" : "Search courses"}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {fa ? "وضعیت دوره" : "Course status"}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{fa ? "همه" : "All"}</option>
            <option value="draft">{fa ? "پیش‌نویس" : "Draft"}</option>
            <option value="published">
              {fa ? "منتشرشده محلی" : "Locally published"}
            </option>
          </select>
        </label>
        <Button
          variant="primary"
          onClick={() => {
            setDraft({
              id: crypto.randomUUID(),
              title: "",
              description: "",
              status: "draft",
              content: "",
            });
            setLessons([{ id: crypto.randomUUID(), title: "", body: "" }]);
          }}
        >
          {fa ? "دورهٔ تازه" : "New course"}
        </Button>
      </div>
      <div className="tool-grid">
        {visible.map((c) => (
          <article className="panel admin-course-card" key={c.id}>
            <div className="row-between">
              <Icon name="BookOpen" size={30} />
              <span className="badge">
                {c.status === "published"
                  ? fa
                    ? "منتشرشده محلی"
                    : "Locally published"
                  : fa
                    ? "پیش‌نویس"
                    : "Draft"}
              </span>
            </div>
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <small>
              {n(parse(c.content).length)} {fa ? "درس" : "lessons"}
            </small>
            <div className="domain-actions">
              <Button onClick={() => edit(c)}>
                {fa ? "ویرایش محتوا" : "Edit content"}
              </Button>
              <Link
                className="btn"
                href={
                  "/admin/ai-courses/" + encodeURIComponent(c.id) + "/preview"
                }
              >
                {fa ? "پیش‌نمایش دوره" : "Preview course"}
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <Empty />}
      {draft && (
        <Modal
          title={fa ? "ویرایش دوره و درس‌ها" : "Edit course & lessons"}
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !draft.title.trim() ||
                !lessons.length ||
                lessons.some((l) => !l.title.trim() || !l.body.trim())
              ) {
                toast.error(
                  fa
                    ? "عنوان دوره و متن و عنوان همهٔ درس‌ها لازم است."
                    : "Provide a course title and a title and body for every lesson.",
                );
                return;
              }
              commit({
                ...draft,
                title: draft.title.trim(),
                content: JSON.stringify({ lessons }),
              });
              setDraft(null);
              toast.success(t("save"));
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان دوره" : "Course title"}
                <input
                  required
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "شرح دوره" : "Course description"}
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "وضعیت انتشار محلی" : "Local publication status"}
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  <option value="draft">{fa ? "پیش‌نویس" : "Draft"}</option>
                  <option value="published">
                    {fa ? "منتشرشده محلی" : "Locally published"}
                  </option>
                </select>
              </label>
            </div>
            <div className="admin-course-lessons">
              {lessons.map((lesson, i) => (
                <fieldset key={lesson.id}>
                  <legend>
                    {fa ? "درس" : "Lesson"} {n(i + 1)}
                  </legend>
                  <label>
                    {fa ? "عنوان درس" : "Lesson title"}
                    <input
                      required
                      value={lesson.title}
                      onChange={(e) =>
                        setLessons(
                          lessons.map((l) =>
                            l.id === lesson.id
                              ? { ...l, title: e.target.value }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    {fa ? "متن درس" : "Lesson body"}
                    <textarea
                      required
                      rows={7}
                      value={lesson.body}
                      onChange={(e) =>
                        setLessons(
                          lessons.map((l) =>
                            l.id === lesson.id
                              ? { ...l, body: e.target.value }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="domain-actions">
                    <Button
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...lessons];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setLessons(next);
                      }}
                    >
                      {fa ? "انتقال به بالا" : "Move up"}
                    </Button>
                    <Button
                      disabled={lessons.length === 1}
                      onClick={() =>
                        setLessons(lessons.filter((l) => l.id !== lesson.id))
                      }
                    >
                      {fa ? "حذف درس" : "Remove lesson"}
                    </Button>
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="domain-actions">
              <Button
                onClick={() =>
                  setLessons([
                    ...lessons,
                    { id: crypto.randomUUID(), title: "", body: "" },
                  ])
                }
              >
                {fa ? "افزودن درس" : "Add lesson"}
              </Button>
              <Button variant="primary" type="submit">
                {fa ? "ذخیرهٔ دوره" : "Save course"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
