"use client";

import { useState } from "react";
import { useSchedule, useCheckSchedule, useDeleteSchedule, useStats } from "@/hooks/useSchedule";
import { ScheduleItem } from "@/types";

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

function getDayProgress(item: ScheduleItem, targetDate: string) {
  const start = new Date(item.start_date);
  const end = new Date(item.end_date);
  const target = new Date(targetDate);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const currentDay = Math.round((target.getTime() - start.getTime()) / 86400000) + 1;
  return { currentDay: Math.max(1, currentDay), totalDays };
}

function DetailModal({ schedules, onClose }: { schedules: ScheduleItem[]; onClose: () => void }) {
  const done = schedules.filter((s) => s.checked);
  const pending = schedules.filter((s) => !s.checked);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-base font-bold text-gray-800 mb-4">오늘 복약 상세</h2>

        {done.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-emerald-600 mb-2">✅ 복약 완료 ({done.length})</p>
            <div className="space-y-1.5">
              {done.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-emerald-50 rounded-xl px-3 py-2">
                  <span className="text-sm text-gray-700">{s.drug_name}</span>
                  <span className="text-xs text-emerald-600">{s.scheduled_time.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-500 mb-2">⏳ 미복약 ({pending.length})</p>
            <div className="space-y-1.5">
              {pending.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-amber-50 rounded-xl px-3 py-2">
                  <span className="text-sm text-gray-700">{s.drug_name}</span>
                  <span className="text-xs text-amber-500">{s.scheduled_time.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [date] = useState(today);
  const [showDetail, setShowDetail] = useState(false);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), today());
  const { mutate: check } = useCheckSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();
  const checked = schedules.filter((s) => s.checked).length;

  const handleDelete = (id: string) => {
    if (confirm("이 복약 일정을 삭제할까요?")) deleteSchedule(id);
  };

  const handleDeleteAll = () => {
    if (confirm(`복약 일정 ${schedules.length}개를 모두 삭제할까요?`)) {
      schedules.forEach((s) => deleteSchedule(s.id));
    }
  };

  // 대표 일수 (첫 번째 스케줄 기준)
  const dayProgress = schedules.length > 0 ? getDayProgress(schedules[0], date) : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 px-4 pt-12 pb-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">오늘의 복약</h1>
            {dayProgress && (
              <p className="text-xs text-emerald-200 mt-0.5">
                {dayProgress.currentDay}일차 / {dayProgress.totalDays}일
              </p>
            )}
          </div>
          {schedules.length > 0 && (
            <button onClick={handleDeleteAll}
              className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">
              전체 삭제
            </button>
          )}
        </div>

        <button
          className="w-full bg-white/15 rounded-2xl p-4 text-left active:bg-white/20"
          onClick={() => schedules.length > 0 && setShowDetail(true)}
        >
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
          <p className="text-xs text-emerald-100 mt-2">
            {checked} / {schedules.length} 완료
            {schedules.length > 0 && <span className="ml-1 opacity-70">· 탭해서 상세 보기</span>}
          </p>
        </button>
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
          {schedules.map((item) => {
            const { currentDay, totalDays } = getDayProgress(item, date);
            return (
              <div key={item.id} className={`bg-white rounded-2xl shadow-sm transition-all ${item.checked ? "opacity-70" : ""}`}>
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.dosage && `1회 ${item.dosage} · `}{currentDay}일차 / {totalDays}일
                    </p>
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
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center pb-6">
          ※ 본 스케줄은 참고용입니다. 변경 시 의사·약사와 상담하세요.
        </p>
      </div>

      {showDetail && <DetailModal schedules={schedules} onClose={() => setShowDetail(false)} />}
    </main>
  );
}
