"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, download } from "./ui";
import { toast } from "sonner";
type Project = {
  id: string;
  name: string;
  language: string;
  voice: string;
  speed: number;
  segments: { id: string; text: string; pause: number }[];
  archived: boolean;
  updated: string;
};
const voices = [
  ["Nora", "روایت آرام", "Calm narration"],
  ["Arman", "بیان رسمی", "Professional delivery"],
  ["Sara", "لحن دوستانه", "Friendly tone"],
];
export function VoiceWorkspace({ view }: { view: string }) {
  const { fa, t, n, items } = useApp();
  const [projects, save] = useLocalState<Project[]>(
    "aifekr-voice-projects-v2",
    [],
  );
  const [active, select] = useLocalState<string>("aifekr-voice-active", "");
  const [preset, savePreset] = useLocalState("aifekr-voice-preset", {
    voice: "Nora",
    speed: 1,
    language: "fa",
  });
  const project = projects.find((p) => p.id === active && !p.archived);
  const [draft, setDraft] = useState<Project | null>(null);
  const current = draft || project;
  const [query, setQuery] = useState("");
  function create() {
    const next: Project = {
      id: crypto.randomUUID(),
      name: fa ? "پروژه صوتی تازه" : "New voice project",
      language: preset.language,
      voice: preset.voice,
      speed: preset.speed,
      segments: [{ id: crypto.randomUUID(), text: "", pause: 0 }],
      archived: false,
      updated: new Date().toISOString(),
    };
    save([next, ...projects]);
    select(next.id);
    setDraft(next);
  }
  function commit(next: Project) {
    save(
      projects.map((p) =>
        p.id === next.id ? { ...next, updated: new Date().toISOString() } : p,
      ),
    );
    setDraft(null);
    toast.success(t("save"));
  }
  if (view === "text")
    return (
      <>
        <div className="domain-toolbar">
          <select
            aria-label={fa ? "پروژه صوتی" : "Voice project"}
            value={project?.id || ""}
            onChange={(e) => {
              select(e.target.value);
              setDraft(null);
            }}
          >
            <option value="">{fa ? "انتخاب پروژه" : "Choose project"}</option>
            {projects
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <Button variant="primary" onClick={create}>
            {fa ? "پروژه صوتی تازه" : "New voice project"}
          </Button>
        </div>
        {current ? (
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              commit(current);
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "نام پروژه" : "Project name"}
                <input
                  required
                  value={current.name}
                  onChange={(e) =>
                    setDraft({ ...current, name: e.target.value })
                  }
                />
              </label>
              <label>
                {fa ? "زبان متن" : "Script language"}
                <select
                  value={current.language}
                  onChange={(e) =>
                    setDraft({ ...current, language: e.target.value })
                  }
                >
                  <option value="fa">فارسی</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="tr">Türkçe</option>
                </select>
              </label>
            </div>
            {current.segments.map((s, i) => (
              <article className="voice-segment" key={s.id}>
                <div className="row-between">
                  <strong>
                    {fa ? "بخش" : "Segment"} {n(i + 1)}
                  </strong>
                  <div className="domain-actions">
                    <Button
                      disabled={i === 0}
                      label={fa ? "انتقال بخش به بالا" : "Move segment up"}
                      onClick={() => {
                        const segments = [...current.segments];
                        [segments[i - 1], segments[i]] = [
                          segments[i],
                          segments[i - 1],
                        ];
                        setDraft({ ...current, segments });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      disabled={current.segments.length === 1}
                      onClick={() =>
                        setDraft({
                          ...current,
                          segments: current.segments.filter(
                            (x) => x.id !== s.id,
                          ),
                        })
                      }
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </div>
                <label>
                  {fa ? "متن گویندگی" : "Narration script"}
                  <textarea
                    rows={5}
                    required
                    value={s.text}
                    onChange={(e) =>
                      setDraft({
                        ...current,
                        segments: current.segments.map((x) =>
                          x.id === s.id ? { ...x, text: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                <label className="voice-pause">
                  {fa
                    ? "مکث پس از بخش (ثانیه)"
                    : "Pause after segment (seconds)"}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={s.pause}
                    onChange={(e) =>
                      setDraft({
                        ...current,
                        segments: current.segments.map((x) =>
                          x.id === s.id
                            ? { ...x, pause: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  />
                </label>
              </article>
            ))}
            <div className="domain-actions">
              <Button
                onClick={() =>
                  setDraft({
                    ...current,
                    segments: [
                      ...current.segments,
                      { id: crypto.randomUUID(), text: "", pause: 0 },
                    ],
                  })
                }
              >
                {fa ? "افزودن بخش" : "Add segment"}
              </Button>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
              <Link
                className="btn"
                href={
                  "/voice-studio?tab=generate&prompt=" +
                  encodeURIComponent(
                    current.segments.map((s) => s.text).join("\n\n"),
                  )
                }
              >
                {fa ? "ادامه در ساخت صدا" : "Continue to audio generation"}
                <Icon name="ArrowLeft" size={16} />
              </Link>
            </div>
          </form>
        ) : (
          <Empty onAction={create} />
        )}
      </>
    );
  if (["voice", "presets"].includes(view))
    return (
      <div className="voice-library">
        <section>
          <div className="tool-grid">
            {voices.map(([id, a, b]) => (
              <button
                className={
                  "panel voice-choice " +
                  (preset.voice === id ? "selected" : "")
                }
                key={id}
                onClick={() => {
                  savePreset({ ...preset, voice: id });
                  if (project) commit({ ...project, voice: id });
                }}
              >
                <span className="voice-library-avatar">
                  <Icon name="AudioLines" size={34} />
                </span>
                <h3>{id}</h3>
                <p>{fa ? a : b}</p>
                <span className="badge">
                  {preset.voice === id
                    ? fa
                      ? "انتخاب‌شده"
                      : "Selected"
                    : fa
                      ? "انتخاب صدا"
                      : "Choose voice"}
                </span>
                <div className="voice-waveform" aria-hidden="true">
                  {[25, 58, 90, 43, 72, 100, 62, 35, 81, 48, 68, 30].map(
                    (height, i) => (
                      <i key={i} style={{ height: height + "%" }} />
                    ),
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
        <aside className="panel">
          <h3>{fa ? "تنظیمات پیش‌فرض صدا" : "Default voice settings"}</h3>
          <label>
            {fa ? "سرعت گویندگی" : "Speaking speed"}
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={preset.speed}
              onChange={(e) =>
                savePreset({ ...preset, speed: Number(e.target.value) })
              }
            />
            <span>{n(preset.speed)} ×</span>
          </label>
          <label>
            {fa ? "زبان" : "Language"}
            <select
              value={preset.language}
              onChange={(e) =>
                savePreset({ ...preset, language: e.target.value })
              }
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="tr">Türkçe</option>
            </select>
          </label>
          <p className="fine-print">
            {fa
              ? "پروفایل‌های صدا نمونه‌اند؛ پخش صدای واقعی و تبدیل متن به گفتار به سرویس صوتی نیاز دارد."
              : "Voice profiles are samples. Real auditioning and speech synthesis require an audio service."}
          </p>
        </aside>
      </div>
    );
  if (view === "history") {
    const audio = items.filter((i) => i.type === "voice");
    return (
      <section className="panel">
        <h2>{fa ? "خروجی‌های صوتی نمایشی" : "Demo voice outputs"}</h2>
        {audio.length ? (
          audio.map((item) => (
            <article className="domain-card" key={item.id}>
              <Icon name="AudioLines" size={24} />
              <h3>{item.prompt}</h3>
              <time>{item.date.slice(0, 16).replace("T", " ")}</time>
              <Button
                onClick={() =>
                  download("voice-script-" + item.id + ".txt", item.content)
                }
              >
                {fa ? "دریافت متن خروجی" : "Download output text"}
              </Button>
            </article>
          ))
        ) : (
          <Empty />
        )}
      </section>
    );
  }
  const archived = view === "archive";
  const visible = projects.filter(
    (p) =>
      p.archived === archived &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="domain-toolbar">
        <input
          aria-label={fa ? "جستجوی پروژه‌های صوتی" : "Search voice projects"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
        />
        {!archived && (
          <Link
            className="btn primary"
            href="/voice-studio?tab=text"
            onClick={create}
          >
            {fa ? "پروژه تازه" : "New project"}
          </Link>
        )}
      </div>
      {visible.length ? (
        <div className="tool-grid">
          {visible.map((p) => (
            <article className="panel voice-project-card" key={p.id}>
              <span className="icon-chip purple">
                <Icon name="AudioLines" size={28} />
              </span>
              <h3>{p.name}</h3>
              <p>
                {n(p.segments.length)} {fa ? "بخش" : "segments"} · {p.voice} ·{" "}
                {p.language.toUpperCase()}
              </p>
              <small>{p.updated.slice(0, 16).replace("T", " ")}</small>
              <div className="domain-actions">
                {!archived && (
                  <Link
                    className="btn"
                    href="/voice-studio?tab=text"
                    onClick={() => {
                      select(p.id);
                      setDraft(null);
                    }}
                  >
                    {fa ? "باز کردن پروژه" : "Open project"}
                  </Link>
                )}
                <Button
                  onClick={() =>
                    save(
                      projects.map((x) =>
                        x.id === p.id ? { ...x, archived: !x.archived } : x,
                      ),
                    )
                  }
                >
                  {archived
                    ? fa
                      ? "بازگردانی"
                      : "Restore"
                    : fa
                      ? "بایگانی"
                      : "Archive"}
                </Button>
                <Button
                  onClick={() =>
                    download(
                      p.name + ".json",
                      JSON.stringify(p, null, 2),
                      "application/json",
                    )
                  }
                >
                  {t("export")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </>
  );
}
