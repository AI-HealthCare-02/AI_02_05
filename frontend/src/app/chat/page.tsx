"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "pillmate_chat_history";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setMessages(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");
    contentRef.current = "";
    setMessages((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setLoading(true);

    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else headers["X-User-Id"] = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";

    try {
      const resp = await fetch(`${API_URL}/api/chat/stream`, {
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
      if (contentRef.current) {
        const utterance = new SpeechSynthesisUtterance(contentRef.current.replace(/[#*`]/g, ""));
        utterance.lang = "ko-KR";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요." }; return u; });
    } finally { setLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          const token = localStorage.getItem("access_token");
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`${API_URL}/api/voice/transcribe`, {
            method: "POST", headers, body: formData,
          });
          const data = await res.json();
          if (data.text) await send(data.text);
        } catch {
          alert("음성 인식에 실패했어요. 다시 시도해주세요.");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorder.start();
      setRecording(true);
    } catch {
      alert("마이크 권한을 허용해주세요.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const clearHistory = () => {
    if (confirm("대화 기록을 모두 삭제할까요?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      window.speechSynthesis.cancel();
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        {messages.length === 0 && (
          <div className="pt-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🤖</span>
              </div>
              <p className="text-gray-700 font-semibold">무엇이 궁금하세요?</p>
              <p className="text-gray-400 text-xs mt-1">현재 복약 중인 약물을 기반으로 답변해드려요</p>
              <p className="text-gray-400 text-xs mt-0.5">🎤 마이크 버튼을 누르고 말씀하세요</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: "💊", text: "지금 먹는 약 부작용이 뭐예요?" },
                { icon: "📋", text: "지금 먹는 약에 대해 알려줘" },
                { icon: "🍺", text: "약 먹고 술 마셔도 돼요?" },
              ].map(({ icon, text }) => (
                <button key={text} onClick={() => send(text)}
                  className="flex items-center gap-3 w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-violet-300 hover:shadow-sm transition-all">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === "user"
                ? "bg-violet-600 text-white rounded-br-sm"
                : "bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100"}`}>
              {msg.role === "assistant" && msg.content ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                  }}>
                  {msg.content}
                </ReactMarkdown>
              ) : msg.role === "user" ? (
                msg.content
              ) : (
                <span className="flex gap-1 items-center h-4">
                  {[0, 0.15, 0.3].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-violet-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0 shadow-lg">
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            value={transcribing ? "음성 인식 중..." : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && send()}
            placeholder="궁금한 점을 입력하거나 🎤 버튼을 눌러 말씀하세요"
            disabled={transcribing}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800
              focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-gray-50 placeholder-gray-400 transition-all disabled:opacity-60"
          />
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={loading || transcribing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm
              ${recording ? "bg-red-500 scale-110 animate-pulse" : "bg-violet-100 hover:bg-violet-200"}
              disabled:opacity-40`}>
            <span className="text-lg">{recording ? "🔴" : "🎤"}</span>
          </button>
          <button onClick={() => send()} disabled={loading || !input.trim() || transcribing}
            className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-violet-700 transition-colors flex-shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-300 text-center mt-2">AI 답변은 참고용이며 의료 행위를 대체하지 않습니다</p>
      </div>
    </main>
  );
}