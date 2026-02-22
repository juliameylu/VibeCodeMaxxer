import { Link, useLocation } from "react-router-dom";
import { Bell, Bot, Compass, Home, UserRound, CalendarRange, BookCheck } from "lucide-react";
import useNotifications from "../hooks/useNotifications";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/study", label: "Study", icon: BookCheck },
  { to: "/plans/new", label: "Plans", icon: CalendarRange },
  { to: "/profile", label: "Profile", icon: UserRound }
];

export default function AppShell({ title, subtitle, children }) {
  const location = useLocation();
  const { unreadCount } = useNotifications({ pollMs: 15000 });

  return (
    <div className="min-h-screen px-3 py-4 sm:py-6">
      <div className="phone-shell mx-auto w-full max-w-[450px] pb-28">
        <header className="glass-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">SLO Planner</p>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle ? <p className="text-sm text-soft">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#95ff6d47] bg-[#0c2f10] text-[#95f665]">
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8ff451] px-1 text-[10px] font-bold text-[#13310f]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link to="/ai" className="chip chip-active inline-flex items-center gap-1 px-3 py-2 text-xs">
                <Bot size={14} /> OpenJarvis
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-4 space-y-4">{children}</main>
      </div>

      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[430px] -translate-x-1/2 rounded-[20px] border border-[#95ff6d47] bg-[#0a250d]/90 px-3 py-2 backdrop-blur">
        <ul className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                    isActive ? "bg-[#8ff45133] text-[#95f665]" : "text-[#9db99b]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
