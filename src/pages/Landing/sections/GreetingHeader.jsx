import { Clock, Calendar } from "lucide-react";

export default function GreetingHeader() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-slate-900">
            {greeting}, Faith 👋
          </h2>
          <p className="text-slate-600 mt-2">Tuesday, February 20, 2026</p>
        </div>
        <div className="text-right space-y-2">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-medium">
            <Clock size={16} />
            <span>2:30 PM</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">72°F ☀️</div>
        </div>
      </div>
    </div>
  );
}
