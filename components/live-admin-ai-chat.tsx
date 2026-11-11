"use client";
import Link from "@/components/site-link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";

/**
 * Independent AI chat policy on aifekr.com (main site /api/admin/ai-chat):
 * the classic page's fields, ranges and single save. Private conversation
 * content is never shown here. The server validates the policy (policySchema).
 */
type Policy = { enabled: boolean; guestTurns: number; guestTtlHours: number; registeredFreeDaily: number; creditsPerTurn: number; dailyRequests: number; dailyBudgetUsd: number; modelId: string; discoveryEnabled: boolean; discoveryThreshold: number; discoveryFrequency: number; disabledModules: string[] };
type Data = { policy: Policy; metrics: { guests: number; converted: number; chatOnly: number; statuses: { status: string; _count: { _all: number } }[]; usage: { _sum: { credits: number | null; costUsd: number | null }; _count: { _all: number } }; discovery: { action: string; _count: { _all: number } }[] }; modules: string[]; providers: { id: string; name: string; model: string; enabled: boolean }[] };
type Tx = [string, string, string, string];

export function LiveAiChatPolicy() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  useEffect(() => { fetch("/api/admin/ai-chat", { credentials: "include" }).then(async (r) => { if (!r.ok) throw Error(); setData(await r.json()); }).catch(() => setFailed(true)); }, []);
  const update = (p: Partial<Policy>) => data && setData({ ...data, policy: { ...data.policy, ...p } });
  async function save() {
    if (!data) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/ai-chat", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.policy) });
      if (!r.ok) throw Error();
      toast.success(tx(["تنظیمات چت ذخیره شد", "Chat settings saved", "Chat-Einstellungen gespeichert", "Sohbet ayarları kaydedildi"]));
    } catch { toast.error(tx(["ذخیره انجام نشد؛ مقادیر را بررسی کنید و دوباره تلاش کنید.", "Could not save; check the values and retry.", "Speichern fehlgeschlagen; Werte prüfen.", "Kaydedilemedi; değerleri kontrol edin."])); }
    finally { setBusy(false); }
  }
  const numbers: [keyof Policy, Tx, number, number, number][] = [
    ["guestTurns", ["پیام رایگان مهمان", "Free guest turns", "Kostenlose Gastnachrichten", "Ücretsiz misafir mesajları"], 0, 10, 1],
    ["guestTtlHours", ["نگهداری مهمان · ساعت", "Guest retention · hours", "Gastaufbewahrung · Stunden", "Misafir saklama · saat"], 1, 168, 1],
    ["registeredFreeDaily", ["سهمیه رایگان روزانه حساب", "Daily account free turns", "Tägliche kostenlose Nachrichten", "Günlük ücretsiz hesap mesajları"], 0, 100, 1],
    ["creditsPerTurn", ["کردیت هر پیام موفق پس از سهمیه", "Credits per success after allowance", "Credits je Erfolg nach Kontingent", "Hak sonrası başarılı mesaj kredisi"], 1, 100, 1],
    ["dailyRequests", ["سقف درخواست کل روزانه", "Global daily request cap", "Globales Tageslimit", "Genel günlük istek sınırı"], 1, 10000, 1],
    ["dailyBudgetUsd", ["بودجه API روزانه · دلار", "Daily API budget · USD", "API-Tagesbudget · USD", "Günlük API bütçesi · USD"], 0.05, 1000, 0.05],
  ];
  const m = data?.metrics;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="MessagesSquare" size={28} /></span>
        <div>
          <h2>{tx(["مدیریت چت هوش مصنوعی", "AI Chat management", "KI-Chat-Verwaltung", "AI Sohbet yönetimi"])}</h2>
          <p>{tx(["چت مستقل، سهمیهٔ مهمان، اعتبار و پیشنهاد اختیاری ماژول‌ها. محتوای خصوصی گفتگوها در این صفحه نمایش داده نمی‌شود.", "Independent chat, guest quotas, credits and optional discovery. Private conversation content is not displayed here.", "Unabhängiger Chat, Gastkontingente, Credits und optionale Empfehlungen. Private Chatinhalte werden hier nicht angezeigt.", "Bağımsız sohbet, misafir kotaları, krediler ve isteğe bağlı keşif. Özel sohbet içerikleri burada gösterilmez."])}</p>
        </div>
        <Link className="btn" href="/chat">AIFekr AI Chat ↗</Link>
      </div>
      <nav className="module-tabs">
        {([["overview", ["نمای کلی", "Overview", "Übersicht", "Genel bakış"]], ["policy", ["سهمیه و هزینه", "Quotas & costs", "Kontingente & Kosten", "Kotalar ve maliyet"]], ["discovery", ["پیشنهاد ماژول‌ها", "Module discovery", "Modulempfehlungen", "Modül keşfi"]]] as [string, Tx][]).map(([id, label]) => (
          <button key={id} className={tab === id ? "selected" : ""} aria-pressed={tab === id} onClick={() => setTab(id)}>{tx(label)}</button>
        ))}
      </nav>
      {failed && <p role="alert">{tx(["بارگذاری انجام نشد؛ دوباره تلاش کنید.", "Could not load. Please retry.", "Laden fehlgeschlagen.", "Yüklenemedi."])}</p>}
      {data && tab === "overview" && (
        <>
          <div className="stats-grid">
            {([[tx(["مهمان‌ها · ۷ روز", "Guests · 7 days", "Gäste · 7 Tage", "Misafirler · 7 gün"]), m!.guests], [tx(["انتقال موفق به حساب", "Merged into accounts", "In Konten übernommen", "Hesaplara aktarılan"]), m!.converted], [tx(["حساب فقط چت", "Chat-only accounts", "Nur-Chat-Konten", "Yalnız sohbet hesapları"]), m!.chatOnly], [tx(["کردیت مصرف‌شده · ۷ روز", "Credits used · 7 days", "Verwendete Credits · 7 Tage", "Kullanılan kredi · 7 gün"]), m!.usage._sum.credits ?? 0]] as [string, number][]).map(([a, b]) => <div className="panel stat" key={a}><span>{a}</span><strong>{n(b)}</strong></div>)}
          </div>
          <div className="admin-pulse-grid">
            <div className="panel">
              <h3>{tx(["نتیجهٔ درخواست‌ها · ۷ روز", "Request results · 7 days", "Anfrageergebnisse · 7 Tage", "İstek sonuçları · 7 gün"])}</h3>
              {m!.statuses.map((s) => <div className="admin-pulse-plan" key={s.status}><span dir="ltr">{s.status}</span><i><b style={{ width: Math.min(100, (s._count._all / Math.max(1, ...m!.statuses.map((x) => x._count._all))) * 100) + "%" }} /></i><strong>{n(s._count._all)}</strong></div>)}
              <p className="fine-print" dir="ltr">≈ ${(m!.usage._sum.costUsd ?? 0).toFixed(4)} API</p>
            </div>
            <div className="panel">
              <h3>{tx(["مدل‌های چت", "Chat models", "Chat-Modelle", "Sohbet modelleri"])}</h3>
              {data.providers.map((p) => <div className="activity-item" key={p.id}><Icon name="Bot" size={16} /><div><strong>{p.name}</strong><p dir="ltr">{p.model}</p></div><span className={"badge " + (p.enabled ? "green" : "")}>{p.enabled ? tx(["فعال", "Enabled", "Aktiv", "Etkin"]) : tx(["غیرفعال", "Disabled", "Inaktiv", "Kapalı"])}</span></div>)}
            </div>
          </div>
        </>
      )}
      {data && tab === "policy" && (
        <form className="panel admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label className="toggle-row"><span>{tx(["فعال‌سازی چت مستقل", "Enable independent chat", "Unabhängigen Chat aktivieren", "Bağımsız sohbeti etkinleştir"])}</span><input type="checkbox" checked={data.policy.enabled} onChange={(e) => update({ enabled: e.target.checked })} /></label>
          <div className="domain-fields">
            {numbers.map(([key, label, min, max, step]) => <label key={key}>{tx(label)}<input type="number" dir="ltr" min={min} max={max} step={step} value={data.policy[key] as number} onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<Policy>)} /></label>)}
          </div>
          <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
        </form>
      )}
      {data && tab === "discovery" && (
        <form className="panel admin-package-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <label className="toggle-row"><span>{tx(["پیشنهاد اختیاری ماژول‌ها در چت", "Optional module suggestions in chat", "Optionale Modulvorschläge im Chat", "Sohbette isteğe bağlı modül önerileri"])}</span><input type="checkbox" checked={data.policy.discoveryEnabled} onChange={(e) => update({ discoveryEnabled: e.target.checked })} /></label>
          <div className="domain-fields">
            <label>{tx(["حداقل اطمینان (۰٫۵ تا ۱)", "Minimum confidence (0.5–1)", "Mindestvertrauen (0,5–1)", "Asgari güven (0,5–1)"])}<input type="number" dir="ltr" min={0.5} max={1} step={0.05} value={data.policy.discoveryThreshold} onChange={(e) => update({ discoveryThreshold: +e.target.value })} /></label>
            <label>{tx(["حداقل فاصلهٔ پیشنهاد · پاسخ موفق", "Minimum spacing · successful answers", "Mindestabstand · erfolgreiche Antworten", "Asgari aralık · başarılı yanıtlar"])}<input type="number" dir="ltr" min={1} max={20} value={data.policy.discoveryFrequency} onChange={(e) => update({ discoveryFrequency: +e.target.value })} /></label>
          </div>
          <fieldset className="admin-checks"><legend>{tx(["ماژول‌هایی که پیشنهاد می‌شوند", "Modules that may be suggested", "Vorschlagbare Module", "Önerilebilecek modüller"])}</legend>
            {data.modules.map((mod) => <label key={mod}><input type="checkbox" checked={!data.policy.disabledModules.includes(mod)} onChange={(e) => update({ disabledModules: e.target.checked ? data.policy.disabledModules.filter((x) => x !== mod) : [...data.policy.disabledModules, mod] })} /><span dir="ltr">{mod}</span></label>)}
          </fieldset>
          {data.metrics.discovery.length > 0 && <p className="fine-print">{data.metrics.discovery.map((d) => d.action + ": " + n(d._count._all)).join(" · ")}</p>}
          <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
        </form>
      )}
    </>
  );
}
