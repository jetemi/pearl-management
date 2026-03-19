"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  createResidentRequest,
  type CreateRequestWhatsAppLink,
} from "@/lib/actions/requests";

export function NewRequestForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    whatsappLinks: CreateRequestWhatsAppLink[];
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createResidentRequest(title, body);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDone({
        id: result.id,
        whatsappLinks: result.whatsappLinks,
      });
      setTitle("");
      setBody("");
      toast.success("Request submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          Request sent
        </h2>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          All facility managers with an email on their account were notified.
          You can also open WhatsApp for each manager below (uses phone numbers
          from the resident profile or unit registry).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {done.whatsappLinks.map((link, i) => (
            <a
              key={`${link.label}-${i}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20bd5a]"
            >
              {link.label}
            </a>
          ))}
          <Link
            href={`/my/requests/${done.id}`}
            className="inline-flex rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
          >
            View request
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="req-title"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Title
        </label>
        <input
          id="req-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Short summary"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label
          htmlFor="req-body"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Message
        </label>
        <textarea
          id="req-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          placeholder="Describe what you need from facility management…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
