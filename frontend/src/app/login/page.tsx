"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code`;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) router.replace("/schedule");
  }, [router]);

  return (
    // ✅ 전체 배경 다크 모드 적용
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors duration-200">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image src="/PillMate.png" alt="PillMate" width={160} height={160} className="mx-auto mb-4 rounded-full object-cover" />
          {/* ✅ 텍스트 다크 모드 */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 transition-colors">처방전 한 장으로 복약 관리 시작</p>
        </div>
        <div className="space-y-3">
          {[
            { icon: "📋", text: "처방전 사진 찍으면 자동으로 약 정보 인식" },
            { icon: "⏰", text: "내 복약 스케줄 자동 생성" },
            { icon: "💬", text: "AI 챗봇으로 복약 궁금증 즉시 해결" },
          ].map(({ icon, text }) => (
            // ✅ 소개 박스 배경 및 텍스트 다크 모드 적용
            <div key={text} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm transition-colors">
              <span className="text-xl">{icon}</span>
              <p className="text-sm text-gray-700 dark:text-gray-200 transition-colors">{text}</p>
            </div>
          ))}
        </div>
        
        {/* 카카오 버튼은 브랜드 컬러 유지를 위해 기본 색상을 유지합니다 */}
        <a
          href={KAKAO_AUTH_URL}
          className="flex items-center justify-center gap-3 w-full bg-[#FEE500] text-[#191919] font-bold py-4 rounded-2xl shadow-sm hover:bg-[#FDD835] transition-colors"
        >
          카카오로 시작하기
        </a>
        
        {/* ✅ 면책 조항 텍스트 다크 모드 */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center transition-colors">※ 본 서비스는 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}