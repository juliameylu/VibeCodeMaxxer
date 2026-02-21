import { Clock, Bookmark, Calendar } from "lucide-react";
import { useState } from "react";

const DUMMY_PLAN = {
  studyBlock: "3:00 PM - 5:30 PM",
  location: "SLO Library (Quiet Zone)",
  topics: ["Physics Problem Set", "Group Project Research"],
  reward: {
    name: "The Brew Coffeehouse",
    arrival: "5:45 PM",
    description: "Coffee & Pastry Break",
  },
};

export default function AfterClassPlan() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar size={28} className="text-accent" />
          Suggested Plan
        </h3>
        <button
          onClick={() => setSaved(!saved)}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <Bookmark
            size={24}
            className={`transition ${
              saved ? "fill-accent text-accent" : "text-slate-400"
            }`}
          />
        </button>
      </div>

      <div className="card-shadow p-6 bg-gradient-to-br from-slate-50 to-white">
        {/* Study Block */}
        <div className="mb-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📖</span>
            <h4 className="font-bold text-slate-900">Study Block</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-700">
              <Clock size={18} className="text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase">Time</p>
                <p className="font-medium">{DUMMY_PLAN.studyBlock}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-xs text-slate-600 uppercase">Location</p>
                <p className="font-medium">{DUMMY_PLAN.location}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-600 uppercase mb-2 block">
                Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {DUMMY_PLAN.topics.map((topic) => (
                  <span
                    key={topic}
                    className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reward */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎉</span>
            <h4 className="font-bold text-slate-900">Your Reward</h4>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-600 uppercase mb-1 block">
                After Your Work
              </p>
              <p className="font-semibold text-slate-900 text-lg">
                {DUMMY_PLAN.reward.name}
              </p>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Clock size={18} className="text-secondary flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-600 uppercase">Arrival</p>
                <p className="font-medium">{DUMMY_PLAN.reward.arrival}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 italic">
              {DUMMY_PLAN.reward.description}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={() => setSaved(!saved)}
            className={`flex-1 py-2.5 rounded-lg font-medium transition text-sm ${
              saved
                ? "bg-primary text-white"
                : "border border-primary text-primary hover:bg-primary hover:text-white"
            }`}
          >
            {saved ? "✓ Saved" : "Save Plan"}
          </button>
          <button className="flex-1 py-2.5 rounded-lg font-medium bg-secondary text-white hover:bg-secondary/90 transition text-sm">
            Get Directions
          </button>
        </div>
      </div>
    </div>
  );
}
