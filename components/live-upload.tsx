"use client";
import { useRef, useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import type { LiveField, LiveRow } from "./live-module-kit";
export function LiveUpload({
  url,
  title,
  accept,
  maxBytes,
  fields = [],
  onDone,
}: {
  url: string;
  title: string;
  accept: string;
  maxBytes: number;
  fields?: LiveField[];
  onDone: (result: LiveRow) => void;
}) {
  const fa = useShell()!.lang === "fa";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        const form = e.currentTarget,
          data = new FormData(form),
          file = data.get("file");
        if (!(file instanceof File) || !file.size || file.size > maxBytes) {
          setError(
            fa
              ? "فایل خالی یا بزرگ‌تر از حد مجاز است."
              : "The file is empty or exceeds the size limit.",
          );
          return;
        }
        lock.current = true;
        setBusy(true);
        setError("");
        try {
          const r = await fetch(url, {
            method: "POST",
            credentials: "include",
            body: data,
          });
          const result = await r.json();
          if (!r.ok)
            throw Error(result.error ?? result.code ?? `HTTP ${r.status}`);
          onDone(result);
          form.reset();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <h4>{title}</h4>
      <label>
        {fa ? "فایل" : "File"}
        <input
          name="file"
          type="file"
          accept={accept}
          required
          disabled={busy}
        />
      </label>
      <p className="muted">
        {fa ? "حداکثر حجم: " : "Maximum size: "}
        {Math.round(maxBytes / 1024 / 1024)} MB
      </p>
      {fields.map((f) => (
        <label key={f.key}>
          {f.label[fa ? 0 : 1]}
          {f.choices ? (
            <select name={f.key} disabled={busy}>
              {f.choices.map((c) => (
                <option value={c.value} key={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={f.key}
              type={f.type ?? "text"}
              required={!f.optional}
              disabled={busy}
            />
          )}
        </label>
      ))}
      {error && <p role="alert">{error}</p>}
      {busy && (
        <p role="status">
          {fa
            ? "در حال ارسال و پردازش فایل؛ این صفحه را باز نگه دارید."
            : "Uploading and processing the file; keep this page open."}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? (fa ? "در حال پردازش…" : "Processing…") : title}
      </Button>
    </form>
  );
}
