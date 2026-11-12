"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";

type Health = { key: string; state: "ok" | "attention" | "broken" | "not_connected"; reason: string; label: string | null; expiresAt: string | null; manageAt: string };

const NAMES: Record<string, [string, string, string, string]> = {
  instagram: ["اینستاگرام", "Instagram", "Instagram", "Instagram"],
  search_console: ["سرچ کنسول گوگل", "Google Search Console", "Google Search Console", "Google Search Console"],
  wordpress: ["وردپرس", "WordPress", "WordPress", "WordPress"],
};
const REASONS: Record<string, [string, string, string, string]> = {
  connected: ["وصل و سالم", "Connected", "Verbunden", "Bağlı"],
  token_expiring: ["اعتبار دسترسی به‌زودی تمام می‌شود؛ دوباره وصل کنید", "Access expires soon; reconnect", "Zugriff läuft bald ab; neu verbinden", "Erişim yakında bitiyor; yeniden bağlayın"],
  token_expired: ["اعتبار دسترسی تمام شده؛ کمپین‌ها و انتشار کار نمی‌کنند", "Access has expired; campaigns and publishing are stopped", "Zugriff abgelaufen; Kampagnen und Veröffentlichung stehen", "Erişim sona erdi; kampanyalar ve yayın durdu"],
  no_site_selected: ["حساب وصل است، ولی سایتی انتخاب نشده", "Account connected, but no site selected", "Konto verbunden, aber keine Website gewählt", "Hesap bağlı ama site seçilmedi"],
  incomplete: ["اطلاعات اتصال ناقص است", "Connection details are incomplete", "Verbindungsdaten unvollständig", "Bağlantı bilgileri eksik"],
  not_connected: ["وصل نیست", "Not connected", "Nicht verbunden", "Bağlı değil"],
};
const TITLE: [string, string, string, string] = ["سلامت اتصال‌ها", "Connection health", "Verbindungsstatus", "Bağlantı durumu"];
const MANAGE: [string, string, string, string] = ["مدیریت", "Manage", "Verwalten", "Yönet"];
const FAILED: [string, string, string, string] = ["وضعیت اتصال‌ها خوانده نشد.", "Could not read connection status.", "Verbindungsstatus nicht lesbar.", "Bağlantı durumu okunamadı."];
const ICON: Record<Health["state"], string> = { ok: "●", attention: "▲", broken: "✕", not_connected: "○" };

/** E3: every external connection on one panel, flagged before a campaign silently dies. */
export function ConnectionHealth() {
  const { locale } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const [rows, setRows] = useState<Health[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/connections/health", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { connections: Health[] }) => setRows(d.connections))
      .catch(() => setFailed(true));
  }, []);
  return (
    <section className="panel" aria-live="polite">
      <h3>{TITLE[i]}</h3>
      {failed && <p role="alert">{FAILED[i]}</p>}
      {rows?.map((c) => (
        <div className="domain-card row-between" key={c.key} role={c.state === "broken" ? "alert" : undefined}>
          <div>
            <strong><span aria-hidden="true">{ICON[c.state]} </span>{NAMES[c.key]?.[i] ?? c.key}</strong>
            {c.label && <span className="muted"> · <bdi dir="ltr">{c.label}</bdi></span>}
            <p className={c.state === "broken" ? "red-text" : c.state === "attention" ? "orange-text" : "muted"}>{REASONS[c.reason]?.[i] ?? c.reason}</p>
          </div>
          <a className="btn" href={c.manageAt}>{MANAGE[i]}</a>
        </div>
      ))}
    </section>
  );
}
