"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "./providers";
import { Button, Icon } from "./ui";

type Copy = { title: string; body: string; country: string; phone: string; save: string; required: string; invalid: string; logout: string };
type Data = { required: boolean; hasPhone: boolean; lang: string; copy: Copy; countries: { code: string; name: string; dialCode: string }[] };

/**
 * Required mobile number (main site lib/auth/phoneRequirement). The main site
 * sends anyone without a number here before any other page; the copy and the
 * country list come from /api/account/phone in the visitor's language.
 */
export function LiveCompletePhone() {
  const { fa } = useApp();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [data, setData] = useState<Data | null>(null);
  const [country, setCountry] = useState("IR"), [phone, setPhone] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/account/phone", { cache: "no-store" }).then((r) => r.json()).then((d: Data) => {
      if (d.hasPhone) { location.replace(redirect || "/home"); return; }
      setData(d);
    }).catch(() => setError(fa ? "بارگذاری نشد" : "Could not load"));
  }, [redirect, fa]);
  if (!data) return <main id="main" className="page"><div className="panel" style={{ padding: 24 }}>{error || "…"}</div></main>;
  const c = data.copy, dial = data.countries.find((x) => x.code === country)?.dialCode ?? "";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return setError(c.required);
    setBusy(true); setError("");
    const r = await fetch("/api/account/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, phone, redirect, lang: data!.lang }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) location.replace(d.redirect || "/home");
    else { setError(d?.error || c.invalid); setBusy(false); }
  }
  return (
    <main id="main" className="page complete-phone">
      <form className="auth-form panel" onSubmit={submit} style={{ maxWidth: 460, margin: "24px auto" }}>
        <span className="eyebrow orange-text"><Icon name="Smartphone" size={15} /></span>
        <h1>{c.title}</h1>
        <p>{c.body}</p>
        <label>
          {c.country}
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {data.countries.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
        </label>
        <label>
          {c.phone} <span aria-hidden="true" className="orange-text">*</span>
          <span className="phone-field" dir="ltr">
            {dial && <span className="dial-code">{dial}</span>}
            <input type="tel" required aria-required="true" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={country === "IR" ? "9123456789" : "123456789"} dir="ltr" />
          </span>
        </label>
        {error && <p role="alert" className="form-error" style={{ color: "var(--danger, #ef4444)" }}>{error}</p>}
        <Button type="submit" variant="primary full" disabled={busy}>{c.save}</Button>
        <Button variant="ghost full" onClick={() => { void fetch("/api/auth/logout", { method: "POST" }).finally(() => location.replace("/login")); }}>{c.logout}</Button>
      </form>
    </main>
  );
}
