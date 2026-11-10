"use client";
import { useRef, useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import { AIText } from "./ai-text";
import { AIResultActions } from "./ai-result-actions";
import {
  field,
  LiveLoad,
  LiveTable,
  liveRequest,
  liveRows,
  useLiveData,
  type LiveRow,
} from "./live-module-kit";

const API = "/api/seo/generations";
const TOOLS: Record<string, [string, string]> = {
  keyword: ["تحقیق کلمات کلیدی", "Keyword research"],
  content: ["بهینه‌سازی محتوا", "Content optimization"],
  meta: ["متاتگ", "Meta tags"],
  url: ["تحلیل آدرس", "URL analysis"],
  improve: ["برنامهٔ بهبود", "Improvement plan"],
  suggest: ["پیشنهاد عنوان و توضیح", "Title and description"],
};

/** Every paid SEO result of this user: reopen, copy, download or delete. */
export function SeoHistory({ tool }: { tool?: string }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API),
    detail = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<LiveRow | null>(null),
    [error, setError] = useState("");
  const items = liveRows(r.data?.generations)
    .filter((g) => !tool || g.tool === tool)
    .map((g) => ({
      ...g,
      toolLabel: TOOLS[String(g.tool)]?.[fa ? 0 : 1] ?? String(g.tool),
      subject: g.keyword ?? g.url ?? "—",
      state:
        g.status === "partial"
          ? fa
            ? "ناقص"
            : "Incomplete"
          : fa
            ? "کامل"
            : "Complete",
    }));
  const act = async (work: () => Promise<void>) => {
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <section className="panel">
      <h3>{fa ? "نتایج ذخیره‌شدهٔ ابزارها" : "Saved tool results"}</h3>
      <LiveLoad {...r} />
      {error && <p role="alert">{error}</p>}
      {r.data && (
        <LiveTable
          items={items}
          columns={[
            field("toolLabel", "ابزار", "Tool"),
            field("subject", "موضوع", "Subject"),
            field("credits", "کردیت", "Credits"),
            field("state", "وضعیت", "Status"),
            field("createdAt", "تاریخ", "Date"),
          ]}
          actions={(g) => (
            <>
              <Button
                onClick={() =>
                  act(async () => {
                    const d = await liveRequest(
                      `${API}?id=${encodeURIComponent(String(g.id))}`,
                    );
                    setOpen(d.generation as LiveRow);
                    setTimeout(
                      () => detail.current?.scrollIntoView({ block: "nearest" }),
                    );
                  })
                }
              >
                {fa ? "باز کردن" : "Open"}
              </Button>
              <Button
                onClick={() =>
                  act(async () => {
                    await liveRequest(
                      `${API}?id=${encodeURIComponent(String(g.id))}`,
                      "DELETE",
                    );
                    if (open?.id === g.id) setOpen(null);
                    r.reload();
                  })
                }
              >
                {fa ? "حذف" : "Delete"}
              </Button>
            </>
          )}
        />
      )}
      {open && (
        <div className="domain-card" ref={detail}>
          <AIResultActions
            text={String(open.output)}
            filename={`seo-${String(open.tool)}-${String(open.id)}.md`}
          />
          <AIText text={String(open.output)} />
          <Button onClick={() => setOpen(null)}>{fa ? "بستن" : "Close"}</Button>
        </div>
      )}
    </section>
  );
}
