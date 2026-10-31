"use client";
import { useState } from "react";
import Link from "./site-link";
import { useShell } from "./live-shell-context";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { LiveStreamTool } from "./live-stream-tool";
import {
  field,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  type LiveRow,
} from "./live-module-kit";
import { Button } from "./ui";
export function LiveAdvisory({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    doctor = module.id === "doctor";
  const history = useLiveData(
    doctor ? "/api/business-doctor?history=1" : "/api/meeting/start",
  );
  const [selected, setSelected] = useState<LiveRow | null>(null);
  const agentNames = {
    ceo: ["مدیرعامل", "CEO"],
    marketing: ["بازاریابی", "Marketing"],
    finance: ["مالی", "Finance"],
    seo: ["سئو", "SEO"],
    sales: ["فروش", "Sales"],
    product: ["محصول", "Product"],
    legal: ["حقوقی", "Legal"],
  };
  const fields = doctor
    ? [
        field(
          "question",
          "سؤال یا شرح کسب‌وکار و هدفتان",
          "Describe your business, question and goals",
          "textarea",
        ),
      ]
    : [
        field("topic", "موضوع جلسه", "Meeting topic", "textarea"),
        ...Object.entries(agentNames).map(([key, label]) =>
          field(key, label[0], label[1], "checkbox"),
        ),
      ];
  return (
    <LiveModuleFrame module={module} view={view}>
      {(view.id === "assessment" || view.id === "room") && (
        <LiveStreamTool
          title={
            fa
              ? doctor
                ? "شروع تحلیل"
                : "شروع جلسه"
              : doctor
                ? "Start analysis"
                : "Start meeting"
          }
          feature={doctor ? "business-doctor" : "meeting"}
          url={doctor ? "/api/business-doctor" : "/api/meeting/start"}
          fields={fields}
          map={(body) => {
            if (doctor) return body;
            const agents = Object.keys(agentNames).filter(
              (key) => body[key] === true,
            );
            if (agents.length < 2)
              throw Error(
                fa
                  ? "حداقل دو مشاور انتخاب کنید."
                  : "Select at least two advisers.",
              );
            return { topic: body.topic, agents };
          }}
          onDone={history.reload}
        />
      )}
      <section className="panel">
        <h3>
          {fa
            ? doctor
              ? "گزارش‌های ذخیره‌شده"
              : "جلسات ذخیره‌شده"
            : doctor
              ? "Saved assessments"
              : "Saved meetings"}
        </h3>
        <LiveLoad {...history} />
        {history.data && (
          <LiveTable
            items={liveRows(
              doctor ? history.data.analyses : history.data.meetings,
            )}
            columns={
              doctor
                ? [
                    field("businessName", "کسب‌وکار", "Business"),
                    field("industry", "صنعت", "Industry"),
                    field("createdAt", "تاریخ", "Created"),
                  ]
                : [
                    field("title", "موضوع", "Topic"),
                    field("createdAt", "تاریخ", "Created"),
                  ]
            }
            actions={(r) => (
              <Button onClick={() => setSelected(r)}>
                {fa ? "مشاهده گزارش" : "View report"}
              </Button>
            )}
          />
        )}
      </section>
      {selected &&
        (doctor ? (
          <div
            className="panel"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {String(selected.result ?? "")}
          </div>
        ) : (
          <MeetingTranscript id={String(selected.id)} />
        ))}
      {doctor && view.id === "action-plan" && (
        <section className="panel">
          <p>
            {fa
              ? "برنامه اقدام در گزارش تحلیل قرار دارد؛ برای ثبت و پیگیری وظایف از اتاق فرمان استفاده کنید."
              : "The assessment contains its action plan. Record and track tasks in the CEO workspace."}
          </p>
          <Link href="/ceo?tab=tasks">
            {fa ? "پیگیری وظایف" : "Track tasks"}
          </Link>
        </section>
      )}
    </LiveModuleFrame>
  );
}
function MeetingTranscript({ id }: { id: string }) {
  const r = useLiveData(
    "/api/chat/history?conversationId=" + encodeURIComponent(id),
  );
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data &&
        liveRows(r.data.messages).map((m) => (
          <div
            className="domain-card"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            key={String(m.id)}
          >
            {String(m.content ?? "")}
          </div>
        ))}
    </section>
  );
}
