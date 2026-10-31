"use client";
import { useShell } from "./live-shell-context";
import {
  LiveForm,
  LiveLoad,
  useLiveData,
  type LiveField,
  type LiveRow,
} from "./live-module-kit";
export function LivePaidForm({
  feature,
  title,
  url,
  fields = [],
  initial,
  map,
  onDone,
  caution,
}: {
  feature: string;
  title: string;
  url: string;
  fields?: LiveField[];
  initial?: LiveRow;
  map?: (body: LiveRow) => LiveRow;
  onDone: (data: LiveRow) => void;
  caution?: string;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/credits/costs");
  const rates = r.data?.costs as LiveRow | undefined,
    rate = rates?.["tool_" + feature.replace(/[.-]/g, "_")] ?? rates?.tool;
  return (
    <>
      <LiveLoad {...r} />
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
            initial={initial}
            map={map}
            onDone={onDone}
            caution={
              caution ??
              (fa
                ? "این عملیات با هزینه نمایش‌داده‌شده آغاز می‌شود. در صورت خطای ارتباط، قبل از تکرار نتیجه و تاریخچه را بررسی کنید."
                : "This action starts at the displayed cost. After a connection error, check results and history before retrying.")
            }
          />
        </>
      )}
    </>
  );
}
