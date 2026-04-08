"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ReportSummary {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  compliance_rate: number;
  total_scheduled: number;
  total_checked: number;
  streak_days: number;
  summary: string;
  created_at: string | null;
}

interface ReportDetail extends ReportSummary {
  detail: string;
  recommendations: string | null;
  stats_json: {
    drug_stats?: Record<string, { expected: number; checked: number; rate: number; disease?: string }>;
    time_stats?: Record<string, { checked: number; total: number; rate: number }>;
    weekday_stats?: Record<string, { total: number; missed: number; miss_rate: number }>;
    consecutive_misses?: { drug: string; start: string; end: string; days: number }[];
  } | null;
}

interface DoctorShare {
  id: string;
  token: string;
  doctor_name: string;
  hospital_name: string | null;
  expires_at: string | null;
  expired: boolean;
}

export default function ReportPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reports" | "share">("reports");

  // 의사 공유
  const [doctorShares, setDoctorShares] = useState<DoctorShare[]>([]);
  const [shareForm, setShareForm] = useState({ doctor_name: "", hospital_name: "", expires_days: 7 });
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const authHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/report/list`, { headers: authHeaders() });
      if (res.ok) setReports(await res.json());
    } catch {} finally { setLoading(false); }
  }, [authHeaders]);

  const loadDoctorShares = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/report/doctor-share/list`, { headers: authHeaders() });
      if (res.ok) setDoctorShares(await res.json());
    } catch {}
  }, [authHeaders]);

  useEffect(() => { loadReports(); loadDoctorShares(); }, [loadReports, loadDoctorShares]);

  const generateReport = async (type: string) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/report/generate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ report_type: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data);
        await loadReports();
      }
    } finally { setGenerating(false); }
  };

  const viewReport = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/report/${id}`, { headers: authHeaders() });
      if (res.ok) setSelectedReport(await res.json());
    } catch {}
  };

  const deleteReport = async (id: string) => {
    if (!confirm("리포트를 삭제하시겠습니까?")) return;
    await fetch(`${API_URL}/api/report/${id}`, { method: "DELETE", headers: authHeaders() });
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
  };

  const createDoctorShare = async () => {
    if (!shareForm.doctor_name.trim()) return alert("의사 이름을 입력해주세요.");
    setShareLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/report/doctor-share`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(shareForm),
      });
      if (res.ok) {
        await loadDoctorShares();
        setShowShareForm(false);
        setShareForm({ doctor_name: "", hospital_name: "", expires_days: 7 });
      }
    } finally { setShareLoading(false); }
  };

  const deleteDoctorShare = async (id: string) => {
    await fetch(`${API_URL}/api/report/doctor-share/${id}`, { method: "DELETE", headers: authHeaders() });
    setDoctorShares((prev) => prev.filter((s) => s.id !== id));
  };

  const copyDoctorLink = (token: string) => {
    const url = `${window.location.origin}/doctor-view/${token}`;
    try {
      navigator.clipboard.writeText(url);
      alert("의사 공유 링크가 복사됐어요!");
    } catch {
      const el = document.createElement("textarea");
      el.value = url; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      alert("의사 공유 링크가 복사됐어요!");
    }
  };

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

  // ──────────── 리포트 상세 뷰 ────────────
  if (selectedReport) {
    const r = selectedReport;
    const stats = r.stats_json;
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 px-5 pt-12 pb-6 text-white">
          <button onClick={() => setSelectedReport(null)} className="text-white/70 text-sm mb-3 flex items-center gap-1">
            <span>←</span> 리포트 목록
          </button>
          <h1 className="text-xl font-bold mb-1">복약 패턴 리포트</h1>
          <p className="text-teal-200 text-sm">
            {fmtDate(r.period_start)} ~ {fmtDate(r.period_end)} · {r.report_type === "monthly" ? "월간" : "주간"}
          </p>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-3 space-y-3">
          {/* 핵심 지표 카드 */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-600">{fmtPct(r.compliance_rate)}</p>
                <p className="text-xs text-gray-400 mt-1">복약률</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{r.streak_days}<span className="text-sm">일</span></p>
                <p className="text-xs text-gray-400 mt-1">연속 복약</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">{r.total_checked}<span className="text-sm">/{r.total_scheduled}</span></p>
                <p className="text-xs text-gray-400 mt-1">복용 횟수</p>
              </div>
            </div>
          </div>

          {/* AI 요약 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100">
              <p className="text-xs font-semibold text-teal-700">🤖 AI 분석 요약</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.summary}</p>
            </div>
          </div>

          {/* 약물별 현황 */}
          {stats?.drug_stats && Object.keys(stats.drug_stats).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">💊 약물별 복약 현황</p>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(stats.drug_stats).map(([name, stat]) => (
                  <div key={name} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{name}</p>
                        {stat.disease && <p className="text-xs text-gray-400">{stat.disease}</p>}
                      </div>
                      <span className={`text-sm font-bold ${stat.rate >= 0.8 ? "text-teal-600" : stat.rate >= 0.5 ? "text-amber-500" : "text-red-400"}`}>
                        {fmtPct(stat.rate)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${stat.rate >= 0.8 ? "bg-teal-500" : stat.rate >= 0.5 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.round(stat.rate * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{stat.checked}/{stat.expected}회 복용</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시간대별 */}
          {stats?.time_stats && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">⏰ 시간대별 복약 패턴</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {Object.entries(stats.time_stats).map(([slot, st]) => {
                  const icons: Record<string, string> = { "아침": "🌅", "점심": "☀️", "저녁": "🌆", "취침": "🌙" };
                  const icon = Object.entries(icons).find(([k]) => slot.includes(k))?.[1] || "⏰";
                  return (
                    <div key={slot} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg mb-1">{icon}</p>
                      <p className="text-xs text-gray-500 mb-1">{slot.replace(/\(.*\)/, "")}</p>
                      <p className={`text-lg font-bold ${st.rate >= 0.8 ? "text-teal-600" : st.rate >= 0.5 ? "text-amber-500" : "text-red-400"}`}>
                        {fmtPct(st.rate)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 요일별 누락 */}
          {stats?.weekday_stats && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">📅 요일별 누락 패턴</p>
              </div>
              <div className="p-4">
                <div className="flex justify-between gap-1">
                  {Object.entries(stats.weekday_stats).map(([day, ws]) => {
                    const missRate = ws.miss_rate;
                    const height = Math.max(8, Math.round(missRate * 60));
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: 68 }}>
                          <div
                            className={`w-5 rounded-t ${missRate > 0.3 ? "bg-red-400" : missRate > 0 ? "bg-amber-300" : "bg-teal-300"}`}
                            style={{ height }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{day}</p>
                        <p className="text-[10px] text-gray-400">{ws.missed}건</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 연속 누락 경고 */}
          {stats?.consecutive_misses && stats.consecutive_misses.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-600 mb-2">⚠️ 연속 누락 구간</p>
              {stats.consecutive_misses.map((m, i) => (
                <div key={i} className="text-xs text-red-500 mb-1">
                  • {m.drug}: {fmtDate(m.start)}~{fmtDate(m.end)} ({m.days}일)
                </div>
              ))}
            </div>
          )}

          {/* 의사용 상세 분석 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
              <p className="text-xs font-semibold text-blue-700">🩺 의사 전달용 상세 분석</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.detail}</p>
            </div>
          </div>

          {/* 권고사항 */}
          {r.recommendations && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-emerald-700 mb-2">💡 권고사항</p>
              <p className="text-sm text-emerald-700 leading-relaxed whitespace-pre-line">{r.recommendations}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ──────────── 메인 리스트 뷰 ────────────
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-white/70 text-sm mb-3 flex items-center gap-1">
          <span>←</span> 뒤로
        </button>
        <h1 className="text-xl font-bold mb-1">복약 리포트</h1>
        <p className="text-teal-200 text-sm">AI가 분석한 복약 패턴 리포트</p>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-3 space-y-3">
        {/* 탭 */}
        <div className="bg-white rounded-2xl shadow-sm p-1 flex gap-1">
          <button
            onClick={() => setTab("reports")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "reports" ? "bg-teal-600 text-white" : "text-gray-400"
            }`}
          >
            📊 리포트
          </button>
          <button
            onClick={() => setTab("share")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "share" ? "bg-teal-600 text-white" : "text-gray-400"
            }`}
          >
            🩺 의사 공유
          </button>
        </div>

        {tab === "reports" && (
          <>
            {/* 리포트 생성 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-3">새 리포트를 생성하면 AI가 복약 데이터를 분석해요</p>
              <div className="flex gap-2">
                <button
                  onClick={() => generateReport("weekly")}
                  disabled={generating}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {generating ? "분석 중..." : "주간 리포트"}
                </button>
                <button
                  onClick={() => generateReport("monthly")}
                  disabled={generating}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {generating ? "분석 중..." : "월간 리포트"}
                </button>
              </div>
              {generating && (
                <div className="mt-3 flex items-center justify-center gap-2 text-teal-600">
                  <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                  <span className="text-xs">AI가 복약 패턴을 분석하고 있어요...</span>
                </div>
              )}
            </div>

            {/* 리포트 목록 */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-gray-500 text-sm">아직 생성된 리포트가 없어요</p>
                <p className="text-gray-400 text-xs mt-1">위 버튼으로 첫 리포트를 만들어보세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    <button
                      onClick={() => viewReport(r.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.report_type === "monthly"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-teal-100 text-teal-700"
                          }`}>
                            {r.report_type === "monthly" ? "월간" : "주간"}
                          </span>
                          <p className="text-sm font-semibold text-gray-800 mt-1.5">
                            {fmtDate(r.period_start)} ~ {fmtDate(r.period_end)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            r.compliance_rate >= 0.8 ? "text-teal-600" : r.compliance_rate >= 0.5 ? "text-amber-500" : "text-red-400"
                          }`}>
                            {fmtPct(r.compliance_rate)}
                          </p>
                          <p className="text-[10px] text-gray-400">복약률</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{r.summary}</p>
                    </button>
                    <div className="border-t border-gray-50 px-4 py-2 flex justify-between items-center">
                      <p className="text-[10px] text-gray-300">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : ""}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "share" && (
          <>
            {/* 의사 공유 설명 */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">🩺 의사 공유 기능</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                공유 링크를 만들어 담당 의사에게 전달하면, 의사가 로그인 없이(GET 조회)
                복약 패턴 리포트를 열람할 수 있어요.
              </p>
            </div>

            {/* 공유 링크 목록 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">의사 공유 링크</p>
              </div>
              <div className="p-4 space-y-3">
                {doctorShares.filter((s) => !s.expired).map((s) => (
                  <div key={s.id} className="bg-blue-50 rounded-xl px-3 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-blue-800">{s.doctor_name}</p>
                        {s.hospital_name && <p className="text-xs text-blue-400">{s.hospital_name}</p>}
                      </div>
                      <button
                        onClick={() => deleteDoctorShare(s.id)}
                        className="text-gray-300 hover:text-red-400 text-lg"
                      >×</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-blue-400 truncate flex-1">/doctor-view/{s.token.slice(0, 12)}...</p>
                      <button
                        onClick={() => copyDoctorLink(s.token)}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                      >
                        링크 복사
                      </button>
                    </div>
                    {s.expires_at && (
                      <p className="text-[10px] text-blue-300 mt-1.5">
                        만료: {new Date(s.expires_at).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                ))}

                {/* 새 링크 만들기 */}
                {showShareForm ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">의사 이름 *</label>
                      <input
                        type="text"
                        value={shareForm.doctor_name}
                        onChange={(e) => setShareForm((f) => ({ ...f, doctor_name: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        placeholder="홍길동 선생님"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">병원명 (선택)</label>
                      <input
                        type="text"
                        value={shareForm.hospital_name}
                        onChange={(e) => setShareForm((f) => ({ ...f, hospital_name: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        placeholder="서울대학교병원"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">유효기간</label>
                      <select
                        value={shareForm.expires_days}
                        onChange={(e) => setShareForm((f) => ({ ...f, expires_days: Number(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      >
                        <option value={7}>7일</option>
                        <option value={14}>14일</option>
                        <option value={30}>30일</option>
                        <option value={90}>90일</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowShareForm(false)}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium"
                      >
                        취소
                      </button>
                      <button
                        onClick={createDoctorShare}
                        disabled={shareLoading}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        {shareLoading ? "생성 중..." : "생성"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowShareForm(true)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 rounded-xl py-3 text-sm text-blue-500 font-medium hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    + 의사 공유 링크 만들기
                  </button>
                )}
              </div>
            </div>

            {/* 만료된 링크 */}
            {doctorShares.some((s) => s.expired) && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden opacity-60">
                <div className="px-4 py-2.5 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-300">만료된 링크</p>
                </div>
                <div className="p-4 space-y-2">
                  {doctorShares.filter((s) => s.expired).map((s) => (
                    <div key={s.id} className="flex justify-between items-center text-xs text-gray-400">
                      <span>{s.doctor_name} · {s.hospital_name || "병원 미지정"}</span>
                      <button onClick={() => deleteDoctorShare(s.id)} className="hover:text-red-400">삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 면책 */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
          <p className="font-semibold mb-1">⚠️ 안내</p>
          <p className="leading-relaxed">
            AI 분석 리포트는 참고용이며 의료 판단을 대체하지 않습니다.
            복약 관련 중요한 결정은 반드시 의사·약사와 상담하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
