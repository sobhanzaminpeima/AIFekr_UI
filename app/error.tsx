"use client";
import Link from "@/components/site-link";
import { useApp } from "@/components/providers";
export default function ErrorPage() {
  const { fa } = useApp();
  return (
    <main className="error-page">
      <span>✦</span>
      <h1>
        {fa ? "این بار صفحه آماده نشد." : "This page could not be loaded."}
      </h1>
      <p>{fa ? "دوباره امتحان کنیم؟" : "Try loading it again?"}</p>
      <button className="btn primary" onClick={() => window.location.reload()}>
        {fa ? "دوباره امتحان کن" : "Reload page"}
      </button>
      <Link href="/home">{fa ? "بازگشت به خانه" : "Back to home"}</Link>
    </main>
  );
}
