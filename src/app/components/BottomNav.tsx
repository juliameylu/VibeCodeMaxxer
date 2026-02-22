import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Home, Compass, Users, User, ClipboardList, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { JarvisLogo } from "./JarvisLogo";

export function BottomNav() {
  const { pathname } = useLocation();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const syncFromViewport = () => {
      const vv = window.visualViewport;
      // Reliable signal on iOS/Capacitor: visual viewport shrinks when keyboard is open.
      if (vv) {
        const shrunk = vv.height < window.innerHeight * 0.9;
        setKeyboardOpen(shrunk);
        return;
      }
      // Fallback for environments without visualViewport.
      const active = document.activeElement;
      const focusedEditable =
        !!active &&
        active instanceof HTMLElement &&
        (active.tagName.toLowerCase() === "input" ||
          active.tagName.toLowerCase() === "textarea" ||
          active.isContentEditable);
      setKeyboardOpen(focusedEditable);
    };

    const onFocusIn = () => {
      setTimeout(syncFromViewport, 50);
    };
    const onFocusOut = () => {
      setTimeout(() => syncFromViewport(), 60);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", syncFromViewport);
    window.visualViewport?.addEventListener("scroll", syncFromViewport);
    syncFromViewport();

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", syncFromViewport);
      window.visualViewport?.removeEventListener("scroll", syncFromViewport);
    };
  }, []);

  useEffect(() => {
    const updateHeightVar = () => {
      if (!navRef.current) return;
      const h = Math.round(navRef.current.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--bottom-nav-height", `${h}px`);
    };

    updateHeightVar();

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateHeightVar())
      : null;
    if (ro && navRef.current) ro.observe(navRef.current);
    window.addEventListener("resize", updateHeightVar);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateHeightVar);
    };
  }, [keyboardOpen]);

  useEffect(() => {
    if (keyboardOpen) return;
    window.dispatchEvent(
      new CustomEvent("polyjarvis:bottom-nav-visible", {
        detail: { pathname, visible: true },
      }),
    );
  }, [keyboardOpen, pathname]);

  const tabs = [
    { path: "/dashboard", label: "HOME", icon: (s: number) => <Home size={s} /> },
    { path: "/jarvis", label: "JARVIS", icon: (s: number) => <JarvisLogo size={s} /> },
    { path: "/explore", label: "EXPLORE", icon: (s: number) => <Compass size={s} /> },
    { path: "/jams", label: "JAMS", icon: (s: number) => <Users size={s} /> },
    { path: "/plans", label: "PLANS", icon: (s: number) => <ClipboardList size={s} /> },
    { path: "/friends", label: "FRIENDS", icon: (s: number) => <UserPlus size={s} /> },
    { path: "/profile", label: "PROFILE", icon: (s: number) => <User size={s} /> },
  ];

  if (keyboardOpen) return null;

  return (
    <nav
      ref={navRef}
      data-bottom-nav="true"
      className="fixed inset-x-0 bg-[#1a2e10]/88 backdrop-blur-xl border-t border-white/10 z-[90] shadow-[0_-4px_30px_rgba(0,0,0,0.3)]"
      style={{
        bottom: 0,
      }}
    >
      <div className="mx-auto w-full md:max-w-[430px]">
        <div className="overflow-x-auto overflow-y-hidden px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center gap-1.5 min-w-max pr-2">
          {tabs.map(tab => {
            const active =
              pathname.startsWith(tab.path) ||
              (tab.path === "/jams" && pathname.startsWith("/groups")) ||
              (tab.path === "/jams" && pathname.startsWith("/myevents"));
            return (
              <Link key={tab.path} to={tab.path} className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[62px] px-2 py-1 group">
                <div className={clsx("p-1.5 rounded-full transition-all", active ? "text-[#F2E8CF]" : "text-white/35 group-active:text-[#F2E8CF]")}>
                  {tab.icon(22)}
                </div>
                <span className={clsx("text-[9px] font-extrabold leading-none transition-colors tracking-wider", active ? "text-[#F2E8CF]" : "text-white/45")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}
