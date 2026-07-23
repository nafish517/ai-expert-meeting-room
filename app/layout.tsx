import type { Metadata } from "next";
import { Fraunces, Geist, IBM_Plex_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const geistSans = Geist({
  variable: "--font-chrome",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThinkRoom | AI Expert Meeting",
  description:
    "One continuous meeting with every AI expert you need.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexMono.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
