"use client";
import { useEffect, useState } from "react";
import Link from "./site-link";
import { useApp } from "./providers";
import { Button, Icon, Modal } from "./ui";

const DRAFT = "aifekr-chat-draft";
const STARTERS: [string, string][] = [
  ["یک ایمیل رسمی برای درخواست همکاری بنویس", "Write a formal email asking for a partnership"],
  ["برای کسب‌وکار کوچکم ۵ ایدهٔ پست اینستاگرام بده", "Give me 5 Instagram post ideas for my small business"],
  ["مفهوم یادگیری ماشین را ساده توضیح بده", "Explain machine learning in simple words"],
  ["یک برنامهٔ مطالعهٔ یک‌هفته‌ای بچین", "Plan a one-week study schedule"],
];

/** Try the chat before signing up: the draft is kept, and signing in opens it in the real chat. */
export function LiveExplore() {
  const { tl } = useApp();
  const [draft, setDraft] = useState("");
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { try { setDraft(sessionStorage.getItem(DRAFT) || ""); } catch {} }, []);
  const save = (text: string) => { setDraft(text); try { sessionStorage.setItem(DRAFT, text); } catch {} };
  const chatHref = (text: string) => "/chat" + (text.trim() ? "?prompt=" + encodeURIComponent(text.trim()) : "");
  async function send(event?: React.FormEvent) {
    event?.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      if (response.ok) { location.assign(chatHref(draft)); return; }
    } catch {}
    setBusy(false);
    setSignIn(true);
  }
  const next = encodeURIComponent(chatHref(draft));
  return (
    <main className="explore" id="main">
      <section className="explore-hero">
        <span className="eyebrow orange-text">AIFekr AI Chat</span>
        <h1>{tl("هر سؤالی داری، همین‌جا بپرس.", "Ask anything, right here.")}</h1>
        <p>{tl("بنویس، ایده بگیر و یاد بگیر. پیش‌نویست نگه داشته می‌شود و بعد از ورود، همان‌جا ادامه می‌دهی.", "Write, get ideas and learn. Your draft is kept, and you continue right where you left off after signing in.")}</p>
      </section>
      <form className="explore-box" onSubmit={send}>
        <textarea rows={4} aria-label={tl("پیام شما", "Your message")} placeholder={tl("پیامت را بنویس…", "Type your message…")} value={draft} onChange={(e) => save(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
        <div className="explore-row">
          <small>{tl("هزینهٔ هر پاسخ پیش از ارسال در چت نمایش داده می‌شود.", "The chat shows each reply's cost before you send.")}</small>
          <Button type="submit" variant="primary" disabled={!draft.trim() || busy}><Icon name="Send" size={16} />{tl("ارسال", "Send")}</Button>
        </div>
      </form>
      <div className="explore-starters">
        {STARTERS.map(([fa, en]) => <button key={en} type="button" onClick={() => save(tl(fa, en))}>{tl(fa, en)}</button>)}
      </div>
      <div className="explore-links">
        <Link href="/pricing">{tl("پکیج‌ها و اعتبار", "Packages and credits")}</Link>
        <Link href="/play">{tl("مسابقهٔ رایگان", "Free competitions")}</Link>
        <Link href="/ai-chat">{tl("دربارهٔ چت AIFekr", "About AIFekr chat")}</Link>
      </div>
      {signIn && (
        <Modal title={tl("ورود یا ثبت‌نام", "Sign in or register")} onClose={() => setSignIn(false)}>
          <p>{tl("پیش‌نویست ذخیره شد. بعد از ورود، پیامت در چت آماده است.", "Your draft is saved. After signing in, your message is ready in the chat.")}</p>
          <div className="explore-auth">
            <a className="btn" href={"/api/auth/google?redirect=" + next}>{tl("ادامه با گوگل", "Continue with Google")}</a>
            <Link className="btn primary" href={"/register?entry=chat&redirect=" + next}>{tl("ساخت حساب", "Create account")}</Link>
            <Link className="btn" href={"/login?redirect=" + next}>{tl("ورود", "Sign in")}</Link>
          </div>
        </Modal>
      )}
    </main>
  );
}
