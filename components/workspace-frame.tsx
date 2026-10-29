"use client";
import Link from "@/components/site-link";
import { ModuleSpec, ViewSpec, moduleViewHref } from "@/lib/upstream/registry";
import { examplePath } from "@/lib/upstream/coverage";
import { useApp } from "./providers";
import { Icon } from "./ui";

const groupCopy = {
  admin: [
    "مرکز مدیریت",
    "Administration",
    "کنترل و تنظیمات",
    "Control & configuration",
  ],
  business: [
    "فضای کسب‌وکار",
    "Business workspace",
    "عملیات و رشد",
    "Operations & growth",
  ],
  create: [
    "استودیوی خلاقیت",
    "Creative studio",
    "از ایده تا خروجی",
    "From idea to output",
  ],
  learn: [
    "فضای یادگیری",
    "Learning workspace",
    "تمرین، یادگیری، پیشرفت",
    "Practice, learn, progress",
  ],
  fit: [
    "فضای ورزش",
    "Fitness workspace",
    "برنامه و فعالیت روزانه",
    "Your daily activity",
  ],
  account: [
    "حساب شخصی",
    "Personal account",
    "اطلاعات و سوابق من",
    "Your details & history",
  ],
  public: ["ای آی فکر", "AIFekr", "امکانات و راهکارها", "Features & solutions"],
};
export function WorkspaceFrame({
  module,
  view,
  children,
}: {
  module: ModuleSpec;
  view: ViewSpec;
  children: React.ReactNode;
}) {
  const { fa, n } = useApp();
  const copy = groupCopy[module.group];
  const sections = module.views.filter((v) => v.id !== view.id);
  return (
    <div className={`workspace-frame workspace-${module.group}`}>
      <header className="workspace-banner">
        <div className="workspace-banner-copy">
          <span className="eyebrow">AIFekr / {module.group.toUpperCase()}</span>
          <div className="workspace-breadcrumb">
            <span>{copy[fa ? 0 : 1]}</span>
            <span>/</span>
            <strong>{module.title[fa ? 0 : 1]}</strong>
          </div>
          <h1>{view.title[fa ? 0 : 1]}</h1>
          <p>{view.description?.[fa ? 0 : 1] || module.subtitle[fa ? 0 : 1]}</p>
        </div>
        <div className="workspace-banner-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <Icon name={module.icon} size={58} />
        </div>
      </header>
      <div className="workspace-context">
        <span>
          <i />
          {copy[fa ? 2 : 3]}
        </span>
        <span>
          {n(module.views.length)}{" "}
          {fa ? "بخش در این فضا" : "sections in this workspace"}
        </span>
      </div>
      <div className="workspace-body">{children}</div>
      {!!sections.length && (
        <section className="workspace-next">
          <div>
            <span className="eyebrow">
              {fa ? "ادامه مسیر" : "CONTINUE YOUR WORK"}
            </span>
            <h2>{fa ? "بخش‌های مرتبط این فضا" : "More in this workspace"}</h2>
          </div>
          <div className="workspace-related">
            {sections.slice(0, 4).map((v) => (
              <Link key={v.id} href={examplePath(moduleViewHref(module, v))}>
                <span className={`icon-chip ${module.accent}`}>
                  <Icon
                    name={
                      v.kind === "report"
                        ? "ChartNoAxesCombined"
                        : v.kind === "calendar"
                          ? "CalendarDays"
                          : v.kind === "form"
                            ? "SlidersHorizontal"
                            : v.kind === "gallery"
                              ? "LayoutGrid"
                              : module.icon
                    }
                    size={19}
                  />
                </span>
                <strong>{v.title[fa ? 0 : 1]}</strong>
                <Icon name="ArrowUpLeft" size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
