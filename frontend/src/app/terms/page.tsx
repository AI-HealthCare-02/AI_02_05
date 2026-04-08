"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TERMS = [
  {
    title: "제1조 (목적)",
    content: "본 약관은 PillMate(이하 '서비스')가 제공하는 복약 관리 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.",
  },
  {
    title: "제2조 (서비스 내용)",
    content: "서비스는 처방전 OCR 인식, 복약 스케줄 관리, AI 건강 상담 기능을 제공합니다. 본 서비스는 의료 행위를 대체하지 않으며, 제공되는 정보는 참고용입니다.",
  },
  {
    title: "제3조 (면책 조항)",
    content: "서비스는 AI 및 OCR 기술을 활용하여 처방전을 인식하나, 인식 오류가 발생할 수 있습니다. 복약 관련 중요한 결정은 반드시 의사·약사와 상담하시기 바랍니다. 서비스 이용으로 인한 의료적 결과에 대해 책임을 지지 않습니다.",
  },
  {
    title: "제4조 (개인정보 수집)",
    content: "서비스는 카카오 OAuth를 통해 닉네임, 이메일, 프로필 사진을 수집합니다. 처방전 이미지는 AWS S3에 암호화하여 저장되며, 복약 기록은 서비스 제공 목적으로만 사용됩니다.",
  },
  {
    title: "제5조 (개인정보 보유 기간)",
    content: "수집된 개인정보는 회원 탈퇴 시 즉시 삭제됩니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.",
  },
  {
    title: "제6조 (서비스 중단)",
    content: "서비스는 시스템 점검, 장애, 천재지변 등의 사유로 서비스 제공이 중단될 수 있습니다. 이 경우 사전 공지를 원칙으로 하나, 긴급한 경우 사후 공지할 수 있습니다.",
  },
  {
    title: "제7조 (약관 변경)",
    content: "서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 안내합니다. 변경 후 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.",
  },
];

const PRIVACY = [
  {
    title: "수집하는 개인정보",
    content: "• 카카오 계정 정보: 닉네임, 이메일, 프로필 사진\n• 처방전 이미지 및 OCR 인식 결과\n• 복약 스케줄 및 체크 기록\n• 서비스 이용 기록",
  },
  {
    title: "개인정보 이용 목적",
    content: "• 복약 스케줄 관리 서비스 제공\n• AI 챗봇 맞춤 상담 (복약 중인 약물 기반)\n• 보호자 공유 기능 제공\n• 서비스 개선 및 통계 분석",
  },
  {
    title: "개인정보 제3자 제공",
    content: "서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 경우는 예외로 합니다.",
  },
  {
    title: "개인정보 보호 조치",
    content: "• 처방전 이미지: AWS S3 암호화 저장\n• 통신 구간: HTTPS 적용 예정\n• 접근 권한: JWT 토큰 기반 인증",
  },
  {
    title: "이용자 권리",
    content: "이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 회원 탈퇴 시 모든 개인정보는 즉시 삭제됩니다.",
  },
];

export default function TermsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  const items = tab === "terms" ? TERMS : PRIVACY;

return (
    // ✅ 바탕 화면 다크 모드
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3 hover:text-white transition-colors">‹ 뒤로</button>
        <h1 className="text-xl font-bold">약관 및 정책</h1>
      </div>

      {/* 탭 */}
      {/* ✅ 탭 메뉴 배경 및 테두리 다크 모드 */}
      <div className="flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        {[
          { key: "terms", label: "이용약관" },
          { key: "privacy", label: "개인정보처리방침" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as "terms" | "privacy")}
            // ✅ 선택된 탭 / 선택되지 않은 탭 다크 모드 글자색 적용
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === key 
                ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400" 
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-10">
        <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">시행일: 2025년 7월 1일</p>
        {items.map((item, i) => (
          // ✅ 개별 약관 박스 및 글자 다크 모드
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 transition-colors">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">{item.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">{item.content}</p>
          </div>
        ))}
        
        {/* ✅ 문의사항 박스 다크 모드 */}
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 text-xs text-violet-600 dark:text-violet-400 text-center transition-colors">
          <p className="font-semibold">문의사항</p>
          <p className="mt-1 text-violet-400 dark:text-violet-500">서비스 이용 관련 문의는 AI 상담을 이용해주세요</p>
        </div>
      </div>
    </main>
  );
}
