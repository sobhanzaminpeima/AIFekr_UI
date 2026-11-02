import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { Platform } from "@/components/platform";
import { SiteProvider } from "@/components/site-link";
import GrowthTracker from "@/components/growth-tracker";
import { v2Ready, type SiteData } from "@/lib/live";
import { v2App, type ShellData } from "@/lib/live-app";
import { ShellProvider } from "@/components/live-shell-context";

const MAIN = process.env.UI_MAIN_ORIGIN;

/**
 * The visitor's address as nginx reported it. The main site rate-limits by
 * client IP; without this every request from this app would count against one
 * shared bucket and, under load, answer 429 for everybody.
 */
function visitorIp(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  const forwarded = h.get("x-forwarded-for"), real = h.get("x-real-ip");
  if (forwarded) out["x-forwarded-for"] = forwarded;
  if (real) out["x-real-ip"] = real;
  return out;
}
type Props = { params: Promise<{ slug?: string[] }> };
const pathOf = async (params: Props["params"]) => "/" + ((await params).slug?.join("/") ?? "");

/** Real public content from the main site, cached for a minute; null outside live mode. */
const siteData = cache(async (path: string): Promise<SiteData | null> => {
  if (!MAIN || !(v2Ready(path) || v2App(path))) return null;
  const lang = (await headers()).get("x-ui-lang") || "fa";
  const res = await fetch(`${MAIN}/api/public/site?lang=${encodeURIComponent(lang)}&path=${encodeURIComponent(path)}`, { cache:"no-store", headers: visitorIp(await headers()) });
  // Never fall back to demo content on aifekr.com; the error page is shown instead.
  if (!res.ok) throw new Error(`Site content unavailable (${res.status})`);
  return (await res.json()) as SiteData;
});

/**
 * A signed-in page's frame from the main site, with the visitor's own cookies.
 * Sends the visitor wherever the classic layout would (sign-in, onboarding...).
 */
const shellData = cache(async (path: string): Promise<ShellData | null> => {
  if (!MAIN || !v2App(path)) return null;
  const h = await headers();
  const requested = h.get("x-aifekr-path") || path;
  const res = await fetch(`${MAIN}/api/app/shell?path=${encodeURIComponent(requested)}`, { cache: "no-store", headers: { cookie: h.get("cookie") || "", ...visitorIp(h) } });
  if (!res.ok) throw new Error(`App frame unavailable (${res.status})`);
  const data = await res.json();
  if (data.redirect) redirect(data.redirect);
  // Chat-only and /play frames are never routed here by the main site.
  if (!data.lang) throw new Error("Unsupported app frame");
  return data as ShellData;
});

const ownerData=cache(async()=>{
  const h=await headers();const response=await fetch(`${MAIN}/api/owner/me`,{cache:"no-store",headers:{cookie:h.get("cookie")||"",...visitorIp(h)}});
  if(response.status===401)redirect("/owner/login");if(!response.ok)throw Error(`Owner portal unavailable (${response.status})`);return response.json();
});

const toMetadata = (raw: Record<string, unknown>): Metadata => {
  const { metadataBase, ...rest } = raw as Metadata & { metadataBase?: string };
  return { ...rest, metadataBase: metadataBase ? new URL(metadataBase) : undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = await pathOf(params);
  if(MAIN && path === "/owner"){await ownerData();return {title:"AIFekr | Owner portal",robots:{index:false,follow:false}};}
  if (MAIN && v2App(path)) return toMetadata((await shellData(path))!.metadata);
  const data = await siteData(path);
  return data?.seo ? toMetadata(data.seo.metadata) : {};
}

export default async function Page({ params }: Props) {
  const path = await pathOf(params);
  if(MAIN && path === "/owner") {await ownerData();const data=await siteData("/");return <SiteProvider data={data}><Platform path={path}/></SiteProvider>;}
  // Never expose a prototype through an unconnected route on the live server.
  if (MAIN && !v2Ready(path) && !v2App(path)) notFound();
  const data = await siteData(path);
  // Live pages exist only where the main site has the same page (same URL, same SEO).
  if (MAIN && v2Ready(path) && !data?.seo) notFound();
  const shell = await shellData(path);
  return (
    <SiteProvider data={data}>
      <ShellProvider data={shell}>
      {data?.seo?.jsonLd.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.jsonLd).replace(/</g, "\u003c") }} /> : null}
      <Platform path={path} />
      {data && <GrowthTracker />}
      </ShellProvider>
    </SiteProvider>
  );
}
