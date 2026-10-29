import Link from "@/components/site-link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span>404</span>
      <h1>این فکر هنوز به جایی نرسیده!</h1>
      <p>از خانه شروع کنیم؟</p>
      <Link className="btn primary" href="/home">
        بازگشت به خانه
      </Link>
    </main>
  );
}
