"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span>✦</span>
      <h1>این بار صفحه آماده نشد.</h1>
      <p>دوباره امتحان کنیم؟</p>
      <button className="btn primary" onClick={reset}>
        دوباره امتحان کن
      </button>
      <Link href="/home">بازگشت به خانه</Link>
    </main>
  );
}
