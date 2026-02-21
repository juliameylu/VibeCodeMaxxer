import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import GreetingHeader from "./sections/GreetingHeader";
import TopPriorities from "./sections/TopPriorities";
import OpenNowGrid from "./sections/OpenNowGrid";
import SmartModeBanner from "./sections/SmartModeBanner";
import AfterClassPlan from "./sections/AfterClassPlan";
import DataSourcesFooter from "./sections/DataSourcesFooter";
import MobileShell from "../../components/MobileShell";

export default function LandingPage() {
  return (
    <MobileShell>
      <header className="glass-card p-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amberSoft text-base text-white shadow-sm">
              📍
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">SLO Day Planner</p>
              <p className="text-lg font-bold text-ink">Hello Faith</p>
            </div>
          </Link>
          <button className="rounded-2xl border border-black/5 bg-white/60 p-2 text-ink/75">
            <Menu size={20} />
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link to="/tasks" className="chip chip-active whitespace-nowrap">My Tasks</Link>
          <Link to="/focus" className="chip chip-idle whitespace-nowrap">Focus Room</Link>
          <Link to="/discover" className="chip chip-idle whitespace-nowrap">Discover</Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/places" className="chip chip-idle text-center text-xs">
            Restaurants
          </Link>
          <Link to="/events" className="chip chip-idle text-center text-xs">
            Cal Poly NOW
          </Link>
        </div>
      </header>

      <main className="mt-5 space-y-5 pb-8">
        <GreetingHeader />
        <TopPriorities />
        <SmartModeBanner />
        <OpenNowGrid />
        <AfterClassPlan />
        <DataSourcesFooter />
      </main>
    </MobileShell>
  );
}
