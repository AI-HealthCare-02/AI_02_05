"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOCRStatus, useConfirm } from "@/hooks/useOCR";
import { ParsedDrug } from "@/types";

const TIMING: Record<string, string> = {
  after_meal: "식후", before_meal: "식전", bedtime: "취침 전",
  morning: "아침", evening: "저녁", empty_stomach: "공복", custom: "직접 입력",
};

const EMPTY_DRUG: ParsedDrug = { name: "", dosage: "", frequency: "1일 1회", timing: "after_meal", custom_time: "" };

export default function OCRResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [drugs, setDrugs] = useState<ParsedDrug[]>([]);
  const [polling, setPolling] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [loadingDots, setLoadingDots] = useState(0);
  const [diseaseName, setDiseaseName] = useState("");
  const { data, isError } = useOCRStatus(id, polling);
  const { mutate: confirm, isPending: isConfirming } = useConfirm(id);

  useEffect(() => {
    if (data?.status === "done") { setPolling(false); setDrugs(data.parsed_drugs ?? []); }
    if (data?.status === "failed") { setPolling(false); setManualMode(true); setDrugs([{ ...EMPTY_DRUG }]); }
  }, [data]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => setLoadingDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [polling]);

  const update = (i: number, field: keyof ParsedDrug, value: string) =>
    setDrugs((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  if (!data || (data.status === "pending" && !manualMode)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-4xl">📋</span>
        </div>
        <h2 className="text-xl font-bold mb-2">처방전 분석 중</h2>
        <p className="text-violet-200 text-sm mb-6">AI가 약물 정보를 인식하고 있어요{"."+ ".".repeat(loadingDots)}</p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full bg-white transition-opacity ${loadingDots > i ? "opacity-100" : "opacity-30"}`} />
          ))}
        </div>
        <p className="text-violet-300 text-xs mt-8">보통 10~20초 정도 걸려요</p>
        <button onClick={() => { setManualMode(true); setPolling(false); setDrugs([{ ...EMPTY_DRUG }]); }}
          className="mt-4 text-xs text-violet-300 hover:text-white underline transition-colors">
          인식이 너무 오래 걸리나요? 직접 입력하기
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3">‹ 뒤로</button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{manualMode ? "약물 직접 입력" : "OCR 결과 확인"}</h1>
          {data?.confidence && !manualMode && (
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
              인식률 {Math.round(data.confidence * 100)}%
            </span>
          )}
        </div>
        <p className="text-violet-200 text-xs mt-1">
          {manualMode ? "처방받은 약물 정보를 직접 입력해주세요" : "내용을 확인하고 필요하면 수정해주세요"}
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-32">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 text-xs text-amber-700">
          <p className="font-bold mb-1">⚠️ 반드시 확인하세요</p>
          <p className="leading-relaxed">AI 인식 결과가 실제 처방전과 다를 수 있어요. 처방전 원본과 대조 후 수정해주세요.</p>
        </div>

        {/* 질환명 입력 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">질환명 <span className="text-gray-300">(선택)</span></p>
          <input
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="예: 고혁압, 당뇨, 고지혁증..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <p className="text-xs text-gray-400 mt-1.5">입력하면 복약 스케줄에서 질환명으로 분류되어 보여요</p>
        </div>

        {drugs.map((drug, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-violet-50">
              <span className="text-xs font-bold text-violet-600">약물 {i + 1}</span>
              <button onClick={() => setDrugs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-400 hover:text-red-500">삭제</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">약품명</p>
                <input value={drug.name} onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="예: 타이레놀 500mg"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">용량</p>
                  <input value={drug.dosage} onChange={(e) => update(i, "dosage", e.target.value)}
                    placeholder="예: 500mg"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">복용횟수</p>
                  <select value={drug.frequency} onChange={(e) => update(i, "frequency", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400">
                    <option>1일 1회</option><option>1일 2회</option><option>1일 3회</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">복용시점</p>
                <select value={drug.timing} onChange={(e) => update(i, "timing", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400">
                  {Object.entries(TIMING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {drug.timing === "custom" && (
                  <input
                    type="time"
                    value={drug.custom_time ?? ""}
                    onChange={(e) => update(i, "custom_time", e.target.value)}
                    className="w-full mt-2 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => setDrugs((p) => [...p, { ...EMPTY_DRUG }])}
          className="w-full border-2 border-dashed border-violet-200 rounded-2xl py-3.5 text-sm text-violet-500 font-medium hover:border-violet-400 hover:bg-violet-50 transition-all">
          + 약물 추가
        </button>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
        <button
          onClick={() => confirm({ drugs, disease_name: diseaseName || undefined }, { onSuccess: () => router.push("/schedule") })}
          disabled={isConfirming || drugs.length === 0 || drugs.every((d) => !d.name)}
          className="w-full bg-violet-600 text-white font-bold py-4 rounded-2xl disabled:opacity-40 hover:bg-violet-700 transition-colors">
          {isConfirming ? "스케줄 생성 중..." : `복약 스케줄 생성하기 (${drugs.filter(d => d.name).length}개 약물)`}
        </button>
        <p className="text-xs text-gray-300 text-center mt-2">※ 본 서비스는 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}
