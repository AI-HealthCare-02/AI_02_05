"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { subscribePush, unsubscribePush, isPushSubscribed } from "@/lib/push";

export default function SettingsPage() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [user, setUser] = useState<{ nickname?: string; profile_img_url?: string }>({});

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch {}
    setPushEnabled(isPushSubscribed());
  }, []);

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) { await unsubscribePush(); setPushEnabled(false); }
      else { const ok = await subscribePush(); setPushEnabled(ok); if (!ok) alert("알림 권한을 허용해주세요."); }
    } finally { setPushLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-8 text-white">
        <h1 className="text-xl font-bold mb-4">설정</h1>
        {/* 프로필 */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
            {user.profile_img_url
              ? <Image src={user.profile_img_url} alt="프로필" width={56} height={56} className="object-cover" />
              : <span className="text-2xl">👤</span>
            }
          </div>
          <div>
            <p className="font-bold text-lg">{user.nickname || "사용자"}</p>
            <p className="text-violet-200 text-xs">카카오 계정 연동</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-3 space-y-3">
        {/* 알림 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">알림</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">복약 알림</p>
                <p className="text-xs text-gray-400">복약 시간에 알림을 보내드려요</p>
              </div>
            </div>
            <button onClick={handlePushToggle} disabled={pushLoading}
              className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? "bg-violet-500" : "bg-gray-200"} ${pushLoading ? "opacity-50" : ""}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* 서비스 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">서비스</p>
          </div>
          <button onClick={() => router.push("/upload")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">처방전 등록</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">앱 정보</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">ℹ️</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">버전</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">1.0.0</span>
          </div>
          <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-lg">📄</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">이용약관</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>
        </div>

        {/* 면책 고지 */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          <p className="font-semibold mb-1">⚠️ 서비스 안내</p>
          <p className="leading-relaxed">본 서비스는 의료 행위를 대체하지 않습니다. 복약 관련 중요한 결정은 반드시 의사·약사와 상담하세요.</p>
        </div>

        {/* 로그아웃 */}
        <button onClick={handleLogout}
          className="w-full bg-white rounded-2xl py-4 text-sm font-semibold text-red-400 shadow-sm hover:bg-red-50 transition-colors">
          로그아웃
        </button>
      </div>
    </main>
  );
}
