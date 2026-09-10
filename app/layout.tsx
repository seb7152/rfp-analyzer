import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import "../styles/globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RFP Analyzer",
  description: "Plateforme d'analyse de réponses à appels d'offres",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${sourceSans.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
