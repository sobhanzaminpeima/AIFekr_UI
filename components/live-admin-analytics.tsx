"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button, Empty, Icon } from "./ui";

/** Feature analytics on aifekr.com (main site /api/analytics/summary), in the design's panels. */
type Count = { type: string; _count: { type: number } };
type Summary = { featureCounts: Count[]; dau: { date: string; count: number }[]; totalUsers: number; activeLastWeek: number; sharesTotal: number; topFeaturesAllTime: Count[]; newUsersCount: number };
type Tx = [string, string, string, string];
const FEATURES: Record<string, Tx> = {
  business_doctor: ["دکتر کسب‌وکار", "Business doctor", "Business-Doktor", "İş doktoru"], content_pipeline: ["خط تولید محتوا", "Content pipeline", "Content-Pipeline", "İçerik hattı"],
  chat: ["چت AI", "AI chat", "KI-Chat", "AI sohbet"], image_generate: ["تولید تصویر", "Image generation", "Bilderstellung", "Görsel üretimi"], video_generate: ["تولید ویدئو", "Video generation", "Videoerstellung", "Video üretimi"],
  music_generate: ["تولید موسیقی", "Music generation", "Musikerstellung", "Müzik üretimi"], social_generate: ["پست شبکه اجتماعی", "Social post", "Social-Post", "Sosyal gönderi"], website_designer: ["طراح سایت", "Website designer", "Website-Designer", "Web tasarımcısı"],
  ceo_orchestrator: ["اتاق هیئت‌مدیره", "Boardroom", "Vorstandsraum", "Yönetim kurulu"], startup_builder: ["استارتاپ بیلدر", "Startup builder", "Startup-Builder", "Girişim kurucu"], seo_agent: ["ایجنت سئو", "SEO agent", "SEO-Agent", "SEO ajanı"], meeting: ["اتاق جلسه", "Meeting room", "Meetingraum", "Toplantı odası"],
};

export function LiveAdminAnalytics() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [data, setData] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try { const r = await fetch("/api/analytics/summary", { credentials: "include" }); if (!r.ok) throw Error(); setData(await r.json()); } catch { setFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const label = (type: string) => (FEATURES[type] ? tx(FEATURES[type]) : type);
  const bars = (rows: Count[]) => { const max = Math.max(1, ...rows.map((r) => r._count.type)); return rows.map((r) => (
    <div className="admin-pulse-plan" key={r.type}><span>{label(r.type)}</span><i><b style={{ width: (r._count.type / max) * 100 + "%" }} /></i><strong>{n(r._count.type)}</strong></div>
  )); };
  const peak = Math.max(1, ...(data?.dau.map((d) => d.count) ?? [1]));
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="ChartColumn" size={28} /></span>
        <div>
          <h2>{tx(["آنالیتیکس فیچرها", "Feature analytics", "Funktionsanalyse", "Özellik analitiği"])}</h2>
          <p>{tx(["کاربران چه ابزارهایی را بیشتر استفاده می‌کنند؟", "Which tools do users use most?", "Welche Werkzeuge nutzen die Nutzer am meisten?", "Kullanıcılar en çok hangi araçları kullanıyor?"])}</p>
        </div>
        <Button onClick={() => void load()}><Icon name="RefreshCw" size={16} />{tx(["بروزرسانی", "Refresh", "Aktualisieren", "Yenile"])}</Button>
      </div>
      {failed && <p role="alert">{tx(["دریافت آمار انجام نشد", "Could not load analytics", "Analyse konnte nicht geladen werden", "Analitik yüklenemedi"])}</p>}
      <div className="stats-grid">
        {([
          [tx(["کل کاربران", "Total users", "Benutzer gesamt", "Toplam kullanıcı"]), data?.totalUsers, ""],
          [tx(["فعال هفتهٔ اخیر", "Active last week", "Aktiv letzte Woche", "Geçen hafta aktif"]), data?.activeLastWeek, tx(["کاربر منحصربه‌فرد", "unique users", "eindeutige Nutzer", "tekil kullanıcı"])],
          [tx(["لینک‌های اشتراک‌گذاری‌شده", "Shared links", "Geteilte Links", "Paylaşılan bağlantılar"]), data?.sharesTotal, tx(["آنالیز + محتوا", "analyses + content", "Analysen + Inhalte", "analiz + içerik"])],
          [tx(["کاربران جدید", "New users", "Neue Nutzer", "Yeni kullanıcılar"]), data?.newUsersCount, tx(["۳۰ روز اخیر", "last 30 days", "letzte 30 Tage", "son 30 gün"])],
        ] as [string, number | undefined, string][]).map(([a, b, c]) => <div className="panel stat admin-pulse-stat" key={a}><span>{a}</span><strong>{b === undefined ? "—" : n(b)}</strong>{c && <small>{c}</small>}</div>)}
      </div>
      <div className="admin-pulse-grid">
        <div className="panel"><h3>{tx(["پرکاربردترین فیچرها (کل)", "Most used features (all time)", "Meistgenutzte Funktionen (gesamt)", "En çok kullanılan özellikler (tümü)"])}</h3>{data?.topFeaturesAllTime.length ? bars(data.topFeaturesAllTime) : data && <Empty />}</div>
        <div className="panel"><h3>{tx(["فیچرهای ۳۰ روز اخیر", "Features, last 30 days", "Funktionen, letzte 30 Tage", "Özellikler, son 30 gün"])}</h3>{data?.featureCounts.length ? bars(data.featureCounts) : data && <Empty />}</div>
        <div className="panel">
          <h3>{tx(["کاربران فعال روزانه (۱۴ روز)", "Daily active users (14 days)", "Täglich aktive Nutzer (14 Tage)", "Günlük aktif kullanıcı (14 gün)"])}</h3>
          <div className="admin-pulse-bars" role="img" aria-label={tx(["نمودار کاربران فعال روزانه", "Daily active users chart", "Diagramm täglich aktiver Nutzer", "Günlük aktif kullanıcı grafiği"])}>
            {data?.dau.map((d) => <i key={d.date} style={{ height: Math.max(3, (d.count / peak) * 100) + "%" }} title={d.date + " · " + n(d.count)} />)}
          </div>
        </div>
      </div>
    </>
  );
}
