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

  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<string>("system");
  const [isColorBlind, setIsColorBlind] = useState(false);
  const [isSenior, setIsSenior] = useState(false);

  useEffect(() => {
    setMounted(true);
    try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch {}
    setPushEnabled(isPushSubscribed());
    setFontSize((localStorage.getItem("font_size") ?? "medium") as "small" | "medium" | "large");
    setThemeState(localStorage.getItem("theme") || "system");
    setIsColorBlind(localStorage.getItem("color_blind_mode") === "true");
    setIsSenior(localStorage.getItem("senior_mode") === "true");
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

  const handleThemeChange = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    }
  };

  const toggleColorBlind = () => {
    const next = !isColorBlind;
    setIsColorBlind(next);
    localStorage.setItem("color_blind_mode", String(next));
    document.body.classList.toggle("color-blind", next);
  };

  const toggleSenior = () => {
    const next = !isSenior;
    setIsSenior(next);
    localStorage.setItem("senior_mode", String(next));
    document.body.classList.toggle("senior-mode", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const handleWithdraw = async () => {
    if (!confirm("정말 탈퇴할까요?\n모든 복약 데이터가 삭제되며 되돌릴 수 없어요.")) return;
    try {
      await fetch(`/api/auth/withdraw`, { method: "DELETE", headers: authHeaders() });
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900 transition-colors">
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
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">보호자 공유</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400">링크를 공유하면 보호자가 복약 현황을 확인할 수 있어요</p>
            {shares.filter((s) => !s.expired).map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/30 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{s.label}</p>
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
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-200 dark:border-violet-700 rounded-xl py-3 text-sm text-violet-500 font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-50">
              {shareLoading ? "생성 중..." : "+ 공유 링크 만들기"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">화면 테마</p>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "light", label: "밝게", icon: "☀️" },
                { key: "dark", label: "어둡게", icon: "🌙" },
                { key: "system", label: "자동", icon: "⚙️" },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => handleThemeChange(key)}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 text-sm ${
                    theme === key
                      ? "border-violet-600 bg-violet-50 text-violet-600 dark:border-violet-500 dark:bg-violet-900/30 dark:text-violet-400"
                      : "border-gray-100 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 hover:border-violet-300"
                  }`}>
                  <span className="block mb-1 text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
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
                      ? "border-violet-600 bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                      : "border-gray-100 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 hover:border-violet-300"
                  } ${size}`}>
                  {label}
                  <span className="block text-xs mt-0.5 font-normal opacity-60">가나다</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">화면 접근성</p>
          </div>
          <div className="px-4 py-2 space-y-1">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-lg">👁️</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">색약 모드</p>
                  <p className="text-xs text-gray-400">적록색맹을 위한 색상 보정</p>
                </div>
              </div>
              <button onClick={toggleColorBlind}
                className={`w-12 h-6 rounded-full transition-all relative ${isColorBlind ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isColorBlind ? "left-6" : "left-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-lg">👴</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">고대비(시니어) 모드</p>
                  <p className="text-xs text-gray-400">글씨와 버튼을 더 굵고 뚜렷하게</p>
                </div>
              </div>
              <button onClick={toggleSenior}
                className={`w-12 h-6 rounded-full transition-all relative ${isSenior ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isSenior ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">알림</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center text-lg">🔔</div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">복약 알림</p>
                <p className="text-xs text-gray-400">복약 시간에 알림을 보내드려요</p>
              </div>
            </div>
            <button onClick={handlePushToggle} disabled={pushLoading}
              className={`w-12 h-6 rounded-full transition-all relative ${pushEnabled ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"} ${pushLoading ? "opacity-50" : ""}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">서비스</p>
          </div>
          <button onClick={() => router.push("/upload")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-lg">📋</div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">처방전 등록</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800 transition-colors">
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">앱 정보</p>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg">ℹ️</div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">버전</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">1.0.0</span>
          </div>
          <button onClick={() => router.push("/terms")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg">📄</div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">이용약관</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold mb-1">⚠️ 서비스 안내</p>
          <p className="leading-relaxed">본 서비스는 의료 행위를 대체하지 않습니다. 복약 관련 중요한 결정은 반드시 의사·약사와 상담하세요.</p>
        </div>

        <button onClick={handleLogout}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl py-4 text-sm font-semibold text-red-400 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          로그아웃
        </button>

        <button onClick={handleWithdraw}
          className="w-full py-3 text-xs text-gray-300 dark:text-gray-500 hover:text-red-400 transition-colors">
          회원탈퇴
        </button>
      </div>
    </main>
  );
}