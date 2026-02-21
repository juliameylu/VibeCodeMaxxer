import { Zap, Clock } from "lucide-react";
import { useState } from "react";

const DUMMY_PRIORITIES = [
  {
    id: 1,
    title: "Physics Problem Set 5",
    course: "PHYS 132",
    urgency: "high",
    eta: "2h 30m",
    progress: 65,
    dueTime: "Today 11:59 PM",
  },
  {
    id: 2,
    title: "Group Project Presentation",
    course: "BIO 161",
    urgency: "medium",
    eta: "4h 15m",
    progress: 40,
    dueTime: "Feb 22, 2:00 PM",
  },
  {
    id: 3,
    title: "Read Chapter 8 (Bio)",
    course: "BIO 161",
    urgency: "low",
    eta: "1h 45m",
    progress: 20,
    dueTime: "Feb 21, 9:00 AM",
  },
];

function UrgencyBadge({ urgency }) {
  const colors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };
  const icons = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[urgency]}`}>
      {icons[urgency]} {urgency}
    </span>
  );
}

export default function TopPriorities() {
  const [checked, setChecked] = useState({});

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap size={28} className="text-primary" />
          Today's Focus
        </h3>
        <p className="text-sm text-slate-600">3 tasks</p>
      </div>

      <div className="space-y-3">
        {DUMMY_PRIORITIES.map((priority) => (
          <div key={priority.id} className="card-shadow p-4 hover-scale group cursor-pointer">
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() =>
                  setChecked((prev) => ({
                    ...prev,
                    [priority.id]: !prev[priority.id],
                  }))
                }
                className="mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-primary transition flex items-center justify-center"
              >
                {checked[priority.id] && <span className="text-primary">✓</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4
                      className={`font-semibold text-slate-900 ${
                        checked[priority.id]
                          ? "line-through text-slate-500"
                          : ""
                      }`}
                    >
                      {priority.title}
                    </h4>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">
                      {priority.course}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                  <UrgencyBadge urgency={priority.urgency} />
                  <div className="flex items-center gap-1 text-slate-600 text-xs">
                    <Clock size={12} />
                    <span className="font-medium">{priority.eta}</span>
                  </div>
                  <span className="text-xs text-slate-600">Due: {priority.dueTime}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      priority.urgency === "high"
                        ? "bg-red-500"
                        : priority.urgency === "medium"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${priority.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {priority.progress}% complete
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
