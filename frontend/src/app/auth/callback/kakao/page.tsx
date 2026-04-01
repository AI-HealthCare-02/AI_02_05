"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) { router.push("/login"); return; }
    api.post(`/auth/kakao?code=${code}`)
      .then(({ data }) => {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/schedule");
      })
      .catch(() => router.push("/login?error=auth_failed"));
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-4xl mb-4 animate-bounce">💊</div>
      <p className="text-gray-600 font-medium">로그인 중...</p>
    </main>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-4xl mb-4 animate-bounce">💊</div>
        <p className="text-gray-600 font-medium">로그인 중...</p>
      </main>
    }>
      <KakaoCallbackInner />
    </Suspense>
  );
}
