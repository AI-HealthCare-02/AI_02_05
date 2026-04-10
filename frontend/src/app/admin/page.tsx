"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_PASSWORD = "pillmate2025";

interface Stats {
  users: { total: number; new_today: number; new_this_week: number };
  prescriptions: { total: number; today: number };
  checks: { total: number; today: number; this_week: number };
  active_schedules: number;
  daily_checks: { date: string; count: number }[];
}

interface AdminUser {
  id: string;
  nickname: string;
  profile_img_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<"stats" | "users">("stats");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_authed") === "true") {
      setAuthed(true);
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`);
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      setError("데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`);
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      setError("유저 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (t: "stats" | "users") => {
    setTab(t);
    if (t === "users") fetchUsers();
    else fetchStats();
  };

  const handleBlock = async (userId: string, isActive: boolean) => {
    if (!confirm(isActive ? "이 유저를 차단할까요?" : "이 유저의 차단을 해제할까요?")) return;
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/block`, { method: "PATCH" });
    if (res.ok) fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("이 유저를 영구 삭제할까요? 되돌릴 수 없어요.")) return;
    const res = await fetch(`${API_URL}/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authed", "true");
      setAuthed(true);
      fetchStats();
    } else {
      setError("비밀번호가 틀렸어요.");
    }
  };

  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 w-full max-w-sm space-y-4">
          <div className="text-center">
            <p className="text-2xl mb-2">🔐</p>
            <h1 className="text-lg font-bold text-gray-800">운영자 로그인</h1>
            <p className="text-xs text-gray-400 mt-1">PillMate 관리자 전용</p>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="비밀번호 입력"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400" />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button onClick={handleLogin}
            className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors">
            입장
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">운영 대시보드</h1>
            <p className="text-violet-200 text-xs mt-0.5">PillMate 서비스 현황</p>
          </div>
          <button onClick={() => { sessionStorage.removeItem("admin_authed"); router.push("/"); }}
            className="text-xs text-violet-300 hover:text-white">로그아웃</button>
        </div>
        {/* 탭 */}
        <div className="flex gap-2 mt-4">
          {(["stats", "users"] as const).map((t) => (
            <button key={t} onClick={() => handleTabChange(t)}
              className={`text-xs px-4 py-1.5 rounded-full font-semibold transition-all ${
                tab === t ? "bg-white text-violet-600" : "bg-white/20 text-white"
              }`}>
              {t === "stats" ? "📊 통계" : "👥 유저 관리"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        )}

        {/* 통계 탭 */}
        {tab === "stats" && stats && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">👥 유저</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "열 유저", value: stats.users.total, color: "text-violet-600" },
                  { label: "오늘 신규", value: stats.users.new_today, color: "text-emerald-600" },
                  { label: "이번 주", value: stats.users.new_this_week, color: "text-amber-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">📋 처방전</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "열 처방전", value: stats.prescriptions.total, color: "text-violet-600" },
                  { label: "오늘 등록", value: stats.prescriptions.today, color: "text-emerald-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">✅ 복약 체크</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "열 체크", value: stats.checks.total, color: "text-violet-600" },
                  { label: "오늘", value: stats.checks.today, color: "text-emerald-600" },
                  { label: "이번 주", value: stats.checks.this_week, color: "text-amber-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">💊 현재 활성 스케줄</p>
                <p className="text-xs text-gray-400 mt-0.5">오늘 복약 중인 스케줄 수</p>
              </div>
              <p className="text-3xl font-bold text-violet-600">{stats.active_schedules}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-4">📊 최근 7일 복약 체크</p>
              {stats.daily_checks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">데이터가 없어요</p>
              ) : (
                <div className="flex items-end gap-1.5 h-24">
                  {(() => {
                    const max = Math.max(...stats.daily_checks.map(d => d.count), 1);
                    return stats.daily_checks.map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[9px] text-gray-400">{d.count}</p>
                        <div className="w-full bg-violet-200 rounded-t-sm transition-all"
                          style={{ height: `${(d.count / max) * 64}px` }} />
                        <p className="text-[9px] text-gray-400">
                          {new Date(d.date).getMonth() + 1}/{new Date(d.date).getDate()}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
            <div className="bg-violet-50 rounded-2xl p-4 text-center">
              <p className="text-xs font-bold text-violet-700 mb-1">📈 상세 API 모니터링</p>
              <p className="text-xs text-violet-400 mb-3">Grafana 대시보드에서 API 응답시간, 에러율 등을 확인하세요</p>
              <a href={`http://${typeof window !== "undefined" ? window.location.hostname : ""}:3001`} target="_blank" rel="noreferrer"
                className="inline-block bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors">
                Grafana 열기 →
              </a>
            </div>
            <button onClick={fetchStats}
              className="w-full text-xs text-gray-400 py-2 hover:text-violet-600 transition-colors">
              🔄 새로고침
            </button>
          </>
        )}

        {/* 유저 관리 탭 */}
        {tab === "users" && !loading && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 px-1">전체 {users.length}명</p>
            {users.map((u) => (
              <div key={u.id} className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${
                !u.is_active ? "opacity-50" : ""
              }`}>
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {u.profile_img_url
                    ? <img src={u.profile_img_url} alt="" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-lg">👤</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-800">{u.nickname}</p>
                    {!u.is_active && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">차단</span>}
                  </div>
                  <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString("ko-KR")} 가입</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleBlock(u.id, u.is_active)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                      u.is_active
                        ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                        : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                    }`}>
                    {u.is_active ? "차단" : "해제"}
                  </button>
                  <button onClick={() => handleDelete(u.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-red-100 text-red-500 hover:bg-red-200 transition-all">
                    삭제
                  </button>
                </div>
              </div>
            ))}
            <button onClick={fetchUsers}
              className="w-full text-xs text-gray-400 py-2 hover:text-violet-600 transition-colors">
              🔄 새로고침
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

interface Stats {
  users: { total: number; new_today: number; new_this_week: number };
  prescriptions: { total: number; today: number };
  checks: { total: number; today: number; this_week: number };
  active_schedules: number;
  daily_checks: { date: string; count: number }[];
}
