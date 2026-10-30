"use client";
import Link, { useSite } from "@/components/site-link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./providers";
import { Brand, Button, Command, Icon, Modal, RouteName } from "./ui";
import { recentChats } from "@/mocks/catalog";
import { TranslationKey, Locale } from "@/lib/i18n";
import { AdminNavigation } from "./admin-navigation";
import {ModuleDirectory} from './module-directory';
import { useShell } from "./live-shell-context";
import { LiveFrame, NotificationBell, useLiveCredits, useLiveProjects } from "./live-shell-widgets";
const nav: [string, TranslationKey, string][] = [
  ["/home", "home", "LayoutDashboard"],
  ["/chat", "chat", "MessagesSquare"],
  ["/create", "create", "Sparkles"],
  ["/business", "business", "BriefcaseBusiness"],
  ["/learn", "learn", "GraduationCap"],
  ["/fit/dashboard", "fit", "Dumbbell"],
];
export function Preferences() {
  const { locale, setLocale, theme, setTheme, t } = useApp();
  return (
    <div className="preferences">
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        <option value="fa">فارسی</option>
        <option value="en">English</option>
        <option value="de">Deutsch</option>
        <option value="tr">Türkçe</option>
      </select>
      <button
        className="icon-btn"
        aria-label={t("theme")}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} />
      </button>
    </div>
  );
}
/**
 * The frame's sections on aifekr.com. /business has no page of its own there:
 * like the classic menu, it opens the CRM for accounts with business access
 * and the industry packs otherwise.
 */
function liveNavHref(href: string, business: boolean) {
  return href === "/business" ? (business ? "/crm" : "/industry") : href;
}
export function Shell({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const app = useApp();
  const { t, fa, n } = app;
  // Live mode (signed in on aifekr.com): the same frame with the account's real data.
  const live = useShell();
  const liveCredits = useLiveCredits(live?.user.credits ?? 0);
  const credits = live ? liveCredits : app.credits;
  const projects = useLiveProjects(!!live);
  const initial = (live?.user.name || "").trim().charAt(0) || "✦";
  // Recent chats follow new and renamed conversations, as in the classic sidebar.
  const [recent, setRecent] = useState(live?.conversations ?? []);
  useEffect(() => {
    const onHistory = (e: Event) => {
      const item = (e as CustomEvent<{ id: string; title?: string; updatedAt: string; projectId?: string | null }>).detail;
      if (item?.id) setRecent((prev) => [{ ...(prev.find((c) => c.id === item.id) ?? { title: null, projectId: null }), ...item }, ...prev.filter((c) => c.id !== item.id)].slice(0, 30) as typeof prev);
    };
    addEventListener("aifekr:chat-history-updated", onHistory);
    return () => removeEventListener("aifekr:chat-history-updated", onHistory);
  }, []);
  const [command, setCommand] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [directory,setDirectory]=useState(false);
  const router = useRouter();
  const admin = path.startsWith("/admin");
  useEffect(() => {
    let last = "";
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommand((c) => !c);
        return;
      }
      if (
        (e.target as HTMLElement).matches(
          "input,textarea,select,[contenteditable]",
        )
      )
        return;
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      }
      if (e.key === "n") router.push("/chat?new=" + Date.now());
      if (last === "g" && e.key === "h") router.push("/home");
      if (e.key === "?") setShortcuts(true);
      last = e.key;
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);
  useEffect(() => setMobile(false), [path]);
  return (
    <div
      className={`app-shell ${admin ? "admin-shell" : ""} ${collapsed || ["/crm", "/accounting", "/sales", "/business/crm", "/business/accounting", "/business/real-estate"].some((root) => path === root || path.startsWith(root + "/")) ? "collapsed" : ""}`}
    >
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <Brand compact={collapsed} />
          <button
            className="icon-btn collapse-btn"
            aria-label={t("close")}
            onClick={() => {
              setCollapsed(!collapsed);
              setMobile(false);
            }}
          >
            <Icon name="PanelRightClose" size={17} />
          </button>
        </div>
        {admin ? (
          <span className="badge orange">ADMIN · {t("mock")}</span>
        ) : (
          <>
            <Link
              href={"/chat?new=" + Date.now()}
              className="btn primary new-chat"
            >
              <Icon name="Plus" />
              <span>{t("newChat")}</span>
            </Link>
            <button className="search-btn" onClick={() => setCommand(true)}>
              <Icon name="Search" size={17} />
              <span>{t("search")}</span>
              <kbd>⌘ K</kbd>
            </button>
          </>
        )}
        <div className="side-label">{admin ? t("admin") : t("workspace")}</div>
        {admin ? <AdminNavigation path={path} onExpand={()=>setCollapsed(false)}/> : <nav className="main-nav">{nav.map(([href,key,icon])=><Link href={live ? liveNavHref(href, live.access.hasBusinessAccess) : href} key={href} className={path===href||(href!=="/home"&&path.startsWith(href+"/"))?"active":""} title={t(key)}><Icon name={icon}/><span>{t(key)}</span>{href==="/chat"&&<span className="small-tag">AI</span>}</Link>)}</nav>}
        {!admin && (
          <>
            <div className="side-label recent-label">
              <span>{t("recent")}</span>
              <Link href="/chat">{t("all")}</Link>
            </div>
            <nav className="recent-nav">
              {live
                ? recent.filter((c) => !c.projectId).slice(0, 4).map((c) => (
                    <Link key={c.id} href={"/chat/" + c.id}>
                      <Icon name="MessageSquare" size={15} />
                      <span>{c.title || live.copy.untitledChat}</span>
                    </Link>
                  ))
                : recentChats.map(([a, b], i) => (
                <Link key={a} href={"/chat?id=" + i}>
                  <Icon name="MessageSquare" size={15} />
                  <span>{fa ? a : b}</span>
                </Link>
              ))}
            </nav>
            <div className="side-label">
              <span>{t("projects")}</span>
              {live ? (
                <button className="icon-btn" aria-label={t("add")} onClick={projects.create}>
                  <Icon name="Plus" size={15} />
                </button>
              ) : (
              <Link href="/gallery" aria-label={t("add")}>
                <Icon name="Plus" size={15} />
              </Link>
              )}
            </div>
            {live ? projects.list.slice(0, 3).map((p) => (
              <Link key={p.id} href={"/chat?project=" + p.id} className="project-link">
                <span className="tiny-dot" style={{ background: p.color }} />
                {p.name}
                <Icon name="ChevronDown" size={14} />
              </Link>
            )) : (
            <Link href="/gallery" className="project-link">
              <span className="tiny-dot" />
              {fa ? "برند استودیو نارنج" : "Narenj studio brand"}
              <Icon name="ChevronDown" size={14} />
            </Link>
            )}
          </>
        )}
        <div className="sidebar-bottom">
          <Link href="/credits" className="wallet">
            <div>
              <span>
                <Icon name="Sparkles" size={16} /> {t("balance")}
              </span>
              <strong>
                {n(credits)} <small>{t("credits")}</small>
              </strong>
            </div>
            <span className="wallet-plus">
              <Icon name="Plus" size={18} />
            </span>
            <div className="meter">
              <i style={{ width: Math.min(100, credits / 15) + "%" }} />
            </div>
          </Link>
          <Link className="user-menu" href="/settings">
            <span className="avatar">{live ? initial : "س"}</span>
            <div>
              <strong>{live ? live.user.name || live.copy.nav.settings : fa ? "سارا محمدی" : "Sara Mohammadi"}</strong>
              <small>
                {live ? live.user.planName : fa ? "طرح حرفه‌ای" : "Pro workspace"} <span>{live ? live.user.plan : "PRO"}</span>
              </small>
            </div>
            <Icon name="ChevronsUpDown" size={15} />
          </Link>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobile(false)}
          aria-label={t("close")}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn menu-btn"
              onClick={() => setMobile(true)}
              aria-label={t("tools")}
            >
              <Icon name="Menu" />
            </button>
            <Icon name="House" size={16} />
            <span className="slash">/</span>
            <span>{path === "/home" ? t("home") : RouteName(path, fa)}</span>
            <span className="private-label">
              <Icon name="LockKeyhole" size={12} />
              {t("personal")}
            </span>
          </div>
          <div className="top-actions">
            <button className="btn module-switcher" onClick={()=>setDirectory(true)} aria-label={fa?'انتخاب ماژول':'Choose workspace'}><Icon name="LayoutGrid" size={18}/><span>{fa?'ماژول‌ها':'Workspaces'}</span></button>
            {!live && <span className="live-status">
              <i />
              {t("mock")}
            </span>}
            <Preferences />
            <Link className="credit-pill" href="/credits">
              <Icon name="Sparkles" size={14} />
              {n(credits)}
            </Link>
            {live ? <NotificationBell /> : <Link
              className="icon-btn notification-btn"
              href="/notifications"
              aria-label={t("notifications")}
            >
              <Icon name="Bell" size={19} />
              <i />
            </Link>}
            <Link
              href="/settings"
              className="avatar small"
              aria-label={t("profile")}
            >
              {live ? initial : "س"}
            </Link>
          </div>
        </header>
        <main className="page-content" id="main">
          {live ? <LiveFrame path={path}>{children}</LiveFrame> : children}
        </main>
        {directory&&<Modal title={fa?'انتخاب فضای کاری':'Choose a workspace'} onClose={()=>setDirectory(false)}><ModuleDirectory compact onNavigate={()=>{setDirectory(false);setMobile(false);}}/></Modal>}
        <footer className="app-footer">
          <span>
            ✦{" "}
            {fa
              ? "کمی فکر، بی‌نهایت امکان"
              : "A little spark. Endless possibilities."}
          </span>
          <div>
            {!live && <Link href="/sitemap-ui">{t("sitemap")}</Link>}
            {!live && <Link href="/design-system">{t("design")}</Link>}
            <button onClick={() => setShortcuts(true)}>⌘ ?</button>
          </div>
        </footer>
      </div>
      <nav className="mobile-nav">
        {[
          nav[0],
          nav[2],
          nav[1],
          nav[3],
          ["/settings", "profile", "UserRound"] as [
            string,
            TranslationKey,
            string,
          ],
        ].map(([href, key, icon]) => (
          <Link
            className={`${path === href ? "active" : ""} ${key === "chat" ? "center-chat" : ""}`}
            key={href}
            href={live ? liveNavHref(href, live.access.hasBusinessAccess) : href}
          >
            <Icon name={icon} />
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
      {command && <Command onClose={() => setCommand(false)} />}{" "}
      {shortcuts && (
        <Modal
          title={fa ? "میان‌برهای صفحه‌کلید" : "Keyboard shortcuts"}
          onClose={() => setShortcuts(false)}
        >
          <div className="shortcut-list">
            {[
              ["⌘ / Ctrl + K", t("search")],
              ["/", t("prompt")],
              ["N", t("newChat")],
              ["G → H", t("home")],
              ["?", fa ? "راهنمای میان‌برها" : "Shortcut guide"],
            ].map(([k, v]) => (
              <p key={k}>
                <span>{v}</span>
                <kbd>{k}</kbd>
              </p>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t, fa } = useApp();
  const live = useSite();
  const [open, setOpen] = useState(false);
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav
          className={open ? "open" : ""}
          aria-label={fa ? "ناوبری سایت" : "Website navigation"}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) {setOpen(false);e.currentTarget.querySelectorAll('details[open]').forEach(detail=>detail.removeAttribute('open'));}
          }}
        >
          <details className="public-nav-menu">
            <summary>
              {fa ? "محصول" : "Product"}
              <Icon name="ChevronDown" size={13} />
            </summary>
            <div>
              {[
                ["/chat", "MessagesSquare", "گفتگوی هوشمند", "AI chat"],
                ["/crm", "Users", "CRM و فروش", "CRM & sales"],
                ["/accounting", "BookOpen", "حسابداری", "Accounting"],
                ["/voice-studio", "AudioLines", "استودیوی صدا", "Voice Studio"],
                ["/create", "Sparkles", "ابزارهای خلاقیت", "Creative tools"],
                ["/#all-tools", "LayoutGrid", "همه ماژول‌ها", "All modules"],
              ].map(([url, icon, a, b]) => (
                <Link href={url} key={url}>
                  <Icon name={icon} size={18} />
                  {fa ? a : b}
                </Link>
              ))}
            </div>
          </details>
          <details className="public-nav-menu">
            <summary>
              {fa ? "راهکارها" : "Solutions"}
              <Icon name="ChevronDown" size={13} />
            </summary>
            <div>
              {(live ? live.solutions.map((s) => [s.slug, s.title, s.title]) : [
                ["creators", "تولید محتوا", "Creators"],
                ["real-estate", "مشاوران املاک", "Real estate"],
                ["clinics", "کلینیک‌ها", "Clinics"],
                ["shops", "فروشگاه‌ها", "Shops"],
                ["agencies", "آژانس‌ها", "Agencies"],
                ["students", "دانشجویان", "Students"],
              ]).map(([id, a, b]) => (
                <Link href={"/solutions/" + id} key={id}>
                  {fa ? a : b}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/pricing">{t("plans")}</Link>
          <Link href="/learn">{fa ? "آکادمی" : "Academy"}</Link>
          <Link href="/fit">FIT</Link>
          <Link href="/guides">{t("help")}</Link>
          <div className="public-mobile-preferences"><Preferences/><Link href="/login">{t('login')}</Link></div>
        </nav>
        <div>
          <Preferences />
          <Link href="/login" className="login-link">
            {t("login")}
          </Link>
          <Link href="/register" className="btn primary">
            {t("start")}
            <Icon name="ArrowUpLeft" size={16} />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="icon-btn menu-btn"
            aria-label={t("tools")}
            aria-expanded={open}
          >
            <Icon name="Menu" />
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="public-footer">
        <div>
          <Brand />
          <p>
            {fa
              ? "یک فکر، هزار امکان."
              : "One spark. A thousand possibilities."}
          </p>
          {!live && <small>{t("mock")}</small>}
        </div>
        <div className="footer-link-groups">
          {[
            [
              fa ? "محصول" : "Product",
              [
                ["/chat", fa ? "گفتگوی هوشمند" : "AI chat"],
                ["/features/crm", fa ? "CRM و فروش" : "CRM & sales"],
                ["/features/accounting", fa ? "حسابداری" : "Accounting"],
                ["/voice-studio", fa ? "استودیوی صدا" : "Voice Studio"],
                ["/features/seo", fa ? "محتوا و سئو" : "Content & SEO"],
                ["/features/factory", fa ? "کارخانه ویدیو" : "Video factory"],
              ],
            ],
            [
              fa ? "راهکارها" : "Solutions",
              [
                ["/business", fa ? "کسب‌وکار و تیم" : "Business & teams"],
                ["/solutions/creators", fa ? "تولیدکنندگان محتوا" : "Creators"],
                ["/solutions/real-estate", fa ? "املاک" : "Real estate"],
                ["/student", fa ? "دانشجویان" : "Students"],
                ["/fitness", fa ? "ورزش و سلامت" : "FIT"],
                ["/pricing", fa ? "طرح‌ها و قیمت‌گذاری" : "Plans & pricing"],
              ],
            ],
            [
              fa ? "منابع و ارتباط" : "Resources",
              [
                ["/about", fa ? "درباره ای آی فکر" : "About AIFekr"],
                ["/guides", fa ? "راهنماها" : "Guides"],
                ["/contact", fa ? "تماس با ما" : "Contact"],
                ["/security", fa ? "داده و امنیت" : "Data & security"],
                ["/privacy", fa ? "حریم خصوصی" : "Privacy"],
                ["/terms", fa ? "شرایط استفاده" : "Terms"],
              ],
            ],
          ].map(([heading, links]) => (
            <section key={String(heading)}>
              <h3>{String(heading)}</h3>
              {(links as string[][]).map(([href, label]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </section>
          ))}
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} AIFekr ·{" "}
            {fa ? "یک فکر، هزار امکان" : "One spark. Endless possibilities."}
          </span>
          <div>
            {(live ? [] : [
              ["/sitemap-ui", t("sitemap")],
              ["/design-system", t("design")],
            ]).map(([url, label]) => (
              <Link key={url} href={url}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
