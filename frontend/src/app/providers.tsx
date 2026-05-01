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

    const savedTheme = localStorage.getItem("theme") || "system";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const isColorBlind = localStorage.getItem("color_blind_mode") === "true";
    const isSenior = localStorage.getItem("senior_mode") === "true";

    if (isColorBlind) document.body.classList.add("color-blind");
    else document.body.classList.remove("color-blind");

    if (isSenior) document.body.classList.add("senior-mode");
    else document.body.classList.remove("senior-mode");
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}