import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const TITLE = "Salli — Personal Finance, Tax & FIRE Planning for Sri Lanka";
const DESCRIPTION =
  "A real double-entry ledger, a Sri Lanka income tax engine (YA 2025/26, IRD-aligned), "
  + "and an AI wealth advisor that works from your actual numbers — so you always know "
  + "your tax, your net worth, and how close you are to financial independence.";

export const metadata: Metadata = {
  metadataBase: new URL("https://salli.lk"),
  title: { default: TITLE, template: "%s · Salli" },
  description: DESCRIPTION,
  keywords: [
    "Sri Lanka income tax",
    "Sri Lanka tax calculator",
    "personal finance Sri Lanka",
    "IRD tax",
    "APIT AIT calculator",
    "financial independence",
    "FIRE calculator",
    "double-entry ledger",
    "AI wealth advisor",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "https://salli.lk",
    siteName: "Salli",
    locale: "en_LK",
    images: [{ url: "/screens/web-dashboard.webp", width: 1600, height: 1000, alt: "Salli dashboard — net worth, income, tax payable, and FI score" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/screens/web-dashboard.webp"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Salli",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  description: DESCRIPTION,
  url: "https://salli.lk",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  areaServed: { "@type": "Country", name: "Sri Lanka" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <CookieConsent />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
