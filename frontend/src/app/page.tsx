"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      router.replace("/schedule");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-4xl animate-bounce">💊</div>
    </main>
  );
}
