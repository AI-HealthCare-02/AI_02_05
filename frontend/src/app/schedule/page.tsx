"use client";

import { useState } from "react";
import { useSchedule, useCheckSchedule, useStats } from "@/hooks/useSchedule";

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

export default function SchedulePage() {
  const [date] = useState(today);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), today());
  const { mutate: check } = useCheckSchedule();
  const checked = schedules.filter((s) => s.checked).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-lg font-bold text-gray-900">오늘의 복약</h1>

        <div className="bg-emerald-600 rounded-2xl p-4 text-white">
          <div className="flex justify-between text-sm mb-2">
            <span>오늘의 복약 진행률</span>
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

        {stats && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "이번 달 준수율", value: `${Math.round(stats.compliance_rate * 100)}%`, color: "text-emerald-600" },
              { label: "연속 복약", value: `${stats.streak_days}일`, color: "text-amber-500" },
              { label: "총 완료", value: `${stats.total_checked}회`, color: "text-gray-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {isLoading && <p className="text-sm text-gray-400 text-center py-8">불러오는 중...</p>}
          {!isLoading && schedules.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-gray-400 text-sm">오늘 복약 일정이 없어요</p>
              <a href="/upload" className="inline-block mt-3 text-sm text-emerald-600 font-medium">처방전 등록하기 →</a>
            </div>
          )}
          {schedules.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => check({ scheduleId: item.id, checked: !item.checked })}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${item.checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300"}`}>
                {item.checked && <span className="text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {item.drug_name}
                </p>
                <p className="text-xs text-gray-400">{item.dosage}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{item.scheduled_time.slice(0, 5)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.checked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.checked ? "완료" : "예정"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center pb-4">
          ※ 본 스케줄은 참고용입니다. 변경 시 의사·약사와 상담하세요.
        </p>
      </div>
    </main>
  );
}
