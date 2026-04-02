"use client";

import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "{}")
    : {};

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">설정</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-3">
        {/* 프로필 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">
              💊
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.nickname || "사용자"}</p>
              <p className="text-xs text-gray-400">카카오 계정 연동</p>
            </div>
          </div>
        </div>

        {/* 처방전 등록 */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <button
            onClick={() => router.push("/upload")}
            className="w-full flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <span className="text-sm font-medium text-gray-800">처방전 등록</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">ℹ️</span>
              <span className="text-sm font-medium text-gray-800">버전</span>
            </div>
            <span className="text-xs text-gray-400">1.0.0</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-lg">📄</span>
              <span className="text-sm font-medium text-gray-800">이용약관</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </div>
        </div>

        {/* 면책 고지 */}
        <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">⚠️ 서비스 안내</p>
          <p>본 서비스는 의료 행위를 대체하지 않습니다. 복약 관련 중요한 결정은 반드시 의사·약사와 상담하세요.</p>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl py-3.5 text-sm font-medium text-red-500 shadow-sm">
          로그아웃
        </button>
      </div>
    </main>
  );
}
