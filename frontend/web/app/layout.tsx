import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiConfigGuard } from "@/components/ApiConfigGuard";

// SPEC: Use Inter font (or SF Pro Display as fallback)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "HTX TAP Analytics",
  description: "Restaurant analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        <ApiConfigGuard>
          {children}
        </ApiConfigGuard>
      </body>
    </html>
  );
}
