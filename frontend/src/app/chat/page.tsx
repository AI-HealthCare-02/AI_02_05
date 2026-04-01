"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    contentRef.current = "";

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);

    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      headers["X-User-Id"] = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";
    }

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userMsg }),
      });

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              contentRef.current += data.content;
              const current = contentRef.current;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: current };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-purple-700 px-4 pt-12 pb-4 text-white">
        <h1 className="text-lg font-bold">AI 건강 상담</h1>
        <p className="text-xs text-purple-200 mt-0.5">복약 관련 궁금한 점을 물어보세요</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-600 text-sm mb-4">어떤 게 궁금하세요?</p>
            <div className="space-y-2">
              {[
                "타이레놀 하루에 몇 번 먹어요?",
                "항생제 먹을 때 주의사항은?",
                "약 먹고 술 마셔도 돼요?",
              ].map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="block w-full text-left text-sm bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-800 font-medium hover:border-purple-500 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === "user"
                ? "bg-purple-700 text-white rounded-br-sm font-medium"
                : "bg-white text-gray-900 shadow-sm rounded-bl-sm border border-gray-200"}`}>
              {msg.content || (
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 sticky bottom-0">
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && send()}
            placeholder="질문을 입력하세요..."
            style={{ color: "#111827" }}
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm
              focus:outline-none focus:border-purple-500 bg-gray-50 placeholder-gray-500"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="w-10 h-10 bg-purple-700 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-purple-800 transition-colors flex-shrink-0">
            ↑
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          ※ AI 답변은 참고용이며 의료 행위를 대체하지 않습니다
        </p>
      </div>
    </main>
  );
}
