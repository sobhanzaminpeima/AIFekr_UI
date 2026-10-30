import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import "./live-app.css";
import { Providers } from "@/components/providers";
import type { Locale } from "@/lib/i18n";
export const metadata: Metadata = {
  title: "ای آی فکر | یک فکر، هزار امکان",
  description:
    "پلتفرم یکپارچه هوش مصنوعی؛ گفتگو، خلق محتوا، کسب‌وکار، یادگیری و تناسب اندام.",
};
// Same viewport as the classic site.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0a0a0f" };
const LOCALES: Locale[] = ["fa", "en", "de", "tr"];
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const header = (await headers()).get("x-ui-lang") as Locale | null;
  const live = !!process.env.UI_MAIN_ORIGIN;
  const locale: Locale = header && LOCALES.includes(header) ? header : "fa";
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} suppressHydrationWarning>
      {/* aifekr.com analytics, identical to the classic layout; never in the standalone preview. */}
      {live && <head>
        <Script id="aifekr-google-tag-manager" strategy="beforeInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-5KPJ94DJ');
        `}</Script>
      </head>}
      <body>
        {live && <>
          <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5KPJ94DJ" height="0" width="0" style={{display:"none",visibility:"hidden"}} title="Google Tag Manager" /></noscript>
          <Script src="https://www.googletagmanager.com/gtag/js?id=G-PEZ7X47VRX" strategy="afterInteractive" />
          <Script id="aifekr-google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-PEZ7X47VRX');
        `}</Script>
        </>}
        <Providers initialLocale={live ? locale : undefined}>{children}</Providers>
      </body>
    </html>
  );
}
