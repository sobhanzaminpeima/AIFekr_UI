"use client";
// First step on the home page for an account that has not made anything yet
// (production 2026-11-06: 59% of sign-ups never ran a single action, while
// those who did got a first result in about five minutes). Three one-tap
// starts, the account's real credit balance, and nothing that is not true:
// the Voice Studio samples and the Live first minute are the platform's own
// free allowances. Closed for good with "later"; gone once there is activity.
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./ui";
import { growthEvent } from "./growth-tracker";

const KEY = "aifekr-first-step-dismissed";
const L = ["fa", "en", "de", "tr"] as const;
const COPY = {
  eyebrow: ["اولین قدم", "Your first step", "Ihr erster Schritt", "İlk adımın"],
  title: ["در چند دقیقه اولین نتیجه‌ات را بگیر", "Get your first result in a few minutes", "Ihr erstes Ergebnis in wenigen Minuten", "Birkaç dakikada ilk sonucunu al"],
  credits: ["{n} اعتبار داری؛ یکی از این‌ها را امتحان کن.", "You have {n} credits; try one of these.", "Sie haben {n} Credits; probieren Sie eins davon.", "{n} kredin var; bunlardan birini dene."],
  voice: ["اولین صدای خودت را بساز", "Make your first voice", "Ihre erste Stimme erzeugen", "İlk sesini oluştur"],
  voiceNote: ["متن بنویس، صدای طبیعی بگیر · نمونهٔ رایگان", "Type text, get a natural voice · free sample", "Text eingeben, natürliche Stimme · Gratis-Probe", "Metin yaz, doğal ses al · ücretsiz örnek"],
  live: ["با AIFekr Live حرف بزن", "Talk with AIFekr Live", "Mit AIFekr Live sprechen", "AIFekr Live ile konuş"],
  liveNote: ["گفتگوی صوتی با هوش مصنوعی · دقیقهٔ اول رایگان", "Voice conversation with AI · first minute free", "Sprachgespräch mit KI · erste Minute gratis", "Yapay zekâyla sesli sohbet · ilk dakika ücretsiz"],
  chat: ["از هوش مصنوعی بپرس", "Ask the AI anything", "Fragen Sie die KI", "Yapay zekâya sor"],
  chatNote: ["متن، ایده، ترجمه و برنامه‌ریزی", "Writing, ideas, translation and planning", "Texte, Ideen, Übersetzung, Planung", "Metin, fikir, çeviri ve planlama"],
  later: ["بعداً", "Later", "Später", "Sonra"],
} as const;

export function FirstStep({ isNew, credits }: { isNew: boolean; credits: number }) {
  const { locale, n } = useApp();
  const say = (k: keyof typeof COPY) => COPY[k][Math.max(0, L.indexOf(locale as (typeof L)[number]))];
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let dismissed = "";
    try { dismissed = localStorage.getItem(KEY) || ""; } catch { /* private mode */ }
    setHidden(!!dismissed);
  }, []);
  if (!isNew || hidden) return null;
  const go = (moduleId: string) => growthEvent("onboarding_step_completed", { moduleId, metadata: { step: "home_first_step" } });
  const items = [
    { href: "/voice-studio", icon: "AudioLines", title: say("voice"), note: say("voiceNote"), id: "voice-studio" },
    { href: "/live", icon: "Mic", title: say("live"), note: say("liveNote"), id: "live" },
    { href: "/chat", icon: "MessagesSquare", title: say("chat"), note: say("chatNote"), id: "chat" },
  ];
  return (
    <section className="first-step" aria-labelledby="first-step-title">
      <div className="first-step-head">
        <div>
          <span className="eyebrow orange-text"><Icon name="Sparkles" size={14} /> {say("eyebrow")}</span>
          <h2 id="first-step-title">{say("title")}</h2>
          <p className="muted">{say("credits").replace("{n}", n(credits))}</p>
        </div>
        <button className="btn ghost" onClick={() => { setHidden(true); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ } }}>{say("later")}</button>
      </div>
      <div className="first-step-grid">
        {items.map((i) => (
          // Full page loads: these are pages of the main site.
          <a key={i.id} className="first-step-card" href={i.href} onClick={() => go(i.id)}>
            <span className="icon-chip orange"><Icon name={i.icon} size={22} /></span>
            <span className="first-step-text"><strong>{i.title}</strong><small>{i.note}</small></span>
            <Icon name="ArrowLeft" size={16} className="directional first-step-arrow" />
          </a>
        ))}
      </div>
    </section>
  );
}
