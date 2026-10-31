"use client";
import { useState } from "react";
import { useShell } from "./live-shell-context";
import { Button } from "./ui";
import type { ModuleSpec, ViewSpec } from "@/lib/upstream/registry";
import {
  field,
  LiveForm,
  LiveLoad,
  LiveModuleFrame,
  LiveTable,
  useLiveData,
  liveRows,
} from "./live-module-kit";
export function LiveReferral({
  module,
  view,
}: {
  module: ModuleSpec;
  view: ViewSpec;
}) {
  const fa = useShell()!.lang === "fa",
    r = useLiveData("/api/referral/me"),
    wallet = useLiveData(
      ["wallet", "transactions", "payout"].includes(view.id)
        ? "/api/wallet/me"
        : null,
    );
  const [message, setMessage] = useState("");
  const amount = (n: unknown) =>
    typeof n === "number"
      ? `${n.toLocaleString(fa ? "fa-IR" : "en-US")} ${fa ? "تومان" : "Toman"}`
      : "—";
  return (
    <LiveModuleFrame module={module} view={view}>
      <LiveLoad {...r} />
      {r.data && (
        <>
          {view.id === "invite" && (
            <section className="panel">
              <h3>{fa ? "لینک اختصاصی دعوت" : "Your invitation link"}</h3>
              <p>
                <bdi>{String(r.data.referralCode ?? "—")}</bdi>
              </p>
              <img
                src={`/api/referral/me?qr=1&code=${encodeURIComponent(String(r.data.referralCode ?? ""))}`}
                alt={fa ? "کد QR دعوت شما" : "Your invitation QR code"}
                width={220}
                height={220}
              />
              <div className="domain-actions">
                <Button
                  onClick={async () => {
                    try {
                      const url =
                        location.origin +
                        "/register?ref=" +
                        encodeURIComponent(String(r.data!.referralCode));
                      await navigator.clipboard.writeText(url);
                      setMessage(fa ? "لینک کپی شد." : "Link copied.");
                    } catch {
                      setMessage(fa ? "کپی انجام نشد." : "Copy failed.");
                    }
                  }}
                >
                  {fa ? "کپی لینک دعوت" : "Copy invitation link"}
                </Button>
                <LiveForm
                  title={fa ? "تغییر کد دعوت" : "Change referral code"}
                  url="/api/referral/me"
                  method="PATCH"
                  fields={[field("code", "کد دعوت", "Referral code")]}
                  initial={{ code: r.data.referralCode }}
                  onDone={r.reload}
                  caution={
                    fa
                      ? "کد جدید در همه بخش‌های دعوت استفاده می‌شود."
                      : "The new code is used across invitation features."
                  }
                />
              </div>
              <p role="status">{message}</p>
              <p>
                {fa
                  ? "کمیسیون تأییدشده از خرید دعوت‌شدگان: "
                  : "Approved commission on referred purchases: "}
                {String(r.data.commissionPercent ?? "—")}٪
              </p>
            </section>
          )}
          {view.id === "stats" && (
            <section className="panel">
              <h3>
                {fa
                  ? "دعوت‌شدگان و خریدهای تأییدشده"
                  : "Referred users and confirmed purchases"}
              </h3>
              <p>
                {fa ? "تعداد دعوت‌ها: " : "Invitations: "}
                {String(r.data.invitedCount ?? "—")}
              </p>
              <LiveTable
                items={liveRows(r.data.invitedUsers).map((u) => ({
                  ...u,
                  commissionDisplay: amount(u.commissionEarned),
                }))}
                columns={[
                  field("name", "نام", "Name"),
                  field("createdAt", "تاریخ عضویت", "Joined"),
                  field(
                    "successfulPurchases",
                    "خرید موفق",
                    "Successful purchases",
                  ),
                  field(
                    "commissionDisplay",
                    "کمیسیون ثبت‌شده",
                    "Recorded commission",
                  ),
                ]}
              />
            </section>
          )}
          {["wallet", "transactions", "payout"].includes(view.id) && (
            <section className="panel">
              <LiveLoad {...wallet} />
              {wallet.data && (
                <>
                  <h3>{fa ? "کیف پول درآمد" : "Earnings wallet"}</h3>
                  <p>
                    {fa ? "موجودی قابل درخواست: " : "Available balance: "}
                    {amount(wallet.data.walletBalance)}
                  </p>
                  <p>
                    {fa
                      ? "کل کمیسیون ثبت‌شده: "
                      : "Recorded lifetime commission: "}
                    {amount(r.data.walletEarnedTotal)}
                  </p>
                  {view.id === "transactions" && (
                    <LiveTable
                      items={liveRows(wallet.data.transactions).map((t) => ({
                        ...t,
                        amountDisplay: amount(t.amount),
                      }))}
                      columns={[
                        field("type", "نوع", "Type"),
                        field("amountDisplay", "مبلغ", "Amount"),
                        field("createdAt", "تاریخ", "Created"),
                        field("note", "شرح", "Note"),
                      ]}
                    />
                  )}{" "}
                  {view.id === "payout" && (
                    <>
                      <p className="plan-notice">
                        {fa
                          ? "ثبت درخواست، مبلغ را از موجودی قابل برداشت رزرو می‌کند؛ پرداخت پس از بررسی مدیر انجام می‌شود. در صورت قطع ارتباط، پیش از تکرار فهرست درخواست‌ها را بررسی کنید. مبلغ درخواست به تومان است."
                          : "Submitting reserves the amount from your balance. An administrator reviews and pays it. If disconnected, check requests before retrying. Enter the amount in Toman."}
                      </p>
                      {[
                        [
                          "iran_sheba",
                          "برداشت با شبا",
                          "Iranian IBAN",
                          ["sheba", "شماره شبا IR", "IR IBAN"],
                        ],
                        [
                          "iran_card",
                          "برداشت با کارت ایران",
                          "Iranian card",
                          ["cardNumber", "شماره کارت", "Card number"],
                        ],
                        [
                          "intl_card",
                          "برداشت با کارت بین‌المللی",
                          "International card",
                          ["cardNumber", "شماره کارت", "Card number"],
                        ],
                        [
                          "paypal",
                          "برداشت با PayPal",
                          "PayPal",
                          ["paypalEmail", "ایمیل PayPal", "PayPal email"],
                        ],
                      ].map(([method, a, b, destination]) => {
                        const dest = destination as string[];
                        return (
                          <LiveForm
                            key={String(method)}
                            title={String(fa ? a : b)}
                            url="/api/wallet/payout-request"
                            fields={[
                              field(
                                "amount",
                                "مبلغ (تومان)",
                                "Amount (Toman)",
                                "number",
                              ),
                              field(
                                dest[0],
                                dest[1],
                                dest[2],
                                dest[0] === "paypalEmail" ? "email" : "text",
                              ),
                              ...(["iran_card", "iran_sheba"].includes(
                                String(method),
                              )
                                ? [
                                    field(
                                      "cardHolderName",
                                      "نام صاحب حساب",
                                      "Account holder",
                                    ),
                                  ]
                                : []),
                            ]}
                            map={(body) => ({ ...body, method })}
                            onDone={() => {
                              wallet.reload();
                              r.reload();
                            }}
                            caution={
                              fa
                                ? "این درخواست موجودی شما را رزرو می‌کند. ادامه می‌دهید؟"
                                : "This reserves the requested amount from your balance. Continue?"
                            }
                          />
                        );
                      })}
                      <LiveTable
                        items={liveRows(wallet.data.payoutRequests).map(
                          (p) => ({ ...p, amountDisplay: amount(p.amount) }),
                        )}
                        columns={[
                          field("amountDisplay", "مبلغ", "Amount"),
                          field("method", "روش", "Method"),
                          field("status", "وضعیت", "Status"),
                          field("createdAt", "تاریخ", "Created"),
                          field("adminNote", "یادداشت مدیر", "Admin note"),
                        ]}
                      />
                    </>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
    </LiveModuleFrame>
  );
}
