import type { Metadata } from "next";
import { fontClassName } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "Adaptive tutorials" };

/* One root layout for every language: the html lang is set before paint by
   public/theme.js from the URL (a language segment, first or last), and
   confirmed by the page once hydrated. theme.js also applies the stored
   theme and skin; a plain blocking script in <head>, since next/script's
   beforeInteractive only runs before hydration, which is after the first
   paint. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontClassName} h-full`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must run before paint, a few hundred bytes */}
        <script src="/theme.js" />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
