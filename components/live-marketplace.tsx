"use client";
import { useRef, useState } from "react";
import { useApp } from "./providers";
import Link from "./site-link";
import { Button } from "./ui";
import { LiveUpload } from "./live-upload";
import {
  LiveModuleFrame,
  LiveLoad,
  LiveTable,
  LiveForm,
  useLiveData,
  liveRows,
  field,
  type LiveRow,
  type LiveField,
} from "./live-module-kit";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
const API = "/api/fitness/marketplace";
export function LiveMarketplace({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const { fa, locale } = useApp(),
    r = useLiveData(API),
    [selected, setSelected] = useState<LiveRow | null>(null),
    [checkout, setCheckout] = useState<{ row: LiveRow; slot: boolean } | null>(
      null,
    ),
    [credential, setCredential] = useState(""),
    [asset, setAsset] = useState(""),
    [download, setDownload] = useState("");
  const seller = r.data?.seller as LiveRow | undefined,
    trainers = liveRows(r.data?.trainers),
    [search, setSearch] = useState("");
  const currency = locale === "fa" ? "IRR" : locale === "tr" ? "TRY" : "USD";
  const price = (row: LiveRow) => {
    if(row.priceAvailable === false) return fa ? "قیمت نیازمند بررسی مدیر است" : "Price requires administrator review";
    const currency=String(row.displayCurrency ?? row.currency),minor=Number(row.displayPriceMinor ?? row.priceMinor);
    if(currency === "IRT") return new Intl.NumberFormat(locale).format(minor)+(fa?" تومان":" toman");
    return new Intl.NumberFormat(locale,{style:"currency",currency}).format(minor/100);
  };
  const productFields = [
    field("title", "نام محصول", "Product title"),
    field("description", "شرح", "Description", "textarea"),
    {
      ...field("kind", "نوع محصول", "Product type"),
      choices: [
        { value: "DIGITAL", label: fa ? "دیجیتال" : "Digital" },
        { value: "PHYSICAL", label: fa ? "فیزیکی" : "Physical" },
      ],
    },
    field(
      "priceMinor",
      "قیمت در کوچک‌ترین واحد ارز (مثلاً سنت)",
      "Price in currency minor units (e.g. cents)",
      "number",
    ),
    {
      ...field("currency", "ارز", "Currency"),
      choices: ["USD", "TRY", "EUR"].map((value) => ({ value, label: value })),
    },
    field("inventory", "موجودی", "Inventory", "number"),
  ];
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...r} />
      {r.data && (
        <>
          {["trainers", "store", "slots"].includes(view.id) && (
            <label>
              {fa ? "جست‌وجو" : "Search"}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          )}
          {view.id === "trainers" && (
            <div className="tool-grid">
              {trainers
                .filter((t) =>
                  String(t.name).toLowerCase().includes(search.toLowerCase()),
                )
                .map((t) => (
                  <section className="panel" key={String(t.id)}>
                    {typeof t.image === "string" && t.image && (
                      <img
                        src={String(t.image)}
                        alt=""
                        style={{
                          display: "block",
                          width: "100%",
                          aspectRatio: "4 / 5",
                          objectFit: "contain",
                          background: "var(--surface-2)",
                          borderRadius: 16,
                        }}
                      />
                    )}
                    <h3>{String(t.name)}</h3>
                    <p>{String(t.country ?? "")}</p>
                    <Button onClick={() => setSelected(t)}>
                      {fa ? "مشاهده پروفایل مربی" : "View coach profile"}
                    </Button>
                  </section>
                ))}
            </div>
          )}
          {selected && view.id === "trainers" && (
            <section className="panel">
              <div className="domain-actions">
                <h2>{String(selected.name)}</h2>
                <Button
                  onClick={() => setSelected(null)}
                  aria-label={fa ? "بستن پروفایل" : "Close profile"}
                >
                  ×
                </Button>
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {String(selected.biography)}
              </p>
              <p>{String(selected.specializations ?? "")}</p>
              <p>{String(selected.languages ?? "")}</p>
              <Link
                className="btn primary"
                href="/fitness/marketplace?tab=slots"
              >
                {fa ? "وقت‌های قابل رزرو" : "Available appointments"}
              </Link>
            </section>
          )}
          {view.id === "store" && (
            <div className="tool-grid">
              {liveRows(r.data.products)
                .filter((p) =>
                  (String(p.title) + " " + String(p.description))
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((p) => (
                  <section className="panel" key={String(p.id)}>
                    <span className="badge">
                      {p.kind === "DIGITAL"
                        ? fa
                          ? "برنامه دیجیتال"
                          : "Digital program"
                        : fa
                          ? "محصول فیزیکی"
                          : "Physical product"}
                    </span>
                    <h3>{String(p.title)}</h3>
                    <p>{String(p.description)}</p>
                    <strong>{price(p)}</strong>
                    <p>
                      {String(
                        trainers.find((t) => t.id === p.trainerId)?.name ?? "",
                      )}
                    </p>
                    <Button
                      disabled={
                        p.priceAvailable === false || (p.kind === "PHYSICAL" && Number(p.inventory) < 1)
                      }
                      onClick={() => setCheckout({ row: p, slot: false })}
                    >
                      {fa ? "بررسی سفارش و پرداخت" : "Review order & payment"}
                    </Button>
                  </section>
                ))}
            </div>
          )}
          {view.id === "slots" && (
            <LiveTable
              items={liveRows(r.data.slots)
                .map((s) => ({
                  ...s,
                  trainer: trainers.find((t) => t.id === s.trainerId)?.name,
                  price: price(s),
                }))
                .filter((s) =>
                  (String(s.trainer) + " " + String((s as LiveRow).startsAt))
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )}
              columns={[
                field("trainer", "مربی", "Coach"),
                field(
                  "startsAt",
                  "شروع (با منطقه زمانی)",
                  "Starts (with timezone)",
                ),
                field("endsAt", "پایان", "Ends"),
                field("price", "قیمت", "Price"),
              ]}
              actions={(s) => (
                <Button disabled={s.priceAvailable === false}
                onClick={() => setCheckout({ row: s, slot: true })}>
                  {fa ? "رزرو و بررسی پرداخت" : "Review booking & payment"}
                </Button>
              )}
            />
          )}
          {checkout && (
            <Checkout
              key={String(checkout.row.id)}
              selection={checkout}
              currency={currency}
              onClose={() => setCheckout(null)}
              onDone={r.reload}
            />
          )}
          {view.id === "orders" && (
            <>
              <p>
                {fa
                  ? "رسید پرداخت بانکی در صفحهٔ پرداخت ذخیره می‌شود؛ پس از برگشت از برنامه بانک، از همین سفارش ادامه دهید."
                  : "Bank-transfer receipt uploads remain available on the payment page. Resume the same order after returning from your bank app."}
              </p>
              <LiveTable
                items={liveRows(r.data.orders)}
                columns={[
                  field("id", "شماره سفارش", "Order"),
                  field("status", "وضعیت", "Status"),
                  field(
                    "totalMinor",
                    "مبلغ در واحد خرد ارز",
                    "Amount in minor units",
                  ),
                  field("currency", "ارز", "Currency"),
                  field("createdAt", "زمان", "Created"),
                ]}
                actions={(o) => (
                  <>
                    {o.status === "AWAITING_PAYMENT" && (
                      <Link
                        className="btn"
                        href={
                          typeof o.resumeUrl === "string"
                            ? o.resumeUrl
                            : "/fitness/checkout/" + String(o.paymentId)
                        }
                      >
                        {fa
                          ? "ادامه پرداخت و ارسال رسید"
                          : "Continue payment & upload receipt"}
                      </Link>
                    )}
                    {o.canCancel === true &&
                      o.status === "AWAITING_PAYMENT" && (
                        <LiveForm
                          title={
                            fa ? "لغو سفارش پرداخت‌نشده" : "Cancel unpaid order"
                          }
                          url={API}
                          fields={[
                            field("reason", "دلیل", "Reason", "textarea"),
                          ]}
                          caution={
                            fa
                              ? "رزرو پرداخت‌نشده آزاد می‌شود."
                              : "The unpaid reservation will be released."
                          }
                          map={(b) => ({
                            ...b,
                            action: "cancel",
                            orderId: o.id,
                          })}
                          onDone={r.reload}
                        />
                      )}
                    {["PAID", "DELIVERED"].includes(String(o.status)) && (
                      <LiveForm
                        title={
                          fa
                            ? "درخواست بررسی بازپرداخت"
                            : "Request refund review"
                        }
                        url={API}
                        fields={[field("reason", "دلیل", "Reason", "textarea")]}
                        map={(b) => ({
                          ...b,
                          action: "refundRequest",
                          orderId: o.id,
                        })}
                        onDone={r.reload}
                      />
                    )}{" "}
                    {o.status === "DELIVERED" && (
                      <LiveForm
                        title={
                          fa ? "دریافت فایل خریداری‌شده" : "Get purchased file"
                        }
                        url={API}
                        map={() => ({ action: "download", orderId: o.id })}
                        onDone={(d) => setDownload(String(d.url ?? ""))}
                      />
                    )}
                  </>
                )}
              />
              {download.startsWith("/api/fitness/") && (
                <a className="btn primary" href={download} download>
                  {fa ? "دانلود فایل تأییدشده" : "Download verified file"}
                </a>
              )}
            </>
          )}
          {view.id === "apply" && (
            <section className="panel">
              <p>
                {fa
                  ? "مدارک فقط برای بررسی درخواست مربیگری استفاده می‌شوند. انتشار پروفایل نیازمند تأیید مدیر است."
                  : "Credentials are used for application review. Profiles require administrator approval before publication."}
              </p>
              <p>
                {fa ? "وضعیت درخواست: " : "Application status: "}
                {String((r.data.application as LiveRow)?.status ?? "—")}
              </p>
              <LiveUpload
                url={API + "/files"}
                title={fa ? "ارسال مدرک PDF" : "Upload PDF credential"}
                accept="application/pdf"
                maxBytes={10 * 1024 * 1024}
                fields={[
                  {
                    ...field("kind", "نوع فایل", "File kind"),
                    choices: [
                      {
                        value: "credential",
                        label: fa ? "مدرک" : "Credential",
                      },
                    ],
                  },
                ]}
                onDone={(d) => setCredential(String(d.key))}
              />
              {credential && (
                <LiveForm
                  title={
                    fa ? "ارسال درخواست مربیگری" : "Submit coach application"
                  }
                  url={API}
                  fields={[
                    field("name", "نام", "Name"),
                    field(
                      "biography",
                      "زندگی‌نامه (حداقل ۲۰ نویسه)",
                      "Biography (at least 20 characters)",
                      "textarea",
                    ),
                    field(
                      "qualifications",
                      "صلاحیت‌ها (حداقل ۱۰ نویسه)",
                      "Qualifications (at least 10 characters)",
                      "textarea",
                    ),
                    field(
                      "languages",
                      "زبان‌ها (هر خط یکی)",
                      "Languages (one per line)",
                      "textarea",
                    ),
                    field(
                      "specialties",
                      "تخصص‌ها (هر خط یکی)",
                      "Specialties (one per line)",
                      "textarea",
                    ),
                    field("country", "کشور", "Country"),
                    field(
                      "timezone",
                      "منطقه زمانی مثل Europe/Istanbul",
                      "Timezone, e.g. Europe/Istanbul",
                    ),
                    field(
                      "consent",
                      "موافقت با بررسی مدارک و درخواست",
                      "Consent to credential & application review",
                      "checkbox",
                    ),
                  ]}
                  map={(b) => ({
                    ...b,
                    action: "apply",
                    credentials: [credential],
                    languages: String(b.languages).split("\n").filter(Boolean),
                    specialties: String(b.specialties)
                      .split("\n")
                      .filter(Boolean),
                  })}
                  onDone={r.reload}
                />
              )}
            </section>
          )}
          {view.id === "seller" && (
            <>
              {!seller ? (
                <p>
                  {fa
                    ? "پنل فروشنده برای مربی انسانی تأییدشده فعال می‌شود."
                    : "The seller workspace is available to approved human coaches."}
                </p>
              ) : (
                <>
                  <section className="panel">
                    <h2>{fa ? "محصولات من" : "My products"}</h2>
                    <LiveUpload
                      url={API + "/files"}
                      title={
                        fa
                          ? "بارگذاری فایل برنامه دیجیتال"
                          : "Upload digital program file"
                      }
                      accept="application/pdf"
                      maxBytes={10 * 1024 * 1024}
                      onDone={(d) => setAsset(String(d.key))}
                    />
                    <LiveForm
                      title={
                        fa
                          ? "ایجاد محصول برای بررسی مدیر"
                          : "Create product for admin review"
                      }
                      url={API}
                      fields={productFields}
                      initial={{
                        kind: "PHYSICAL",
                        currency: "USD",
                        inventory: 0,
                      }}
                      map={(b) => ({
                        ...b,
                        action: "product",
                        ...(b.kind === "DIGITAL"
                          ? { digitalAsset: asset }
                          : {}),
                      })}
                      caution={
                        fa
                          ? "محصول به‌صورت پیش‌نویس ثبت می‌شود؛ مبلغ را در کوچک‌ترین واحد ارز وارد کنید."
                          : "The product is saved as a draft. Enter price in the currency’s minor units."
                      }
                      onDone={r.reload}
                    />
                    <LiveTable
                      items={liveRows(seller.products)}
                      columns={[
                        field("title", "محصول", "Product"),
                        field("status", "وضعیت", "Status"),
                        field(
                          "priceMinor",
                          "قیمت در واحد خرد",
                          "Minor-unit price",
                        ),
                        field("currency", "ارز", "Currency"),
                      ]}
                    />
                  </section>
                  <section className="panel">
                    <LiveForm
                      title={fa ? "افزودن وقت مشاوره" : "Add consultation slot"}
                      url={API}
                      fields={[
                        field(
                          "startsAt",
                          "شروع محلی",
                          "Local start time",
                          "datetime-local",
                        ),
                        field(
                          "endsAt",
                          "پایان محلی",
                          "Local end time",
                          "datetime-local",
                        ),
                        field(
                          "priceMinor",
                          "قیمت در واحد خرد ارز",
                          "Price in minor units",
                          "number",
                        ),
                        {
                          ...field("currency", "ارز", "Currency"),
                          choices: ["USD", "TRY", "EUR"].map((value) => ({
                            value,
                            label: value,
                          })),
                        },
                      ]}
                      map={(b) => ({
                        ...b,
                        action: "slot",
                        startsAt: new Date(String(b.startsAt)).toISOString(),
                        endsAt: new Date(String(b.endsAt)).toISOString(),
                      })}
                      onDone={r.reload}
                    />
                    <LiveTable
                      items={liveRows(seller.slots)}
                      columns={[
                        field("startsAt", "شروع", "Start"),
                        field("endsAt", "پایان", "End"),
                        field("status", "وضعیت", "Status"),
                      ]}
                    />
                  </section>
                  <section className="panel">
                    <h3>
                      {fa
                        ? "سفارش‌ها و دفتر فروشنده"
                        : "Seller orders & ledger"}
                    </h3>
                    <LiveTable
                      items={liveRows(seller.orders)}
                      columns={[
                        field("id", "سفارش", "Order"),
                        field("status", "وضعیت", "Status"),
                        field(
                          "totalMinor",
                          "مبلغ در واحد خرد",
                          "Minor-unit amount",
                        ),
                        field("currency", "ارز", "Currency"),
                      ]}
                    />
                    <LiveTable
                      items={liveRows(seller.ledger)}
                      columns={[
                        field("kind", "نوع", "Type"),
                        field("amountToman", "مبلغ تومان", "Amount (toman)"),
                        field("status", "وضعیت", "Status"),
                      ]}
                    />
                  </section>
                </>
              )}
            </>
          )}
          {view.id === "reviews" && (
            <>
              <LiveTable
                items={liveRows(r.data.reviews).map((v) => ({
                  ...v,
                  trainer: trainers.find((t) => t.id === v.trainerId)?.name,
                }))}
                columns={[
                  field("trainer", "مربی", "Coach"),
                  field("rating", "امتیاز", "Rating"),
                  field("body", "نظر تأییدشده", "Verified review"),
                ]}
              />
              {liveRows(r.data.orders)
                .filter((o) => (o.booking as LiveRow)?.status === "COMPLETED")
                .map((o) => (
                  <LiveForm
                    key={String(o.id)}
                    title={
                      fa
                        ? "ثبت نظر برای جلسه انجام‌شده"
                        : "Review completed session"
                    }
                    url={API}
                    fields={[
                      field(
                        "rating",
                        "امتیاز ۱ تا ۵",
                        "Rating (1–5)",
                        "number",
                      ),
                      field("body", "نظر", "Review", "textarea"),
                    ]}
                    map={(b) => ({
                      ...b,
                      action: "review",
                      bookingId: (o.booking as LiveRow).id,
                    })}
                    onDone={r.reload}
                  />
                ))}
            </>
          )}
        </>
      )}
    </LiveModuleFrame>
  );
}
function Checkout({
  selection,
  currency,
  onDone,
  onClose,
}: {
  selection: { row: LiveRow; slot: boolean };
  currency: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const { fa } = useApp(),
    key = useRef(crypto.randomUUID()),
    [url, setUrl] = useState("");
  return (
    <section className="panel">
      <h2>{fa ? "بررسی سفارش" : "Review order"}</h2>
      <p>{String(selection.row.title ?? selection.row.startsAt)}</p>
      <p>
        {fa ? "ارز تسویه: " : "Settlement currency: "}
        {currency === "IRR"
          ? fa
            ? "تومان / زرین‌پال"
            : "Toman / Zarinpal"
          : currency + " / IBAN"}
      </p>
      <LiveForm
        title={
          fa
            ? "تأیید سفارش و رفتن به پرداخت"
            : "Confirm order & proceed to payment"
        }
        url={API}
        initial={{ quantity: 1 }}
        fields={[
          ...(!selection.slot
            ? [
                field(
                  "quantity",
                  "تعداد (۱ تا ۱۰)",
                  "Quantity (1–10)",
                  "number",
                ),
              ]
            : []),
          ...(selection.row.kind === "PHYSICAL"
            ? [
                field(
                  "shippingAddress",
                  "نشانی ارسال",
                  "Shipping address",
                  "textarea",
                ),
              ]
            : []),
        ]}
        caution={
          fa
            ? "سفارش واقعی ایجاد می‌شود؛ پرداخت در مرحله بعد است. مبلغ نهایی طبق نرخ‌های مدیر روی سرور محاسبه می‌شود."
            : "Creates a real order; payment happens next. The server calculates the final amount using administrator rates."
        }
        map={(b) => ({
          ...b,
          action: "checkout",
          quantity: selection.slot ? 1 : Number(b.quantity),
          currency,
          clientKey: key.current,
          ...(selection.slot
            ? { slotId: selection.row.id }
            : { productId: selection.row.id }),
        })}
        onDone={(d) => {
          setUrl(String(d.paymentUrl ?? ""));
          onDone();
        }}
      />
      {url && (
        <Link className="btn primary" href={url}>
          {fa ? "مشاهده مبلغ نهایی و پرداخت" : "View final amount & pay"}
        </Link>
      )}
      <Button onClick={onClose}>{fa ? "بستن" : "Close"}</Button>
    </section>
  );
}
