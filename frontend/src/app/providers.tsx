"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes"; // ✅ 다크 모드용 라이브러리

export function Providers({ children }: { children: React.ReactNode }) {
  // 1. React Query 셋팅
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
  );

  // 2. 글씨 크기 셋팅
  useEffect(() => {
    // 사용자가 이전에 저장해둔 글씨 크기가 있는지 확인하고, 없으면 기본값(medium) 적용
    const size = localStorage.getItem("font_size") ?? "medium";
    const sizeMap: Record<string, string> = { small: "14px", medium: "16px", large: "19px" };
    
    // HTML 최상단 폰트 크기를 변경하여 rem 단위가 적용된 모든 글씨 크기를 일괄 조절
    document.documentElement.style.fontSize = sizeMap[size] ?? "16px";
  }, []);

  // 3. 화면 그리기 (return은 함수 마지막에 딱 한 번만!)
  return (
    <QueryClientProvider client={client}>
      {/* ✅ 다크 모드를 앱 전체에 적용합니다 */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
