import { Zap, Clock } from "lucide-react";
import { useMemo, useState } from "react";

const DUMMY_PRIORITIES = [
  {
    id: 1,
    title: "Physics Problem Set 5",
    course: "PHYS 132",
    urgency: "high",
    eta: "2h 30m",
    progress: 65,
    dueTime: "Today 11:59 PM",
    completed: false,
  },
  {
    id: 2,
    title: "Group Project Presentation",
    course: "BIO 161",
    urgency: "medium",
    eta: "4h 15m",
    progress: 40,
    dueTime: "Feb 22, 2:00 PM",
    completed: false,
  },
  {
    id: 3,
    title: "Read Chapter 8 (Bio)",
    course: "BIO 161",
    urgency: "low",
    eta: "1h 45m",
    progress: 20,
    dueTime: "Feb 21, 9:00 AM",
    completed: true,
  },
];

function UrgencyBadge({ urgency }) {
  const styles = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-teal-100 text-teal-700",
    low: "bg-lime-100 text-lime-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[urgency]}`}>{urgency}</span>;
}

export default function TopPriorities() {
  const [checked, setChecked] = useState({ 3: true });
  const [filter, setFilter] = useState("all");

  const priorities = useMemo(() => {
    return DUMMY_PRIORITIES.filter((item) => {
      const isDone = checked[item.id] ?? item.completed;
      if (filter === "pending") return !isDone;
      if (filter === "completed") return isDone;
      return true;
    });
  }, [checked, filter]);

  return (
    <section className="glass-card animate-fade-in p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-ink">
          <Zap size={22} className="text-amberSoft" />
          Top 3 Priorities
        </h3>
        <p className="text-sm text-soft">{priorities.length} tasks</p>
      </div>

      <div className="mt-4 flex gap-2">
        {[
          { id: "all", label: "All" },
          { id: "pending", label: "Pending" },
          { id: "completed", label: "Completed" },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id)}
            className={`chip ${filter === chip.id ? "chip-active" : "chip-idle"}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {priorities.map((priority) => {
          const done = checked[priority.id] ?? priority.completed;
          return (
            <article key={priority.id} className="row-pill">
              <div className="flex items-start gap-3">
                <button
                  onClick={() =>
                    setChecked((prev) => ({
                      ...prev,
                      [priority.id]: !(prev[priority.id] ?? priority.completed),
                    }))
                  }
                  className={`mt-0.5 h-6 w-6 rounded-full border-2 transition ${
                    done ? "border-amberSoft bg-amberSoft text-white" : "border-black/20"
                  }`}
                >
                  {done ? "✓" : ""}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`font-bold ${done ? "text-ink/45 line-through" : "text-ink"}`}>{priority.title}</h4>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink/55">{priority.course}</p>
                    </div>
                    <UrgencyBadge urgency={priority.urgency} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-soft">
                    <span className="chip chip-idle px-3 py-1 text-xs">Due: {priority.dueTime}</span>
                    <span className="chip chip-idle flex items-center gap-1 px-3 py-1 text-xs">
                      <Clock size={12} /> {priority.eta}
                    </span>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full bg-ink/10">
                    <div className="h-2 rounded-full bg-amberSoft" style={{ width: `${priority.progress}%` }} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
