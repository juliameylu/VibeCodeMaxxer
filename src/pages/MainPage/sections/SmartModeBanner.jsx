import { useState } from "react";
import { Brain, Sparkles, Zap } from "lucide-react";

export default function SmartModeBanner() {
  const [mode, setMode] = useState("work");

  return (
    <section className="glass-card animate-fade-in p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amberSoft/20">
            <Brain size={20} className="text-amberSoft" />
          </span>
          <div>
            <h3 className="text-xl font-bold text-ink">Smart Mode</h3>
            <p className="text-sm text-soft">High pressure detected. Recommended: work-first.</p>
          </div>
        </div>
        <Sparkles size={18} className="text-amberSoft" />
      </div>

      <div className="mt-4 inline-flex gap-2 rounded-full border border-white/60 bg-white/70 p-1">
        <button
          onClick={() => setMode("work")}
          className={`chip px-4 py-2 text-sm ${mode === "work" ? "chip-active" : "chip-idle border-0"}`}
        >
          <span className="flex items-center gap-2">
            <Zap size={14} /> Work Mode
          </span>
        </button>
        <button
          onClick={() => setMode("fun")}
          className={`chip px-4 py-2 text-sm ${mode === "fun" ? "chip-active" : "chip-idle border-0"}`}
        >
          🎉 Fun Mode
        </button>
      </div>

      <div className="row-pill mt-4">
        {mode === "work" ? (
          <div>
            <p className="font-bold text-ink">Focus suggestion</p>
            <p className="mt-1 text-sm text-soft">
              You have <span className="font-semibold text-ink">4 hours 15 min</span> before your presentation.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-soft">
              <li>2h focused work on Physics Problem Set</li>
              <li>15 min break at The Brew</li>
              <li>2h presentation prep and practice</li>
            </ul>
          </div>
        ) : (
          <div>
            <p className="font-bold text-ink">Recharge suggestion</p>
            <p className="mt-1 text-sm text-soft">
              Take a short reset and keep deadlines in view.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-soft">
              <li>☕ The Brew Coffeehouse (0.3 mi)</li>
              <li>⛰️ Bishop Peak Trail (2.1 mi)</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
