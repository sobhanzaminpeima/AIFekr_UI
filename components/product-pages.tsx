"use client";
import Link, { useSite } from "@/components/site-link";
import { LiveFeaturePage, LiveSolutionPage } from "./live-public";
import { useApp } from "./providers";
import { modules } from "@/lib/upstream/registry";
import { Icon } from "./ui";
import { FAQ } from "./account";

const industries = [
  ["real-estate", "املاک", "Real estate", "crm", "accounting", "voice-agent"],
  ["clinics", "کلینیک و سلامت", "Clinics", "crm", "voice-agent", "social"],
  ["shops", "فروشگاه‌ها", "Shops", "leads", "social", "accounting"],
  ["agencies", "آژانس‌ها", "Agencies", "seo", "social", "website"],
  ["students", "دانشجویان", "Students", "student", "learn", "startup"],
  ["athletes", "ورزشکاران", "Athletes", "fitness", "marketplace"],
  [
    "creators",
    "تولیدکنندگان محتوا",
    "Creators",
    "image",
    "video",
    "voice",
    "factory",
  ],
];
export function ProductDirectory() {
  const { fa } = useApp();
  return (
    <section className="public-section public-module-links">
      <span className="eyebrow">AIFekr / WORKSPACES</span>
      <h2>
        {fa
          ? "هر بخش از مسیرت، یک فضای اختصاصی"
          : "A workspace for every part of your journey"}
      </h2>
      <div className="tool-grid">
        {modules
          .filter((m) => m.group !== "account")
          .map((m) => (
            <Link className="tool-card" href={"/features/" + m.id} key={m.id}>
              <span className={`icon-chip ${m.accent}`}>
                <Icon name={m.icon} />
              </span>
              <h3>{m.title[fa ? 0 : 1]}</h3>
              <p>{m.subtitle[fa ? 0 : 1]}</p>
              <span className="text-link">
                {fa ? "دیدن امکانات" : "Explore features"} ←
              </span>
            </Link>
          ))}
      </div>
    </section>
  );
}
export function ProductPage({ path }: { path: string }) {
  const { fa } = useApp();
  const live = useSite();
  const [, section, slug] = path.split("/");
  if (live && section === "features") return <LiveFeaturePage slug={slug} />;
  if (live && section === "solutions") return <LiveSolutionPage slug={slug} />;
  const module = modules.find(
    (m) => m.id === slug || m.base.split("/")[1] === slug,
  );
  const industry = industries.find((i) => i[0] === slug);
  const directory = !slug;
  const selected = module
    ? [module]
    : industry
      ? modules.filter((m) => industry.slice(3).includes(m.id))
      : modules.filter((m) => m.group === "business");
  const title = module
    ? module.title[fa ? 0 : 1]
    : industry
      ? industry[fa ? 1 : 2]
      : fa
        ? "راهکار متناسب با کسب‌وکار تو"
        : "Find the tools for your world";
  return (
    <div className="public-section">
      <section className="module-hero">
        <span className="eyebrow">
          AIFekr / {path.split("/")[1].toUpperCase()}
        </span>
        <h1>{title}</h1>
        <p>
          {module
            ? module.subtitle[fa ? 0 : 1]
            : fa
              ? "از اولین ایده تا مدیریت کار روزانه، ابزارهای موردنیازت را کنار هم داشته باش."
              : "From your first idea to everyday operations, bring the tools you need together."}
        </p>
        <Link
          className="btn primary"
          href={module?.base || "/organization/onboarding"}
        >
          {fa ? "ورود به فضای کار" : "Open workspace"}{" "}
          <Icon name="ArrowLeft" size={16} />
        </Link>
      </section>
      {directory ? (
        <div className="tool-grid">
          {industries.map((i) => (
            <Link href={"/industry/" + i[0]} key={i[0]} className="tool-card">
              <Icon name="Building2" size={30} />
              <h3>{i[fa ? 1 : 2]}</h3>
              <span className="text-link">
                {fa ? "دیدن راهکار" : "Explore solution"} ←
              </span>
            </Link>
          ))}
        </div>
      ) : (
        selected.map((m) => (
          <section key={m.id} className="public-module-links">
            <h2>{m.title[fa ? 0 : 1]}</h2>
            <p>{m.subtitle[fa ? 0 : 1]}</p>
            <div className="tool-grid">
              {m.views.map((v) => (
                <Link
                  key={v.id}
                  href={m.base + "?tab=" + v.id}
                  className="panel"
                >
                  <span className={`icon-chip ${m.accent}`}>
                    <Icon name={m.icon} />
                  </span>
                  <h3>{v.title[fa ? 0 : 1]}</h3>
                  <p>
                    {fa
                      ? "ورود به بخش و مدیریت اطلاعات"
                      : "Open this section and manage your work"}
                  </p>
                  <Icon name="ArrowUpLeft" size={16} />
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
      <FAQ />
    </div>
  );
}
