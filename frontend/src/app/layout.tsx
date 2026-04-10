import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import BottomNav from "@/components/BottomNav";
// ✅ 1. ThemeProvider 불러오기
import { ThemeProvider } from "next-themes";

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
    // ✅ 2. 다크모드 깜빡임 방지용 속성 추가
    <html lang="ko" suppressHydrationWarning>
      {/* ✅ 3. 다크모드 배경색(dark:bg-gray-900) 추가 */}
      <body className="bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* ✅ 4. ThemeProvider로 전체 앱 감싸기 */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            <div className="max-w-md mx-auto min-h-screen relative">
              <div className="pb-16">
                {children}
              </div>
              <BottomNav />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}