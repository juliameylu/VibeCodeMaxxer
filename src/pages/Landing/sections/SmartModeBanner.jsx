import { useState } from "react";
import { Brain, Zap, Sparkles } from "lucide-react";

export default function SmartModeBanner() {
  const [mode, setMode] = useState("work");

  return (
    <div className="animate-fade-in">
      <div className="card-shadow p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Brain size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Smart Mode</h3>
              <p className="text-sm text-slate-600">
                High pressure detected! 🚨
              </p>
            </div>
          </div>
          <Sparkles size={20} className="text-accent" />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setMode("work")}
            className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
              mode === "work"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap size={16} />
              Work Mode
            </span>
          </button>
          <button
            onClick={() => setMode("fun")}
            className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${
              mode === "fun"
                ? "bg-white text-secondary shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-2">🎉 Fun Mode</span>
          </button>
        </div>

        {/* Recommendation */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          {mode === "work" && (
            <div>
              <p className="font-semibold text-slate-900 mb-2">
                💡 Focus Time Suggestion
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                You have <span className="font-bold text-primary">4 hours 15 min</span> before your presentation.
              </p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>2h focused work on Physics Problem Set</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>15 min break (reward: The Brew)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span>2h presentation prep & practice</span>
                </div>
              </div>
            </div>
          )}
          {mode === "fun" && (
            <div>
              <p className="font-semibold text-slate-900 mb-2">
                🎉 Chill Time Suggestion
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Take a breather, but don't forget your deadlines! We found 4 cool spots nearby to recharge.
              </p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>☕ The Brew Coffeehouse (0.3 mi)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⛰️ Bishop Peak Trail (2.1 mi)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
