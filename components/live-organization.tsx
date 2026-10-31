"use client";
import { useState } from "react";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import { useShell } from "./live-shell-context";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
  type LiveRow,
} from "./live-module-kit";
export function LiveOrganization({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/organizations");
  const [selected, setSelected] = useState("");
  const all: LiveRow[] = liveRows(r.data?.organizations).flatMap((o) =>
      liveRows(o.businesses).map((b) => ({
        ...b,
        organizationId: (o.organization as LiveRow).id,
        organizationName: (o.organization as LiveRow).name,
        role: o.role,
      })),
    ),
    business =
      all.find((b) => b.id === selected) ??
      all.find((b) => b.id === r.data?.activeBusinessId) ??
      all[0];
  return (
    <LiveModuleFrame module={module} view={view}>
      <section className="panel">
        <LiveLoad {...r} />
        {r.data && (
          <>
            <LiveForm
              title={
                fa
                  ? "ایجاد سازمان و فضای کسب‌وکار"
                  : "Create organization and business workspace"
              }
              url="/api/organizations"
              fields={[
                field("organizationName", "نام سازمان", "Organization name"),
                field("businessName", "نام کسب‌وکار", "Business name"),
                field("industry", "صنعت", "Industry", "text", true),
                field("country", "کشور", "Country", "text", true),
                field(
                  "timezone",
                  "منطقه زمانی (مثال Europe/Istanbul)",
                  "Time zone (e.g. Europe/Istanbul)",
                ),
                field(
                  "currency",
                  "واحد پول دفتر کسب‌وکار (USD / TRY / IRT)",
                  "Business book currency (USD / TRY / IRT)",
                ),
              ]}
              onDone={r.reload}
              caution={
                fa
                  ? "فضای جداگانه برای داده‌های کسب‌وکار ایجاد می‌شود. این کار پکیج یا اعتبار جدید اعطا نمی‌کند."
                  : "This creates a separate business data workspace. It does not grant a new package or credits."
              }
            />
            <LiveTable
              items={all}
              columns={[
                field("organizationName", "سازمان", "Organization"),
                field("name", "کسب‌وکار", "Business"),
                field("role", "نقش شما", "Your role"),
                field("currency", "واحد پول دفتر", "Book currency"),
                field("timezone", "منطقه زمانی", "Time zone"),
              ]}
              actions={(b) => (
                <>
                  <button
                    className="btn"
                    onClick={() => setSelected(String(b.id))}
                  >
                    {fa ? "جزئیات" : "Details"}
                  </button>
                  <LiveForm
                    title={
                      fa
                        ? "انتخاب به‌عنوان فضای فعال"
                        : "Switch active workspace"
                    }
                    url="/api/organizations/context"
                    method="PATCH"
                    map={() => ({ businessId: b.id })}
                    onDone={() => location.assign("/home")}
                    caution={
                      fa
                        ? "صفحات کسب‌وکار با داده‌های این فضا باز می‌شوند."
                        : "Business pages will use this workspace data."
                    }
                  />
                </>
              )}
            />
          </>
        )}
      </section>
      {business && (
        <OrganizationDetails
          key={String(business.id) + view.id}
          business={business}
          view={view.id}
          onChange={r.reload}
        />
      )}
      {["members", "invites", "roles"].includes(view.id) && (
        <TeamSeats view={view.id} />
      )}
    </LiveModuleFrame>
  );
}
function OrganizationDetails({
  business,
  view,
  onChange,
}: {
  business: LiveRow;
  view: string;
  onChange: () => void;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData(
      "/api/organizations/workspace?businessId=" +
        encodeURIComponent(String(business.id)),
    );
  const manage = ["OWNER", "ADMIN"].includes(String(business.role));
  return (
    <section className="panel">
      <LiveLoad {...r} />
      {r.data && (
        <>
          <h3>{String(business.name)}</h3>
          {view === "audit" && (
            <LiveTable
              items={liveRows(r.data.audits)}
              columns={[
                field("action", "رویداد", "Event"),
                field("targetType", "نوع داده", "Resource"),
                field("createdAt", "زمان", "Time"),
              ]}
            />
          )}
          {view === "members" && (
            <LiveTable
              items={liveRows(r.data.members)}
              columns={[
                field("name", "عضو فضای کسب‌وکار", "Business workspace member"),
                field("email", "ایمیل", "Email"),
                field("role", "نقش", "Role"),
                field("status", "وضعیت", "Status"),
              ]}
            />
          )}
          {view === "roles" && (
            <>
              <p>
                {fa
                  ? "مجوزهای واقعی نقش شما در این فضا"
                  : "Your actual permissions in this workspace"}
              </p>
              <div className="chips">
                {(Array.isArray(r.data.permissions)
                  ? r.data.permissions
                  : []
                ).map((p) => (
                  <span className="badge" key={String(p)}>
                    {String(p)}
                  </span>
                ))}
              </div>
            </>
          )}
          {view === "modules" && (
            <>
              <p>
                {fa
                  ? "فهرست ماژول‌های ثبت‌شده برای این فضا؛ دسترسی نهایی هر ابزار با پلن و مجوز سرور بررسی می‌شود."
                  : "Workspace module configuration; every tool still checks plan and server permissions."}
              </p>
              <LiveTable
                items={liveRows(r.data.flags)}
                columns={[
                  field("key", "ماژول", "Module"),
                  field("enabled", "وضعیت ثبت‌شده", "Configured status"),
                ]}
              />
              <p>
                {String(
                  (r.data.business as LiveRow)?.modules ??
                    (fa
                      ? "از تنظیمات پلتفرم و پلن پیروی می‌کند."
                      : "Inherited from platform and plan settings."),
                )}
              </p>
            </>
          )}
          {["identity", "settings", "workspaces"].includes(view) && (
            <>
              <LiveTable
                items={[r.data.business as LiveRow]}
                columns={[
                  field("name", "نام", "Name"),
                  field("industry", "صنعت", "Industry"),
                  field("country", "کشور", "Country"),
                  field("timezone", "منطقه زمانی", "Time zone"),
                  field("currency", "واحد پول دفتر", "Book currency"),
                  field("language", "زبان", "Language"),
                  field("description", "توضیحات", "Description"),
                ]}
              />
              {manage && (
                <>
                  <LiveForm
                    title={
                      fa
                        ? "افزودن کسب‌وکار به سازمان"
                        : "Add business to organization"
                    }
                    url={
                      "/api/organizations/" +
                      encodeURIComponent(String(business.organizationId)) +
                      "/businesses"
                    }
                    fields={[
                      field("name", "نام کسب‌وکار", "Business name"),
                      field("industry", "صنعت", "Industry", "text", true),
                      field("country", "کشور", "Country", "text", true),
                      field("timezone", "منطقه زمانی", "Time zone"),
                      field("currency", "واحد پول دفتر", "Book currency"),
                      field(
                        "description",
                        "توضیحات",
                        "Description",
                        "textarea",
                        true,
                      ),
                    ]}
                    onDone={onChange}
                  />
                  <LiveForm
                    title={
                      fa
                        ? "حذف کامل فضای کسب‌وکار"
                        : "Delete business workspace completely"
                    }
                    url={
                      "/api/organizations/" +
                      encodeURIComponent(String(business.organizationId)) +
                      "/businesses/" +
                      encodeURIComponent(String(business.id))
                    }
                    method="DELETE"
                    fields={[
                      field(
                        "confirmName",
                        "برای تأیید نام دقیق کسب‌وکار را بنویسید",
                        "Type the exact business name to confirm",
                      ),
                    ]}
                    onDone={onChange}
                    caution={
                      fa
                        ? "هشدار: داده‌های این فضای کسب‌وکار طبق قواعد حذف سرور پاک می‌شوند. این کار برگشت‌پذیر نیست. آخرین کسب‌وکار سازمان قابل حذف نیست."
                        : "Warning: this permanently deletes this business workspace data under the server deletion rules. The last business cannot be deleted."
                    }
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
function TeamSeats({ view }: { view: string }) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/team");
  const t = r.data?.team as LiveRow | null;
  return (
    <section className="panel">
      <h3>{fa ? "صندلی‌های پکیج تیمی" : "Team-plan seats"}</h3>
      <p>
        {fa
          ? "صندلی اشتراک تیمی با عضویت فضای سازمان یکسان نیست؛ این بخش از ظرفیت و قوانین پکیج تیمی فعلی پیروی می‌کند."
          : "Subscription seats and organization workspace membership are separate. This section uses the existing team-plan capacity and rules."}
      </p>
      <LiveLoad {...r} />
      {r.data &&
        (!t ? (
          <p>
            {fa
              ? "پکیج تیمی فعالی برای این حساب ثبت نشده است."
              : "No active team-plan membership is recorded for this account."}
          </p>
        ) : (
          <>
            <p>
              {String(t.name)} — {fa ? "ظرفیت: " : "Capacity: "}
              {String(t.maxSeats ?? "—")}
            </p>
            {view === "invites" && !!t.isOwner && (
              <LiveForm
                title={fa ? "ارسال دعوت ایمیلی" : "Send email invitation"}
                url="/api/team/invite"
                fields={[
                  field("email", "ایمیل همکار", "Colleague email", "email"),
                ]}
                onDone={r.reload}
                caution={
                  fa
                    ? "دعوت واقعی به این ایمیل ارسال می‌شود و ظرفیت موجود طبق قوانین پکیج بررسی می‌شود."
                    : "A real email invitation is sent. Available seats are checked under the plan rules."
                }
              />
            )}
            <LiveTable
              items={liveRows(view === "invites" ? t.invites : t.members)}
              columns={
                view === "invites"
                  ? [
                      field("email", "ایمیل", "Email"),
                      field("expiresAt", "پایان اعتبار", "Expires"),
                    ]
                  : [
                      field("name", "نام", "Name"),
                      field("email", "ایمیل", "Email"),
                      field("role", "نقش اشتراک", "Subscription role"),
                    ]
              }
              actions={(row) =>
                view === "invites" && t.isOwner ? (
                  <LiveForm
                    title={fa ? "لغو دعوت" : "Revoke invitation"}
                    url={
                      "/api/team/invite/" + encodeURIComponent(String(row.id))
                    }
                    method="DELETE"
                    onDone={r.reload}
                    caution={
                      fa
                        ? "این دعوت دیگر قابل پذیرش نیست."
                        : "This invitation can no longer be accepted."
                    }
                  />
                ) : null
              }
            />
          </>
        ))}
    </section>
  );
}
