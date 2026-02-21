import { Bookmark, Calendar, Clock } from "lucide-react";
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
    <section className="glass-card animate-fade-in p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-ink">
          <Calendar size={22} className="text-amberSoft" />
          Suggested After-Class Plan
        </h3>
        <button onClick={() => setSaved(!saved)} className="rounded-full border border-black/5 bg-white/70 p-2">
          <Bookmark size={18} className={saved ? "fill-amberSoft text-amberSoft" : "text-ink/45"} />
        </button>
      </div>

      <div className="row-pill mt-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <h4 className="font-bold text-ink">Study Block</h4>
        </div>

        <div className="mt-3 space-y-2 text-sm text-soft">
          <p className="flex items-center gap-2">
            <Clock size={15} className="text-amberSoft" />
            {DUMMY_PLAN.studyBlock}
          </p>
          <p>📍 {DUMMY_PLAN.location}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {DUMMY_PLAN.topics.map((topic) => (
            <span key={topic} className="chip chip-idle px-3 py-1 text-xs">
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="row-pill mt-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <h4 className="font-bold text-ink">Reward Plan</h4>
        </div>
        <p className="mt-2 font-semibold text-ink">{DUMMY_PLAN.reward.name}</p>
        <p className="text-sm text-soft">Arrival {DUMMY_PLAN.reward.arrival}</p>
        <p className="mt-1 text-sm text-soft">{DUMMY_PLAN.reward.description}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSaved(!saved)}
          className={`chip ${saved ? "chip-active" : "chip-idle"} py-3 text-sm`}
        >
          {saved ? "Saved" : "Save Plan"}
        </button>
        <button className="chip chip-idle py-3 text-sm">Get Directions</button>
      </div>
    </section>
  );
}
