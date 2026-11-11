"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Invitation codes on aifekr.com: /api/admin/referrals (GET list, PUT code +
 * first-purchase discount). Moving a code that was another user's former code
 * needs an explicit confirmation (FORMER_CODE → releaseFormerCode).
 */
type Tx = [string, string, string, string];
type Row = { id: string; name: string | null; email: string | null; referralCode: string | null; referralDiscountPercent: number; _count: { referrals: number } };

export function LiveAdminReferrals() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edits, setEdits] = useState<Record<string, { code: string; percent: string }>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [move, setMove] = useState<{ row: Row; owner: string } | null>(null);
  const load = useCallback(async (query: string) => {
    setRows(null);
    try {
      const r = await fetch("/api/admin/referrals?q=" + encodeURIComponent(query), { credentials: "include" });
      if (!r.ok) throw Error();
      const d = await r.json();
      setRows(d.users ?? []); setEdits({});
    } catch { setRows([]); toast.error(tx(["دریافت اطلاعات ناموفق بود", "Unable to load data", "Daten konnten nicht geladen werden", "Veriler yüklenemedi"])); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(""); }, [load]);
  const value = (r: Row) => edits[r.id] ?? { code: r.referralCode ?? "", percent: String(r.referralDiscountPercent) };
  const who = (r: Row) => r.name || r.email || r.id;
  async function save(r: Row, releaseFormerCode = false) {
    const v = value(r);
    const percent = Number(v.percent);
    setBusy(r.id);
    try {
      const res = await fetch("/api/admin/referrals", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: r.id, code: v.code, percent, releaseFormerCode }) });
      if (res.ok) { toast.success(tx(["ذخیره شد", "Saved", "Gespeichert", "Kaydedildi"])); setMove(null); await load(q); return; }
      const d = await res.json().catch(() => ({}));
      if (d.code === "FORMER_CODE") { setMove({ row: r, owner: d.owner || tx(["کاربر دیگر", "another user", "ein anderer Benutzer", "başka bir kullanıcı"]) }); return; }
      toast.error(who(r) + ": " + (d.code === "INVALID_CODE" ? tx(["کد باید ۳ تا ۳۰ حرف انگلیسی، عدد، خط تیره یا زیرخط باشد", "Use 3–30 Latin letters, digits, hyphens or underscores", "3–30 lateinische Buchstaben, Ziffern, Bindestriche oder Unterstriche", "3–30 Latin harfi, rakam, tire veya alt çizgi kullanın"])
        : d.code === "INVALID_PERCENT" ? tx(["درصد تخفیف باید عدد صحیح ۰ تا ۵۰ باشد", "Discount must be a whole number from 0 to 50", "Rabatt muss eine ganze Zahl von 0 bis 50 sein", "İndirim 0–50 arası tam sayı olmalıdır"])
        : d.code === "CODE_UNAVAILABLE" ? tx(["این کد الان کد دعوت کاربر دیگری است", "This code is another user's current code", "Dieser Code gehört aktuell einem anderen Benutzer", "Bu kod şu anda başka bir kullanıcıya ait"])
        : tx(["ذخیره نشد؛ دوباره تلاش کنید", "Unable to save, please retry", "Speichern fehlgeschlagen, bitte erneut versuchen", "Kaydedilemedi, tekrar deneyin"])));
    } catch { toast.error(tx(["خطای اتصال؛ دوباره تلاش کنید", "Connection error, please retry", "Verbindungsfehler, bitte erneut versuchen", "Bağlantı hatası, tekrar deneyin"])); }
    finally { setBusy(""); }
  }
  const total = rows?.reduce((s, r) => s + r._count.referrals, 0) ?? 0;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Gift" size={28} /></span>
        <div>
          <h2>{tx(["کد دعوت و اینفلوئنسرها", "Invitation codes & influencers", "Einladungscodes & Influencer", "Davet kodları ve influencerlar"])}</h2>
          <p>{tx(["کد و لینک رفرال به یک حساب متصل‌اند. تخفیف فقط برای اولین خرید است؛ کمیسیون از مبلغ پرداخت‌شده محاسبه می‌شود.", "Code and referral link belong to one account. The discount applies to the first purchase; commission uses the amount actually paid.", "Code und Empfehlungslink gehören zum selben Konto. Rabatt nur beim ersten Kauf; Provision auf den bezahlten Betrag.", "Kod ve referans bağlantısı aynı hesaba aittir. İndirim yalnızca ilk satın almada; komisyon ödenen tutar üzerinden."])}</p>
        </div>
      </div>
      <nav className="admin-finance-links">
        <Link className="btn" href="/admin/affiliate">{tx(["همکاری در فروش و تسویه", "Affiliate & payouts", "Affiliate & Auszahlungen", "Ortaklık ve ödemeler"])}</Link>
        <Link className="btn" href="/admin/financial/customers">{tx(["خریداران و اشتراک‌ها", "Customers & subscriptions", "Käufer & Abos", "Müşteriler ve abonelikler"])}</Link>
        <Link className="btn" href="/admin/packages">{tx(["پکیج‌ها", "Packages", "Pakete", "Paketler"])}</Link>
      </nav>
      <div className="stats-grid" aria-busy={!rows}>
        <div className="panel stat"><span>{tx(["پروفایل‌ها", "Profiles", "Profile", "Profiller"])}</span><strong>{rows ? n(rows.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["دعوت‌ها", "Referrals", "Empfehlungen", "Davetler"])}</span><strong>{rows ? n(total) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["کد با تخفیف", "Codes with a discount", "Codes mit Rabatt", "İndirimli kodlar"])}</span><strong>{rows ? n(rows.filter((r) => r.referralDiscountPercent > 0).length) : "—"}</strong></div>
      </div>
      <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); void load(q); }}>
        <input aria-label={tx(["جست‌وجوی کاربر", "Search users", "Benutzer suchen", "Kullanıcı ara"])} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(["نام، ایمیل یا کد دعوت", "Name, email or code", "Name, E-Mail oder Code", "Ad, e-posta veya kod"])} />
        <Button type="submit"><Icon name="Search" size={16} />{tx(["جست‌وجو", "Search", "Suchen", "Ara"])}</Button>
      </form>
      <p className="fine-print">{tx(["بدون جست‌وجو فقط کاربرانی که کد دعوت دارند نشان داده می‌شوند (حداکثر ۱۰۰ نفر). برای دادن کد به کاربر جدید، نام یا ایمیلش را جست‌وجو کنید.", "Without a search only users who have a code are listed (100 at most). To give someone a code, search their name or email.", "Ohne Suche werden nur Benutzer mit Code angezeigt (max. 100). Um jemandem einen Code zu geben, nach Name oder E-Mail suchen.", "Arama yoksa yalnızca kodu olan kullanıcılar listelenir (en fazla 100). Birine kod vermek için adını veya e-postasını arayın."])}</p>
      <div className="tool-grid" aria-busy={!rows}>
        {rows?.map((r) => {
          const v = value(r);
          const changed = v.code !== (r.referralCode ?? "") || v.percent !== String(r.referralDiscountPercent);
          return (
            <article className="panel admin-referral-card" key={r.id}>
              <div className="row-between">
                <div>
                  <strong><Link href={"/admin/users/" + encodeURIComponent(r.id)}>{who(r)}</Link></strong>
                  {r.email && <p><bdi dir="ltr">{r.email}</bdi></p>}
                </div>
                <span className="badge">{n(r._count.referrals)} {tx(["دعوت", "referrals", "Empfehlungen", "davet"])}</span>
              </div>
              <form className="domain-fields" onSubmit={(e) => { e.preventDefault(); void save(r); }}>
                <label>{tx(["کد دعوت", "Invitation code", "Einladungscode", "Davet kodu"])}<input dir="ltr" maxLength={30} value={v.code} onChange={(e) => setEdits({ ...edits, [r.id]: { ...v, code: e.target.value } })} /></label>
                <label>{tx(["تخفیف اولین خرید (٪)", "First-purchase discount (%)", "Rabatt erster Kauf (%)", "İlk alım indirimi (%)"])}<input type="number" min={0} max={50} step={1} dir="ltr" value={v.percent} onChange={(e) => setEdits({ ...edits, [r.id]: { ...v, percent: e.target.value } })} /></label>
                <Button type="submit" variant="primary" disabled={!!busy || !changed}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
              </form>
            </article>
          );
        })}
      </div>
      {rows && !rows.length && <Empty />}
      {move && (
        <Modal title={tx(["انتقال کد قبلی", "Move a former code", "Früheren Code verschieben", "Eski kodu taşı"])} onClose={() => setMove(null)}>
          <p>{tx([
            `«${value(move.row).code}» کد قبلی ${move.owner} است و لینک‌های قدیمی او هنوز با آن کار می‌کنند. اگر به ${who(move.row)} منتقل شود، ثبت‌نام‌های بعدی با این کد برای ${who(move.row)} حساب می‌شود.`,
            `“${value(move.row).code}” is a former code of ${move.owner}; their old links still use it. If it moves to ${who(move.row)}, future sign-ups with it count for ${who(move.row)}.`,
            `„${value(move.row).code}“ ist ein früherer Code von ${move.owner}; alte Links nutzen ihn noch. Wird er zu ${who(move.row)} verschoben, zählen künftige Anmeldungen für ${who(move.row)}.`,
            `“${value(move.row).code}”, ${move.owner} kullanıcısının eski kodu; eski bağlantıları hâlâ bunu kullanıyor. ${who(move.row)} kullanıcısına taşınırsa yeni kayıtlar ${who(move.row)} için sayılır.`,
          ])}</p>
          <div className="domain-actions">
            <Button variant="danger" disabled={!!busy} onClick={() => void save(move.row, true)}>{tx(["بله، منتقل شود", "Yes, move it", "Ja, verschieben", "Evet, taşı"])}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
