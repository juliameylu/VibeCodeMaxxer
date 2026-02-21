import { Clock, Cloud } from "lucide-react";

export default function GreetingHeader() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden mb-6 h-64 md:h-80 bg-gradient-to-br from-primary/90 to-secondary/90">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0,50 Q25,0 50,50 T100,50"
              stroke="white"
              strokeWidth="0.5"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative h-full flex flex-col justify-between p-6 md:p-8 text-white">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wide mb-2">
              Welcome Back
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {greeting},
              <br />
              Faith 👋
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
            <div>
              <p className="text-white/80 text-sm mb-1">Tuesday, February 20, 2026</p>
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span className="text-lg font-semibold">2:30 PM</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm w-fit">
              <Cloud size={20} />
              <span className="text-lg font-semibold">72°F</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-shadow p-4 text-center">
          <p className="text-2xl font-bold text-primary">3</p>
          <p className="text-xs text-slate-600 mt-1">Tasks Due</p>
        </div>
        <div className="card-shadow p-4 text-center">
          <p className="text-2xl font-bold text-secondary">6.5h</p>
          <p className="text-xs text-slate-600 mt-1">Study Time</p>
        </div>
        <div className="card-shadow p-4 text-center">
          <p className="text-2xl font-bold text-accent">72°</p>
          <p className="text-xs text-slate-600 mt-1">Perfect Day</p>
        </div>
      </div>
    </div>
  );
}
