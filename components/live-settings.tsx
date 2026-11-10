"use client";
import { useState } from "react";
import { useApp } from "./providers";
import { Preferences } from "./shell";
import { SectionTitle, Button, Icon } from "./ui";
import Link from "./site-link";
import {
  LiveForm,
  LiveLoad,
  useLiveData,
  field,
  type LiveRow,
} from "./live-module-kit";
import { LiveUpload } from "./live-upload";

/** Account fields are loaded from the authenticated API, never prototype data. */
export function LiveSettings() {
  const { fa, locale } = useApp();
  const state = useLiveData("/api/user/profile");
  const [tab, setTab] = useState("profile"),
    [saved, setSaved] = useState(false);
  const user = state.data?.user as LiveRow | undefined;
  const done = () => {
    setSaved(true);
    state.reload();
  };
  return (
    <div className="account-center settings-center">
      <SectionTitle title={fa ? "حساب و پروفایل من" : "My account & profile"} subtitle={fa?"اطلاعات، امنیت و فضای شخصی‌تان را از اینجا مدیریت کنید.":"Manage your personal details, security and workspace preferences."} />
      <div className="settings-account-banner panel"><span className="avatar">{String(user?.name||"A").slice(0,1)}</span><div><strong>{String(user?.name|| (fa?"حساب شما":"Your account"))}</strong><p>{String(user?.email||"")}</p></div><Link className="btn" href="/plans">{fa?"مدیریت پکیج":"Manage package"}<Icon name="ArrowUpLeft" size={16}/></Link></div>
      <nav
        className="module-tabs settings-tabs"
        aria-label={fa ? "تنظیمات حساب" : "Account settings"}
      >
        {[
          ["profile", "اطلاعات شخصی", "Personal details"],
          ["security", "امنیت", "Security"],
          ["appearance", "زبان و ظاهر", "Language & appearance"],
          ["connections", "حساب‌های متصل", "Connections"],
        ].map(([id, a, b]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() => {
              setTab(id);
              setSaved(false);
            }}
          >
            {fa ? a : b}
          </button>
        ))}
      </nav>
      <LiveLoad {...state} />
      {saved && (
        <p role="status" className="inline-banner">
          {fa
            ? "تغییرات ذخیره شد. برای به‌روزرسانی نام در منو، صفحه را تازه کنید."
            : "Changes saved. Refresh to update your name in the menu."}
        </p>
      )}
      {user && tab === "profile" && (
        <div className="settings-layout">
          <section className="panel">
            <h2>{fa ? "عکس حساب" : "Account photo"}</h2>
            {typeof user.avatar === "string" && user.avatar && (
              <img
                className="account-avatar-preview"
                src={user.avatar}
                alt={fa ? "عکس پروفایل" : "Profile photo"}
              />
            )}
            <LiveUpload
              url="/api/user/avatar"
              title={fa ? "ذخیره عکس" : "Save photo"}
              accept="image/jpeg,image/png,image/webp"
              maxBytes={5 * 1024 * 1024}
              onDone={done}
            />
            <p>{String(user.email ?? "")}</p>
            <p className="muted">
              {fa
                ? "ایمیل و روش ورود از اطلاعات تأییدشدهٔ حساب خوانده می‌شوند."
                : "Email and sign-in method come from your verified account."}
            </p>
            <p>
              {String(user.plan ?? "")} · {user.planExpiry ? new Date(String(user.planExpiry)).toLocaleDateString(locale) : "—"}
            </p>
          </section>
          <section className="panel">
            <LiveForm
              key={
                String(user.name) + String(user.country) + String(user.currency)
              }
              title={fa ? "ویرایش اطلاعات شخصی" : "Edit personal details"}
              url="/api/user/profile"
              method="PATCH"
              initial={{
                firstName: user.firstName ?? "",
                lastName: user.lastName ?? "",
                country: user.country ?? "",
                currency: user.currency ?? "",
              }}
              fields={[
                field("firstName", "نام", "First name", "text", true),
                field("lastName", "نام خانوادگی", "Last name", "text", true),
                field(
                  "country",
                  "کد کشور (مثل CY یا TR)",
                  "Country code (e.g. CY or TR)",
                  "text",
                  true,
                ),
                {
                  ...field(
                    "currency",
                    "ارز ترجیحی",
                    "Preferred currency",
                    "text",
                    true,
                  ),
                  choices: [
                    { value: "", label: fa ? "طبق زبان" : "Follow language" },
                    ...["IRT", "TRY", "USD", "EUR"].map((value) => ({
                      value,
                      label: value === "IRT" ? (fa ? "تومان" : "Toman") : value,
                    })),
                  ],
                },
              ]}
              onDone={done}
            />
            <div className="domain-actions">
              <Link className="btn" href="/student?view=profile">
                {fa ? "پروفایل تحصیلی" : "Student profile"}
              </Link>
              <Link className="btn" href="/fitness?tab=profile">
                {fa ? "پروفایل ورزشی" : "Fitness profile"}
              </Link>
            </div>
          </section>
        </div>
      )}
      {user && tab === "security" && (
        <section className="panel">
          <LiveForm
            title={fa ? "تغییر رمز عبور" : "Change password"}
            url="/api/user/password"
            fields={[
              field(
                "currentPassword",
                "رمز فعلی (اگر قبلاً رمز داشته‌اید)",
                "Current password (if already set)",
                "password",
                true,
              ),
              field(
                "newPassword",
                "رمز جدید (حداقل ۶ کاراکتر)",
                "New password (at least 6 characters)",
                "password",
              ),
            ]}
            caution={
              fa
                ? "رمز فقط پس از تأیید سرور تغییر می‌کند."
                : "Your password changes only after server confirmation."
            }
            onDone={done}
          />
        </section>
      )}
      {tab === "appearance" && (
        <section className="panel">
          <h2>{fa ? "زبان و ظاهر" : "Language & appearance"}</h2>
          <Preferences />
        </section>
      )}
      {tab === "connections" && (
        <section className="panel">
          <h2>{fa ? "مدیریت اتصال‌ها" : "Manage connections"}</h2>
          <p className="muted">
            {fa
              ? "هر اتصال را در فضای کاری مربوط به آن بررسی و مدیریت کنید."
              : "Review and manage each connection in its workspace."}
          </p>
          <div className="domain-actions">
            <Link className="btn" href="/social?tab=accounts">
              Instagram
            </Link>
            <Link className="btn" href="/seo?tab=wordpress">
              Google / WordPress
            </Link>
          </div>
        </section>
      )}
      <Button onClick={() => window.location.reload()}>
        {fa ? "تازه‌سازی حساب" : "Refresh account"}
      </Button>
    </div>
  );
}
