"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResidentRole } from "@/lib/auth-roles";
import { isCommittee } from "@/lib/auth-roles";

const committeeNavLinks = [
  { href: "/my", label: "My page" },
  { href: "/admin", label: "Overview" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/units", label: "Units" },
  { href: "/admin/diesel", label: "Diesel Fund" },
  { href: "/admin/service-charge", label: "Service Charge" },
  { href: "/admin/facility", label: "Facility" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/residents", label: "Residents" },
];

const facilityManagerNavLinks = [
  { href: "/my", label: "My page" },
  { href: "/admin/requests", label: "Requests" },
];

export function AdminNav({
  estateName,
  role,
}: {
  estateName: string;
  role: ResidentRole;
}) {
  const navLinks = isCommittee(role) ? committeeNavLinks : facilityManagerNavLinks;
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 md:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {estateName}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded p-2 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>
      <aside
        className={`w-full border-b border-zinc-200 bg-zinc-50 px-4 py-4 print:hidden md:block md:w-56 md:border-b-0 md:border-r md:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 md:dark:bg-zinc-950 ${
          open ? "block" : "hidden md:block"
        }`}
      >
        <h2 className="mb-4 hidden font-semibold text-zinc-900 dark:text-zinc-100 md:block">
          {estateName}
        </h2>
        <nav className="flex flex-col gap-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 active:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
