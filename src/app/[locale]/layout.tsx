import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
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

/* Applied before paint so the theme never flashes. Reads the stored choice,
   falls back to the OS preference. */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t;var s=localStorage.getItem("skin");if(s&&s!=="editorial"){document.documentElement.dataset.skin=s}}catch(e){}})();`;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${fontClassName} h-full`} suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
