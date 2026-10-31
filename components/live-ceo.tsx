"use client";
import { useState } from "react";
import Link from "./site-link";
import { useShell } from "./live-shell-context";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  liveRows,
  useLiveData,
  type LiveRow,
} from "./live-module-kit";
import { LiveStreamTool } from "./live-stream-tool";
export function LiveCeo({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const shell = useShell()!,
    fa = shell.lang === "fa",
    workspace = useLiveData("/api/ceo/workspace");
  return (
    <LiveModuleFrame module={module} view={view}>
      {view.id === "advisor" && (
        <>
          <LiveStreamTool
            title={fa ? "پرسش از مشاور مدیرعامل" : "Ask the CEO adviser"}
            feature="ceo.question"
            url="/api/ceo/question"
            fields={[
              field("question", "پرسش شما", "Your question", "textarea"),
              field(
                "category",
                "حوزه تصمیم",
                "Decision category",
                "text",
                true,
              ),
            ]}
            map={(b) => ({ ...b, lang: shell.lang })}
            onDone={workspace.reload}
          />
          <section className="panel">
            <LiveLoad {...workspace} />
            {workspace.data && (
              <LiveTable
                items={liveRows(workspace.data.conversations)}
                columns={[
                  field("title", "موضوع", "Topic"),
                  field("updatedAt", "آخرین تغییر", "Updated"),
                ]}
                actions={(c) => (
                  <Link href={"/chat/" + encodeURIComponent(String(c.id))}>
                    {fa ? "گفتگوی ذخیره‌شده" : "Saved conversation"}
                  </Link>
                )}
              />
            )}
          </section>
        </>
      )}
      {view.id === "orchestrator" && (
        <>
          <LiveStreamTool
            title={
              fa
                ? "تحلیل و اولویت‌بندی کسب‌وکار"
                : "Analyze business priorities"
            }
            feature="ceo.orchestrator-run"
            url="/api/ceo/orchestrator/run"
            fields={[]}
          />
          <AutoRun />
          <Tasks />
        </>
      )}
      {view.id === "goals" && <Tasks />}
      {view.id === "approvals" && (
        <section className="panel">
          <h3>
            {fa
              ? "اقدام‌های پیشنهادی؛ اجرا فقط با تأیید شما"
              : "Proposed actions; execution requires your confirmation"}
          </h3>
          <LiveLoad {...workspace} />
          {workspace.data && (
            <LiveTable
              items={liveRows(workspace.data.actions)}
              columns={[
                field("summary", "خلاصه اقدام", "Action summary"),
                field("status", "وضعیت", "Status"),
                field("expiresAt", "پایان اعتبار", "Expires"),
                field("createdAt", "تاریخ", "Created"),
              ]}
              actions={(a) =>
                a.status === "PENDING" && !a.expired ? (
                  <>
                    <LiveForm
                      title={fa ? "تأیید و اجرا" : "Confirm and execute"}
                      url={
                        "/api/orchestrator/action/" +
                        encodeURIComponent(String(a.id))
                      }
                      onDone={workspace.reload}
                      caution={
                        String(a.summary) +
                        " — " +
                        (fa
                          ? "این اقدام روی داده‌ها یا ارتباطات واقعی اجرا می‌شود."
                          : "This action executes against real data or communications.")
                      }
                    />
                    <LiveForm
                      title={fa ? "رد اقدام" : "Reject action"}
                      url={
                        "/api/orchestrator/action/" +
                        encodeURIComponent(String(a.id))
                      }
                      method="DELETE"
                      onDone={workspace.reload}
                      caution={
                        fa
                          ? "اقدام اجرا نمی‌شود و رد شدن آن ثبت می‌شود."
                          : "The action is not executed; its rejection is recorded."
                      }
                    />
                  </>
                ) : null
              }
            />
          )}
        </section>
      )}
      {view.id === "memory" && <Memory />}
      {view.id === "knowledge" && <BusinessProfile />}
    </LiveModuleFrame>
  );
}
function Tasks() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/ceo/tasks");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "ثبت هدف یا وظیفه" : "Add goal or task"}
        url="/api/ceo/tasks"
        fields={[
          field("title", "عنوان", "Title"),
          field("description", "توضیحات", "Description", "textarea", true),
          field("department", "بخش مسئول", "Department"),
          {
            ...field("priority", "اولویت", "Priority"),
            choices: [
              ["critical", "فوری"],
              ["high", "زیاد"],
              ["medium", "متوسط"],
              ["low", "کم"],
            ].map(([value, label]) => ({ value, label: fa ? label : value })),
          },
        ]}
        onDone={r.reload}
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.tasks)}
          columns={[
            field("title", "عنوان", "Title"),
            field("description", "شرح", "Description"),
            field("department", "مسئول", "Department"),
            field("priority", "اولویت", "Priority"),
            field("status", "وضعیت", "Status"),
            field("estimatedImpact", "تأثیر تخمینی", "Estimated impact"),
          ]}
          actions={(t) => (
            <>
              <LiveForm
                title={fa ? "تغییر وضعیت" : "Change status"}
                url="/api/ceo/tasks"
                method="PUT"
                fields={[
                  {
                    ...field("status", "وضعیت", "Status"),
                    choices: [
                      ["pending", "در انتظار"],
                      ["approved", "تأییدشده"],
                      ["in_progress", "در حال انجام"],
                      ["done", "انجام‌شده"],
                      ["rejected", "ردشده"],
                    ].map(([value, label]) => ({
                      value,
                      label: fa ? label : value,
                    })),
                  },
                ]}
                initial={t}
                map={(b) => ({ ...b, id: t.id })}
                onDone={r.reload}
                caution={
                  fa
                    ? "این تغییر فقط وضعیت وظیفه را ثبت می‌کند؛ تأیید وظیفه به‌تنهایی پیام یا عملیات خارجی اجرا نمی‌کند."
                    : "This records the task status only. Approving a task does not itself execute an external operation."
                }
              />
              <LiveForm
                title={fa ? "حذف" : "Delete"}
                url="/api/ceo/tasks"
                method="DELETE"
                map={() => ({ id: t.id })}
                onDone={r.reload}
                caution={
                  fa
                    ? "وظیفه از فهرست شما حذف می‌شود."
                    : "This removes the task from your list."
                }
              />
            </>
          )}
        />
      )}
    </section>
  );
}
function AutoRun() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/ceo/orchestrator/auto-run");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <p>
            {fa ? "تحلیل دوره‌ای: " : "Scheduled briefing: "}
            {r.data.enabled
              ? fa
                ? "فعال"
                : "Enabled"
              : fa
                ? "غیرفعال"
                : "Disabled"}
          </p>
          <LiveForm
            title={
              r.data.enabled
                ? fa
                  ? "توقف تحلیل دوره‌ای"
                  : "Disable scheduled briefing"
                : fa
                  ? "فعال‌سازی تحلیل دوره‌ای"
                  : "Enable scheduled briefing"
            }
            url="/api/ceo/orchestrator/auto-run"
            map={() => ({ enabled: !r.data!.enabled })}
            onDone={r.reload}
            caution={
              fa
                ? "فعال‌سازی باعث اجرای خودکار تحلیل و ارسال گزارش طبق تنظیمات فعلی سرور می‌شود."
                : "Enabling starts automatic analysis and report delivery under the existing server settings."
            }
          />
        </>
      )}
    </section>
  );
}
function Memory() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/ceo/orchestrator/memory");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "افزودن به حافظه" : "Add business memory"}
        url="/api/ceo/orchestrator/memory"
        fields={[
          field("category", "دسته", "Category"),
          field(
            "text",
            "اطلاعاتی که باید به یاد بماند",
            "Information to remember",
            "textarea",
          ),
        ]}
        onDone={r.reload}
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.memories)}
          columns={[
            field("category", "دسته", "Category"),
            field("text", "متن", "Text"),
            field("source", "منبع", "Source"),
            field("createdAt", "تاریخ", "Created"),
          ]}
          actions={(m) => (
            <LiveForm
              title={fa ? "حذف" : "Delete"}
              url="/api/ceo/orchestrator/memory"
              method="DELETE"
              map={() => ({ id: m.id })}
              onDone={r.reload}
              caution={
                fa
                  ? "این مورد از حافظه کسب‌وکار حذف می‌شود."
                  : "This removes the item from business memory."
              }
            />
          )}
        />
      )}
    </section>
  );
}
function BusinessProfile() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/business-profile");
  const fields = [
    field("name", "نام کسب‌وکار", "Business name"),
    field("industry", "صنعت", "Industry"),
    ...[
      ["description", "توضیح کسب‌وکار", "Description"],
      ["products", "محصولات و خدمات", "Products and services"],
      ["targetCustomers", "مشتریان هدف", "Target customers"],
      ["competitors", "رقبا", "Competitors"],
      ["goals", "هدف‌ها", "Goals"],
      ["challenges", "چالش‌ها", "Challenges"],
      ["strengths", "نقاط قوت", "Strengths"],
      ["businessModel", "مدل کسب‌وکار", "Business model"],
      ["uniqueValue", "مزیت رقابتی", "Competitive advantage"],
    ].map(([key, a, b]) => field(key, a, b, "textarea", true)),
    field("website", "آدرس سایت", "Website", "url", true),
    field("size", "اندازه تیم", "Team size", "text", true),
    field("revenue", "درآمد و واحد پول", "Revenue and currency", "text", true),
  ];
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <p>
            {fa
              ? "اطلاعات پایهٔ مشترک برای تحلیل‌های تیم هوش مصنوعی"
              : "Shared business context for the AI team"}
          </p>
          <LiveForm
            title={fa ? "ویرایش دانش کسب‌وکار" : "Edit business context"}
            url="/api/business-profile"
            fields={fields}
            initial={(r.data.profile ?? {}) as LiveRow}
            onDone={r.reload}
          />
          {r.data.profile && (
            <LiveTable items={[r.data.profile as LiveRow]} columns={fields} />
          )}
        </>
      )}
    </section>
  );
}
