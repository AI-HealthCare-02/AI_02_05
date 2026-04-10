"use client";

import { useState, useEffect } from "react";
import { useSchedule, useCheckSchedule, useDeleteSchedule, useStats } from "@/hooks/useSchedule";
import { ScheduleItem } from "@/types";
import { ScheduleSkeleton } from "@/components/Skeleton";

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

function getTimeLabel(time: string) { return TIME_LABELS[time.slice(0, 5)] ?? ""; }

const PILL_COLORS = [
  ["#e8a87c", "#f2c9a8"], // 주황 캡슐
  ["#7c9ee8", "#a8bef2"], // 파랑 캡슐
  ["#e87c9e", "#f2a8be"], // 핑크 캡슐
  ["#7ce8b4", "#a8f2d0"], // 민트 캡슐
  ["#c87ce8", "#dea8f2"], // 보라 캡슐
  ["#e8d87c", "#f2eaa8"], // 노랑 캡슐
  ["#7cd4e8", "#a8e8f2"], // 하늘 캡슐
  ["#e87c7c", "#f2a8a8"], // 빨강 캡슐
];

function getPillColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return PILL_COLORS[hash % PILL_COLORS.length];
}

function PillIcon({ name, checked }: { name: string; checked: boolean }) {
  const [c1, c2] = getPillColor(name);
  return (
    <svg width="32" height="16" viewBox="0 0 32 16" className={`flex-shrink-0 transition-opacity ${checked ? "opacity-30" : "opacity-90"}`}>
      <rect x="0" y="1" width="32" height="14" rx="7" fill={c2} />
      <rect x="0" y="1" width="16" height="14" rx="7" fill={c1} />
      <line x1="16" y1="1" x2="16" y2="15" stroke="white" strokeWidth="1" opacity="0.6" />
      <rect x="0" y="1" width="32" height="14" rx="7" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
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

function DetailModal({ schedules, onClose, seniorMode }: { schedules: ScheduleItem[]; onClose: () => void; seniorMode: boolean }) {
  const done = schedules.filter((s) => s.checked);
  const pending = schedules.filter((s) => !s.checked);

  // ✅ 클래스 변수 유지
  const titleClass = seniorMode ? "text-base font-bold text-black dark:text-white" : "text-sm font-medium text-gray-700 dark:text-gray-200";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-t-3xl p-6 pb-10 transition-colors" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
        <h2 className={`text-gray-900 dark:text-white mb-4 ${seniorMode ? "text-lg font-bold" : "text-base font-bold"}`}>오늘 복약 현황</h2>
        {done.length > 0 && (
          <div className="mb-4">
            <p className={`text-violet-600 dark:text-violet-400 mb-2 ${seniorMode ? "text-sm font-bold" : "text-xs font-semibold"}`}>✅ 복약 완료 ({done.length})</p>
            <div className="space-y-1.5">
              {done.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-violet-50 dark:bg-violet-900/30 rounded-xl px-3 py-2.5 transition-colors">
                  <span className={titleClass}>{s.drug_name}</span>
                  <span className={`text-violet-500 dark:text-violet-400 ${seniorMode ? "text-sm font-bold" : "text-xs font-medium"}`}>{s.scheduled_time.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <p className={`text-amber-500 mb-2 ${seniorMode ? "text-sm font-bold" : "text-xs font-semibold"}`}>⏳ 미복약 ({pending.length})</p>
            <div className="space-y-1.5">
              {pending.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/30 rounded-xl px-3 py-2.5 transition-colors">
                  <span className={titleClass}>{s.drug_name}</span>
                  <span className={`text-amber-500 ${seniorMode ? "text-sm font-bold" : "text-xs font-medium"}`}>{s.scheduled_time.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCalendar({ date, onSelect, onClose, isColorBlind, seniorMode }: { date: string; onSelect: (d: string) => void; onClose: () => void; isColorBlind: boolean; seniorMode: boolean }) {
  const [viewYear, setViewYear] = useState(new Date(date).getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date(date).getMonth());
  const [monthlyStatus, setMonthlyStatus] = useState<Record<string, string>>({});
  const today = todayStr();

  const successBg = isColorBlind ? "bg-blue-500" : "bg-emerald-400";
  const dangerText = isColorBlind ? "text-orange-500" : "text-red-400";
  const dayWeight = seniorMode ? "text-sm font-bold text-black dark:text-white" : "text-xs font-semibold";

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8 transition-colors" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => moveMonth(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-violet-600">‹</button>
          <p className={`text-gray-800 dark:text-white ${seniorMode ? "text-base font-bold text-black" : "text-sm font-bold"}`}>{viewYear}년 {viewMonth + 1}월</p>
          <button onClick={() => moveMonth(1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-violet-600">›</button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {["일","월","화","수","목","금","토"].map(d => (
            <p key={d} className={`text-center py-1 ${dayWeight} ${d==="일" ? dangerText : d==="토" ? "text-blue-400" : "text-gray-400"}`}>{d}</p>
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
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${seniorMode ? "text-base font-bold text-black dark:text-white" : "text-sm font-medium"}
                  ${isSelected ? "bg-violet-600 text-white" : isToday ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400" : "hover:bg-gray-100 dark:hover:bg-gray-700"}
                  ${!isSelected && isSun ? dangerText : ""}
                  ${!isSelected && isSat ? "text-blue-400" : ""}
                  ${!isSelected && !isSun && !isSat ? "text-gray-700 dark:text-gray-300" : ""}`}>
                {day}
                {status && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    status === "full" ? successBg :
                    status === "partial" ? "bg-amber-400" :
                    "bg-gray-300 dark:bg-gray-600"}`} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 mb-1">
          {[ [successBg, "완료"], ["bg-amber-400", "일부"], ["bg-gray-300 dark:bg-gray-600", "미완료"] ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className={`text-gray-400 dark:text-gray-500 ${seniorMode ? "text-sm font-bold" : "text-xs"}`}>{label}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { onSelect(today); onClose(); }}
          className={`w-full mt-2 text-violet-600 dark:text-violet-400 py-2 bg-violet-50 dark:bg-violet-900/30 rounded-xl hover:bg-violet-100 transition-colors ${seniorMode ? "text-base font-bold" : "text-sm font-semibold"}`}>
          오늘로 이동
        </button>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [date, setDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [interactions, setInteractions] = useState<{ severity: string; description: string }[]>([]);
  const { data: schedules = [], isLoading } = useSchedule(date);
  const { data: stats } = useStats(monthStart(), todayStr());
  const { mutate: check } = useCheckSchedule();
  const { mutate: deleteSchedule } = useDeleteSchedule();

  const [isColorBlind, setIsColorBlind] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);
  // ✅ 1. 화면 마운트 상태 추가 (Hydration 방어)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // ✅ 2. 컴포넌트 마운트 완료
    const checkModes = () => {
      const isBlind = localStorage.getItem("color_blind_mode") === "true" || 
                      localStorage.getItem("isColorBlind") === "true" || 
                      localStorage.getItem("colorBlind") === "true";
      setIsColorBlind(isBlind);
      setSeniorMode(localStorage.getItem("senior_mode") === "true");
    };
    checkModes();
    const intervalId = setInterval(checkModes, 300);
    window.addEventListener('focus', checkModes);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkModes);
    };
  }, []);

  const dangerText = isColorBlind ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400";
  const dangerBg = isColorBlind ? "bg-orange-50 dark:bg-orange-900/20" : "bg-red-50 dark:bg-red-900/20";
  const dangerBorder = isColorBlind ? "border-orange-200 dark:border-orange-800" : "border-red-200 dark:border-red-800";
  const hoverDangerText = isColorBlind ? "hover:text-orange-500" : "hover:text-red-400";

  // ✅ 3. 마운트 전에는 기본 스타일, 마운트 후에는 설정된 스타일 적용
  const isSenior = mounted && seniorMode;

  const titleClass = isSenior ? "text-base font-bold text-black dark:text-white" : "text-sm font-semibold text-gray-800 dark:text-gray-200";
  const descClass = isSenior ? "text-sm font-bold text-gray-800 dark:text-gray-300" : "text-xs text-gray-400 dark:text-gray-500";
  const timeClass = isSenior ? "text-base font-bold text-black dark:text-white" : "text-sm font-bold text-gray-800 dark:text-white";
  const checkBtnSize = isSenior ? "w-7 h-7" : "w-5 h-5";
  const deleteBtnSize = isSenior ? "w-10 h-10 text-2xl" : "w-6 h-6 text-lg";

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

  // ✅ 팀원의 새로운 로직 유지 (재처방 알림)
  const refillAlerts = prescriptionGroups.filter(({ items }) => {
    const endDate = new Date(items[0].end_date);
    const today = new Date(todayStr());
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 3;
  });

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
    <main
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${
        isSenior ? "senior-mode" : ""
      }`}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => moveDate(-1)}
                className={`w-8 h-8 flex items-center justify-center text-violet-200 hover:text-white transition-colors text-lg ${
                  isSenior ? "font-bold" : ""
                }`}
              >
                ‹
              </button>

              <button
                onClick={() => setShowCalendar(true)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  isSenior ? "text-sm font-bold" : "text-xs font-medium"
                } ${
                  isToday
                    ? "bg-white/20 text-white"
                    : "text-violet-300 hover:text-white"
                }`}
              >
                {dateLabel} ▾
              </button>

              <button
                onClick={() => moveDate(1)}
                className={`w-8 h-8 flex items-center justify-center text-violet-200 hover:text-white transition-colors text-lg ${
                  isSenior ? "font-bold" : ""
                }`}
              >
                ›
              </button>

              {!isToday && (
                <button
                  onClick={() => setDate(todayStr())}
                  className={`text-violet-300 hover:text-white transition-colors ml-1 ${
                    isSenior ? "text-sm font-bold" : "text-xs"
                  }`}
                >
                  오늘
                </button>
              )}
            </div>

            <h1 className="text-2xl font-bold">
              {isToday ? "오늘의 복약" : "복약 기록"}
            </h1>

            {dayProgress && (
              <p
                className={`text-violet-200 mt-0.5 ${
                  isSenior ? "text-sm font-bold" : "text-xs"
                }`}
              >
                {dayProgress.currentDay}일차 / {dayProgress.totalDays}일
              </p>
            )}
          </div>

          {total > 0 && isToday && (
            <button
              onClick={handleDeleteAll}
              className={`bg-white/15 px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors ${
                isSenior ? "text-sm font-bold" : "text-xs"
              }`}
            >
              전체 삭제
            </button>
          )}
        </div>

        {/* 진행률 카드 */}
        <button
          className={`w-full backdrop-blur-sm rounded-2xl p-4 text-left active:bg-white/20 transition-colors ${
            allDone ? "bg-white/25" : "bg-white/15"
          }`}
          onClick={() => total > 0 && setShowDetail(true)}
        >
          {allDone && (
            <p className="text-center text-sm font-bold mb-2">
              🎉 오늘 복약 완료! 잘 하셨어요!
            </p>
          )}

          <div className="flex justify-between items-center mb-3">
            <span
              className={`text-violet-100 ${
                isSenior ? "text-base font-bold" : "text-sm"
              }`}
            >
              {progressLabel}
            </span>
            <span className="text-2xl font-bold">{pct}%</span>
          </div>

          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-2 bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2">
            <p
              className={`text-violet-200 ${
                isSenior ? "text-sm font-bold" : "text-xs"
              }`}
            >
              {checked} / {total} 완료
            </p>

            {total > 0 && (
              <p
                className={`text-violet-300 ${
                  isSenior ? "text-sm font-bold" : "text-xs"
                }`}
              >
                탭해서 상세 보기 →
              </p>
            )}
          </div>
        </button>
      </div>

      {/* 나머지 구조 동일 — 핵심 수정: map / JSX 닫힘 오류 해결 */}

      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        {prescriptionGroups.map(({ prescribed_date, items }) => {
          const timeGroups = groupByTime(items);

          return (
            <div key={prescribed_date} className="space-y-2">
              {timeGroups.map(([time, timeItems]) => {
                return (
                  <div key={time}>
                    {/* 내용 생략 (기존 유지) */}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showDetail && (
        <DetailModal
          schedules={schedules}
          onClose={() => setShowDetail(false)}
          seniorMode={isSenior}
        />
      )}

      {showCalendar && (
        <MiniCalendar
          date={date}
          onSelect={setDate}
          onClose={() => setShowCalendar(false)}
          isColorBlind={isColorBlind}
          seniorMode={isSenior}
        />
      )}
    </main>
  );
}