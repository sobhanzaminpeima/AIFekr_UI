import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Platform } from "@/components/platform";
import { SiteProvider } from "@/components/site-link";
import GrowthTracker from "@/components/growth-tracker";
import { v2Ready, type SiteData } from "@/lib/live";

const MAIN = process.env.UI_MAIN_ORIGIN;
type Props = { params: Promise<{ slug?: string[] }> };
const pathOf = async (params: Props["params"]) => "/" + ((await params).slug?.join("/") ?? "");

/** Real public content from the main site, cached for a minute; null outside live mode. */
async function siteData(path: string): Promise<SiteData | null> {
  if (!MAIN || !v2Ready(path)) return null;
  const lang = (await headers()).get("x-ui-lang") || "fa";
  const res = await fetch(`${MAIN}/api/public/site?lang=${encodeURIComponent(lang)}&path=${encodeURIComponent(path)}`, { next: { revalidate: 60 } });
  // Never fall back to demo content on aifekr.com; the error page is shown instead.
  if (!res.ok) throw new Error(`Site content unavailable (${res.status})`);
  return (await res.json()) as SiteData;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await siteData(await pathOf(params));
  if (!data?.seo) return {};
  const { metadataBase, ...rest } = data.seo.metadata as Metadata & { metadataBase?: string };
  return { ...rest, metadataBase: metadataBase ? new URL(metadataBase) : undefined };
}

export default async function Page({ params }: Props) {
  const path = await pathOf(params);
  const data = await siteData(path);
  // Live pages exist only where the main site has the same page (same URL, same SEO).
  if (MAIN && v2Ready(path) && !data?.seo) notFound();
  return (
    <SiteProvider data={data}>
      {data?.seo?.jsonLd.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.seo.jsonLd).replace(/</g, "\u003c") }} /> : null}
      <Platform path={path} />
      {data && <GrowthTracker />}
    </SiteProvider>
  );
}
