import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ClientProviders } from "./components/ClientProviders";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Spinner from "./components/Spinner";

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OneStaff OS - HR Management System",
  description: "Complete HR Management Solution for Modern Organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ErrorBoundary>
          <ClientProviders>
            <Navbar />
            <Suspense fallback={<Spinner fullScreen size="lg" />}>
              {children}
            </Suspense>
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
