import { nip19 } from "@nostr-dev-kit/ndk";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { connectNdk } from "../lib/ndk";
import { fetchAllPops, type Pop } from "../lib/pop";
import { useAuthStore } from "../store/auth";
import { PopCreator } from "./PopCreator";

export function GuestbookListPage() {
  const [pops, setPops] = useState<Pop[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    connectNdk()
      .then(() => fetchAllPops())
      .then((list) => active && setPops(list))
      .catch(() => active && setPops([]));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!pops) return null;
    const q = query.trim().toLowerCase();
    if (!q) return pops;
    return pops.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [pops, query]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <img
          src="/logo-dark.jpeg"
          alt="Pop logo"
          className="h-16 w-16 rounded-2xl"
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Guestbooks</h1>
        <p className="mt-2 max-w-md text-neutral-400">
          Decentralized guestbooks on Nostr. Find one to sign, or create your
          own.
        </p>
      </div>

      <OwnerSection />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search guestbooks…"
        className="mt-8 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-neutral-600"
      />

      <div className="mt-6">
        {filtered === null ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Loading guestbooks…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            {query.trim()
              ? "No guestbooks match your search."
              : "No guestbooks yet. Be the first to create one."}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((pop) => (
              <GuestbookCard key={`${pop.host}:${pop.id}`} pop={pop} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function GuestbookCard({ pop }: { pop: Pop }) {
  const npub = useMemo(() => {
    try {
      return nip19.npubEncode(pop.host);
    } catch {
      return pop.host;
    }
  }, [pop.host]);

  return (
    <li>
      <Link
        to={`/p/${npub}`}
        className="block h-full rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 transition hover:border-neutral-600 hover:bg-neutral-900"
      >
        <h2 className="font-semibold">{pop.name}</h2>
        {pop.description && (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
            {pop.description}
          </p>
        )}
      </Link>
    </li>
  );
}

function OwnerSection() {
  const status = useAuthStore((s) => s.status);
  const pubkey = useAuthStore((s) => s.pubkey);
  const [open, setOpen] = useState(false);

  if (status !== "authenticated" || !pubkey) return null;

  return (
    <div className="mt-8 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        {open ? "Close" : "Create / edit your guestbook"}
      </button>
      {open && (
        <div className="mt-6 w-full">
          <PopCreator host={pubkey} />
        </div>
      )}
    </div>
  );
}
