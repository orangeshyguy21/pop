import { Application, Container, Sprite } from "pixi.js";
import type { Post } from "../types/post";
import { buildCardTexture, type CardTextureHandle } from "./cardTexture";
import { layoutMasonry, type Layout, type Rect } from "./layoutMasonry";
import {
  fitCamera,
  LOD_NEAR_IN,
  LOD_NEAR_OUT,
  panLimits,
  screenToWorld,
  zoomAt,
  type Camera,
} from "./camera";

export type LodMode = "far" | "near";

interface CardNode {
  post: Post;
  rect: Rect;
  sprite: Sprite;
  handle: CardTextureHandle;
}

const FRICTION = 0.9; // per-frame velocity decay
const BOUNDS_EASE = 0.18;
const TARGET_EASE = 0.18;
const RUBBER = 0.4;
const BG_COLOR = 0xf2f1ee;
const DIM_ALPHA = 0.18;

function softClamp(v: number, min: number, max: number): number {
  if (v < min) return min + (v - min) * RUBBER;
  if (v > max) return max + (v - max) * RUBBER;
  return v;
}

/**
 * The single imperative bridge between React and Pixi. React talks to the
 * canvas only through this object; the eventual NDK swap is just a different
 * `setPosts` source.
 */
export class CanvasController {
  private app: Application | null = null;
  private world = new Container();
  private nodes = new Map<string, CardNode>();
  private layout: Layout = {
    rects: new Map(),
    bounds: { width: 0, height: 0 },
    columnCount: 0,
  };

  private cam: Camera = { x: 0, y: 0, scale: 1 };
  private vel = { x: 0, y: 0 };
  private target: Camera | null = null;
  private dragging = false;
  private vp = { width: 1, height: 1 };

  private lodMode: LodMode = "far";
  private lastNearKey = "";
  private matches: Set<string> | null = null;

  private cameraCb: ((cam: Camera) => void) | null = null;
  private lodCb: ((mode: LodMode, ids: string[]) => void) | null = null;
  private destroyed = false;

  async mount(el: HTMLDivElement): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: el,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: BG_COLOR,
      preference: "webgl",
    });
    if (this.destroyed) {
      // unmounted before async init resolved (StrictMode) -> throw it away
      app.destroy(true, { children: true, texture: true });
      return;
    }
    this.app = app;
    el.appendChild(app.canvas);
    app.stage.addChild(this.world);
    this.vp = { width: app.renderer.width, height: app.renderer.height };
    app.ticker.add(this.tick);
  }

  setPosts(posts: Post[]): void {
    this.clearNodes();
    this.layout = layoutMasonry(posts);
    for (const post of posts) {
      const rect = this.layout.rects.get(post.id);
      if (!rect) continue;
      const handle = buildCardTexture(post);
      const sprite = new Sprite(handle.texture);
      sprite.width = handle.cssWidth;
      sprite.height = handle.cssHeight;
      sprite.position.set(rect.x - handle.offset, rect.y - handle.offset);
      this.world.addChild(sprite);
      this.nodes.set(post.id, { post, rect, sprite, handle });
    }
    this.applyMatches();
    this.fitAll(false);
  }

  setSearchMatches(ids: Set<string> | null): void {
    this.matches = ids && ids.size ? ids : null;
    this.applyMatches();
  }

  private applyMatches(): void {
    for (const [id, node] of this.nodes) {
      node.sprite.alpha = this.matches
        ? this.matches.has(id)
          ? 1
          : DIM_ALPHA
        : 1;
    }
  }

  // ---- input (called by the React gesture layer) --------------------------

  applyPan(dx: number, dy: number): void {
    const lim = panLimits(this.cam, this.vp, this.layout.bounds);
    this.cam.x = softClamp(this.cam.x + dx, lim.minX, lim.maxX);
    this.cam.y = softClamp(this.cam.y + dy, lim.minY, lim.maxY);
    this.target = null;
  }

  applyZoomAt(factor: number, sx: number, sy: number): void {
    this.cam = zoomAt(this.cam, factor, sx, sy);
    this.target = null;
  }

  setDragging(d: boolean): void {
    this.dragging = d;
    if (d) this.vel = { x: 0, y: 0 };
  }

  endDrag(vx: number, vy: number): void {
    this.dragging = false;
    // use-gesture velocity is px/ms; convert to px/frame (~16.7ms)
    this.vel = { x: vx * 16, y: vy * 16 };
  }

  hitTest(sx: number, sy: number): string | null {
    const w = screenToWorld(this.cam, sx, sy);
    for (const [id, node] of this.nodes) {
      const r = node.rect;
      if (w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h) {
        return id;
      }
    }
    return null;
  }

  focusPost(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    const r = node.rect;
    const margin = 1.4;
    const scale = Math.min(
      this.vp.width / (r.w * margin),
      this.vp.height / (r.h * margin),
      2,
    );
    this.target = {
      scale,
      x: this.vp.width / 2 - (r.x + r.w / 2) * scale,
      y: this.vp.height / 2 - (r.y + r.h / 2) * scale,
    };
  }

  fitAll(animate = true): void {
    const cam = fitCamera(this.vp, this.layout.bounds);
    if (animate) {
      this.target = cam;
    } else {
      this.cam = cam;
      this.target = null;
      this.vel = { x: 0, y: 0 };
    }
  }

  resize(): void {
    if (!this.app) return;
    this.vp = { width: this.app.renderer.width, height: this.app.renderer.height };
  }

  screenToWorld(sx: number, sy: number) {
    return screenToWorld(this.cam, sx, sy);
  }

  getCamera(): Camera {
    return this.cam;
  }

  getRect(id: string): Rect | undefined {
    return this.nodes.get(id)?.rect;
  }

  getPost(id: string): Post | undefined {
    return this.nodes.get(id)?.post;
  }

  onCameraChange(cb: (cam: Camera) => void): void {
    this.cameraCb = cb;
  }

  onLodChange(cb: (mode: LodMode, ids: string[]) => void): void {
    this.lodCb = cb;
  }

  // ---- the single per-frame integration loop ------------------------------

  private tick = (ticker: { deltaTime: number }): void => {
    const dt = Math.min(ticker.deltaTime, 3); // clamp huge frame gaps
    const lim = panLimits(this.cam, this.vp, this.layout.bounds);

    if (this.target) {
      this.cam.x += (this.target.x - this.cam.x) * TARGET_EASE * dt;
      this.cam.y += (this.target.y - this.cam.y) * TARGET_EASE * dt;
      this.cam.scale += (this.target.scale - this.cam.scale) * TARGET_EASE * dt;
      if (
        Math.abs(this.target.x - this.cam.x) < 0.5 &&
        Math.abs(this.target.y - this.cam.y) < 0.5 &&
        Math.abs(this.target.scale - this.cam.scale) < 0.001
      ) {
        this.cam = { ...this.target };
        this.target = null;
      }
    } else if (!this.dragging) {
      // inertia
      if (this.vel.x || this.vel.y) {
        this.cam.x += this.vel.x * dt;
        this.cam.y += this.vel.y * dt;
        const f = Math.pow(FRICTION, dt);
        this.vel.x *= f;
        this.vel.y *= f;
        if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
        if (Math.abs(this.vel.y) < 0.05) this.vel.y = 0;
      }
      // elastic ease back inside bounds
      const tx = Math.min(lim.maxX, Math.max(lim.minX, this.cam.x));
      const ty = Math.min(lim.maxY, Math.max(lim.minY, this.cam.y));
      if (tx !== this.cam.x) {
        this.cam.x += (tx - this.cam.x) * BOUNDS_EASE * dt;
        this.vel.x = 0;
      }
      if (ty !== this.cam.y) {
        this.cam.y += (ty - this.cam.y) * BOUNDS_EASE * dt;
        this.vel.y = 0;
      }
    }

    // write transform
    this.world.position.set(this.cam.x, this.cam.y);
    this.world.scale.set(this.cam.scale);

    // sync DOM overlay on the SAME frame
    this.cameraCb?.(this.cam);

    // LOD + culling
    this.updateLod();
  };

  private updateLod(): void {
    const prev = this.lodMode;
    if (this.cam.scale > LOD_NEAR_IN) this.lodMode = "near";
    else if (this.cam.scale < LOD_NEAR_OUT) this.lodMode = "far";
    // else: keep prev (hysteresis band)

    let ids: string[] = [];
    if (this.lodMode === "near") {
      const tl = screenToWorld(this.cam, 0, 0);
      const br = screenToWorld(this.cam, this.vp.width, this.vp.height);
      const mx = (br.x - tl.x) * 0.3;
      const my = (br.y - tl.y) * 0.3;
      const vx0 = tl.x - mx;
      const vy0 = tl.y - my;
      const vx1 = br.x + mx;
      const vy1 = br.y + my;
      for (const [id, node] of this.nodes) {
        const r = node.rect;
        if (r.x < vx1 && r.x + r.w > vx0 && r.y < vy1 && r.y + r.h > vy0) {
          ids.push(id);
        }
      }
    }

    const key = this.lodMode + "|" + ids.join(",");
    if (key !== this.lastNearKey || prev !== this.lodMode) {
      this.lastNearKey = key;
      this.lodCb?.(this.lodMode, ids);
    }
  }

  private clearNodes(): void {
    for (const node of this.nodes.values()) {
      this.world.removeChild(node.sprite);
      node.sprite.destroy();
      node.handle.destroy();
    }
    this.nodes.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearNodes();
    if (this.app) {
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }
}
