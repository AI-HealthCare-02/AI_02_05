"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/useOCR";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const { mutate: upload, isPending, isError } = useUpload();

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > 10 * 1024 * 1024) {
        alert("파일 크기가 10MB를 초과했어요. 사진을 압축하거나 다른 파일을 선택해주세요.");
        return;
      }
      upload(file, { onSuccess: ({ ocr_id }) => router.push(`/ocr/${ocr_id}`) });
    },
    [upload, router]
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">처방전 스캔</h1>
          <p className="text-sm text-gray-500 mt-1">사진을 올리면 복약 스케줄이 자동으로 생성돼요</p>
        </div>

        <div className="space-y-3">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-colors
              ${dragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-white hover:border-emerald-400"}
              ${isPending ? "pointer-events-none opacity-60" : ""}`}
          >
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <span className="text-4xl mb-2">🖼️</span>
            <p className="text-sm font-medium text-gray-700">갤러리에서 선택</p>
            <p className="text-xs text-gray-400 mt-1">JPG · PNG · PDF · 최대 10MB</p>
          </label>

          <label className={`flex items-center justify-center gap-3 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl cursor-pointer transition-colors
            ${isPending ? "pointer-events-none opacity-60" : ""}`}>
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <span className="text-xl">📷</span>
            {isPending ? "업로드 중..." : "카메라로 촬영"}
          </label>
        </div>

        {isError && <p className="text-sm text-red-500 text-center">업로드에 실패했어요. 다시 시도해주세요.</p>}

        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
          <p className="font-medium">촬영 가이드</p>
          <p>• 처방전 전체가 화면에 들어오도록</p>
          <p>• 빛 반사 없는 밝은 곳에서</p>
          <p>• 글씨가 선명하게 보이도록</p>
        </div>
      </div>
    </main>
  );
}
