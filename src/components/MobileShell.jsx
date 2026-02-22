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
    <div className="min-h-[100dvh] px-3 py-4 sm:py-6">
      <div className="phone-shell animate-scale-in pb-28">
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
      </div>

      <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[430px] -translate-x-1/2 rounded-[20px] border border-[#8ec392] bg-[#f4fff4]/95 px-3 py-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex flex-col items-center rounded-2xl px-2 py-2 text-xs font-semibold transition ${
                    isActive ? "bg-[#8ff45133] text-[#2f5c33]" : "text-[#6f8f74]"
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
  );
}
