"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
  );

  useEffect(() => {
    const size = localStorage.getItem("font_size") ?? "medium";
    const sizeMap: Record<string, string> = { small: "14px", medium: "16px", large: "19px" };
    document.documentElement.style.fontSize = sizeMap[size] ?? "16px";
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
