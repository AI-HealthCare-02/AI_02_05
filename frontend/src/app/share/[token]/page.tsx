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
  const dateObj = new Date(data.date);
  const dateLabel = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  const timeGroups = groupByTime(data.schedules);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <p className="text-violet-200 text-xs mb-1">보호자 공유 · {data.label}</p>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg overflow-hidden">
            {data.profile_img_url
              ? <img src={data.profile_img_url} className="w-10 h-10 object-cover" alt="" />
              : "👤"}
          </div>
          <div>
            <h1 className="text-lg font-bold">{data.nickname}님의 복약 현황</h1>
            <p className="text-violet-200 text-xs">{dateLabel}</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-violet-100">오늘 진행률</span>
            <span className="text-2xl font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div className="h-2 bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-violet-200 mt-2">{checked} / {total} 완료</p>
        </div>
      </div>

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
          const allDone = items.every((s) => s.checked);
          return (
            <div key={time} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${allDone ? "opacity-60" : ""}`}>
              <div className={`flex items-center gap-2 px-4 py-3 ${allDone ? "bg-violet-50" : "bg-gray-50"}`}>
                <span>{icon}</span>
                <span className="text-sm font-bold text-gray-800">{time}</span>
                {label && <span className="text-xs text-gray-400">{label}</span>}
                {allDone && <span className="ml-auto text-xs text-violet-500 font-semibold">✓ 완료</span>}
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${item.checked ? "bg-violet-600 border-violet-600 text-white" : "border-gray-200"}`}>
                      {item.checked && <span className="text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${item.checked ? "line-through text-gray-300" : "text-gray-800"}`}>
                        {item.drug_name}
                      </p>
                      {item.dosage && <p className="text-xs text-gray-400">1회 {item.dosage}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="bg-violet-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-violet-400 font-medium">💊 PillMate로 복약 관리하기</p>
          <p className="text-xs text-violet-300 mt-0.5">처방전 한 장으로 시작하는 스마트 복약 관리</p>
        </div>
      </div>
    </main>
  );
}
