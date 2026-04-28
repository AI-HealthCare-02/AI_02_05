"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

// 📝 가짜 데이터 (Mock Data)
const MOCK_DATA = {
  ai_analysis: "환자분은 아침 약(혈압약)은 100% 잘 드시지만, 저녁 약(위장약) 누락이 잦습니다. 저녁 식사 후 바로 복용하는 습관을 들여보세요.",
  chart_data: [
    { name: "월", rate: 100 },
    { name: "화", rate: 80 },
    { name: "수", rate: 50 },
    { name: "목", rate: 100 },
    { name: "금", rate: 60 },
    { name: "토", rate: 90 },
    { name: "일", rate: 100 },
  ],
};

export default function ReportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [mounted, setMounted] = useState(false);
  
  // ✅ 1. 공유 모달 관리를 위한 상태값 추가
  const [showShareModal, setShowShareModal] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsColorBlind(localStorage.getItem("color_blind_mode") === "true");
    setSeniorMode(localStorage.getItem("senior_mode") === "true");
  }, []);

  if (!mounted) return null;

  const titleClass = seniorMode ? "text-xl font-extrabold text-black dark:text-white" : "text-lg font-bold text-gray-800 dark:text-gray-100";
  const descClass = seniorMode ? "text-sm font-bold text-gray-700 dark:text-gray-300" : "text-xs text-gray-500 dark:text-gray-400";
  const chartColor = isColorBlind ? "#60a5fa" : "#8b5cf6"; 

  // ✅ 2. 공유 링크 생성 및 복사 함수 (임시 로직)
  const handleShareClick = () => {
    if (!doctorName || !hospitalName) {
      alert("의사 선생님 성함과 병원명을 모두 입력해주세요.");
      return;
    }
    
    setIsGenerating(true);
    
    // API 통신을 하는 것처럼 1초 대기 후 가짜 링크 복사
    setTimeout(() => {
      const fakeToken = Math.random().toString(36).substring(2, 15);
      const shareUrl = `${window.location.origin}/doctor-view/${fakeToken}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert(`${doctorName} 선생님께 전달할 링크가 복사되었습니다!\n카카오톡이나 문자로 공유해보세요.\n\n(임시 링크: ${shareUrl})`);
        setIsGenerating(false);
        setShowShareModal(false);
        setDoctorName("");
        setHospitalName("");
      });
    }, 1000);
  };

  return (
    <main className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200 ${seniorMode ? "senior-mode" : ""}`}>
      {/* 헤더 영역 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3 flex items-center gap-1 hover:text-white transition-colors">
          ‹ 뒤로
        </button>
        <h1 className="text-2xl font-bold">복약 패턴 리포트</h1>
        <p className="text-violet-200 text-xs mt-0.5">AI가 분석한 나의 복약 습관을 확인하세요</p>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* 탭 전환 버튼 */}
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1 transition-colors">
          <button 
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "weekly" ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
            주간 리포트
          </button>
          <button 
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "monthly" ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
            월간 리포트
          </button>
        </div>

        {/* AI 분석 결과 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm transition-colors">
          <p className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-2">✨ AI 복약 권고사항</p>
          <p className={`${seniorMode ? "text-base font-bold" : "text-sm"} text-gray-700 dark:text-gray-200 leading-relaxed`}>
            {MOCK_DATA.ai_analysis}
          </p>
        </div>

        {/* 막대 차트 영역 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm transition-colors">
          <h2 className={titleClass}>요일별 복약 달성률</h2>
          <p className={`${descClass} mb-4`}>이번 주 복약 현황입니다.</p>
          
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DATA.chart_data}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: seniorMode ? '#000' : '#888' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                <Bar dataKey="rate" fill={chartColor} radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ✅ 3. 의사 공유하기 버튼 (클릭 시 모달 열림) */}
        <button 
          onClick={() => setShowShareModal(true)}
          className="w-full border-2 border-dashed border-violet-300 dark:border-violet-600 rounded-2xl py-4 flex flex-col items-center justify-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
          <span className="text-2xl">👨‍⚕️</span>
          <p className={seniorMode ? "text-base font-bold text-violet-700 dark:text-violet-300" : "text-sm font-bold text-violet-600 dark:text-violet-400"}>
            의사에게 리포트 공유하기
          </p>
        </button>
      </div>

      {/* ✅ 4. 공유하기 모달창 UI */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm px-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 transition-colors" onClick={(e) => e.stopPropagation()}>
            <h3 className={titleClass}>리포트 공유 링크 만들기</h3>
            <p className={`${descClass} mt-1 mb-5`}>담당 의사 선생님께 보낼 링크를 생성합니다.</p>
            
            <div className="space-y-4">
              <div>
                <label className={`block mb-1.5 ${seniorMode ? "text-sm font-bold" : "text-xs font-semibold"} text-gray-700 dark:text-gray-300`}>병원명</label>
                <input 
                  type="text" 
                  placeholder="예) 새론내과" 
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors ${seniorMode ? "text-base font-bold" : "text-sm"} text-black dark:text-white`}
                />
              </div>
              <div>
                <label className={`block mb-1.5 ${seniorMode ? "text-sm font-bold" : "text-xs font-semibold"} text-gray-700 dark:text-gray-300`}>의사 성함</label>
                <input 
                  type="text" 
                  placeholder="예) 김의사" 
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-violet-500 transition-colors ${seniorMode ? "text-base font-bold" : "text-sm"} text-black dark:text-white`}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setShowShareModal(false)}
                className={`flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors ${seniorMode ? "text-base font-bold" : "text-sm font-semibold"}`}>
                취소
              </button>
              <button 
                onClick={handleShareClick}
                disabled={isGenerating || !doctorName || !hospitalName}
                className={`flex-1 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${seniorMode ? "text-base font-bold" : "text-sm font-semibold"}`}>
                {isGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> 생성 중</>
                ) : "링크 복사하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}