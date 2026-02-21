import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

const DUMMY_PRIORITIES = [
  {
    id: 1,
    title: "Physics Problem Set 5",
    urgency: "high",
    eta: "2h 30m",
    progress: 65,
  },
  {
    id: 2,
    title: "Group Project Presentation",
    urgency: "medium",
    eta: "4h 15m",
    progress: 40,
  },
  {
    id: 3,
    title: "Read Chapter 8 (Bio)",
    urgency: "low",
    eta: "1h 45m",
    progress: 20,
  },
];

function UrgencyBadge({ urgency }) {
  const colors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[urgency]}`}
    >
      {urgency}
    </span>
  );
}

export default function TopPriorities() {
  return (
    <div className="animate-fade-in">
      <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <AlertCircle size={24} className="text-primary" />
        Today's Focus
      </h3>

      <div className="space-y-3">
        {DUMMY_PRIORITIES.map((priority) => (
          <div
            key={priority.id}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:border-primary/50 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">
                  {priority.title}
                </h4>
                <div className="flex items-center gap-4 mt-2">
                  <UrgencyBadge urgency={priority.urgency} />
                  <div className="flex items-center gap-1 text-slate-600 text-sm">
                    <Clock size={14} />
                    <span>{priority.eta}</span>
                  </div>
                </div>
              </div>
              <CheckCircle2
                size={24}
                className="text-slate-300 hover:text-slate-400 cursor-pointer transition"
              />
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                style={{ width: `${priority.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {priority.progress}% complete
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
