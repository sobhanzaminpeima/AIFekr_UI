"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Button, Icon, SectionTitle, SparkChart, ToolCard } from "./ui";
import { projects, tools } from "@/mocks/catalog";
import {BusinessDoctorEntry} from './module-directory';
import { useShell } from "./live-shell-context";
import { useLiveCredits } from "./live-shell-widgets";
import { FirstStep } from "./first-step";
import { PaymentRetryNotice } from "./payment-retry-notice";
import type { HomeTool } from "@/lib/live-app";

/** The account's own dashboard data on aifekr.com (main site /api/app/dashboard). */
type LiveDashboard = {
  firstName: string | null;
  recent: { id: string; type: "image" | "video" | "music"; prompt: string; url: string; createdAt: string }[];
  usage: { days: number[]; thisWeek: number; lastWeek: number };
  commissionPercent: number;
};
type LiveCourse = { id: string; title: string; percent: number | null };
const MEDIA_PAGE = { image: "/image/gallery", video: "/video/generate", music: "/music/generate" } as const;
const MEDIA_ICON = { image: "Image", video: "Clapperboard", music: "AudioLines" } as const;
/** The workspace chip that puts an onboarding goal's tools first (goal ids: main site lib/growth/modules.ts). */
const GOAL_CHIP: Record<string, string> = {
  media: "create", content: "create", youtube: "create",
  business: "business", crm: "business", sales: "business", real_estate: "business", seo: "business",
  education: "learn", fitness: "fit",
};
/** The design's icon and colour for each growth module (main site lib/growth/modules.ts ids). */
const MODULE_LOOK: Record<string, [icon: string, accent: string, group: (typeof tools)[number]["group"]]> = {
  "voice-studio": ["AudioLines", "purple", "create"], image: ["Image", "orange", "create"], video: ["Clapperboard", "blue", "create"],
  "video-factory": ["Film", "pink", "create"], music: ["Music", "amber", "create"], chat: ["MessagesSquare", "blue", "create"],
  crm: ["Users", "amber", "business"], seo: ["Search", "lime", "business"], social: ["Share2", "pink", "business"],
  "website-designer": ["Globe", "blue", "business"], student: ["GraduationCap", "blue", "learn"], fitness: ["Dumbbell", "lime", "fit"],
};
/** A suggested module in the design's tool card: its real page and its benefit instead of a bare name. */
const toolCard = (m: HomeTool) => {
  const [icon, accent, group] = MODULE_LOOK[m.id] ?? (["Sparkles", "orange", "create"] as const);
  return { slug: m.href.slice(1), fa: m.name, en: m.name, description: m.benefit, descriptionEn: m.benefit, icon, accent, cost: undefined as unknown as number, group };
};
/** Opens the frame's full module directory (components/shell.tsx). */
const openDirectory = () => window.dispatchEvent(new Event("aifekr:directory"));

function useLiveDashboard(enabled: boolean, student: boolean) {
  const [data, setData] = useState<LiveDashboard | null>(null);
  const [course, setCourse] = useState<LiveCourse | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/app/dashboard", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
    // The course in progress, from the same list the classic /learn page reads
    // (only accounts with the student workspace have one).
    if (student) fetch("/api/learn/courses?filter=progress").then((r) => (r.ok ? r.json() : null)).then((d) => {
      const c = d?.courses?.find((x: { progress: { state: string }[] }) => x.progress.some((p) => p.state === "IN_PROGRESS"));
      if (c) setCourse({ id: c.id, title: c.title, percent: c.progress[0]?.progressPercent ?? null });
    }).catch(() => {});
  }, [enabled, student]);
  return { data, course };
}

/** The usage line from real daily credit use, drawn in the design's own chart frame. */
export function UsageChart({ days }: { days: number[] }) {
  const max = Math.max(1, ...days);
  const points = days.map((v, i) => `${(i * 300) / (days.length - 1)} ${64 - (v / max) * 58}`);
  return (
    <svg className="spark-chart" viewBox="0 0 300 70" role="img" aria-label="Usage trend">
      <path d={"M" + points.join(" L")} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function Dashboard() {
  const app = useApp();
  const { fa, t, n, locale, tl } = app;
  const live = useShell();
  const liveCredits = useLiveCredits(live?.user.credits ?? 0);
  const credits = live ? liveCredits : app.credits;
  const { data, course } = useLiveDashboard(!!live, !!live?.user.studentWorkspaceEnabled);
  const greeting = live ? t("greeting").replace(/(سارا|Sara)$/, data?.firstName ?? live.user.name?.split(/\s+/)[0] ?? "").replace(/[،,]\s*$/, "") : t("greeting");
  const ago = (iso: string) => {
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
  };
  const trend = data && data.usage.lastWeek > 0 ? Math.round(((data.usage.thisWeek - data.usage.lastWeek) / data.usage.lastWeek) * 100) : null;
  const [prompt, setPrompt] = useState("");
  const personal = live?.personal;
  const goalChip = GOAL_CHIP[personal?.goals[0] ?? ""] ?? "all";
  const [workspace, setWorkspace] = useState(goalChip);
  // The goal's own workspace shows the suggested tools; any other chip shows that group's tools.
  const suggested = !!personal?.tools.length && workspace === goalChip;
  const primary = personal?.primary;
  // Continue working: real creations, conversations and recently opened tools, latest first.
  const continueItems = live ? [
    ...(data?.recent ?? []).map((p) => ({ kind: "media" as const, at: p.createdAt, p })),
    ...live.conversations.slice(0, 3).map((c) => ({ kind: "chat" as const, at: c.updatedAt, c })),
    ...(personal?.recentModules ?? []).map((m) => ({ kind: "module" as const, at: m.at, m })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3) : [];
  const isNew = !!live && !!data && !data.recent.length && !live.conversations.length && data.usage.days.every((d) => d === 0) && !(personal?.recentModules ?? []).length;
  const [invite, setInvite] = useState(!!personal?.invite);
  function dismissInvite() {
    setInvite(false);
    fetch("/api/growth/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss_invite" }) }).catch(() => {});
  }
  const router = useRouter();
  const suggestions = [
    tl("یک تصویر خلاقانه بساز", "Create a beautiful image"),
    tl("برای کسب‌وکارم ایده بده", "Grow my business"),
    tl("یک چیز تازه یاد بگیر", "Learn something new"),
  ];
  function routePrompt(value: string) {
    // Chat is a page of the main site, so it loads in full.
    if (live) return location.assign((/تصویر|image/i.test(value) ? "/chat?mode=image&prompt=" : "/chat?prompt=") + encodeURIComponent(value));
    router.push(
      (/تصویر|image/.test(value) ? "/create/image" : "/chat") +
        "?prompt=" +
        encodeURIComponent(value),
    );
  }
  const order =
    workspace === "all" || workspace === "create"
      ? tools
      : [
          ...tools.filter((v) => v.group === workspace),
          ...tools.filter((v) => v.group !== workspace),
        ];
  return (
    <div className="dashboard">
      <div className="greeting-row">
        <div>
          <span className="eyebrow">
            <i className="tiny-dot" />
            {new Intl.DateTimeFormat(
              locale === "fa" ? "fa-IR-u-ca-persian" : locale,
              { weekday: "long", day: "numeric", month: "long" },
            ).format(live ? new Date() : new Date("2026-10-29T12:00:00Z"))}
          </span>
          <h1>
            {greeting} <span className="wave">✺</span>
          </h1>
          <p>{t("subtitle")}</p>
        </div>
        <Link href="/gallery" className="btn ghost">
          <Icon name="FolderOpen" size={17} />
          {t("projects")}
          <Icon name="ChevronLeft" size={15} className="directional" />
        </Link>
      </div>
      {live && <PaymentRetryNotice />}
      <FirstStep isNew={isNew} credits={credits} />
      {invite && personal && (
        <div className="plan-notice" role="status">
          <Icon name="SlidersHorizontal" size={18} />
          <div>
            <strong>{personal.copy.invite.title}</strong>
            <p>{personal.copy.invite.body}</p>
            <div className="domain-actions">
              <a className="btn primary" href="/welcome">{personal.copy.invite.start}</a>
              <button className="btn" onClick={dismissInvite}>{personal.copy.invite.dismiss}</button>
            </div>
          </div>
        </div>
      )}
      <BusinessDoctorEntry/>
      <section className="idea-hero">
        <div className="hero-orb" aria-hidden="true">
          <span />
          <i />
          <b>✦</b>
        </div>
        <div className="idea-content">
          <div className="eyebrow orange-text">
            <Icon name="Sparkles" size={15} />
            {primary ? `${personal!.copy.nextStep} · ${primary.name}` : tl("اینجا، هر ایده‌ای ممکن می‌شود", "YOUR NEXT BIG IDEA STARTS HERE")}
          </div>
          <h2>{primary ? primary.title : t("question")}</h2>
          <p>
            {primary ? primary.benefit : tl("از اولین جرقه تا آخرین جزئیات، ای آی فکر کنار توست.", "From your first spark to the finishing touch, we’re with you.")}
          </p>
          {primary && (
            <a className="btn primary hero-action" href={primary.href}>
              {primary.cta}
              <Icon name="ArrowLeft" size={16} className="directional" />
            </a>
          )}
          <form
            className="home-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) routePrompt(prompt);
            }}
          >
            <Icon name="Sparkles" size={22} />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-label={t("prompt")}
              placeholder={t("placeholder")}
            />
            <button className="send-btn" aria-label={t("send")}>
              <Icon name="ArrowUp" size={20} />
            </button>
          </form>
          <div className="suggestion-row">
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => routePrompt(s)}>
                <Icon name={["Image", "Lightbulb", "BookOpen"][i]} size={13} />
                {s}
                <Icon name="ArrowUpLeft" size={12} className="directional" />
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="workspace-bar">
        <div className="chips">
          {[
            ["all", t("all"), "LayoutGrid"],
            ["create", t("creator"), "Sparkles"],
            ["business", t("business"), "BriefcaseBusiness"],
            ["learn", t("student"), "GraduationCap"],
            ["fit", "FIT", "Dumbbell"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              className={workspace === id ? "selected" : ""}
              onClick={() => setWorkspace(id)}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>
        {personal ? (
          <a className="text-link" href="/welcome">
            <Icon name="SlidersHorizontal" size={14} />
            {personal.copy.personalize}
          </a>
        ) : (
          <span className="muted">
            {tl("فضایی برای تمام ایده‌هایت", "A space for every side of you")}
          </span>
        )}
      </div>
      <SectionTitle
        title={suggested ? personal!.copy.recommended : tl("با یک جرقه شروع کن", "Start with a spark")}
        subtitle={
          suggested ? personal!.copy.recommendedHint : tl("ابزار درست، برای ایدهٔ بعدی تو", "The right tool for your next idea")
        }
      >
        {personal ? (
          <button className="text-link" onClick={openDirectory}>
            {personal.copy.allTools}
            <Icon name="ArrowLeft" size={15} className="directional" />
          </button>
        ) : (
        <Link href="/create" className="text-link">
          {t("viewAll")}
          <Icon name="ArrowLeft" size={15} className="directional" />
        </Link>
        )}
      </SectionTitle>
      <div className="quick-tools">
        {suggested ? personal!.tools.map((m) => <ToolCard key={m.id} tool={toolCard(m)} />) : order.slice(0, 4).map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
      {live?.proTools && live.proTools.length > 0 && (
        <>
          <SectionTitle
            title={tl("ابزارهای حرفه‌ای", "Pro tools")}
            subtitle={tl("کارهای بزرگ‌تر، با دستیارهای تخصصی", "Bigger work, with specialist assistants")}
          />
          <div className="pro-cards">
            {[...live.proTools]
              .sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(b.unlocked) - Number(a.unlocked) || Number(!!b.highlight) - Number(!!a.highlight))
              .slice(0, 4)
              .map((tool) => (
                <Link key={tool.key} href={tool.unlocked ? tool.href : "/plans"} className={"pro-card" + (tool.unlocked ? "" : " locked")}>
                  <span className="pro-card-icon" aria-hidden="true"><Icon name={tool.icon} size={24} /></span>
                  <strong>{tool.label}</strong>
                  {tool.recommended && <span className="pro-tag suggest">{tl("پیشنهاد برای تو", "Picked for you")}</span>}
                  {!tool.recommended && tool.highlight === "popular" && <span className="pro-tag hot">{tl("محبوب", "Popular")}</span>}
                  <small>{tool.unlocked ? tl("باز کن و شروع کن", "Open and start") : tool.requiredPlan === "BUSINESS" ? tl("با پکیج بیزنس باز می‌شود", "Opens with a Business package") : tl("با پکیج حرفه‌ای باز می‌شود", "Opens with a Pro package")}</small>
                </Link>
              ))}
          </div>
        </>
      )}
      <div className="dashboard-bento">
        <section className="panel continue-card">
          <SectionTitle
            title={tl("از همان‌جا ادامه بده", "Pick up where you left off")}
          >
            <Link href="/gallery" className="text-link">
              {t("viewAll")}
              <Icon name="ArrowLeft" size={14} />
            </Link>
          </SectionTitle>
          <div className="project-grid">
            {live ? (continueItems.length ? continueItems.map((item) => item.kind === "chat" ? (
              <a key={"c" + item.c.id} href={"/chat/" + item.c.id} className="project-card">
                <div className="project-art">
                  <span className="project-icon"><Icon name="MessagesSquare" size={30} /></span>
                  <span className="media-type"><Icon name="MessagesSquare" size={13} />{personal?.copy.chat ?? "Chat"}</span>
                </div>
                <strong>{item.c.title || personal?.copy.chat || "Chat"}</strong>
                <small>{ago(item.at)}<Icon name="ArrowUpLeft" size={14} /></small>
              </a>
            ) : item.kind === "module" ? (
              <a key={"m" + item.m.id} href={item.m.href} className="project-card">
                <div className="project-art">
                  <span className="project-icon"><Icon name={MODULE_LOOK[item.m.id]?.[0] ?? "Sparkles"} size={30} /></span>
                  <span className="media-type"><Icon name="History" size={13} />{personal!.copy.opened}</span>
                </div>
                <strong>{item.m.name}</strong>
                <small>{ago(item.at)}<Icon name="ArrowUpLeft" size={14} /></small>
              </a>
            ) : ((p) => (
              <Link key={p.id} href={MEDIA_PAGE[p.type]} className="project-card">
                <div className="project-art">
                  {p.type === "image" ? <img src={p.url} alt={p.prompt} /> : <img src={p.type === "video" ? "/art/waves.svg" : "/art/voice.svg"} alt="" />}
                  <span className="media-type">
                    <Icon name={MEDIA_ICON[p.type]} size={13} />
                    {t(p.type)}
                  </span>
                  {p.type === "video" && (
                    <span className="play-icon">
                      <Icon name="Play" size={18} />
                    </span>
                  )}
                </div>
                <strong>{p.prompt}</strong>
                <small>
                  {ago(p.createdAt)}
                  <Icon name="ArrowUpLeft" size={14} />
                </small>
              </Link>
            ))(item.p)) : data ? <p className="muted">{t("emptyBody")}</p> : null) : projects.map((p, i) => (
              <Link
                key={p.id}
                href={"/create/" + p.type + "?project=" + p.id}
                className="project-card"
              >
                <div className="project-art">
                  <img
                    src={
                      ["/art/orbit.svg", "/art/waves.svg", "/art/voice.svg"][i]
                    }
                    alt={tl(p.fa, p.en)}
                  />
                  <span className="media-type">
                    <Icon
                      name={["Image", "Clapperboard", "AudioLines"][i]}
                      size={13}
                    />
                    {t(p.type as "image" | "video" | "voice")}
                  </span>
                  {i === 1 && (
                    <span className="play-icon">
                      <Icon name="Play" size={18} />
                    </span>
                  )}
                </div>
                <strong>{tl(p.fa, p.en)}</strong>
                <small>
                  {tl("آخرین ویرایش: دیروز", "Edited yesterday")}
                  <Icon name="ArrowUpLeft" size={14} />
                </small>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel credit-summary">
          <div className="row-between">
            <span className="icon-chip orange">
              <Icon name="Wallet" />
            </span>
            <Link href="/credits" className="text-link" aria-label={t("topup")}>
              <Icon name="ArrowUpLeft" size={18} />
            </Link>
          </div>
          <p>{t("balance")}</p>
          <strong>
            {n(credits)} <span>{t("credits")}</span>
          </strong>
          {live ? <UsageChart days={data?.usage.days ?? [0, 0, 0, 0, 0, 0, 0]} /> : <SparkChart />}
          <div className="row-between">
            <span className="muted">
              {tl("مصرف این هفته", "Used this week")}
            </span>
            {live ? (
              <span>
                {n(data?.usage.thisWeek ?? 0)} {trend !== null && <small className={trend > 0 ? "orange-text" : "green"}>{trend > 0 ? "↗" : "↘"} {n(Math.abs(trend))}٪</small>}
              </span>
            ) : (
            <span>
              {n(186)} <small className="green">↘ {n(12)}٪</small>
            </span>
            )}
          </div>
          <Link href="/credits" className="btn full">
            {t("topup")}
            <Icon name="Plus" size={16} />
          </Link>
        </section>
      </div>
      <div className="bottom-bento">
        <Link href={live ? (course ? "/learn?course=" + course.id : "/learn") : "/learn/courses/ai-basics"} className="panel learning-card">
          <span className="icon-chip blue">
            <Icon name="GraduationCap" size={26} />
          </span>
          <div>
            <span className="eyebrow blue-text">
              {tl("هر روز، یک قدم جلوتر", "A LITTLE BETTER, EVERY DAY")}
            </span>
            <h3>{tl("آینده را یاد بگیر", "Learn your way forward")}</h3>
            <p>
              {live
                ? course
                  ? fa ? `مسیر «${course.title}» را ادامه بده.` : `Continue your ${course.title} course.`
                  : tl("دوره‌های آکادمی را ببین و یادگیری را شروع کن.", "Browse the academy courses and start learning.")
                : tl("مسیر «مقدمات هوش مصنوعی» را ادامه بده.", "Continue your Introduction to AI course.")}
            </p>
            {(!live || course?.percent != null) && (
            <div className="course-progress">
              <span className="meter">
                <i style={{ width: (live ? course!.percent! : 35) + "%" }} />
              </span>
              <small>{n(live ? course!.percent! : 35)}٪</small>
            </div>
            )}
          </div>
          <Icon name="ArrowUpLeft" className="directional" />
        </Link>
        <Link href="/referral" className="panel invite-card">
          <div className="gift-art">
            <Icon name="Gift" size={42} />
            <span>✦</span>
          </div>
          <div>
            <span className="eyebrow orange-text">
              {tl("فکر خوب، با هم بهتر می‌شود", "GOOD IDEAS ARE BETTER TOGETHER")}
            </span>
            <h3>
              {tl("دوستت را دعوت کن، اعتبار بگیر", "Share a spark. Earn credits.")}
            </h3>
            <p>
              {live
                ? fa
                  ? `از هر خرید دوستانی که دعوت می‌کنی، ${n(data?.commissionPercent ?? 0)}٪ پورسانت به کیف پولت اضافه می‌شود.`
                  : `Earn a ${data?.commissionPercent ?? 0}% commission on every purchase your invited friends make.`
                : tl("برای هر دعوت موفق، ۱۰۰ اعتبار هدیه بگیر.", "Earn 100 credits for every successful invitation.")}
            </p>
          </div>
          <Icon name="ArrowUpLeft" className="directional" />
        </Link>
      </div>
      <div className="daily-tip">
        <Icon name="Lightbulb" size={16} />
        <span>
          {tl("فکر روز: به جای «یک متن بنویس»، بگو برای چه کسی و با چه هدفی می‌نویسی.", "A little tip: tell your assistant who you’re writing for and what you want to achieve.")}
        </span>
        <Link href="/guides/getting-started">
          {tl("بیشتر بدان", "Learn more")}
          <Icon name="ArrowLeft" size={13} />
        </Link>
      </div>
    </div>
  );
}
