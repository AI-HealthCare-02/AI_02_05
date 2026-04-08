"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/schedule", label: "복약", icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth="3" /><line x1="12" y1="14" x2="12" y2="14" strokeWidth="3" /><line x1="8" y1="18" x2="8" y2="18" strokeWidth="3" />
    </svg>
  )},
  { href: "/chat", label: "AI 상담", icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )},
  { href: "/settings", label: "설정", icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )},
];

const HIDE_ON = ["/login", "/auth", "/upload", "/ocr"];

export default function BottomNav() {
  const path = usePathname();
  if (HIDE_ON.some((p) => path.startsWith(p))) return null;

  return (
    // 전체 배경과 테두리를 다크 모드(dark:bg-gray-900, dark:border-gray-800)에 맞게 변경하고 부드러운 전환 효과(transition-colors duration-200) 추가
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex z-50 shadow-lg transition-colors duration-200">
      {tabs.map(({ href, label, icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors relative">
            {/* 활성화 상태일 때 윗부분에 뜨는 보라색 표시선도 다크 모드에 맞춰 살짝 밝게(dark:bg-violet-400) 변경 */}
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-600 dark:bg-violet-400 rounded-full" />}
            
            {/* 아이콘 색상: 활성화/비활성화 상태에 맞춰 다크 모드 색상(dark:text-violet-400, dark:text-gray-500) 추가 */}
            <span className={active ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500"}>
              {icon(active)}
            </span>
            
            {/* 텍스트 색상: 아이콘과 동일하게 다크 모드 색상 추가 */}
            <span className={`text-[10px] font-semibold transition-colors ${active ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
