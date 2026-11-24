"use client";
import { useRef, useState } from "react";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";

/**
 * Lecture audio → transcript → saved course source. Uses the existing
 * /api/student/transcribe (charges its own credits) and then stores the text
 * as a material with source "audio_transcript", so quizzes, flashcards and the
 * tutor can use it like any uploaded note.
 */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".mp3,.m4a,.mp4,.wav,.webm,.ogg,.flac,audio/*";

export function LectureAudioUpload({ course, folder = "", onDone }: { course: string; folder?: string; onDone: () => void }) {
  const { tl } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<"idle" | "transcribing" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  function pick(f: File | null) {
    setError(""); setStage("idle");
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) { setFile(null); return setError(tl("حجم فایل صوتی باید حداکثر ۲۵ مگابایت باشد.", "Audio must be 25 MB or smaller.")); }
    if (!/\.(mp3|m4a|mp4|wav|webm|ogg|flac)$/i.test(f.name) && !f.type.startsWith("audio/")) { setFile(null); return setError(tl("فقط MP3، M4A، WAV، WebM، OGG یا FLAC.", "Only MP3, M4A, WAV, WebM, OGG or FLAC.")); }
    setFile(f);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, ""));
  }

  async function send() {
    if (!file || stage === "transcribing" || stage === "saving") return;
    setError("");
    try {
      setStage("transcribing");
      const form = new FormData();
      form.set("file", file, file.name);
      const t = await fetch("/api/student/transcribe", { method: "POST", body: form, credentials: "include" });
      const tj = (await t.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!t.ok || !tj.text) throw Error(tj.error || tl("تبدیل صوت به متن انجام نشد.", "Transcription failed."));
      setStage("saving");
      const s = await fetch("/api/student/materials", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course, title: (title || file.name).slice(0, 200), content: tj.text, source: "audio_transcript", ...(folder ? { folder } : {}) }),
      });
      const sj = (await s.json().catch(() => ({}))) as { error?: string };
      if (!s.ok) throw Error(sj.error || tl("ذخیرهٔ متن انجام نشد.", "Could not save the transcript."));
      setStage("done"); setFile(null); setTitle("");
      if (input.current) input.current.value = "";
      onDone();
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const busy = stage === "transcribing" || stage === "saving";
  return (
    <section className="panel sa">
      <div className="sa-head">
        <span className="sd-course-icon" aria-hidden="true"><Icon name="AudioLines" size={22} /></span>
        <div>
          <h3>{tl("ویس کلاس را به متن تبدیل کن", "Turn a lecture recording into text")}</h3>
          <p>{tl("MP3، M4A یا WAV تا ۲۵ مگابایت. متن به منابع همین درس اضافه می‌شود و برای آزمون و فلش‌کارت قابل استفاده است. هر تبدیل ۲ کردیت.", "MP3, M4A or WAV up to 25 MB. The text is added to this subject's sources for quizzes and flashcards. 2 credits per file.")}</p>
        </div>
      </div>
      <label className="sa-drop">
        <input ref={input} type="file" accept={ACCEPT} disabled={busy} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <Icon name="Upload" size={20} />
        <span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : tl("انتخاب فایل صوتی", "Choose an audio file")}</span>
      </label>
      {file && (
        <label className="sa-title">
          <span>{tl("عنوان", "Title")}</span>
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </label>
      )}
      {error && <p role="alert" className="sa-error">{error}</p>}
      {stage === "done" && <p role="status" className="sa-ok">{tl("متن ویس به منابع درس اضافه شد.", "The transcript was added to this subject's sources.")}</p>}
      <Button variant="primary" disabled={!file || busy} onClick={() => void send()}>
        {stage === "transcribing" ? tl("در حال تبدیل به متن… (تا ۱ دقیقه)", "Transcribing… (up to a minute)") : stage === "saving" ? tl("در حال ذخیره…", "Saving…") : tl("تبدیل و ذخیره", "Transcribe and save")}
      </Button>
    </section>
  );
}
