import { Link, useLocation } from "react-router";
import { Home, Compass, User, ClipboardList, Users } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const { pathname } = useLocation();

  const tabs = [
    { path: "/dashboard", label: "Home", icon: (s: number) => <Home size={s} /> },
    { path: "/explore", label: "Explore", icon: (s: number) => <Compass size={s} /> },
    { path: "/jams", label: "Jams", icon: (s: number) => <Users size={s} /> },
    { path: "/plans", label: "Plans", icon: (s: number) => <ClipboardList size={s} /> },
    { path: "/profile", label: "Profile", icon: (s: number) => <User size={s} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1208]/80 backdrop-blur-2xl border-t border-white/8 z-50 shadow-[0_-8px_40px_rgba(0,0,0,0.4)]">
      {/* Subtle cream glow on top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F2E8CF]/15 to-transparent" />
      <div className="flex justify-around items-center py-2 pb-[max(10px,env(safe-area-inset-bottom))]">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path);
          return (
            <Link key={tab.path} to={tab.path} className="flex flex-col items-center gap-1 min-w-[48px] group">
              <div className={clsx(
                "p-1.5 rounded-xl transition-all duration-200",
                active ? "text-[#F2E8CF] bg-[#F2E8CF]/10" : "text-white/30 group-active:text-[#F2E8CF]"
              )}>
                {tab.icon(19)}
              </div>
              <span className={clsx(
                "text-[7px] font-semibold leading-none transition-colors tracking-wider",
                active ? "text-[#F2E8CF]" : "text-white/40"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}