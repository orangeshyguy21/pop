import type { NDKSigner } from "@nostr-dev-kit/ndk";
import { ndk } from "./ndk";
import { useAuthStore } from "../store/auth";
import { getGuestSigner } from "./guest";
import { uploadBlob } from "./blossom";
import { buildEntryEvent, type NewEntryMedia } from "./entry";

export interface SignInput {
  /** Host pubkey (hex) — the guestbook owner. */
  host: string;
  name?: string;
  message: string;
  file?: File | null;
  /** Intrinsic image size, measured client-side, for layout pre-measure. */
  imageDims?: { width: number; height: number };
}

/**
 * Publish a guestbook signature. Uses the logged-in Nostr signer when present;
 * otherwise signs (and tags as anonymous) with this browser's guest key.
 */
export async function signGuestbookEntry(input: SignInput): Promise<void> {
  const auth = useAuthStore.getState();
  const authenticated = auth.status === "authenticated" && !!auth.pubkey;

  let signer: NDKSigner;
  let anonymous: boolean;
  if (authenticated && ndk.signer) {
    signer = ndk.signer;
    anonymous = false;
  } else {
    signer = getGuestSigner();
    anonymous = true;
  }

  let media: NewEntryMedia | undefined;
  if (input.file) {
    const blob = await uploadBlob(input.file, signer);
    media = {
      url: blob.url,
      type: blob.type || "image/jpeg",
      sha256: blob.sha256,
      width: input.imageDims?.width,
      height: input.imageDims?.height,
    };
  }

  const event = buildEntryEvent({
    host: input.host,
    name: input.name,
    message: input.message,
    media,
    anonymous,
  });

  await event.sign(signer);
  const relays = await event.publish();
  if (relays.size === 0) {
    throw new Error("No relay accepted your signature. Check your connection.");
  }
}
