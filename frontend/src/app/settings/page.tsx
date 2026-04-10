"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { subscribePush, unsubscribePush, isPushSubscribed } from "@/lib/push";
import { useTheme } from "next-themes";

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

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // ✅ 접근성 상태: 색약 모드 & 시니어 모드
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);

  useEffect(() => {
    setMounted(true); 
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch {}
    setPushEnabled(isPushSubscribed());
    setFontSize((localStorage.getItem("font_size") ?? "medium") as "small" | "medium" | "large");
    
    // ✅ 초기 로딩 시 두 가지 접근성 모드 불러오기
    const checkAccessibility = () => {
      const isColorBlind = localStorage.getItem("color_blind_mode") === "true";
      setColorBlindMode(isColorBlind);
      if (isColorBlind) document.body.classList.add("color-blind");
      else document.body.classList.remove("color-blind");

      const isSenior = localStorage.getItem("senior_mode") === "true";
      setSeniorMode(isSenior);
      if (isSenior) document.body.classList.add("senior-mode");
      else document.body.classList.remove("senior-mode");
    };
    checkAccessibility();
    window.addEventListener('focus', checkAccessibility);

    loadShares();
    return () => window.removeEventListener('focus', checkAccessibility);
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

  // ✅ 색약 모드 토글 함수
  const handleColorBlindToggle = () => {
    const newValue = !colorBlindMode;
    setColorBlindMode(newValue);
    localStorage.setItem("color_blind_mode", String(newValue));
    if (newValue) document.body.classList.add("color-blind");
    else document.body.classList.remove("color-blind");
  };

  // ✅ 시니어 모드 토글 함수
  const handleSeniorToggle = () => {
    const newValue = !seniorMode;
    setSeniorMode(newValue);
    localStorage.setItem("senior_mode", String(newValue));
    if (newValue) document.body.classList.add("senior-mode");
    else document.body.classList.remove("senior-mode");
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

  if (!mounted) return null;

  // ✅ 로그아웃 버튼 색약 적용
  const logoutTextColor = colorBlindMode ? "text-orange-500 dark:text-orange-400" : "text-red-400 dark:text-red-400";
  const logoutHoverBg = colorBlindMode ? "hover:bg-orange-50 dark:hover:bg-orange-900/20" : "hover:bg-red-50 dark:hover:bg-red-900/20";

  // ✅ 시니어(고대비) 모드 적용 변수
  const headerClass = seniorMode ? "text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide" : "text-xs font-semibold text-gray-400 uppercase tracking-wide";
  const titleClass = seniorMode ? "text-sm font-extrabold text-gray-900 dark:text-white" : "text-sm font-semibold text-gray-800 dark:text-gray-200";
  const descClass = seniorMode ? "text-xs font-bold text-gray-700 dark:text-gray-300" : "text-xs text-gray-400";

  return (
    <main className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200 ${seniorMode ? "senior-mode" : ""}`}>
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-8 text-white">
        <h1 className="text-xl font-bold mb-4">설정</h1>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>보호자 공유</p>
          </div>
          <div className="p-4 space-y-3">
            <p className={descClass}>링크를 공유하면 보호자가 복약 현황을 확인할 수 있어요</p>
            {shares.filter((s) => !s.expired).map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2.5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${seniorMode ? "font-extrabold text-violet-900 dark:text-violet-100" : "font-semibold text-violet-700 dark:text-violet-300"}`}>{s.label}</p>
                  <p className="text-xs text-violet-400 truncate">/share/{s.token.slice(0, 16)}...</p>
                </div>
                <button onClick={() => copyLink(s.token)}
                  className="text-xs bg-violet-600 text-white px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0 hover:bg-violet-700 transition-colors">
                  복사
                </button>
                <button onClick={() => deleteShare(s.id)}
                  className="text-gray-300 hover:text-red-400 dark:text-gray-500 dark:hover:text-red-400 transition-colors text-lg flex-shrink-0">×</button>
              </div>
            ))}
            <button onClick={createShare} disabled={shareLoading}
              className={`w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-200 dark:border-violet-700/50 rounded-xl py-3 text-sm ${seniorMode ? "font-bold text-violet-700 dark:text-violet-300" : "font-medium text-violet-500 dark:text-violet-400"} hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-50`}>
              {shareLoading ? "생성 중..." : "+ 공유 링크 만들기"}
            </button>
          </div>
        </div>

        {/* 화면 테마 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>화면 테마</p>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "light", label: "밝게", icon: "☀️" },
                { key: "dark", label: "어둡게", icon: "🌙" },
                { key: "system", label: "자동", icon: "⚙️" },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => setTheme(key)}
                  className={`py-3 rounded-xl transition-all border-2 text-sm ${seniorMode ? "font-extrabold" : "font-semibold"} ${
                    theme === key
                      ? "border-violet-600 bg-violet-50 text-violet-600 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-300"
                      : `border-gray-100 bg-gray-50 hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900 ${seniorMode ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`
                  }`}>
                  <span className="block mb-1 text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ 접근성 영역 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>접근성</p>
          </div>
          
          {/* 1. 시니어 모드 스위치 */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">🔠</span>
              </div>
              <div>
                <p className={titleClass}>고대비 (시니어) 모드</p>
                <p className={descClass}>글씨를 더 진하고 굵게 표시합니다</p>
              </div>
            </div>
            <button onClick={handleSeniorToggle}
              className={`w-12 h-6 rounded-full transition-all relative ${seniorMode ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${seniorMode ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {/* 2. 적록색약 모드 스위치 */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">👁️</span>
              </div>
              <div>
                <p className={titleClass}>적록색약 모드</p>
                <p className={descClass}>초록색과 빨간색 구분을 명확하게 변경합니다</p>
              </div>
            </div>
            <button onClick={handleColorBlindToggle}
              className={`w-12 h-6 rounded-full transition-all relative ${colorBlindMode ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${colorBlindMode ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* 글씨 크기 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>글씨 크기</p>
          </div>
          <div className="px-4 py-4">
            {/* ✅ 팀원이 변경한 텍스트 반영 */}
            <p className={`${descClass} mb-3`}>어르신이나 시력이 좋지 않으신 분들을 위한 설정이에요</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "small", label: "작게", size: "text-xs" },
                { key: "medium", label: "보통", size: "text-sm" },
                { key: "large", label: "크게", size: "text-base" },
              ] as const).map(({ key, label, size }) => (
                <button key={key} onClick={() => handleFontSize(key)}
                  className={`py-3 rounded-xl transition-all border-2 ${seniorMode ? "font-extrabold" : "font-semibold"} ${
                    fontSize === key
                      ? "border-violet-600 bg-violet-50 text-violet-600 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-300"
                      : `border-gray-100 bg-gray-50 hover:border-violet-300 dark:border-gray-700 dark:bg-gray-900 ${seniorMode ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`
                  } ${size}`}>
                  {label}
                  <span className="block text-xs mt-0.5 font-normal opacity-60">가나다</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 알림 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>알림</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">🔔</span>
              </div>
              <div>
                <p className={titleClass}>복약 알림</p>
                <p className={descClass}>복약 시간에 알림을 보내드려요</p>
              </div>
            </div>
            <button onClick={handlePushToggle} disabled={pushLoading}
              className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"} ${pushLoading ? "opacity-50" : ""}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* 서비스 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>서비스</p>
          </div>
          <button onClick={() => router.push("/prescriptions")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">📋</span>
              </div>
              <span className={titleClass}>처방전 등록</span>
            </div>
            <span className="text-gray-300 dark:text-gray-500 text-sm">›</span>
          </button>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className={headerClass}>앱 정보</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">ℹ️</span>
              </div>
              <span className={titleClass}>버전</span>
            </div>
            <span className={`text-xs ${seniorMode ? "text-gray-600 dark:text-gray-300 font-bold" : "text-gray-400"} bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full`}>1.0.0</span>
          </div>
          <button onClick={() => router.push("/terms")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-lg">📄</span>
              </div>
              <span className={titleClass}>이용약관</span>
            </div>
            <span className="text-gray-300 dark:text-gray-500 text-sm">›</span>
          </button>
        </div>

        {/* 면책 고지 */}
        <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 text-xs transition-colors ${seniorMode ? "text-amber-900 font-bold dark:text-amber-300" : "text-amber-700 dark:text-amber-400"}`}>
          <p className="font-semibold mb-1">⚠️ 서비스 안내</p>
          <p className="leading-relaxed">본 서비스는 의료 행위를 대체하지 않습니다. 복약 관련 중요한 결정은 반드시 의사·약사와 상담하세요.</p>
        </div>

        {/* ✅ 로그아웃 버튼 */}
        <button onClick={handleLogout}
          className={`w-full bg-white dark:bg-gray-800 rounded-2xl py-4 text-sm ${seniorMode ? "font-extrabold" : "font-semibold"} ${logoutTextColor} shadow-sm ${logoutHoverBg} transition-colors`}>
          로그아웃
        </button>
      </div>
    </main>
  );
}