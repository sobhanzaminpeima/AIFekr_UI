"use client";
import { useSearchParams } from "next/navigation";
import { useApp } from "./providers";
import {
  field,
  LiveLoad,
  LiveTable,
  useLiveData,
  liveRows,
} from "./live-module-kit";
import { Button, SectionTitle } from "./ui";
import Link from "./site-link";
export function LiveOwner() {
  const { fa } = useApp(),
    search = useSearchParams(),
    tab = search.get("tab") ?? "statements",
    r = useLiveData("/api/owner/statements");
  return (
    <main
      className="module-workspace accent-amber"
      style={{ maxWidth: 1180, margin: "auto", padding: 24 }}
    >
      <header className="row-between">
        <SectionTitle
          title={fa ? "فضای مالک" : "Owner portal"}
          subtitle={
            fa
              ? "املاک، رزروها و گزارش‌های ارسال‌شده برای شما"
              : "Your properties, bookings and delivered statements"
          }
        />
        <Button
          onClick={async () => {
            const response = await fetch("/api/owner/logout", {
              method: "POST",
              credentials: "include",
            });
            if (response.ok) location.assign("/owner/login");
          }}
        >
          {fa ? "خروج" : "Sign out"}
        </Button>
      </header>
      <nav className="module-tabs">
        {[
          ["statements", "گزارش‌های تسویه", "Statements"],
          ["properties", "ملک‌های من", "My properties"],
          ["bookings", "تقویم رزروها", "Booking calendar"],
        ].map(([key, a, b]) => (
          <Link
            key={key}
            href={"/owner?tab=" + key}
            aria-current={tab === key ? "page" : undefined}
          >
            {fa ? a : b}
          </Link>
        ))}
      </nav>
      <section className="panel">
        <LiveLoad {...r} />
        {r.data &&
          (tab === "properties" ? (
            <LiveTable
              items={liveRows(r.data.properties)}
              columns={[
                field("title", "ملک", "Property"),
                field("address", "آدرس", "Address"),
                field("city", "شهر", "City"),
              ]}
            />
          ) : tab === "bookings" ? (
            <LiveTable
              items={liveRows(r.data.bookings)}
              columns={[
                field("propertyTitle", "ملک", "Property"),
                field("checkIn", "ورود", "Check-in"),
                field("checkOut", "خروج", "Check-out"),
                field("status", "وضعیت", "Status"),
              ]}
            />
          ) : (
            <LiveTable
              items={liveRows(r.data.statements)}
              columns={[
                field("propertyTitle", "ملک", "Property"),
                field("month", "ماه", "Month"),
                field("currency", "واحد پول", "Currency"),
                field("netProfit", "سود خالص", "Net profit"),
                field("managementFee", "کارمزد مدیریت", "Management fee"),
                field("ownerShare", "سهم مالک", "Owner share"),
                field("sentAt", "تاریخ ارسال", "Delivered"),
              ]}
              actions={(s) =>
                s.shareToken ? (
                  <a href={"/o/" + encodeURIComponent(String(s.shareToken))}>
                    {fa ? "گزارش کامل" : "Full statement"}
                  </a>
                ) : null
              }
            />
          ))}
      </section>
    </main>
  );
}
