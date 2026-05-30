import { useEffect, useRef } from "react";
import type { CanvasController, LodMode } from "../canvas/CanvasController";
import { PostCardContent } from "./PostCardContent";

/**
 * The HTML layer that floats over the WebGL canvas. A single wrapper element is
 * transformed every frame (synced inside the Pixi ticker via onCameraChange) so
 * the cards inherit the exact world transform with no per-card JS. Only the
 * cards visible while zoomed in (near LOD) get mounted, and they cross-fade in
 * over the always-present sprite — reading as "sharpen", not "jump".
 */
export function DomOverlay({
  controller,
  lod,
  matches,
  onSelect,
}: {
  controller: CanvasController;
  lod: { mode: LodMode; ids: string[] };
  matches: Set<string> | null;
  onSelect: (id: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    controller.onCameraChange((cam) => {
      const el = wrapperRef.current;
      if (el) {
        el.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`;
      }
    });
    return () => controller.onCameraChange(() => {});
  }, [controller]);

  const ids = lod.mode === "near" ? lod.ids : [];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={wrapperRef}
        className="absolute left-0 top-0"
        style={{ transformOrigin: "0 0", willChange: "transform" }}
      >
        {ids.map((id) => {
          const rect = controller.getRect(id);
          const post = controller.getPost(id);
          if (!rect || !post) return null;
          const dim = matches && !matches.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="pop-card-fade pointer-events-auto absolute overflow-hidden rounded-2xl bg-white text-left shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition-opacity"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                opacity: dim ? 0.18 : undefined,
              }}
            >
              <PostCardContent post={post} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
