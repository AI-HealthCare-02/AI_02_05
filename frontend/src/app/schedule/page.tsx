"use client";

import { useState } from "react";
import { useSchedule, useCheckSchedule, useDeleteSchedule, useStats } from "@/hooks/useSchedule";
import { ScheduleItem } from "@/types";

const todayStr = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const TIME_LABELS: Record<string, string> = {
  "07:30": "아침", "08:00": "아침", "08:30": "아침",
  "12:00": "점심", "13:00": "점심",
  "18:00": "저녁", "19:00": "저녁",
  "21:00": "취침 전", "21:30": "취침 전",
};

function getTimeLabel(time: string) {
  const t = time.slice(0, 5);
  return TIME_LABELS[t] ?? "";
}

function getDayProgress(item: ScheduleItem, targetDate: string) {
  const start = new Date(item.start_date);
  const end = new Date(item.end_date);
  const target = new Date(targetDate);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const currentDay = Math.round((target.getTime() - start.getTime()) / 86400000) + 1;
  return { currentDay: Math.max(1, currentDay), totalDays };
}

function groupByTime(schedules: ScheduleItem[]) {
  const map = new Map<string, ScheduleItem[]>();
  for (const s of schedules) {
    const key = s.scheduled_time.slice(0, 5);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function groupByPrescription(schedules: ScheduleItem[]) {
  const map = new Map<string, { prescribed_date: string; items: ScheduleItem[] }>();
  for (const s of schedules) {
    const key = s.ocr_result_id;
    if (!map.has(key)) map.set(key, { prescribed_date: s.prescribed_date, items: [] });
    map.get(key)!.items.push(s);
  }
  return Array.from(map.values()).sort((a, b) => b.prescribed_date.localeCompare(a.prescribed_date));
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
  const [date] = useState(todayStr);
  const [showDetail, setShowDetail] = useState(false);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), todayStr());
  const { mutate: check } = useCheckSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();

  const checked = schedules.filter((s) => s.checked).length;
  const dayProgress = schedules.length > 0 ? getDayProgress(schedules[0], date) : null;
  const prescriptionGroups = groupByPrescription(schedules);

  const handleDeleteAll = () => {
    if (confirm(`복약 일정 ${schedules.length}개를 모두 삭제할까요?`)) {
      schedules.forEach((s) => deleteSchedule(s.id));
    }
  };

  const handleGroupCheck = (items: ScheduleItem[]) => {
    const allChecked = items.every((s) => s.checked);
    items.forEach((s) => check({ scheduleId: s.id, checked: !allChecked }));
  };

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
            <button onClick={handleDeleteAll} className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">
              전체 삭제
            </button>
          )}
        </div>
        <button className="w-full bg-white/15 rounded-2xl p-4 text-left active:bg-white/20"
          onClick={() => schedules.length > 0 && setShowDetail(true)}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-100">진행률</span>
            <span className="font-bold">{schedules.length ? Math.round((checked / schedules.length) * 100) : 0}%</span>
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

        <div className="space-y-3">
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

          {prescriptionGroups.map(({ prescribed_date, items }) => {
            const timeGroups = groupByTime(items);
            const allDone = items.every((s) => s.checked);
            const { currentDay, totalDays } = getDayProgress(items[0], date);
            return (
              <div key={prescribed_date} className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-xs font-bold text-purple-600">📋 {prescribed_date} 처방</span>
                  <span className="text-xs text-gray-400">{currentDay}일차 / {totalDays}일</span>
                  {allDone && <span className="text-xs text-emerald-600 ml-auto">✓ 완료</span>}
                </div>
                {timeGroups.map(([time, timeItems]) => {
                  const timeAllChecked = timeItems.every((s) => s.checked);
                  const timeSomeChecked = timeItems.some((s) => s.checked);
                  const label = getTimeLabel(time);
                  return (
                    <div key={time} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${timeAllChecked ? "opacity-70" : ""}`}>
                      <div className={`flex items-center justify-between px-4 py-3 ${timeAllChecked ? "bg-emerald-50" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">{time}</span>
                          {label && <span className="text-xs text-gray-400">{label}</span>}
                        </div>
                        <button
                          onClick={() => handleGroupCheck(timeItems)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-all
                            ${timeAllChecked ? "bg-emerald-100 text-emerald-700"
                              : timeSomeChecked ? "bg-amber-100 text-amber-600"
                              : "bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"}`}>
                          {timeAllChecked ? "✓ 완료" : "완료 처리"}
                        </button>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {timeItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                            <button
                              onClick={() => check({ scheduleId: item.id, checked: !item.checked })}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                ${item.checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 hover:border-emerald-400"}`}>
                              {item.checked && <span className="text-[10px]">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
                                {item.drug_name}
                              </p>
                              {item.dosage && <p className="text-xs text-gray-400">1회 {item.dosage}</p>}
                            </div>
                            <button onClick={() => deleteSchedule(item.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors text-lg flex-shrink-0">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
