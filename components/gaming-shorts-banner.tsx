"use client";
import Link from "./site-link";
import { useApp } from "./providers";
import { Icon } from "./ui";
import { useEffect, useState } from "react";

export function GamingShortsBanner({ landing = false, compact = false }: { landing?: boolean; compact?: boolean }) {
  const { fa } = useApp();
  const [available, setAvailable] = useState(false);
  useEffect(() => { const controller = new AbortController();fetch("/api/packages", { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => setAvailable(!!data?.packages?.some((p: { planCode: string; purchaseAvailable: boolean }) => p.planCode === "GAMING_SHORTS_3" && p.purchaseAvailable))).catch(() => {});return () => controller.abort(); }, []);
  return <section className={`gaming-feature-banner ${landing ? "gaming-feature-hero" : ""} ${compact ? "gaming-feature-compact" : ""}`} aria-label={fa ? "معرفی گیم‌پلی به شورت" : "Introducing Gaming Shorts"}>
    <div className="gaming-feature-copy">
      <div className="gaming-feature-kicker"><span><Icon name="Gamepad2" size={16} /> AIFekr Gaming Shorts</span><span className="gaming-pilot-tag">{fa ? "جدید" : "New"}</span></div>
      <h2>{fa ? <>گیم‌پلی خودت،<br /><em>سه شورت آمادهٔ انتشار.</em></> : <>Your gameplay.<br /><em>Three publish-ready Shorts.</em></>}</h2>
      <p>{fa ? "با حال‌وهوای GTA VI شروع کن. گیم‌پلی خودت را بده؛ تدوین عمودی، زیرنویس، کاور و اطلاعات انتشار را با بازبینی تیم تحویل بگیر." : "Start with GTA VI inspiration. Turn your own gameplay into vertical edits, captions, covers and publishing details, reviewed by our team."}</p>
      <ul className="gaming-feature-benefits">
        <li><Icon name="Smartphone" size={15} />{fa ? "۳ شورت عمودی" : "3 vertical Shorts"}</li>
        <li><Icon name="MessageSquare" size={15} />{fa ? "زیرنویس و کاور" : "Captions & covers"}</li>
        <li><Icon name="ShieldCheck" size={15} />{fa ? "بازبینی تیم" : "Team review"}</li>
      </ul>
      <div className="gaming-feature-actions"><Link className="btn primary" href="/video-factory?service=gaming">{available ? (fa ? "ثبت سفارش گیمینگ شورت" : "Order Gaming Shorts") : (fa ? "آشنایی با گیم‌پلی به شورت" : "Explore Gaming Shorts")}<Icon name={fa ? "ArrowLeft" : "ArrowRight"} size={17} /></Link><small>{available ? (fa ? "سه شورت با بازبینی تیم؛ قیمت و شرایط را پیش از پرداخت ببینید." : "Three team-reviewed Shorts. Review pricing and terms before payment.") : (fa ? "ثبت سفارش هنوز باز نشده است." : "Order intake is not open yet.")}</small></div>
    </div>
    <div className="gaming-feature-art">
      <img src="/campaigns/gaming-shorts/gta-vi-reference.png" alt={fa ? "تصویر مرجع GTA VI با فضای شهری و رنگ‌های صورتی و بنفش" : "GTA VI reference artwork in pink and purple city colors"} width={597} height={335} loading={landing ? "eager" : "lazy"} fetchPriority={landing ? "high" : "auto"} />
      <span className="gaming-feature-art-label">{fa ? "گیم‌پلی تو → داستان کوتاه تو" : "Your gameplay → your short story"}</span>
    </div>
    <small className="gaming-feature-disclaimer">{fa ? "خدمت مستقل AIFekr؛ بدون وابستگی به Rockstar Games. ورودی باید متعلق به شما یا دارای اجازهٔ استفاده باشد." : "An independent AIFekr service, not affiliated with Rockstar Games. Use footage you own or have permission to edit."}</small>
  </section>;
}
