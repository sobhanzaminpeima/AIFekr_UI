"use client";
// Live-mode versions of the public pages: same design, real aifekr.com content
// from the main site (see lib/live.ts). Purchases continue on the site's
// existing checkout pages.
import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import Link, { useSite } from "./site-link";
import { useApp } from "./providers";
import { Icon } from "./ui";
import type { Locale } from "@/lib/i18n";
import type { SiteData, SiteFeature } from "@/lib/live";

const pick = (l: Locale, fa: string, en: string, de: string, tr: string) => ({ fa, en, de, tr })[l];
const site = (s: SiteData | null) => s!;

const FEATURE_ICON: Record<string, string> = {
  "video-factory": "Clapperboard", startup: "Rocket", websites: "Globe", meetings: "Users", assistant: "MessagesSquare", agents: "Bot",
  crm: "Users", leads: "Magnet", social: "Share2", content: "Feather", "voice-studio": "AudioLines", images: "Image", video: "Clapperboard",
  voice: "Phone", accounting: "BookOpen", property: "Building2", education: "GraduationCap",
};
const CATEGORY_ACCENT = { work: "amber", create: "purple", learn: "blue" } as const;
export const featureIcon = (slug: string) => FEATURE_ICON[slug] ?? "Sparkles";

function money(locale: Locale, minor: number, currency: string) {
  const value = (minor / (currency === "IRT" ? 1 : 100)).toLocaleString(locale === "fa" ? "fa-IR" : locale);
  const unit = currency === "IRT" ? pick(locale, "تومان", "Toman", "Toman", "Toman") : currency === "TRY" ? pick(locale, "لیر", "TRY", "TRY", "TL") : currency;
  return `${value} ${unit}`;
}

const GROUPS = ["CHAT_STARTER", "BUSINESS", "STUDENT", "FITNESS"] as const;
const GROUP_PARAM = { CHAT_STARTER: "CHAT", BUSINESS: "BUSINESS", STUDENT: "STUDENT", FITNESS: "FITNESS" } as const;

/** Published packages at the site's real prices; choosing one continues on /choose-plan. */
export function LivePlans() {
  const { locale, n } = useApp();
  const data = site(useSite());
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("CHAT_STARTER");
  const labels = { CHAT_STARTER: pick(locale, "چت هوش مصنوعی", "AI Chat", "KI-Chat", "AI Sohbet"), BUSINESS: pick(locale, "بیزنس", "Business", "Business", "İşletme"), STUDENT: pick(locale, "دانشجویی", "Student", "Studium", "Öğrenci"), FITNESS: pick(locale, "فیتنس", "Fitness", "Fitness", "Fitness") };
  const rows = data.plans.filter((p) => p.category === group);
  // The package itself goes along, so /choose-plan opens with it marked.
  const choose = (code: string) => `/choose-plan?group=${GROUP_PARAM[group]}&plan=${encodeURIComponent(code)}`;
  return (
    <div className="plans-page">
      <div className="center-heading">
        <span className="eyebrow orange-text">{pick(locale, "پکیج‌ها و قیمت", "PLANS & PRICING", "PAKETE & PREISE", "PAKETLER VE FİYATLAR")}</span>
        <h1>{pick(locale, "فضای بیشتر، برای فکرهای بزرگ‌تر.", "More room for your big ideas.", "Mehr Raum für große Ideen.", "Büyük fikirlerin için daha fazla alan.")}</h1>
        <p>{pick(locale, "یک دسته را انتخاب کن، امکانات و قیمت را ببین و شروع کن. خرید یک‌باره است و تمدید خودکار ندارد.", "Choose a category, review the price and start. Purchases are one-time with no automatic renewal.", "Kategorie wählen, Preis ansehen und starten. Einmaliger Kauf ohne automatische Verlängerung.", "Bir kategori seçin, fiyatı inceleyin ve başlayın. Tek seferlik satın alma, otomatik yenileme yok.")}</p>
        <div className="chips" role="group" aria-label={pick(locale, "دستهٔ پکیج", "Package category", "Paketkategorie", "Paket kategorisi")}>
          {GROUPS.map((g) => <button key={g} className={group === g ? "selected" : ""} aria-pressed={group === g} onClick={() => setGroup(g)}>{labels[g]}</button>)}
        </div>
      </div>
      <div className="pricing-grid">
        {group === "CHAT_STARTER" && (
          <article className="panel plan-card">
            <span className="icon-chip blue"><Icon name="Feather" size={27} /></span>
            <h2>{pick(locale, "رایگان", "Free", "Kostenlos", "Ücretsiz")}</h2>
            <p>{pick(locale, "شروع با سهمیهٔ رایگان روزانه؛ بدون پرداخت", "Start with a daily free allowance. No payment.", "Mit täglichem Freikontingent starten. Ohne Zahlung.", "Günlük ücretsiz hakla başlayın. Ödeme yok.")}</p>
            <strong className="plan-price">{n(0)}</strong>
            <Link href="/register" className="btn full">{pick(locale, "رایگان شروع کن", "Start free", "Kostenlos starten", "Ücretsiz başlayın")}<Icon name="ArrowLeft" size={17} /></Link>
          </article>
        )}
        {rows.map((p) => (
          <article key={p.code} className={`panel plan-card ${p.featured ? "recommended" : ""}`}>
            {p.featured && <span className="recommended-tag">{pick(locale, "پیشنهاد ای آی فکر", "RECOMMENDED", "EMPFOHLEN", "ÖNERİLEN")}</span>}
            <span className="icon-chip orange"><Icon name={group === "FITNESS" ? "Dumbbell" : group === "STUDENT" ? "GraduationCap" : group === "BUSINESS" ? "Building2" : "Sparkles"} size={27} /></span>
            <h2>{p.name}</h2>
            <strong className="plan-price">{money(locale, p.minor, p.currency)}</strong>
            <small>{n(p.days)} {pick(locale, "روز", "days", "Tage", "gün")} · {n(p.credits)} {pick(locale, "کردیت", "credits", "Credits", "kredi")}</small>
            <a href={choose(p.code)} className={`btn full ${p.featured ? "primary" : ""}`}>{pick(locale, "انتخاب و ادامه", "Choose and continue", "Wählen und weiter", "Seçin ve devam edin")}<Icon name="ArrowLeft" size={17} /></a>
            <ul>
              {(group === "CHAT_STARTER" ? [pick(locale, "چت متنی، تاریخچه و ذخیرهٔ گفتگوها", "Text chat, history and saved conversations", "Textchat, Verlauf und gespeicherte Gespräche", "Metin sohbeti, geçmiş ve kayıtlı konuşmalar")] : p.features).concat(pick(locale, "خرید یک‌باره؛ بدون تمدید خودکار", "One-time purchase; no automatic renewal", "Einmaliger Kauf; keine automatische Verlängerung", "Tek seferlik satın alma; otomatik yenileme yok")).map((f) => <li key={f}><Icon name="Check" size={16} />{f}</li>)}
            </ul>
          </article>
        ))}
      </div>
      {!rows.length && group !== "CHAT_STARTER" && <p className="explorer-empty" role="status">{pick(locale, "پکیج منتشرشده‌ای در این بخش موجود نیست.", "No published package in this category.", "Keine veröffentlichten Pakete in dieser Kategorie.", "Bu kategoride yayınlanmış paket yok.")}</p>}
      <LiveFAQ />
    </div>
  );
}

export function LiveFAQ() {
  const { locale } = useApp();
  const data = site(useSite());
  return (
    <section className="faq">
      <h2>{pick(locale, "شاید سؤال تو هم باشد", "A few things you might be wondering", "Häufige Fragen", "Sık sorulan sorular")}</h2>
      {data.faq.map((f) => <details key={f.q}><summary>{f.q}<Icon name="Plus" size={17} /></summary><p>{f.a}</p></details>)}
    </section>
  );
}

/** "Know before you create" with the site's configured credit costs. */
export function LiveCreditCalculator() {
  const { locale, n, t } = useApp();
  const data = site(useSite());
  const [credits, setCredits] = useState(100);
  const { imageStandard, video5s } = data.costs;
  return (
    <div className="panel calculator">
      <div>
        <span className="eyebrow orange-text">{data.copy.credits}</span>
        <h2>{pick(locale, "قبل از ساخت، بدان.", "Know before you create.", "Vor dem Erstellen wissen.", "Oluşturmadan önce bil.")}</h2>
        <p>{data.copy.creditsDesc}</p>
      </div>
      <div>
        <label>
          {n(credits)} {t("credits")}
          <input type="range" min="100" max="2000" step="100" value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
        </label>
        <p>≈ {n(imageStandard > 0 ? Math.floor(credits / imageStandard) : 0)} {pick(locale, "تصویر استاندارد", "standard images", "Standardbilder", "standart görsel")} {pick(locale, "یا", "or", "oder", "veya")} {n(video5s > 0 ? Math.floor(credits / video5s) : 0)} {pick(locale, "ویدیوی ۵ ثانیه‌ای", "5-second videos", "5-Sekunden-Videos", "5 saniyelik video")}</p>
      </div>
    </div>
  );
}

function FeatureCard({ f }: { f: SiteFeature }) {
  const { locale, n } = useApp();
  return (
    <Link href={`/features/${f.slug}`} className="explorer-card">
      <span className={`icon-chip ${CATEGORY_ACCENT[f.category]}`}><Icon name={featureIcon(f.slug)} size={25} /></span>
      <h3>{f.title}</h3>
      <p>{f.desc}</p>
      <div><span>{n(f.items.length)} {pick(locale, "قابلیت", "capabilities", "Funktionen", "özellik")}</span><Icon name="ArrowUpLeft" size={17} /></div>
    </Link>
  );
}

/** The site's real feature catalog, searchable, by category. */
export function LiveModuleExplorer() {
  const { locale } = useApp();
  const data = site(useSite());
  const [group, setGroup] = useState<SiteFeature["category"]>("work");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = data.features.filter((f) => f.category === group && (f.title + " " + f.desc).toLowerCase().includes(q));
  return (
    <section className="public-section landing-explorer" id="all-tools">
      <div className="explorer-heading">
        <div>
          <span className="eyebrow orange-text">AIFekr / {pick(locale, "ابزارها", "TOOLKIT", "WERKZEUGE", "ARAÇLAR")}</span>
          <h2>{pick(locale, "فضای مناسب کارت را پیدا کن.", "Find the right workspace for your work.", "Den passenden Arbeitsbereich finden.", "İşin için doğru alanı bul.")}</h2>
          <p>{pick(locale, "هر ماژول، ابزارها و شرایط استفادهٔ خودش را دارد.", "Every module has its own tools and requirements.", "Jedes Modul hat eigene Werkzeuge und Voraussetzungen.", "Her modülün kendi araçları ve gereksinimleri vardır.")}</p>
        </div>
        <label className="explorer-search">
          <Icon name="Search" size={17} />
          <input aria-label={pick(locale, "جستجوی ماژول‌ها", "Search modules", "Module suchen", "Modül ara")} placeholder={pick(locale, "دنبال چه ابزاری هستی؟", "What tool are you looking for?", "Welches Werkzeug suchen Sie?", "Hangi aracı arıyorsun?")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <div className="chips">
        {(["work", "create", "learn"] as const).map((g) => <button key={g} className={group === g ? "selected" : ""} aria-pressed={group === g} onClick={() => { setGroup(g); setQuery(""); }}>{g === "work" ? pick(locale, "کار و کسب‌وکار", "Work & business", "Arbeit & Business", "İş ve işletme") : g === "create" ? pick(locale, "خلاقیت", "Create", "Erstellen", "Üret") : pick(locale, "یادگیری", "Learn", "Lernen", "Öğren")}</button>)}
      </div>
      <div className="explorer-grid">{visible.map((f) => <FeatureCard key={f.slug} f={f} />)}</div>
      {!visible.length && <p className="explorer-empty" role="status">{pick(locale, "ابزاری با این نام در این دسته پیدا نشد.", "No matching tools in this category.", "Keine passenden Werkzeuge in dieser Kategorie.", "Bu kategoride eşleşen araç yok.")}</p>}
    </section>
  );
}

/** Three real guides for the landing page. */
export function LiveLandingGuides() {
  const { locale } = useApp();
  const data = site(useSite());
  return (
    <section className="public-section landing-guides" id="practical-guides">
      <div className="row-between">
        <div>
          <span className="eyebrow orange-text">AIFekr / {pick(locale, "راهنما", "PRACTICAL GUIDES", "LEITFÄDEN", "REHBERLER")}</span>
          <h2>{pick(locale, "از ابزار تا نتیجه، قدم‌به‌قدم.", "From tools to outcomes, step by step.", "Vom Werkzeug zum Ergebnis, Schritt für Schritt.", "Araçtan sonuca, adım adım.")}</h2>
        </div>
        <Link href="/guides" className="text-link">{pick(locale, "همه راهنماها", "All guides", "Alle Leitfäden", "Tüm rehberler")} ←</Link>
      </div>
      <div className="three-cols">
        {data.guides.slice(0, 3).map((g, i) => (
          <Link className="landing-guide-card" href={`/guides/${g.slug}`} key={g.slug}>
            <div><span>0{i + 1}</span><Icon name="BookOpen" size={26} /></div>
            <h3>{g.title}</h3>
            <p>{g.description}</p>
            <span className="text-link">{pick(locale, "خواندن راهنما", "Read guide", "Leitfaden lesen", "Rehberi oku")} ↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LiveFeaturePage({ slug }: { slug: string }) {
  const { locale } = useApp();
  const data = site(useSite());
  const f = data.features.find((x) => x.slug === slug)!;
  const related = data.guides.filter((g) => g.related.includes(f.slug)).slice(0, 3);
  return (
    <div className="public-section">
      <section className="module-hero">
        <span className="eyebrow">AIFekr / {pick(locale, "امکانات", "FEATURES", "FUNKTIONEN", "ÖZELLİKLER")}</span>
        <h1>{f.title}</h1>
        <p>{f.desc}</p>
        <div className="domain-actions">
          <Link className="btn primary" href={f.route}>{pick(locale, "شروع استفاده", "Get started", "Loslegen", "Başla")} <Icon name="ArrowLeft" size={16} /></Link>
          <Link className="btn" href="/pricing">{pick(locale, "پکیج‌ها و قیمت", "Plans & pricing", "Pakete & Preise", "Paketler ve fiyatlar")}</Link>
        </div>
      </section>
      <section className="public-module-links">
        <h2>{pick(locale, "چه کارهایی می‌توانی انجام بدهی", "What you can do", "Was Sie tun können", "Neler yapabilirsin")}</h2>
        <div className="tool-grid">
          {f.items.map((item) => <div className="panel" key={item}><span className={`icon-chip ${CATEGORY_ACCENT[f.category]}`}><Icon name={featureIcon(f.slug)} /></span><h3>{item}</h3></div>)}
        </div>
      </section>
      <section className="panel prose">
        <h2>{pick(locale, "پیش‌نیازها و محدودیت‌ها", "Requirements and limits", "Voraussetzungen und Grenzen", "Gereksinimler ve sınırlar")}</h2>
        <p>{f.requirement}</p>
      </section>
      {related.length > 0 && <section className="public-module-links"><h2>{pick(locale, "راهنماهای مرتبط", "Related guides", "Passende Leitfäden", "İlgili rehberler")}</h2><div className="tool-grid">{related.map((g) => <Link className="panel guide-card" href={`/guides/${g.slug}`} key={g.slug}><span className="icon-chip blue"><Icon name="BookOpen" size={26} /></span><h3>{g.title}</h3><p>{g.description}</p></Link>)}</div></section>}
    </div>
  );
}

export function LiveSolutionPage({ slug }: { slug: string }) {
  const { locale } = useApp();
  const data = site(useSite());
  const s = data.solutions.find((x) => x.slug === slug)!;
  const selected = data.features.filter((f) => s.modules.includes(f.slug));
  const guide = data.guides.find((g) => g.slug === s.guide);
  return (
    <div className="public-section">
      <section className="module-hero">
        <span className="eyebrow">AIFekr / {pick(locale, "راهکارها", "SOLUTIONS", "LÖSUNGEN", "ÇÖZÜMLER")}</span>
        <h1>{s.title}</h1>
        <p>{s.description}</p>
        <div className="domain-actions">
          <Link className="btn primary" href="/register">{pick(locale, "رایگان شروع کن", "Start free", "Kostenlos starten", "Ücretsiz başlayın")} <Icon name="ArrowLeft" size={16} /></Link>
          <Link className="btn" href="/pricing">{pick(locale, "پکیج‌ها و قیمت", "Plans & pricing", "Pakete & Preise", "Paketler ve fiyatlar")}</Link>
        </div>
      </section>
      <section className="public-section steps-section">
        <h2>{pick(locale, "نمونهٔ یک جریان کاری", "A practical workflow", "Ein praktischer Arbeitsablauf", "Pratik bir iş akışı")}</h2>
        <div className="three-cols">{s.steps.map((step, i) => <div key={step.title}><b>{(i + 1).toLocaleString(locale === "fa" ? "fa-IR" : locale).padStart(2, locale === "fa" ? "۰" : "0")}</b><h3>{step.title}</h3><p>{step.body}</p></div>)}</div>
      </section>
      <section className="public-module-links"><h2>{pick(locale, "ابزارهای این راهکار", "Tools in this solution", "Werkzeuge dieser Lösung", "Bu çözümdeki araçlar")}</h2><div className="explorer-grid">{selected.map((f) => <FeatureCard key={f.slug} f={f} />)}</div></section>
      {guide && <Link className="contact-guide-link" href={`/guides/${guide.slug}`}><Icon name="BookOpen" /><span>{guide.title}</span><Icon name="ArrowUpLeft" size={18} /></Link>}
    </div>
  );
}

export function LiveGuides({ slug }: { slug?: string }) {
  const { locale } = useApp();
  const data = site(useSite());
  const [query, setQuery] = useState("");
  const guide = slug ? data.guides.find((g) => g.slug === slug)! : null;
  const updated = new Date(data.guidesUpdatedAt).toLocaleDateString(locale === "fa" ? "fa-IR" : locale, { dateStyle: "medium" });
  if (guide) {
    const tools = data.features.filter((f) => guide.related.includes(f.slug));
    return (
      <div className="public-section editorial-page">
        <Link className="text-link" href="/guides">{pick(locale, "همهٔ راهنماها", "All guides", "Alle Leitfäden", "Tüm rehberler")}</Link>
        <header className="editorial-hero">
          <span className="icon-chip blue"><Icon name="BookOpen" size={32} /></span>
          <h1>{guide.title}</h1>
          <p>{guide.description}</p>
          <small>{pick(locale, "به‌روزرسانی:", "Updated:", "Aktualisiert:", "Güncellendi:")} {updated}</small>
        </header>
        <div className="editorial-layout">
          <nav className="panel editorial-toc" aria-label={pick(locale, "فهرست راهنما", "Guide contents", "Inhaltsverzeichnis", "Rehber içeriği")}>
            <strong>{pick(locale, "در این راهنما", "In this guide", "In diesem Leitfaden", "Bu rehberde")}</strong>
            {guide.sections.map((s, i) => <a key={i} href={`#step-${i + 1}`}><span>0{i + 1}</span>{s.title}</a>)}
          </nav>
          <article className="panel editorial-document">
            {guide.sections.map((s, i) => <section id={`step-${i + 1}`} key={i}><span className="eyebrow">0{i + 1}</span><h2>{s.title}</h2><p>{s.body}</p></section>)}
          </article>
        </div>
        {tools.length > 0 && <section className="public-module-links"><h2>{pick(locale, "ابزارهای این مسیر", "Tools for this workflow", "Tools für diesen Ablauf", "Bu akışın araçları")}</h2><div className="explorer-grid">{tools.map((f) => <FeatureCard key={f.slug} f={f} />)}</div></section>}
      </div>
    );
  }
  const q = query.trim().toLowerCase();
  return (
    <div className="public-section editorial-page">
      <header className="editorial-hero center">
        <span className="eyebrow">AIFekr / {pick(locale, "راهنما", "GUIDES", "LEITFÄDEN", "REHBERLER")}</span>
        <h1>{pick(locale, "راهنمای کاربردی هوش مصنوعی برای کار و مطالعه", "Practical AI guides for work and study", "Praktische KI-Leitfäden für Arbeit und Studium", "İş ve öğrenim için uygulamalı yapay zekâ rehberleri")}</h1>
        <input className="guide-search" aria-label={pick(locale, "جستجوی راهنما", "Search guides", "Leitfäden suchen", "Rehber ara")} placeholder={pick(locale, "دنبال چه چیزی هستی؟", "What are you looking for?", "Wonach suchen Sie?", "Ne arıyorsun?")} value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>
      <div className="tool-grid">
        {data.guides.filter((g) => (g.title + " " + g.description).toLowerCase().includes(q)).map((g) => (
          <Link className="panel guide-card" href={`/guides/${g.slug}`} key={g.slug}>
            <span className="icon-chip blue"><Icon name="BookOpen" size={26} /></span>
            <h2>{g.title}</h2>
            <p>{g.description}</p>
            <span className="text-link">{pick(locale, "خواندن راهنما", "Read guide", "Leitfaden lesen", "Rehberi oku")} <Icon name="ArrowLeft" size={16} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Real contact details; the site has no contact form, so none is shown. */
export function LiveContact() {
  const { locale } = useApp();
  const { contact } = site(useSite());
  const items = [
    { icon: Mail, label: pick(locale, "ایمیل", "Email", "E-Mail", "E-posta"), value: contact.email, href: `mailto:${contact.email}` },
    { icon: Phone, label: pick(locale, "تلفن / واتساپ", "Phone / WhatsApp", "Telefon / WhatsApp", "Telefon / WhatsApp"), value: contact.phone, href: `tel:${contact.phone}` },
    contact.telegram ? { icon: Send, label: "Telegram", value: contact.telegram, href: `https://t.me/${contact.telegram.replace("@", "")}` } : null,
    { icon: MapPin, label: pick(locale, "آدرس", "Address", "Adresse", "Adres"), value: contact.address, href: "" },
  ].filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="public-section editorial-page">
      <header className="editorial-hero">
        <span className="eyebrow">AIFekr / {pick(locale, "تماس", "CONTACT", "KONTAKT", "İLETİŞİM")}</span>
        <h1>{pick(locale, "گفتگو، شروع\nیک امکان تازه است.", "A conversation starts\na new possibility.", "Ein Gespräch eröffnet\nneue Möglichkeiten.", "Bir sohbet\nyeni bir olanak başlatır.")}</h1>
        <p>{pick(locale, "برای پشتیبانی، همکاری یا سؤال دربارهٔ پکیج‌ها با ما در ارتباط باش.", "Reach us for support, partnerships or questions about plans.", "Kontaktieren Sie uns für Support, Partnerschaften oder Fragen zu Paketen.", "Destek, iş birliği veya paketler hakkında sorular için bize ulaşın.")}</p>
      </header>
      <div className="contact-layout">
        <div className="tool-grid">
          {items.map(({ icon: I, label, value, href }) => {
            const body = <><span className="icon-chip orange"><I size={26} strokeWidth={1.75} /></span><h3>{label}</h3><p dir="ltr">{value}</p></>;
            return href ? <a key={label} className="panel" href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel={href.startsWith("https:") ? "noopener noreferrer" : undefined}>{body}</a> : <div key={label} className="panel">{body}</div>;
          })}
        </div>
        <Link className="contact-guide-link" href="/guides"><Icon name="BookOpen" /><span>{pick(locale, "پاسخ را در راهنماها جستجو کن", "Find answers in the guides", "Antworten in den Leitfäden finden", "Cevapları rehberlerde bul")}</span><Icon name="ArrowUpLeft" size={18} /></Link>
      </div>
    </div>
  );
}
