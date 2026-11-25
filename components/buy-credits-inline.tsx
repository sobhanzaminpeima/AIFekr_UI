"use client";
/**
 * Buy credits without leaving a tool: when a cost is above the balance, show the
 * smallest credit packs that cover the shortfall and pay through the normal
 * checkout (/api/credits/purchase). After payment the gateway returns to `returnPath`.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";

type Tier = { id: string; creditsAmount: number; priceToman: number; badge: string | null };
type Tx = [string, string, string, string];

export function BuyCreditsInline({ need, balance, returnPath, perMinute }: { need: number; balance: number; returnPath: "/video-factory" | "/voice-studio"; perMinute?: number }) {
  const { locale, n } = useApp();
  const tx = (c: Tx) => c[{ fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1];
  const shortfall = Math.max(0, Math.ceil(need - balance));
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/credits/tiers", { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => setTiers(d.tiers || [])).catch(() => setTiers([]));
  }, []);
  if (!shortfall) return null;
  const sorted = [...(tiers ?? [])].sort((a, b) => a.creditsAmount - b.creditsAmount);
  const covering = sorted.filter((t) => t.creditsAmount >= shortfall).slice(0, 3);
  const shown = covering.length ? covering : sorted.slice(-1);
  const buy = async (tier: Tier) => {
    setBuying(tier.id);
    try {
      const res = await fetch("/api/credits/purchase", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tierId: tier.id, currency: locale === "fa" ? "IRR" : locale === "tr" ? "TRY" : "USD", returnPath }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.paymentUrl) throw new Error(data.error || "");
      location.href = data.paymentUrl;
    } catch (e) {
      toast.error((e as Error).message || tx(["شروع پرداخت ممکن نشد.", "Could not start the payment.", "Zahlung konnte nicht starten.", "Ödeme başlatılamadı."]));
      setBuying(null);
    }
  };
  return (
    <section className="panel buy-credits-inline" role="region" aria-label={tx(["خرید اعتبار", "Buy credits", "Credits kaufen", "Kredi satın al"])}>
      <div className="row-between">
        <strong><Icon name="Wallet" size={16} /> {tx(["اعتبار کافی نیست", "Not enough credits", "Nicht genug Credits", "Yetersiz kredi"])}</strong>
        <span className="muted">{tx(["کمبود: ", "Short by ", "Es fehlen ", "Eksik: "])}{n(shortfall)}</span>
      </div>
      <p className="muted">{returnPath === "/voice-studio" ? tx([
        "همین‌جا اعتبار بخرید؛ بعد از پرداخت به استودیوی صدا برمی‌گردید و می‌توانید صدا بسازید.",
        "Buy credits here; after payment you come back to the Voice Studio and can generate.",
        "Hier kaufen; nach der Zahlung kehren Sie zum Voice Studio zurück.",
        "Buradan satın alın; ödemeden sonra Ses Stüdyosu'na dönersiniz.",
      ]) : tx([
        "همین‌جا اعتبار بخرید؛ بعد از پرداخت به کارخانهٔ ویدیو برمی‌گردید و می‌توانید تولید را شروع کنید.",
        "Buy credits here; after payment you come back to the Video Factory and can start.",
        "Hier kaufen; nach der Zahlung kehren Sie zur Video-Fabrik zurück.",
        "Buradan satın alın; ödemeden sonra Video Fabrikası'na dönersiniz.",
      ])}</p>
      {tiers === null ? <div className="skeleton" /> : !shown.length ? <p className="muted">{tx(["فعلاً بستهٔ اعتباری برای خرید نیست.", "No credit packs are available right now.", "Derzeit keine Pakete.", "Şu an paket yok."])}</p> : (
        <div className="buy-credits-options">
          {shown.map((t) => (
            <Button key={t.id} variant={t === shown[0] ? "primary" : undefined} disabled={!!buying} onClick={() => void buy(t)}>
              {buying === t.id ? <Icon name="LoaderCircle" size={16} className="spin" /> : <Icon name="Plus" size={16} />}
              {n(t.creditsAmount)} {tx(["اعتبار", "credits", "Credits", "kredi"])} · {n(t.priceToman)} {tx(["تومان", "Toman", "Toman", "Toman"])}
              {perMinute ? ` · ${tx(["حدود ", "about ", "ca. ", "yaklaşık "])}${n(Math.floor(t.creditsAmount / perMinute))} ${tx(["دقیقه صدا", "min of audio", "Min. Audio", "dk ses"])}` : ""}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
