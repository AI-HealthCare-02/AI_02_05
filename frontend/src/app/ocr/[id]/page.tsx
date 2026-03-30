"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOCRStatus, useConfirm } from "@/hooks/useOCR";
import { ParsedDrug } from "@/types";

const TIMING: Record<string, string> = {
  after_meal: "식후", before_meal: "식전", bedtime: "취침 전",
  morning: "아침", evening: "저녁", empty_stomach: "공복",
};

const EMPTY_DRUG: ParsedDrug = { name: "", dosage: "", frequency: "1일 1회", timing: "after_meal" };

export default function OCRResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [drugs, setDrugs] = useState<ParsedDrug[]>([]);
  const [polling, setPolling] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const { data, isError } = useOCRStatus(id, polling);
  const { mutate: confirm, isPending: isConfirming } = useConfirm(id);

  useEffect(() => {
    if (data?.status === "done") {
      setPolling(false);
      setDrugs(data.parsed_drugs ?? []);
    }
    if (data?.status === "failed") {
      setPolling(false);
      setManualMode(true);
      setDrugs([{ ...EMPTY_DRUG }]);
    }
  }, [data]);

  const update = (i: number, field: keyof ParsedDrug, value: string) =>
    setDrugs((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  if (!data || (data.status === "pending" && !manualMode)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-5xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-600 font-medium">처방전을 분석하고 있어요...</p>
        <p className="text-sm text-gray-400 mt-1">잠시만 기다려주세요</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">
            {manualMode ? "약물 직접 입력" : "OCR 결과 확인"}
          </h1>
          {data?.confidence && !manualMode && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              인식률 {Math.round(data.confidence * 100)}%
            </span>
          )}
          {manualMode && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              직접 입력 모드
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500">
          {manualMode
            ? "처방받은 약물 정보를 직접 입력해주세요"
            : "내용을 확인하고 수정이 필요하면 수정해주세요"}
        </p>

        {drugs.map((drug, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600">약물 {i + 1}</span>
              <button onClick={() => setDrugs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-400">삭제</button>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">약품명</div>
              <input value={drug.name} onChange={(e) => update(i, "name", e.target.value)}
                placeholder="예: 타이레놀 500mg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">용량</div>
                <input value={drug.dosage} onChange={(e) => update(i, "dosage", e.target.value)}
                  placeholder="예: 500mg"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">복용횟수</div>
                <select value={drug.frequency} onChange={(e) => update(i, "frequency", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option>1일 1회</option>
                  <option>1일 2회</option>
                  <option>1일 3회</option>
                </select>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">복용시점</div>
              <select value={drug.timing} onChange={(e) => update(i, "timing", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(TIMING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        ))}

        <button onClick={() => setDrugs((p) => [...p, { ...EMPTY_DRUG }])}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
          + 약물 추가
        </button>

        <button
          onClick={() => confirm(drugs, { onSuccess: () => router.push("/schedule") })}
          disabled={isConfirming || drugs.length === 0 || drugs.every(d => !d.name)}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 hover:bg-emerald-700">
          {isConfirming ? "스케줄 생성 중..." : "복약 스케줄 생성하기 →"}
        </button>

        <p className="text-xs text-gray-400 text-center">※ 본 서비스는 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}
