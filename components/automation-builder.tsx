"use client";
import { useState } from "react";
import { useApp } from "./providers";
import { Button } from "./ui";

/**
 * One Automation Builder (roadmap E7) and its ready recipes (E10). A single
 * trigger → action form that writes the automation into the system that runs
 * it (Instagram comment campaigns, Instagram DM rules, CRM rules), through
 * that system's own API and checks. Nothing is sent when an automation is
 * created; it runs only on its trigger.
 */
export type BuilderTrigger = "keyword_comment" | "keyword_dm" | "stale_deal" | "no_activity_days";
type Draft = { trigger: BuilderTrigger; name: string; keyword: string; message: string; publicReply: string; link: string; days: string };
type Q = [string, string, string, string];

const L: Record<string, Q> = {
  title: ["ساخت اتوماسیون", "Build an automation", "Automation erstellen", "Otomasyon oluştur"],
  recipes: ["دستورهای آماده", "Ready recipes", "Fertige Rezepte", "Hazır tarifler"],
  recipeHint: ["یک دستور را انتخاب کنید؛ فرم پر می‌شود و قبل از ساختن می‌توانید متن را تغییر دهید.", "Pick a recipe to fill the form; edit the text before creating it.", "Wählen Sie ein Rezept; das Formular wird ausgefüllt und lässt sich vor dem Anlegen ändern.", "Bir tarif seçin; form dolar, oluşturmadan önce metni düzenleyebilirsiniz."],
  trigger: ["وقتی", "When", "Wenn", "Ne zaman"],
  name: ["نام", "Name", "Name", "Ad"],
  keyword: ["کلمهٔ کلیدی (با ویرگول جدا کنید)", "Keyword (comma-separated)", "Stichwort (durch Komma getrennt)", "Anahtar kelime (virgülle ayırın)"],
  message: ["پیام دایرکت", "DM message", "DM-Nachricht", "DM mesajı"],
  publicReply: ["پاسخ عمومی زیر کامنت (اختیاری)", "Public reply under the comment (optional)", "Öffentliche Antwort (optional)", "Yorum altına herkese açık yanıt (isteğe bağlı)"],
  link: ["لینک داخل دایرکت (اختیاری)", "Link in the DM (optional)", "Link in der DM (optional)", "DM'deki bağlantı (isteğe bağlı)"],
  days: ["بعد از چند روز", "After how many days", "Nach wie vielen Tagen", "Kaç gün sonra"],
  create: ["ساختن", "Create", "Anlegen", "Oluştur"],
  created: ["اتوماسیون ساخته شد.", "Automation created.", "Automation angelegt.", "Otomasyon oluşturuldu."],
  note: ["ساختن چیزی نمی‌فرستد؛ اتوماسیون فقط با رخ دادن «وقتی» اجرا می‌شود.", "Creating sends nothing; the automation runs only when its trigger happens.", "Das Anlegen sendet nichts; die Automation läuft erst beim Auslöser.", "Oluşturmak hiçbir şey göndermez; otomasyon yalnızca tetikleyici gerçekleşince çalışır."],
};
const TRIGGERS: Record<BuilderTrigger, [Q, Q]> = {
  keyword_comment: [["کسی زیر پست کلمهٔ کلیدی را کامنت کند", "Someone comments a keyword", "Jemand kommentiert ein Stichwort", "Biri anahtar kelimeyi yorumlarsa"], ["دایرکت بفرست", "Send a DM", "DM senden", "DM gönder"]],
  keyword_dm: [["کسی دایرکتی با کلمهٔ کلیدی بفرستد", "Someone sends a DM with a keyword", "Jemand sendet eine DM mit Stichwort", "Biri anahtar kelimeli DM gönderirse"], ["با این متن پاسخ بده", "Reply with this text", "Mit diesem Text antworten", "Bu metinle yanıtla"]],
  stale_deal: [["معامله‌ای چند روز بدون حرکت بماند", "A deal sits idle for some days", "Ein Deal steht einige Tage still", "Bir anlaşma birkaç gün beklerse"], ["کار پیگیری بساز", "Create a follow-up task", "Folgeaufgabe anlegen", "Takip görevi oluştur"]],
  no_activity_days: [["مخاطبی چند روز بدون فعالیت بماند", "A contact has no activity for some days", "Ein Kontakt ist einige Tage inaktiv", "Bir kişi birkaç gün etkinlik göstermezse"], ["کار پیگیری بساز", "Create a follow-up task", "Folgeaufgabe anlegen", "Takip görevi oluştur"]],
};

/** E10: one-click recipes, each a filled builder form. */
export const RECIPES: { id: string; title: Q; draft: (fa: boolean) => Draft }[] = [
  {
    id: "keyword_campaign",
    title: ["کمپین کلیدواژه اینستاگرام", "Instagram keyword campaign", "Instagram-Stichwortkampagne", "Instagram anahtar kelime kampanyası"],
    draft: (fa) => ({ trigger: "keyword_comment", name: fa ? "کمپین کلیدواژه" : "Keyword campaign", keyword: fa ? "لینک" : "link", message: fa ? "سلام! این هم لینکی که خواستی 👇" : "Hi! Here is the link you asked for 👇", publicReply: fa ? "لینک را در دایرکت فرستادیم 🙌" : "We sent you the link by DM 🙌", link: "", days: "3" }),
  },
  {
    id: "stale_lead",
    title: ["پیگیری لید خوابیده", "Follow up an idle lead", "Ruhenden Lead nachfassen", "Bekleyen potansiyeli takip et"],
    draft: (fa) => ({ trigger: "stale_deal", name: fa ? "پیگیری معاملهٔ راکد" : "Idle deal follow-up", keyword: "", message: "", publicReply: "", link: "", days: "3" }),
  },
  {
    id: "welcome_dm",
    title: ["خوش‌آمد به پیام‌دهندهٔ تازه", "Welcome a new messager", "Neue Nachricht begrüßen", "Yeni mesaj gönderene hoş geldin"],
    draft: (fa) => ({ trigger: "keyword_dm", name: fa ? "خوش‌آمد" : "Welcome", keyword: fa ? "سلام" : "hi, hello", message: fa ? "سلام، خوش آمدید! چطور می‌توانیم کمک کنیم؟" : "Hi and welcome! How can we help?", publicReply: "", link: "", days: "3" }),
  },
];

/** Where a draft is written, in the shape each system's own API expects. */
export function builderRequest(d: Draft): { url: string; body: Record<string, unknown> } {
  const name = d.name.trim();
  if (d.trigger === "keyword_comment") {
    const link = d.link.trim();
    return { url: "/api/social/instagram/campaigns", body: { name, keyword: d.keyword.trim(), dmMessage: d.message.trim(), ...(d.publicReply.trim() ? { publicReplyMessage: d.publicReply.trim() } : {}), ...(link ? { links: [{ label: name || link, url: link }] } : {}) } };
  }
  if (d.trigger === "keyword_dm") return { url: "/api/social/instagram/direct-rules", body: { name, triggerType: "keyword", keywords: d.keyword.trim(), response: d.message.trim() } };
  return { url: "/api/crm/automation-rules", body: { name, trigger: d.trigger, condition: { days: Math.max(1, Math.min(90, Number(d.days) || 3)) }, action: "create_task" } };
}

/** How each kind is paused or resumed, through its own system. */
export function toggleRequest(kind: string, id: string, active: boolean): { url: string; method: string; body: Record<string, unknown> } | null {
  const enc = encodeURIComponent(id);
  if (kind === "instagram_comment") return { url: `/api/social/instagram/campaigns/${enc}`, method: "PATCH", body: { isActive: active } };
  if (kind === "instagram_direct") return { url: `/api/social/instagram/direct-rules/${enc}`, method: "PATCH", body: { isActive: active } };
  if (kind === "crm") return { url: `/api/crm/automation-rules/${enc}`, method: "PUT", body: { isActive: active } };
  return null;
}

export function AutomationBuilder({ onCreated }: { onCreated: () => void }) {
  const { locale } = useApp();
  const fa = locale === "fa";
  const i = ({ fa: 0, en: 1, de: 2, tr: 3 } as Record<string, number>)[locale] ?? 1;
  const [d, setD] = useState<Draft>(RECIPES[0].draft(fa));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const instagram = d.trigger === "keyword_comment" || d.trigger === "keyword_dm";
  async function create() {
    setBusy(true);
    setStatus(null);
    try {
      const { url, body } = builderRequest(d);
      const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(typeof data.error === "string" ? data.error : String(res.status));
      setStatus({ ok: true, text: L.created[i] });
      onCreated();
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>{L.title[i]}</h3>
      <p className="muted">{L.recipeHint[i]}</p>
      <div className="chips" role="group" aria-label={L.recipes[i]}>
        {RECIPES.map((r) => <button type="button" key={r.id} onClick={() => { setD(r.draft(fa)); setStatus(null); }}>{r.title[i]}</button>)}
      </div>
      <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <label>{L.trigger[i]}
          <select value={d.trigger} onChange={set("trigger")}>
            {(Object.keys(TRIGGERS) as BuilderTrigger[]).map((t) => <option key={t} value={t}>{TRIGGERS[t][0][i]} → {TRIGGERS[t][1][i]}</option>)}
          </select>
        </label>
        <label>{L.name[i]}<input required maxLength={80} value={d.name} onChange={set("name")} /></label>
        {instagram && <label>{L.keyword[i]}<input required value={d.keyword} onChange={set("keyword")} /></label>}
        {instagram && <label className="span-2">{L.message[i]}<textarea required maxLength={1000} value={d.message} onChange={set("message")} /></label>}
        {d.trigger === "keyword_comment" && <label>{L.publicReply[i]}<input value={d.publicReply} onChange={set("publicReply")} /></label>}
        {d.trigger === "keyword_comment" && <label>{L.link[i]}<input type="url" dir="ltr" value={d.link} onChange={set("link")} /></label>}
        {!instagram && <label>{L.days[i]}<input type="number" min={1} max={90} required value={d.days} onChange={set("days")} /></label>}
        <p className="fine-print span-2">{L.note[i]}</p>
        {status && <p className="span-2" role={status.ok ? "status" : "alert"}>{status.text}</p>}
        <div className="span-2 domain-actions"><Button type="submit" variant="primary" disabled={busy}>{L.create[i]}</Button></div>
      </form>
    </section>
  );
}
