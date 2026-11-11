"use client";
import Link, { useSite } from "@/components/site-link";
import { useShell } from "@/components/live-shell-context";
import { growthEvent } from "@/components/growth-tracker";
import { useEffect, useRef, useId, createContext, useContext } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleCheck,
  TriangleAlert,
  CircleX,
  ArrowUpDown,
  ArrowUpLeft,
  AudioLines,
  Award,
  BadgeCheck,
  Bell,
  BellOff,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Chrome,
  CircleAlert,
  CirclePlay,
  Clapperboard,
  Code,
  Copy,
  DatabaseBackup,
  Download,
  Dumbbell,
  Feather,
  Film,
  FolderHeart,
  FolderOpen,
  Gift,
  Globe,
  GraduationCap,
  GripVertical,
  HeartPulse,
  House,
  Image,
  Instagram,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Magnet,
  Megaphone,
  Menu,
  MessagesSquare,
  MessageSquare,
  Mic,
  Monitor,
  Moon,
  Music2,
  Package,
  PanelRightClose,
  PanelsTopLeft,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Rocket,
  Salad,
  Scale,
  Search,
  SearchX,
  Shapes,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sigma,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  SquarePen,
  Sun,
  Tablet,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  X,
  Ellipsis,
  Mail,
  Eye,
  EyeOff,
  CreditCard,
  Zap,
  GalleryHorizontal,
  Gamepad2,
  Briefcase,
  FolderPlus,
  Folder,
  MoreHorizontal,
  Settings,
  History,
  Crown,
  LogOut,
  Clock,
  Clock3,
  Compass,
  ArrowUpRight,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Info,
  AlertCircle,
  AlertTriangle,
  Handshake,
  Factory,
  Calculator,
  ShoppingCart,
  FlaskConical,
  Stethoscope,
  ChefHat,
  Plane,
  Code2,
  Coins,
  UserSquare2,
  FileText,
  FileDown,
  Database,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
} from "lucide-react";
const Icons = {
  Coins,
  UserSquare2,
  FileText,
  FileDown,
  Database,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,

  CreditCard,
  Zap,
  GalleryHorizontal,
  Gamepad2,
  Briefcase,
  FolderPlus,
  Folder,
  MoreHorizontal,
  Settings,
  History,
  Crown,
  LogOut,
  Clock,
  Clock3,
  Compass,
  ArrowUpRight,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  Info,
  AlertCircle,
  AlertTriangle,
  Handshake,
  Factory,
  Calculator,
  ShoppingCart,
  FlaskConical,
  Stethoscope,
  ChefHat,
  Plane,
  Code2,

  Mail,
  Eye,
  EyeOff,
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpLeft,
  AudioLines,
  Award,
  BadgeCheck,
  Bell,
  BellOff,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Chrome,
  CircleAlert,
  CirclePlay,
  Clapperboard,
  Code,
  Copy,
  DatabaseBackup,
  Download,
  Dumbbell,
  Feather,
  Film,
  FolderHeart,
  FolderOpen,
  Gift,
  Globe,
  GraduationCap,
  GripVertical,
  HeartPulse,
  House,
  Image,
  Instagram,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Magnet,
  Megaphone,
  Menu,
  MessagesSquare,
  MessageSquare,
  Mic,
  Monitor,
  Moon,
  Music2,
  Package,
  PanelRightClose,
  PanelsTopLeft,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Rocket,
  Salad,
  Scale,
  Search,
  SearchX,
  Shapes,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sigma,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  SquarePen,
  Sun,
  Tablet,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  X,
  CircleX,
  TriangleAlert,
  CircleCheck,
  Ellipsis,
};
import { useApp } from "../providers";
import { toast } from "sonner";
import { allRoutes, tools, adminSections, publicPages } from "@/mocks/catalog";
import { findModule, resolveView } from "@/lib/upstream/registry";
import { businessPages } from "@/mocks/business-pages";
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const C =
    (
      Icons as unknown as Record<
        string,
        React.ComponentType<{
          size: number;
          strokeWidth: number;
          className?: string;
        }>
      >
    )[name] || Icons.Sparkles;
  return <C size={size} strokeWidth={1.75} {...props} />;
}
export function Button({
  children,
  onClick,
  variant = "",
  className = "",
  disabled = false,
  type = "button",
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: string;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  label?: string;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled}
      className={`btn ${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  const {fa, tl }=useApp();
  return (
    <Link href="/" className="brand" aria-label={tl('ای آی فکر', 'AIFekr')}>
      <span className="brand-mark">
        <Icon name="Sparkles" size={25} />
      </span>
      {!compact && (
        <>
          <b>
            {tl('ای آی فکر', 'AIFekr')}<span>{tl('AIFekr', 'AI WORKSPACE')}</span>
          </b>
        </>
      )}
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useApp();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t("close")}>
          <Icon name="X" />
        </button>
      </header>
      {children}
      <div className="modal-end">
        <Button onClick={onClose}>{t("close")}</Button>
      </div>
    </dialog>
  );
}
export const EmptyStateContext = createContext<{
  title: string;
  body: string;
  icon: string;
  action: string;
} | null>(null);
export function Empty({ onAction }: { onAction?: () => void }) {
  const { t } = useApp();
  const context = useContext(EmptyStateContext);
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={context?.icon || "Sparkles"} size={34} />
      </span>
      <h3>{context?.title || t("empty")}</h3>
      <p>{context?.body || t("emptyBody")}</p>
      {onAction && (
        <Button variant="primary" onClick={onAction}>
          {context?.action || t("generate")}
        </Button>
      )}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-grid" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  const { t } = useApp();
  return (
    <div className="empty">
      <Icon name="CircleAlert" size={36} />
      <h3>{t("error")}</h3>
      <Button onClick={retry}>{t("retry")}</Button>
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function ToolCard({ tool }: { tool: (typeof tools)[number] }) {
  const { fa, t, n, tl } = useApp();
  // On aifekr.com the admin's real starting cost; tools priced per use (voice
  // studio, video factory) show none rather than a sample figure.
  const site = useSite();
  const cost = !site ? tool.cost : ({ "create/image": site.costs.imageStandard, "create/video": site.costs.video5s, "create/music": site.costs.music30s } as Record<string, number | undefined>)[tool.slug];
  return (
    <Link className="tool-card" href={"/" + tool.slug}>
      <span className={`icon-chip ${tool.accent}`}>
        <Icon name={tool.icon} size={25} />
      </span>
      <h3>{tl(tool.fa, tool.en)}</h3>
      <p>{tl(tool.description, tool.descriptionEn)}</p>
      <span className="tool-bottom">
        {cost != null ? <span>
          ✦ {n(cost)} {t("credits")}
        </span> : <span />}
        <Icon name="ArrowUpLeft" size={18} className="directional" />
      </span>
    </Link>
  );
}
export function RouteName(path: string, fa: boolean, tl: (fa: string, en: string) => string = (a, b) => (fa ? a : b)) {
  const [pathname, query] = path.split("?");
  const module = findModule(pathname);
  if (module) {
    const view = resolveView(module, pathname, new URLSearchParams(query));
    return query
      ? tl(module.title[0], module.title[1]) + " · " + tl(view.title[0], view.title[1])
      : tl(module.title[0], module.title[1]);
  }
  const common: Record<string, [string, string]> = {
    "/home": ["خانه", "Home"],
    "/welcome": ["شخصی‌سازی", "Personalize"],
    "/complete-phone": ["شماره موبایل", "Mobile number"],
    "/live": ["AIFekr Live", "AIFekr Live"],
    "/chat": ["گفتگو", "Chat"],
    "/create": ["استودیو خلاقیت", "Creative studio"],
    "/business": ["کسب‌وکار", "Business"],
    "/learn": ["آکادمی", "Academy"],
    "/fit": ["تناسب اندام", "FIT"],
    "/fit/dashboard": ["نمای تناسب اندام", "FIT dashboard"],
    "/gallery": ["گالری من", "My gallery"],
    "/plans": ["پکیج‌ها", "Packages"],
    "/credits": ["اعتبارها", "Credits"],
    "/payments": ["پرداخت‌ها", "Payments"],
    "/referral": ["دعوت دوستان", "Invite friends"],
    "/settings": ["تنظیمات", "Settings"],
    "/notifications": ["اعلان‌ها", "Notifications"],
    "/play": ["زمین بازی", "Playground"],
    "/assistants": ["دستیاران تخصصی", "Specialist assistants"],
    "/sitemap-ui": ["نقشهٔ صفحات", "UI sitemap"],
    "/design-system": ["سیستم طراحی", "Design system"],
    "/student": ["فضای دانشجو", "Student workspace"],
    "/student/quiz": ["آزمون", "Quiz"],
    "/student/planner": ["برنامهٔ مطالعه", "Study planner"],
    "/student/flashcards": ["فلش‌کارت‌ها", "Flashcards"],
    "/learn/exam": ["آزمون پایانی", "Final exam"],
    "/learn/certificate": ["گواهی پایان دوره", "Certificate"],
    "/fit/workout/1": ["تمرین امروز", "Today’s workout"],
    "/admin": ["نمای مدیریت", "Admin overview"],
    "/404": ["صفحه پیدا نشد", "Page not found"],
    "/500": ["خطای صفحه", "Page error"],
  };
  if (common[path]) return tl(common[path][0], common[path][1]);
  const [, category, root, child] = path.split("/");
  if (category === "business" && child) {
    const entry = businessPages[root]?.find(([s]) => s === child);
    if (entry) return tl(entry[1], entry[2]);
  }
  if (path.startsWith("/checkout/"))
    return tl("پرداخت آزمایشی", "Demo checkout");
  if (path.startsWith("/learn/courses/"))
    return tl("جزئیات دوره", "Course details");
  if (path.startsWith("/assistants/"))
    return tl("دستیار تخصصی", "Specialist assistant");
  if (pathname === "/admin/customer-growth")
    return tl("رشد و پیگیری مشتریان", "Customer growth & follow-up");
  if (pathname.startsWith("/admin/customer-growth/"))
    return tl("رشد مشتریان · پروفایل مشتری", "Customer growth · profile");
  const tool = tools.find((t) => "/" + t.slug === path);
  if (tool) return tl(tool.fa, tool.en);
  const a = adminSections.find(([s]) => "/admin/" + s === path);
  if (a) return fa ? a[1] : a[2];
  const p = publicPages.find(([s]) => "/" + s === path);
  return p
    ? fa
      ? p[1]
      : p[2]
    : path.split("/").filter(Boolean).join(" / ") ||
        (tl("صفحه اصلی", "Landing"));
}
export function Command({ onClose }: { onClose: () => void }) {
  const { t, fa, tl } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = ReactUseState("");
  // On aifekr.com: the real destinations, and the main site's goal search
  // (the classic command palette's) while typing.
  const live = useShell();
  const [found, setFound] = ReactUseState<{ href: string; label: string }[] | null>(null);
  useEffect(() => {
    if (!live) return;
    if (!query.trim()) { setFound(null); return; }
    let alive = true;
    const id = setTimeout(() => {
      fetch(`/api/navigation/search?lang=${live.lang}&q=${encodeURIComponent(query)}`).then((r) => (r.ok ? r.json() : { results: [] })).then((d) => { if (alive) setFound(d.results || []); }).catch(() => {});
    }, 120);
    return () => { alive = false; clearTimeout(id); };
  }, [query, live]);
  useEffect(() => {
    input.current?.focus();
  }, []);
  let results: string[] = allRoutes
    .filter((p) =>
      `${RouteName(p, fa)} ${p}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 12);
  if (/عکس|تصویر|image/.test(query)) results = ["/create/image", ...results];
  if (/ویدیو|video/.test(query)) results = ["/create/video", ...results];
  return (
    <Modal title={t("search")} onClose={onClose}>
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
      />
      <nav className="command-results">
        {(live ? (found ?? live.model.destinations).slice(0, 12) : results.map((href) => ({ href, label: RouteName(href, fa) }))).map(({ href: p, label }, i) => (
          <Link key={p + i} href={p} onClick={() => { if (live && query.trim()) growthEvent("feature_search_used", { metadata: { found: found?.length ?? 0, picked: p.slice(0, 60) } }); onClose(); }}>
            <Icon name="ArrowUpLeft" />
            <span>{label}</span>
            <kbd>↵</kbd>
          </Link>
        ))}
        {!results.length && <p>{t("noResults")}</p>}
      </nav>
    </Modal>
  );
}
import { useState as ReactUseState } from "react";
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("✓");
  } catch {
    toast.error("Clipboard unavailable");
  }
}
export function download(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SparkChart({ color = "var(--brand-500)" }: { color?: string }) {
  return (
    <svg
      className="spark-chart"
      viewBox="0 0 300 70"
      aria-label="Usage trend"
      role="img"
    >
      <path
        d="M0 60 C20 55 30 65 45 40 S75 55 90 35 S120 44 135 24 S165 40 180 20 S215 32 235 12 S265 23 300 4"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
      />
      <path
        d="M0 60 C20 55 30 65 45 40 S75 55 90 35 S120 44 135 24 S165 40 180 20 S215 32 235 12 S265 23 300 4 V70 H0Z"
        fill={color}
        opacity=".07"
      />
    </svg>
  );
}
