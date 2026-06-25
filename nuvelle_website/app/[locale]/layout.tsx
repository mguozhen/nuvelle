import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { getLocaleByRouteParam } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Nuvelle - The Home of AI Shorts",
  description:
    "Nuvelle is the home of premium AI-crafted vertical dramas. Billionaires, werewolves, second chances and sweet revenge.",
  other: {
    "facebook-domain-verification": "14ygh3kdihl9u9q638hyy6zls7gqzr",
  },
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleRootLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const localeInfo = getLocaleByRouteParam(locale);
  if (!localeInfo) {
    notFound();
  }

  return (
    <html lang={localeInfo.htmlLang}>
      <body>{children}</body>
    </html>
  );
}
