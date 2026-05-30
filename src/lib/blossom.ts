import { NDKEvent, type NDKKind, type NDKSigner } from "@nostr-dev-kit/ndk";
import { ndk } from "./ndk";

// Blossom blob upload (BUD-01/02): authorize with a signed kind-24242 event
// passed as an `Authorization: Nostr <base64>` header, then PUT the bytes.
const BLOSSOM_SERVER = (
  import.meta.env.VITE_BLOSSOM_SERVER ?? "https://blossom.primal.net"
).replace(/\/$/, "");

const BLOSSOM_AUTH_KIND = 24242 as unknown as NDKKind;

export interface UploadedBlob {
  url: string;
  sha256: string;
  size: number;
  type: string;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Upload a file to the Blossom server, authorized by the given signer. */
export async function uploadBlob(
  file: File,
  signer: NDKSigner,
): Promise<UploadedBlob> {
  const bytes = await file.arrayBuffer();
  const hash = await sha256Hex(bytes);

  const auth = new NDKEvent(ndk);
  auth.kind = BLOSSOM_AUTH_KIND;
  auth.content = `Upload ${file.name}`;
  auth.tags = [
    ["t", "upload"],
    ["x", hash],
    ["expiration", String(Math.floor(Date.now() / 1000) + 300)],
  ];
  await auth.sign(signer);

  const res = await fetch(`${BLOSSOM_SERVER}/upload`, {
    method: "PUT",
    headers: {
      Authorization: `Nostr ${base64Utf8(JSON.stringify(auth.rawEvent()))}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: bytes,
  });
  if (!res.ok) {
    const reason = res.headers.get("X-Reason") || res.statusText;
    throw new Error(`Image upload failed (${res.status}): ${reason}`);
  }

  const blob = await res.json();
  return {
    url: blob.url as string,
    sha256: (blob.sha256 as string) ?? hash,
    size: (blob.size as number) ?? file.size,
    type: (blob.type as string) ?? file.type ?? "image/jpeg",
  };
}
