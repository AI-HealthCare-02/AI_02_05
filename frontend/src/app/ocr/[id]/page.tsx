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
  const [timedOut, setTimedOut] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const { data } = useOCRStatus(id, polling);
  const { mutate: confirm, isPending: isConfirming } = useConfirm(id);

  useEffect(() => {
  if (data?.status === "done" && polling) {
    setPolling(false);
  } else if (data?.status === "failed" && polling) {
    setPolling(false);
  }
}, [data?.status, polling]);

useEffect(() => {
  if (data?.status === "done" && data.parsed_drugs) {
    setDrugs(data.parsed_drugs);
  }
}, [data?.status, data?.parsed_drugs]);

useEffect(() => {
  if (data?.status === "failed") {
    setManualMode(true);
    setDrugs([{ ...EMPTY_DRUG }]);
  }
}, [data?.status]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => setLoadingDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [polling]);

  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => {
      setTimedOut(true);
      setPolling(false);
    }, 20000);
    return () => clearTimeout(timer);
  }, [polling]);

  const update = (i: number, field: keyof ParsedDrug, value: string) =>
    setDrugs((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  if (timedOut) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-4xl">😔</span>
        </div>
        <h2 className="text-xl font-bold mb-2">인식 시간이 초과됐어요</h2>
        <p className="text-violet-200 text-sm mb-6 text-center">
          처방전 사진이 흐리거나 빛 반사가 있으면 인식이 어려울 수 있어요.<br />
          다시 촬영하거나 직접 입력해주세요.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <button onClick={() => router.push("/upload")}
            className="w-full bg-white text-violet-600 font-bold py-3.5 rounded-2xl hover:bg-violet-50 transition-colors">
            📸 다시 촬영하기
          </button>
          <button onClick={() => { setTimedOut(false); setManualMode(true); setDrugs([{ ...EMPTY_DRUG }]); }}
            className="w-full bg-white/20 text-white font-semibold py-3.5 rounded-2xl hover:bg-white/30 transition-colors">
            ✏️ 직접 입력하기
          </button>
        </div>
        <div className="w-full max-w-sm mt-6">
          <p className="text-violet-200 text-xs mb-2 text-center">불편사항을 남겨주시면 개선에 반영할게요</p>
          {feedbackSent ? (
            <p className="text-center text-sm text-white font-semibold">✅ 소중한 의견 감사해요!</p>
          ) : (
            <div className="flex gap-2">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="어떤 점이 불편하셨나요?"
                className="flex-1 bg-white/20 text-white placeholder-violet-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:bg-white/30"
              />
              <button
                onClick={async () => {
                  if (!feedback.trim()) return;
                  try {
                    const token = localStorage.getItem("access_token");
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/feedback`, {
                      method: "POST", headers,
                      body: JSON.stringify({ content: feedback, page: "ocr_timeout" }),
                    });
                  } catch {}
                  setFeedbackSent(true);
                }}
                className="bg-white text-violet-600 font-semibold px-4 rounded-xl text-sm hover:bg-violet-50">
                전송
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (!data || (data.status === "pending" && !manualMode)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-4xl">📋</span>
        </div>
        <h2 className="text-xl font-bold mb-2">처방전 분석 중</h2>
        <p className="text-violet-200 text-sm mb-6">AI가 약물 정보를 인식하고 있어요{"." + ".".repeat(loadingDots)}</p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full bg-white transition-opacity ${loadingDots > i ? "opacity-100" : "opacity-30"}`} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button onClick={() => router.back()} className="text-violet-200 text-sm mb-3 flex items-center gap-1">‹ 뒤로</button>
        <h1 className="text-xl font-bold">{manualMode ? "약물 직접 입력" : "OCR 결과 확인"}</h1>
        <p className="text-violet-200 text-xs mt-0.5">
          {manualMode ? "처방받은 약물 정보를 직접 입력해주세요" : "내용을 확인하고 필요하면 수정해주세요"}
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24">
        {!manualMode && data?.confidence && (
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
            <span className="text-sm text-gray-600">인식률</span>
            <span className={`text-sm font-bold ${data.confidence > 0.8 ? "text-emerald-600" : "text-amber-500"}`}>
              {Math.round(data.confidence * 100)}%
            </span>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">⚠️ 확인 필수</p>
          <p>AI 인식 결과가 실제 처방전과 다를 수 있습니다.</p>
          <p>반드시 처방전 원본과 대조 후 수정하여 사용하세요.</p>
        </div>

        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">질병명 (선택)</label>
          <input
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="예: 고혈압, 당뇨, 위염..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        {drugs.map((drug, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-violet-600">약물 {i + 1}</span>
              <button onClick={() => setDrugs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-400 hover:text-red-600">삭제</button>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">약품명</div>
              <input value={drug.name} onChange={(e) => update(i, "name", e.target.value)}
                placeholder="예: 타이레놀 500mg"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">용량</div>
                <input value={drug.dosage} onChange={(e) => update(i, "dosage", e.target.value)}
                  placeholder="예: 500mg"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">복용횟수</div>
                <select value={drug.frequency} onChange={(e) => update(i, "frequency", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                  <option>1일 1회</option>
                  <option>1일 2회</option>
                  <option>1일 3회</option>
                  <option>1일 4회</option>
                  <option>필요시</option>
                </select>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">복용시점</div>
              <select value={drug.timing} onChange={(e) => update(i, "timing", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                {Object.entries(TIMING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        ))}

        <button onClick={() => setDrugs((p) => [...p, { ...EMPTY_DRUG }])}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-3 text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors">
          + 약물 추가
        </button>

        <button
          onClick={() => confirm(
            { drugs, disease_name: diseaseName },
            { onSuccess: () => router.push("/schedule") }
          )}
          disabled={isConfirming || drugs.length === 0 || drugs.every((d) => !d.name)}
          className="w-full bg-violet-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 hover:bg-violet-700 transition-colors">
          {isConfirming ? "스케줄 생성 중..." : "복약 스케줄 생성하기 →"}
        </button>

        <p className="text-xs text-gray-400 text-center">※ 본 서비스는 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}