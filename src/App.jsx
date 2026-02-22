import { useEffect } from "react";
import FigmaApp from "./app/App";

export default function App() {
  useEffect(() => {
    // Keep pinch zoom enabled, but block accidental double-tap zoom on iOS.
    let lastTouchEnd = 0;
    const onTouchEnd = (event) => {
      const now = Date.now();
      const isDoubleTap = now - lastTouchEnd <= 300;
      lastTouchEnd = now;
      if (isDoubleTap && event.touches.length === 0) {
        event.preventDefault();
      }
    };

    // iOS fallback: if input-focus zoom happened, nudge viewport back to 1x on blur.
    const resetZoomAfterBlur = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale <= 1.01) return;
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) return;
      const original = viewportMeta.getAttribute("content") || "";
      viewportMeta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no, maximum-scale=1");
      requestAnimationFrame(() => {
        viewportMeta.setAttribute("content", original);
      });
    };

    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("focusout", resetZoomAfterBlur, true);

    return () => {
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("focusout", resetZoomAfterBlur, true);
    };
  }, []);

  return <FigmaApp />;
}
