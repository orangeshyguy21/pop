/** Floating search input, top-center. Filters by dimming non-matches. */
export function SearchPill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/5 bg-white/90 px-4 py-2 shadow-lg backdrop-blur">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="text-neutral-400"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search the guestbook…"
          className="w-56 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-neutral-400 hover:text-neutral-700"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
