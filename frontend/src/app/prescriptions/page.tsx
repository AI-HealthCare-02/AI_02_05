"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ParsedDrug { name: string; dosage: string; frequency: string; }
interface OCRResult {
  id: string; image_url: string; status: string;
  prescribed_date: string | null; parsed_drugs: ParsedDrug[] | null; created_at: string;
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const [list, setList] = useState<OCRResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    fetch(`${API_URL}/api/ocr/list`, { headers: authHeaders() })
      .then((r) => r.json())
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 처방전과 관련 복약 일정을 모두 삭제할까요?")) return;
    await fetch(`${API_URL}/api/ocr/${id}`, { method: "DELETE", headers: authHeaders() });
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    // ✅ 바탕 화면 다크 모드 추가
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3 flex items-center gap-1 hover:text-white transition-colors">
          ‹ 뒤로
        </button>
        <h1 className="text-xl font-bold">처방전 관리</h1>
        <p className="text-violet-200 text-xs mt-0.5">등록된 처방전 {list.length}개</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 dark:border-violet-500/30 dark:border-t-violet-400 rounded-full animate-spin" />
          </div>
        )}

        {!loading && list.length === 0 && (
          // ✅ 빈 상태 박스 다크 모드
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-sm transition-colors">
            <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-gray-700 dark:text-gray-100 font-semibold mb-1">등록된 처방전이 없어요</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">처방전을 촬영해서 복약 스케줄을 만들어보세요</p>
            <button onClick={() => router.push("/upload")}
              className="bg-violet-600 dark:bg-violet-500 text-white text-sm px-5 py-2.5 rounded-xl font-medium hover:bg-violet-700 dark:hover:bg-violet-600 transition-colors">
              처방전 등록하기
            </button>
          </div>
        )}

        {list.map((ocr) => {
          const isOpen = expanded === ocr.id;
          const drugs = ocr.parsed_drugs ?? [];
          const date = ocr.prescribed_date ?? ocr.created_at;
          return (
            // ✅ 처방전 목록 카드 다크 모드
            <div key={ocr.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
              {/* 처방전 헤더 */}
              <button className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : ocr.id)}>
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 transition-colors">
                  <img src={ocr.image_url} alt="처방전" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatDate(date)} 처방</p>
                  <p className="text-xs text-gray-400 mt-0.5">약물 {drugs.length}종</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors
                    ${ocr.status === "done" 
                      ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" 
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {ocr.status === "done" ? "완료" : ocr.status}
                  </span>
                  <span className={`text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>

              {/* 약물 목록 펼치기 */}
              {isOpen && (
                // ✅ 구분선 다크 모드
                <div className="border-t border-gray-50 dark:border-gray-700">
                  <div className="px-4 py-3 space-y-2">
                    {drugs.map((drug, i) => (
                      // ✅ 내부 아이템 배경 다크 모드
                      <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl px-3 py-2.5 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-violet-400 dark:bg-violet-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{drug.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{drug.dosage} · {drug.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4 flex gap-2">
                    {/* ✅ 액션 버튼들 다크 모드 */}
                    <button onClick={() => router.push("/upload")}
                      className="flex-1 text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-semibold py-2.5 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors">
                      새 처방전 등록
                    </button>
                    <button onClick={() => handleDelete(ocr.id)}
                      className="flex-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 font-semibold py-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {list.length > 0 && (
          // ✅ 맨 아래 '새 처방전 등록' 버튼 다크 모드
          <button onClick={() => router.push("/upload")}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-200 dark:border-violet-800/60 rounded-2xl py-4 text-sm text-violet-500 dark:text-violet-400 font-medium hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
            + 새 처방전 등록
          </button>
        )}
      </div>
    </main>
  );
}
