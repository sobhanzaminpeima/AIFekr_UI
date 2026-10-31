"use client";
import Link from "./site-link";
import { useShell } from "./live-shell-context";
import { Icon } from "./ui";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  field,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
} from "./live-module-kit";
export function LiveAgents({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(
      view.id === "runs" ? "/api/ceo/workspace" : "/api/agents/workspace",
    );
  return (
    <LiveModuleFrame module={module} view={view}>
      <section className="panel">
        <LiveLoad {...r} />
        {r.data &&
          (view.id === "runs" ? (
            <LiveTable
              items={liveRows(r.data.actions)}
              columns={[
                field("summary", "اقدام", "Action"),
                field("status", "وضعیت", "Status"),
                field("createdAt", "تاریخ", "Created"),
              ]}
              actions={() => (
                <Link href="/ceo?tab=approvals">
                  {fa ? "مدیریت تأییدها" : "Manage approvals"}
                </Link>
              )}
            />
          ) : (
            <>
              {view.id === "create" && (
                <p className="plan-notice">
                  {fa
                    ? "برای راه‌اندازی دستیار، قابلیت مورد نظر را انتخاب کنید و اطلاعات همان فضای کاری را تکمیل کنید. دسترسی و هزینه در صفحه ابزار بررسی می‌شود."
                    : "Choose an assistant capability, then configure its workspace. Access and costs are checked on the tool page."}
                </p>
              )}
              <div className="tool-grid">
                {liveRows(
                  view.id === "industry" ? r.data.industry : r.data.general,
                ).map((a) => (
                  <Link
                    className="panel tool-card"
                    key={String(a.id)}
                    href={String(a.href)}
                  >
                    <span className="icon-chip orange">
                      <Icon name={String(a.icon ?? "Bot")} />
                    </span>
                    <h3>{String(a.name)}</h3>
                    <p>{String(a.description ?? "")}</p>
                    <span>{fa ? "باز کردن فضای کاری" : "Open workspace"}</span>
                  </Link>
                ))}
              </div>
              {!liveRows(
                view.id === "industry" ? r.data.industry : r.data.general,
              ).length && (
                <p>
                  {fa
                    ? "دستیار فعالی برای این حساب در این دسته وجود ندارد."
                    : "No enabled assistants in this category for your account."}
                </p>
              )}
            </>
          ))}
      </section>
    </LiveModuleFrame>
  );
}
