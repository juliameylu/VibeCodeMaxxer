import { useState } from "react";
import { Brain, Zap } from "lucide-react";

export default function SmartModeBanner() {
  const [mode, setMode] = useState("work");

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain size={28} className="text-primary" />
            <div>
              <h3 className="font-bold text-slate-900">Smart Mode</h3>
              <p className="text-sm text-slate-600">
                High pressure detected! 🚨
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("work")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mode === "work"
                  ? "bg-primary text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap size={16} />
                Work Mode
              </span>
            </button>
            <button
              onClick={() => setMode("fun")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                mode === "fun"
                  ? "bg-secondary text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">🎉 Fun Mode</span>
            </button>
          </div>
        </div>

        {mode === "work" && (
          <p className="text-sm text-slate-700 mt-4">
            💡 You have 4 hours 15 min before your presentation. We recommend:
            2h focused work → 15min break → 2h more work.
          </p>
        )}
        {mode === "fun" && (
          <p className="text-sm text-slate-700 mt-4">
            🎉 Take a breather! We found cool spots nearby to recharge. Study
            blocks should still come first though!
          </p>
        )}
      </div>
    </div>
  );
}
