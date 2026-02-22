import { Link, useLocation } from "react-router-dom";
import { Bot, Compass, Home, UserRound, CalendarRange, BookCheck } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/study", label: "Study", icon: BookCheck },
  { to: "/plans/new", label: "Plans", icon: CalendarRange },
  { to: "/profile", label: "Profile", icon: UserRound }
];

export default function AppShell({ title, subtitle, children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen px-3 py-6 sm:py-8">
      <div className="phone-shell mx-auto w-full max-w-[450px] pb-24">
        <header className="glass-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">SLO Planner</p>
              <h1 className="text-xl font-bold text-ink">{title}</h1>
              {subtitle ? <p className="text-sm text-soft">{subtitle}</p> : null}
            </div>
            <Link to="/ai" className="chip chip-active inline-flex items-center gap-1 px-3 py-2 text-xs">
              <Bot size={14} /> OpenJarvis
            </Link>
          </div>
        </header>

        <main className="mt-4 space-y-4">{children}</main>

        <nav className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/60 bg-white/75 px-3 py-2 backdrop-blur">
          <ul className="grid grid-cols-5 gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                      isActive ? "bg-amberSoft/20 text-ink" : "text-ink/55"
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
    </div>
  );
}
