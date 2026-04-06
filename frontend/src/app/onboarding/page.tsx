"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

const STEPS = [
  {
    icon: "📸",
    title: "처방전을 찍어주세요",
    desc: "처방전 사진 한 장이면 충분해요.\nAI가 약물 정보를 자동으로 인식해요.",
    color: "bg-violet-50",
    iconBg: "bg-violet-100",
  },
  {
    icon: "💊",
    title: "복약 스케줄이 자동 생성돼요",
    desc: "아침·점심·저녁 약봉투별로\n복약 시간표가 만들어져요.",
    color: "bg-purple-50",
    iconBg: "bg-purple-100",
  },
  {
    icon: "✅",
    title: "매일 복약을 체크하세요",
    desc: "복약 완료 버튼 하나로\n오늘 약을 모두 체크할 수 있어요.",
    color: "bg-indigo-50",
    iconBg: "bg-indigo-100",
  },
  {
    icon: "👨‍👩‍👧",
    title: "가족과 공유할 수 있어요",
    desc: "보호자에게 링크를 공유하면\n복약 현황을 실시간으로 확인해요.",
    color: "bg-pink-50",
    iconBg: "bg-pink-100",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) router.replace("/login");
  }, [router]);

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem("onboarding_done", "true");
      router.replace("/upload");
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_done", "true");
    router.replace("/schedule");
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 상단 로고 */}
      <div className="flex justify-between items-center px-5 pt-12 pb-4">
        <Image src="/PillMate.png" alt="PillMate" width={40} height={40} className="rounded-full" />
        <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600">
          건너뛰기
        </button>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex gap-1.5 px-5 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${i === step ? "bg-violet-600 flex-1" : "bg-gray-200 w-6"}`} />
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`w-28 h-28 ${current.iconBg} rounded-3xl flex items-center justify-center mb-8`}>
          <span className="text-6xl">{current.icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{current.title}</h2>
        <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{current.desc}</p>
      </div>

      {/* 하단 버튼 */}
      <div className="px-5 pb-12 space-y-3">
        <button onClick={handleNext}
          className="w-full bg-violet-600 text-white font-bold py-4 rounded-2xl hover:bg-violet-700 transition-colors">
          {isLast ? "처방전 등록하기 →" : "다음"}
        </button>
        {step === 0 && (
          <button onClick={handleSkip}
            className="w-full text-sm text-gray-400 py-2">
            이미 사용해봤어요
          </button>
        )}
      </div>
    </main>
  );
}
