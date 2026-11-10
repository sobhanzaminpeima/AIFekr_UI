"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon, Modal, SectionTitle } from "./ui";
import { useApp } from "./providers";
import Link from "./site-link";
import { AIText } from "./ai-text";
import { liveCellText } from "@/lib/live-format";
import {
  moduleViewHref,
  type ModuleSpec,
  type ViewSpec,
} from "@/lib/upstream/registry";

export type LiveRow = Record<string, unknown>;
export type LiveField = {
  key: string;
  label: [string, string];
  type?: string;
  optional?: boolean;
  choices?: { value: string; label: string }[];
};
export const field = (
  key: string,
  fa: string,
  en: string,
  type = "text",
  optional = false,
): LiveField => ({ key, label: [fa, en], type, optional });
/**
 * Errors that come with the main site's in-platform page to activate the
 * feature (e.g. a fitness package), by message, so any screen showing the
 * message can offer that page next to it (see ActivationError).
 */
const activationUrls = new Map<string, string>();
export const activationUrlFor = (message: string) => activationUrls.get(message) ?? null;
export async function liveRequest(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<LiveRow> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    ...(body !== undefined && method !== "GET"
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.code === "string"
          ? data.code
          : `HTTP ${res.status}`;
    if (typeof data?.renewUrl === "string" && data.renewUrl.startsWith("/")) activationUrls.set(message, data.renewUrl);
    throw Error(message);
  }
  if (!data || typeof data !== "object") throw Error("INVALID_RESPONSE");
  return data;
}
export function useLiveData(url: string | null) {
  const [data, setData] = useState<LiveRow | null>(null),
    [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    if (url)
      void liveRequest(url)
        .then((d) => {
          if (active) setData(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [url, version]);
  return { data, error, reload };
}
export const liveRows = (value: unknown): LiveRow[] =>
  Array.isArray(value) ? value : [];
export function LiveLoad({
  data,
  error,
  reload,
}: {
  data: LiveRow | null;
  error: string;
  reload?: () => void;
}) {
  const { fa, tl } = useApp();
  return error ? (
    <div role="alert" className="plan-notice">
      {error}{" "}
      {activationUrlFor(error) ? (
        <a className="btn primary" href={activationUrlFor(error)!}>{tl("انتخاب و فعال‌سازی پکیج", "Choose and activate a package")}</a>
      ) : reload && (
        <Button onClick={reload}>{tl("تلاش دوباره", "Retry")}</Button>
      )}
    </div>
  ) : !data ? (
    <p role="status">{tl("در حال دریافت…", "Loading…")}</p>
  ) : null;
}
export function LiveModuleFrame({
  module,
  view,
  children,
}: {
  module: ModuleSpec;
  view: ViewSpec;
  children: React.ReactNode;
}) {
  const { fa, tl } = useApp();
  return (
    <div className={`module-workspace accent-${module.accent}`} data-module={module.id}>
      <div className="module-hero">
        <span className="module-hero-icon" aria-hidden="true"><Icon name={module.icon} size={26} /></span>
        <SectionTitle
          title={tl(module.title[0], module.title[1])}
          subtitle={tl(module.subtitle[0], module.subtitle[1])}
        />
      </div>
      <nav className="module-tabs" aria-label={tl(module.title[0], module.title[1])}>
        {module.views.map((v) => (
          <Link
            key={v.id}
            href={moduleViewHref(module, v)}
            aria-current={v.id === view.id ? "page" : undefined}
          >
            {tl(v.title[0], v.title[1])}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
export function LiveTable({
  items,
  columns,
  actions,
}: {
  items: LiveRow[];
  columns: LiveField[];
  actions?: (row: LiveRow) => React.ReactNode;
}) {
  const { locale, tl } = useApp();
  return !items.length ? (
    <p className="crm-empty">
      {tl("هنوز داده‌ای ثبت نشده است.", "No records yet.")}
    </p>
  ) : (
    <div className="domain-table-wrap">
      <table className="domain-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{tl(c.label[0], c.label[1])}</th>
            ))}
            {actions && <th>{tl("عملیات", "Actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              {columns.map((c) => (
                <td key={c.key}>
                  <bdi>
                    {r[c.key] == null
                      ? "—"
                      : typeof r[c.key] === "boolean"
                        ? r[c.key]
                          ? tl("فعال", "Active")
                          : tl("غیرفعال", "Inactive")
                        : liveCellText(r[c.key], locale)}
                  </bdi>
                </td>
              ))}
              {actions && (
                <td>
                  <div className="domain-actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/** A saved report opened from a list: comes into view, since the list can be long. */
export function LiveReportPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { tl } = useApp();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="panel" ref={panel} tabIndex={-1} data-testid="saved-report">
      <div className="row-between">
        <h3><bdi>{title}</bdi></h3>
        <Button onClick={onClose}>{tl("بستن", "Close")}</Button>
      </div>
      {children}
    </section>
  );
}
/** The messages of a saved conversation (a meeting or a question to an adviser). */
export function LiveSavedConversation({ id }: { id: string }) {
  const r = useLiveData("/api/chat/history?conversationId=" + encodeURIComponent(id));
  return (
    <>
      <LiveLoad {...r} />
      {r.data &&
        liveRows(r.data.messages).map((m) => (
          <div className="domain-card" key={String(m.id)}>
            <AIText text={String(m.content ?? "")} />
          </div>
        ))}
    </>
  );
}
/** No automatic retries. Callers must explicitly confirm paid or external effects. */
export function LiveForm({
  title,
  url,
  method = "POST",
  fields = [],
  initial = {},
  map,
  onDone,
  caution,
  submit,
  progress,
}: {
  title: string;
  url: string;
  method?: string;
  fields?: LiveField[];
  initial?: LiveRow;
  map?: (body: LiveRow) => LiveRow;
  onDone: (data: LiveRow) => void;
  caution?: string;
  submit?: (body: LiveRow) => Promise<LiveRow>;
  progress?: React.ReactNode;
}) {
  const { fa, tl } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
      <Button
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {title}
      </Button>
      {open && (
        <Modal
          title={title}
          onClose={() => {
            if (!lock.current) setOpen(false);
          }}
        >
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                const form = new FormData(e.currentTarget),
                  body: LiveRow = {};
                fields.forEach((f) => {
                  const raw = String(form.get(f.key) ?? "");
                  if (
                    !raw &&
                    f.optional &&
                    f.type !== "checkbox" &&
                    !(f.key in initial)
                  )
                    return;
                  body[f.key] =
                    f.type === "checkbox"
                      ? form.get(f.key) === "on"
                      : f.type === "number"
                        ? !raw && f.optional
                          ? null
                          : Number(raw)
                        : raw;
                });
                const d = submit
                  ? await submit(map ? map(body) : body)
                  : await liveRequest(url, method, map ? map(body) : body);
                onDone(d);
                setOpen(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {caution && <p className="plan-notice">{caution}</p>}
            {fields.map((f) => (
              <label key={f.key}>
                {tl(f.label[0], f.label[1])}
                {f.choices ? (
                  <select
                    name={f.key}
                    defaultValue={String(
                      initial[f.key] ?? f.choices[0]?.value ?? "",
                    )}
                  >
                    {f.choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    name={f.key}
                    required={!f.optional}
                    rows={5}
                    defaultValue={String(initial[f.key] ?? "")}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    name={f.key}
                    type="checkbox"
                    defaultChecked={!!initial[f.key]}
                  />
                ) : (
                  <input
                    name={f.key}
                    type={f.type ?? "text"}
                    required={!f.optional}
                    defaultValue={String(initial[f.key] ?? "")}
                    step={f.type === "number" ? "any" : undefined}
                  />
                )}
              </label>
            ))}
            {progress}
            {error && <p role="alert">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? (tl("در حال انجام…", "Working…")) : title}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
