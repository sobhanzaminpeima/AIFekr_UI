"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import { useApp } from "./providers";
import { Button, Empty, Icon, Modal, download } from "./ui";
import { toast } from "sonner";
type Coach = { id: string; name: string; specialty: string; bio: string };
type Product = {
  id: string;
  coach: string;
  title: string;
  description: string;
  price: number;
  weeks: number;
  active: boolean;
};
type Order = {
  id: string;
  product: string;
  coach: string;
  title: string;
  amount: number;
  date: string;
  time: string;
  status: "requested" | "completed" | "cancelled";
};
type Application = {
  id: string;
  name: string;
  email: string;
  specialty: string;
  bio: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
};
type Review = {
  id: string;
  order: string;
  coach: string;
  score: number;
  text: string;
};
const coachesSeed: Coach[] = [
  {
    id: "sample-coach",
    name: "مربی نمونه ای آی فکر",
    specialty: "برنامه‌ریزی و پیگیری تمرین",
    bio: "پروفایل نمونه برای بررسی مسیر انتخاب مربی و ثبت سفارش؛ ارائه‌دهنده خدمت واقعی نیست.",
  },
];
const productsSeed: Product[] = [
  {
    id: "sample-program",
    coach: "sample-coach",
    title: "برنامه تمرین چهار هفته‌ای نمونه",
    description:
      "نمونهٔ صفحه محصول برای نمایش توضیحات برنامه، مدت و سفارش محلی.",
    price: 490000,
    weeks: 4,
    active: true,
  },
];
export function MarketplaceWorkspace({
  view,
  admin = false,
}: {
  view: string;
  admin?: boolean;
}) {
  const { fa, t, n, price } = useApp();
  const [coaches, saveCoaches] = useLocalState<Coach[]>(
    "aifekr-market-coaches",
    coachesSeed,
  );
  const [products, saveProducts] = useLocalState<Product[]>(
    "aifekr-market-products",
    productsSeed,
  );
  const [orders, saveOrders] = useLocalState<Order[]>(
    "aifekr-market-orders",
    [],
  );
  const [applications, saveApplications] = useLocalState<Application[]>(
    "aifekr-market-applications",
    [],
  );
  const [reviews, saveReviews] = useLocalState<Review[]>(
    "aifekr-market-reviews",
    [],
  );
  const [coach, setCoach] = useState<Coach | null>(null),
    [product, setProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [booking, setBooking] = useState<Product | null>(null);
  const [time, setTime] = useState("");
  const [application, setApplication] = useState({
    name: "",
    email: "",
    specialty: "",
    bio: "",
  });
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [score, setScore] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [rejection, setRejection] = useState<Application | null>(null),
    [reason, setReason] = useState("");
  const seller = coaches.find((c) => c.id === "local-seller");
  function order(p: Product) {
    if (time && new Date(time) <= new Date()) {
      toast.error(fa ? "زمان آینده انتخاب کن." : "Choose a future time.");
      return;
    }
    if (
      time &&
      orders.some(
        (o) =>
          o.coach === p.coach && o.time === time && o.status !== "cancelled",
      )
    ) {
      toast.error(
        fa
          ? "این زمان برای مربی رزرو شده است."
          : "This coach is already booked at that time.",
      );
      return;
    }
    saveOrders([
      {
        id: crypto.randomUUID(),
        product: p.id,
        coach: p.coach,
        title: p.title,
        amount: p.price,
        date: new Date().toISOString(),
        time,
        status: "requested",
      },
      ...orders,
    ]);
    setBooking(null);
    toast.success(
      fa
        ? "سفارش آزمایشی ثبت شد؛ پرداختی انجام نشد."
        : "Demo order saved. No payment was made.",
    );
  }
  if (admin)
    return (
      <section className="panel">
        <h2>
          {fa ? "بررسی درخواست‌های مربیگری" : "Review coach applications"}
        </h2>
        {applications.length ? (
          applications.map((a) => (
            <article className="domain-card" key={a.id}>
              <div className="row-between">
                <h3>{a.name}</h3>
                <span className="badge">{a.status}</span>
              </div>
              <p>
                {a.email} · {a.specialty}
              </p>
              <p>{a.bio}</p>
              {a.reason && <p>{a.reason}</p>}
              <div className="domain-actions">
                <Button
                  disabled={a.status !== "pending"}
                  onClick={() => {
                    saveApplications(
                      applications.map((x) =>
                        x.id === a.id ? { ...x, status: "approved" } : x,
                      ),
                    );
                    const next = {
                      id: "local-seller",
                      name: a.name,
                      specialty: a.specialty,
                      bio: a.bio,
                    };
                    saveCoaches(
                      seller
                        ? coaches.map((c) => (c.id === seller.id ? next : c))
                        : [...coaches, next],
                    );
                  }}
                >
                  {fa ? "تأیید و فعال‌سازی فروشنده" : "Approve & enable seller"}
                </Button>
                <Button
                  disabled={a.status !== "pending"}
                  onClick={() => {
                    setRejection(a);
                    setReason("");
                  }}
                >
                  {fa ? "رد درخواست" : "Reject application"}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <Empty />
        )}
        {rejection && (
          <Modal
            title={fa ? "دلیل رد درخواست" : "Rejection reason"}
            onClose={() => setRejection(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveApplications(
                  applications.map((x) =>
                    x.id === rejection.id
                      ? { ...x, status: "rejected", reason }
                      : x,
                  ),
                );
                setRejection(null);
              }}
            >
              <label>
                {fa ? "دلیل" : "Reason"}
                <textarea
                  required
                  rows={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <Button type="submit" variant="danger">
                {fa ? "ثبت نتیجه بررسی" : "Record decision"}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  if (view === "apply")
    return (
      <div className="market-apply">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              applications.some(
                (a) => a.status === "pending" || a.status === "approved",
              )
            ) {
              toast.error(
                fa
                  ? "درخواست فعال در حال بررسی یا تأییدشده وجود دارد."
                  : "An active or approved application already exists.",
              );
              return;
            }
            saveApplications([
              {
                id: crypto.randomUUID(),
                ...application,
                status: "pending",
                reason: "",
              },
              ...applications,
            ]);
            toast.success(
              fa
                ? "درخواست برای بررسی محلی ثبت شد."
                : "Application saved for local review.",
            );
          }}
        >
          <span className="eyebrow">AIFekr / COACH APPLICATION</span>
          <h2>
            {fa
              ? "تجربه‌ات را به یک مسیر تازه تبدیل کن."
              : "Turn your experience into a new path."}
          </h2>
          <div className="domain-fields">
            {(["name", "email", "specialty"] as const).map((key, i) => (
              <label key={key}>
                {
                  (fa
                    ? ["نام مربی", "ایمیل", "تخصص"]
                    : ["Coach name", "Email", "Specialty"])[i]
                }
                <input
                  required
                  type={key === "email" ? "email" : "text"}
                  value={application[key]}
                  onChange={(e) =>
                    setApplication({ ...application, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            {fa ? "تجربه و شرح خدمات" : "Experience & service description"}
            <textarea
              required
              rows={8}
              value={application.bio}
              onChange={(e) =>
                setApplication({ ...application, bio: e.target.value })
              }
            />
          </label>
          <Button type="submit" variant="primary">
            {fa ? "ثبت درخواست محلی" : "Save local application"}
          </Button>
        </form>
        <aside className="panel">
          <Icon name="BadgeCheck" size={36} />
          <h3>{fa ? "مسیر فعال‌سازی مربی" : "Coach activation path"}</h3>
          {(fa
            ? [
                "ثبت معرفی و تخصص",
                "بررسی در پنل مدیریت",
                "ساخت محصول توسط فروشنده",
                "ثبت سفارش و بازخورد",
              ]
            : [
                "Provide profile & specialty",
                "Admin review",
                "Seller creates a product",
                "Orders & feedback",
              ]
          ).map((s, i) => (
            <p className="domain-card" key={s}>
              0{i + 1} · {s}
            </p>
          ))}
          {applications.map((a) => (
            <span className="badge" key={a.id}>
              {a.name} · {a.status}
            </span>
          ))}
        </aside>
      </div>
    );
  if (view === "seller")
    return (
      <section className="panel">
        <div className="row-between">
          <h2>{fa ? "فضای فروشنده" : "Seller workspace"}</h2>
          <Button
            disabled={!seller}
            variant="primary"
            onClick={() =>
              setProduct({
                id: crypto.randomUUID(),
                coach: "local-seller",
                title: "",
                description: "",
                price: 0,
                weeks: 4,
                active: true,
              })
            }
          >
            {fa ? "محصول تازه" : "New product"}
          </Button>
        </div>
        {!seller ? (
          <p>
            {fa
              ? "ابتدا درخواست مربیگری را ثبت کن و از پنل مدیریت پیش‌نمایش تأیید بگیر."
              : "Submit a coach application and approve it through the preview admin panel first."}
          </p>
        ) : (
          <>
            <h3>{seller.name}</h3>
            {products
              .filter((p) => p.coach === seller.id)
              .map((p) => (
                <article className="domain-card row-between" key={p.id}>
                  <div>
                    <strong>{p.title}</strong>
                    <p>
                      {price(p.price)} ·{" "}
                      {p.active
                        ? fa
                          ? "فعال"
                          : "Active"
                        : fa
                          ? "غیرفعال"
                          : "Inactive"}
                    </p>
                  </div>
                  <Button onClick={() => setProduct(p)}>
                    {fa ? "ویرایش محصول" : "Edit product"}
                  </Button>
                  <Button
                    onClick={() =>
                      saveProducts(
                        products.map((x) =>
                          x.id === p.id ? { ...x, active: !x.active } : x,
                        ),
                      )
                    }
                  >
                    {p.active
                      ? fa
                        ? "غیرفعال"
                        : "Deactivate"
                      : fa
                        ? "فعال"
                        : "Activate"}
                  </Button>
                </article>
              ))}
            <h3>{fa ? "سفارش‌های برنامه‌ها" : "Product orders"}</h3>
            {orders
              .filter((o) => o.coach === seller.id)
              .map((o) => (
                <article className="domain-card row-between" key={o.id}>
                  <div>
                    <strong>{o.title}</strong>
                    <p>
                      {o.status} · {price(o.amount)}
                    </p>
                  </div>
                  <Button
                    disabled={o.status !== "requested"}
                    onClick={() =>
                      saveOrders(
                        orders.map((x) =>
                          x.id === o.id ? { ...x, status: "completed" } : x,
                        ),
                      )
                    }
                  >
                    {fa ? "ثبت تکمیل آزمایشی" : "Mark demo fulfilled"}
                  </Button>
                </article>
              ))}
          </>
        )}
        {product && (
          <Modal
            title={fa ? "محصول مربی" : "Coach product"}
            onClose={() => setProduct(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProducts(
                  products.some((p) => p.id === product.id)
                    ? products.map((p) => (p.id === product.id ? product : p))
                    : [...products, product],
                );
                setProduct(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "عنوان برنامه" : "Program title"}
                  <input
                    required
                    value={product.title}
                    onChange={(e) =>
                      setProduct({ ...product, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "قیمت نمایشی" : "Display price"}
                  <input
                    type="number"
                    required
                    min={0}
                    value={product.price}
                    onChange={(e) =>
                      setProduct({ ...product, price: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  {fa ? "مدت (هفته)" : "Duration (weeks)"}
                  <input
                    type="number"
                    required
                    min={1}
                    max={52}
                    value={product.weeks}
                    onChange={(e) =>
                      setProduct({ ...product, weeks: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                {fa ? "شرح برنامه" : "Program description"}
                <textarea
                  required
                  rows={6}
                  value={product.description}
                  onChange={(e) =>
                    setProduct({ ...product, description: e.target.value })
                  }
                />
              </label>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  if (view === "orders")
    return (
      <section className="panel">
        <h2>{fa ? "سفارش‌ها و رزروهای من" : "My orders & bookings"}</h2>
        {orders.length ? (
          orders.map((o) => (
            <article className="domain-card" key={o.id}>
              <div className="row-between">
                <h3>{o.title}</h3>
                <span className="badge">{o.status}</span>
              </div>
              <p>
                {price(o.amount)} ·{" "}
                {o.time?.replace("T", " ") || o.date.slice(0, 10)}
              </p>
              <div className="domain-actions">
                <Button
                  disabled={o.status !== "requested"}
                  onClick={() =>
                    saveOrders(
                      orders.map((x) =>
                        x.id === o.id ? { ...x, status: "cancelled" } : x,
                      ),
                    )
                  }
                >
                  {fa ? "لغو سفارش" : "Cancel order"}
                </Button>
                <Button
                  disabled={
                    o.status !== "completed" ||
                    reviews.some((r) => r.order === o.id)
                  }
                  onClick={() => {
                    setReviewOrder(o);
                    setScore(5);
                    setReviewText("");
                  }}
                >
                  {fa ? "ثبت بازخورد خرید" : "Review purchase"}
                </Button>
                <Button
                  onClick={() =>
                    download(
                      "market-order-" + o.id + ".json",
                      JSON.stringify({ ...o, demo: true }, null, 2),
                      "application/json",
                    )
                  }
                >
                  {fa ? "دریافت سابقه سفارش" : "Download order record"}
                </Button>
              </div>
            </article>
          ))
        ) : (
          <Empty />
        )}
        {reviewOrder && (
          <Modal
            title={fa ? "بازخورد سفارش تکمیل‌شده" : "Completed order feedback"}
            onClose={() => setReviewOrder(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveReviews([
                  ...reviews,
                  {
                    id: crypto.randomUUID(),
                    order: reviewOrder.id,
                    coach: reviewOrder.coach,
                    score,
                    text: reviewText,
                  },
                ]);
                setReviewOrder(null);
              }}
            >
              <label>
                {fa ? "امتیاز (۱ تا ۵)" : "Rating (1–5)"}
                <input
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </label>
              <label>
                {fa ? "تجربه من" : "My experience"}
                <textarea
                  required
                  rows={6}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </label>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  if (view === "reviews")
    return (
      <section className="panel">
        <h2>
          {fa ? "بازخورد سفارش‌های تکمیل‌شده" : "Completed-order feedback"}
        </h2>
        {reviews.length ? (
          reviews.map((r) => (
            <article className="domain-card" key={r.id}>
              <span className="badge">
                ★ {n(r.score)} / ۵ ·{" "}
                {fa ? "خرید محلی ثبت‌شده" : "Recorded local order"}
              </span>
              <h3>{coaches.find((c) => c.id === r.coach)?.name}</h3>
              <p>{r.text}</p>
            </article>
          ))
        ) : (
          <Empty />
        )}
      </section>
    );
  const store = view === "store" || view === "slots";
  return (
    <>
      <div className="domain-toolbar">
        <input
          aria-label={fa ? "جستجوی مربی و برنامه" : "Search coaches & programs"}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="tool-grid">
        {store
          ? products
              .filter(
                (p) =>
                  p.active && (p.title + " " + p.description).includes(query),
              )
              .map((p) => (
                <article className="panel market-product" key={p.id}>
                  <span className="icon-chip lime">
                    <Icon name="Dumbbell" size={30} />
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                  <span className="badge">
                    {coaches.find((c) => c.id === p.coach)?.name} · {n(p.weeks)}{" "}
                    {fa ? "هفته" : "weeks"}
                  </span>
                  <strong>{price(p.price)}</strong>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setBooking(p);
                      setTime("");
                    }}
                  >
                    {view === "slots"
                      ? fa
                        ? "انتخاب زمان"
                        : "Choose time"
                      : fa
                        ? "بررسی و سفارش نمونه"
                        : "Review demo order"}
                  </Button>
                </article>
              ))
          : coaches
              .filter((c) => (c.name + " " + c.specialty).includes(query))
              .map((c) => (
                <article className="panel market-coach" key={c.id}>
                  <div className="market-coach-avatar">
                    {c.name.slice(0, 1)}
                  </div>
                  <h3>{c.name}</h3>
                  <span className="badge">{c.specialty}</span>
                  <p>{c.bio}</p>
                  <Button onClick={() => setCoach(c)}>
                    {fa ? "پرونده مربی" : "Coach profile"}
                  </Button>
                </article>
              ))}
      </div>
      {coach && (
        <Modal title={coach.name} onClose={() => setCoach(null)}>
          <p>{coach.specialty}</p>
          <p>{coach.bio}</p>
          <h3>{fa ? "برنامه‌های این مربی" : "Coach’s programs"}</h3>
          {products
            .filter((p) => p.coach === coach.id && p.active)
            .map((p) => (
              <article className="domain-card" key={p.id}>
                <h3>{p.title}</h3>
                <p>{price(p.price)}</p>
                <Button
                  onClick={() => {
                    setCoach(null);
                    setBooking(p);
                    setTime("");
                  }}
                >
                  {fa ? "بررسی برنامه" : "Review program"}
                </Button>
              </article>
            ))}
        </Modal>
      )}
      {booking && (
        <Modal
          title={fa ? "بررسی سفارش آزمایشی" : "Review demo order"}
          onClose={() => setBooking(null)}
        >
          <h3>{booking.title}</h3>
          <p>{booking.description}</p>
          <strong>{price(booking.price)}</strong>
          {view === "slots" && (
            <label>
              {fa ? "زمان رزرو" : "Booking time"}
              <input
                type="datetime-local"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          )}
          <p className="fine-print">
            {fa
              ? "این سفارش فقط برای بررسی رابط ثبت می‌شود؛ وجهی پرداخت یا خدمتی ارائه نمی‌شود."
              : "This order is for interface review only; no payment is made or service delivered."}
          </p>
          <Button
            variant="primary"
            disabled={view === "slots" && !time}
            onClick={() => order(booking)}
          >
            {fa ? "ثبت سفارش آزمایشی" : "Record demo order"}
          </Button>
        </Modal>
      )}
    </>
  );
}
