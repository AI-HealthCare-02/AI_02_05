"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TIME_LABELS: Record<string, string> = {
  "07:30": "아침", "08:00": "아침", "08:30": "아침",
  "12:00": "점심", "13:00": "점심",
  "18:00": "저녁", "19:00": "저녁",
  "21:00": "취침 전", "21:30": "취침 전",
};
const TIME_ICONS: Record<string, string> = { "아침": "🌅", "점심": "☀️", "저녁": "🌆", "취침 전": "🌙" };

interface ScheduleItem {
  id: string; drug_name: string; dosage: string;
  scheduled_time: string; checked: boolean;
}

interface ShareData {
  nickname: string; profile_img_url: string | null;
  date: string; schedules: ScheduleItem[]; label: string;
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

function CircleProgress({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="18" fontWeight="bold">{pct}%</text>
    </svg>
  );
}

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/share/${token}/view`)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🔗</div>
      <p className="text-gray-700 font-semibold mb-2">{error}</p>
      <p className="text-gray-400 text-sm">링크가 만료되었거나 올바르지 않아요.</p>
    </div>
  );

  if (!data) return null;

  const checked = data.schedules.filter((s) => s.checked).length;
  const total = data.schedules.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  const unchecked = total - checked;
  const dateObj = new Date(data.date);
  const dateLabel = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${["일","월","화","수","목","금","토"][dateObj.getDay()]}요일`;
  const timeGroups = groupByTime(data.schedules);
  const allDone = total > 0 && checked === total;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-8 text-white">
        <p className="text-violet-200 text-xs mb-3">💊 PillMate · {data.label}</p>

        {/* 프로필 + 원형 진행률 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl overflow-hidden">
              {data.profile_img_url
                ? <img src={data.profile_img_url} className="w-12 h-12 object-cover" alt="" referrerPolicy="no-referrer" />
                : "👤"}
            </div>
            <div>
              <h1 className="text-lg font-bold">{data.nickname}님</h1>
              <p className="text-violet-200 text-xs">{dateLabel}</p>
            </div>
          </div>
          <CircleProgress pct={pct} />
        </div>

        {/* 요약 배지 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-violet-200 text-xs mt-0.5">전체</p>
          </div>
          <div className="bg-emerald-500/30 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-200">{checked}</p>
            <p className="text-emerald-200 text-xs mt-0.5">복약 완료</p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${unchecked > 0 ? "bg-red-500/30" : "bg-white/15"}`}>
            <p className={`text-2xl font-bold ${unchecked > 0 ? "text-red-200" : ""}`}>{unchecked}</p>
            <p className={`text-xs mt-0.5 ${unchecked > 0 ? "text-red-200" : "text-violet-200"}`}>미복약</p>
          </div>
        </div>
      </div>

      {/* 완료 배너 */}
      {allDone && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-bold text-emerald-700">오늘 복약 모두 완료!</p>
            <p className="text-xs text-emerald-500">모든 약을 빠짐없이 복용했어요</p>
          </div>
        </div>
      )}

      {/* 미복약 경고 */}
      {!allDone && unchecked > 0 && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-700">미복약 {unchecked}개 있어요</p>
            <p className="text-xs text-red-500">아직 복용하지 않은 약이 있어요</p>
          </div>
        </div>
      )}

      <div className="px-4 py-4 max-w-md mx-auto space-y-3">
        {total === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <p className="text-3xl mb-3">💊</p>
            <p className="text-gray-500 text-sm">오늘 복약 일정이 없어요</p>
          </div>
        )}

        {timeGroups.map(([time, items]) => {
          const label = TIME_LABELS[time] ?? "";
          const icon = TIME_ICONS[label] ?? "💊";
          const allChecked = items.every((s) => s.checked);
          const someChecked = items.some((s) => s.checked);
          const checkedCount = items.filter(s => s.checked).length;
          return (
            <div key={time} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-opacity ${allChecked ? "opacity-70" : ""}`}>
              {/* 시간 헤더 */}
              <div className={`flex items-center gap-2 px-4 py-3 ${allChecked ? "bg-emerald-50" : someChecked ? "bg-amber-50" : "bg-gray-50"}`}>
                <span className="text-base">{icon}</span>
                <span className="text-sm font-bold text-gray-800">{time}</span>
                {label && <span className="text-xs text-gray-400">{label}</span>}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-400">{checkedCount}/{items.length}</span>
                  {allChecked
                    ? <span className="text-xs bg-emerald-100 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">✓ 완료</span>
                    : someChecked
                    ? <span className="text-xs bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full">진행 중</span>
                    : <span className="text-xs bg-red-100 text-red-500 font-semibold px-2 py-0.5 rounded-full">미복약</span>
                  }
                </div>
              </div>

              {/* 약물 목록 */}
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${item.checked ? "bg-violet-600 border-violet-600 text-white" : "border-red-300 bg-red-50"}`}>
                      {item.checked
                        ? <span className="text-[10px] font-bold">✓</span>
                        : <span className="text-[10px] text-red-400">✕</span>
                      }
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${item.checked ? "line-through text-gray-300" : "text-gray-800"}`}>
                        {item.drug_name}
                      </p>
                      {item.dosage && <p className="text-xs text-gray-400">1회 {item.dosage}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.checked ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                      {item.checked ? "복용 완료" : "미복용"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-violet-50 rounded-2xl p-4 text-center mt-4">
          <p className="text-xs text-violet-500 font-semibold">💊 PillMate</p>
          <p className="text-xs text-violet-300 mt-0.5">처방전 한 장으로 시작하는 스마트 복약 관리</p>
        </div>
      </div>
    </main>
  );
}