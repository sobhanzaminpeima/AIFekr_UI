"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Button, Icon, SectionTitle, SparkChart, ToolCard } from "./ui";
import { projects, tools } from "@/mocks/catalog";
import {BusinessDoctorEntry} from './module-directory';
export function Dashboard() {
  const { fa, t, n, credits, locale } = useApp();
  const [prompt, setPrompt] = useState("");
  const [workspace, setWorkspace] = useState("all");
  const router = useRouter();
  const suggestions = fa
    ? [
        "یک تصویر خلاقانه بساز",
        "برای کسب‌وکارم ایده بده",
        "یک چیز تازه یاد بگیر",
      ]
    : ["Create a beautiful image", "Grow my business", "Learn something new"];
  function routePrompt(value: string) {
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
            ).format(new Date("2026-10-29T12:00:00Z"))}
          </span>
          <h1>
            {t("greeting")} <span className="wave">✺</span>
          </h1>
          <p>{t("subtitle")}</p>
        </div>
        <Link href="/gallery" className="btn ghost">
          <Icon name="FolderOpen" size={17} />
          {t("projects")}
          <Icon name="ChevronLeft" size={15} className="directional" />
        </Link>
      </div>
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
            {fa
              ? "اینجا، هر ایده‌ای ممکن می‌شود"
              : "YOUR NEXT BIG IDEA STARTS HERE"}
          </div>
          <h2>{t("question")}</h2>
          <p>
            {fa
              ? "از اولین جرقه تا آخرین جزئیات، ای آی فکر کنار توست."
              : "From your first spark to the finishing touch, we’re with you."}
          </p>
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
        <span className="muted">
          {fa ? "فضایی برای تمام ایده‌هایت" : "A space for every side of you"}
        </span>
      </div>
      <SectionTitle
        title={fa ? "با یک جرقه شروع کن" : "Start with a spark"}
        subtitle={
          fa
            ? "ابزار درست، برای ایدهٔ بعدی تو"
            : "The right tool for your next idea"
        }
      >
        <Link href="/create" className="text-link">
          {t("viewAll")}
          <Icon name="ArrowLeft" size={15} className="directional" />
        </Link>
      </SectionTitle>
      <div className="quick-tools">
        {order.slice(0, 4).map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
      <div className="dashboard-bento">
        <section className="panel continue-card">
          <SectionTitle
            title={fa ? "از همان‌جا ادامه بده" : "Pick up where you left off"}
          >
            <Link href="/gallery" className="text-link">
              {t("viewAll")}
              <Icon name="ArrowLeft" size={14} />
            </Link>
          </SectionTitle>
          <div className="project-grid">
            {projects.map((p, i) => (
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
                    alt={fa ? p.fa : p.en}
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
                <strong>{fa ? p.fa : p.en}</strong>
                <small>
                  {fa ? "آخرین ویرایش: دیروز" : "Edited yesterday"}
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
          <SparkChart />
          <div className="row-between">
            <span className="muted">
              {fa ? "مصرف این هفته" : "Used this week"}
            </span>
            <span>
              {n(186)} <small className="green">↘ {n(12)}٪</small>
            </span>
          </div>
          <Link href="/credits" className="btn full">
            {t("topup")}
            <Icon name="Plus" size={16} />
          </Link>
        </section>
      </div>
      <div className="bottom-bento">
        <Link href="/learn/courses/ai-basics" className="panel learning-card">
          <span className="icon-chip blue">
            <Icon name="GraduationCap" size={26} />
          </span>
          <div>
            <span className="eyebrow blue-text">
              {fa ? "هر روز، یک قدم جلوتر" : "A LITTLE BETTER, EVERY DAY"}
            </span>
            <h3>{fa ? "آینده را یاد بگیر" : "Learn your way forward"}</h3>
            <p>
              {fa
                ? "مسیر «مقدمات هوش مصنوعی» را ادامه بده."
                : "Continue your Introduction to AI course."}
            </p>
            <div className="course-progress">
              <span className="meter">
                <i style={{ width: "35%" }} />
              </span>
              <small>{n(35)}٪</small>
            </div>
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
              {fa
                ? "فکر خوب، با هم بهتر می‌شود"
                : "GOOD IDEAS ARE BETTER TOGETHER"}
            </span>
            <h3>
              {fa
                ? "دوستت را دعوت کن، اعتبار بگیر"
                : "Share a spark. Earn credits."}
            </h3>
            <p>
              {fa
                ? "برای هر دعوت موفق، ۱۰۰ اعتبار هدیه بگیر."
                : "Earn 100 credits for every successful invitation."}
            </p>
          </div>
          <Icon name="ArrowUpLeft" className="directional" />
        </Link>
      </div>
      <div className="daily-tip">
        <Icon name="Lightbulb" size={16} />
        <span>
          {fa
            ? "فکر روز: به جای «یک متن بنویس»، بگو برای چه کسی و با چه هدفی می‌نویسی."
            : "A little tip: tell your assistant who you’re writing for and what you want to achieve."}
        </span>
        <Link href="/guides/getting-started">
          {fa ? "بیشتر بدان" : "Learn more"}
          <Icon name="ArrowLeft" size={13} />
        </Link>
      </div>
    </div>
  );
}
