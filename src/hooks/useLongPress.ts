import { useCallback, useRef } from "react";

interface LongPressOptions {
  delay?: number;
  disabled?: boolean;
}

/**
 * Fires `onLongPress` after a press-and-hold (touch or mouse) and on right click.
 * Movement above a small threshold cancels the gesture so scrolling still works.
 */
export function useLongPress(onLongPress: () => void, { delay = 500, disabled = false }: LongPressOptions = {}) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const triggered = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  const start = useCallback((event: React.PointerEvent) => {
    if (disabled || event.button === 2) return;
    triggered.current = false;
    origin.current = { x: event.clientX, y: event.clientY };
    timer.current = window.setTimeout(() => {
      triggered.current = true;
      timer.current = null;
      if (navigator.vibrate) navigator.vibrate(12);
      onLongPress();
    }, delay);
  }, [delay, disabled, onLongPress]);

  const move = useCallback((event: React.PointerEvent) => {
    if (!origin.current) return;
    const distance = Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y);
    if (distance > 10) clear();
  }, [clear]);

  return {
    /** True when the last gesture ended as a long press (use it to swallow the click). */
    consumeLongPress: () => {
      const value = triggered.current;
      triggered.current = false;
      return value;
    },
    handlers: {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (event: React.MouseEvent) => {
        if (disabled) return;
        event.preventDefault();
        triggered.current = true;
        onLongPress();
      },
    },
  };
}
