"use client";
import { useState } from "react";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import { LiveUpload } from "./live-upload";
import { browserTimeZone } from "@/lib/timezone";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  type LiveField,
  type LiveRow,
} from "./live-module-kit";
const API = "/api/voice-agent/",
  enc = encodeURIComponent;
const select = (
  key: string,
  fa: string,
  en: string,
  values: string[],
): LiveField => ({
  ...field(key, fa, en),
  choices: values.map((value) => ({ value, label: value })),
});
export function LiveCallCenter({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    agents = useLiveData(API + "agents");
  const options = liveRows(agents.data?.agents).map((a) => ({
    value: String(a.id),
    label: String(a.name),
  }));
  const agentField = {
    ...field("agentId", "منشی مرتبط", "Related assistant"),
    choices: [
      {
        value: "",
        label: fa ? "همه منشی‌ها / مشترک" : "All assistants / shared",
      },
      ...options,
    ],
  };
  return (
    <LiveModuleFrame module={module} view={view}>
      <section className="panel">
        <LiveLoad {...agents} />
        {agents.data && (
          <>
            <p>
              {fa ? "تعرفه تماس: " : "Call rate: "}
              {String(agents.data.creditsPerMinute ?? "—")}{" "}
              {fa ? "کردیت در دقیقه" : "credits per minute"} ·{" "}
              {fa ? "حداکثر هر تماس: " : "Maximum call duration: "}
              {String(agents.data.maxDurationSeconds ?? "—")} s
            </p>
            <p>
              {fa ? "اشتراک تماس: " : "Call subscription: "}
              {agents.data.hasAccess
                ? fa
                  ? "فعال"
                  : "Active"
                : fa
                  ? "نیازمند فعال‌سازی"
                  : "Activation required"}
            </p>
            {!agents.data.configured && (
              <p className="plan-notice">
                {fa
                  ? "زیرساخت تلفن هنوز توسط مدیر کامل نشده است. تنظیمات منشی ذخیره می‌شوند؛ شماره فقط پس از پیکربندی و تخصیص مدیر متصل می‌شود."
                  : "Phone infrastructure is not fully configured by the administrator. Assistant settings can be saved; phone connection requires administrator setup and assignment."}
              </p>
            )}
          </>
        )}
      </section>
      {["agents", "setup", "numbers"].includes(view.id) && (
        <Assistants agents={agents} numbers={view.id === "numbers"} />
      )}
      {view.id === "knowledge" && <Knowledge agentField={agentField} />}
      {view.id === "properties" && <Properties agentField={agentField} />}
      {view.id === "calls" && <Calls />}
      {view.id === "appointments" && <Appointments />}
    </LiveModuleFrame>
  );
}
function Assistants({
  agents,
  numbers,
}: {
  agents: ReturnType<typeof useLiveData>;
  numbers: boolean;
}) {
  const shell = useShell()!,
    fa = shell.lang === "fa";
  const fields = [
    field("name", "نام منشی", "Assistant name"),
    select("language", "زبان مکالمه", "Call language", [
      "fa",
      "en",
      "de",
      "tr",
    ]),
    field("timezone", "منطقه زمانی", "Time zone"),
    field(
      "openingHour",
      "ساعت شروع (۰ تا ۲۳)",
      "Opening hour (0–23)",
      "number",
    ),
    field(
      "closingHour",
      "ساعت پایان (۱ تا ۲۴)",
      "Closing hour (1–24)",
      "number",
    ),
    select(
      "appointmentMinutes",
      "مدت هر نوبت (دقیقه)",
      "Appointment duration (minutes)",
      ["15", "30", "45", "60"],
    ),
    field(
      "voiceId",
      "شناسه صدای پیکربندی‌شده (اختیاری)",
      "Configured voice ID (optional)",
      "text",
      true,
    ),
    field(
      "systemPrompt",
      "دستور منشی (اختیاری؛ در صورت خالی از سناریو ساخته می‌شود)",
      "Assistant instructions (optional; scenario default when empty)",
      "textarea",
      true,
    ),
  ];
  const [info, setInfo] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      {!numbers && (
        <LiveForm
          title={fa ? "ایجاد منشی" : "Create assistant"}
          url={API + "agents"}
          fields={[
            ...fields,
            select("vertical", "سناریو", "Scenario", [
              "general",
              "reception",
              "real_estate",
              "clinic",
            ]),
            field(
              "businessType",
              "نوع کسب‌وکار",
              "Business type",
              "text",
              true,
            ),
            select("focus", "تمرکز املاک", "Real estate focus", [
              "general",
              "buy",
              "sell",
              "rent",
            ]),
          ]}
          initial={{
            language: shell.lang,
            timezone: browserTimeZone(),
            openingHour: 9,
            closingHour: 18,
            appointmentMinutes: "30",
          }}
          map={(b) => ({
            ...b,
            appointmentMinutes: Number(b.appointmentMinutes),
          })}
          onDone={agents.reload}
        />
      )}
      {agents.data && (
        <LiveTable
          items={liveRows(agents.data.agents)}
          columns={[
            field("name", "نام", "Name"),
            field("language", "زبان", "Language"),
            field("isActive", "فعال", "Active"),
            field("phoneNumber", "شماره اختصاصی", "Assigned number"),
            field("connected", "متصل", "Connected"),
          ]}
          actions={(a) => (
            <>
              <LiveForm
                title={fa ? "ویرایش تنظیمات" : "Edit settings"}
                url={API + "agents/" + enc(String(a.id))}
                method="PATCH"
                fields={fields}
                initial={a}
                map={(b) => ({
                  ...b,
                  appointmentMinutes: Number(b.appointmentMinutes),
                })}
                onDone={agents.reload}
                caution={
                  fa
                    ? "اگر منشی متصل باشد، تنظیمات روی سرویس تلفن هم به‌روز می‌شوند."
                    : "For a connected assistant, settings also update the phone provider."
                }
              />
              <LiveForm
                title={
                  a.isActive
                    ? fa
                      ? "غیرفعال‌سازی"
                      : "Deactivate"
                    : fa
                      ? "فعال‌سازی"
                      : "Activate"
                }
                url={API + "agents/" + enc(String(a.id))}
                method="PATCH"
                map={() => ({ isActive: !a.isActive })}
                onDone={agents.reload}
                caution={
                  fa
                    ? "پاسخگویی این منشی به وضعیت جدید وابسته خواهد بود."
                    : "This changes the assistant availability."
                }
              />
              {["ADMIN", "SUPER_ADMIN"].includes(shell.user.role) && (
                <LiveForm
                  title={
                    fa
                      ? "تخصیص شماره توسط مدیر"
                      : "Assign phone number as administrator"
                  }
                  url={API + "agents/" + enc(String(a.id)) + "/provision"}
                  fields={[
                    field(
                      "phoneNumberId",
                      "شناسه شماره خریداری‌شده در سرویس تلفن",
                      "Purchased provider phone-number ID",
                    ),
                  ]}
                  onDone={agents.reload}
                  caution={
                    fa
                      ? "شماره واقعی به این منشی تخصیص می‌یابد. این فرم شماره جدید خریداری نمی‌کند."
                      : "This assigns a real provider number to the assistant. It does not purchase a new number."
                  }
                />
              )}
              <LiveForm
                title={
                  fa
                    ? "حذف منشی بدون سابقه"
                    : "Delete assistant without history"
                }
                url={API + "agents/" + enc(String(a.id))}
                method="DELETE"
                onDone={agents.reload}
                caution={
                  fa
                    ? "اتصال شماره آزاد و منشی حذف می‌شود. منشی دارای سابقه تماس یا نوبت، قابل حذف نیست و باید غیرفعال شود."
                    : "The phone connection is released and the assistant is deleted. Assistants with call or appointment history must be deactivated instead."
                }
              />
            </>
          )}
        />
      )}
      {numbers && (
        <>
          <p className="plan-notice">
            {fa
              ? "تخصیص شماره فقط توسط مدیر انجام می‌شود. شماره‌های خریداری‌شده دیگران نمایش داده نمی‌شوند."
              : "Phone assignment is administrator-managed. Other customers’ purchased numbers are never listed."}
          </p>
          <LiveForm
            title={
              fa
                ? "بررسی اتصال و رزرو کردیت تماس"
                : "Check connection and call credit reservation"
            }
            url={API + "numbers"}
            method="GET"
            onDone={setInfo}
          />
          {info && (
            <p>
              {fa ? "حداکثر رزرو هر تماس: " : "Maximum reservation per call: "}
              {String(info.reservationCredits ?? "—")}{" "}
              {fa ? "کردیت" : "credits"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
function Knowledge({ agentField }: { agentField: LiveField }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "knowledge");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "افزودن دانش متنی" : "Add text knowledge"}
        url={API + "knowledge"}
        fields={[
          field("title", "عنوان", "Title"),
          field("content", "محتوا", "Content", "textarea"),
          agentField,
        ]}
        onDone={r.reload}
      />
      <LiveUpload
        title={fa ? "افزودن PDF یا Word" : "Upload PDF or Word"}
        url={API + "knowledge/upload"}
        accept=".pdf,.docx"
        maxBytes={10 * 1024 * 1024}
        fields={[
          field("title", "عنوان اختیاری", "Optional title", "text", true),
          agentField,
        ]}
        onDone={r.reload}
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.entries)}
          columns={[
            field("title", "عنوان", "Title"),
            field("content", "محتوا", "Content"),
            field("updatedAt", "آخرین تغییر", "Updated"),
          ]}
          actions={(e) => (
            <>
              <LiveForm
                title={fa ? "ویرایش" : "Edit"}
                url={API + "knowledge/" + enc(String(e.id))}
                method="PATCH"
                fields={[
                  field("title", "عنوان", "Title"),
                  field("content", "محتوا", "Content", "textarea"),
                ]}
                initial={e}
                onDone={r.reload}
              />
              <LiveForm
                title={fa ? "حذف" : "Delete"}
                url={API + "knowledge/" + enc(String(e.id))}
                method="DELETE"
                onDone={r.reload}
                caution={
                  fa
                    ? "این اطلاعات دیگر در دسترس منشی نیست."
                    : "This knowledge is removed from the assistant context."
                }
              />
            </>
          )}
        />
      )}
    </section>
  );
}
function Properties({ agentField }: { agentField: LiveField }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "properties");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      <LiveForm
        title={fa ? "افزودن ملک به دانش منشی" : "Add property knowledge"}
        url={API + "properties"}
        fields={[
          field("title", "عنوان", "Title"),
          select("listingType", "نوع معامله", "Listing type", [
            "buy",
            "sell",
            "rent",
          ]),
          field("propertyType", "نوع ملک", "Property type"),
          field(
            "price",
            "قیمت به واحد پول دفتر",
            "Price in workspace book currency",
            "number",
          ),
          field("address", "آدرس", "Address"),
          field("city", "شهر", "City", "text", true),
          field("bedrooms", "اتاق خواب", "Bedrooms", "number", true),
          field("bathrooms", "حمام", "Bathrooms", "number", true),
          field("areaSqm", "متراژ", "Area m²", "number", true),
          field("description", "توضیحات", "Description", "textarea", true),
          agentField,
        ]}
        onDone={r.reload}
      />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.properties)}
          columns={[
            field("title", "عنوان", "Title"),
            field("listingType", "نوع معامله", "Listing type"),
            field("price", "قیمت", "Price"),
            field("city", "شهر", "City"),
            field("status", "وضعیت", "Status"),
          ]}
          actions={(p) => (
            <>
              <LiveForm
                title={fa ? "ویرایش ملک" : "Edit property"}
                url={API + "properties/" + enc(String(p.id))}
                method="PATCH"
                fields={[
                  field("title", "عنوان", "Title"),
                  field("price", "قیمت", "Price", "number"),
                  field("address", "آدرس", "Address"),
                  field("city", "شهر", "City", "text", true),
                  field(
                    "description",
                    "توضیحات",
                    "Description",
                    "textarea",
                    true,
                  ),
                ]}
                initial={p}
                onDone={r.reload}
              />
              <LiveForm
                title={fa ? "تغییر وضعیت" : "Change status"}
                url={API + "properties/" + enc(String(p.id))}
                method="PATCH"
                fields={[
                  select("status", "وضعیت", "Status", [
                    "available",
                    "pending",
                    "sold",
                    "rented",
                  ]),
                ]}
                initial={p}
                onDone={r.reload}
              />
              <LiveForm
                title={fa ? "حذف ملک" : "Delete property"}
                url={API + "properties/" + enc(String(p.id))}
                method="DELETE"
                onDone={r.reload}
                caution={
                  fa
                    ? "فایل ملک از دانش منشی حذف می‌شود. سوابق وابسته طبق قواعد سرور به‌روز می‌شوند."
                    : "The property is removed from assistant knowledge. Related records follow the server retention rules."
                }
              />
            </>
          )}
        />
      )}
    </section>
  );
}
function Calls() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "calls");
  const [call, setCall] = useState<LiveRow | null>(null);
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.calls).map((c) => ({
            ...c,
            agentName: (c.agent as LiveRow)?.name,
          }))}
          columns={[
            field("agentName", "منشی", "Assistant"),
            field("callerPhone", "تماس‌گیرنده", "Caller"),
            field("status", "وضعیت", "Status"),
            field("durationSec", "مدت (ثانیه)", "Duration (s)"),
            field("creditsCharged", "کردیت", "Credits"),
            field("createdAt", "تاریخ", "Date"),
          ]}
          actions={(c) => (
            <Button onClick={() => setCall(c)}>
              {fa ? "متن و خلاصه تماس" : "Transcript and summary"}
            </Button>
          )}
        />
      )}
      {call && (
        <div
          className="domain-card"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          <p>{String(call.summary ?? "")}</p>
          <p>{String(call.transcript ?? "")}</p>
          {typeof call.recordingUrl === "string" &&
            /^https:\/\//i.test(call.recordingUrl) && (
              <audio
                controls
                preload="none"
                src={call.recordingUrl}
                aria-label={fa ? "فایل ضبط تماس" : "Call recording"}
              />
            )}
        </div>
      )}
    </section>
  );
}
function Appointments() {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(API + "appointments");
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <LiveTable
          items={liveRows(r.data.appointments).map((a) => ({
            ...a,
            agentName: (a.agent as LiveRow)?.name,
            propertyTitle: (a.property as LiveRow | null)?.title,
          }))}
          columns={[
            field("agentName", "منشی", "Assistant"),
            field("leadName", "مراجعه‌کننده", "Customer"),
            field("leadPhone", "تلفن", "Phone"),
            field("scheduledAt", "زمان نوبت", "Scheduled time"),
            field("propertyTitle", "ملک", "Property"),
            field("status", "وضعیت", "Status"),
          ]}
          actions={(a) => (
            <LiveForm
              title={fa ? "ویرایش نوبت" : "Edit appointment"}
              url={API + "appointments/" + enc(String(a.id))}
              method="PATCH"
              fields={[
                select("status", "وضعیت", "Status", [
                  "pending",
                  "confirmed",
                  "completed",
                  "cancelled",
                  "no_show",
                ]),
                field(
                  "scheduledAt",
                  "زمان جدید با منطقه زمانی، مثال 2026-11-02T10:00:00+03:00",
                  "New time with time zone, e.g. 2026-11-02T10:00:00+03:00",
                  "text",
                  true,
                ),
                field("notes", "یادداشت", "Notes", "textarea", true),
              ]}
              initial={a}
              onDone={r.reload}
              caution={
                fa
                  ? "زمان و وضعیت نوبت واقعی تغییر می‌کند؛ تداخل زمان توسط سرور بررسی می‌شود."
                  : "This changes the real appointment. The server checks scheduling conflicts."
              }
            />
          )}
        />
      )}
    </section>
  );
}
