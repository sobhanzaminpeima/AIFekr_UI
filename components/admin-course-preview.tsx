"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Icon, Button, download } from "./ui";
type Course = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  language?: string;
  difficulty?: string;
  durationMinutes?: number;
  content?: unknown;
  version?: number;
};
function sections(content: unknown): { title: string; body: string }[] {
  let value = content;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [{ title: "", body: value as string }];
    }
  }
  if (!value) return [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => {
      if (typeof v === "string") return [{ title: String(i + 1), body: v }];
      if (v && typeof v === "object") {
        const row = v as Record<string, unknown>;
        const nested = row.lessons || row.sections;
        if (Array.isArray(nested)) return sections(nested);
        return [
          {
            title: String(row.title || row.name || i + 1),
            body:
              typeof row.content === "string"
                ? row.content
                : typeof row.body === "string"
                  ? row.body
                  : typeof row.text === "string"
                    ? row.text
                    : JSON.stringify(row, null, 2),
          },
        ];
      }
      return [];
    });
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return sections(
      row.modules ||
        row.chapters ||
        row.lessons ||
        row.sections || [
          {
            title: row.title || "",
            body: row.body || row.content || JSON.stringify(row, null, 2),
          },
        ],
    );
  }
  return [];
}
export function AdminCoursePreview({ id }: { id: string }) {
  const { fa, n } = useApp();
  const [courses, , ready] = useLocalState<Course[]>(
    "aifekr-domain:AiCourse",
    [],
  );
  const [selected, setSelected] = useState(0);
  const course = courses.find((c) => String(c.id) === id);
  if (!ready)
    return (
      <div className="panel">
        {fa ? "در حال بارگذاری دوره" : "Loading course"}
      </div>
    );
  if (!course)
    return (
      <section className="panel">
        <span className="icon-chip blue">
          <Icon name="BookOpen" size={32} />
        </span>
        <h2>
          {fa ? "دورهٔ این شناسه پیدا نشد" : "No course found for this ID"}
        </h2>
        <p>
          {fa
            ? "برای این شناسه در داده‌های محلی دوره‌ای ثبت نشده است؛ محتوای دوره دیگری به جای آن نمایش داده نمی‌شود."
            : "No local course is stored for this ID. Content from another course is not substituted."}
        </p>
        <Link className="btn" href="/admin/ai-courses">
          {fa ? "بازگشت به مدیریت دوره‌ها" : "Back to course management"}
        </Link>
      </section>
    );
  const lessons = sections(course.content);
  const active = lessons[Math.min(selected, Math.max(0, lessons.length - 1))];
  return (
    <div className="academy-player">
      <article className="panel academy-lesson">
        <div className="row-between">
          <span className="eyebrow">ADMIN / COURSE PREVIEW</span>
          <span className="badge">
            {course.status || "draft"} · v{n(course.version || 1)}
          </span>
        </div>
        <h2>{course.title || (fa ? "دوره بدون عنوان" : "Untitled course")}</h2>
        <p>{course.description}</p>
        <div className="chips">
          <span className="badge">{course.language || "—"}</span>
          <span className="badge">{course.difficulty || "—"}</span>
          {course.durationMinutes && (
            <span className="badge">
              {n(course.durationMinutes)} {fa ? "دقیقه" : "minutes"}
            </span>
          )}
        </div>
        {active ? (
          <section className="academy-exercise">
            <h3>{active.title || (fa ? "محتوای دوره" : "Course content")}</h3>
            <div className="admin-course-content">{active.body}</div>
          </section>
        ) : (
          <p>
            {fa
              ? "هنوز محتوایی برای این دوره ثبت نشده است."
              : "No content has been recorded for this course yet."}
          </p>
        )}
        <Button
          onClick={() =>
            download(
              "course-" + id + ".json",
              JSON.stringify(course, null, 2),
              "application/json",
            )
          }
        >
          {fa ? "دریافت نسخه دوره" : "Download course record"}
        </Button>
      </article>
      <aside className="panel academy-syllabus">
        <span className="eyebrow">
          {fa ? "ساختار دوره" : "COURSE STRUCTURE"}
        </span>
        {lessons.map((l, i) => (
          <button
            key={i}
            className={i === selected ? "selected" : ""}
            onClick={() => setSelected(i)}
          >
            <span>{n(i + 1)}</span>
            {l.title || (fa ? "بخش" : "Section") + " " + n(i + 1)}
          </button>
        ))}
        <p className="fine-print">
          {fa
            ? "نمایش محتوای ذخیره‌شده؛ این صفحه وضعیت انتشار را تغییر نمی‌دهد."
            : "Preview of stored content. This page does not change publication status."}
        </p>
      </aside>
    </div>
  );
}
