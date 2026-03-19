"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { sendNoticeToResidents } from "@/lib/actions/email";

interface Notice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  created_at_formatted: string;
}

export function NoticesView({ notices }: { notices: Notice[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create notice
        </button>
      </div>

      {notices.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            No notices yet. Create one to post to the estate notice board.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) =>
            editingId === notice.id ? (
              <EditNoticeForm
                key={notice.id}
                notice={notice}
                onSaved={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={notice.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {notice.title}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <EmailNoticeButton noticeId={notice.id} />
                    <button
                      onClick={() => setEditingId(notice.id)}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Edit
                    </button>
                    <DeleteNoticeButton
                      noticeId={notice.id}
                      onDeleted={() => router.refresh()}
                    />
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {notice.body}
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {notice.created_at_formatted}
                </p>
              </div>
            )
          )}
        </div>
      )}

      {showCreate && (
        <CreateNoticeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EmailNoticeButton({ noticeId }: { noticeId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await sendNoticeToResidents(noticeId);
      if (result.success) {
        toast.success("Notice emailed to all residents");
      } else {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to send emails"
        );
      }
    } catch {
      toast.error("Failed to send emails");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
    >
      {loading ? "Sending…" : "Email to residents"}
    </button>
  );
}

function CreateNoticeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        body: body.trim(),
        posted_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Notice created");
      onCreated();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Create notice</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              placeholder="Notice title"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              placeholder="Notice content..."
              rows={5}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditNoticeForm({
  notice,
  onSaved,
  onCancel,
}: {
  notice: Notice;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(notice.title);
  const [body, setBody] = useState(notice.body);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("notices")
        .update({ title: title.trim(), body: body.trim() })
        .eq("id", notice.id);
      if (error) throw error;
      toast.success("Notice updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border px-3 py-2 font-semibold dark:bg-zinc-800"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
          rows={5}
          required
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteNoticeButton({
  noticeId,
  onDeleted,
}: {
  noticeId: string;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this notice?")) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notices").delete().eq("id", noticeId);
      if (error) throw error;
      toast.success("Notice deleted");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
