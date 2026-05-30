import { useGesture } from "@use-gesture/react";
import type { RefObject } from "react";
import type { CanvasController } from "../canvas/CanvasController";

/**
 * Hosts the Pixi canvas div and translates pointer input into camera commands.
 * The controller lifecycle (mount/destroy) is owned by the page; this component
 * only wires gestures to the (already-mounted) controller via a ref.
 */
export function PixiStage({
  hostRef,
  controllerRef,
  onTap,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  controllerRef: RefObject<CanvasController | null>;
  onTap: (id: string) => void;
}) {
  const localXY = (clientX: number, clientY: number): [number, number] => {
    const r = hostRef.current?.getBoundingClientRect();
    return [clientX - (r?.left ?? 0), clientY - (r?.top ?? 0)];
  };

  const bind = useGesture(
    {
      onDrag: ({ delta, dragging, last, velocity, direction, tap, xy }) => {
        const c = controllerRef.current;
        if (!c) return;
        if (tap) {
          const [x, y] = localXY(xy[0], xy[1]);
          const id = c.hitTest(x, y);
          if (id) onTap(id);
          return;
        }
        c.setDragging(!!dragging);
        c.applyPan(delta[0], delta[1]);
        if (last) {
          c.endDrag(velocity[0] * direction[0], velocity[1] * direction[1]);
        }
      },
      onWheel: ({ event, delta: [dx, dy] }) => {
        const c = controllerRef.current;
        if (!c) return;
        event.preventDefault();
        if (event.ctrlKey) {
          // trackpad pinch / ⌘-scroll arrives as wheel+ctrlKey -> zoom to cursor
          const [x, y] = localXY(event.clientX, event.clientY);
          c.applyZoomAt(Math.exp(-dy * 0.0015), x, y);
        } else {
          // plain scroll / two-finger swipe -> pan
          c.applyPan(-dx, -dy);
        }
      },
      onPinch: ({ origin: [ox, oy], offset: [scale], first, memo }) => {
        const c = controllerRef.current;
        if (!c) return scale;
        const prev: number = first ? scale : memo;
        const [x, y] = localXY(ox, oy);
        c.applyZoomAt(scale / prev, x, y);
        return scale;
      },
    },
    {
      drag: { filterTaps: true, pointer: { keys: false } },
      wheel: { eventOptions: { passive: false } },
    },
  );

  return (
    <div
      ref={hostRef}
      {...bind()}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}
