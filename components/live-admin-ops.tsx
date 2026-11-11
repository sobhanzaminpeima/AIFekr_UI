"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/**
 * Logs & monitoring and system status on aifekr.com, read-only:
 * /api/admin/logs, /api/admin/logs/errors and /api/admin/system. The system
 * endpoint returns integration names and missing setting names only, never values.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i], time: (iso: string) => new Date(iso).toLocaleString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i], { dateStyle: "short", timeStyle: "medium" }) }; };

type UsageRow = { id: string; userId: string; userName: string; model: string | null; type: string; credits: number; createdAt: string; metadata: string | null };
type ErrorRow = { id: string; level: string; source: string; message: string; stack: string | null; userId: string | null; requestId: string | null; createdAt: string };

export function LiveAdminLogs() {
  const { n, tx, time } = useTx();
  const [tab, setTab] = useState<"api" | "errors">("api");
  const [logs, setLogs] = useState<UsageRow[] | null>(null);
  const [errors, setErrors] = useState<ErrorRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const loadLogs = useCallback(async () => { const r = await fetch("/api/admin/logs", { credentials: "include" }); setLogs(r.ok ? (await r.json()).logs ?? [] : []); }, []);
  const loadErrors = useCallback(async () => { const r = await fetch("/api/admin/logs/errors", { credentials: "include" }); setErrors(r.ok ? (await r.json()).errors ?? [] : []); }, []);
  useEffect(() => { void loadLogs(); }, [loadLogs]);
  // Error history is loaded only when its tab is opened, as on the classic page.
  useEffect(() => { if (tab === "errors" && !errors) void loadErrors(); }, [tab, errors, loadErrors]);
  const course = (l: UsageRow) => { try { const m = JSON.parse(l.metadata || "{}"); return m.courseTitle ? m.courseTitle + " · " + m.status : null; } catch { return null; } };
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="ScrollText" size={28} /></span>
        <div>
          <h2>{tx(["لاگ‌ها و مانیتورینگ", "Logs & monitoring", "Protokolle & Monitoring", "Kayıtlar ve izleme"])}</h2>
          <p>{tx(["۱۰۰ درخواست اخیر هوش مصنوعی و آخرین خطاهای ثبت‌شدهٔ سرور.", "The last 100 AI requests and the latest server errors.", "Die letzten 100 KI-Anfragen und die neuesten Serverfehler.", "Son 100 yapay zekâ isteği ve son sunucu hataları."])}</p>
        </div>
        <Button onClick={() => void (tab === "api" ? loadLogs() : loadErrors())}><Icon name="RefreshCw" size={16} />{tx(["بروزرسانی", "Refresh", "Aktualisieren", "Yenile"])}</Button>
      </div>
      <nav className="module-tabs">
        <button className={tab === "api" ? "selected" : ""} aria-pressed={tab === "api"} onClick={() => setTab("api")}>{tx(["درخواست‌های AI", "AI requests", "KI-Anfragen", "AI istekleri"])}</button>
        <button className={tab === "errors" ? "selected" : ""} aria-pressed={tab === "errors"} onClick={() => setTab("errors")}>{tx(["خطاهای سرور", "Server errors", "Serverfehler", "Sunucu hataları"])}</button>
      </nav>
      {tab === "api" && (
        <section className="panel" aria-busy={!logs}>
          {logs?.length ? (
            <div className="table-scroll"><table className="admin-finance-table">
              <thead><tr>{[tx(["زمان", "Time", "Zeit", "Zaman"]), tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["نوع", "Type", "Typ", "Tür"]), tx(["مدل", "Model", "Modell", "Model"]), tx(["اعتبار", "Credits", "Credits", "Kredi"])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{logs.map((l) => (
                <tr key={l.id}>
                  <td>{time(l.createdAt)}</td>
                  <td><Link href={"/admin/users/" + encodeURIComponent(l.userId)}>{l.userName}</Link></td>
                  <td><span className="badge">{l.type === "course_generation" ? "AI Course Generation" : l.type}</span>{l.type === "course_generation" && course(l) && <small>{course(l)}</small>}</td>
                  <td dir="ltr">{l.model || "—"}</td>
                  <td>{l.type === "course_generation" ? n(-l.credits) + " Credits" : n(l.credits)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : logs && <Empty />}
        </section>
      )}
      {tab === "errors" && (
        <section className="panel" aria-busy={!errors}>
          {errors?.length ? errors.map((e) => (
            <article className="domain-card admin-error-row" key={e.id}>
              <button type="button" className="row-between" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
                <span><span className={"badge " + (e.level === "error" || e.level === "fatal" ? "red" : "orange")}>{e.level}</span> <bdi dir="ltr">{e.source}</bdi></span>
                <small>{time(e.createdAt)}</small>
              </button>
              <p dir="ltr">{e.message}</p>
              {(e.requestId || e.userId) && <small dir="ltr">{e.requestId ? "req " + e.requestId : ""}{e.userId ? " · user " + e.userId : ""}</small>}
              {open === e.id && e.stack && <pre dir="ltr">{e.stack}</pre>}
            </article>
          )) : errors && <p className="fine-print">{tx(["خطایی ثبت نشده است.", "No errors recorded.", "Keine Fehler protokolliert.", "Kayıtlı hata yok."])}</p>}
        </section>
      )}
    </>
  );
}

type Integration = { key: string; name: string; required: boolean; test?: string; configured: boolean; missing: string[]; mode?: string };
type System = { process: { uptimeSeconds: number; memoryRssMb: number; heapUsedMb: number; nodeVersion: string }; database: { ok: boolean; latencyMs: number | null; error: string | null }; integrations: Integration[]; recentErrors: { id: string; level: string; source: string; message: string; createdAt: string }[]; checkedAt: string };

export function LiveAdminSystem() {
  const { n, tx, time } = useTx();
  const [data, setData] = useState<System | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => { setFailed(false); try { const r = await fetch("/api/admin/system", { credentials: "include" }); if (!r.ok) throw Error(); setData(await r.json()); } catch { setFailed(true); } }, []);
  useEffect(() => { void load(); }, [load]);
  const uptime = (s: number) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return (d ? n(d) + tx(["ر ", "d ", "T ", "g "]) : "") + n(h) + tx(["س ", "h ", "h ", "s "]) + n(m) + tx(["د", "m", "m", "dk"]); };
  const missingRequired = data?.integrations.filter((x) => x.required && !x.configured) ?? [];
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Activity" size={28} /></span>
        <div>
          <h2>{tx(["وضعیت سیستم", "System status", "Systemstatus", "Sistem durumu"])}</h2>
          <p>{tx(["سلامت سرور، پایگاه داده و اتصال سرویس‌ها؛ فقط نام تنظیمات نمایش داده می‌شود، نه مقدار آن‌ها.", "Server, database and integration health; only setting names are shown, never their values.", "Server-, Datenbank- und Integrationsstatus; nur Namen von Einstellungen, nie Werte.", "Sunucu, veritabanı ve entegrasyon sağlığı; yalnızca ayar adları gösterilir, değerleri değil."])}</p>
        </div>
        <Button onClick={() => void load()}><Icon name="RefreshCw" size={16} />{tx(["بررسی دوباره", "Check again", "Erneut prüfen", "Yeniden kontrol et"])}</Button>
      </div>
      {failed && <p role="alert">{tx(["دریافت وضعیت انجام نشد", "Could not load the status", "Status konnte nicht geladen werden", "Durum yüklenemedi"])}</p>}
      <div className="stats-grid" aria-busy={!data}>
        <div className="panel stat"><span>{tx(["پایگاه داده", "Database", "Datenbank", "Veritabanı"])}</span><strong className={data ? (data.database.ok ? "ok" : "bad") : ""}>{data ? (data.database.ok ? tx(["سالم", "Healthy", "Gesund", "Sağlıklı"]) : tx(["خطا", "Error", "Fehler", "Hata"])) : "—"}</strong>{data?.database.latencyMs != null && <small dir="ltr">{data.database.latencyMs} ms</small>}</div>
        <div className="panel stat"><span>{tx(["زمان روشن‌بودن", "Uptime", "Laufzeit", "Çalışma süresi"])}</span><strong>{data ? uptime(data.process.uptimeSeconds) : "—"}</strong>{data && <small dir="ltr">Node {data.process.nodeVersion}</small>}</div>
        <div className="panel stat"><span>{tx(["حافظه", "Memory", "Speicher", "Bellek"])}</span><strong dir="ltr">{data ? n(data.process.memoryRssMb) + " MB" : "—"}</strong>{data && <small dir="ltr">heap {n(data.process.heapUsedMb)} MB</small>}</div>
        <div className="panel stat"><span>{tx(["اتصال الزامی ناقص", "Missing required integrations", "Fehlende Pflichtintegrationen", "Eksik zorunlu entegrasyon"])}</span><strong className={data ? (missingRequired.length ? "bad" : "ok") : ""}>{data ? n(missingRequired.length) : "—"}</strong></div>
      </div>
      {data?.database.error && <p role="alert" dir="ltr">{data.database.error}</p>}
      <div className="tool-grid">
        {data?.integrations.map((x) => (
          <article className="panel admin-integration" key={x.key}>
            <div className="row-between"><h3>{x.name}</h3><span className={"badge " + (x.configured ? "green" : x.required ? "red" : "")}>{x.configured ? tx(["متصل", "Configured", "Eingerichtet", "Yapılandırıldı"]) : x.required ? tx(["الزامی؛ تنظیم نشده", "Required, not set", "Pflicht, fehlt", "Zorunlu, eksik"]) : tx(["اختیاری؛ تنظیم نشده", "Optional, not set", "Optional, fehlt", "İsteğe bağlı, eksik"])}</span></div>
            {x.mode && <small>{tx(["حالت", "Mode", "Modus", "Mod"])}: <bdi dir="ltr">{x.mode}</bdi></small>}
            {x.missing.length > 0 && <small>{tx(["تنظیمات لازم", "Needed settings", "Benötigte Einstellungen", "Gerekli ayarlar"])}: <bdi dir="ltr">{x.missing.join(", ")}</bdi></small>}
            {x.test && <small dir="ltr">Test: {x.test}</small>}
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="row-between"><h3>{tx(["آخرین خطاها", "Latest errors", "Neueste Fehler", "Son hatalar"])}</h3><Link className="text-link" href="/admin/logs">{tx(["همهٔ لاگ‌ها", "All logs", "Alle Protokolle", "Tüm kayıtlar"])} ↗</Link></div>
        {data?.recentErrors.length ? data.recentErrors.map((e) => <div className="activity-item" key={e.id}><Icon name="TriangleAlert" size={16} /><div><strong dir="ltr">{e.source}</strong><p dir="ltr">{e.message}</p><p>{time(e.createdAt)}</p></div></div>) : data && <p className="fine-print">{tx(["خطایی ثبت نشده است.", "No errors recorded.", "Keine Fehler protokolliert.", "Kayıtlı hata yok."])}</p>}
        {data && <small className="fine-print">{tx(["زمان بررسی", "Checked at", "Geprüft um", "Kontrol zamanı"])}: {time(data.checkedAt)}</small>}
      </section>
    </>
  );
}
