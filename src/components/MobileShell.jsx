import { Link, useLocation } from "react-router-dom";
import { Calendar, MapPin, Home, Plus, Circle } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tasks", label: "Tasks", icon: Calendar },
  { to: "/discover", label: "Discover", icon: MapPin },
  { to: "/profile", label: "Profile", icon: Circle },
];

export default function MobileShell({ children, showFab = true, fabTo = "/focus" }) {
  const location = useLocation();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden px-3 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:py-8">
      <div className="phone-shell animate-scale-in">
        {children}

        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          {showFab && (
            <Link
              to={fabTo}
              className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-amberSoft text-white shadow-lg shadow-amberSoft/35 transition hover:scale-105"
              aria-label="Quick add"
            >
              <Plus size={24} />
            </Link>
          )}
        </div>

        <nav className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/60 bg-white/75 px-3 py-2 backdrop-blur">
          <ul className="grid grid-cols-4 gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center rounded-2xl px-2 py-2 text-xs font-semibold transition ${
                      isActive ? "bg-amberSoft/20 text-ink" : "text-ink/55"
                    }`}
                  >
                    <Icon size={17} />
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
