import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "SkillSewa — Nepal's Home Service Platform",
    template: "%s | SkillSewa",
  },
  description:
    "Book verified home service professionals, order supplies, and manage your household needs — all in one platform.",
  keywords: ["home service", "Nepal", "plumber", "electrician", "cleaning", "repair"],
  authors: [{ name: "SkillSewa" }],
  openGraph: {
    type: "website",
    locale: "en_NP",
    url: "https://skillsewa.com",
    title: "SkillSewa — Nepal's Home Service Platform",
    description: "Book verified home service professionals across Nepal.",
    siteName: "SkillSewa",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
