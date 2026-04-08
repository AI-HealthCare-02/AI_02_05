"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "pillmate_chat_history";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setMessages(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    contentRef.current = "";
    setMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setLoading(true);

    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else headers["X-User-Id"] = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/chat/stream`, {
        method: "POST", headers, body: JSON.stringify({ message: userMsg }),
      });
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              contentRef.current += data.content;
              const cur = contentRef.current;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: cur }; return u; });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요." }; return u; });
    } finally { setLoading(false); }
  };

  const clearHistory = () => {
    if (confirm("대화 기록을 모두 삭제할까요?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    // ✅ 전체 배경 다크모드 추가 (dark:bg-gray-900)
    <main className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-5 pt-12 pb-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">AI 건강 상담</h1>
            <p className="text-violet-200 text-xs mt-0.5">복약 정보를 기반으로 맞춤 답변해드려요</p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="text-xs text-violet-300 hover:text-white transition-colors">
              대화 초기화
            </button>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        {messages.length === 0 && (
          <div className="pt-4">
            <div className="text-center mb-6">
              {/* ✅ 아이콘 배경 다크모드 (dark:bg-violet-900/30) */}
              <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <span className="text-3xl">🤖</span>
              </div>
              <p className="text-gray-700 dark:text-white font-semibold">무엇이 궁금하세요?</p>
              <p className="text-gray-400 dark:text-gray-400 text-xs mt-1">현재 복약 중인 약물을 기반으로 답변해드려요</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: "💊", text: "지금 먹는 약 부작용이 뭐예요?" },
                { icon: "📋", text: "지금 먹는 약에 대해 알려줘" },
                { icon: "🍺", text: "약 먹고 술 마셔도 돼요?" },
              ].map(({ icon, text }) => (
                <button key={text} onClick={() => setInput(text)}
                  // ✅ 추천 질문 박스 다크모드 (dark:bg-gray-800, dark:border-gray-700)
                  className="flex items-center gap-3 w-full text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3.5 hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-sm transition-all">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {msg.role === "assistant" && (
              // ✅ 챗봇 프로필 아이콘 배경 다크모드
              <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors
              ${msg.role === "user"
                ? "bg-violet-600 text-white rounded-br-sm" // 사용자의 말풍선 (변경 없음)
                // ✅ 챗봇의 말풍선 다크모드 (dark:bg-gray-800, dark:text-gray-100)
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm rounded-bl-sm border border-gray-100 dark:border-gray-700"}`}>
              {msg.content || (
                <span className="flex gap-1 items-center h-4">
                  {[0, 0.15, 0.3].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-violet-300 dark:bg-violet-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      {/* ✅ 하단 입력창 배경 다크모드 (dark:bg-gray-900) */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 sticky bottom-0 shadow-lg transition-colors">
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && send()}
            placeholder="궁금한 점을 입력하세요..."
            // ✅ 입력 필드(input) 다크모드 (dark:bg-gray-800, dark:text-white)
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 text-sm text-gray-800 dark:text-white
              focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 bg-gray-50 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-violet-700 transition-colors flex-shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-500 text-center mt-2">AI 답변은 참고용이며 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}