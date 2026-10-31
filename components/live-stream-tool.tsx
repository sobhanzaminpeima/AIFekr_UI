"use client";
import { useState } from "react";
import { useShell } from "./live-shell-context";
import { consumeToolStream } from "@/lib/live-stream";
import {
  LiveForm,
  LiveLoad,
  useLiveData,
  type LiveField,
  type LiveRow,
} from "./live-module-kit";
export function LiveStreamTool({
  title,
  feature,
  url,
  fields,
  map,
  onDone,
}: {
  title: string;
  feature: string;
  url: string;
  fields: LiveField[];
  map?: (body: LiveRow) => LiveRow;
  onDone?: () => void;
}) {
  const fa = useShell()!.lang === "fa",
    costs = useLiveData("/api/credits/costs");
  const [text, setText] = useState(""),
    [state, setState] = useState<"idle" | "running" | "complete" | "failed">(
      "idle",
    );
  const rates = costs.data?.costs as LiveRow | undefined,
    rate = rates?.["tool_" + feature.replace(/[.-]/g, "_")] ?? rates?.tool;
  return (
    <section className="panel">
      <h3>{title}</h3>
      <LiveLoad {...costs} />
      {typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && (
        <>
          <p>
            {fa ? "هزینه پیش از شروع: " : "Cost before starting: "}
            {rate} {fa ? "کردیت" : "credits"}
          </p>
          <LiveForm
            title={title}
            url={url}
            fields={fields}
            map={map}
            caution={
              fa
                ? "پس از تأیید، تولید با هزینه بالا شروع می‌شود. در صورت قطع ارتباط، پیش از تکرار تاریخچه را بررسی کنید. خروجی خودکار منتشر نمی‌شود."
                : "Confirmation starts generation at the displayed cost. If disconnected, check history before retrying. Results are not published automatically."
            }
            submit={async (body) => {
              setText("");
              setState("running");
              try {
                let output = "";
                const response = await fetch(url, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                await consumeToolStream(response, (e) => {
                  if (typeof e.text === "string") {
                    output += e.text;
                    setText(output);
                  }
                });
                setState("complete");
                return { complete: true };
              } catch (e) {
                setState("failed");
                throw e;
              }
            }}
            onDone={() => onDone?.()}
            progress={
              state === "running" ? (
                <p role="status">
                  {fa
                    ? "در حال تولید؛ متن دریافت‌شده: "
                    : "Generating; received text: "}
                  {text.length} {fa ? "نویسه" : "characters"}
                </p>
              ) : undefined
            }
          />
        </>
      )}
      {state === "complete" && (
        <p role="status">{fa ? "تولید کامل شد." : "Generation completed."}</p>
      )}
      {state === "failed" && (
        <p role="alert">
          {fa
            ? "تولید کامل تأیید نشد؛ متن زیر ممکن است ناقص باشد."
            : "Completion was not confirmed; the text below may be incomplete."}
        </p>
      )}
      {text && (
        <div
          className="domain-card"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {text}
        </div>
      )}
    </section>
  );
}
