import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAD Toolbox — Free Online CAD Viewer & Drawing Generator",
  description:
    "View STEP and STP CAD files online and generate professional 3-view engineering drawings as PDF.",
  keywords: [
    "CAD viewer",
    "STEP viewer",
    "STP viewer",
    "STEP to PDF",
    "CAD drawing generator",
    "engineering drawing",
    "online CAD viewer",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
