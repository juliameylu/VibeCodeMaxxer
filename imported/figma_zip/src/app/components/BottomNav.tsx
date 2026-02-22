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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a2e10]/60 backdrop-blur-xl border-t border-[#8BC34A]/10 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {tabs.map(tab => {
          const active =
            pathname.startsWith(tab.path) ||
            (tab.path === "/jams" && pathname.startsWith("/groups")) ||
            (tab.path === "/jams" && pathname.startsWith("/myevents"));
          return (
            <Link key={tab.path} to={tab.path} className="flex flex-col items-center gap-1.5 min-w-[40px] group">
              <div className={clsx("p-1 rounded-full transition-all", active ? "text-[#8BC34A]" : "text-white/30 group-active:text-[#8BC34A]")}>
                {tab.icon(18)}
              </div>
              <span className={clsx("text-[7.5px] font-bold leading-none transition-colors tracking-wider", active ? "text-[#8BC34A]" : "text-white/35")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}