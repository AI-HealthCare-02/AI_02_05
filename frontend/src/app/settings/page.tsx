"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { subscribePush, unsubscribePush, isPushSubscribed } from "@/lib/push";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ShareToken {
  id: string; token: string; label: string;
  expires_at: string | null; expired: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [user, setUser] = useState<{ nickname?: string; profile_img_url?: string }>({});
  const [shares, setShares] = useState<ShareToken[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch {}
    setPushEnabled(isPushSubscribed());
    setFontSize((localStorage.getItem("font_size") ?? "medium") as "small" | "medium" | "large");
    loadShares();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const loadShares = async () => {
    try {
      const res = await fetch(`${API_URL}/api/share/list`, { headers: authHeaders() });
      if (res.ok) setShares(await res.json());
    } catch {}
  };

  const createShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/share/`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ label: "보호자 공유", expires_days: 30 }),
      });
      if (res.ok) await loadShares();
    } finally { setShareLoading(false); }
  };

  const deleteShare = async (id: string) => {
    await fetch(`${API_URL}/api/share/${id}`, { method: "DELETE", headers: authHeaders() });
    setShares((prev) => prev.filter((s) => s.id !== id));
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    try {
      navigator.clipboard.writeText(url);
      alert("링크가 복사됐어요! 보호자에게 공유하세요.");
    } catch {
      // HTTP 환경 fallback
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      alert("링크가 복사됐어요! 보호자에게 공유하세요.");
    }
  };

  const handleFontSize = (size: "small" | "medium" | "large") => {
    setFontSize(size);
    localStorage.setItem("font_size", size);
    const sizeMap = { small: "14px", medium: "16px", large: "19px" };
    document.documentElement.style.fontSize = sizeMap[size];
  };

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
              ? <img src={user.profile_img_url} alt="프로필" className="w-14 h-14 object-cover" referrerPolicy="no-referrer" />
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
        {/* 보호자 공유 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">보호자 공유</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">링크를 공유하면 보호자가 복약 현황을 확인할 수 있어요</p>
            {shares.filter((s) => !s.expired).map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-violet-700">{s.label}</p>
                  <p className="text-xs text-violet-400 truncate">/share/{s.token.slice(0, 16)}...</p>
                </div>
                <button onClick={() => copyLink(s.token)}
                  className="text-xs bg-violet-600 text-white px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0">
                  복사
                </button>
                <button onClick={() => deleteShare(s.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg flex-shrink-0">×</button>
              </div>
            ))}
            <button onClick={createShare} disabled={shareLoading}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-200 rounded-xl py-3 text-sm text-violet-500 font-medium hover:border-violet-400 hover:bg-violet-50 transition-all disabled:opacity-50">
              {shareLoading ? "생성 중..." : "+ 공유 링크 만들기"}
            </button>
          </div>
        </div>

        {/* 글씨 크기 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">글씨 크기</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs text-gray-400 mb-3">어르신이나 시력이 좋지 않으신 분들을 위한 설정이에요</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "small", label: "작게", size: "text-xs" },
                { key: "medium", label: "보통", size: "text-sm" },
                { key: "large", label: "크게", size: "text-base" },
              ] as const).map(({ key, label, size }) => (
                <button key={key} onClick={() => handleFontSize(key)}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                    fontSize === key
                      ? "border-violet-600 bg-violet-50 text-violet-600"
                      : "border-gray-100 bg-gray-50 text-gray-500 hover:border-violet-300"
                  } ${size}`}>
                  {label}
                  <span className="block text-xs mt-0.5 font-normal opacity-60">가나다</span>
                </button>
              ))}
            </div>
          </div>
        </div>

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
          <button onClick={() => router.push("/prescriptions")}
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
          <button onClick={() => router.push("/terms")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
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
