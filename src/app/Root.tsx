import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { FloatingJarvis } from "./components/FloatingJarvis";

const natureBg = "https://images.unsplash.com/photo-1681926946700-73c10c72ef15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxDYWxpZm9ybmlhJTIwbmF0dXJlJTIwZm9yZXN0JTIwdHJhaWx8ZW58MXx8fHwxNzcxNzI1MTgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";
export function Root() {
  const location = useLocation();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const safeTopRoutes = new Set(["/", "/landing", "/signin", "/preferences"]);
  const needsGlobalTopInset = !safeTopRoutes.has(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (frameRef.current) {
      frameRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  return (
    <div
      className="w-full overflow-hidden font-sans text-white selection:bg-[#F2E8CF]/30 relative"
      style={{ height: "100%" }}
    >
      {/* Fixed nature background */}
      <div className="fixed inset-0 z-0">
        <img src={natureBg} alt="" className="w-full h-full object-cover scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/80 via-[#1a2e10]/75 to-[#0d1208]/90" />
      </div>

      <div
        className="relative z-10 w-full"
        style={{
          height: "100%",
          paddingTop: needsGlobalTopInset ? "env(safe-area-inset-top)" : undefined,
        }}
      >
        <div
          ref={frameRef}
          className="ios-scroll relative h-full w-full overflow-y-auto overscroll-contain overflow-x-hidden bg-[rgba(0,0,0,0.18)] md:mx-auto md:max-w-[430px] md:rounded-[30px] md:border md:border-[rgba(242,232,207,0.2)] md:shadow-[0_28px_70px_rgba(0,0,0,0.4)]"
        >
          <Toaster
            position="top-center"
            richColors
            theme="dark"
            visibleToasts={1}
            offset={{
              top: "calc(env(safe-area-inset-top) + 10px)",
              left: "12px",
              right: "12px",
            }}
            mobileOffset={{
              top: "calc(env(safe-area-inset-top) + 10px)",
              left: "12px",
              right: "12px",
            }}
            toastOptions={{
              style: { maxWidth: "min(92vw, 420px)" },
            }}
          />
          <Outlet />
          <FloatingJarvis />
        </div>
      </div>
    </div>
  );
}
