"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link, { useSite } from "@/components/site-link";
import { EditorialPage } from "./editorial-pages";
import { useApp } from "./providers";
import { Shell, PublicShell, Preferences } from "./shell";
import { Dashboard } from "./dashboard";
import { Chat } from "./chat";
import { Studio } from "./studio";
import { Hub, Admin, BusinessTool, FitDashboard, Calendar } from "./workspaces";
import {
  Credits,
  Checkout,
  Notifications,
  Plans,
  Referral,
  Settings,
} from "./account";
import { Landing, Auth, Onboarding, PublicPage } from "./public";
import { Learning, Workout } from "./learning";
import { allRoutes, publicPages, tools } from "@/mocks/catalog";
import {
  Button,
  Empty,
  ErrorState,
  Icon,
  Modal,
  RouteName,
  SectionTitle,
  Skeleton,
  download,
} from "./ui";
import { DataTable } from "./data-table";
import { Factory } from "./factory";
import { BusinessDetail, BusinessNavigation } from "./business-detail";
import { businessPages } from "@/mocks/business-pages";
import { toast } from "sonner";
import { ModuleWorkspace } from "./module-workspace";
import { findModule } from "@/lib/upstream/registry";
import { sourcePage } from "@/lib/upstream/coverage";
import { SourcePage } from "./source-page";
import { ProductDirectory } from "./product-pages";
import { PaymentHistory } from "./billing-admin";
import { PublicLeadForm } from "./leads-workspace";
import { AdminUserDetail } from "./admin-user-detail";
import { AdminUsers } from "./admin-users";
import { LiveCheckout } from "./live-checkout";
import { LiveContentPage } from "./live-content-page";
import { LiveIndustries, LiveIndustry } from "./live-industry";
import { LiveFit } from "./live-fit";
import { LiveWelcomeSetup } from "./live-welcome-setup";
import { LiveAdminUserDetail } from "./live-admin-user-detail";
import { AdminCenter } from "./admin-center";
import { LiveExplore } from "./live-explore";
import { Live1980s } from "./live-1980s";
import { LiveLeadForm, LiveProperty, LiveSharedResult } from "./live-links";
import { LiveOwnerStatement, LiveStudentCard } from "./live-links-2";
import { LiveCertificate, LiveOwnerLogin, LiveStartupContact } from "./live-forms";
import { LiveTool, LiveTryFree } from "./live-tool";
import { EmptyStateContext } from "./ui";
import { LiveLogin, LiveRegister } from "./live-auth";
import { useShell } from "./live-shell-context";
import { LivePayments } from "./live-payments";
import { LiveTalk } from "./live-talk";
import { LiveCompletePhone } from "./live-complete-phone";
import { LivePlans } from "./live-plans";
import {LiveCredits} from "./live-credits";
import {LiveWallet,LiveNotifications} from "./live-account-center";
import { LiveSettings } from "./live-settings";
import { LiveOwner } from "./live-owner";
import { LiveGallery } from "./live-create";
export function Platform({ path }: { path: string }) {
  if (useSite()) return <LivePlatform path={path} />;
  return (
    <Suspense fallback={<Skeleton />}>
      <PlatformContent path={path} />
    </Suspense>
  );
}
/**
 * aifekr.com pages served by this app (lib/live.ts V2_READY). The server
 * already answered 404 for anything else, so no prototype screen is reachable.
 */
function LivePlatform({ path }: { path: string }) {
  const { fa, tl } = useApp();
  if(path === "/owner") return <LiveOwner/>;
  // Signed-in pages bring their own frame (sidebar, banners, skip link).
  // Signed-in pages: the design's own frame and screens, with real data.
  if (useShell()) return (
    <>
      <a className="skip-link" href="#main">{tl("رفتن به محتوا", "Skip to content")}</a>
      <Shell path={path}>{
        path === "/credits" ? <LiveCredits/> : path === "/wallet" ? <LiveWallet/> : path === "/notifications" ? <LiveNotifications/> : path === "/settings" ? <LiveSettings />
        : path === "/home" ? <Dashboard />
        // Onboarding inside the signed-in frame: every page stays one click away.
        : path === "/welcome" ? <Onboarding />
        : path === "/welcome/setup" ? <LiveWelcomeSetup />
        // Required mobile number before anything else (main site lib/auth/phoneRequirement).
        : path === "/complete-phone" ? <LiveCompletePhone />
        : path === "/payments" || path === "/fitness/payments" ? <LivePayments />
        : path === "/fitness/credits" ? <LiveCredits fitness />
        : path === "/startup/contact" ? <LiveStartupContact />
        // Admin pages (the main site forwards them for admins only).
        : path === "/admin" || path === "/admin/dashboard" ? <AdminCenter />
        : path === "/admin/users" ? <AdminUsers />
        : /^\/admin\/users\/[^/]+$/.test(path) ? <LiveAdminUserDetail key={path} id={decodeURIComponent(path.split("/")[3])} />
        : path === "/tools/try-free-ai" ? <LiveTryFree />
        : path.startsWith("/tools/") ? <LiveTool slug={path.split("/")[2]} />
        : path === "/live" ? <LiveTalk />
        : path === "/plans" ? <LivePlans />
        : /^\/(fitness\/)?checkout\/[^/]+$/.test(path) ? <LiveCheckout id={decodeURIComponent(path.split("/").pop()!)} />
        : path === "/chat" || path.startsWith("/chat/") ? <Chat />
        : path.startsWith("/assistants/") ? <AssistantChat />
        : path === "/create" ? <Hub group="create" />
        : path === "/gallery" ? <LiveGallery />
        : path === "/image/gallery" ? <ModuleWorkspace module={findModule("/image/generate")!} path="/image/generate/gallery" />
        : path === "/image/generate" || path === "/video/generate" || path === "/music/generate" || path === "/voice-studio" || path === "/video-factory" || path === "/crm" || ["/social", "/lead-gen", "/business-doctor", "/meeting", "/website-designer", "/referral", "/startup/builder", "/seo", "/seo/intelligence", "/seo/sites", "/seo/agent-pipeline", "/ceo", "/agents", "/organization/onboarding", "/voice-agent", "/learn", "/student", "/fitness", "/fitness/marketplace", "/play"].includes(path) || path === "/accounting" || path.startsWith("/accounting/") ? <ModuleWorkspace key={path} module={findModule(path)!} path={path} />
        : null
      }</Shell>
    </>
  );
  // Links opened by people outside the platform, some inside an iframe: no site frame around them.
  if (path === "/share/1980s") return <Live1980s />;
  if (path.startsWith("/share/")) return <LiveSharedResult />;
  if (path.startsWith("/o/")) return <LiveOwnerStatement token={decodeURIComponent(path.split("/")[2])} />;
  if (/^\/student\/[^/]+$/.test(path)) return <LiveStudentCard />;
  if (path.startsWith("/f/")) return <LiveLeadForm />;
  if (path.startsWith("/p/")) return <LiveProperty id={decodeURIComponent(path.split("/")[2])} />;
  const section = path.split("/")[1];
  const content =
    path === "/" ? <Landing />
    : path === "/pricing" ? <section className="public-section"><Plans /></section>
    : path === "/login" ? <LiveLogin />
    : path === "/register" ? <LiveRegister />
    : path === "/ai-chat" || path === "/ai-team" || path === "/start" ? <LiveContentPage />
    : path === "/fit" ? <LiveFit />
    : path === "/explore" ? <LiveExplore />
    : path === "/industry" ? <LiveIndustries />
    : path.startsWith("/industry/") ? <LiveIndustry />
    : path === "/owner/login" ? <LiveOwnerLogin />
    : path.startsWith("/verify-certificate/") ? <LiveCertificate />
    : ["about", "contact", "guides"].includes(section) ? <EditorialPage path={path} />
    : <PublicPage path={path} />;
  return (
    <>
      <a className="skip-link" href="#main">{tl("رفتن به محتوا", "Skip to content")}</a>
      <PublicShell>{content}</PublicShell>
    </>
  );
}
function PlatformContent({ path }: { path: string }) {
  const { fa, t, tl } = useApp();
  const module = findModule(path);
  const source = sourcePage(path);
  const search = useSearchParams();
  const publicRoute =
    path === "/" ||
    path === "/fit" ||
    path === "/pricing" ||
    [
      "/choose-plan",
      "/start",
      "/welcome",
      "/fa",
      "/en",
      "/de",
      "/tr",
      "/owner/login",
    ].includes(path) ||
    path.startsWith("/o/") ||
    publicPages.some(
      ([s]) => path === "/" + s || path.startsWith("/" + s + "/"),
    ) ||
    [
      "/features/",
      "/solutions/",
      "/industry/",
      "/share/",
      "/verify-certificate/",
      "/p/",
      "/f/",
    ].some((s) => path.startsWith(s));
  let content: React.ReactNode;
  if (path === "/" || ["/fa", "/en", "/de", "/tr"].includes(path))
    content = (
      <>
        <Landing />
      </>
    );
  else if (path === "/owner/login") content = <Auth />;
  else if (path === "/admin/users") content = <AdminUsers />;
  else if (/^\/admin\/users\/[^/]+$/.test(path))
    content = (
      <AdminUserDetail key={path} id={decodeURIComponent(path.split("/")[3])} />
    );
  else if (path.startsWith("/f/"))
    content = <PublicLeadForm id={path.split("/")[2]} />;
  else if (["/payments", "/fitness/payments", "/fit/payments"].includes(path))
    content = <PaymentHistory />;
  else if (path === "/admin")
    content = (
      <ModuleWorkspace
        module={findModule("/admin/dashboard")!}
        path="/admin/dashboard"
      />
    );
  else if (
    module &&
    ((!path.startsWith("/fitness/credits") &&
      !path.startsWith("/fitness/payments") &&
      !path.startsWith("/fitness/checkout/") &&
      (!path.startsWith("/business/") ||
        [
          "crm",
          "accounting",
          "social",
          "seo",
          "voice-agent",
          "website",
          "startup",
        ].includes(module.id)) &&
      !path.startsWith("/create/") &&
      !path.startsWith("/fit/") &&
      ![
        "/admin/users",
        "/admin/models",
        "/admin/prompts",
        "/admin/settings",
        "/admin/logs",
        "/admin/crm",
      ].includes(path)) ||
      search.has("tab") ||
      search.has("view"))
  )
    content = <ModuleWorkspace key={module.id} module={module} path={path} />;
  else if (path.startsWith("/chat/")) content = <Chat />;
  else if (path === "/image/gallery") content = <ModuleWorkspace module={findModule('/image/generate')!} path="/image/generate/gallery"/>;
  else if (path === "/fitness/credits") content = <Credits />;
  else if (path.startsWith("/fitness/checkout/"))
    content = <Checkout path={path} />;
  else if (path === "/choose-plan") content = <Plans />;
  else if (path === "/organization/onboarding") content = <Onboarding />;
  else if (path === "/login" || path === "/register")
    content = <Auth register={path === "/register"} />;
  else if (path === "/onboarding") content = <Onboarding />;
  else if (path === "/home") content = <Dashboard />;
  else if (path === "/chat") content = <Chat />;
  else if (path === "/live") content = <LiveTalk />;
  else if (path === "/sitemap-ui") content = <Sitemap />;
  else if (path === "/design-system") content = <DesignSystem />;
  else if (path.startsWith("/admin")) content = <Admin path={path} />;
  else if (path === "/plans" || path === "/pricing") content = <Plans />;
  else if (path === "/credits" || path === "/fit/credits")
    content = <Credits />;
  else if (path.startsWith("/checkout") || path === "/fit/checkout")
    content = <Checkout path={path} />;
  else if (path === "/settings") content = <Settings />;
  else if (path === "/notifications") content = <Notifications />;
  else if (path === "/referral") content = <Referral />;
  else if (path === "/payments" || path === "/fit/payments")
    content = (
      <>
        <SectionTitle title={fa ? "پرداخت‌های من" : "Payment history"} />
        <DataTable
          title={fa ? "رسیدها و تراکنش‌ها" : "Receipts & transactions"}
        />
      </>
    );
  else if (path === "/create/video-factory") content = <Factory />;
  else if (
    path === "/gallery" ||
    path === "/explore" ||
    path === "/create/gallery"
  )
    content = <Gallery />;
  else if (path === "/play") content = <Play />;
  else if (path === "/assistants") content = <Assistants />;
  else if (path.startsWith("/assistants/") || path === "/fit/coach")
    content = (
      <Chat persona={fa ? "دستیار تخصصی تو" : "Your specialist assistant"} />
    );
  else if (
    path.startsWith("/create/") &&
    tools.some((v) => "/" + v.slug === path)
  )
    content = (
      <Studio key={path} tool={tools.find((v) => "/" + v.slug === path)!} />
    );
  else if (
    path === "/create" ||
    path === "/business" ||
    path === "/learn" ||
    path === "/fit"
  )
    content = (
      <Hub group={path.slice(1) as "create" | "business" | "learn" | "fit"} />
    );
  else if (path === "/fit/dashboard")
    content = (
      <>
        <SectionTitle title={t("fit")} />
        <FitDashboard />
        <div className="tool-grid">
          {tools
            .filter((v) => v.group === "fit")
            .map((v) => (
              <Link key={v.slug} className="panel" href={"/" + v.slug}>
                <Icon name={v.icon} />
                <h3>{tl(v.fa, v.en)}</h3>
                <p>{fa ? v.description : v.descriptionEn}</p>
              </Link>
            ))}
        </div>
      </>
    );
  else if (path.startsWith("/fit/workout")) content = <Workout />;
  else if (path === "/fit/nutrition") content = <Nutrition />;
  else if (path.startsWith("/fit/coaches")) content = <Coaches />;
  else if (
    path.startsWith("/learn/") ||
    path === "/student" ||
    path.startsWith("/student/")
  )
    content = <Learning path={path} />;
  else if (
    path.startsWith("/business/") &&
    businessPages[path.split("/")[2]]?.some(([s]) => s === path.split("/")[3])
  )
    content = <BusinessDetail key={path} path={path} />;
  else if (
    path.startsWith("/business/") ||
    path === "/agents" ||
    path === "/meeting"
  )
    content = (
      <>
        <BusinessNavigation path={path} />
        <BusinessTool key={path} path={path} />
      </>
    );
  else if (path.startsWith("/verify-certificate/"))
    content = (
      <div className="public-section center">
        <span className="icon-chip blue">
          <Icon name="BadgeCheck" size={40} />
        </span>
        <h1>{fa ? "گواهی نمونهٔ ای آی فکر" : "AIFekr sample certificate"}</h1>
        <p>AIF-2026 · Sara Mohammadi · Introduction to AI</p>
        <p className="badge">{t("mock")}</p>
      </div>
    );
  else if (["/share/", "/p/", "/f/"].some((s) => path.startsWith(s)))
    content = (
      <div className="public-section share-page">
        <span className="eyebrow">AIFekr / SHARED DEMO</span>
        <h1>
          {fa ? "یک فکر تازه، برای شروع" : "A fresh idea to get you started"}
        </h1>
        <div className="panel prose">
          <p>
            {fa
              ? "برای شروع خلاقیت، یک مشکل کوچک و واقعی را انتخاب کن. سه راه‌حل بنویس، ساده‌ترین را اجرا کن و از نتیجه یاد بگیر."
              : "Pick a small, real problem. Write down three ideas, try the simplest one, and learn from what happens."}
          </p>
        </div>
        <Link href="/register" className="btn primary">
          {t("start")}
        </Link>
      </div>
    );
  else if (source) content = <SourcePage path={path} />;
  else if (publicRoute) content = <PublicPage path={path} />;
  else
    content = (
      <div className="error-page">
        <span>{path === "/500" ? "500" : "404"}</span>
        <h1>
          {fa ? "این فکر هنوز به جایی نرسیده!" : "This idea hasn’t landed yet."}
        </h1>
        <p>{fa ? "از خانه شروع کنیم؟" : "Let’s find our way home."}</p>
        <Link className="btn primary" href="/home">
          {t("home")}
        </Link>
      </div>
    );
  const screenContent = module ? (
    <EmptyStateContext.Provider
      value={{
        title: fa ? "هنوز موردی ثبت نشده است" : "No records yet",
        body:
          module.group === "admin"
            ? fa
              ? "اطلاعات مرتبط با همین بخش یا حساب، در اینجا نمایش داده می‌شود."
              : "Records linked to this section or account will appear here."
            : module.group === "create"
              ? fa
                ? "پروژه‌ها و خروجی‌های ذخیره‌شده در این بخش دیده می‌شوند."
                : "Saved projects and outputs appear in this section."
              : fa
                ? "موارد ثبت‌شده را در همین فضای کاری مدیریت کن."
                : "Manage the records you create in this workspace.",
        icon: module.icon,
        action: fa
          ? module.group === "create"
            ? "شروع پروژه"
            : "افزودن"
          : module.group === "create"
            ? "Start a project"
            : "Add new",
      }}
    >
      {content}
    </EmptyStateContext.Provider>
  ) : (
    content
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {tl("رفتن به محتوا", "Skip to content")}
      </a>
      <Suspense fallback={<Skeleton />}>
        {publicRoute ? (
          <PublicShell>{screenContent}</PublicShell>
        ) : ["/login", "/register", "/onboarding"].includes(path) ? (
          <PublicShell>{screenContent}</PublicShell>
        ) : (
          <Shell path={path}>{screenContent}</Shell>
        )}
      </Suspense>
    </>
  );
}
function Sitemap() {
  const { fa, t, tl } = useApp();
  const [query, setQuery] = useState("");
  return (
    <>
      <SectionTitle
        title={t("sitemap")}
        subtitle={
          fa
            ? "فهرست تمام مسیرهای قابل بررسی؛ برخی بخش‌ها از قالب‌های مشترک استفاده می‌کنند."
            : "All reviewable routes. Some modules use shared demo templates."
        }
      />
      <input
        aria-label={t("search")}
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="sitemap-grid">
        {allRoutes
          .filter((p) =>
            (p + " " + RouteName(p, fa, tl))
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((p) => (
            <Link className="panel" key={p} href={p}>
              <span>{RouteName(p, fa, tl)}</span>
              <code dir="ltr">{p}</code>
              <Icon name="ArrowUpLeft" size={16} />
            </Link>
          ))}
      </div>
    </>
  );
}
function Gallery() {
  const { fa, t, items, tl } = useApp();
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const filtered = items.filter((v) => filter === "all" || v.type === filter);
  return (
    <>
      <SectionTitle
        title={t("gallery")}
        subtitle={
          fa
            ? "هرچه ساخته‌ای، بخشی از داستان توست."
            : "Everything you’ve made is a part of your story."
        }
      >
        <Link href="/create/image" className="btn primary">
          <Icon name="Plus" size={17} />
          {t("generate")}
        </Link>
      </SectionTitle>
      <div className="chips">
        {(["all", "image", "video", "voice", "music"] as const).map((s) => (
          <button
            key={s}
            className={s === filter ? "selected" : ""}
            onClick={() => setFilter(s)}
          >
            {t(s)}
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <Empty />
      ) : (
        <div className="gallery-grid">
          {filtered.map((item) => (
            <button
              className="panel gallery-item"
              key={item.id}
              onClick={() => setLightbox(item.prompt)}
            >
              <img
                src={
                  item.type === "image"
                    ? "/art/orbit.svg"
                    : item.type === "video"
                      ? "/art/waves.svg"
                      : "/art/voice.svg"
                }
                alt={item.prompt}
              />
              <h3>{item.prompt}</h3>
              <span className="badge">{t("mock")}</span>
            </button>
          ))}
        </div>
      )}
      {lightbox && (
        <Modal title={t("preview")} onClose={() => setLightbox(null)}>
          <img className="full-img" src="/art/orbit.svg" alt={lightbox} />
          <p>{lightbox}</p>
          <Link
            href={"/create/image?prompt=" + encodeURIComponent(lightbox)}
            className="btn primary"
          >
            {fa ? "با این ایده دوباره بساز" : "Remix this idea"}
          </Link>
        </Modal>
      )}
    </>
  );
}
function Assistants() {
  const { fa, t, tl } = useApp();
  return (
    <>
      <SectionTitle
        title={fa ? "یک همراه برای هر فکر" : "A companion for every idea"}
      />
      <div className="tool-grid">
        {["marketer", "coder", "translator", "lawyer", "doctor", "coach"].map(
          (s, i) => (
            <Link className="tool-card" key={s} href={"/assistants/" + s}>
              <span className={`icon-chip ${i % 2 ? "blue" : "orange"}`}>
                <Icon
                  name={
                    [
                      "Megaphone",
                      "Code",
                      "Languages",
                      "Scale",
                      "HeartPulse",
                      "Dumbbell",
                    ][i]
                  }
                  size={28}
                />
              </span>
              <h3>
                {fa
                  ? [
                      "بازاریاب",
                      "برنامه‌نویس",
                      "مترجم",
                      "اطلاعات حقوقی",
                      "اطلاعات سلامت",
                      "مربی",
                    ][i]
                  : [
                      "Marketer",
                      "Coder",
                      "Translator",
                      "Legal information",
                      "Health information",
                      "Coach",
                    ][i]}
              </h3>
              <p>{t("mock")}</p>
              <span className="text-link">
                {t("start")}
                <Icon name="ArrowLeft" size={15} />
              </span>
            </Link>
          ),
        )}
      </div>
    </>
  );
}
function Nutrition() {
  const { fa, t, n, tl } = useApp();
  const [swapped, setSwapped] = useState<number[]>([]);
  return (
    <>
      <SectionTitle title={fa ? "تغذیهٔ امروز" : "A balanced day"}>
        <Button
          variant="primary"
          onClick={() =>
            download(
              "grocery-list.txt",
              fa
                ? "جو دوسر\nماست\nمرغ\nسبزیجات\nبرنج"
                : "Oats\nYogurt\nChicken\nVegetables\nRice",
            )
          }
        >
          {fa ? "لیست خرید" : "Grocery list"}
        </Button>
      </SectionTitle>
      <div className="tool-grid">
        {[0, 1, 2].map((i) => (
          <div className="panel meal-card" key={i}>
            <span className="icon-chip lime">
              <Icon name="Salad" size={30} />
            </span>
            <span className="eyebrow">
              {fa
                ? ["صبحانه", "ناهار", "شام"][i]
                : ["Breakfast", "Lunch", "Dinner"][i]}
            </span>
            <h3>
              {swapped.includes(i)
                ? fa
                  ? "ماست و میوهٔ تازه"
                  : "Yogurt & fresh fruit"
                : fa
                  ? ["جو دوسر و میوه", "مرغ و سبزیجات", "سوپ سبزیجات"][i]
                  : ["Oats & berries", "Chicken & greens", "Vegetable soup"][i]}
            </h3>
            <p>{n(swapped.includes(i) ? 320 : 450 + i * 60)} kcal</p>
            <Button
              onClick={() =>
                setSwapped((s) =>
                  s.includes(i) ? s.filter((x) => x !== i) : [...s, i],
                )
              }
            >
              <Icon name="RefreshCw" size={15} />
              {fa ? "جایگزین کن" : "Swap meal"}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
function Coaches() {
  const { fa, t, price, tl } = useApp();
  return (
    <>
      <SectionTitle
        title={fa ? "مربی مسیر خودت را پیدا کن" : "Find your kind of coach"}
      />
      <div className="tool-grid">
        {[0, 1, 2].map((i) => (
          <div className="panel coach-card" key={i}>
            <span className="coach-avatar">
              <Icon name="UserRound" size={45} />
            </span>
            <h2>
              {fa
                ? ["سارا احمدی", "آرمان رضایی", "نرگس کریمی"][i]
                : ["Sara Ahmadi", "Arman Rezaei", "Narges Karimi"][i]}
            </h2>
            <p>{fa ? "قدرتی و آمادگی جسمانی" : "Strength & conditioning"}</p>
            <span className="badge amber">★ 4.9 · {t("mock")}</span>
            <h3>{price(490000 + i * 100000)}</h3>
            <Link href="/fit/checkout" className="btn">
              {fa ? "دریافت برنامه" : "Choose programme"}
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
function Play() {
  const { fa, t, tl } = useApp();
  const [result, setResult] = useState(false);
  return (
    <>
      <SectionTitle
        title={
          fa ? "کمی بازی، کمی خیال." : "A little play. A little imagination."
        }
      />
      <div className="panel play-card">
        <img
          src={result ? "/art/waves.svg" : "/art/orbit.svg"}
          alt={t("preview")}
        />
        <h2>{fa ? "جهان من در دههٔ هشتاد" : "My retro little universe"}</h2>
        <p>{t("mock")}</p>
        <Button
          variant="primary"
          onClick={() => {
            setResult(!result);
            toast.success(t("done"));
          }}
        >
          {result ? t("retry") : fa ? "امتحان کن" : "Give it a try"}
        </Button>
      </div>
    </>
  );
}
function DesignSystem() {
  const { t, fa, theme, setTheme, tl } = useApp();
  const [state, setState] = useState("ready");
  const [modal, setModal] = useState(false);
  return (
    <>
      <SectionTitle title={t("design")} subtitle="Warm Intelligence · v1.0">
        <Preferences />
      </SectionTitle>
      <section className="panel design-section">
        <h2>{fa ? "رنگ و نور" : "Color & light"}</h2>
        <div className="color-swatches">
          {[
            "#fff7ed",
            "#fed7aa",
            "#fb923c",
            "#f97316",
            "#ea580c",
            "#c2410c",
            "#0b0c10",
            "#16181f",
            "#262a35",
            "#38bdf8",
            "#84cc16",
            "#a78bfa",
          ].map((c) => (
            <div key={c}>
              <span style={{ background: c }} />
              <code>{c}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="panel design-section">
        <h2>{fa ? "تایپوگرافی" : "Typography"}</h2>
        {[44, 32, 24, 20, 16, 14, 12].map((size) => (
          <p key={size} style={{ fontSize: size }}>
            {fa
              ? "یک فکر، هزار امکان"
              : "A little spark. Endless possibilities."}{" "}
            <small>{size}px</small>
          </p>
        ))}
      </section>
      <section className="panel design-section">
        <h2>{fa ? "دکمه‌ها و بازخورد" : "Actions & feedback"}</h2>
        <div className="flex-wrap">
          {["primary", "", "ghost", "danger"].map((v) => (
            <Button
              key={v}
              variant={v}
              onClick={() => toast.success(t("success"))}
            >
              {t("save")}
            </Button>
          ))}
          <Button disabled>{t("loading")}</Button>
          <Button onClick={() => setModal(true)}>
            {fa ? "باز کردن پنجره" : "Open dialog"}
          </Button>
        </div>
        <div className="form-grid">
          <label>
            {t("name")}
            <input placeholder={t("name")} />
          </label>
          <label>
            {t("model")}
            <select>
              <option>{t("auto")}</option>
              <option>Pro</option>
            </select>
          </label>
          <label>
            {t("prompt")}
            <textarea rows={3} />
          </label>
          <label>
            {t("credits")}
            <input type="range" />
          </label>
          <label className="check-label">
            <input type="checkbox" />
            {t("confirm")}
          </label>
        </div>
        <div className="flex-wrap">
          {["orange", "green", "blue", "amber", "red"].map((c) => (
            <span className={"badge " + c} key={c}>
              {t("ready")}
            </span>
          ))}
        </div>
        <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {t("theme")}
        </Button>
      </section>
      <section className="panel design-section">
        <h2>{fa ? "حالت‌های رابط" : "Interface states"}</h2>
        <div className="chips">
          {["ready", "loading", "empty", "error"].map((s) => (
            <button
              className={state === s ? "selected" : ""}
              key={s}
              onClick={() => setState(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {state === "loading" ? (
          <Skeleton />
        ) : state === "error" ? (
          <ErrorState retry={() => setState("ready")} />
        ) : state === "empty" ? (
          <Empty onAction={() => setState("ready")} />
        ) : (
          <div className="inline-banner">
            <Icon name="CheckCircle2" />
            <p>{t("ready")}</p>
            <span className="credit-pill">✦ ۱۲۰</span>
          </div>
        )}
      </section>
      <DataTable title={fa ? "جدول اشتراکی" : "Shared data table"} />
      {modal && (
        <Modal title={t("preview")} onClose={() => setModal(false)}>
          <p>{t("mock")}</p>
          <Button variant="primary" onClick={() => setModal(false)}>
            {t("confirm")}
          </Button>
        </Modal>
      )}
    </>
  );
}

/** A specialist assistant: the same chat, under the assistant's own name. */
function AssistantChat() {
  return <Chat persona={useShell()?.assistant?.title} />;
}
