"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/useOCR";
import imageCompression from "browser-image-compression";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  // ✅ (복구됨) 직접 입력 버튼의 로딩 상태
  const [isManualLoading, setIsManualLoading] = useState(false);
  const { mutate: upload, isPending, isError } = useUpload();

  // ✅ 1. 색약 모드 상태 추가
  const [isColorBlind, setIsColorBlind] = useState(false);

  useEffect(() => {
    const checkMode = () => setIsColorBlind(localStorage.getItem("color_blind_mode") === "true");
    checkMode();
    window.addEventListener('focus', checkMode);
    return () => window.removeEventListener('focus', checkMode);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2000, useWebWorker: true });
      upload(new File([compressed], file.name, { type: file.type }), { onSuccess: ({ ocr_id }) => router.push(`/ocr/${ocr_id}`) });
    } catch {
      upload(file, { onSuccess: ({ ocr_id }) => router.push(`/ocr/${ocr_id}`) });
    } finally { setCompressing(false); }
  }, [upload, router]);

  const isLoading = isPending || compressing;

  // ✅ (복구됨) 직접 입력 함수 에러/로딩 처리
  const handleManualEntry = async () => {
    setIsManualLoading(true);
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/ocr/manual`, {
        method: "POST", headers,
      });
      if (!res.ok) throw new Error("서버 응답 오류");
      const data = await res.json();
      router.push(`/ocr/${data.ocr_id}`);
    } catch (error) {
      alert("백엔드 서버와 연결할 수 없습니다. 서버가 켜져 있는지 확인해주세요!");
    } finally {
      setIsManualLoading(false);
    }
  };

  // ✅ 2. 에러 메시지용 동적 색상 변수
  const dangerBg = isColorBlind ? "bg-orange-50 dark:bg-orange-900/20" : "bg-red-50 dark:bg-red-900/20";
  const dangerBorder = isColorBlind ? "border-orange-200 dark:border-orange-800" : "border-red-100 dark:border-red-800";
  const dangerText = isColorBlind ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400";

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3 flex items-center gap-1 hover:text-white transition-colors">
          ‹ 뒤로
        </button>
        <h1 className="text-xl font-bold">처방전 스캔</h1>
        <p className="text-violet-200 text-xs mt-0.5">사진을 올리면 복약 스케줄이 자동으로 생성돼요</p>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-4">
        {/* 업로드 영역 */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-3xl cursor-pointer transition-all
            ${dragging 
              ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 dark:border-violet-400 scale-[0.99]" 
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50/30 dark:hover:bg-violet-900/20"}
            ${isLoading ? "pointer-events-none opacity-60" : ""}`}>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {isLoading ? (
            <>
              <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-600 dark:border-violet-500/30 dark:border-t-violet-400 rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {compressing ? "이미지 최적화 중..." : "업로드 중..."}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors">카메라로 촬영하거나 파일 선택</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">JPG · PNG 지원</p>
            </>
          )}
        </label>

        {isError && (
          // ✅ 3. 에러 박스에 색약 모드 변수 적용
          <div className={`${dangerBg} border ${dangerBorder} rounded-2xl px-4 py-3 text-sm ${dangerText} text-center transition-colors`}>
            업로드에 실패했어요. 다시 시도해주세요.
          </div>
        )}

        {/* 촬영 가이드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-colors">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">📸 촬영 가이드</p>
          <div className="space-y-2">
            {[
              { icon: "📄", text: "실제 종이 처방전을 직접 촬영하세요" },
              { icon: "🔲", text: "처방전 전체가 화면에 들어오도록" },
              { icon: "💡", text: "빛 반사 없는 밝은 곳에서" },
              { icon: "🔍", text: "글씨가 선명하게 보이도록" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <p className="text-xs text-gray-600 dark:text-gray-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-300 dark:text-gray-500 text-center transition-colors">※ 화면을 찍은 사진은 인식률이 낮을 수 있어요</p>

        {/* 직접 입력 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center transition-colors">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">📝 사진 없이 직접 입력</p>
          <p className="text-xs text-gray-400 dark:text-gray-400 mb-3">스마트폰이 없거나 사진 찍기가 어려울 때</p>
          <button
            onClick={handleManualEntry}
            disabled={isLoading || isManualLoading}
            className="w-full border-2 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-semibold py-3 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {/* ✅ (복구됨) 로딩 중일 때는 텍스트가 변경됨 */}
            {isManualLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                처리 중...
              </>
            ) : "약물 직접 입력하기"}
          </button>
        </div>
      </div>
    </main>
  );
}