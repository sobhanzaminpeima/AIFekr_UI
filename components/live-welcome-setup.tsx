"use client";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import type { Locale } from "@/lib/i18n";

/**
 * The established welcome wizard (plan purchases, student and fitness
 * accounts): language, then three questions, then the server decides where
 * to go next (checkout for a chosen plan). Same API and answers as before.
 */
type Option = { id: string; emoji?: string; label: [string, string, string, string] };
const L: Record<Locale, number> = { fa: 0, en: 1, de: 2, tr: 3 };
const BUSINESS: Option[] = [
  { id: "student", emoji: "🎓", label: ["دانشجو / یادگیرنده", "Student / learner", "Studierende / Lernende", "Öğrenci / öğrenen"] },
  { id: "real_estate", emoji: "🏠", label: ["املاک / مشاور املاک", "Real estate / property", "Immobilien / Makler", "Emlak / gayrimenkul"] },
  { id: "fitness", emoji: "💪", label: ["ورزش / فیتنس", "Fitness / sport", "Fitness / Sport", "Fitness / spor"] },
  { id: "retail", emoji: "🛍️", label: ["فروشگاه / خرده‌فروشی", "Shop / retail", "Laden / Einzelhandel", "Mağaza / perakende"] },
  { id: "services", emoji: "💼", label: ["خدمات / مشاوره", "Services / consulting", "Dienstleistung / Beratung", "Hizmet / danışmanlık"] },
  { id: "restaurant", emoji: "☕", label: ["رستوران / کافه", "Restaurant / café", "Restaurant / Café", "Restoran / kafe"] },
  { id: "tech", emoji: "💻", label: ["فناوری / نرم‌افزار", "Technology / software", "Technologie / Software", "Teknoloji / yazılım"] },
  { id: "production", emoji: "🏭", label: ["تولید / صنعت", "Manufacturing / industry", "Produktion / Industrie", "Üretim / sanayi"] },
  { id: "other", emoji: "✨", label: ["سایر", "Something else", "Sonstiges", "Diğer"] },
];
const GOALS: Option[] = [
  { id: "study", emoji: "📚", label: ["مطالعه، درس و آمادگی امتحان", "Study, courses and exam prep", "Lernen, Kurse und Prüfungsvorbereitung", "Ders, çalışma ve sınav hazırlığı"] },
  { id: "content", emoji: "✍️", label: ["تولید محتوا و مقاله", "Content and article writing", "Content- und Artikelerstellung", "İçerik ve makale yazımı"] },
  { id: "analysis", emoji: "📊", label: ["آنالیز و مشاوره کسب‌وکار", "Business analysis and advice", "Geschäftsanalyse und Beratung", "İş analizi ve danışmanlık"] },
  { id: "social", emoji: "📱", label: ["مدیریت شبکه اجتماعی", "Social media management", "Social-Media-Management", "Sosyal medya yönetimi"] },
  { id: "startup", emoji: "🚀", label: ["ساخت استارتاپ / ایده", "Building a startup or idea", "Ein Startup oder eine Idee aufbauen", "Girişim veya fikir geliştirme"] },
  { id: "chat", emoji: "🤖", label: ["دستیار هوشمند برای سوالات", "A smart assistant for questions", "Ein intelligenter Assistent für Fragen", "Sorular için akıllı asistan"] },
  { id: "image", emoji: "🎨", label: ["تولید تصویر و ویدئو", "Image and video generation", "Bild- und Videoerstellung", "Görsel ve video oluşturma"] },
];
const EXPERIENCE: Option[] = [
  { id: "none", label: ["تازه‌کار — هرگز از AI استفاده نکردم", "New to this — I have never used AI", "Neu dabei — ich habe noch nie KI genutzt", "Yeni başladım — hiç yapay zekâ kullanmadım"] },
  { id: "some", label: ["کمی آشنا — ChatGPT را امتحان کردم", "Somewhat familiar — I have tried ChatGPT", "Etwas vertraut — ich habe ChatGPT ausprobiert", "Biraz biliyorum — ChatGPT denedim"] },
  { id: "pro", label: ["حرفه‌ای — به طور منظم از AI استفاده می‌کنم", "Experienced — I use AI regularly", "Erfahren — ich nutze KI regelmäßig", "Deneyimliyim — düzenli kullanıyorum"] },
];
const LANGS: [Locale, string, string][] = [["fa", "فارسی", "ورود به فضای کار به زبان فارسی"], ["en", "English", "Enter your workspace in English"], ["de", "Deutsch", "Arbeitsbereich auf Deutsch öffnen"], ["tr", "Türkçe", "Çalışma alanına Türkçe gir"]];

export function LiveWelcomeSetup() {
  const { locale } = useApp();
  const i = L[locale] ?? 1;
  const t = (copy: [string, string, string, string]) => copy[i];
  const [languageChosen, setLanguageChosen] = useState(true);
  const [language, setLanguage] = useState<Locale>(locale);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ businessType: "", goal: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setLanguageChosen(new URLSearchParams(location.search).get("langChosen") === "1"); }, []);

  async function chooseLanguage() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/user/profile", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }) });
      if (!response.ok) throw Error("");
      const q = new URLSearchParams(location.search); q.set("langChosen", "1");
      location.assign(location.pathname + "?" + q.toString());
    } catch { setError(t(["ذخیرهٔ زبان انجام نشد؛ دوباره تلاش کنید.", "Could not save the language. Please retry.", "Sprache konnte nicht gespeichert werden.", "Dil kaydedilemedi. Tekrar deneyin."])); setBusy(false); }
  }
  async function finish(experience: string) {
    setBusy(true); setError("");
    try {
      const q = new URLSearchParams(location.search);
      const response = await fetch("/api/user/onboarding", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...answers, experience, selectedPlan: q.get("plan"), period: q.get("period") }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(data.error || "");
      location.assign(data.redirect || "/home");
    } catch (e) { setError((e instanceof Error && e.message) || t(["خطا در ارتباط با سرور", "Connection failed", "Verbindung fehlgeschlagen", "Bağlantı başarısız"])); setBusy(false); }
  }

  if (!languageChosen) return (
    <main className="welcome-setup" id="main">
      <section className="welcome-card">
        <h1>{t(["زبان فضای کارت را انتخاب کن", "Choose your workspace language", "Wähle die Sprache deines Arbeitsbereichs", "Çalışma alanının dilini seç"])}</h1>
        <div className="welcome-options">
          {LANGS.map(([code, name, hint]) => (
            <button key={code} type="button" aria-pressed={language === code} onClick={() => setLanguage(code)}>
              <strong>{name}</strong><small>{hint}</small>
            </button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="btn primary full" disabled={busy} onClick={() => void chooseLanguage()}>{t(["ادامه", "Continue", "Weiter", "Devam et"])}</button>
      </section>
    </main>
  );

  const steps = [
    { question: t(["کدام گزینه بیشتر شما را توصیف می‌کند؟", "Which best describes you?", "Was beschreibt Sie am besten?", "Sizi en iyi hangisi tanımlar?"]), options: BUSINESS, key: "businessType" as const },
    { question: t(["بیشتر می‌خواید از AIFekr برای چه کاری استفاده کنید؟", "What do you mainly want to use AIFekr for?", "Wofür möchten Sie AIFekr hauptsächlich nutzen?", "AIFekr'i en çok ne için kullanmak istiyorsunuz?"]), options: GOALS, key: "goal" as const },
    { question: t(["تجربه شما با هوش مصنوعی چقدر است؟", "How much experience do you have with AI?", "Wie viel Erfahrung haben Sie mit KI?", "Yapay zekâ deneyiminiz ne kadar?"]), options: EXPERIENCE, key: "experience" as const },
  ];
  const current = steps[step];
  function select(id: string) {
    if (current.key === "experience") return void finish(id);
    setAnswers((a) => ({ ...a, [current.key]: id }));
    setStep(step + 1);
  }
  return (
    <main className="welcome-setup" id="main">
      <section className="welcome-card">
        <div className="welcome-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((_, n) => <i key={n} className={n <= step ? "on" : ""} />)}
        </div>
        <h1>{current.question}</h1>
        <div className="welcome-options">
          {current.options.map((o) => (
            <button key={o.id} type="button" disabled={busy} onClick={() => select(o.id)}>
              {o.emoji && <span aria-hidden="true">{o.emoji}</span>}<strong>{t(o.label)}</strong>
            </button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="welcome-foot">
          {step > 0 && <button type="button" className="text-link" disabled={busy} onClick={() => setStep(step - 1)}>{t(["مرحلهٔ قبل", "Back", "Zurück", "Geri"])}</button>}
          <button type="button" className="text-link" disabled={busy} onClick={() => void finish("skip")}>{t(["رد کردن و ورود به داشبورد", "Skip and go to the dashboard", "Überspringen und zum Dashboard", "Atla ve panele git"])}</button>
        </div>
        <small className="welcome-note">{t(["این اطلاعات فقط برای راهنمایی بهتر استفاده می‌شود", "This is only used to guide you better", "Diese Angaben dienen nur einer besseren Beratung", "Bu bilgiler yalnızca daha iyi yönlendirme için kullanılır"])}</small>
      </section>
    </main>
  );
}
