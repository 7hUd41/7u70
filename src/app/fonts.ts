/* Self-hosted fonts (OFL). Served by next/font/local: no third-party request. */
import localFont from "next/font/local";

/** Body text. Libertinus is the maintained fork of Linux Libertine. */
export const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../fonts/LibertinusSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/LibertinusSerif-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/LibertinusSerif-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/LibertinusSerif-SemiboldItalic.woff2", weight: "600", style: "italic" },
    { path: "../fonts/LibertinusSerif-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/LibertinusSerif-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
});

/** Large titles only. */
export const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [{ path: "../fonts/LibertinusSerifDisplay-Regular.woff2", weight: "400", style: "normal" }],
});

/** UI chrome: labels, buttons, panels. */
export const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../fonts/LibertinusSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/LibertinusSans-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/LibertinusSans-Bold.woff2", weight: "700", style: "normal" },
  ],
});

/** Code. Variable font, ligatures enabled in globals.css. */
export const mono = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [{ path: "../fonts/FiraCode-VF.woff2", weight: "300 700", style: "normal" }],
});

/** Rounded sans used by the "transit" skin for everything but code. */
export const rounded = localFont({
  variable: "--font-rounded",
  display: "swap",
  src: [
    { path: "../fonts/Nunito-VF.woff2", weight: "200 1000", style: "normal" },
    { path: "../fonts/Nunito-VF-Italic.woff2", weight: "200 1000", style: "italic" },
  ],
});

/** Neutral grotesque for the "slate", "night" and "atom" skins. */
export const plex = localFont({
  variable: "--font-plex",
  display: "swap",
  src: [
    { path: "../fonts/IBMPlexSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSans-400-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/IBMPlexSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSans-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSans-700.woff2", weight: "700", style: "normal" },
  ],
});

/** Characterful grotesque for the "headline" skin's titles. */
export const bricolage = localFont({
  variable: "--font-bricolage",
  display: "swap",
  src: [{ path: "../fonts/BricolageGrotesque-VF.woff2", weight: "200 800", style: "normal" }],
});

export const fontClassName = [serif.variable, display.variable, sans.variable, mono.variable, rounded.variable, plex.variable, bricolage.variable].join(" ");
