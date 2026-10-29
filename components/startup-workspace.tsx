"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, download } from "./ui";
import { toast } from "sonner";
type Startup = {
  name: string;
  problem: string;
  audience: string;
  solution: string;
  canvas: Record<string, string>;
  tasks: { id: string; title: string; done: boolean }[];
  pitch: string;
};
const blank: Startup = {
  name: "",
  problem: "",
  audience: "",
  solution: "",
  canvas: {},
  tasks: [],
  pitch: "",
};
const blocks = [
  ["problem", "مسئله", "Problem"],
  ["segments", "بخش مشتریان", "Customer segments"],
  ["value", "ارزش پیشنهادی", "Unique value"],
  ["solution", "راه‌حل", "Solution"],
  ["channels", "کانال‌ها", "Channels"],
  ["revenue", "جریان درآمد", "Revenue streams"],
  ["cost", "ساختار هزینه", "Cost structure"],
  ["metrics", "شاخص‌های کلیدی", "Key metrics"],
  ["advantage", "مزیت رقابتی", "Unfair advantage"],
];
export function StartupWorkspace({ view }: { view: string }) {
  const { fa, t, n } = useApp();
  const [project, save] = useLocalState<Startup>("aifekr-startup-v2", blank);
  const [draft, setDraft] = useState<Startup | null>(null);
  const [task, setTask] = useState("");
  const current = draft || project;
  if (view === "idea")
    return (
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          save({
            ...current,
            canvas: {
              ...current.canvas,
              problem: current.problem,
              segments: current.audience,
              solution: current.solution,
            },
          });
          setDraft(null);
          toast.success(
            fa ? "ایده و بوم اولیه ذخیره شد" : "Idea and initial canvas saved",
          );
        }}
      >
        <div className="domain-fields">
          {(["name", "problem", "audience", "solution"] as const).map(
            (key, i) => (
              <label key={key}>
                {
                  (fa
                    ? [
                        "نام استارتاپ",
                        "مسئله مشتری",
                        "مخاطب هدف",
                        "راه‌حل پیشنهادی",
                      ]
                    : [
                        "Startup name",
                        "Customer problem",
                        "Target audience",
                        "Proposed solution",
                      ])[i]
                }
                <textarea
                  required
                  rows={3}
                  value={current[key]}
                  onChange={(e) =>
                    setDraft({ ...current, [key]: e.target.value })
                  }
                />
              </label>
            ),
          )}
        </div>
        <Button type="submit" variant="primary">
          {t("save")}
        </Button>
      </form>
    );
  if (view === "canvas")
    return (
      <>
        <div className="domain-toolbar">
          <Button
            onClick={() =>
              download(
                "lean-canvas.json",
                JSON.stringify(project, null, 2),
                "application/json",
              )
            }
          >
            {fa ? "خروجی بوم" : "Export canvas"}
          </Button>
        </div>
        <div className="startup-canvas">
          {blocks.map(([id, a, b]) => (
            <label className="panel" key={id}>
              <strong>{fa ? a : b}</strong>
              <textarea
                aria-label={fa ? a : b}
                rows={6}
                value={project.canvas[id] || ""}
                onChange={(e) =>
                  save({
                    ...project,
                    canvas: { ...project.canvas, [id]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
      </>
    );
  if (view === "mvp")
    return (
      <section className="panel">
        <h3>{fa ? "برنامه ساخت نسخه اولیه" : "MVP delivery plan"}</h3>
        <form
          className="domain-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            save({
              ...project,
              tasks: [
                ...project.tasks,
                { id: crypto.randomUUID(), title: task, done: false },
              ],
            });
            setTask("");
          }}
        >
          <input
            required
            aria-label={fa ? "کار نسخه اولیه" : "MVP task"}
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
          <Button type="submit" variant="primary">
            {t("add")}
          </Button>
        </form>
        <progress
          max={Math.max(project.tasks.length, 1)}
          value={project.tasks.filter((t) => t.done).length}
        />
        {project.tasks.map((task) => (
          <label className="toggle-row" key={task.id}>
            <span>{task.title}</span>
            <input
              type="checkbox"
              checked={task.done}
              onChange={(e) =>
                save({
                  ...project,
                  tasks: project.tasks.map((x) =>
                    x.id === task.id ? { ...x, done: e.target.checked } : x,
                  ),
                })
              }
            />
          </label>
        ))}
      </section>
    );
  if (view === "pitch")
    return (
      <section className="panel">
        <h3>{fa ? "ارائه سرمایه‌گذار" : "Investor pitch"}</h3>
        <Button
          onClick={() =>
            save({
              ...project,
              pitch: [
                project.name,
                project.problem,
                project.solution,
                project.audience,
                ...blocks
                  .filter(([id]) =>
                    ["revenue", "metrics", "advantage"].includes(id),
                  )
                  .map(
                    ([id, a, b]) =>
                      (fa ? a : b) + ": " + (project.canvas[id] || ""),
                  ),
              ].join("\n\n"),
            })
          }
        >
          {fa ? "ساخت طرح از بوم خودم" : "Build outline from my canvas"}
        </Button>
        <label>
          {fa ? "متن ارائه" : "Pitch content"}
          <textarea
            rows={16}
            value={project.pitch}
            onChange={(e) => save({ ...project, pitch: e.target.value })}
          />
        </label>
        <Button onClick={() => download("startup-pitch.txt", project.pitch)}>
          {t("download")}
        </Button>
      </section>
    );
  if (view === "projects")
    return (
      <section className="panel">
        <h2>{project.name || (fa ? "ایده‌ای ثبت نشده" : "No idea saved")}</h2>
        <p>{project.problem}</p>
        <p>{project.solution}</p>
        <span className="badge">
          {n(project.tasks.filter((t) => t.done).length)} /{" "}
          {n(project.tasks.length)} {fa ? "کار تکمیل‌شده" : "tasks complete"}
        </span>
      </section>
    );
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        toast.success(
          fa
            ? "درخواست در مرورگر ذخیره شد؛ پیامی ارسال نشد."
            : "Request saved locally. No message was sent.",
        );
        localStorage.setItem(
          "aifekr-startup-inquiry",
          JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
        );
      }}
    >
      <div className="domain-fields">
        <label>
          {fa ? "نام" : "Name"}
          <input name="name" required />
        </label>
        <label>
          {fa ? "ایمیل" : "Email"}
          <input name="email" type="email" required />
        </label>
        <label>
          {fa ? "شرح درخواست" : "Inquiry"}
          <textarea name="message" required rows={6} />
        </label>
      </div>
      <Button type="submit" variant="primary">
        {fa ? "ثبت درخواست محلی" : "Save local inquiry"}
      </Button>
    </form>
  );
}
