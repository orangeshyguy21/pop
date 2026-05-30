import {
  NDKEvent,
  type NDKFilter,
  type NDKKind,
  type NDKUserProfile,
} from "@nostr-dev-kit/ndk";
import { ndk } from "./ndk";
import { shortNpub } from "./pubkey";
import type { Post, PostMedia } from "../types/post";

// A guestbook signature is a NIP-22 comment (kind 1111). Its root + parent is
// the host's profile, addressed by the replaceable-event coordinate `0:<host>:`
// — so signing works for any npub whether or not they registered a Pop.
export const ENTRY_KIND = 1111 as unknown as NDKKind;

/** NIP-01 address coordinate for a host's kind-0 profile (no `d`). */
function profileCoord(host: string): string {
  return `0:${host}:`;
}

export interface NewEntryMedia {
  url: string;
  type: string;
  sha256?: string;
  width?: number;
  height?: number;
}

export interface NewEntry {
  /** Host pubkey (hex) — the guestbook owner. */
  host: string;
  /** Optional display name the guest typed. */
  name?: string;
  /** Message body (plaintext). May be empty for a name-only signature. */
  message: string;
  /** Optional uploaded image. */
  media?: NewEntryMedia;
  /** True when signed by a throwaway guest key. */
  anonymous: boolean;
}

/** Build (unsigned) the kind-1111 event for a new signature. */
export function buildEntryEvent(input: NewEntry): NDKEvent {
  const coord = profileCoord(input.host);
  const event = new NDKEvent(ndk);
  event.kind = ENTRY_KIND;
  event.content = input.message;

  const tags: string[][] = [
    ["A", coord],
    ["a", coord],
    ["K", "0"],
    ["k", "0"],
    ["P", input.host],
    ["p", input.host],
    ["client", "pop"],
  ];
  if (input.name?.trim()) tags.push(["name", input.name.trim()]);
  if (input.anonymous) tags.push(["pop_anon", "1"]);
  if (input.media) {
    const parts = [`url ${input.media.url}`, `m ${input.media.type}`];
    if (input.media.width && input.media.height) {
      parts.push(`dim ${input.media.width}x${input.media.height}`);
    }
    if (input.media.sha256) parts.push(`x ${input.media.sha256}`);
    tags.push(["imeta", ...parts]);
  }

  event.tags = tags;
  return event;
}

/** Subscription/fetch filter for every signature on a host's guestbook. */
export function entriesFilter(host: string): NDKFilter {
  return { kinds: [ENTRY_KIND], "#A": [profileCoord(host)] };
}

export interface EntryMeta {
  pubkey: string;
  /** Signed by a throwaway guest key — never show a real profile for these. */
  anonymous: boolean;
  /** The display name the guest typed, if any. */
  nameTag?: string;
}

export function entryMeta(event: NDKEvent): EntryMeta {
  return {
    pubkey: event.pubkey,
    anonymous: event.tags.some((t) => t[0] === "pop_anon" && t[1] === "1"),
    nameTag: event.tagValue("name") || undefined,
  };
}

function parseImeta(event: NDKEvent): PostMedia | undefined {
  const tag = event.tags.find((t) => t[0] === "imeta");
  if (!tag) return undefined;

  const fields = new Map<string, string>();
  for (const part of tag.slice(1)) {
    const sp = part.indexOf(" ");
    if (sp === -1) continue;
    fields.set(part.slice(0, sp), part.slice(sp + 1));
  }

  const url = fields.get("url");
  if (!url) return undefined;

  let width: number | undefined;
  let height: number | undefined;
  const dim = fields.get("dim");
  if (dim) {
    const [w, h] = dim.split("x").map(Number);
    if (w && h) {
      width = w;
      height = h;
    }
  }
  return { url, type: "image", width, height };
}

// Map a kind-1111 event to the canvas `Post` shape. `profile` is the author's
// kind-0 metadata, used only for real (non-anonymous) signatures; anonymous
// guest-key signatures ignore it and fall back to the typed name tag.
export function eventToPost(
  event: NDKEvent,
  profile?: NDKUserProfile | null,
): Post {
  const meta = entryMeta(event);
  const p = meta.anonymous ? null : profile;

  const displayName =
    p?.displayName ||
    p?.name ||
    meta.nameTag ||
    (meta.anonymous ? "Anonymous" : shortNpub(event.pubkey));

  return {
    id: event.id,
    author: {
      pubkey: event.pubkey,
      displayName,
      avatarUrl: p?.picture || p?.image || undefined,
      nip05: p?.nip05 || undefined,
    },
    message: event.content,
    media: parseImeta(event),
    createdAt: event.created_at ?? 0,
  };
}
