import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClinicalCare+",
  description: "처방전 기반 복약 안내 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div className="max-w-md mx-auto min-h-screen pb-20 bg-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
