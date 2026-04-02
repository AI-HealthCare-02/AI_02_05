"use client";

import Image from "next/image";

export default function LoginPage() {
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code`;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image src="/PillMate.png" alt="PillMate" width={140} height={140} className="mx-auto mb-4" />
          <p className="text-sm text-gray-500 mt-2">처방전 한 장으로 복약 관리 시작</p>
        </div>
        <div className="space-y-3">
          {[
            { icon: "📋", text: "처방전 사진 찍으면 자동으로 약 정보 인식" },
            { icon: "⏰", text: "내 복약 스케줄 자동 생성" },
            { icon: "💬", text: "AI 챗봇으로 복약 궁금증 즉시 해결" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
              <span className="text-xl">{icon}</span>
              <p className="text-sm text-gray-700">{text}</p>
            </div>
          ))}
        </div>
        <a
          href={KAKAO_AUTH_URL}
          className="flex items-center justify-center gap-3 w-full bg-[#FEE500] text-[#191919] font-bold py-4 rounded-2xl shadow-sm hover:bg-[#FDD835] transition-colors"
        >
          카카오로 시작하기
        </a>
        <p className="text-xs text-gray-400 text-center">※ 본 서비스는 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}
