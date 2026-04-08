import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "PillMate",
  description: "처방전 한 장으로 시작하는 스마트 복약 관리",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      {/*  기본 글자색(text-gray-900), 다크모드 색상(dark:bg-gray-900 dark:text-white), 
           색상 전환 애니메이션(transition-colors duration-200) */}
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
        <Providers>
          <div className="max-w-md mx-auto min-h-screen relative">
            <div className="pb-16">
              {children}
            </div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}