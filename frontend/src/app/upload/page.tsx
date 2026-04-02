"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/hooks/useOCR";
import imageCompression from "browser-image-compression";

export default function UploadPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const { mutate: upload, isPending, isError } = useUpload();

  const handleFile = useCallback(
    async (file: File) => {
      setCompressing(true);
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
        });
        const compressedFile = new File([compressed], file.name, { type: file.type });
        upload(compressedFile, { onSuccess: ({ ocr_id }) => router.push(`/ocr/${ocr_id}`) });
      } catch {
        upload(file, { onSuccess: ({ ocr_id }) => router.push(`/ocr/${ocr_id}`) });
      } finally {
        setCompressing(false);
      }
    },
    [upload, router]
  );

  const isLoading = isPending || compressing;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">처방전 스캔</h1>
          <p className="text-sm text-gray-500 mt-1">사진을 올리면 복약 스케줄이 자동으로 생성돼요</p>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer transition-colors
            ${dragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 bg-white hover:border-emerald-400"}
            ${isLoading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <span className="text-5xl mb-3">📋</span>
          <p className="text-sm font-medium text-gray-700">
            {compressing ? "이미지 최적화 중..." : isPending ? "업로드 중..." : "클릭하거나 파일을 드래그하세요"}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG · PNG 지원</p>
        </label>

        {isError && <p className="text-sm text-red-500 text-center">업로드에 실패했어요. 다시 시도해주세요.</p>}

        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
          <p className="font-medium">📸 촬영 가이드</p>
          <p>• 실제 종이 처방전을 직접 촬영하세요</p>
          <p>• 처방전 전체가 화면에 들어오도록</p>
          <p>• 빛 반사 없는 밝은 곳에서</p>
          <p>• 글씨가 선명하게 보이도록</p>
        </div>

        <p className="text-xs text-gray-400 text-center">
          ※ 화면을 찍은 사진은 인식률이 낮을 수 있어요
        </p>
      </div>
    </main>
  );
}
