import type { Metadata } from "next";
import { Archivo, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { GrainOverlay } from "@/components/GrainOverlay";
import { SITE_URL } from "@/lib/config";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const TITLE = "Salli: Personal Finance, Tax & FIRE Planning for Sri Lanka";
const DESCRIPTION =
  "A real double-entry ledger, a Sri Lanka income tax engine (YA 2025/26, IRD-aligned), "
  + "and an AI wealth advisor that works from your actual numbers, so you always know "
  + "your tax, your net worth, and how close you are to financial independence.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    url: SITE_URL,
    siteName: "Salli",
    locale: "en_LK",
    images: [{ url: "/screens/site-preview.png", width: 1672, height: 941, alt: "Salli's Overview, Freedom, and Tax screens showing net worth, tax payable, and Freedom Score" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/screens/site-preview.png"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Salli",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web, iOS, Android",
  description: DESCRIPTION,
  url: SITE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  areaServed: { "@type": "Country", name: "Sri Lanka" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}>
      <body>
        <GrainOverlay />
        {children}
        <CookieConsent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </body>
    </html>
  );
}
