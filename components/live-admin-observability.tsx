"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button } from "./ui";

type Verdict = "ok" | "attention" | "broken";
type Data = {
  checkedAt: string;
  providers: { verdict: Verdict; failuresLastDay: number; chatRequestsLastDay: number; byProvider: { provider: string; failures: number }[] };
  errors: { lastDay: number; bySource: { source: string; count: number }[] };
  events: { verdict: Verdict; lastAcceptedAt: string | null; failedLastDay: number };
  usage: { untokenizedTextRequests30d: number };
  rates: { target: string; validUntil: string | null; verdict: Verdict }[];
};
type Q = [string, string, string, string];

const T: Record<string, Q> = {
  title: ["سلامت سیستم", "System health", "Systemzustand", "Sistem sağlığı"],
  intro: ["پاسخ «الان چه چیزی خراب است؟» از داده‌های ثبت‌شده، بدون تماس با سرویس‌ها.", "What is broken right now, from recorded data, without calling any provider.", "Was gerade nicht funktioniert, aus gespeicherten Daten, ohne Anbieteraufruf.", "Şu an neyin bozuk olduğu, kayıtlı verilerden, sağlayıcı çağrısı olmadan."],
  refresh: ["به‌روزرسانی", "Refresh", "Aktualisieren", "Yenile"],
  providers: ["مدل‌های هوش مصنوعی (۲۴ ساعت)", "AI providers (24 h)", "KI-Anbieter (24 Std.)", "Yapay zekâ sağlayıcıları (24 sa)"],
  fallbacks: ["جایگزینی به مدل دیگر", "fallbacks to another model", "Ausweichen auf ein anderes Modell", "başka modele geçiş"],
  chats: ["درخواست چت", "chat requests", "Chat-Anfragen", "sohbet isteği"],
  events: ["رویدادهای اینستاگرام", "Instagram events", "Instagram-Ereignisse", "Instagram olayları"],
  lastEvent: ["آخرین رویداد پذیرفته‌شده", "Last accepted event", "Letztes angenommenes Ereignis", "Son kabul edilen olay"],
  none: ["هیچ", "none", "keines", "yok"],
  failedDay: ["شکست در ۲۴ ساعت", "failed in 24 h", "fehlgeschlagen in 24 Std.", "24 sa içinde başarısız"],
  errors: ["خطاهای ثبت‌شده (۲۴ ساعت)", "Logged errors (24 h)", "Protokollierte Fehler (24 Std.)", "Kayıtlı hatalar (24 sa)"],
  usage: ["درخواست متنی بدون توکن (۳۰ روز)", "Text requests without tokens (30 days)", "Textanfragen ohne Token (30 Tage)", "Tokensız metin isteği (30 gün)"],
  rates: ["نرخ‌های ارز تأییدشده", "Approved exchange rates", "Freigegebene Wechselkurse", "Onaylı döviz kurları"],
  validUntil: ["معتبر تا", "valid until", "gültig bis", "geçerlilik"],
  missing: ["ثبت نشده", "not recorded", "nicht erfasst", "kayıtlı değil"],
  trials: ["آزمایش‌های رایگان", "Free trials", "Kostenlose Tests", "Ücretsiz denemeler"],
  offered: ["ارائه می‌شود", "Offered", "Angeboten", "Sunuluyor"],
  notOffered: ["ارائه نمی‌شود (تصمیم قیمت‌گذاری مالک)", "Not offered (owner's pricing decision)", "Nicht angeboten (Preisentscheidung des Inhabers)", "Sunulmuyor (sahibin fiyat kararı)"],
  configure: ["تنظیم", "Configure", "Einstellen", "Ayarla"],
  failed: ["گزارش خوانده نشد.", "Could not load the report.", "Bericht nicht ladbar.", "Rapor yüklenemedi."],
  ok: ["سالم", "OK", "In Ordnung", "Sorunsuz"],
  attention: ["نیاز به توجه", "Needs attention", "Prüfen", "Dikkat gerekli"],
  broken: ["خراب", "Broken", "Gestört", "Bozuk"],
};
const COLOR: Record<Verdict, string> = { ok: "green", attention: "orange-text", broken: "red-text" };

/** E12: one admin page answering "is anything broken right now?" */
export function LiveAdminObservability() {
  const { locale, n } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const tx = (k: string) => T[k][i];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [trials, setTrials] = useState<{ module: string; offered: boolean; uses: number; limit: string | null; configureAt: string | null }[] | null>(null);
  useEffect(() => {
    fetch("/api/admin/trials", { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setTrials(d?.trials ?? null)).catch(() => {});
  }, []);
  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/admin/observability", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);
  const when = (v: string | null) => (v ? new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : tx("none"));
  const badge = (v: Verdict) => <strong className={COLOR[v]}>{tx(v)}</strong>;
  return (
    <section className="panel">
      <div className="row-between">
        <h2>{tx("title")}</h2>
        <Button onClick={load}>{tx("refresh")}</Button>
      </div>
      <p className="muted">{tx("intro")}</p>
      {failed && <p role="alert">{tx("failed")}</p>}
      {data && (
        <div className="stats-grid">
          <div className="panel stat">
            <span>{tx("providers")}</span> {badge(data.providers.verdict)}
            <p>{n(data.providers.failuresLastDay)} {tx("fallbacks")} · {n(data.providers.chatRequestsLastDay)} {tx("chats")}</p>
            {data.providers.byProvider.map((p) => <p className="muted" key={p.provider}><bdi dir="ltr">{p.provider}</bdi>: {n(p.failures)}</p>)}
          </div>
          <div className="panel stat">
            <span>{tx("events")}</span> {badge(data.events.verdict)}
            <p>{tx("lastEvent")}: {when(data.events.lastAcceptedAt)}</p>
            <p className="muted">{n(data.events.failedLastDay)} {tx("failedDay")}</p>
          </div>
          <div className="panel stat">
            <span>{tx("errors")}</span> <strong>{n(data.errors.lastDay)}</strong>
            {data.errors.bySource.map((e) => <p className="muted" key={e.source}><bdi dir="ltr">{e.source}</bdi>: {n(e.count)}</p>)}
          </div>
          <div className="panel stat">
            <span>{tx("usage")}</span> <strong>{n(data.usage.untokenizedTextRequests30d)}</strong>
          </div>
          <div className="panel stat">
            <span>{tx("rates")}</span>
            {data.rates.map((r) => <p key={r.target}><bdi dir="ltr">{r.target}</bdi> {badge(r.verdict)} <span className="muted">{r.validUntil ? `${tx("validUntil")} ${when(r.validUntil)}` : tx("missing")}</span></p>)}
          </div>
        </div>
      )}
      {trials && (
        <div className="panel">
          <h3>{tx("trials")}</h3>
          {trials.map((t) => (
            <div className="domain-card row-between" key={t.module}>
              <span><bdi dir="ltr">{t.module}</bdi> · {t.offered ? `${tx("offered")}: ${n(t.uses)}${t.limit ? " × " + t.limit : ""}` : tx("notOffered")}</span>
              {t.configureAt && <a className="btn" href={t.configureAt}>{tx("configure")}</a>}
            </div>
          ))}
        </div>
      )}
      {data && <p className="fine-print">{when(data.checkedAt)}</p>}
    </section>
  );
}
