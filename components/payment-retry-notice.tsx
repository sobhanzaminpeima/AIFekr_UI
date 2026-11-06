"use client";
// "Your last payment didn't go through" on the home page (production
// 2026-11-06: 8 of 13 customer checkouts ended failed at the gateway, most of
// them for the cheaper packages). Shown only for the account's own latest
// order when it failed or was cancelled in the last three days and nothing
// was paid after it; one tap starts the same package again. Closed per order.
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./ui";
import { growthEvent } from "./growth-tracker";

type Order = { id: string; plan: string; status: string; createdAt: string; packageName?: string | null; packageNameEn?: string | null };
const L = ["fa", "en", "de", "tr"] as const;
const COPY = {
  title: ["پرداخت قبلی‌ات کامل نشد", "Your last payment didn't go through", "Ihre letzte Zahlung wurde nicht abgeschlossen", "Son ödemen tamamlanmadı"],
  body: [
    "سفارش «{p}» پرداخت نشد. اگر مبلغی از حسابت کم شده ولی پرداخت تأیید نشده، بانک خودش آن را برمی‌گرداند (معمولاً تا ۷۲ ساعت). می‌توانی همین پکیج را دوباره پرداخت کنی.",
    "The order for “{p}” wasn't paid. If money left your account without the payment being confirmed, the bank returns it automatically (usually within 72 hours). You can pay for the same package again.",
    "Die Bestellung „{p}“ wurde nicht bezahlt. Wurde Geld abgebucht, ohne dass die Zahlung bestätigt wurde, erstattet die Bank es automatisch (meist innerhalb von 72 Stunden). Sie können dasselbe Paket erneut bezahlen.",
    "“{p}” siparişi ödenmedi. Ödeme onaylanmadan hesabından para çekildiyse banka bunu otomatik olarak iade eder (genellikle 72 saat içinde). Aynı paketi yeniden ödeyebilirsin.",
  ],
  retry: ["پرداخت دوباره", "Pay again", "Erneut bezahlen", "Yeniden öde"],
  help: ["کمک می‌خواهم", "I need help", "Ich brauche Hilfe", "Yardım istiyorum"],
  close: ["بستن", "Close", "Schließen", "Kapat"],
} as const;

export function PaymentRetryNotice() {
  const { locale, fa } = useApp();
  const say = (k: keyof typeof COPY) => COPY[k][Math.max(0, L.indexOf(locale as (typeof L)[number]))];
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/user/payments?page=1&filter=all", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { payments?: Order[] } | null) => {
        const list = (d?.payments ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const last = list[0];
        if (!live || !last || !["FAILED", "CANCELLED"].includes(last.status)) return;
        if (Date.now() - new Date(last.createdAt).getTime() > 3 * 86400000) return;
        try { if (localStorage.getItem("aifekr-payment-notice-" + last.id)) return; } catch { /* private mode */ }
        setOrder(last);
        growthEvent("upgrade_prompt_viewed", { metadata: { source: "payment_retry", plan: last.plan } });
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!order) return null;
  const close = () => { try { localStorage.setItem("aifekr-payment-notice-" + order.id, "1"); } catch { /* private mode */ } setOrder(null); };
  const name = (fa ? order.packageName : order.packageNameEn || order.packageName) || order.plan;
  // The plans page opens on this package's category and an available period.
  const retry = `/plans?plan=${encodeURIComponent(order.plan)}`;
  return (
    <div className="plan-notice payment-retry" role="status">
      <Icon name="CreditCard" size={18} />
      <div>
        <strong>{say("title")}</strong>
        <p>{say("body").replace("{p}", name)}</p>
        <div className="domain-actions">
          <a className="btn primary" href={retry} onClick={() => growthEvent("upgrade_prompt_clicked", { metadata: { source: "payment_retry", plan: order.plan } })}>{say("retry")}</a>
          <a className="btn" href="/contact">{say("help")}</a>
          <button className="btn ghost" onClick={close}>{say("close")}</button>
        </div>
      </div>
    </div>
  );
}
