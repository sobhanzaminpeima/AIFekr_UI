"use client";
import { useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  liveRequest,
  type LiveRow,
} from "./live-module-kit";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
const stages = {
  idea: {
    key: "ideaData",
    fa: "تحلیل ایده",
    en: "Idea analysis",
    fields: [
      field("description", "توضیح ایده", "Idea description", "textarea"),
      field("problem", "مسئله", "Problem", "textarea"),
      field("targetMarket", "بازار هدف", "Target market", "textarea"),
      field("solution", "راه‌حل", "Solution", "textarea"),
    ],
  },
  financial: {
    key: "financialData",
    fa: "مدل مالی",
    en: "Financial model",
    fields: [
      field("businessModel", "مدل کسب‌وکار", "Business model", "textarea"),
      field(
        "initialInvestment",
        "سرمایه اولیه و واحد پول",
        "Initial investment and currency",
      ),
      field(
        "monthlyRevenue",
        "درآمد ماهانه و واحد پول",
        "Monthly revenue and currency",
      ),
      field(
        "monthlyCosts",
        "هزینه ماهانه و واحد پول",
        "Monthly costs and currency",
      ),
      field("growthRate", "نرخ رشد پیش‌بینی‌شده", "Expected growth rate"),
      field("teamSize", "اندازه تیم", "Team size"),
    ],
  },
  proposal: {
    key: "proposalData",
    fa: "ارائه سرمایه‌گذاری",
    en: "Investor proposal",
    fields: [
      field("ideaAnalysis", "خلاصه ایده", "Idea summary", "textarea"),
      field(
        "financialModel",
        "خلاصه مدل مالی",
        "Financial model summary",
        "textarea",
      ),
      field(
        "askAmount",
        "سرمایه مورد نیاز و واحد پول",
        "Requested investment and currency",
      ),
      field("equity", "سهام پیشنهادی", "Offered equity"),
      field("useOfFunds", "کاربرد سرمایه", "Use of funds", "textarea"),
      field("founderBackground", "پیشینه تیم", "Team background", "textarea"),
    ],
  },
  implementation: {
    key: "implementationData",
    fa: "برنامه پیاده‌سازی",
    en: "Implementation plan",
    fields: [
      field("techStack", "فناوری ترجیحی", "Preferred technology"),
      field("mvpFeatures", "ویژگی‌های محصول اولیه", "MVP features", "textarea"),
      field("launchTimeline", "زمان‌بندی راه‌اندازی", "Launch timeline"),
      field("teamRoles", "نقش‌های تیم", "Team roles", "textarea"),
    ],
  },
};
type Stage = keyof typeof stages;
function savedData(project: LiveRow, key: string): LiveRow {
  try {
    const v = JSON.parse(String(project[key] ?? "{}"));
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
export function LiveStartup({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/startup");
  const [id, setId] = useState<string | null>(null);
  return (
    <LiveModuleFrame module={module} view={view}>
      {view.id === "contact" ? (
        <section className="panel">
          <LiveForm
            title={
              fa
                ? "درخواست همکاری با تیم متخصص"
                : "Request expert implementation"
            }
            url="/api/startup/inquiry"
            fields={[
              field("name", "نام", "Name"),
              field("email", "ایمیل", "Email", "email"),
              field("phone", "تلفن", "Phone", "tel", true),
              field(
                "startupName",
                "نام استارتاپ",
                "Startup name",
                "text",
                true,
              ),
              field("message", "شرح درخواست", "Request details", "textarea"),
            ]}
            onDone={() => setId("inquiry-sent")}
            caution={
              fa
                ? "اطلاعات برای بررسی درخواست شما به تیم ارسال می‌شود. این فرم پرداخت یا سفارش قطعی ایجاد نمی‌کند."
                : "Your details are sent to the team to review this inquiry. This does not create a payment or confirmed order."
            }
          />
          {id === "inquiry-sent" && (
            <p role="status">{fa ? "درخواست ثبت شد." : "Request submitted."}</p>
          )}
        </section>
      ) : (
        <>
          <section className="panel">
            <LiveForm
              title={fa ? "پروژه جدید" : "New project"}
              url="/api/startup"
              fields={[field("name", "نام استارتاپ", "Startup name")]}
              onDone={(d) => {
                setId(String((d.project as LiveRow).id));
                r.reload();
              }}
            />
            <LiveLoad {...r} />
            {r.data && (
              <LiveTable
                items={liveRows(r.data.projects)}
                columns={[
                  field("name", "نام پروژه", "Project"),
                  field("stage", "مرحله", "Stage"),
                  field("updatedAt", "آخرین تغییر", "Updated"),
                ]}
                actions={(p) => (
                  <>
                    <Button onClick={() => setId(String(p.id))}>
                      {fa ? "باز کردن" : "Open"}
                    </Button>
                    <LiveForm
                      title={fa ? "حذف" : "Delete"}
                      url={"/api/startup/" + encodeURIComponent(String(p.id))}
                      method="DELETE"
                      onDone={() => {
                        if (id === p.id) setId(null);
                        r.reload();
                      }}
                      caution={
                        fa
                          ? "پروژه و محتوای ذخیره‌شده آن حذف می‌شود."
                          : "This deletes the project and its stored content."
                      }
                    />
                  </>
                )}
              />
            )}
          </section>
          {id && (
            <StartupProject
              key={id + view.id}
              id={id}
              initialStage={
                view.id === "pitch"
                  ? "proposal"
                  : view.id === "mvp"
                    ? "implementation"
                    : "idea"
              }
              onSaved={r.reload}
            />
          )}
        </>
      )}
    </LiveModuleFrame>
  );
}
function StartupProject({
  id,
  initialStage,
  onSaved,
}: {
  id: string;
  initialStage: Stage;
  onSaved: () => void;
}) {
  const shell = useShell()!,
    fa = shell.lang === "fa",
    r = useLiveData("/api/startup/" + encodeURIComponent(id)),
    costs = useLiveData("/api/credits/costs");
  const [stage, setStage] = useState<Stage>(initialStage),
    [generated, setGenerated] = useState<LiveRow | null>(null);
  const config = stages[stage],
    project = r.data?.project as LiveRow | undefined,
    stored = project ? savedData(project, config.key) : {},
    rates = costs.data?.costs as LiveRow | undefined,
    rate = rates?.tool_startup_generate ?? rates?.tool;
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {project && (
        <>
          <h3>{String(project.name)}</h3>
          <div className="module-tabs">
            {Object.entries(stages).map(([key, value]) => (
              <Button
                key={key}
                onClick={() => {
                  setStage(key as Stage);
                  setGenerated(null);
                }}
              >
                {fa ? value.fa : value.en}
              </Button>
            ))}
          </div>
          <LiveLoad {...costs} />
          {typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && (
            <>
              <p>
                {fa ? "هزینه تولید: " : "Generation cost: "}
                {rate} {fa ? "کردیت" : "credits"}
              </p>
              <LiveForm
                key={stage}
                title={fa ? config.fa : config.en}
                url="/api/startup/generate"
                fields={config.fields}
                initial={(stored.inputs ?? {}) as LiveRow}
                map={(body) => ({
                  stage,
                  data: {
                    ...body,
                    name: project.name,
                    startupName: project.name,
                  },
                  lang: fa ? "fa" : "en",
                })}
                submit={async (body) => {
                  const d = await liveRequest(
                    "/api/startup/generate",
                    "POST",
                    body,
                  );
                  if (typeof d.result !== "string" || !d.result.trim())
                    throw Error("EMPTY_RESULT");
                  setGenerated({ inputs: body.data, result: d.result });
                  return d;
                }}
                onDone={() => {}}
                caution={
                  fa
                    ? "پس از تأیید، کردیت کسر می‌شود. نتیجه را پس از بررسی با دکمه ذخیره ثبت کنید؛ برای ذخیره مجدد نیازی به تولید دوباره نیست."
                    : "Confirmation uses credits. Review the result and save it separately; saving again does not require another generation."
                }
              />
            </>
          )}
          {(generated?.result || stored.result) && (
            <>
              <div
                className="domain-card"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {String(generated?.result ?? stored.result)}
              </div>
              {generated && (
                <LiveForm
                  title={fa ? "ذخیره نتیجه در پروژه" : "Save result to project"}
                  url={"/api/startup/" + encodeURIComponent(id)}
                  method="PUT"
                  map={() => ({
                    [config.key]: JSON.stringify(generated),
                    stage,
                  })}
                  onDone={() => {
                    setGenerated(null);
                    r.reload();
                    onSaved();
                  }}
                  caution={
                    fa
                      ? "نتیجه قبلی این مرحله در پروژه جایگزین می‌شود؛ کردیت دیگری کسر نمی‌شود."
                      : "This replaces the saved result for this stage. No additional generation credits are used."
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
