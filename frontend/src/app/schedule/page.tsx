"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSchedule, useCheckSchedule, useDeleteSchedule, useStats } from "@/hooks/useSchedule";

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

export default function SchedulePage() {
  const router = useRouter();
  const [date] = useState(today);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), today());
  const { mutate: check } = useCheckSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();
  const checked = schedules.filter((s) => s.checked).length;

  const handleDelete = (id: string) => {
    if (confirm("이 복약 일정을 삭제할까요?")) deleteSchedule(id);
  };

  const handleDeleteAll = () => {
    if (confirm(`오늘 복약 일정 ${schedules.length}개를 모두 삭제할까요?`)) {
      schedules.forEach((s) => deleteSchedule(s.id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 px-4 pt-12 pb-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">오늘의 복약</h1>
          <div className="flex gap-2">
            {schedules.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">
                전체 삭제
              </button>
            )}
            <a href="/upload" className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">
              + 처방전
            </a>
            <button
              onClick={handleLogout}
              className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">
              로그아웃
            </button>
          </div>
        </div>
        <div className="bg-white/15 rounded-2xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-100">진행률</span>
            <span className="font-bold">
              {schedules.length ? Math.round((checked / schedules.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-white/30 rounded-full">
            <div className="h-2 bg-white rounded-full transition-all"
              style={{ width: schedules.length ? `${(checked / schedules.length) * 100}%` : "0%" }} />
          </div>
          <p className="text-xs text-emerald-100 mt-2">{checked} / {schedules.length} 완료</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "이번 달", value: `${Math.round(stats.compliance_rate * 100)}%`, color: "text-emerald-600" },
              { label: "연속", value: `${stats.streak_days}일`, color: "text-amber-500" },
              { label: "총 완료", value: `${stats.total_checked}회`, color: "text-gray-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {isLoading && <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>}
          {!isLoading && schedules.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-2xl mb-2">💊</p>
              <p className="text-gray-500 text-sm">오늘 복약 일정이 없어요</p>
              <a href="/upload" className="inline-block mt-3 bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl">
                처방전 등록하기
              </a>
            </div>
          )}
          {schedules.map((item) => (
            <div key={item.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${item.checked ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button
                  onClick={() => check({ scheduleId: item.id, checked: !item.checked })}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${item.checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 hover:border-emerald-400"}`}>
                  {item.checked && <span className="text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {item.drug_name}
                  </p>
                  {item.dosage && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      1회 {item.dosage} 복용
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-xs text-gray-400">{item.scheduled_time.slice(0, 5)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${item.checked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-600"}`}>
                    {item.checked ? "완료" : "예정"}
                  </span>
                </div>
                <button onClick={() => handleDelete(item.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors pl-1 text-lg flex-shrink-0">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center pb-6">
          ※ 본 스케줄은 참고용입니다. 변경 시 의사·약사와 상담하세요.
        </p>
      </div>
    </main>
  );
}
