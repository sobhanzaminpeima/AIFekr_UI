"use client";
import Link from "@/components/site-link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin promotions and the admin-invite register on aifekr.com, in the
 * design's panels. Same endpoints as the classic pages:
 * /api/admin/billing/promotions (create / update) and /api/admin/invites/list.
 */
type Tx = [string, string, string, string];
const useTx = () => { const { n, locale } = useApp(); const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1; return { n, i, tx: (c: Tx) => c[i], date: (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(["fa-IR", "en-GB", "de-DE", "tr-TR"][i]) : "—") }; };

type Promotion = { id: string; name: string; enabled: boolean; configuration: string; startsAt: string; endsAt: string; maxRedemptions: number; _count?: { redemptions: number } };
type Config = { plans: string[]; periods: string[]; bonusDays: number; bonusCredits: number };
type Pkg = { planCode: string; name: string; nameEn: string | null; isActive: boolean };
type Draft = { id?: string; name: string; enabled: boolean; plans: string[]; periods: string[]; bonusDays: string; bonusCredits: string; startsAt: string; endsAt: string; maxRedemptions: string };
const PERIODS: [string, Tx][] = [["monthly", ["یک ماهه", "1 month", "1 Monat", "1 ay"]], ["quarterly", ["سه ماهه", "3 months", "3 Monate", "3 ay"]], ["semiannual", ["شش ماهه", "6 months", "6 Monate", "6 ay"]], ["annual", ["یک ساله", "1 year", "1 Jahr", "1 yıl"]]];
const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const parse = (p: Promotion): Config => { try { return { plans: [], periods: [], bonusDays: 0, bonusCredits: 0, ...JSON.parse(p.configuration || "{}") }; } catch { return { plans: [], periods: [], bonusDays: 0, bonusCredits: 0 }; } };

export function LivePromotions() {
  const { n, i, tx, date } = useTx();
  const [rows, setRows] = useState<Promotion[] | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/billing/promotions", { credentials: "include" });
    setRows(r.ok ? (await r.json()).promotions ?? [] : []);
  }, []);
  useEffect(() => { void load(); fetch("/api/admin/packages", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((b) => b?.packages && setPackages(b.packages)).catch(() => {}); }, [load]);
  const pkgName = (code: string) => { const p = packages.find((x) => x.planCode === code); return p ? (i === 0 ? p.name : p.nameEn || p.name) : code; };
  function open(p?: Promotion) {
    if (!p) return setDraft({ name: "", enabled: false, plans: [], periods: ["quarterly"], bonusDays: "30", bonusCredits: "0", startsAt: toLocal(new Date()), endsAt: toLocal(new Date(Date.now() + 90 * 86400000)), maxRedemptions: "1000" });
    const c = parse(p);
    setDraft({ id: p.id, name: p.name, enabled: p.enabled, plans: c.plans, periods: c.periods, bonusDays: String(c.bonusDays), bonusCredits: String(c.bonusCredits), startsAt: toLocal(new Date(p.startsAt)), endsAt: toLocal(new Date(p.endsAt)), maxRedemptions: String(p.maxRedemptions) });
  }
  async function save(d: Draft) {
    const start = new Date(d.startsAt), end = new Date(d.endsAt);
    if (!d.name.trim() || !d.plans.length || !d.periods.length || !(start < end)) return toast.error(tx(["نام، دست‌کم یک پکیج و یک دوره، و بازهٔ زمانی معتبر لازم است", "A name, at least one package and term, and a valid date range are required", "Name, mindestens ein Paket und eine Laufzeit sowie gültige Daten sind nötig", "Ad, en az bir paket ve dönem ile geçerli tarih aralığı gerekli"]));
    setBusy(true);
    try {
      const res = await fetch("/api/admin/billing/promotions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(d.id ? { id: d.id } : {}), name: d.name.trim(), enabled: d.enabled, plans: d.plans, periods: d.periods, bonusDays: Number(d.bonusDays), bonusCredits: Number(d.bonusCredits), startsAt: start.toISOString(), endsAt: end.toISOString(), maxRedemptions: Number(d.maxRedemptions) }) });
      if (!res.ok) throw Error();
      toast.success(tx(["پروموشن ذخیره شد", "Promotion saved", "Aktion gespeichert", "Promosyon kaydedildi"]));
      setDraft(null); await load();
    } catch { toast.error(tx(["پروموشن نامعتبر است؛ روزها حداکثر ۹۰ و اعتبار حداکثر ۱۰۰٬۰۰۰", "Invalid promotion; at most 90 days and 100,000 credits", "Ungültige Aktion; höchstens 90 Tage und 100.000 Credits", "Geçersiz promosyon; en fazla 90 gün ve 100.000 kredi"])); }
    finally { setBusy(false); }
  }
  const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Gift" size={28} /></span>
        <div>
          <h2>{tx(["پروموشن اولین اشتراک", "First subscription promotions", "Aktionen für das erste Abo", "İlk abonelik promosyonları"])}</h2>
          <p>{tx(["بدون فعال‌سازی مدیر، روز یا اعتبار هدیه به خریدی اضافه نمی‌شود.", "No bonus days or credits are added without admin activation.", "Ohne Admin-Aktivierung werden keine Bonustage oder Credits gewährt.", "Yönetici etkinleştirmeden hediye gün veya kredi eklenmez."])}</p>
        </div>
      </div>
      <div className="domain-toolbar">
        <Button variant="primary" onClick={() => open()}><Icon name="Plus" size={16} />{tx(["پروموشن تازه", "New promotion", "Neue Aktion", "Yeni promosyon"])}</Button>
        <Link className="btn" href="/admin/packages">{tx(["پکیج‌ها", "Packages", "Pakete", "Paketler"])}</Link>
      </div>
      <div className="tool-grid" aria-busy={!rows}>
        {rows?.map((p) => {
          const c = parse(p);
          const running = p.enabled && new Date(p.startsAt).getTime() <= Date.now() && new Date(p.endsAt).getTime() > Date.now();
          return (
            <article className="panel admin-promotion-card" key={p.id}>
              <div className="row-between"><span className="icon-chip orange"><Icon name="Gift" /></span><span className={"badge " + (running ? "green" : p.enabled ? "orange" : "")}>{running ? tx(["در حال اجرا", "Running", "Läuft", "Yürürlükte"]) : p.enabled ? tx(["فعال (خارج از بازه)", "Enabled (outside dates)", "Aktiv (außerhalb Zeitraum)", "Etkin (tarih dışı)"]) : tx(["غیرفعال", "Disabled", "Deaktiviert", "Kapalı"])}</span></div>
              <h3>{p.name}</h3>
              <p>+{n(c.bonusDays)} {tx(["روز", "days", "Tage", "gün"])} · {n(c.bonusCredits)} {tx(["اعتبار", "credits", "Credits", "kredi"])}</p>
              <dl className="domain-detail">
                <div><dt>{tx(["پکیج‌ها", "Packages", "Pakete", "Paketler"])}</dt><dd>{c.plans.map(pkgName).join("، ") || "—"}</dd></div>
                <div><dt>{tx(["دوره‌ها", "Terms", "Laufzeiten", "Dönemler"])}</dt><dd>{c.periods.map((x) => tx(PERIODS.find(([k]) => k === x)?.[1] ?? [x, x, x, x])).join("، ")}</dd></div>
                <div><dt>{tx(["بازه", "Dates", "Zeitraum", "Tarihler"])}</dt><dd>{date(p.startsAt)} → {date(p.endsAt)}</dd></div>
                <div><dt>{tx(["استفاده‌شده", "Redeemed", "Eingelöst", "Kullanılan"])}</dt><dd>{n(p._count?.redemptions ?? 0)} / {n(p.maxRedemptions)}</dd></div>
              </dl>
              <Button onClick={() => open(p)}>{tx(["ویرایش", "Edit", "Bearbeiten", "Düzenle"])}</Button>
            </article>
          );
        })}
      </div>
      {rows && !rows.length && <Empty />}
      {draft && (
        <Modal title={draft.id ? tx(["ویرایش پروموشن", "Edit promotion", "Aktion bearbeiten", "Promosyonu düzenle"]) : tx(["پروموشن تازه", "New promotion", "Neue Aktion", "Yeni promosyon"])} onClose={() => setDraft(null)}>
          <form className="admin-expiry-form" onSubmit={(e) => { e.preventDefault(); void save(draft); }}>
            <label>{tx(["نام", "Name", "Name", "Ad"])}<input required maxLength={100} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <div className="domain-fields">
              <label>{tx(["روز اضافه (۰ تا ۹۰)", "Extra days (0–90)", "Bonustage (0–90)", "Ek gün (0–90)"])}<input type="number" min={0} max={90} dir="ltr" value={draft.bonusDays} onChange={(e) => setDraft({ ...draft, bonusDays: e.target.value })} /></label>
              <label>{tx(["اعتبار هدیه", "Bonus credits", "Bonus-Credits", "Hediye kredi"])}<input type="number" min={0} max={100000} dir="ltr" value={draft.bonusCredits} onChange={(e) => setDraft({ ...draft, bonusCredits: e.target.value })} /></label>
              <label>{tx(["شروع", "Starts", "Beginn", "Başlangıç"])}<input type="datetime-local" required value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></label>
              <label>{tx(["پایان", "Ends", "Ende", "Bitiş"])}<input type="datetime-local" required value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></label>
              <label>{tx(["سقف استفاده", "Maximum redemptions", "Max. Einlösungen", "Azami kullanım"])}<input type="number" min={1} max={100000} dir="ltr" value={draft.maxRedemptions} onChange={(e) => setDraft({ ...draft, maxRedemptions: e.target.value })} /></label>
            </div>
            <fieldset className="admin-checks"><legend>{tx(["دوره‌های مشمول", "Eligible terms", "Laufzeiten", "Uygun dönemler"])}</legend>
              {PERIODS.map(([k, label]) => <label key={k}><input type="checkbox" checked={draft.periods.includes(k)} onChange={(e) => setDraft({ ...draft, periods: toggle(draft.periods, k, e.target.checked) })} />{tx(label)}</label>)}
            </fieldset>
            <fieldset className="admin-checks"><legend>{tx(["پکیج‌های مشمول", "Eligible packages", "Pakete", "Uygun paketler"])}</legend>
              {packages.map((p) => <label key={p.planCode}><input type="checkbox" checked={draft.plans.includes(p.planCode)} onChange={(e) => setDraft({ ...draft, plans: toggle(draft.plans, p.planCode, e.target.checked) })} />{pkgName(p.planCode)}{!p.isActive && " (" + tx(["غیرفعال", "inactive", "inaktiv", "pasif"]) + ")"}</label>)}
            </fieldset>
            <label className="toggle-row"><span>{tx(["فعال", "Enabled", "Aktiviert", "Etkin"])}</span><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /></label>
            <Button type="submit" variant="primary" disabled={busy}>{tx(["ذخیره", "Save", "Speichern", "Kaydet"])}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

type Invite = { id: string; name: string | null; email: string | null; phone: string | null; referralCode: string | null; trialPlan: string | null; trialEndsAt: string | null; realEstatePackage: boolean; mustChangePassword: boolean; invitedAt: string | null; plan: string; planExpiry: string | null; invitedByAdminName: string | null; trialActive: boolean; cardCount: number };

export function LiveInviteRegister() {
  const { n, tx, date } = useTx();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Invite[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/admin/invites/list?q=" + encodeURIComponent(q.trim()), { credentials: "include" }).then((r) => (r.ok ? r.json() : { items: [] })).then((b) => setItems(b.items ?? [])).catch(() => setItems([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const active = items?.filter((x) => x.trialActive).length ?? 0;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Send" size={28} /></span>
        <div>
          <h2>{tx(["دعوت‌نامه‌های مدیریت", "Admin invitations", "Admin-Einladungen", "Yönetici davetleri"])}</h2>
          <p>{tx(["همهٔ کسانی که با ابزار «دعوت به AIFekr» دعوت شده‌اند؛ رمزی نمایش داده نمی‌شود.", "Everyone invited with the “Invite to AIFekr” tool; no password is shown.", "Alle über „Zu AIFekr einladen“ Eingeladenen; es wird kein Passwort angezeigt.", "“AIFekr’e davet et” ile davet edilen herkes; şifre gösterilmez."])}</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="panel stat"><span>{tx(["دعوت‌شده‌ها", "Invited", "Eingeladen", "Davet edilen"])}</span><strong>{items ? n(items.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["دورهٔ آزمایشی فعال", "Active trials", "Aktive Tests", "Aktif deneme"])}</span><strong>{items ? n(active) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["در انتظار تغییر رمز", "Must change password", "Passwortwechsel offen", "Şifre değişimi bekliyor"])}</span><strong>{items ? n(items.filter((x) => x.mustChangePassword).length) : "—"}</strong></div>
      </div>
      <div className="domain-toolbar">
        <label>{tx(["جست‌وجو", "Search", "Suche", "Ara"])}<input value={q} placeholder={tx(["نام، ایمیل، موبایل یا کد معرف", "Name, email, phone or referral code", "Name, E-Mail, Telefon oder Code", "Ad, e-posta, telefon veya kod"])} onChange={(e) => setQ(e.target.value)} /></label>
        <Link className="btn primary" href="/admin/invites"><Icon name="Plus" size={16} />{tx(["دعوت جدید", "New invitation", "Neue Einladung", "Yeni davet"])}</Link>
      </div>
      <section className="panel" aria-busy={!items}>
        {items?.length ? (
          <div className="table-scroll">
            <table className="admin-finance-table">
              <thead><tr>{[tx(["کاربر", "User", "Benutzer", "Kullanıcı"]), tx(["دعوت", "Invited", "Eingeladen", "Davet"]), tx(["دورهٔ آزمایشی", "Trial", "Testzugang", "Deneme"]), tx(["طرح فعلی", "Current plan", "Aktueller Tarif", "Mevcut plan"]), ""].map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td><Link href={"/admin/users/" + encodeURIComponent(u.id)}>{u.name || u.email || u.phone || u.id}</Link><small dir="ltr">{u.email || u.phone || ""}{u.referralCode ? " · " + u.referralCode : ""}</small></td>
                    <td>{date(u.invitedAt)}<small>{u.invitedByAdminName || ""}</small></td>
                    <td><span className={"badge " + (u.trialActive ? "green" : "")}>{u.trialActive ? tx(["فعال تا", "Active until", "Aktiv bis", "Şu tarihe kadar"]) + " " + date(u.trialEndsAt) : tx(["پایان‌یافته", "Ended", "Beendet", "Bitti"])}</span>{u.realEstatePackage && <small>{tx(["پکیج املاک", "Real estate pack", "Immobilienpaket", "Emlak paketi"])}</small>}</td>
                    <td>{u.plan}{u.planExpiry ? " · " + date(u.planExpiry) : ""}{u.mustChangePassword && <small>{tx(["هنوز رمز را تغییر نداده", "Has not changed the password yet", "Passwort noch nicht geändert", "Şifre henüz değiştirilmedi"])}</small>}</td>
                    <td><Link className="btn" href={"/admin/invites?userId=" + encodeURIComponent(u.id)}>{tx(["کارت دعوت", "Invite card", "Einladungskarte", "Davet kartı"])}{u.cardCount ? " (" + n(u.cardCount) + ")" : ""}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : items && <Empty />}
      </section>
    </>
  );
}
