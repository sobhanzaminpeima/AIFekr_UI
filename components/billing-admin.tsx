"use client";
import { useState } from "react";
import { useLocalState } from "@/lib/use-local-state";
import {
  defaultPlans,
  defaultPromotions,
  Plan,
  Promotion,
  Purchase,
} from "@/lib/billing";
import { useApp } from "./providers";
import { Button, Empty, Modal, download } from "./ui";
import { toast } from "sonner";
export function BillingAdmin({ view }: { view: string }) {
  const { fa, t, price, n } = useApp();
  const [plans, savePlans] = useLocalState<Plan[]>(
    "aifekr-billing-plans",
    defaultPlans,
  );
  const [promotions, savePromotions] = useLocalState<Promotion[]>(
    "aifekr-billing-promotions",
    defaultPromotions,
  );
  const [edit, setEdit] = useState<Plan | null>(null);
  const [promo, setPromo] = useState<Promotion | null>(null);
  if (view === "promotions")
    return (
      <section className="panel">
        <Button
          variant="primary"
          onClick={() =>
            setPromo({
              id: crypto.randomUUID(),
              code: "",
              percent: 10,
              active: true,
            })
          }
        >
          {fa ? "کد تخفیف جدید" : "New promotion"}
        </Button>
        {promotions.map((p) => (
          <article className="domain-card row-between" key={p.id}>
            <div>
              <strong>{p.code}</strong>
              <p>{n(p.percent)}٪</p>
            </div>
            <label>
              {fa ? "فعال" : "Active"}
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) =>
                  savePromotions(
                    promotions.map((x) =>
                      x.id === p.id ? { ...x, active: e.target.checked } : x,
                    ),
                  )
                }
              />
            </label>
            <Button onClick={() => setPromo(p)}>
              {fa ? "ویرایش" : "Edit"}
            </Button>
          </article>
        ))}
        {promo && (
          <Modal
            title={fa ? "کد تخفیف" : "Promotion"}
            onClose={() => setPromo(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = promo.code.trim().toUpperCase();
                if (
                  promotions.some((x) => x.id !== promo.id && x.code === code)
                ) {
                  toast.error(fa ? "کد تکراری است" : "Code already exists");
                  return;
                }
                const next = { ...promo, code };
                savePromotions(
                  promotions.some((x) => x.id === promo.id)
                    ? promotions.map((x) => (x.id === promo.id ? next : x))
                    : [...promotions, next],
                );
                setPromo(null);
              }}
            >
              <div className="domain-fields">
                <label>
                  {fa ? "کد" : "Code"}
                  <input
                    required
                    pattern="[A-Za-z0-9_-]+"
                    value={promo.code}
                    onChange={(e) =>
                      setPromo({ ...promo, code: e.target.value })
                    }
                  />
                </label>
                <label>
                  {fa ? "درصد تخفیف" : "Discount percent"}
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={promo.percent}
                    onChange={(e) =>
                      setPromo({ ...promo, percent: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <Button type="submit" variant="primary">
                {t("save")}
              </Button>
            </form>
          </Modal>
        )}
      </section>
    );
  if (view === "financial") return <PaymentHistory admin />;
  return (
    <>
      <div className="tool-grid">
        {plans.map((p) => (
          <article className="panel" key={p.id}>
            <h3>{fa ? p.fa : p.en}</h3>
            <strong>{price(p.price)}</strong>
            <p>
              {n(p.credits)} {t("credits")}
            </p>
            <label className="toggle-row">
              <span>{fa ? "نمایش در قیمت‌گذاری" : "Visible in pricing"}</span>
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) =>
                  savePlans(
                    plans.map((x) =>
                      x.id === p.id ? { ...x, enabled: e.target.checked } : x,
                    ),
                  )
                }
              />
            </label>
            <Button onClick={() => setEdit(p)}>
              {fa ? "ویرایش طرح" : "Edit plan"}
            </Button>
          </article>
        ))}
      </div>
      {edit && (
        <Modal
          title={fa ? "ویرایش طرح" : "Edit plan"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePlans(plans.map((p) => (p.id === edit.id ? edit : p)));
              setEdit(null);
              toast.success(
                fa
                  ? "طرح و صفحه قیمت‌گذاری به‌روز شد"
                  : "Plan and pricing page updated",
              );
            }}
          >
            <div className="domain-fields">
              <label>
                {fa ? "عنوان فارسی" : "Persian name"}
                <input
                  required
                  value={edit.fa}
                  onChange={(e) => setEdit({ ...edit, fa: e.target.value })}
                />
              </label>
              <label>
                {fa ? "عنوان انگلیسی" : "English name"}
                <input
                  required
                  value={edit.en}
                  onChange={(e) => setEdit({ ...edit, en: e.target.value })}
                />
              </label>
              <label>
                {fa ? "قیمت ماهانه" : "Monthly price"}
                <input
                  type="number"
                  min={0}
                  required
                  value={edit.price}
                  onChange={(e) =>
                    setEdit({ ...edit, price: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                {fa ? "اعتبار ماهانه" : "Monthly credits"}
                <input
                  type="number"
                  min={0}
                  required
                  value={edit.credits}
                  onChange={(e) =>
                    setEdit({ ...edit, credits: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function PaymentHistory({ admin = false }: { admin?: boolean }) {
  const { fa, price, n, t } = useApp();
  const [purchases] = useLocalState<Purchase[]>("aifekr-billing-purchases", []);
  const [filter, setFilter] = useState("all");
  const visible = purchases.filter(
    (p) => filter === "all" || p.status === filter,
  );
  return (
    <section className="panel">
      <h2>
        {admin
          ? fa
            ? "خریدها و رسیدهای محلی"
            : "Local purchases and receipts"
          : fa
            ? "تاریخچه پرداخت‌های من"
            : "My payment history"}
      </h2>
      <div className="domain-toolbar">
        <select
          aria-label={fa ? "وضعیت پرداخت" : "Payment status"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{fa ? "همه" : "All"}</option>
          <option value="paid">{fa ? "موفق" : "Paid"}</option>
          <option value="failed">{fa ? "ناموفق" : "Failed"}</option>
        </select>
        <Button
          onClick={() =>
            download(
              "payment-history.json",
              JSON.stringify(visible, null, 2),
              "application/json",
            )
          }
        >
          {t("export")}
        </Button>
      </div>
      {!visible.length ? (
        <Empty />
      ) : (
        visible.map((p) => (
          <article className="domain-card row-between" key={p.id}>
            <div>
              <strong>{p.plan}</strong>
              <p>
                {p.date.slice(0, 16).replace("T", " ")} · {p.status}
              </p>
              <p>
                {price(p.amount)} · {n(p.credits)} {t("credits")}
              </p>
            </div>
            <Button
              onClick={() =>
                download(
                  "receipt-" + p.id + ".json",
                  JSON.stringify(p, null, 2),
                  "application/json",
                )
              }
            >
              {fa ? "دریافت رسید" : "Download receipt"}
            </Button>
          </article>
        ))
      )}
    </section>
  );
}
