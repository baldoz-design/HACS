"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

const NAV_LINKS = [
  { href: "/", label: "Entity Map" },
  { href: "/dg-strategy", label: "DG Strategy" },
  { href: "/non-dg-strategy", label: "Non-DG Strategy" },
  { href: "/ted-spend", label: "TED Spend" },
  { href: "/competitors", label: "Magicissimi" },
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
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#10B981]/15 text-[#B9F6D3] border border-[#10B981]/30">
      AI · {ai.provider}
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/10 text-white/60 border border-white/10">
      AI off
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-white/10 px-6 py-0 flex items-center justify-between h-[56px]">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-white"
        >
          <span className="flex items-center justify-center">
            <span className="flex h-11 w-[72px] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://www.dstech.it/wp-content/uploads/2024/03/logo-dst-white.svg"
                alt="Dst logo"
                className="h-[40px] w-auto object-contain"
              />
            </span>
            <span className="-ml-2 flex h-11 w-[78px] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i0.wp.com/theimaginationmachine.org/wp-content/uploads/2020/11/BCG-logo-white.png"
                alt="BCG logo"
                className="h-[37px] w-auto object-contain"
              />
            </span>
          </span>
          <span className="font-bold tracking-tight text-lg leading-none text-white">
            EU HACS Dashboard
          </span>
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
                    ? "bg-white text-black font-medium"
                    : "text-white/65 hover:text-white hover:bg-white/10"
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
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/10 text-white/75 border border-white/15">
          Public sources
        </span>
      </div>
    </header>
  );
}
