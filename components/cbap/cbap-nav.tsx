"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/cbap", label: "Dashboard" },
  { href: "/cbap/learn", label: "Learn" },
  { href: "/cbap/flashcards", label: "Flashcards" },
  { href: "/cbap/quiz", label: "Quiz" },
  { href: "/cbap/plan", label: "Study Plan" },
  { href: "/cbap/eligibility", label: "Eligibility" },
];

export function CbapNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-row gap-1 overflow-x-auto border-b border-black/10 bg-black/[.03] p-2 md:min-h-screen md:w-56 md:flex-col md:border-b-0 md:border-r dark:border-white/15 dark:bg-white/[.04]">
      <div className="hidden px-2 py-3 text-sm font-semibold md:block">CBAP Prep</div>
      {LINKS.map((l) => {
        const active = l.href === "/cbap" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
              active ? "bg-black/10 font-medium dark:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
