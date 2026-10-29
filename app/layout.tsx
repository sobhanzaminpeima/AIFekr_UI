import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = {
  title: "ای آی فکر | یک فکر، هزار امکان",
  description:
    "پلتفرم یکپارچه هوش مصنوعی؛ گفتگو، خلق محتوا، کسب‌وکار، یادگیری و تناسب اندام.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
