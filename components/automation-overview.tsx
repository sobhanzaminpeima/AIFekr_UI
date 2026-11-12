"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";

type Automation = { id: string; kind: string; name: string; trigger: { type: string; keywords: string[] }; condition: Record<string, unknown> | null; action: { type: string }; active: boolean; runs: number | null; manageAt: string };
type Q = [string, string, string, string];

const KIND: Record<string, Q> = {
  instagram_comment: ["کامنت به دایرکت", "Comment to DM", "Kommentar zu DM", "Yorumdan DM'e"],
  instagram_direct: ["پاسخ خودکار دایرکت", "DM auto-reply", "DM-Autoantwort", "DM otomatik yanıt"],
  crm: ["قانون CRM", "CRM rule", "CRM-Regel", "CRM kuralı"],
};
const TRIGGER: Record<string, Q> = {
  keyword_comment: ["کامنت با کلمهٔ کلیدی", "Comment with keyword", "Kommentar mit Stichwort", "Anahtar kelimeli yorum"],
  keyword_dm: ["دایرکت با کلمهٔ کلیدی", "DM with keyword", "DM mit Stichwort", "Anahtar kelimeli DM"],
  all_messages: ["هر دایرکت", "Any DM", "Jede DM", "Her DM"],
  ai_fallback: ["دایرکت بی‌پاسخ", "Unmatched DM", "Unbeantwortete DM", "Eşleşmeyen DM"],
  stale_deal: ["معاملهٔ راکد", "Idle deal", "Stillstehender Deal", "Bekleyen anlaşma"],
  new_lead: ["سرنخ جدید", "New lead", "Neuer Lead", "Yeni potansiyel"],
  stage_change: ["تغییر مرحله", "Stage change", "Phasenwechsel", "Aşama değişimi"],
  no_activity_days: ["چند روز بی‌فعالیتی", "Days without activity", "Tage ohne Aktivität", "Etkinliksiz günler"],
};
const ACTION: Record<string, Q> = {
  send_dm: ["ارسال دایرکت", "Send DM", "DM senden", "DM gönder"],
  send_dm_and_reply: ["دایرکت و پاسخ عمومی", "DM and public reply", "DM und öffentliche Antwort", "DM ve herkese açık yanıt"],
  ai_reply: ["پاسخ با هوش مصنوعی", "AI reply", "KI-Antwort", "Yapay zekâ yanıtı"],
  create_task: ["ساخت کار پیگیری", "Create follow-up task", "Folgeaufgabe anlegen", "Takip görevi oluştur"],
  send_notification: ["اعلان به مالک", "Notify owner", "Inhaber benachrichtigen", "Sahibine bildir"],
  notify_crm_agent: ["خبر به دستیار CRM", "Notify CRM agent", "CRM-Agent benachrichtigen", "CRM asistanına bildir"],
};
const UI: Record<string, Q> = {
  title: ["همهٔ اتوماسیون‌ها", "All automations", "Alle Automationen", "Tüm otomasyonlar"],
  intro: ["اتوماسیون‌های اینستاگرام و CRM در یک فهرست؛ ویرایش هر کدام در بخش خودش است.", "Instagram and CRM automations in one list; each is edited in its own section.", "Instagram- und CRM-Automationen in einer Liste; bearbeitet wird jede in ihrem Bereich.", "Instagram ve CRM otomasyonları tek listede; her biri kendi bölümünde düzenlenir."],
  empty: ["هنوز اتوماسیونی ساخته نشده است.", "No automations yet.", "Noch keine Automationen.", "Henüz otomasyon yok."],
  on: ["فعال", "On", "An", "Açık"],
  off: ["متوقف", "Paused", "Pausiert", "Duraklatıldı"],
  runs: ["اجرا", "runs", "Ausführungen", "çalışma"],
  manage: ["مدیریت", "Manage", "Verwalten", "Yönet"],
  failed: ["فهرست خوانده نشد.", "Could not load the list.", "Liste nicht ladbar.", "Liste yüklenemedi."],
};

/** E7, first slice: one surface listing every automation as trigger → action. */
export function AutomationOverview() {
  const { locale, n } = useApp();
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const tx = (q: Q | undefined, fallback: string) => q?.[i] ?? fallback;
  const [list, setList] = useState<Automation[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/automations", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { automations: Automation[] }) => setList(d.automations))
      .catch(() => setFailed(true));
  }, []);
  return (
    <section className="panel">
      <h3>{tx(UI.title, "")}</h3>
      <p className="muted">{tx(UI.intro, "")}</p>
      {failed && <p role="alert">{tx(UI.failed, "")}</p>}
      {list && !list.length && <p className="crm-empty">{tx(UI.empty, "")}</p>}
      {list?.map((a) => (
        <div className="domain-card row-between" key={a.kind + a.id}>
          <div>
            <strong>{a.name}</strong> <span className="badge">{tx(KIND[a.kind], a.kind)}</span>
            <p>
              {tx(TRIGGER[a.trigger.type], a.trigger.type)}
              {a.trigger.keywords.length > 0 && <> «{a.trigger.keywords.join("، ")}»</>}
              {" → "}
              {tx(ACTION[a.action.type], a.action.type)}
            </p>
            <p className="muted">{a.active ? tx(UI.on, "") : tx(UI.off, "")}{a.runs != null && <> · {n(a.runs)} {tx(UI.runs, "")}</>}</p>
          </div>
          <a className="btn" href={a.manageAt}>{tx(UI.manage, "")}</a>
        </div>
      ))}
    </section>
  );
}
