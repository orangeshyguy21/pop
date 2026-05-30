import { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";

// A guest signs with a throwaway keypair that lives only in this browser. It is
// persisted so the same visitor keeps one identity across signatures (and can
// edit/delete their own entries) — but it is never surfaced as a real profile.
const STORAGE_KEY = "pop-guest";

let cached: NDKPrivateKeySigner | null = null;

/** Get (or lazily generate + persist) this browser's guest signer. */
export function getGuestSigner(): NDKPrivateKeySigner {
  if (cached) return cached;

  const stored =
    typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored) {
    try {
      cached = new NDKPrivateKeySigner(stored);
      return cached;
    } catch {
      // Corrupt value — fall through and mint a fresh one.
    }
  }

  const signer = NDKPrivateKeySigner.generate();
  cached = signer;
  try {
    localStorage.setItem(STORAGE_KEY, signer.nsec);
  } catch {
    // Storage unavailable (private mode); the in-memory key still works for now.
  }
  return signer;
}
