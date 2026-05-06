"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  compliance_rate: number;
  total_scheduled: number;
  total_checked: number;
  streak_days: number;
  stats_json: Record<string, unknown> | null;
  summary: string;
  detail: string;
  recommendations: string | null;
  created_at: string | null;
}

interface DoctorViewData {
  patient: { nickname: string; profile_img_url: string | null };
  doctor_name: string;
  hospital_name: string | null;
  reports: Report[];
}

export default function DoctorViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DoctorViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/report/doctor/${token}/view`)
      .then((r) => {
        if (r.status === 404) throw new Error("유효하지 않은 공유 링크입니다.");
        if (r.status === 410) throw new Error("만료된 공유 링크입니다.");
        if (!r.ok) throw new Error("오류가 발생했어요.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🔗</div>
      <p className="text-gray-700 dark:text-gray-200 font-semibold mb-2">{error}</p>
      <p className="text-gray-400 dark:text-gray-500 text-sm">링크가 만료되었거나 올바르지 않아요.</p>
    </div>
  );

  if (!data) return null;

  const { patient, doctor_name, hospital_name, reports } = data;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors">
      {/* 헤더 */}
      <div className="bg-slate-800 dark:bg-black px-5 pt-12 pb-8 text-white rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">환자 복약 리포트</h1>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">의료진 전용</span>
        </div>
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg overflow-hidden">
              {patient.profile_img_url
                ? <img src={patient.profile_img_url} alt="" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                : "👤"}
            </div>
            <div>
              <p className="text-lg font-bold">{patient.nickname}님</p>
              <p className="text-xs text-slate-300">{doctor_name} · {hospital_name ?? ""}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
        {reports.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm">
            <p className="text-3xl mb-3">📊</p>
            <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">생성된 리포트가 없어요</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">환자가 리포트를 생성하면 여기에 표시됩니다</p>
          </div>
        )}

        {reports.map((report) => (
          <button key={report.id} onClick={() => setSelectedReport(report)}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-medium">
                {report.report_type === "weekly" ? "주간" : "월간"} 리포트
              </span>
              <span className="text-xs text-gray-400">{report.period_start} ~ {report.period_end}</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{Math.round(report.compliance_rate * 100)}%</p>
                <p className="text-xs text-gray-400">복약 순응도</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{report.total_checked}/{report.total_scheduled}</p>
                <p className="text-xs text-gray-400">복용 완료</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{report.streak_days}일</p>
                <p className="text-xs text-gray-400">연속</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">{report.summary}</p>
          </button>
        ))}
      </div>

      {/* 리포트 상세 모달 */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto transition-colors" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {selectedReport.report_type === "weekly" ? "주간" : "월간"} 리포트
              </h3>
              <span className="text-xs text-gray-400">{selectedReport.period_start} ~ {selectedReport.period_end}</span>
            </div>

            {/* 요약 */}
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-1">✨ 환자용 요약</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{selectedReport.summary}</p>
            </div>

            {/* 상세 분석 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">📊 상세 분석</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {typeof selectedReport.detail === "string" ? selectedReport.detail : JSON.stringify(selectedReport.detail, null, 2)}
              </p>
            </div>

            {/* 권고사항 */}
            {selectedReport.recommendations && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">💡 권고사항</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {typeof selectedReport.recommendations === "string" ? selectedReport.recommendations : JSON.stringify(selectedReport.recommendations, null, 2)}
                </p>
              </div>
            )}

            <button onClick={() => setSelectedReport(null)}
              className="w-full mt-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
