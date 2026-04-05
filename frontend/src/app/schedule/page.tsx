"use client";

import { useState, useEffect } from "react";
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

function MiniCalendar({ date, onSelect, onClose }: { date: string; onSelect: (d: string) => void; onClose: () => void }) {
  const [viewYear, setViewYear] = useState(new Date(date).getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date(date).getMonth());
  const [monthlyStatus, setMonthlyStatus] = useState<Record<string, string>>({});
  const today = todayStr();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/schedule/monthly?year=${viewYear}&month=${viewMonth + 1}`, { headers })
      .then((r) => r.json()).then(setMonthlyStatus).catch(() => {});
  }, [viewYear, viewMonth]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const moveMonth = (d: number) => {
    const m = viewMonth + d;
    if (m < 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else if (m > 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => moveMonth(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-violet-600">‹</button>
          <p className="text-sm font-bold text-gray-800">{viewYear}년 {viewMonth + 1}월</p>
          <button onClick={() => moveMonth(1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-violet-600">›</button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {["일","월","화","수","목","금","토"].map(d => (
            <p key={d} className={`text-center text-xs font-semibold py-1 ${d==="일" ? "text-red-400" : d==="토" ? "text-blue-400" : "text-gray-400"}`}>{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const d = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const isSelected = d === date;
            const isToday = d === today;
            const isSun = i % 7 === 0;
            const isSat = i % 7 === 6;
            const status = monthlyStatus[d];
            return (
              <button key={i} onClick={() => { onSelect(d); onClose(); }}
                className={`flex flex-col items-center justify-center py-1 rounded-xl text-sm font-medium transition-all
                  ${isSelected ? "bg-violet-600 text-white" : isToday ? "bg-violet-100 text-violet-600" : "hover:bg-gray-100"}
                  ${!isSelected && isSun ? "text-red-400" : ""}
                  ${!isSelected && isSat ? "text-blue-400" : ""}
                  ${!isSelected && !isSun && !isSat ? "text-gray-700" : ""}`}>
                {day}
                {status && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    status === "full" ? "bg-emerald-400" :
                    status === "partial" ? "bg-amber-400" :
                    "bg-gray-300"}`} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 mb-1">
          {[["bg-emerald-400", "완료"], ["bg-amber-400", "일부"], ["bg-gray-300", "미완료"]].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { onSelect(today); onClose(); }}
          className="w-full mt-2 text-sm text-violet-600 font-semibold py-2 bg-violet-50 rounded-xl hover:bg-violet-100 transition-colors">
          오늘로 이동
        </button>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [date, setDate] = useState(todayStr);
  const [showDetail, setShowDetail] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [interactions, setInteractions] = useState<{ severity: string; description: string }[]>([]);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), todayStr());
  const { mutate: check } = useCheckSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();

  useEffect(() => {
    if (schedules.length < 2) return;
    const names = [...new Set(schedules.map((s) => s.drug_name))];
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/drugs/check-interactions-by-name`, {
      method: "POST", headers, body: JSON.stringify(names),
    }).then((r) => r.json()).then((d) => setInteractions(d.interactions ?? [])).catch(() => {});
  }, [schedules.length]);

  const checked = schedules.filter((s) => s.checked).length;
  const total = schedules.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const allDone = total > 0 && checked === total;
  const dayProgress = total > 0 ? getDayProgress(schedules[0], date) : null;
  const prescriptionGroups = groupByPrescription(schedules);
  const isToday = date === todayStr();

  const moveDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  const handleDeleteAll = () => {
    if (confirm(`복약 일정 ${total}개를 모두 삭제할까요?`)) schedules.forEach((s) => deleteSchedule(s.id));
  };
  const handleGroupCheck = (items: ScheduleItem[]) => {
    const allChecked = items.every((s) => s.checked);
    items.forEach((s) => check({ scheduleId: s.id, checked: !allChecked }));
  };

  const dateObj = new Date(date);
  const dateLabel = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${["일", "월", "화", "수", "목", "금", "토"][dateObj.getDay()]}요일`;
  const progressLabel = isToday ? "오늘 진행률" : `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 진행률`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            {/* 날짜 네비게이션 */}
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => moveDate(-1)}
                className="w-6 h-6 flex items-center justify-center text-violet-200 hover:text-white transition-colors text-lg">
                ‹
              </button>
              <button onClick={() => setShowCalendar(true)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  isToday ? "bg-white/20 text-white" : "text-violet-300 hover:text-white"}`}>
                {dateLabel} ▾
              </button>
              <button onClick={() => moveDate(1)}
                className="w-6 h-6 flex items-center justify-center text-violet-200 hover:text-white transition-colors text-lg">
                ›
              </button>
              {!isToday && (
                <button onClick={() => setDate(todayStr())}
                  className="text-xs text-violet-300 hover:text-white transition-colors ml-1">
                  오늘
                </button>
              )}
            </div>
            <h1 className="text-2xl font-bold">{isToday ? "오늘의 복약" : "복약 기록"}</h1>
            {dayProgress && (
              <p className="text-violet-200 text-xs mt-0.5">{dayProgress.currentDay}일차 / {dayProgress.totalDays}일</p>
            )}
          </div>
          {total > 0 && isToday && (
            <button onClick={handleDeleteAll} className="text-xs bg-white/15 px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors">
              전체 삭제
            </button>
          )}
        </div>

        {/* 진행률 카드 */}
        <button className={`w-full backdrop-blur-sm rounded-2xl p-4 text-left active:bg-white/20 transition-colors ${allDone ? "bg-white/25" : "bg-white/15"}`}
          onClick={() => total > 0 && setShowDetail(true)}>
          {allDone && (
            <p className="text-center text-sm font-bold mb-2">🎉 오늘 복약 완료! 잘 하셨어요!</p>
          )}
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-violet-100">{progressLabel}</span>
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

        {/* 약물 상호작용 경고 */}
        {interactions.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-600">⚠️ 약물 상호작용 경고</p>
            {interactions.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                  item.severity === "high" ? "bg-red-100 text-red-600" :
                  item.severity === "medium" ? "bg-amber-100 text-amber-600" :
                  "bg-gray-100 text-gray-500"}`}>
                  {item.severity === "high" ? "위험" : item.severity === "medium" ? "주의" : "정보"}
                </span>
                <p className="text-xs text-red-700 leading-relaxed">{item.description}</p>
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
      {showCalendar && <MiniCalendar date={date} onSelect={setDate} onClose={() => setShowCalendar(false)} />}
    </main>
  );
}
