"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

const NAV_LINKS = [
  { href: "/", label: "Entity Map" },
  { href: "/propose", label: "Proposal Lab" },
  { href: "/import", label: "Import" },
  { href: "/competitors", label: "Competitors" },
  { href: "/outreach", label: "Outreach" },
];

function AIBadge() {
  const [ai, setAi] = useState<{ available: boolean; provider?: string } | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/api/ai/status`)
      .then((r) => r.json())
      .then(setAi)
      .catch(() => {});
  }, []);
  if (!ai) return null;
  return ai.available ? (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
      AI · {ai.provider}
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[var(--border)] text-[var(--text-2)]">
      AI off
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-0 flex items-center justify-between h-[53px]">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-bold text-[var(--text-1)] tracking-tight text-lg leading-none"
        >
          hacs-intelligence
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "bg-[var(--text-1)] text-white font-medium"
                    : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--border)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <AIBadge />
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#D4A017] border border-[#F59E0B]/20">
          Demo data
        </span>
      </div>
    </header>
  );
}
