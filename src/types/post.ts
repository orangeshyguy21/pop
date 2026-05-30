// The data contract for the post canvas. The prototype feeds this from mock
// data; the dev later maps Nostr events -> Post and the page is untouched.

export interface PostMedia {
  url: string;
  type: "image"; // future: "video" | "gif"
  width?: number; // intrinsic px if known (helps layout pre-measure)
  height?: number;
  blurhash?: string; // optional placeholder
}

export interface PostAuthor {
  pubkey: string; // hex
  displayName: string;
  avatarUrl?: string;
  nip05?: string; // verified handle, optional
}

export interface Post {
  id: string; // nostr event id
  author: PostAuthor;
  message: string; // plain text content
  media?: PostMedia; // optional single image
  createdAt: number; // unix seconds (nostr created_at)
  // future-friendly, ignored by the prototype:
  reactions?: number;
  zaps?: number;
}
