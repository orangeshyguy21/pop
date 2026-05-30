import type { Post } from "../types/post";
import { CARD, computeCardGeometry } from "./cardGeometry";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  rects: Map<string, Rect>;
  bounds: { width: number; height: number };
  columnCount: number;
}

const GAP = 24;

/**
 * Deterministic shortest-column masonry in world units. Stable order (newest
 * first, tiebreak id) so the wall is identical across reloads and camera
 * focus/fit animations stay stable. Pure: Post[] -> positions.
 */
export function layoutMasonry(posts: Post[]): Layout {
  const ordered = [...posts].sort(
    (a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1),
  );

  // A roughly square wall: derive column count from N, clamped to a sane range.
  const columnCount = Math.max(3, Math.min(12, Math.round(Math.sqrt(ordered.length))));

  const colW = CARD.width;
  const colHeights = new Array<number>(columnCount).fill(0);
  const rects = new Map<string, Rect>();

  for (const post of ordered) {
    const geo = computeCardGeometry(post);
    // place into the currently shortest column
    let col = 0;
    for (let c = 1; c < columnCount; c++) {
      if (colHeights[c] < colHeights[col]) col = c;
    }
    const x = col * (colW + GAP);
    const y = colHeights[col];
    rects.set(post.id, { x, y, w: colW, h: geo.height });
    colHeights[col] += geo.height + GAP;
  }

  const width = columnCount * (colW + GAP) - GAP;
  const height = Math.max(0, ...colHeights) - GAP;

  return { rects, bounds: { width, height }, columnCount };
}
