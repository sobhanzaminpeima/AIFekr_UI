"use client";
import { useEffect, useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import {
  field,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
} from "./live-module-kit";
import { LiveStreamTool } from "./live-stream-tool";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
export function LiveWebsite({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/website-designer/list");
  const [id, setId] = useState<string | null>(null);
  return (
    <LiveModuleFrame module={module} view={view}>
      {view.id === "brief" && (
        <LiveStreamTool
          title={fa ? "ساخت وب‌سایت" : "Generate website"}
          url="/api/website-designer/generate"
          feature="website-designer"
          fields={[
            field("businessName", "نام کسب‌وکار", "Business name"),
            field("industry", "صنعت", "Industry"),
            field("audience", "مخاطب هدف", "Target audience", "textarea"),
            field("goal", "هدف سایت", "Website goal", "textarea"),
            field("colorPref", "رنگ‌های مورد نظر", "Preferred colors"),
            field("style", "سبک طراحی", "Design style"),
            field(
              "sections",
              "بخش‌های سایت؛ هر بخش یک خط",
              "Website sections; one per line",
              "textarea",
            ),
          ]}
          map={(b) => ({
            ...b,
            sections: String(b.sections)
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          })}
          onDone={r.reload}
        />
      )}
      <section className="panel">
        <h3>{fa ? "وب‌سایت‌های ذخیره‌شده" : "Saved websites"}</h3>
        <LiveLoad {...r} />
        {r.data && (
          <LiveTable
            items={liveRows(r.data.sites)}
            columns={[
              field("businessName", "کسب‌وکار", "Business"),
              field("createdAt", "تاریخ", "Created"),
              field("sizeKB", "حجم (کیلوبایت)", "Size (KB)"),
            ]}
            actions={(site) => (
              <>
                <Button onClick={() => setId(String(site.id))}>
                  {fa ? "پیش‌نمایش" : "Preview"}
                </Button>
                <a
                  href={`/api/website-designer/${encodeURIComponent(String(site.id))}?download=1`}
                  download
                >
                  {fa ? "دانلود HTML" : "Download HTML"}
                </a>
              </>
            )}
          />
        )}
      </section>
      {id && <Preview key={id} id={id} />}
    </LiveModuleFrame>
  );
}
function Preview({ id }: { id: string }) {
  const fa = useShell()!.lang === "fa";
  const [html, setHtml] = useState<string | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/website-designer/" + encodeURIComponent(id), {
      credentials: "include",
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(setHtml)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [id]);
  return (
    <section className="panel">
      <h3>
        {fa
          ? "پیش‌نمایش ایزوله؛ بدون دسترسی به حساب AIFekr"
          : "Isolated preview without access to your AIFekr account"}
      </h3>
      {error ? (
        <p role="alert">{error}</p>
      ) : html === null ? (
        <p role="status">{fa ? "در حال دریافت…" : "Loading…"}</p>
      ) : (
        <iframe
          title={fa ? "پیش‌نمایش سایت" : "Website preview"}
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={html}
          style={{ width: "100%", height: 600, border: 0, background: "#fff" }}
        />
      )}
    </section>
  );
}
