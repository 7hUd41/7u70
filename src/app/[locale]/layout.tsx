import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, LOCALES } from "@/engine";
import { dict } from "@/i18n";
import { fontClassName } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = dict(locale);
  return { title: { default: t.brand, template: `%s · ${t.brand}` }, description: t.tagline };
}

/* public/theme.js runs before paint so the theme and skin never flash. A
   plain blocking script in <head>: next/script's beforeInteractive only
   runs before hydration, which is after the first paint. */

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${fontClassName} h-full`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must run before paint, a few hundred bytes */}
        <script src="/theme.js" />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
