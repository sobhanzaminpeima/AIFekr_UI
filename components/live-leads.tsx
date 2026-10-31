"use client";
import { useState } from "react";
import Link from "./site-link";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
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
import {
  leadFieldKeys,
  leadFieldPayload,
  publicLeadPaths,
  leadEmbedCode,
} from "@/lib/lead-form-contract";
const API = "/api/leadgen/";
export function LiveLeads({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  return (
    <LiveModuleFrame module={module} view={view}>
      {["overview", "reports"].includes(view.id) ? (
        <Report />
      ) : ["sources", "connectors"].includes(view.id) ? (
        <Connectors />
      ) : (
        <Forms inbox={view.id === "inbox"} />
      )}
    </LiveModuleFrame>
  );
}
function Report() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "report");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <div className="credit-packs">
            {[
              ["totalLeads", "سرنخ‌های فعلی", "Current leads"],
              ["formLeads", "مخاطبان فرم‌ها", "Form contacts"],
              ["formSubmissions", "فرم‌های ارسال‌شده", "Submissions"],
              ["avgScore", "میانگین امتیاز", "Average score"],
            ].map(([key, a, b]) => (
              <div className="panel" key={key}>
                <p>{fa ? a : b}</p>
                <h2>{String(r.data![key] ?? "—")}</h2>
              </div>
            ))}
          </div>
          <LiveTable
            items={liveRows(r.data.channels)}
            columns={[
              field("source", "کانال", "Channel"),
              field("total", "تعداد", "Total"),
              field("qualified", "واجد شرایط", "Qualified"),
              field("customer", "مشتری", "Customers"),
              field("conversionRate", "نرخ تبدیل ٪", "Conversion %"),
            ]}
          />
          <Link href="/crm?tab=contacts">
            {fa ? "بررسی و پیگیری در CRM" : "Review and follow up in CRM"}
          </Link>
        </>
      )}
    </section>
  );
}
function Forms({ inbox }: { inbox: boolean }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "forms");
  const [selected, setSelected] = useState<string | null>(null);
  const editable = [
    field("title", "عنوان", "Title"),
    field("titleEn", "عنوان انگلیسی", "English title", "text", true),
    field("titleDe", "عنوان آلمانی", "German title", "text", true),
    field(
      "description",
      "توضیحات فارسی",
      "Persian description",
      "textarea",
      true,
    ),
    field(
      "descriptionEn",
      "توضیحات انگلیسی",
      "English description",
      "textarea",
      true,
    ),
    field(
      "descriptionDe",
      "توضیحات آلمانی",
      "German description",
      "textarea",
      true,
    ),
    field("accentColor", "رنگ فرم", "Accent color", "color", true),
    field("logoUrl", "نشانی لوگو", "Logo URL", "url", true),
    field("submitLabel", "متن دکمه", "Submit label", "text", true),
    field("successMessage", "پیام موفقیت", "Success message", "textarea", true),
    field("redirectUrl", "نشانی پس از ارسال", "Redirect URL", "url", true),
  ];
  return (
    <>
      <section className="panel">
        <LiveLoad {...r} />
        {r.data && (
          <>
            {!inbox && (
              <LiveForm
                title={fa ? "ساخت فرم" : "Create form"}
                url={API + "forms"}
                fields={editable}
                onDone={r.reload}
                caution={
                  fa
                    ? "فرم جدید فعال و قابل دسترسی عمومی می‌شود. اطلاعات ارسالی در CRM ذخیره می‌شوند."
                    : "The new form becomes publicly available. Submissions are stored in CRM."
                }
              />
            )}
            <LiveTable
              items={liveRows(r.data.forms)}
              columns={[
                field("title", "عنوان", "Title"),
                field("submissionCount", "ارسال‌ها", "Submissions"),
                field("isActive", "وضعیت", "Active"),
              ]}
              actions={(row) => (
                <>
                  <Button onClick={() => setSelected(String(row.id))}>
                    {fa ? "ارسال‌ها و لینک فرم" : "Submissions and form link"}
                  </Button>
                  {!inbox && (
                    <>
                      <LiveForm
                        title={fa ? "ویرایش" : "Edit"}
                        url={
                          API + "forms/" + encodeURIComponent(String(row.id))
                        }
                        method="PUT"
                        fields={editable}
                        initial={row}
                        onDone={r.reload}
                      />
                      <FieldEditor row={row} onDone={r.reload} />
                      <LiveForm
                        title={
                          row.isActive
                            ? fa
                              ? "غیرفعال‌سازی"
                              : "Deactivate"
                            : fa
                              ? "فعال‌سازی"
                              : "Activate"
                        }
                        url={
                          API + "forms/" + encodeURIComponent(String(row.id))
                        }
                        method="PUT"
                        map={() => ({ isActive: !row.isActive })}
                        onDone={r.reload}
                        caution={
                          fa
                            ? "دسترسی عمومی فرم تغییر می‌کند."
                            : "This changes public availability of the form."
                        }
                      />
                      <LiveForm
                        title={fa ? "حذف فرم" : "Delete form"}
                        url={
                          API + "forms/" + encodeURIComponent(String(row.id))
                        }
                        method="DELETE"
                        onDone={() => {
                          r.reload();
                          if (selected === row.id) setSelected(null);
                        }}
                        caution={
                          fa
                            ? "فرم و سابقه ارسال‌های آن حذف می‌شوند. مخاطبان قبلی در CRM باقی می‌مانند."
                            : "The form and its submissions will be deleted. Existing CRM contacts remain."
                        }
                      />
                    </>
                  )}
                </>
              )}
            />
          </>
        )}
      </section>
      {selected && (
        <Submissions
          key={selected}
          id={selected}
          form={liveRows(r.data?.forms).find((f) => f.id === selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function FieldEditor({ row, onDone }: { row: LiveRow; onDone: () => void }) {
  const fa = useShell()!.lang === "fa",
    labels = {
      name: ["نام", "Name"],
      phone: ["تلفن", "Phone"],
      email: ["ایمیل", "Email"],
      company: ["شرکت", "Company"],
      message: ["پیام", "Message"],
    };
  const initial: LiveRow = {},
    cfg = (row.fields ?? {}) as Record<
      string,
      { show?: boolean; required?: boolean }
    >;
  leadFieldKeys.forEach((k) => {
    initial[k + "_show"] = cfg[k]?.show;
    initial[k + "_required"] = cfg[k]?.required;
  });
  return (
    <LiveForm
      title={fa ? "فیلدهای فرم" : "Form fields"}
      url={API + "forms/" + encodeURIComponent(String(row.id))}
      method="PUT"
      fields={leadFieldKeys.flatMap((k) => [
        ...(k === "name"
          ? []
          : [
              field(
                k + "_show",
                "نمایش " + labels[k][0],
                "Show " + labels[k][1],
                "checkbox",
              ),
            ]),
        field(
          k + "_required",
          labels[k][0] + " الزامی",
          labels[k][1] + " required",
          "checkbox",
        ),
      ])}
      initial={initial}
      map={(d) => ({ fields: leadFieldPayload(d) })}
      onDone={onDone}
      caution={
        fa
          ? "فیلد نام همیشه نمایش داده می‌شود. فیلد پنهان نمی‌تواند الزامی باشد."
          : "Name is always visible. Hidden fields cannot be required."
      }
    />
  );
}
function Submissions({
  id,
  form,
  onClose,
}: {
  id: string;
  form?: LiveRow;
  onClose: () => void;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "forms/" + encodeURIComponent(id) + "/submissions");
  const paths = publicLeadPaths(String(form?.slug ?? ""));
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  return (
    <section className="panel">
      <div className="row-between">
        <h3>{String(form?.title ?? (fa ? "ارسال‌ها" : "Submissions"))}</h3>
        <Button onClick={onClose}>{fa ? "بستن" : "Close"}</Button>
      </div>
      {!!form?.slug && (
        <div className="domain-actions">
          <a target="_blank" rel="noopener noreferrer" href={paths.page}>
            {fa ? "باز کردن فرم عمومی" : "Open public form"}
          </a>
          <Button
            onClick={async () => {
              setCopyError(false);
              try {
                await navigator.clipboard.writeText(
                  leadEmbedCode(location.origin, String(form.slug)),
                );
                setCopied(true);
              } catch {
                setCopyError(true);
              }
            }}
          >
            {copied
              ? fa
                ? "کپی شد"
                : "Copied"
              : fa
                ? "کپی کد جاسازی"
                : "Copy embed code"}
          </Button>
          {copyError && (
            <p role="alert">{fa ? "کپی انجام نشد." : "Copy failed."}</p>
          )}
        </div>
      )}
      <LiveLoad {...r} />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.submissions).map((s) => ({
            ...s,
            ...((s.data ?? {}) as LiveRow),
          }))}
          columns={[
            field("name", "نام", "Name"),
            field("phone", "تلفن", "Phone"),
            field("email", "ایمیل", "Email"),
            field("company", "شرکت", "Company"),
            field("message", "پیام", "Message"),
            field("score", "امتیاز", "Score"),
            field("utmSource", "منبع", "Source"),
            field("utmCampaign", "کمپین", "Campaign"),
            field("createdAt", "تاریخ", "Created"),
          ]}
          actions={(s) =>
            s.contactId ? (
              <Link
                href={`/crm?tab=contacts&contact=${encodeURIComponent(String(s.contactId))}`}
              >
                {fa ? "مخاطب CRM" : "CRM contact"}
              </Link>
            ) : null
          }
        />
      )}
    </section>
  );
}
function Connectors() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "connectors");
  const [reveal, setReveal] = useState<string | null>(null);
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <div className="domain-actions">
            <LiveForm
              title={
                fa
                  ? "اتصال Google Ads / تعویض کلید"
                  : "Connect Google Ads / rotate key"
              }
              url={API + "connectors"}
              map={() => ({ provider: "google" })}
              onDone={r.reload}
              caution={
                fa
                  ? "کلید قبلی Google Ads بی‌اعتبار می‌شود؛ کلید جدید را در پنل تبلیغات جایگزین کنید."
                  : "This invalidates the previous Google Ads key. Update the webhook key in your ads account."
              }
            />
            <LiveForm
              title={fa ? "درخواست اتصال Meta" : "Request Meta connection"}
              url={API + "connectors/meta/request"}
              fields={[
                field("pageName", "نام صفحه", "Page name"),
                field("note", "یادداشت", "Note", "textarea", true),
              ]}
              onDone={r.reload}
              caution={
                fa
                  ? "درخواست برای بررسی مدیر ثبت می‌شود؛ تا تأیید، اتصال فعال نیست."
                  : "An administrator reviews the request. The connection remains pending until approved."
              }
            />
            <a href={API + "connectors/meta/start"}>
              {fa ? "اتصال مستقیم Meta با OAuth" : "Connect Meta with OAuth"}
            </a>
          </div>
          <LiveTable
            items={liveRows(r.data.connectors)}
            columns={[
              field("name", "نام", "Name"),
              field("provider", "ارائه‌دهنده", "Provider"),
              field("status", "وضعیت", "Status"),
              field("leadsImported", "سرنخ واردشده", "Imported leads"),
              field("lastLeadAt", "آخرین سرنخ", "Latest lead"),
              field("lastError", "آخرین خطا", "Latest error"),
            ]}
            actions={(c) => (
              <>
                {c.provider === "google" && (
                  <Button
                    onClick={() =>
                      setReveal(reveal === c.id ? null : String(c.id))
                    }
                  >
                    {fa
                      ? "نمایش / مخفی کردن اطلاعات اتصال"
                      : "Show / hide connection details"}
                  </Button>
                )}
                <LiveForm
                  title={fa ? "قطع اتصال" : "Disconnect"}
                  url={API + "connectors/" + encodeURIComponent(String(c.id))}
                  method="DELETE"
                  onDone={() => {
                    setReveal(null);
                    r.reload();
                  }}
                  caution={
                    fa
                      ? "دریافت سرنخ از این اتصال متوقف می‌شود. مخاطبان موجود حذف نمی‌شوند."
                      : "Lead ingestion through this connection stops. Existing contacts remain."
                  }
                />
                {reveal === c.id && (
                  <div>
                    <p>{String(c.webhookUrl ?? "")}</p>
                    <code>{String(c.webhookKey ?? "")}</code>
                    <p>
                      {fa
                        ? "این کلید محرمانه است؛ فقط در تنظیمات Google Ads وارد کنید."
                        : "Keep this key private; enter it only in Google Ads settings."}
                    </p>
                  </div>
                )}
              </>
            )}
          />
        </>
      )}
    </section>
  );
}
