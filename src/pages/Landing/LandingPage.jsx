import { Link } from "react-router-dom";
import GreetingHeader from "./sections/GreetingHeader";
import TopPriorities from "./sections/TopPriorities";
import OpenNowGrid from "./sections/OpenNowGrid";
import SmartModeBanner from "./sections/SmartModeBanner";
import AfterClassPlan from "./sections/AfterClassPlan";
import DataSourcesFooter from "./sections/DataSourcesFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            📍 SLO Day
          </h1>
          <nav className="flex gap-3">
            <Link
              to="/planner"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Planner
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <GreetingHeader />
        <TopPriorities />
        <SmartModeBanner />
        <OpenNowGrid />
        <AfterClassPlan />
        <DataSourcesFooter />
      </main>
    </div>
  );
}
