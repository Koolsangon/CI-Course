import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import ServiceWorkerBoot from "@/components/ServiceWorkerBoot";
import ProfileGate from "@/components/ProfileGate";

// Pretendard is not on Google Fonts; use Noto Sans KR as Korean-optimized fallback
// with a matching weights selection. The CSS variable is consumed by tailwind.config.ts
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-pretendard",
  display: "swap",
  preload: true
});

export const metadata: Metadata = {
  title: "Cost Sim v1 — 살아있는 원가 트리",
  description: "COP/COM/SGA 원가 구조 해석력을 기르는 인터랙티브 학습 툴",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "원가 트리"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)",  color: "#090d18" }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} dark`}>
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ServiceWorkerBoot />
        <ProfileGate />
        {children}
      </body>
    </html>
  );
}
