import type { Post } from "../types/post";

// Deterministic mock data so the wall is stable between reloads (no Math.random
// at module scope). ~120 varied entries: short/long messages, with/without
// media, varied authors. Replace `loadPosts` with an NDK subscription later.

const NAMES = [
  "satoshi", "hodlqueen", "blockbard", "neon", "mara", "zaphod", "lune",
  "pixelpriest", "orbit", "saffron", "dusk", "vega", "koi", "marlow", "indigo",
  "rune", "tomo", "cleo", "fern", "atlas", "wren", "juno", "cosmo", "echo",
  "iris", "nox", "pax", "quill", "sol", "tate",
];

const MESSAGES = [
  "gm from the guestbook ✨",
  "what a night. thank you for having us — the lights, the music, all of it.",
  "first time signing a nostr guestbook and honestly it slaps",
  "left my heart on the dancefloor 💃",
  "proof of presence 🫡",
  "this is the future of memories. decentralized & forever.",
  "congrats you two!! so happy for you ❤️ wishing a lifetime of zaps",
  "best wedding i've been to all year, no notes",
  "the cake was unreal. whoever made it: marry me",
  "signed, sealed, on-chain (well, on relays)",
  "had the time of my life. see you all next year 🌅",
  "popped in to say hi 👋 great party",
  "to many more 🥂",
  "the playlist was immaculate. shazam was working overtime",
  "thanks for the invite — felt like home",
  "wagmi 🚀",
  "ok but the sunset though",
  "leaving a note so future me remembers how good this felt",
  "you really brought everyone together. magic.",
  "10/10 would attend again",
  "i don't usually do this but tonight earned a post",
  "for the timeline 📸",
  "purple skies, good vibes, better people",
  "may your relays stay online and your zaps stay flowing",
  "showed up for the vibes, stayed for the people",
  "this guestbook is such a vibe. who built this?",
  "absolutely unforgettable. thank you 🙏",
  "we danced until the relays went quiet",
];

// A pseudo-random but deterministic picker seeded by index.
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const COUNT = 120;

export const mockPosts: Post[] = Array.from({ length: COUNT }, (_, i) => {
  const name = pick(NAMES, i * 7 + 3);
  const pubkey = `mockpubkey${i.toString(16).padStart(4, "0")}`;
  // ~40% of posts carry an image.
  const hasMedia = (i * 13 + 5) % 10 < 4;
  // vary message length by stitching 1-3 lines together deterministically
  const reps = (i % 3) + 1;
  const message = Array.from({ length: reps }, (_, r) =>
    pick(MESSAGES, i * 5 + r * 11 + 1),
  ).join(" ");

  return {
    id: `mockevent${i.toString(16).padStart(6, "0")}`,
    author: {
      pubkey,
      displayName: name,
      avatarUrl: `https://i.pravatar.cc/150?u=${pubkey}`,
      nip05: i % 4 === 0 ? `${name}@pop.example` : undefined,
    },
    message,
    media: hasMedia
      ? {
          url: `https://picsum.photos/seed/${i}/600/${360 + ((i * 37) % 300)}`,
          type: "image",
          width: 600,
          height: 360 + ((i * 37) % 300),
        }
      : undefined,
    // newest first; space them ~7 min apart, anchored to a fixed epoch
    createdAt: 1_750_000_000 - i * 420,
    reactions: (i * 3) % 17,
    zaps: (i * 5) % 9,
  };
});

/**
 * Single async seam for data loading. Swap the body for an NDK subscription
 * (map events + profile metadata + imeta/url media -> Post). The page never
 * changes.
 */
export async function loadPosts(): Promise<Post[]> {
  await new Promise((r) => setTimeout(r, 600)); // simulate fetch -> loading state
  return mockPosts;
}
