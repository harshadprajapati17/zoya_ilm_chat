import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL("https://zoya-ilm-chat.vercel.app"),
  title: "Zoya AI-Powered Chat System",
  description: "Multi-lingual customer support with intelligent AI assistance",
  openGraph: {
    title: "Zoya AI-Powered Chat System",
    description: "Multi-lingual customer support with intelligent AI assistance",
    url: "https://zoya-ilm-chat.vercel.app",
    siteName: "Zoya",
    images: [
      {
        url: "https://www.zoya.in/on/demandware.static/-/Sites-Zoya-Library/default/dw3635170c/images/zoya-header-logo.png",
        alt: "Zoya logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zoya AI-Powered Chat System",
    description: "Multi-lingual customer support with intelligent AI assistance",
    images: [
      "https://www.zoya.in/on/demandware.static/-/Sites-Zoya-Library/default/dw3635170c/images/zoya-header-logo.png",
    ],
  },
};

/** Lets `env(safe-area-inset-*)` apply on notched iOS devices when using full-bleed layouts. */
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
