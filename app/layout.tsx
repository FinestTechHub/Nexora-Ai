import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  appleWebApp: { capable: true, title: "Nexora", statusBarStyle: "black-translucent" },
  icons: { apple: "/icon-192.png" },
  title: { default: `${SITE.name} – ${SITE.tagline}`, template: `%s – ${SITE.name}` },
  description: "Create stunning images, generate videos, produce realistic AI voices and optimize your content. Download the Nexora Ai app.",
};
export const viewport: Viewport = { themeColor: "#2563EB", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className={inter.className}>{children}</body></html>);
}
