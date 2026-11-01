"use client";
// The classic frame's widgets in the new design: same endpoints, timings and
// wording (main site: NotificationBell, OrganizationSwitcher, CommandPalette,
// FloatingSupportWidget, StudentTimerDock, SessionWatchdog, credits/live,
// CurrencySelector, DashboardPullToRefresh).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShell } from "./live-shell-context";
import { useApp } from "./providers";
import { Icon } from "./ui";
import Link from "@/components/site-link";
import { usePathname } from "next/navigation";
import { fill } from "@/lib/live-app";


// ── Live credits (main site lib/credits/live) ──────────────────────────────
const CREDITS_REFRESH = "aifekr:credits-refresh";
const BILLED_GET = /\/api\/(crm\/(lead-matcher|agency-report|properties\/[^/]+\/(pricing-advice|listing-copy))|ceo\/orchestrator\/follow-up-drafts|sales\/followups)(\?|$)/;
const IGNORE = /\/api\/(user\/profile|credits\/|auth\/|support\/)/;
const DELAYS = [1200, 12000, 35000];
let creditsWatcher = false;
let creditTimers: ReturnType<typeof setTimeout>[] = [];
function installCreditsWatcher() {
  if (creditsWatcher) return;
  creditsWatcher = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
      if (res.ok && url.includes("/api/") && !IGNORE.test(url) && (method.toUpperCase() !== "GET" || BILLED_GET.test(url))) {
        creditTimers.forEach(clearTimeout);
        creditTimers = DELAYS.map((ms) => setTimeout(() => dispatchEvent(new Event(CREDITS_REFRESH)), ms));
      }
    } catch { /* never let bookkeeping break a request */ }
    return res;
  };
}
export function useLiveCredits(initial: number) {
  const [credits, setCredits] = useState(initial);
  useEffect(() => { setCredits(initial); }, [initial]);
  useEffect(() => {
    installCreditsWatcher();
    let alive = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/user/profile", { credentials: "include" });
        if (!r.ok) return;
        const next = (await r.json())?.user?.displayCredits;
        if (alive && typeof next === "number") setCredits(next);
      } catch { /* keep the last known balance */ }
    };
    addEventListener(CREDITS_REFRESH, refresh);
    addEventListener("focus", refresh);
    return () => { alive = false; removeEventListener(CREDITS_REFRESH, refresh); removeEventListener("focus", refresh); };
  }, []);
  return credits;
}

// ── Session watchdog (main site components/layout/SessionWatchdog) ─────────
export function SessionWatchdog() {
  const { copy } = useShell()!;
  useEffect(() => {
    const marked = window.fetch as typeof window.fetch & { __sessionWatchdog?: boolean };
    if (marked.__sessionWatchdog) return;
    const original = window.fetch;
    let handled = false;
    const own = (input: RequestInfo | URL) => new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, location.origin);
    const patched = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init);
      if (res.status === 402) {
        if (own(input).origin === location.origin) {
          const data = await res.clone().json().catch(() => null);
          if (data?.code === "SUBSCRIPTION_EXPIRED") dispatchEvent(new Event("aifekr:subscription-expired"));
        }
        return res;
      }
      if (res.status !== 401 || handled) return res;
      let url: URL;
      try { url = own(input); } catch { return res; }
      if (url.origin !== location.origin || !url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/auth/")) return res;
      const session = await original("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (session?.user?.featureAccess === false) { dispatchEvent(new Event("aifekr:subscription-expired")); return res; }
      if (session?.user) return res;
      handled = true;
      toast.error(copy.sessionExpired, { duration: 1800 });
      setTimeout(() => { location.href = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`; }, 1800);
      return res;
    }) as typeof window.fetch & { __sessionWatchdog?: boolean };
    patched.__sessionWatchdog = true;
    window.fetch = patched;
    return () => { window.fetch = original; };
  }, [copy.sessionExpired]);
  return null;
}

// ── Notifications (main site components/layout/NotificationBell) ───────────
type Notice = { id: string; type: string; title: string; body?: string | null; link?: string | null; isRead: boolean; createdAt: string };
let noticeCache: { at: number; promise: Promise<{ notifications?: Notice[]; unreadCount?: number } | null> } | null = null;
const loadNotices = () => {
  if (!noticeCache || Date.now() - noticeCache.at > 4000) noticeCache = { at: Date.now(), promise: fetch("/api/notifications").then((r) => (r.ok ? r.json() : null)).catch(() => null) };
  return noticeCache.promise;
};
export function NotificationBell() {
  const { copy, lang } = useShell()!;
  const t = copy.notifications;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const data = await loadNotices();
    if (!data) return;
    setItems(data.notifications || []);
    setUnread(data.unreadCount || 0);
  }, []);
  useEffect(() => {
    void load();
    const sync=()=>{noticeCache=null;void load();};
    addEventListener("aifekr:notifications-updated",sync);
    const id = setInterval(load, 30000);
    return () => {clearInterval(id);removeEventListener("aifekr:notifications-updated",sync);};
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const patch = (body: object) => fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).catch(() => {});
  const ago = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime(), m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    return m < 1 ? t.justNow : m < 60 ? t.minutesAgo.replace("{n}", String(m)) : h < 24 ? t.hoursAgo.replace("{n}", String(h)) : t.daysAgo.replace("{n}", String(d));
  };
  return (
    <div className="bell" ref={root}>
      <button className="icon-btn notification-btn" aria-label={unread ? `${t.bellTooltip} (${unread})` : t.bellTooltip} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="Bell" size={19} />
        {unread > 0 && <i />}
      </button>
      {open && (
        <div className="bell-menu panel" role="dialog" aria-label={t.bellTooltip}>
          <div className="bell-head">
            <strong>{t.bellTooltip}</strong><Link href="/notifications" onClick={()=>setOpen(false)}>{lang === "fa" ? "همهٔ اعلان‌ها" : "View all"}</Link>
            {unread > 0 && <button className="text-btn" onClick={() => { setItems((p) => p.map((x) => ({ ...x, isRead: true }))); setUnread(0); void patch({ all: true }); }}>{t.markAllRead}</button>}
          </div>
          {!items.length ? <p className="muted bell-empty">{t.empty}</p> : (
            <div className="bell-list">
              {items.map((x) => (
                <button key={x.id} className={x.isRead ? "" : "unread"} onClick={() => {
                  if (!x.isRead) { setItems((p) => p.map((y) => (y.id === x.id ? { ...y, isRead: true } : y))); setUnread((c) => Math.max(0, c - 1)); void patch({ id: x.id }); }
                  setOpen(false);
                  if (x.link) router.push(x.link);
                }}>
                  <strong>{x.title}</strong>
                  {x.body && <span>{x.body}</span>}
                  <small>{ago(x.createdAt)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Student study timer (main site components/student/StudentTimerDock) ────
type ActiveTimer = { id: string; pausedAt: string | null; elapsedSeconds: number; course: { id: string; name: string; color: string } | null };
export function StudentTimerDock() {
  const { copy } = useShell()!;
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [syncedAt, setSyncedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/student/study-sessions?activeOnly=1", { cache: "no-store" });
      if (!r.ok) { setActive(null); return; }
      setActive((await r.json()).active || null);
      setSyncedAt(Date.now());
    } catch { /* keep the last known timer during a short network interruption */ }
  }, []);
  useEffect(() => {
    void refresh();
    const poll = setInterval(refresh, 15000), tick = setInterval(() => setNow(Date.now()), 1000);
    addEventListener("focus", refresh);
    addEventListener("student-timer-updated", refresh);
    return () => { clearInterval(poll); clearInterval(tick); removeEventListener("focus", refresh); removeEventListener("student-timer-updated", refresh); };
  }, [refresh]);
  async function perform(action: "pause" | "resume" | "stop") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/student/study-sessions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Timer update failed");
      dispatchEvent(new Event("student-timer-updated"));
      if (action === "stop") setActive(null); else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Timer update failed");
      await refresh();
    } finally { setBusy(false); }
  }
  if (!active) return null;
  const elapsed = active.pausedAt ? active.elapsedSeconds : active.elapsedSeconds + Math.max(0, Math.floor((now - syncedAt) / 1000));
  const pad = (v: number) => String(v).padStart(2, "0");
  const paused = !!active.pausedAt;
  return (
    <aside className={`timer-dock panel ${paused ? "paused" : ""}`} aria-label={copy.timerLabel}>
      <div>
        <span className="timer-state"><i />{paused ? copy.timerPaused : copy.timerRunning}</span>
        <strong role="timer" aria-live="off">{pad(Math.floor(elapsed / 3600))}:{pad(Math.floor((elapsed % 3600) / 60))}:{pad(elapsed % 60)}</strong>
        {active.course && <small style={{ color: active.course.color }}>{active.course.name}</small>}
      </div>
      <div className="timer-actions">
        <button className="btn primary" disabled={busy} onClick={() => perform(paused ? "resume" : "pause")} aria-label={paused ? copy.timerResumeLabel : copy.timerPauseLabel} title={paused ? copy.timerResume : copy.timerPause}><Icon name={busy ? "Loader2" : paused ? "Play" : "Pause"} size={17} /></button>
        <button className="btn" disabled={busy} onClick={() => perform("stop")} aria-label={copy.timerStopLabel} title={copy.timerStop}><Icon name="Square" size={15} /></button>
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
    </aside>
  );
}

// ── Pull to refresh (main site components/layout/DashboardPullToRefresh) ────
export function PullToRefresh() {
  const { copy } = useShell()!;
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main#main");
    if (!main || getComputedStyle(main).overflowY === "hidden") return;
    const START = 76;
    const start = (e: TouchEvent) => { if (matchMedia("(min-width: 768px)").matches || refreshing || e.touches.length !== 1) return; if (main.scrollTop <= 0 && document.scrollingElement!.scrollTop <= 0) startY.current = e.touches[0].clientY; };
    const move = (e: TouchEvent) => {
      if (startY.current === null || refreshing || !e.touches.length) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { pulling.current = false; setDistance(0); return; }
      pulling.current = true;
      distanceRef.current = Math.min(START, delta * 0.48);
      setDistance(distanceRef.current);
      if (delta > 8) e.preventDefault();
    };
    const end = () => {
      const go = pulling.current && distanceRef.current >= START * 0.72;
      startY.current = null; pulling.current = false; distanceRef.current = 0; setDistance(0);
      if (!go) return;
      setRefreshing(true);
      router.refresh();
      setTimeout(() => setRefreshing(false), 900);
    };
    main.addEventListener("touchstart", start, { passive: true });
    main.addEventListener("touchmove", move, { passive: false });
    main.addEventListener("touchend", end, { passive: true });
    main.addEventListener("touchcancel", end, { passive: true });
    return () => { main.removeEventListener("touchstart", start); main.removeEventListener("touchmove", move); main.removeEventListener("touchend", end); main.removeEventListener("touchcancel", end); };
  }, [refreshing, router]);
  if (!distance && !refreshing) return null;
  return (
    <div className="pull-refresh" aria-live="polite" style={{ transform: `translateY(${refreshing ? 8 : Math.max(0, distance - 24)}px)` }}>
      <span><Icon name={refreshing ? "Loader2" : "RefreshCw"} size={15} className={refreshing ? "spin" : ""} />{refreshing ? copy.refreshing : copy.releaseToRefresh}</span>
    </div>
  );
}

// ── Support assistant (main site components/support/FloatingSupportWidget) ──
type SupportMessage = { id: string; role: "user" | "assistant"; content: string; navigation?: { href: string; label: string } | null; sources?: { title: string; heading: string }[]; isError?: boolean };
const SUPPORT_KEY = "aifekr-support-conversation";
const newId = () => Math.random().toString(36).slice(2);
export function SupportWidget({ path }: { path: string }) {
  const { copy: shellCopy, lang } = useShell()!;
  const copy = shellCopy.support;
  const { fa } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const conversation = useRef<string | null>(null);
  const loaded = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { try { conversation.current = sessionStorage.getItem(SUPPORT_KEY); } catch { /* storage blocked: fresh thread per load */ } }, []);
  useEffect(() => {
    const onDrawer = (e: Event) => setDrawer(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    addEventListener("aifekr:mobile-drawer", onDrawer);
    return () => removeEventListener("aifekr:mobile-drawer", onDrawer);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) setOpen(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!open || loaded.current || !conversation.current) return;
    loaded.current = true;
    fetch(`/api/support/chat?conversationId=${encodeURIComponent(conversation.current)}`).then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d: { messages?: { id: string; role: string; content: string }[] }) => { if (d.messages?.length) setMessages(d.messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))); })
      .catch(() => {});
  }, [open]);
  if (path === "/chat" || path.startsWith("/chat/")) return null;
  const set = (id: string, patch: Partial<SupportMessage>) => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    const answerId = newId();
    setMessages((prev) => [...prev, { id: newId(), role: "user", content: trimmed }, { id: answerId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/support/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed, conversationId: conversation.current, history }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        set(answerId, { content: res.status === 503 ? copy.unavailable : res.status === 429 ? copy.rateLimited : body.error || copy.genericError, isError: true });
        return;
      }
      const id = res.headers.get("X-Conversation-Id");
      if (id) { conversation.current = id; try { sessionStorage.setItem(SUPPORT_KEY, id); } catch { /* history-on-reload only */ } }
      const reader = res.body?.getReader();
      if (!reader) throw new Error(copy.genericError);
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          let parsed: { text?: string; reset?: boolean; error?: string; navigation?: { href: string; label: string } | null; sources?: { title: string; heading: string }[] };
          try { parsed = JSON.parse(data); } catch { continue; }
          if (parsed.reset) { text = ""; set(answerId, { content: "" }); }
          if (parsed.error) { set(answerId, { content: parsed.error === "support_model_unavailable" ? copy.unavailable : copy.genericError, isError: true }); continue; }
          if (parsed.text) { text += parsed.text; set(answerId, { content: text }); }
          if (parsed.navigation !== undefined || parsed.sources !== undefined) set(answerId, { navigation: parsed.navigation ?? null, sources: parsed.sources ?? [] });
        }
      }
    } catch {
      set(answerId, { content: copy.genericError, isError: true });
    } finally {
      setStreaming(false);
    }
  }
  // Main site lib/orchestrator/support/formatSources.
  const sources = (list: { title: string; heading: string }[]) => Array.from(new Set(list.map((s) => (s.title === s.heading ? s.heading : `${s.title} — ${s.heading}`)))).join(lang === "fa" ? "، " : ", ");
  if (drawer) return null;
  return (
    <div className="support" style={{ ["--support" as string]: copy.color, ["--support-tint" as string]: copy.tint }}>
      {!open && <button className="support-launcher" aria-label={copy.launcherLabel} title={copy.launcherLabel} onClick={() => setOpen(true)}><Icon name="Compass" size={24} /></button>}
      {open && (
        <>
          {expanded && <div className="support-backdrop" onClick={() => setExpanded(false)} />}
          <div className={`support-panel panel ${expanded ? "expanded" : ""}`} role="dialog" aria-label={copy.title}>
            <div className="support-head">
              <span className="support-avatar">{copy.initial}</span>
              <strong>{copy.title}</strong>
              <button className="icon-btn" aria-label={expanded ? copy.collapse : copy.expand} title={expanded ? copy.collapse : copy.expand} onClick={() => setExpanded(!expanded)}><Icon name={expanded ? "Minimize2" : "Maximize2"} size={15} /></button>
              <button className="icon-btn" aria-label={copy.close} title={copy.close} onClick={() => setOpen(false)}><Icon name="X" size={15} /></button>
            </div>
            <div className="support-messages">
              {!messages.length && (
                <>
                  <p className="support-bubble">{copy.greeting}</p>
                  <div className="support-starters">{copy.starters.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
                </>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`support-msg ${m.role}`}>
                  <p className={`support-bubble ${m.isError ? "error" : ""}`}>{m.content || (streaming && m.role === "assistant" ? <Icon name="Loader2" size={15} className="spin" /> : "")}</p>
                  {m.navigation && <button className="support-nav" onClick={() => router.push(m.navigation!.href)}><span>{m.navigation.label}</span><Icon name={fa ? "ArrowLeft" : "ArrowRight"} size={14} /></button>}
                  {!!m.sources?.length && <small className="support-sources">{copy.sourcesLabel}: {sources(m.sources)}</small>}
                </div>
              ))}
              <div ref={end} />
            </div>
            <form className="support-composer" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
              <textarea value={input} rows={1} disabled={streaming} placeholder={copy.placeholder} aria-label={copy.placeholder} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} />
              <button type="submit" className="support-send" disabled={streaming || !input.trim()} aria-label={copy.send}><Icon name={streaming ? "Loader2" : "Send"} size={16} className={streaming ? "spin" : fa ? "flip" : ""} /></button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// ── Projects (main site /api/projects, as in the classic sidebar) ───────────
type Project = { id: string; name: string; color: string };
export function useLiveProjects(enabled: boolean) {
  const { copy } = useShell() ?? { copy: null };
  const [list, setList] = useState<Project[]>([]);
  const load = useCallback(async () => {
    const d = await fetch("/api/projects").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d) setList(d.projects || []);
  }, []);
  useEffect(() => { if (enabled) void load(); }, [enabled, load]);
  const create = async () => {
    const name = prompt(copy?.projectName ?? "")?.trim();
    if (!name) return;
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color: "#ea580c" }) }).catch(() => null);
    if (res?.ok) void load();
  };
  return { list, create };
}

// ── Banners and gate around the page (main site PlatformShell) ─────────────
/** TrialBanner: shown while the account is on a trial without paid access (re-checked on focus). */
function TrialBanner() {
  const { banners, copy } = useShell()!;
  const trial = banners.trial;
  const path = usePathname();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!trial) return;
    const sync = async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (!r.ok) return;
        const { user } = await r.json();
        const planExpiry = user?.planExpiry ? new Date(user.planExpiry).getTime() : null;
        setVisible(!(user?.plan && user.plan !== "FREE" && (planExpiry === null || planExpiry > Date.now())) && !!user?.trialEndsAt);
      } catch { /* keep the rendered state */ }
    };
    void sync();
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => { removeEventListener("focus", sync); document.removeEventListener("visibilitychange", onVisible); };
  }, [trial, path]);
  if (!trial || !visible) return null;
  const left = new Date(trial.endsAt).getTime() - Date.now();
  return (
    <div className={`notice-banner ${left <= 0 ? "danger" : ""}`} role="status">
      <Icon name="Clock" size={15} />
      <span>{left <= 0 ? copy.trialExpired : fill(trial.limited ? copy.trialLeftLimited : copy.trialLeft, { n: Math.ceil(left / 86400000) })}</span>
      <Link href="/plans">{copy.upgrade}</Link>
    </div>
  );
}

function PendingPayments({ path }: { path: string }) {
  const { user, copy } = useShell()!;
  const { fa } = useApp();
  const count = user.pendingPaymentCount;
  if (!count || path === "/payments" || path.startsWith("/checkout/") || path.startsWith("/fitness/checkout/") || path === "/fitness/payments") return null;
  return (
    <Link className="notice-banner" href={path.startsWith("/fitness") ? "/fitness/payments?filter=pending" : "/payments?filter=pending"}>
      <Icon name="Clock3" size={15} />
      <span>{fill(copy.pendingPayments, { n: count })}</span>
      <Icon name={fa ? "ArrowLeft" : "ArrowRight"} size={15} />
    </Link>
  );
}

/**
 * The page inside the design's frame: the classic layout's notices, its
 * subscription gate (past expiry only renewal pages stay usable) and its
 * floating helpers.
 */
export function LiveFrame({ path, children }: { path: string; children: React.ReactNode }) {
  const { banners, copy, user } = useShell()!;
  const [expired, setExpired] = useState(banners.expired);
  useEffect(() => {
    setExpired(banners.expired);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { if (!banners.expiresAt) return; const left = new Date(banners.expiresAt).getTime() - Date.now(); if (left <= 0) setExpired(true); else timer = setTimeout(tick, Math.min(left, 86400000)); };
    const onExpire = () => setExpired(true);
    addEventListener("aifekr:subscription-expired", onExpire);
    tick();
    return () => { clearTimeout(timer); removeEventListener("aifekr:subscription-expired", onExpire); };
  }, [banners.expired, banners.expiresAt]);
  const recovery = ["/profile", "/settings", "/payments", "/plans", "/pricing", "/checkout", "/wallet", "/support", "/credits"].some((p) => path === p || path.startsWith(p + "/"));
  return (
    <>
      <SessionWatchdog />
      <TrialBanner />
      <PendingPayments path={path} />
      {expired ? (
        <>
          <div role="alert" className="panel expired-gate">
            <h2>{copy.expiredTitle}</h2>
            <p>{copy.expiredBody}</p>
            <div className="row-actions">
              <Link href="/pricing" className="btn primary">{copy.renew}</Link>
              <Link href="/payments" className="btn">{copy.trackPayment}</Link>
            </div>
          </div>
          {recovery && children}
        </>
      ) : (
        <>
          {children}
          {user.studentWorkspaceEnabled && <StudentTimerDock />}
          <SupportWidget path={path} />
        </>
      )}
      <PullToRefresh />
    </>
  );
}
