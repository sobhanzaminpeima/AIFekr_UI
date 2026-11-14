"use client";
// Landing section for the YouTube Video Factory. It only lists what is live:
// topic → script → image prompts → images → narration → timeline → render and
// download. It is labelled beta, makes no Google Flow or "unlimited" claims,
// and quotes the live price (500 credits per minute).
import Link from "@/components/site-link";
import { useApp } from "./providers";
import { Icon } from "./ui";

type Tx = [string, string, string, string];
const STEPS: { icon: string; t: Tx }[] = [
  { icon: "Lightbulb", t: ["موضوع و کانال", "Topic & channel", "Thema & Kanal", "Konu ve kanal"] },
  { icon: "FileText", t: ["متن کامل ویدیو", "Full script", "Vollständiges Skript", "Tam senaryo"] },
  { icon: "Image", t: ["پرامپت و تصویر همهٔ صحنه‌ها", "Prompts & images for every scene", "Prompts & Bilder für jede Szene", "Her sahne için istem ve görsel"] },
  { icon: "AudioLines", t: ["صدای گوینده", "Narration", "Sprecherstimme", "Seslendirme"] },
  { icon: "SlidersHorizontal", t: ["تایم‌لاین و هم‌زمانی با صدا", "Timeline synced to the voice", "Zeitleiste synchron zur Stimme", "Sese eşitlenmiş zaman çizelgesi"] },
  { icon: "Download", t: ["رندر و دانلود MP4", "Render & download MP4", "Rendern & MP4 laden", "Render ve MP4 indir"] },
];
const STYLES: Tx[] = [
  ["مستند استیکمن", "Stickman documentary", "Strichmännchen-Doku", "Çöp adam belgesel"],
  ["کاراکتر اختصاصی", "Custom character", "Eigene Figur", "Özel karakter"],
  ["مستند سینمایی", "Cinematic documentary", "Kino-Doku", "Sinematik belgesel"],
  ["روایت ترکیبی", "Hybrid storytelling", "Hybrides Erzählen", "Karma anlatım"],
];

export function LandingVideoFactory() {
  const { locale, n } = useApp();
  const tx = (c: Tx) => c[{ fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1];
  return (
    <section className="public-section landing-vf" id="youtube-video-factory" aria-labelledby="landing-vf-title">
      <div className="center-heading">
        <span className="eyebrow orange-text">{tx(["کارخانهٔ ویدیوی یوتیوب · نسخهٔ آزمایشی", "YouTube Video Factory · beta", "YouTube-Videofabrik · Beta", "YouTube Video Fabrikası · beta"])}</span>
        <h2 id="landing-vf-title">{tx(["از یک ایده، تا ویدیوی آمادهٔ انتشار.", "From one idea to a video ready to publish.", "Von einer Idee zum fertigen Video.", "Tek bir fikirden yayına hazır videoya."])}</h2>
        <p>{tx(["موضوع را بنویس؛ متن، تصویر همهٔ صحنه‌ها و صدای گوینده ساخته می‌شود. بعد در تایم‌لاین ترتیب و زمان را ویرایش کن و فایل نهایی را بگیر.",
          "Write a topic; the script, an image for every scene and the narration are generated. Then edit order and timing on the timeline and download the final file.",
          "Schreib ein Thema; Skript, Bilder für jede Szene und Sprecher entstehen. Dann Reihenfolge und Timing bearbeiten und die fertige Datei laden.",
          "Bir konu yazın; senaryo, her sahne için görsel ve seslendirme üretilir. Sonra sıralamayı ve süreleri düzenleyip son dosyayı indirin."])}</p>
      </div>
      <ol className="landing-vf-steps">
        {STEPS.map((s, i) => (
          <li key={i}><span className="icon-chip orange"><Icon name={s.icon} size={20} /></span><small>{n(i + 1)}</small><strong>{tx(s.t)}</strong></li>
        ))}
      </ol>
      <div className="landing-vf-foot">
        <div>
          <strong>{tx(["سبک‌های تصویری", "Visual styles", "Bildstile", "Görsel stiller"])}</strong>
          <ul className="landing-vf-styles">{STYLES.map((s, i) => <li key={i}>{tx(s)}</li>)}</ul>
        </div>
        <div className="landing-vf-cta">
          <span>{tx([`از ${n(500)} کردیت برای هر دقیقه ویدیو`, "From 500 credits per minute of video", "Ab 500 Credits pro Videominute", "Video dakikası başına 500 krediden"])}</span>
          <Link href="/video-factory" className="btn primary">{tx(["ساخت اولین ویدیو", "Make your first video", "Erstes Video erstellen", "İlk videonu oluştur"])}<Icon name={locale === "fa" ? "ArrowLeft" : "ArrowRight"} size={16} /></Link>
        </div>
      </div>
    </section>
  );
}
