"use client";

import { useState } from "react";
import { useSchedule, useCheckSchedule, useDeleteSchedule, useStats } from "@/hooks/useSchedule";
import { ScheduleItem } from "@/types";

const todayStr = () => new Date().toISOString().split("T")[0];
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const formatDate = (d: string) => {
  const date = new Date(d);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const TIME_LABELS: Record<string, string> = {
  "07:30": "아침", "08:00": "아침", "08:30": "아침",
  "12:00": "점심", "13:00": "점심",
  "18:00": "저녁", "19:00": "저녁",
  "21:00": "취침 전", "21:30": "취침 전",
};
const TIME_ICONS: Record<string, string> = {
  "아침": "🌅", "점심": "☀️", "저녁": "🌆", "취침 전": "🌙",
};

function getTimeLabel(time: string) { return TIME_LABELS[time.slice(0, 5)] ?? ""; }

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-gray-900 mb-4">오늘 복약 현황</h2>
        {done.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-violet-600 mb-2">✅ 복약 완료 ({done.length})</p>
            <div className="space-y-1.5">
              {done.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-violet-50 rounded-xl px-3 py-2.5">
                  <span className="text-sm text-gray-700 font-medium">{s.drug_name}</span>
                  <span className="text-xs text-violet-500 font-medium">{s.scheduled_time.slice(0, 5)}</span>
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
                <div key={s.id} className="flex justify-between items-center bg-amber-50 rounded-xl px-3 py-2.5">
                  <span className="text-sm text-gray-700 font-medium">{s.drug_name}</span>
                  <span className="text-xs text-amber-500 font-medium">{s.scheduled_time.slice(0, 5)}</span>
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
  const total = schedules.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const dayProgress = total > 0 ? getDayProgress(schedules[0], date) : null;
  const prescriptionGroups = groupByPrescription(schedules);

  const handleDeleteAll = () => {
    if (confirm(`복약 일정 ${total}개를 모두 삭제할까요?`)) schedules.forEach((s) => deleteSchedule(s.id));
  };
  const handleGroupCheck = (items: ScheduleItem[]) => {
    const allChecked = items.every((s) => s.checked);
    items.forEach((s) => check({ scheduleId: s.id, checked: !allChecked }));
  };

  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${["일", "월", "화", "수", "목", "금", "토"][today.getDay()]}요일`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-violet-200 text-xs font-medium mb-0.5">{dateLabel}</p>
            <h1 className="text-2xl font-bold">오늘의 복약</h1>
            {dayProgress && (
              <p className="text-violet-200 text-xs mt-0.5">{dayProgress.currentDay}일차 / {dayProgress.totalDays}일</p>
            )}
          </div>
          {total > 0 && (
            <button onClick={handleDeleteAll} className="text-xs bg-white/15 px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors">
              전체 삭제
            </button>
          )}
        </div>

        {/* 진행률 카드 */}
        <button className="w-full bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-left active:bg-white/20 transition-colors"
          onClick={() => total > 0 && setShowDetail(true)}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-violet-100">오늘 진행률</span>
            <span className="text-2xl font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div className="h-2 bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-violet-200">{checked} / {total} 완료</p>
            {total > 0 && <p className="text-xs text-violet-300">탭해서 상세 보기 →</p>}
          </div>
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "이번 달", value: `${Math.round(stats.compliance_rate * 100)}%`, color: "text-violet-600", bg: "bg-violet-50" },
              { label: "연속", value: `${stats.streak_days}일`, color: "text-amber-500", bg: "bg-amber-50" },
              { label: "총 완료", value: `${stats.total_checked}회`, color: "text-gray-700", bg: "bg-gray-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* 스케줄 목록 */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mb-3" />
              <p className="text-sm">불러오는 중...</p>
            </div>
          )}
          {!isLoading && total === 0 && (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💊</span>
              </div>
              <p className="text-gray-700 font-semibold mb-1">복약 일정이 없어요</p>
              <p className="text-gray-400 text-sm mb-4">처방전을 등록하면 자동으로 생성돼요</p>
              <a href="/upload" className="inline-block bg-violet-600 text-white text-sm px-5 py-2.5 rounded-xl font-medium">
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
                {/* 처방전 헤더 */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span className="text-xs font-bold text-violet-600">{formatDate(prescribed_date)} 처방</span>
                  <span className="text-xs text-gray-400">{currentDay}일차 / {totalDays}일</span>
                  {allDone && <span className="ml-auto text-xs text-violet-500 font-medium">✓ 모두 완료</span>}
                </div>

                {timeGroups.map(([time, timeItems]) => {
                  const timeAllChecked = timeItems.every((s) => s.checked);
                  const timeSomeChecked = timeItems.some((s) => s.checked);
                  const label = getTimeLabel(time);
                  const icon = TIME_ICONS[label] ?? "💊";
                  return (
                    <div key={time} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${timeAllChecked ? "opacity-60" : ""}`}>
                      {/* 시간대 헤더 */}
                      <div className={`flex items-center justify-between px-4 py-3 ${timeAllChecked ? "bg-violet-50" : "bg-gray-50/80"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{icon}</span>
                          <span className="text-sm font-bold text-gray-800">{time}</span>
                          {label && <span className="text-xs text-gray-400">{label}</span>}
                        </div>
                        <button onClick={() => handleGroupCheck(timeItems)}
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all
                            ${timeAllChecked ? "bg-violet-100 text-violet-600"
                              : timeSomeChecked ? "bg-amber-100 text-amber-600"
                              : "bg-violet-600 text-white hover:bg-violet-700"}`}>
                          {timeAllChecked ? "✓ 완료" : "완료 처리"}
                        </button>
                      </div>

                      {/* 약물 목록 */}
                      <div className="divide-y divide-gray-50">
                        {timeItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                            <button onClick={() => check({ scheduleId: item.id, checked: !item.checked })}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                ${item.checked ? "bg-violet-600 border-violet-600 text-white" : "border-gray-200 hover:border-violet-400"}`}>
                              {item.checked && <span className="text-[10px] font-bold">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${item.checked ? "line-through text-gray-300" : "text-gray-800"}`}>
                                {item.drug_name}
                              </p>
                              {item.dosage && <p className="text-xs text-gray-400 mt-0.5">1회 {item.dosage}</p>}
                            </div>
                            <button onClick={() => deleteSchedule(item.id)}
                              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-lg">
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

        <p className="text-xs text-gray-300 text-center pb-6">
          ※ 본 스케줄은 참고용입니다. 변경 시 의사·약사와 상담하세요.
        </p>
      </div>

      {showDetail && <DetailModal schedules={schedules} onClose={() => setShowDetail(false)} />}
    </main>
  );
}
