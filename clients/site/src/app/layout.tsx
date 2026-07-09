import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Salli — Stop guessing. Start knowing.",
  description:
    "Track your money. Understand your tax. Build your freedom. Personal finance, "
    + "Sri Lanka income tax, and an AI wealth advisor — in one ledger.",
  openGraph: {
    title: "Salli — Stop guessing. Start knowing.",
    description: "Track your money. Understand your tax. Build your freedom.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
