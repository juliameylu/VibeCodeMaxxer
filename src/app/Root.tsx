import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Toaster } from "sonner";
import { FloatingJarvis } from "./components/FloatingJarvis";

const natureBg = "https://images.unsplash.com/photo-1681926946700-73c10c72ef15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxDYWxpZm9ybmlhJTIwbmF0dXJlJTIwZm9yZXN0JTIwdHJhaWx8ZW58MXx8fHwxNzcxNzI1MTgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
const FRAME_PREVIEW_KEY = "polyjarvis_frame_393x852";
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

export function Root() {
  const [useFramePreview, setUseFramePreview] = useState(() => {
    try {
      return localStorage.getItem(FRAME_PREVIEW_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));

  const isPhoneViewport = viewport.width <= 430;
  const phoneFitMode = useFramePreview && !isPhoneViewport;
  const phoneFrameHeight = Math.min(PHONE_HEIGHT, viewport.height - 16);
  const frameHorizontalOffset = phoneFitMode ? Math.max(0, (viewport.width - PHONE_WIDTH) / 2) : 0;
  const navBottomOffset = phoneFitMode ? Math.max(0, viewport.height - (8 + phoneFrameHeight)) : 0;
  const toggleStyle = phoneFitMode
    ? {
        top: "12px",
        left: "calc(50% + 212px)",
      }
    : {
        top: "12px",
        right: "12px",
      };

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FRAME_PREVIEW_KEY, useFramePreview ? "1" : "0");
    } catch {
      // no-op
    }
    document.documentElement.style.setProperty("--app-frame-width", phoneFitMode ? `${PHONE_WIDTH}px` : "520px");
    document.documentElement.style.setProperty("--app-frame-left-offset", `${frameHorizontalOffset}px`);
    document.documentElement.style.setProperty("--app-frame-right-offset", `${frameHorizontalOffset}px`);
    document.documentElement.style.setProperty("--app-nav-bottom-offset", `${navBottomOffset}px`);
  }, [useFramePreview, phoneFitMode, frameHorizontalOffset, navBottomOffset]);

  return (
    <div className="min-h-screen font-sans text-white selection:bg-[#F2E8CF]/30 relative">
      {/* Fixed nature background */}
      <div className="fixed inset-0 z-0">
        <img src={natureBg} alt="" className="w-full h-full object-cover scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/80 via-[#1a2e10]/75 to-[#0d1208]/90" />
      </div>

      <button
        type="button"
        onClick={() => setUseFramePreview((v) => !v)}
        className="fixed z-[60] rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-md active:scale-95 transition"
        style={toggleStyle}
      >
        {useFramePreview ? "Auto Size" : "Phone Fit"}
      </button>

      <div className="relative z-10 min-h-screen w-full flex justify-center px-2 py-2">
        <div
          className="relative w-full"
          style={
            phoneFitMode
              ? {
                  width: `${PHONE_WIDTH}px`,
                  maxWidth: `${PHONE_WIDTH}px`,
                  height: `${phoneFrameHeight}px`,
                  maxHeight: `${PHONE_HEIGHT}px`,
                  borderRadius: "30px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  border: "1px solid rgba(242, 232, 207, 0.2)",
                  boxShadow: "0 28px 70px rgba(0, 0, 0, 0.4)",
                  background: "rgba(0, 0, 0, 0.18)",
                }
              : {
                  maxWidth: "var(--app-frame-width, 520px)",
                  minHeight: "100dvh",
                }
          }
        >
          <Toaster position="top-center" richColors theme="dark" />
          <Outlet />
          <FloatingJarvis />
        </div>
      </div>
    </div>
  );
}
