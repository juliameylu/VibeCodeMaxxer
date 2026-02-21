import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import GreetingHeader from "./sections/GreetingHeader";
import TopPriorities from "./sections/TopPriorities";
import OpenNowGrid from "./sections/OpenNowGrid";
import SmartModeBanner from "./sections/SmartModeBanner";
import AfterClassPlan from "./sections/AfterClassPlan";
import DataSourcesFooter from "./sections/DataSourcesFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Cal Poly Style */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Top navigation bar */}
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-bold text-sm">
                📍
              </div>
              <span className="text-xl font-bold text-primary hidden sm:block">
                SLO Day
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className="text-slate-700 hover:text-primary transition font-medium text-sm"
              >
                Home
              </Link>
              <Link
                to="/planner"
                className="text-slate-700 hover:text-primary transition font-medium text-sm"
              >
                Planner
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium text-sm"
              >
                Sign In
              </Link>
            </nav>

            <button className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu size={24} className="text-slate-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
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
