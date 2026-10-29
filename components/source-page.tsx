"use client";
import Link from "@/components/site-link";
import { useState } from "react";
import { useApp } from "./providers";
import { Auth, Onboarding, PublicPage } from "./public";
import { ModuleWorkspace } from "./module-workspace";
import { Button, Icon, SectionTitle } from "./ui";
import { modules, ModuleSpec } from "@/lib/upstream/registry";
import { Credits, Checkout, Plans } from "./account";
import { Chat } from "./chat";
import { toast } from "sonner";

const toolNames: Record<string, [string, string, string]> = {
  "business-ideas": ["ایده‌های کسب‌وکار", "Business ideas", "Lightbulb"],
  "drop-shipping": ["دراپ‌شیپینگ", "Drop shipping", "ShoppingBag"],
  "healthy-diet": ["رژیم غذایی سالم", "Healthy diet", "Salad"],
  math: ["دستیار ریاضی", "Math assistant", "Sigma"],
  trading: ["تحلیل و آموزش بازار", "Market education", "TrendingUp"],
  "try-free-ai": ["آزمایش هوش مصنوعی", "Try AI", "Sparkles"],
};
export function SourcePage({ path }: { path: string }) {
  const { fa } = useApp();
  if (path === "/owner/login") return <Auth />;
  if (["/start", "/welcome"].includes(path)) return <Onboarding />;
  if (path === "/choose-plan") return <Plans />;
  if (path === "/fitness/payments")
    return (
      <ModuleWorkspace path={path} module={accountModule("payments", fa)} />
    );
  if (path.startsWith("/tools/")) {
    const entry = toolNames[path.split("/")[2]];
    return <Chat persona={entry?.[fa ? 0 : 1] || "AI assistant"} />;
  }
  if (path === "/startup/contact") return <PublicPage path="/contact" />;
  if (path.startsWith("/o/"))
    return (
      <ModuleWorkspace
        path="/owner"
        module={modules.find((m) => m.id === "owner")!}
      />
    );
  if (path.startsWith("/student/"))
    return <Chat persona={fa ? "همراه مطالعه" : "Study companion"} />;
  return <PublicPage path={path} />;
}
function accountModule(id: string, fa: boolean): ModuleSpec {
  return {
    id,
    base: "/fitness/payments",
    title: ["پرداخت‌های فیتنس", "FIT payments"],
    subtitle: ["رسیدها و تاریخچه خرید", "Receipts and purchase history"],
    icon: "Receipt",
    accent: "lime",
    group: "account",
    source: "",
    primary: ["افزودن", "Add"],
    views: [
      {
        id: "payments",
        title: ["تراکنش‌ها", "Transactions"],
        kind: "records",
        model: "Payment",
      },
    ],
  };
}
