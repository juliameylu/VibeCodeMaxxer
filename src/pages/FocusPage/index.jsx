import { Brain, Clock } from "lucide-react";
import MobileShell from "../../components/MobileShell";

export default function FocusPage() {
  return (
    <MobileShell>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">Deep Work</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <Brain size={24} className="text-amberSoft" />
          Focus Session
        </h1>
        <p className="mt-1 text-sm text-soft">Start a calm 50-minute sprint and keep distractions low.</p>
      </section>

      <section className="glass-card mt-5 p-5">
        <div className="row-pill flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Current timer</p>
            <p className="text-3xl font-bold text-ink">50:00</p>
          </div>
          <Clock size={28} className="text-amberSoft" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="chip chip-active">Start Focus</button>
          <button className="chip chip-idle">Short Break</button>
        </div>
      </section>
    </MobileShell>
  );
}
