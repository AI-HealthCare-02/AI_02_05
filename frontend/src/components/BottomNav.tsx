"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/schedule", label: "복약", icon: "⏰" },
  { href: "/chat",     label: "AI 상담", icon: "💬" },
  { href: "/settings", label: "설정", icon: "⚙️" },
];

const HIDE_ON = ["/login", "/auth", "/upload", "/ocr"];

export default function BottomNav() {
  const path = usePathname();
  if (HIDE_ON.some((p) => path.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                    bg-white border-t border-gray-200 flex z-50">
      {tabs.map(({ href, label, icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors
              ${active ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
            <span className="text-xl">{icon}</span>
            <span className={`text-xs font-medium ${active ? "text-emerald-600" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
