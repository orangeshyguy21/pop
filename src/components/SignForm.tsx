import { useRef, useState } from "react";
import { signGuestbookEntry } from "../lib/sign";
import { useAuthStore } from "../store/auth";

async function imageDimensions(
  file: File,
): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function SignForm({
  host,
  onSigned,
}: {
  host: string;
  onSigned?: () => void;
}) {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const authPubkey = useAuthStore((s) => s.pubkey);
  const loggedIn = status === "authenticated" && !!authPubkey;

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    !submitting && (name.trim() || message.trim() || file);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const dims = file ? await imageDimensions(file) : undefined;
      await signGuestbookEntry({
        host,
        name: name.trim() || undefined,
        message: message.trim(),
        file,
        imageDims: dims,
      });
      setName("");
      setMessage("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onSigned?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
    >
      <h2 className="text-lg font-semibold">Sign the guestbook</h2>

      {loggedIn ? (
        <p className="text-xs text-neutral-500">
          Signing as{" "}
          <span className="text-neutral-300">
            {profile?.displayName || profile?.name || "your Nostr account"}
          </span>
          .
        </p>
      ) : (
        <p className="text-xs text-neutral-500">
          Signing as a guest — no account needed.
        </p>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-400">Name (optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-400">Message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a note…"
          rows={3}
          maxLength={1000}
          className="w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-neutral-400">Photo (optional)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-200 hover:file:bg-neutral-700"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Signing…" : "Sign"}
      </button>
    </form>
  );
}
