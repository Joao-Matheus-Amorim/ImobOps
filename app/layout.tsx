import type { Metadata, Viewport } from "next";
import { Inter, Chivo_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

// Body font.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Display font — condensed mono, used for ALL-CAPS headings and labels.
const display = Chivo_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: "#070B10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
