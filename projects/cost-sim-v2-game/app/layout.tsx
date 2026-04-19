import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerBoot from "@/components/ServiceWorkerBoot";
import ProfileGate from "@/components/ProfileGate";

export const metadata: Metadata = {
  title: "개발원가 시뮬레이션 — LG Display HRD",
  description: "COP/COM/SGA 원가 구조 해석력을 기르는 인터랙티브 학습 툴 · LG Display 전사원 교육",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.svg" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "원가 시뮬레이션"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)",  color: "#0A0A0A" }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable — LG Smart substitute, Korean + Latin */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
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
