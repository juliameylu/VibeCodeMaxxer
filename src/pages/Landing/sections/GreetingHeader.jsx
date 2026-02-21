import { Clock, Cloud } from "lucide-react";

export default function GreetingHeader() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <section className="animate-fade-in space-y-3">
      <div className="glass-card overflow-hidden p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">Daily Check-In</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-ink">
          {greeting},
          <br />
          Faith 👋
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-soft">
          <span className="chip chip-idle text-xs">Tuesday, February 20, 2026</span>
          <span className="chip chip-idle flex items-center gap-1 text-xs">
            <Clock size={14} /> 2:30 PM
          </span>
          <span className="chip chip-active flex items-center gap-1 text-xs">
            <Cloud size={14} /> 72°F
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <article className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-ink">3</p>
          <p className="text-xs text-soft">Tasks Due</p>
        </article>
        <article className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-ink">6.5h</p>
          <p className="text-xs text-soft">Study Time</p>
        </article>
        <article className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-ink">72°</p>
          <p className="text-xs text-soft">Perfect Day</p>
        </article>
      </div>
    </section>
  );
}
