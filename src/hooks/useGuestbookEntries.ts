import type { NDKEvent, NDKUserProfile } from "@nostr-dev-kit/ndk";
import { useEffect, useState } from "react";
import { entriesFilter, entryMeta, eventToPost } from "../lib/entry";
import { ndk } from "../lib/ndk";
import type { Post } from "../types/post";

/**
 * Live-subscribe to every signature on a host's guestbook and map them to
 * `Post`s, newest first. Real (non-anonymous) signers get their kind-0 profile
 * fetched lazily; anonymous guest signatures never do.
 */
export function useGuestbookEntries(host: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPosts([]);
    setLoading(true);

    const events = new Map<string, NDKEvent>();
    const profiles = new Map<string, NDKUserProfile | null>();
    const requested = new Set<string>();
    let alive = true;

    const flush = () => {
      if (!alive) return;
      setPosts(
        [...events.values()]
          .map((e) => eventToPost(e, profiles.get(e.pubkey)))
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    };

    const sub = ndk.subscribe(entriesFilter(host), { closeOnEose: false });

    sub.on("event", (event: NDKEvent) => {
      events.set(event.id, event);
      flush();

      // Fetch the author's profile once, but only for real signatures.
      const meta = entryMeta(event);
      if (!meta.anonymous && !requested.has(event.pubkey)) {
        requested.add(event.pubkey);
        ndk
          .getUser({ pubkey: event.pubkey })
          .fetchProfile()
          .then((profile) => {
            profiles.set(event.pubkey, profile ?? null);
            flush();
          })
          .catch(() => {});
      }
    });
    sub.on("eose", () => alive && setLoading(false));

    return () => {
      alive = false;
      sub.stop();
    };
  }, [host]);

  return { posts, loading };
}
