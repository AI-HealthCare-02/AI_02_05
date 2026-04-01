import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "ClinicalCare+",
  description: "처방전 기반 복약 안내 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
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
