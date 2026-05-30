// Pure camera math. world->screen: screen = world * scale + {x, y}.
// The CanvasController owns a single mutable Camera in a ref and integrates it
// in the Pixi ticker; these helpers keep the math testable and side-effect free.

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 4;

// Hybrid LOD thresholds (hysteresis gap prevents thrash at the boundary).
export const LOD_NEAR_IN = 1.4; // enter near (DOM) mode above this scale
export const LOD_NEAR_OUT = 1.2; // leave near mode below this scale

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToWorld(cam: Camera, sx: number, sy: number) {
  return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
}

/** Zoom about a screen anchor, keeping the world point under it fixed. */
export function zoomAt(cam: Camera, factor: number, sx: number, sy: number): Camera {
  const newScale = clampScale(cam.scale * factor);
  const worldX = (sx - cam.x) / cam.scale;
  const worldY = (sy - cam.y) / cam.scale;
  return {
    scale: newScale,
    x: sx - worldX * newScale,
    y: sy - worldY * newScale,
  };
}

export interface Viewport {
  width: number;
  height: number;
}

export interface WorldBounds {
  width: number;
  height: number;
}

/**
 * The allowed [min,max] range for cam.x / cam.y so the world stays sensibly in
 * view. When the (scaled) world is smaller than the viewport on an axis we
 * center it; otherwise we let it pan edge-to-edge with `pad` slack.
 */
export function panLimits(
  cam: Camera,
  vp: Viewport,
  world: WorldBounds,
  pad = 120,
) {
  function axis(worldSize: number, viewSize: number) {
    const scaled = worldSize * cam.scale;
    if (scaled <= viewSize) {
      // center: cam = (viewSize - scaled) / 2, with a little slack
      const c = (viewSize - scaled) / 2;
      return { min: c - pad, max: c + pad };
    }
    // edge-to-edge: cam ranges from (viewSize - scaled - pad) .. pad
    return { min: viewSize - scaled - pad, max: pad };
  }
  const x = axis(world.width, vp.width);
  const y = axis(world.height, vp.height);
  return { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max };
}

/** Camera that fits the whole world into the viewport with margin. */
export function fitCamera(
  vp: Viewport,
  world: WorldBounds,
  margin = 0.9,
): Camera {
  if (world.width <= 0 || world.height <= 0) {
    return { x: vp.width / 2, y: vp.height / 2, scale: 1 };
  }
  const scale = clampScale(
    Math.min(vp.width / world.width, vp.height / world.height) * margin,
  );
  return {
    scale,
    x: (vp.width - world.width * scale) / 2,
    y: (vp.height - world.height * scale) / 2,
  };
}
