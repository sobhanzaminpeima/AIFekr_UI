"use client";
import Link from "@/components/site-link";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal } from "./ui";

/**
 * Admin access tools on aifekr.com:
 * - LiveInviteTool (/admin/invites): temporary password (/api/admin/invites/reset-password,
 *   overwrites the user's real password, so it asks first), referral link, invite text
 *   and the branded 1080×1350 card exported as PNG (/api/admin/invites/log-card).
 * - LiveModuleAccess (/admin/module-access): industry-pack module defaults and
 *   per-customer overrides.
 * - LiveSocialConnections (/admin/social-connections): which account holds each
 *   Instagram account; release is irreversible and asks first.
 */
type Tx = [string, string, string, string];
type Lang = "fa" | "en" | "de" | "tr";

function useT() {
  const { n, locale } = useApp();
  const i = { fa: 0, en: 1, de: 2, tr: 3 }[locale] ?? 1;
  const tx = (c: Tx) => c[i];
  const tag = ["fa-IR", "en-GB", "de-DE", "tr-TR"][i];
  return { n, i, tx, tag };
}
async function json<T>(r: Response): Promise<T> {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "HTTP_" + r.status);
  return d as T;
}

/* ───────────────────────── Invite tool ───────────────────────── */

type InviteUser = { id: string; name: string | null; email: string | null; phone: string | null; referralCode: string | null; trialStartsAt: string | null; trialEndsAt: string | null; accountType?: string; planExpiry?: string | null };
type SearchUser = { id: string; name: string | null; email: string | null; phone: string | null };

const TEMPLATES: Record<Lang, string> = {
  fa: `سلام {name} عزیز 👋

به AIfekr خوش اومدی! یک هفته دسترسی کامل Pro + پکیج املاک برات فعال کردیم تا خودت امتحان کنی.

🔑 یوزرنیم: {username}
🔑 پسورد موقت: {password}
(اولین بار که وارد شدی، ازت می‌خوایم پسوردت رو عوض کنی)

لینک اختصاصی تو: {link}

هر سوالی داشتی در خدمتتم.
تیم AIfekr`,
  en: `Hi {name} 👋

Welcome to AIfekr! We've activated 7 days of full Pro access + the complete Real Estate package for you to try.

🔑 Username: {username}
🔑 Temporary password: {password}
(You'll be asked to set a new password on first login.)

Your personal link: {link}

Reach out anytime with questions.
The AIfekr Team`,
  de: `Hallo {name} 👋

Willkommen bei AIfekr! Wir haben 7 Tage vollen Pro-Zugang + das komplette Immobilien-Paket für dich freigeschaltet.

🔑 Benutzername: {username}
🔑 Vorläufiges Passwort: {password}
(Beim ersten Login wirst du gebeten, ein neues Passwort festzulegen.)

Dein persönlicher Link: {link}

Bei Fragen sind wir für dich da.
Das AIfekr-Team`,
  tr: `Merhaba {name} 👋

AIfekr'e hoş geldin! Denemen için 7 günlük tam Pro erişimi + eksiksiz Emlak paketini etkinleştirdik.

🔑 Kullanıcı adı: {username}
🔑 Geçici şifre: {password}
(İlk girişte yeni bir şifre belirlemen istenecek.)

Kişisel bağlantın: {link}

Sorun olursa her zaman yazabilirsin.
AIfekr Ekibi`,
};
const fill = (lang: Lang, v: { name: string; username: string; password: string; link: string }) => TEMPLATES[lang].replaceAll("{name}", v.name).replaceAll("{username}", v.username).replaceAll("{password}", v.password).replaceAll("{link}", v.link);
const LANG_LABEL: Record<Lang, string> = { fa: "فارسی", en: "English", de: "Deutsch", tr: "Türkçe" };

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const CARD: Record<Lang, { title: string; subtitle: string; about: string; usernameLabel: string; passwordLabel: string; linkLabel: string; proBadge: string; packageBadge: string; days: string }> = {
  fa: { title: "دعوت‌نامهٔ AiFekr", subtitle: "دسترسی کامل، آمادهٔ استفاده", about: "AiFekr پلتفرم ایجنت‌های هوش مصنوعی برای کسب‌وکارهاست — از مدیریت مشتری (CRM) و ایجنت فروش گرفته تا ایجنت صوتی تماس، تولید محتوا و مشاور قیمت‌گذاری املاک، هرکدوم ۲۴/۷ برای شما کار می‌کنن.", usernameLabel: "یوزرنیم", passwordLabel: "پسورد موقت", linkLabel: "لینک اختصاصی شما", proBadge: "Pro — ۷ روز رایگان", packageBadge: "پکیج املاک کامل", days: "روز" },
  en: { title: "AiFekr Invitation", subtitle: "Full access, ready to use", about: "AiFekr is an AI agent platform for businesses — from CRM and a sales agent to a voice call agent, content generation, and a real-estate pricing advisor, each working for you around the clock.", usernameLabel: "Username", passwordLabel: "Temporary password", linkLabel: "Your personal link", proBadge: "Pro — 7 days free", packageBadge: "Full Real Estate Package", days: "days" },
  de: { title: "AiFekr-Einladung", subtitle: "Voller Zugang, sofort einsatzbereit", about: "AiFekr ist eine KI-Agenten-Plattform für Unternehmen — von CRM und einem Vertriebsagenten über einen Sprach-Anrufagenten bis hin zu Content-Erstellung und einem Immobilien-Preisberater, jeder rund um die Uhr für Sie im Einsatz.", usernameLabel: "Benutzername", passwordLabel: "Vorläufiges Passwort", linkLabel: "Dein persönlicher Link", proBadge: "Pro — 7 Tage gratis", packageBadge: "Komplettes Immobilien-Paket", days: "Tage" },
  tr: { title: "AiFekr Daveti", subtitle: "Tam erişim, kullanıma hazır", about: "AiFekr, işletmeler için bir yapay zekâ ajan platformudur — CRM ve satış ajanından sesli arama ajanına, içerik üretimine ve emlak fiyat danışmanına kadar her biri sizin için günün her saati çalışır.", usernameLabel: "Kullanıcı adı", passwordLabel: "Geçici şifre", linkLabel: "Kişisel bağlantın", proBadge: "Pro — 7 gün ücretsiz", packageBadge: "Eksiksiz Emlak Paketi", days: "gün" },
};

const InviteCard = forwardRef<HTMLDivElement, { lang: Lang; name: string; username: string; password: string; link: string; trialDays: number; qr?: string; text: string }>(function InviteCard({ lang, name, username, password, link, trialDays, qr, text }, ref) {
  const s = CARD[lang];
  const rtl = lang === "fa";
  const row = (label: string, value: string) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}><span style={{ fontSize: 15, color: "#B8B8BC" }}>{label}</span><span style={{ fontSize: 20, fontWeight: 700, color: "#fff", direction: "ltr", wordBreak: "break-all", textAlign: "right" }}>{value}</span></div>;
  return (
    <div ref={ref} dir={rtl ? "rtl" : "ltr"} style={{ width: CARD_WIDTH, height: CARD_HEIGHT, background: "linear-gradient(160deg, #0B0B0C, #141414)", color: "#fff", fontFamily: rtl ? "Vazirmatn, Tahoma, sans-serif" : "Poppins, Inter, Arial, sans-serif", display: "flex", flexDirection: "column", padding: 64, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -120, [rtl ? "right" : "left"]: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,130,31,0.35), transparent 70%)" }} />
      <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 1, zIndex: 1 }}><span style={{ color: "#fff" }}>Ai</span><span style={{ color: "#F5821F" }}>Fekr</span></div>
      <div style={{ fontSize: 15, color: "#B8B8BC", marginTop: 4, zIndex: 1 }}>Artificial Intelligence &amp; Insight</div>
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #F5821F, transparent)", margin: "28px 0", zIndex: 1 }} />
      <div style={{ zIndex: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.25 }}>{s.title}</div>
        <div style={{ fontSize: 18, color: "#B8B8BC", marginTop: 6 }}>{s.subtitle}</div>
        <div style={{ fontSize: 15, color: "#DADADC", marginTop: 16, lineHeight: 1.7 }}>{s.about}</div>
        {text.trim() && <div style={{ fontSize: 15, color: "#DADADC", marginTop: 16, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text.trim()}</div>}
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 26 }}>{name}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <span style={{ padding: "7px 16px", borderRadius: 999, background: "rgba(245,130,31,0.15)", border: "1px solid rgba(245,130,31,0.5)", color: "#F5821F", fontSize: 16, fontWeight: 600 }}>{s.proBadge}</span>
          <span style={{ padding: "7px 16px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, fontWeight: 600 }}>{s.packageBadge}</span>
        </div>
        <div style={{ marginTop: 28, background: "#1C1C1E", border: "1px solid rgba(245,130,31,0.35)", borderRadius: 20, padding: 24 }}>
          {row(s.usernameLabel, username)}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />
          {row(s.passwordLabel, password)}
        </div>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: "#B8B8BC" }}>{s.linkLabel}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: "#F5821F", marginTop: 6, wordBreak: "break-all", direction: "ltr", textAlign: rtl ? "right" : "left" }}>{link}</div>
          </div>
          {qr && <img src={qr} alt="QR" width={96} height={96} style={{ flexShrink: 0, borderRadius: 8, background: "#fff", padding: 6 }} />}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>www.aifekr.com</span>
        <span style={{ fontSize: 14, color: "#B8B8BC" }}>{trialDays} {s.days}</span>
      </div>
    </div>
  );
});

function CopyRow({ label, value }: { label: string; value: string }) {
  const { tx } = useT();
  return (
    <div className="invite-field">
      <div><small>{label}</small><bdi dir="ltr">{value || "—"}</bdi></div>
      {value && <Button label={tx(["کپی", "Copy", "Kopieren", "Kopyala"])} onClick={() => { void navigator.clipboard?.writeText(value).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"]))); }}><Icon name="Copy" size={15} /></Button>}
    </div>
  );
}

export function LiveInviteTool() {
  const { i, tx, tag } = useT();
  const [user, setUser] = useState<InviteUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>((["fa", "en", "de", "tr"] as Lang[])[i] ?? "fa");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState<"password" | "student" | null>(null);
  const [qr, setQr] = useState<string | undefined>();
  const [cards, setCards] = useState<{ id: string; language: string; imageUrl: string | null; createdAt: string }[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const scale = 0.32;

  const loadCards = useCallback(async (id: string) => {
    const d = await fetch("/api/admin/invites/log-card?userId=" + encodeURIComponent(id), { credentials: "include" }).then((r) => r.json()).catch(() => ({}));
    setCards(d.cards || []);
  }, []);
  const loadUser = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const d = await json<{ user: InviteUser }>(await fetch("/api/admin/users/" + encodeURIComponent(id), { credentials: "include" }));
      setUser(d.user); setPassword(null); setEdited(false); void loadCards(id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setLoading(false); }
  }, [loadCards]);
  useEffect(() => { const id = new URLSearchParams(location.search).get("userId"); if (id) void loadUser(id); }, [loadUser]);

  async function search() {
    if (!query.trim()) return;
    setBusy("search");
    try { const d = await json<{ users: SearchUser[] }>(await fetch("/api/admin/users?search=" + encodeURIComponent(query), { credentials: "include" })); setResults(d.users || []); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(""); }
  }
  function pick(u: SearchUser) {
    history.replaceState(null, "", "/admin/invites?userId=" + encodeURIComponent(u.id));
    setResults(null); setQuery(""); void loadUser(u.id);
  }
  function change() { history.replaceState(null, "", "/admin/invites"); setUser(null); setPassword(null); setCards([]); }

  const username = user?.email || user?.phone || "";
  const link = user?.referralCode ? location.origin + "/register?ref=" + user.referralCode : "";
  const trialDays = user?.trialStartsAt && user?.trialEndsAt ? Math.round((new Date(user.trialEndsAt).getTime() - new Date(user.trialStartsAt).getTime()) / 86_400_000) : 7;
  useEffect(() => {
    if (!link) { setQr(undefined); return; }
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: "#0B0B0C", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(undefined));
  }, [link]);
  // Regenerate the text from the template unless the admin edited it by hand.
  useEffect(() => {
    if (edited || !user) return;
    setText(fill(lang, { name: user.name || username, username, password: password || "••••••••", link }));
  }, [lang, user, username, password, link, edited]);

  async function resetPassword() {
    if (!user) return;
    setAsk(null); setBusy("password");
    try {
      const d = await json<{ tempPassword: string }>(await fetch("/api/admin/invites/reset-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) }));
      setPassword(d.tempPassword); setEdited(false);
      toast.success(tx(["پسورد موقت ساخته شد", "Temporary password created", "Vorläufiges Passwort erstellt", "Geçici şifre oluşturuldu"]));
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(""); }
  }
  async function activateStudent() {
    if (!user) return;
    setAsk(null); setBusy("student");
    try {
      const d = await json<{ user?: Partial<InviteUser> }>(await fetch("/api/admin/users/" + encodeURIComponent(user.id) + "/module-overrides", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey: "student.workspace", enabled: true }) }));
      setUser((c) => (c ? { ...c, ...d.user } : c));
      toast.success(tx(["پکیج دانشجویی فعال شد", "Student package activated", "Studentenpaket aktiviert", "Öğrenci paketi etkinleştirildi"]));
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(""); }
  }
  async function downloadCard() {
    if (!cardRef.current || !user) return;
    setBusy("card");
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, width: CARD_WIDTH, height: CARD_HEIGHT });
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `AIfekr-Invite-${username || user.id}-${lang}.png`; a.click();
      await fetch("/api/admin/invites/log-card", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, language: lang, inviteText: text, imageDataUrl: dataUrl }) }).catch(() => undefined);
      void loadCards(user.id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); } finally { setBusy(""); }
  }

  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Send" size={28} /></span>
        <div>
          <h2>{tx(["دعوت به AIFekr", "Invite to AIFekr", "Zu AIFekr einladen", "AIFekr'e davet et"])}</h2>
          <p>{tx(["ساخت کارت دعوت برای کاربر — یوزرنیم، پسورد موقت، لینک رفرال و متن دعوت.", "Build an invite card for a user — username, temporary password, referral link and invite text.", "Einladungskarte für einen Nutzer — Benutzername, vorläufiges Passwort, Empfehlungslink und Text.", "Bir kullanıcı için davet kartı — kullanıcı adı, geçici şifre, referans bağlantısı ve davet metni."])}</p>
        </div>
      </div>
      <nav className="admin-finance-links">
        <Link className="btn" href="/admin/invites/manage">{tx(["مدیریت دعوت‌نامه‌ها", "Manage invitations", "Einladungen verwalten", "Davetleri yönet"])}</Link>
        <Link className="btn" href="/admin/referrals">{tx(["کدهای دعوت", "Invitation codes", "Einladungscodes", "Davet kodları"])}</Link>
        <Link className="btn" href="/admin/users">{tx(["کاربران", "Users", "Benutzer", "Kullanıcılar"])}</Link>
      </nav>

      {!user && !loading && (
        <section className="panel invite-search">
          <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); void search(); }}>
            <input aria-label={tx(["جست‌وجوی کاربر", "Search users", "Benutzer suchen", "Kullanıcı ara"])} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} />
            <Button type="submit" variant="primary" disabled={busy === "search"}><Icon name="Search" size={16} />{tx(["جست‌وجو", "Search", "Suchen", "Ara"])}</Button>
          </form>
          {results && (results.length ? <div className="admin-pick-list">{results.map((r) => <button key={r.id} onClick={() => pick(r)}><span>{r.name || tx(["بدون نام", "No name", "Ohne Namen", "İsimsiz"])}</span><small><bdi dir="ltr">{r.email || r.phone}</bdi></small></button>)}</div> : <Empty />)}
        </section>
      )}
      {loading && <section className="panel" aria-busy="true" />}

      {user && (
        <div className="invite-layout">
          <div className="invite-main">
            <section className="panel row-between">
              <div><small>{tx(["کاربر", "User", "Benutzer", "Kullanıcı"])}</small><h3><Link href={"/admin/users/" + encodeURIComponent(user.id)}>{user.name || username}</Link></h3></div>
              <Button onClick={change}><Icon name="UserRoundSearch" size={16} />{tx(["کاربر دیگر", "Another user", "Anderer Benutzer", "Başka kullanıcı"])}</Button>
            </section>

            <section className="panel">
              <h3>{tx(["اطلاعات ورود", "Sign-in details", "Anmeldedaten", "Giriş bilgileri"])}</h3>
              <CopyRow label={tx(["یوزرنیم", "Username", "Benutzername", "Kullanıcı adı"])} value={username} />
              <div className="invite-field">
                <div><small>{tx(["پسورد موقت", "Temporary password", "Vorläufiges Passwort", "Geçici şifre"])}</small><bdi dir="ltr">{password || tx(["— هنوز ساخته نشده —", "— not created yet —", "— noch nicht erstellt —", "— henüz oluşturulmadı —"])}</bdi></div>
                <div className="domain-actions">
                  {password && <Button label={tx(["کپی", "Copy", "Kopieren", "Kopyala"])} onClick={() => { void navigator.clipboard?.writeText(password).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"]))); }}><Icon name="Copy" size={15} /></Button>}
                  <Button variant="primary" disabled={busy === "password"} onClick={() => setAsk("password")}><Icon name="RefreshCw" size={15} />{password ? tx(["ساخت دوباره", "Create again", "Neu erstellen", "Yeniden oluştur"]) : tx(["ساخت پسورد", "Create password", "Passwort erstellen", "Şifre oluştur"])}</Button>
                </div>
              </div>
              <p className="fine-print">{tx(["ساخت پسورد جدید بلافاصله پسورد فعلی کاربر را عوض می‌کند و او در اولین ورود باید آن را تغییر دهد.", "Creating a password immediately replaces the user's current password; they must change it on first sign-in.", "Ein neues Passwort ersetzt sofort das aktuelle; beim ersten Login muss es geändert werden.", "Yeni şifre mevcut şifrenin yerini hemen alır; ilk girişte değiştirilmesi gerekir."])}</p>
            </section>

            <section className="panel">
              <h3>{tx(["لینک رفرال اختصاصی", "Personal referral link", "Persönlicher Empfehlungslink", "Kişisel referans bağlantısı"])}</h3>
              {link ? <CopyRow label={tx(["لینک", "Link", "Link", "Bağlantı"])} value={link} /> : <p className="fine-print">{tx(["این کاربر هنوز کد دعوت ندارد. از صفحهٔ «کدهای دعوت» برایش کد بسازید.", "This user has no invitation code yet. Give them one on the Invitation codes page.", "Dieser Nutzer hat noch keinen Code. Vergeben Sie einen unter Einladungscodes.", "Bu kullanıcının henüz kodu yok. Davet kodları sayfasından bir kod verin."])} <Link href="/admin/referrals">{tx(["کدهای دعوت", "Invitation codes", "Einladungscodes", "Davet kodları"])}</Link></p>}
            </section>

            <section className="panel">
              <div className="row-between">
                <h3>{tx(["متن دعوت", "Invite text", "Einladungstext", "Davet metni"])}</h3>
                <nav className="gc-chips">{(Object.keys(LANG_LABEL) as Lang[]).map((l) => <button key={l} aria-pressed={lang === l} onClick={() => { setLang(l); setEdited(false); }}>{LANG_LABEL[l]}</button>)}</nav>
              </div>
              <textarea className="invite-text" rows={10} dir={lang === "fa" ? "rtl" : "ltr"} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} />
              <div className="domain-actions">
                <Button onClick={() => { void navigator.clipboard?.writeText(text).then(() => toast.success(tx(["کپی شد", "Copied", "Kopiert", "Kopyalandı"]))); }}><Icon name="Copy" size={15} />{tx(["کپی متن دعوت", "Copy invite text", "Text kopieren", "Metni kopyala"])}</Button>
                {edited && <Button onClick={() => setEdited(false)}><Icon name="RotateCcw" size={15} />{tx(["بازگشت به متن آماده", "Back to the template", "Zur Vorlage zurück", "Şablona dön"])}</Button>}
              </div>
            </section>

            <section className="panel">
              <h3>{tx(["دعوت دانشجویی", "Student invitation", "Studenten-Einladung", "Öğrenci daveti"])}</h3>
              <p className="fine-print">{tx(["پکیج دانشجویی، فضای دانشگاه و دسته‌بندی دانشجویان را برای همین حساب فعال کنید. مدت پیش‌فرض ۹۰ روز است.", "Activate the student package, university workspace and student category for this account. Default length is 90 days.", "Aktiviert Studentenpaket, Uni-Bereich und Studentenkategorie für dieses Konto. Standard: 90 Tage.", "Bu hesap için öğrenci paketini, üniversite alanını ve öğrenci kategorisini etkinleştirir. Varsayılan süre 90 gün."])}</p>
              {user.accountType === "STUDENT" && <p className="fine-print">{tx(["حساب دانشجویی", "Student account", "Studentenkonto", "Öğrenci hesabı"])} · {user.planExpiry ? new Date(user.planExpiry).toLocaleDateString(tag) : "—"}</p>}
              <Button disabled={busy === "student"} onClick={() => setAsk("student")}><Icon name="GraduationCap" size={16} />{tx(["فعال‌سازی پکیج دانشجویی", "Activate student package", "Studentenpaket aktivieren", "Öğrenci paketini etkinleştir"])}</Button>
            </section>
          </div>

          <aside className="panel invite-preview">
            <h3>{tx(["پیش‌نمایش کارت دعوت", "Invite card preview", "Kartenvorschau", "Kart önizlemesi"])}</h3>
            <div className="invite-card-frame" dir="ltr" style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: CARD_WIDTH, height: CARD_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <InviteCard ref={cardRef} lang={lang} name={user.name || username} username={username} password={password || "••••••••"} link={link} trialDays={trialDays} qr={qr} text={text} />
              </div>
            </div>
            <Button variant="primary" disabled={busy === "card"} onClick={() => void downloadCard()}><Icon name="Download" size={16} />{tx(["دانلود کارت (PNG)", "Download card (PNG)", "Karte laden (PNG)", "Kartı indir (PNG)"])}</Button>
            {!password && <p className="fine-print">{tx(["پسورد هنوز ساخته نشده و روی کارت نقطه‌چین است.", "No password yet; the card shows dots.", "Noch kein Passwort; die Karte zeigt Punkte.", "Henüz şifre yok; kartta noktalar görünür."])}</p>}
            {!!cards.length && <>
              <h3>{tx(["کارت‌های ذخیره‌شدهٔ قبلی", "Previously saved cards", "Früher gespeicherte Karten", "Önceden kaydedilen kartlar"])}</h3>
              <div className="invite-saved">{cards.filter((c) => c.imageUrl).map((c) => <a key={c.id} href={c.imageUrl!} target="_blank" rel="noreferrer" title={new Date(c.createdAt).toLocaleString(tag)}><img src={c.imageUrl!} alt={c.language} /></a>)}</div>
            </>}
          </aside>
        </div>
      )}

      {ask === "password" && user && (
        <Modal title={tx(["ساخت پسورد موقت", "Create a temporary password", "Vorläufiges Passwort erstellen", "Geçici şifre oluştur"])} onClose={() => setAsk(null)}>
          <p>{tx([`پسورد فعلی ${user.name || username} همین الان عوض می‌شود و با پسورد قبلی دیگر نمی‌تواند وارد شود. ادامه می‌دهید؟`, `${user.name || username}'s current password is replaced right now and the old one stops working. Continue?`, `Das aktuelle Passwort von ${user.name || username} wird sofort ersetzt; das alte funktioniert nicht mehr. Fortfahren?`, `${user.name || username} kullanıcısının mevcut şifresi hemen değişir ve eskisi çalışmaz. Devam edilsin mi?`])}</p>
          <div className="domain-actions"><Button variant="danger" onClick={() => void resetPassword()}>{tx(["بله، پسورد را عوض کن", "Yes, replace the password", "Ja, Passwort ersetzen", "Evet, şifreyi değiştir"])}</Button></div>
        </Modal>
      )}
      {ask === "student" && user && (
        <Modal title={tx(["فعال‌سازی پکیج دانشجویی", "Activate student package", "Studentenpaket aktivieren", "Öğrenci paketini etkinleştir"])} onClose={() => setAsk(null)}>
          <p>{tx([`حساب ${user.name || username} دانشجویی می‌شود و پکیج دانشجویی ۹۰ روزه برایش فعال می‌شود.`, `${user.name || username}'s account becomes a student account with a 90-day student package.`, `Das Konto von ${user.name || username} wird ein Studentenkonto mit 90-Tage-Paket.`, `${user.name || username} hesabı 90 günlük paketle öğrenci hesabı olur.`])}</p>
          <div className="domain-actions"><Button variant="primary" onClick={() => void activateStudent()}>{tx(["بله، فعال کن", "Yes, activate", "Ja, aktivieren", "Evet, etkinleştir"])}</Button></div>
        </Modal>
      )}
    </>
  );
}

/* ───────────────────────── Module access ───────────────────────── */

type Pack = { id: string; slug: string; name: string; emoji: string };
type ModuleRow = { key: string; category: string; labelFa: string; labelEn: string; enabled: boolean };
type OverrideRow = { key: string; category: string; labelFa: string; labelEn: string; override: boolean | null };
const CATEGORIES: Record<string, Tx> = { crm: ["ماژول‌های CRM", "CRM modules", "CRM-Module", "CRM modülleri"], agent: ["ایجنت‌های تخصصی", "Specialist agents", "Fach-Agenten", "Uzman ajanlar"], student: ["دانشجویی", "Student", "Studium", "Öğrenci"] };

export function LiveModuleAccess() {
  const { tx } = useT();
  const [tab, setTab] = useState<"packs" | "customers">("packs");
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="ToggleRight" size={28} /></span>
        <div>
          <h2>{tx(["دسترسی ماژول‌ها", "Module access", "Modulzugriff", "Modül erişimi"])}</h2>
          <p>{tx(["نمایش ماژول‌های CRM و ایجنت‌ها بر اساس پک صنعتی، با امکان استثنا برای مشتریان خاص.", "Which CRM modules and agents each industry pack shows, with exceptions for specific customers.", "Welche CRM-Module und Agenten jedes Branchenpaket zeigt, mit Ausnahmen für einzelne Kunden.", "Her sektör paketinin hangi CRM modüllerini ve ajanları gösterdiği, belirli müşteriler için istisnalarla."])}</p>
        </div>
      </div>
      <nav className="module-tabs">
        <a href="#packs" className={tab === "packs" ? "selected" : ""} aria-current={tab === "packs" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("packs"); }}>{tx(["پیش‌فرض پک‌ها", "Pack defaults", "Paket-Standards", "Paket varsayılanları"])}</a>
        <a href="#customers" className={tab === "customers" ? "selected" : ""} aria-current={tab === "customers" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("customers"); }}>{tx(["استثنای مشتری", "Customer exceptions", "Kundenausnahmen", "Müşteri istisnaları"])}</a>
        <Link href="/admin/industry-packs">{tx(["پکیج‌های صنفی", "Industry packs", "Branchenpakete", "Sektör paketleri"])}</Link>
      </nav>
      {tab === "packs" ? <PackDefaults /> : <CustomerOverrides />}
    </>
  );
}

function ModuleLabel({ m }: { m: { key: string; labelFa: string; labelEn: string } }) {
  const { i } = useT();
  return <div><strong>{i === 0 ? m.labelFa : m.labelEn}</strong><small><bdi dir="ltr">{i === 0 ? m.labelEn + " · " : ""}{m.key}</bdi></small></div>;
}

function PackDefaults() {
  const { tx } = useT();
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [mods, setMods] = useState<ModuleRow[] | null>(null);
  useEffect(() => {
    fetch("/api/admin/industry-packs", { credentials: "include" }).then((r) => json<{ packs: Pack[] }>(r)).then((d) => setPacks(d.packs || [])).catch((e) => { setPacks([]); toast.error(e.message); });
  }, []);
  async function open(p: Pack) {
    setPack(p); setMods(null);
    try { const d = await json<{ modules: ModuleRow[] }>(await fetch(`/api/admin/industry-packs/${p.id}/modules`, { credentials: "include" })); setMods(d.modules || []); }
    catch (e) { setMods([]); toast.error(e instanceof Error ? e.message : "FAILED"); }
  }
  async function toggle(m: ModuleRow) {
    if (!pack) return;
    const next = !m.enabled;
    setMods((l) => l && l.map((x) => (x.key === m.key ? { ...x, enabled: next } : x)));
    const r = await fetch(`/api/admin/industry-packs/${pack.id}/modules`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey: m.key, enabled: next }) }).catch(() => null);
    if (!r?.ok) { toast.error(tx(["ذخیره نشد؛ تغییر برگردانده شد", "Not saved; change reverted", "Nicht gespeichert; zurückgesetzt", "Kaydedilmedi; geri alındı"])); setMods((l) => l && l.map((x) => (x.key === m.key ? { ...x, enabled: !next } : x))); }
  }
  return (
    <div className="access-layout">
      <div className="admin-pick-list" aria-busy={!packs}>
        {packs?.map((p) => <button key={p.id} className={pack?.id === p.id ? "selected" : ""} onClick={() => void open(p)}><span>{p.emoji} {p.name}</span><small><bdi dir="ltr">{p.slug}</bdi></small></button>)}
        {packs && !packs.length && <Empty />}
      </div>
      <section className="panel" aria-busy={!!pack && !mods}>
        {!pack ? <p className="fine-print">{tx(["یک پک صنعتی را انتخاب کنید.", "Pick an industry pack.", "Branchenpaket wählen.", "Bir sektör paketi seçin."])}</p>
          : mods && !mods.length ? <p className="fine-print">{tx(["ماژول گیت‌شده‌ای برای این صنعت تعریف نشده است.", "No gated modules are defined for this industry.", "Für diese Branche sind keine Module definiert.", "Bu sektör için tanımlı modül yok."])}</p>
          : mods && Object.keys(CATEGORIES).map((cat) => {
            const items = mods.filter((m) => m.category === cat);
            if (!items.length) return null;
            return <div className="access-group" key={cat}><h3>{tx(CATEGORIES[cat])}</h3>{items.map((m) => <div className="access-row" key={m.key}><ModuleLabel m={m} /><label className="gc-switch"><input type="checkbox" checked={m.enabled} onChange={() => void toggle(m)} />{m.enabled ? tx(["فعال", "On", "An", "Açık"]) : tx(["خاموش", "Off", "Aus", "Kapalı"])}</label></div>)}</div>;
          })}
      </section>
    </div>
  );
}

function CustomerOverrides() {
  const { tx } = useT();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[] | null>(null);
  const [sel, setSel] = useState<SearchUser | null>(null);
  const [mods, setMods] = useState<OverrideRow[] | null>(null);
  async function search() {
    if (!query.trim()) return;
    try { const d = await json<{ users: SearchUser[] }>(await fetch("/api/admin/users?search=" + encodeURIComponent(query), { credentials: "include" })); setUsers(d.users || []); }
    catch (e) { toast.error(e instanceof Error ? e.message : "FAILED"); }
  }
  async function open(u: SearchUser) {
    setSel(u); setMods(null);
    try { const d = await json<{ modules: OverrideRow[] }>(await fetch(`/api/admin/users/${encodeURIComponent(u.id)}/module-overrides`, { credentials: "include" })); setMods(d.modules || []); }
    catch (e) { setMods([]); toast.error(e instanceof Error ? e.message : "FAILED"); }
  }
  async function set(m: OverrideRow, value: boolean | null) {
    if (!sel) return;
    const prev = m.override;
    setMods((l) => l && l.map((x) => (x.key === m.key ? { ...x, override: value } : x)));
    const r = await fetch(`/api/admin/users/${encodeURIComponent(sel.id)}/module-overrides`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleKey: m.key, enabled: value }) }).catch(() => null);
    if (!r?.ok) { toast.error(tx(["ذخیره نشد؛ تغییر برگردانده شد", "Not saved; change reverted", "Nicht gespeichert; zurückgesetzt", "Kaydedilmedi; geri alındı"])); setMods((l) => l && l.map((x) => (x.key === m.key ? { ...x, override: prev } : x))); }
  }
  const OPTIONS: [boolean | null, Tx][] = [[true, ["فعال", "On", "An", "Açık"]], [null, ["پیش‌فرض پک", "Pack default", "Paket-Standard", "Paket varsayılanı"]], [false, ["غیرفعال", "Off", "Aus", "Kapalı"]]];
  return (
    <div className="access-layout">
      <div>
        <form className="domain-toolbar" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input aria-label={tx(["جست‌وجوی مشتری", "Search customers", "Kunden suchen", "Müşteri ara"])} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(["نام، ایمیل یا موبایل", "Name, email or phone", "Name, E-Mail oder Telefon", "Ad, e-posta veya telefon"])} />
          <Button type="submit" label={tx(["جست‌وجو", "Search", "Suchen", "Ara"])}><Icon name="Search" size={16} /></Button>
        </form>
        <div className="admin-pick-list">
          {users?.map((u) => <button key={u.id} className={sel?.id === u.id ? "selected" : ""} onClick={() => void open(u)}><span>{u.name || tx(["بدون نام", "No name", "Ohne Namen", "İsimsiz"])}</span><small><bdi dir="ltr">{u.email || u.phone}</bdi></small></button>)}
          {users && !users.length && <Empty />}
        </div>
      </div>
      <section className="panel" aria-busy={!!sel && !mods}>
        {!sel ? <p className="fine-print">{tx(["یک مشتری را جست‌وجو و انتخاب کنید.", "Search for and pick a customer.", "Kunden suchen und wählen.", "Bir müşteri arayıp seçin."])}</p> : <>
          <div className="row-between"><h3>{sel.name || sel.email || sel.phone}</h3><Link className="btn" href={"/admin/users/" + encodeURIComponent(sel.id)}>{tx(["پروفایل کاربر", "User profile", "Benutzerprofil", "Kullanıcı profili"])}</Link></div>
          <p className="fine-print">{tx(["استثنا بر پیش‌فرض پک صنعتی مشتری اولویت دارد. «پیش‌فرض پک» یعنی استثنایی ثبت نشده است.", "An exception overrides the customer's industry-pack default. “Pack default” means no exception is set.", "Eine Ausnahme hat Vorrang vor dem Paket-Standard. „Paket-Standard“ heißt: keine Ausnahme.", "İstisna, paketin varsayılanının önüne geçer. “Paket varsayılanı” istisna olmadığı anlamına gelir."])}</p>
          {mods?.map((m) => <div className="access-row" key={m.key}><ModuleLabel m={m} /><div className="gc-chips">{OPTIONS.map(([v, l]) => <button key={String(v)} aria-pressed={m.override === v} onClick={() => void set(m, v)}>{tx(l)}</button>)}</div></div>)}
        </>}
      </section>
    </div>
  );
}

/* ───────────────────────── Instagram connections ───────────────────────── */

type Connection = { id: string; igUsername: string | null; igUserId: string; businessId: string | null; tokenExpiry: string | null; expired: boolean; updatedAt: string; user: { id: string; name: string | null; email: string | null } };

export function LiveSocialConnections() {
  const { n, tx, tag } = useT();
  const [rows, setRows] = useState<Connection[] | null>(null);
  const [ask, setAsk] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const d = await json<{ connections: Connection[] }>(await fetch("/api/admin/social/connections", { credentials: "include" })); setRows(d.connections); }
    catch { setRows([]); toast.error(tx(["بارگذاری اتصال‌ها انجام نشد.", "Could not load connections.", "Verbindungen konnten nicht geladen werden.", "Bağlantılar yüklenemedi."])); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const label = (c: Connection) => (c.igUsername ? "@" + c.igUsername : c.igUserId);
  async function release(c: Connection) {
    setBusy(true);
    try { await json(await fetch("/api/admin/social/connections?id=" + encodeURIComponent(c.id), { method: "DELETE", credentials: "include" })); toast.success(tx(["اتصال آزاد شد", "Connection released", "Verbindung freigegeben", "Bağlantı serbest bırakıldı"])); setAsk(null); await load(); }
    catch { toast.error(tx(["آزادسازی انجام نشد.", "Release failed.", "Freigabe fehlgeschlagen.", "Serbest bırakılamadı."])); }
    finally { setBusy(false); }
  }
  const expired = rows?.filter((r) => r.expired).length ?? 0;
  return (
    <>
      <div className="admin-finance-heading">
        <span className="icon-chip orange"><Icon name="Instagram" size={28} /></span>
        <div>
          <h2>{tx(["اتصال‌های اینستاگرام", "Instagram connections", "Instagram-Verbindungen", "Instagram bağlantıları"])}</h2>
          <p>{tx(["هر حساب اینستاگرام به کدام حساب AIFekr وصل است. آزادسازی در گزارش فعالیت مدیران ثبت می‌شود. توکن‌ها هیچ‌وقت از سرور خارج نمی‌شوند.", "Which AIFekr account holds each Instagram account. Releases are recorded in the admin audit log. Tokens never leave the server.", "Welches AIFekr-Konto jedes Instagram-Konto hält. Freigaben werden protokolliert. Tokens verlassen nie den Server.", "Her Instagram hesabının hangi AIFekr hesabına bağlı olduğu. Serbest bırakmalar denetim günlüğüne yazılır. Tokenlar sunucudan çıkmaz."])}</p>
        </div>
      </div>
      <div className="stats-grid" aria-busy={!rows}>
        <div className="panel stat"><span>{tx(["اتصال‌ها", "Connections", "Verbindungen", "Bağlantılar"])}</span><strong>{rows ? n(rows.length) : "—"}</strong></div>
        <div className="panel stat"><span>{tx(["توکن منقضی", "Expired tokens", "Abgelaufene Tokens", "Süresi dolmuş token"])}</span><strong className={expired ? "pending" : ""}>{rows ? n(expired) : "—"}</strong></div>
      </div>
      <section className="panel" aria-busy={!rows}>
        {rows?.length ? <div className="table-scroll"><table className="admin-finance-table">
          <thead><tr>{([["اینستاگرام", "Instagram", "Instagram", "Instagram"], ["مالک", "Owner", "Inhaber", "Sahip"], ["فضای کاری", "Workspace", "Arbeitsbereich", "Çalışma alanı"], ["وضعیت توکن", "Token", "Token", "Token"], ["آخرین تغییر", "Last change", "Letzte Änderung", "Son değişiklik"], ["", "", "", ""]] as Tx[]).map((h, k) => <th key={k}>{tx(h)}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>
            <td><bdi dir="ltr">{label(r)}</bdi></td>
            <td><Link href={"/admin/users/" + encodeURIComponent(r.user.id)}>{r.user.name || r.user.email || r.user.id}</Link></td>
            <td><bdi dir="ltr">{r.businessId || "—"}</bdi></td>
            <td>{r.expired ? <span className="badge red">{tx(["منقضی", "Expired", "Abgelaufen", "Süresi doldu"])}</span> : r.tokenExpiry ? new Date(r.tokenExpiry).toLocaleDateString(tag) : tx(["نامشخص", "Unknown", "Unbekannt", "Bilinmiyor"])}</td>
            <td>{new Date(r.updatedAt).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" })}</td>
            <td><Button variant="danger" onClick={() => setAsk(r)}>{tx(["آزادسازی", "Release", "Freigeben", "Serbest bırak"])}</Button></td>
          </tr>)}</tbody>
        </table></div> : rows && <p className="fine-print">{tx(["هنوز حساب اینستاگرامی وصل نشده است.", "No Instagram account is connected yet.", "Noch kein Instagram-Konto verbunden.", "Henüz bağlı Instagram hesabı yok."])}</p>}
      </section>
      {ask && (
        <Modal title={tx(["آزادسازی اتصال", "Release connection", "Verbindung freigeben", "Bağlantıyı serbest bırak"])} onClose={() => setAsk(null)}>
          <p>{tx([`اتصال ${label(ask)} آزاد شود؟ کمپین‌ها، صف انتشار و سوابق همین اتصال هم حذف می‌شوند و این کار برگشت‌پذیر نیست.`, `Release ${label(ask)}? Its campaigns, publishing queue and history are deleted too. This cannot be undone.`, `${label(ask)} freigeben? Kampagnen, Warteschlange und Verlauf werden ebenfalls gelöscht. Das ist endgültig.`, `${label(ask)} serbest bırakılsın mı? Kampanyaları, yayın kuyruğu ve geçmişi de silinir. Geri alınamaz.`])}</p>
          <div className="domain-actions"><Button variant="danger" disabled={busy} onClick={() => void release(ask)}>{tx(["بله، آزاد کن", "Yes, release", "Ja, freigeben", "Evet, serbest bırak"])}</Button></div>
        </Modal>
      )}
    </>
  );
}
