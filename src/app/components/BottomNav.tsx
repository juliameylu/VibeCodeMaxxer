import { Link, useLocation } from "react-router";
import { Home, Compass, Users, User, ClipboardList, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { JarvisLogo } from "./JarvisLogo";

export function BottomNav() {
  const { pathname } = useLocation();

  const tabs = [
    { path: "/dashboard", label: "HOME", icon: (s: number) => <Home size={s} /> },
    { path: "/jarvis", label: "JARVIS", icon: (s: number) => <JarvisLogo size={s} /> },
    { path: "/explore", label: "EXPLORE", icon: (s: number) => <Compass size={s} /> },
    { path: "/jams", label: "JAMS", icon: (s: number) => <Users size={s} /> },
    { path: "/plans", label: "PLANS", icon: (s: number) => <ClipboardList size={s} /> },
    { path: "/friends", label: "FRIENDS", icon: (s: number) => <UserPlus size={s} /> },
    { path: "/profile", label: "PROFILE", icon: (s: number) => <User size={s} /> },
  ];

  return (
    <nav
      className="fixed bg-[#1a2e10]/70 backdrop-blur-xl border-t border-white/10 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]"
      style={{
        left: "var(--app-frame-left-offset, 0px)",
        right: "var(--app-frame-right-offset, 0px)",
        bottom: "var(--app-nav-bottom-offset, 0px)",
      }}
    >
      <div className="mx-auto w-full max-w-[var(--app-frame-width,520px)]">
        <div className="flex justify-around items-center py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {tabs.map(tab => {
            const active =
              pathname.startsWith(tab.path) ||
              (tab.path === "/jams" && pathname.startsWith("/groups")) ||
              (tab.path === "/jams" && pathname.startsWith("/myevents"));
            return (
              <Link key={tab.path} to={tab.path} className="flex flex-col items-center gap-1 min-w-[48px] group">
                <div className={clsx("p-1 rounded-full transition-all", active ? "text-[#F2E8CF]" : "text-white/35 group-active:text-[#F2E8CF]")}>
                  {tab.icon(19)}
                </div>
                <span className={clsx("text-[8px] font-extrabold leading-none transition-colors tracking-wider", active ? "text-[#F2E8CF]" : "text-white/45")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
