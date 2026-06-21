import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
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
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
