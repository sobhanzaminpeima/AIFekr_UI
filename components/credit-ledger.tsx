"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";

type Entry = { id: string; type: string; delta: number; balanceAfter: number | null; module: string | null; wallet: "personal" | "team"; createdAt: string };

const T = {
  fa: { title: "دفتر کردیت", intro: "هر تغییر موجودی با مبلغ دقیق، موجودی بعد از آن و شماره رسید.", empty: "هنوز تغییری ثبت نشده است.", more: "موارد قدیمی‌تر", failed: "دفتر بارگذاری نشد.", receipt: "رسید", after: "موجودی بعد", team: "کیف تیم" },
  en: { title: "Credit ledger", intro: "Every balance change with its exact amount, the balance after it and a receipt number.", empty: "No changes recorded yet.", more: "Older entries", failed: "The ledger could not be loaded.", receipt: "Receipt", after: "Balance after", team: "Team wallet" },
  de: { title: "Credit-Konto", intro: "Jede Saldoänderung mit genauem Betrag, Saldo danach und Belegnummer.", empty: "Noch keine Änderungen.", more: "Ältere Einträge", failed: "Das Konto konnte nicht geladen werden.", receipt: "Beleg", after: "Saldo danach", team: "Team-Konto" },
  tr: { title: "Kredi defteri", intro: "Her bakiye değişikliği: tam tutar, sonraki bakiye ve makbuz numarası.", empty: "Henüz kayıt yok.", more: "Daha eski kayıtlar", failed: "Defter yüklenemedi.", receipt: "Makbuz", after: "Sonraki bakiye", team: "Takım cüzdanı" },
} as const;

const TYPES: Record<string, [string, string, string, string]> = {
  SPEND: ["مصرف", "Spend", "Verbrauch", "Harcama"],
  REFUND: ["بازگشت", "Refund", "Erstattung", "İade"],
  PURCHASE: ["خرید", "Purchase", "Kauf", "Satın alma"],
  SIGNUP_GRANT: ["هدیهٔ ثبت‌نام", "Sign-up gift", "Startguthaben", "Kayıt hediyesi"],
  REFERRAL_BONUS: ["پاداش دعوت", "Referral bonus", "Empfehlungsbonus", "Davet ödülü"],
  ADMIN_ADJUSTMENT: ["اصلاح مدیر", "Admin adjustment", "Admin-Korrektur", "Yönetici düzeltmesi"],
  OPENING_BALANCE: ["موجودی اولیه", "Opening balance", "Anfangssaldo", "Açılış bakiyesi"],
  PROMO_GRANT: ["اعتبار هدیه", "Promo credit", "Aktionsguthaben", "Promosyon kredisi"],
  PROMO_EXPIRED: ["انقضای هدیه", "Promo expired", "Aktion abgelaufen", "Promosyon sona erdi"],
};
const IDX = { fa: 0, en: 1, de: 2, tr: 3 } as const;

/** The user's own credit ledger (E2): any balance change can be matched to one line here. */
export function CreditLedger() {
  const { locale, n, tl } = useApp();
  const lang = (["fa", "en", "de", "tr"].includes(locale) ? locale : "en") as keyof typeof T;
  const t = T[lang];
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (before: string | null) => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/credit-ledger" + (before ? "?before=" + encodeURIComponent(before) : ""), { credentials: "include", cache: "no-store" });
      if (!res.ok) throw Error(String(res.status));
      const d = (await res.json()) as { entries: Entry[]; next: string | null };
      setEntries((prev) => (before ? [...(prev ?? []), ...d.entries] : d.entries));
      setNext(d.next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void load(null); }, [load]);
  const when = (v: string) => new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
  return (
    <section className="panel reference-ledger">
      <h2><Icon name="Clock" size={20} /> {tl("تراکنش‌های اخیر", "Recent transactions")}</h2>
      {failed && <p role="alert">{t.failed}</p>}
      {failed && entries === null && <Button disabled={busy} onClick={() => void load(null)}>{tl("تلاش دوباره", "Retry")}</Button>}
      {entries === null ? (!failed && <p role="status" className="muted">…</p>) : !entries.length ? <p className="muted">{t.empty}</p> : (
        <div className="reference-ledger-scroll">
          <table>
            <caption className="sr-only">{t.intro}</caption>
            <thead><tr><th scope="col">{tl("تاریخ و زمان", "Date and time")}</th><th scope="col">{tl("نوع تراکنش", "Transaction type")}</th><th scope="col">{tl("تغییر اعتبار", "Credit change")}</th><th scope="col">{t.after}</th></tr></thead>
            <tbody>{entries.map((e) => (
              <tr key={e.id}>
                <td><time dateTime={e.createdAt}>{when(e.createdAt)}</time><small>{t.receipt} <bdi dir="ltr">{e.id.slice(-8)}</bdi></small></td>
                <td><strong>{(TYPES[e.type] ?? [e.type, e.type, e.type, e.type])[IDX[lang]]}</strong>{e.module && <small><bdi dir="ltr">{e.module}</bdi></small>}{e.wallet === "team" && <small>{t.team}</small>}</td>
                <td><strong className={e.delta < 0 ? "red-text" : "green"}><bdi dir="ltr">{e.delta > 0 ? "+" : e.delta < 0 ? "−" : ""}{n(Math.abs(e.delta))}</bdi></strong></td>
                <td>{e.balanceAfter == null ? "—" : n(e.balanceAfter)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {next && <Button disabled={busy} onClick={() => void load(next)}>{t.more}</Button>}
    </section>
  );
}
