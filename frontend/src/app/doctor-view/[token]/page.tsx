"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 📝 가짜 환자 데이터 (Mock Data)
const PATIENT_MOCK = {
  name: "김환자",
  age: 65,
  gender: "여",
  disease: "고혈압, 고지혈증",
  period: "2026.04.03 ~ 2026.04.10 (7일간)",
  adherence: [
    { drug: "아마릴정 (당뇨)", time: "아침, 저녁", rate: 95 },
    { drug: "크레스토정 (고지혈증)", time: "저녁", rate: 60 },
    { drug: "노바스크정 (고혈압)", time: "아침", rate: 100 },
  ],
  ai_analysis: "최근 7일간 전체 복약 순응도는 85%입니다. 아침 약은 매우 규칙적으로 복용 중이나, 저녁 식후 복용하는 '크레스토정'의 누락 빈도가 높습니다. 환자에게 저녁 식사 직후 알람을 설정하도록 권고가 필요합니다.",
};

// 🔽 아코디언 UI 컴포넌트
function Accordion({ title, children, defaultOpen = false, seniorMode }: { title: string; children: React.ReactNode; defaultOpen?: boolean; seniorMode: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-3 bg-white dark:bg-gray-800 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <span className={seniorMode ? "text-base font-extrabold text-gray-900 dark:text-white" : "text-sm font-bold text-gray-800 dark:text-gray-200"}>
          {title}
        </span>
        <span className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      {isOpen && <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">{children}</div>}
    </div>
  );
}

export default function DoctorViewPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // ✅ 접근성 상태 불러오기
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsColorBlind(localStorage.getItem("color_blind_mode") === "true");
    setSeniorMode(localStorage.getItem("senior_mode") === "true");
  }, []);

  if (!mounted) return null;

  // 동적 스타일 변수
  const descClass = seniorMode ? "text-sm font-bold text-gray-700 dark:text-gray-300" : "text-xs text-gray-500 dark:text-gray-400";
  const successText = isColorBlind ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400";
  const dangerText = isColorBlind ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400";

  return (
    <main className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200 ${seniorMode ? "senior-mode" : ""}`}>
      {/* 헤더 영역 (의사용이므로 조금 더 차분한 톤) */}
      <div className="bg-slate-800 dark:bg-black px-5 pt-12 pb-8 text-white rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">환자 복약 리포트</h1>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">의료진 전용</span>
        </div>
        
        {/* 환자 요약 정보 */}
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">👤</div>
            <div>
              <p className="text-lg font-bold">{PATIENT_MOCK.name} <span className="text-sm font-normal text-slate-300">({PATIENT_MOCK.gender}/{PATIENT_MOCK.age}세)</span></p>
              <p className="text-xs text-slate-300 mt-0.5">조회 기간: {PATIENT_MOCK.period}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        
        {/* 1. 기저 질환 아코디언 */}
        <Accordion title="🩺 환자 주요 질환" seniorMode={seniorMode}>
          <p className={`${seniorMode ? "text-base font-bold" : "text-sm font-semibold"} text-gray-800 dark:text-gray-200`}>
            {PATIENT_MOCK.disease}
          </p>
        </Accordion>

        {/* 2. 약물별 순응도 아코디언 */}
        <Accordion title="📊 약물별 복약 순응도" defaultOpen={true} seniorMode={seniorMode}>
          <div className="space-y-4">
            {PATIENT_MOCK.adherence.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`${seniorMode ? "text-sm font-extrabold" : "text-sm font-medium"} text-gray-700 dark:text-gray-300`}>{item.drug}</span>
                  <span className={`${seniorMode ? "text-sm font-extrabold" : "text-sm font-bold"} ${item.rate >= 80 ? successText : dangerText}`}>
                    {item.rate}%
                  </span>
                </div>
                {/* 프로그레스 바 */}
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${item.rate >= 80 ? (isColorBlind ? "bg-blue-400" : "bg-emerald-400") : (isColorBlind ? "bg-orange-400" : "bg-red-400")}`} 
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
                <p className={`${descClass} text-right`}>복용 시점: {item.time}</p>
              </div>
            ))}
          </div>
        </Accordion>

        {/* 3. AI 분석 코멘트 아코디언 */}
        <Accordion title="🤖 AI 분석 및 권고사항" defaultOpen={true} seniorMode={seniorMode}>
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-800">
            <p className={`${seniorMode ? "text-base font-bold leading-relaxed" : "text-sm leading-relaxed"} text-gray-800 dark:text-gray-200`}>
              {PATIENT_MOCK.ai_analysis}
            </p>
          </div>
        </Accordion>

      </div>
    </main>
  );
}