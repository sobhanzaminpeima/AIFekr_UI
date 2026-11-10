"use client";
// Sign-in and sign-up on aifekr.com in the new design. Every request, field,
// rule and redirect is the classic pages' own ((auth)/login and
// (auth)/register in the main site); only the presentation differs. Wording
// comes from the main site's dictionaries through /api/public/site.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSite } from "@/components/site-link";
import { Button, Icon } from "./ui";
import type { AuthData } from "@/lib/live";
import type { Locale } from "@/lib/i18n";

const LANG_OPTIONS: { code: Locale; label: string }[] = [
  { code: "fa", label: "فارسی" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
];

/** Same-origin relative paths only, never ?redirect=//elsewhere (open redirect). */
function safeRedirect(target: string | null): string | null {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : null;
}

/** Main site's accountTypeFor (lib/auth/accountAudience). */
type AccountType = "PERSONAL" | "STUDENT" | "BUSINESS" | "FITNESS";
function accountTypeFor(plan: unknown, choice: unknown): AccountType {
  if (typeof plan === "string" && plan.startsWith("STUDENT_")) return "STUDENT";
  if (typeof plan === "string" && (plan.startsWith("TEAM_") || plan.startsWith("CRM_"))) return "BUSINESS";
  if (typeof plan === "string" && plan.startsWith("FIT_")) return "FITNESS";
  return choice === "FITNESS" ? "FITNESS" : choice === "STUDENT" || choice === "BUSINESS" ? choice : "PERSONAL";
}

/** Main site's registrationPhone (lib/constants/countries): Iranian numbers stay local, others get their dial code once. */
function registrationPhone(raw: string, country: string, dialCode: string): string {
  let phone = raw.trim().replace(/[۰-۹٠-٩]/g, c => String(c.charCodeAt(0) - (c >= "۰" ? 1776 : 1632))).replace(/[\s()-]/g, "");
  if (!phone) return "";
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (country === "IR") {
    if (phone.startsWith("+98")) phone = `0${phone.slice(3).replace(/^0+/, "")}`;
    else if (/^9\d{9}$/.test(phone)) phone = `0${phone}`;
    if (!/^09\d{9}$/.test(phone)) throw new Error("Invalid Iranian mobile number (+98 9xxxxxxxxx)");
    return phone;
  }
  const prefix = dialCode;
  if (!phone.startsWith("+") && prefix) phone = `${prefix}${phone.replace(/^0+/, "")}`;
  if (!/^\+[1-9]\d{6,14}$/.test(phone) || (prefix && !phone.startsWith(prefix))) throw new Error("Invalid international phone number");
  return phone;
}

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96A8.997 8.997 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

const ART: Record<Locale, [string, string, string]> = {
  fa: ["یک فکر، هزار امکان", "جایی برای فکرهای تو.", "بساز، یاد بگیر، جلو برو."],
  en: ["ONE SPARK. A THOUSAND POSSIBILITIES.", "A little space for your big ideas.", "Create. Learn. Keep moving."],
  de: ["EIN FUNKE. TAUSEND MÖGLICHKEITEN.", "Ein Ort für deine großen Ideen.", "Erschaffen. Lernen. Weitergehen."],
  tr: ["BİR KIVILCIM. BİN OLASILIK.", "Büyük fikirlerin için küçük bir alan.", "Üret. Öğren. İlerle."],
};

const TITLES: Record<Locale, { login: string; register: string }> = {
  fa: { login: "خوش برگشتی!", register: "خوش آمدی!" },
  en: { login: "Welcome back.", register: "Welcome!" },
  de: { login: "Willkommen zurück.", register: "Willkommen!" },
  tr: { login: "Tekrar hoş geldin.", register: "Hoş geldin!" },
};

function AuthFrame({ eyebrow, title, subtitle, children }: { eyebrow?: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  const [spark, heading, line] = ART[useSite()!.lang];
  return (
    <div className="auth-layout">
      <div className="auth-form panel">
        <span className="eyebrow orange-text">{spark}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {eyebrow}
        {children}
      </div>
      <div className="auth-art">
        <img src="/art/orbit.svg" alt="" />
        <h2>{heading}</h2>
        <p>{line}</p>
      </div>
    </div>
  );
}

function OrDivider({ label }: { label: string }) {
  return <div className="auth-or"><span />{label}<span /></div>;
}

/** The number tab only logs in accounts that already have a number (sign-up by number is off for now). */
const TAB_PHONE: Record<string, string> = { fa: "ورود با شماره (حساب‌های قبلی)", en: "Mobile login (existing accounts)", de: "Mobil-Login (bestehende Konten)", tr: "Numarayla giriş (mevcut hesaplar)" };
function countryName(c: { code: string; name: string }, lang: string) {
  if (lang !== "tr" || !/^[A-Z]{2}$/.test(c.code)) return c.name;
  try { return new Intl.DisplayNames(["tr"], { type: "region" }).of(c.code) ?? c.name; } catch { return c.name; }
}
const EMAIL_REQUIRED: Record<string, string> = { fa: "یک ایمیل معتبر وارد کنید.", en: "Enter a valid email address.", de: "Bitte eine gültige E-Mail-Adresse eingeben.", tr: "Geçerli bir e-posta adresi gir." };

export function LiveLogin() {
  const site = useSite()!;
  const copy = (site.auth as AuthData).login;
  const params = useSearchParams();
  const lang = site.lang;
  const [mode, setMode] = useState<"phone" | "email">("email");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const redirect = safeRedirect(params.get("redirect"));

  useEffect(() => {
    const error = params.get("error");
    if (error) toast.error(error);
  }, [params]);

  async function sendOtp() {
    if (!phone || phone.length < 10) return void toast.error(copy.errPhoneInvalid);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(copy.otpSent);
      if (data.dev_code) setDevCode(data.dev_code);
      setStep("otp");
    } catch (err) {
      toast.error(message(err, copy.errSendFailed));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 4) return void toast.error(copy.errOtpLength);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, redirect: redirect || undefined, ...(["/chat", "/explore", "/choose-plan"].includes(redirect || "") ? { entry: "chat" } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(copy.loginSuccess);
      const role = data.user?.role;
      window.location.href = redirect || (role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin/dashboard" : "/chat");
    } catch (err) {
      toast.error(message(err, copy.errOtpWrong));
    } finally {
      setLoading(false);
    }
  }

  async function emailLogin() {
    if (!email || !password) return void toast.error(copy.errFillEmailPass);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(copy.loginSuccess);
      window.location.href = redirect || "/chat";
    } catch (err) {
      toast.error(message(err, copy.errEmailPassWrong));
    } finally {
      setLoading(false);
    }
  }

  const registerHref = ["/choose-plan", "/explore"].includes(redirect || "")
    ? "/register?entry=chat&redirect=%2Fchoose-plan"
    : redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register";

  return (
    <AuthFrame title={TITLES[lang].login} subtitle={copy.subtitle}>
      {step === "input" ? (
        <div className="chips" role="tablist">
          {(["email", "phone"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "selected" : ""} onClick={() => setMode(m)}>
              <Icon name={m === "phone" ? "Smartphone" : "Mail"} size={15} />
              {m === "phone" ? (TAB_PHONE[lang] ?? TAB_PHONE.en) : copy.tabEmail}
            </button>
          ))}
        </div>
      ) : (
        <div className="auth-otp-head">
          <button type="button" className="text-btn" onClick={() => setStep("input")}>
            <Icon name={lang === "fa" ? "ArrowRight" : "ArrowLeft"} size={15} />
            {copy.back}
          </button>
          <h2>{copy.otpTitle}</h2>
          <p>{copy.otpSentPrefix} <bdi className="mono">{phone}</bdi> {copy.otpSentSuffix}</p>
          {devCode && <p className="auth-dev-code">{copy.testCode} <strong>{devCode}</strong></p>}
        </div>
      )}

      {mode === "phone" ? (
        <form onSubmit={(e) => { e.preventDefault(); if (step === "input") sendOtp(); else verifyOtp(); }}>
          {step === "input" ? (
            <label>
              {copy.phoneLabel}
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" autoComplete="tel" />
            </label>
          ) : (
            <input
              aria-label={copy.otpTitle}
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="۱۲۳۴"
              dir="ltr"
              maxLength={4}
            />
          )}
          <Button type="submit" variant="primary full" disabled={loading || (step === "otp" && otp.length !== 4)}>
            {step === "input" ? (loading ? copy.sending : copy.sendCode) : loading ? copy.verifying : copy.verifyAndLogin}
          </Button>
          {step === "otp" && <button type="button" className="text-btn auth-resend" onClick={sendOtp}>{copy.resendCode}</button>}
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); emailLogin(); }}>
          <label>
            {copy.emailLabel}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" autoComplete="email" />
          </label>
          <label>
            {copy.passwordLabel}
            <span className="password-field">
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" autoComplete="current-password" />
              <button type="button" className="icon-btn" aria-label={copy.passwordLabel} aria-pressed={showPass} onClick={() => setShowPass(!showPass)}>
                <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
              </button>
            </span>
          </label>
          <Button type="submit" variant="primary full" disabled={loading}>{loading ? copy.loggingIn : copy.submit}</Button>
        </form>
      )}

      <OrDivider label={copy.or} />
      <a className="btn full" href={`/api/auth/google?${new URLSearchParams({ redirect: redirect || "", language: lang })}`}>
        <GoogleMark />
        {copy.googleLogin}
      </a>
      <p className="auth-switch">
        {copy.noAccount} <a href={registerHref}>{copy.registerLink}</a>
      </p>
    </AuthFrame>
  );
}

export function LiveRegister() {
  const site = useSite()!;
  const auth = site.auth as AuthData;
  const copy = auth.register, extra = auth.extra;
  const params = useSearchParams();
  const lang = site.lang;
  const packSlug = params.get("pack") || "";
  const refCode = params.get("ref") || "";
  const planCode = params.get("plan") || "";
  const billingPeriod = params.get("period") || "";
  const [promoCode, setPromoCode] = useState(params.get("promo") || params.get("ref") || "");
  const [form, setForm] = useState({ firstName: "", lastName: "", country: "IR", email: "", phone: "", password: "", confirmPassword: "" });
  const [registerLang, setRegisterLang] = useState<Locale>(lang);
  const [accountType, setAccountType] = useState(accountTypeFor(planCode, packSlug ? "BUSINESS" : "PERSONAL"));
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packName, setPackName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const dialCode = auth.countries.find((c) => c.code === form.country)?.dialCode || "";
  const entryChat = params.get("entry") === "chat";
  const studentPlan = accountType === "STUDENT" ? auth.studentPlanCode : "";

  useEffect(() => {
    if (!packSlug) return;
    fetch(`/api/packs/${packSlug}`).then((r) => r.json()).then((d) => { if (d.pack) setPackName(`${d.pack.emoji} ${d.pack.name}`); }).catch(() => {});
  }, [packSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) return void toast.error(copy.errName);
    // Sign-up: email, password and a mobile number, all required (owner decision 2026-11-06); no SMS-code sign-up.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return void toast.error(EMAIL_REQUIRED[lang] ?? EMAIL_REQUIRED.en);
    if (!form.password) return void toast.error(copy.errPasswordRequired);
    if (!form.phone.trim()) return void toast.error(extra.phoneRequired || extra.phoneInvalid);
    if (form.password && form.password !== form.confirmPassword) return void toast.error(copy.errPasswordMismatch);
    if (form.password && form.password.length < 6) return void toast.error(copy.errPasswordShort);
    if (!agreed) return void toast.error(copy.errMustAgree);
    let composedPhone: string;
    try { composedPhone = registrationPhone(form.phone, form.country, dialCode); }
    catch { return void toast.error(extra.phoneInvalid); }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName || undefined, country: form.country || undefined,
          language: registerLang, selectedPlan: planCode || studentPlan || undefined, accountType,
          email: form.email.trim(), phone: composedPhone, password: form.password,
          industryPackSlug: packSlug || undefined, ref: refCode || undefined, promoCode: promoCode || undefined,
          ...(entryChat ? { entry: "chat" } : { redirect: params.get("redirect") || undefined }),
          marketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(copy.success);
      // A full page load, so the language just chosen applies from the first screen.
      const purchasePlan = planCode || studentPlan;
      if (typeof data.redirect === "string" && data.redirect.startsWith("/") && !data.redirect.startsWith("//")) return void window.location.assign(data.redirect);
      window.location.href = entryChat && !purchasePlan
        ? (["/start", "/play", "/explore", "/choose-plan"].includes(params.get("redirect") || "") ? params.get("redirect")! : "/chat")
        : purchasePlan ? `/welcome?plan=${encodeURIComponent(purchasePlan)}&period=${encodeURIComponent(billingPeriod || "monthly")}` : "/welcome";
    } catch (err) {
      toast.error(message(err, copy.errGeneric));
    } finally {
      setLoading(false);
    }
  }

  const googleHref = `/api/auth/google?${new URLSearchParams({
    plan: planCode || studentPlan, period: billingPeriod || "monthly", accountType, language: registerLang, ref: refCode, promo: promoCode,
    redirect: entryChat ? (["/choose-plan", "/explore"].includes(params.get("redirect") || "") ? params.get("redirect")! : "/chat") : params.get("redirect") || "",
  })}`;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthFrame
      title={TITLES[lang].register}
      subtitle={copy.subtitle}
      eyebrow={packName ? <p className="badge orange auth-pack">{copy.selectedPack} {packName}</p> : null}
    >
      <form onSubmit={submit} className="auth-register">
        <label>
          {extra.promoLabel}
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} maxLength={30} dir="ltr" />
          <small>{extra.promoHint}</small>
        </label>
        <label>
          {extra.accountType}
          <select value={accountType} disabled={/^(STUDENT_|TEAM_|CRM_)/.test(planCode)} onChange={(e) => setAccountType(accountTypeFor(null, e.target.value))}>
            {(["FITNESS", "PERSONAL", "STUDENT", "BUSINESS"] as const).map((type) => <option key={type} value={type}>{extra.accountTypes[type]}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label>
            {copy.firstNameLabel}
            <input value={form.firstName} onChange={set("firstName")} placeholder={copy.firstNamePlaceholder} autoComplete="given-name" required />
          </label>
          <label>
            {copy.lastNameLabel}
            <input value={form.lastName} onChange={set("lastName")} placeholder={copy.lastNamePlaceholder} autoComplete="family-name" />
          </label>
        </div>
        <label>
          {copy.countryLabel}
          <select value={form.country} onChange={set("country")}>
            <option value="">{copy.countryPlaceholder}</option>
            {auth.countries.map((c) => <option key={c.code} value={c.code}>{countryName(c, lang)}</option>)}
          </select>
        </label>
        <fieldset className="auth-langs">
          <legend>{copy.languageLabel}</legend>
          <div className="chips">
            {LANG_OPTIONS.map((l) => (
              <button key={l.code} type="button" aria-pressed={registerLang === l.code} className={registerLang === l.code ? "selected" : ""} onClick={() => setRegisterLang(l.code)}>{l.label}</button>
            ))}
          </div>
        </fieldset>
        <label>
          {copy.emailLabel}
          <input type="email" required aria-required="true" value={form.email} onChange={set("email")} placeholder="example@email.com" dir="ltr" autoComplete="email" />
        </label>
        <label>
          <span>{copy.phoneLabel} <span aria-hidden="true" className="orange-text">*</span></span>
          <span className="phone-field" dir="ltr">
            {dialCode && <span className="dial-code">{dialCode}</span>}
            <input type="tel" required aria-required="true" value={form.phone} onChange={set("phone")} placeholder={form.country === "IR" ? "9123456789" : "123456789"} dir="ltr" autoComplete="tel-national" />
          </span>
        </label>
        <label>
          {copy.passwordLabel}
          <span className="password-field">
            <input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")} placeholder={copy.passwordPlaceholder} dir="ltr" autoComplete="new-password" />
            <button type="button" className="icon-btn" aria-label={copy.passwordLabel} aria-pressed={showPass} onClick={() => setShowPass(!showPass)}>
              <Icon name={showPass ? "EyeOff" : "Eye"} size={16} />
            </button>
          </span>
        </label>
        {form.password && (
          <label>
            {copy.confirmPasswordLabel}
            <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" dir="ltr" autoComplete="new-password" />
          </label>
        )}
        <label className="check-label">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {copy.agreePrefix} <a href="/terms" target="_blank">{copy.termsLink}</a> {copy.and} <a href="/privacy" target="_blank">{copy.privacyLink}</a> {copy.agreeSuffix}
          </span>
        </label>
        {/* Optional and unchecked: signing up is not consent to marketing email. */}
        <label className="check-label">
          <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
          <span>{extra.marketingConsent}</span>
        </label>
        <Button type="submit" variant="primary full" disabled={loading || !agreed}>{loading ? copy.creatingAccount : copy.submit}</Button>
      </form>
      <OrDivider label={auth.login.or} />
      <a className="btn full" href={googleHref} onClick={(e) => { if (!agreed) { e.preventDefault(); toast.error(copy.errMustAgree); } }}>
        <GoogleMark />
        {copy.googleRegister}
      </a>
      <p className="auth-switch">
        {copy.haveAccount} <a href="/login">{copy.loginLink}</a>
      </p>
    </AuthFrame>
  );
}
