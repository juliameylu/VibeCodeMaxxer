import { Lightbulb, Clock } from "lucide-react";

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
  return (
    <div className="animate-fade-in">
      <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Lightbulb size={24} className="text-accent" />
        Your Suggested After-Class Plan
      </h3>

      <div className="bg-gradient-to-br from-accent/10 to-primary/5 rounded-xl p-6 border border-accent/20">
        {/* Study Block */}
        <div className="mb-6">
          <h4 className="font-bold text-slate-900 mb-2">📖 Study Block</h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock size={16} className="text-accent" />
              <span>{DUMMY_PLAN.studyBlock}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span>📍</span>
              <span>{DUMMY_PLAN.location}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DUMMY_PLAN.topics.map((topic) => (
                <span
                  key={topic}
                  className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-[1px] bg-slate-300" />
          <span className="text-sm font-semibold text-slate-600">Then</span>
          <div className="flex-1 h-[1px] bg-slate-300" />
        </div>

        {/* Reward */}
        <div>
          <h4 className="font-bold text-slate-900 mb-2">🎉 Reward</h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <p className="font-semibold text-slate-900">
              {DUMMY_PLAN.reward.name}
            </p>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock size={16} className="text-secondary" />
              <span>{DUMMY_PLAN.reward.arrival}</span>
            </div>
            <p className="text-sm text-slate-600 italic">
              {DUMMY_PLAN.reward.description}
            </p>
          </div>
        </div>

        <button className="w-full mt-6 bg-gradient-to-r from-accent to-primary text-white font-semibold py-3 rounded-lg hover:shadow-lg transition">
          Save This Plan
        </button>
      </div>
    </div>
  );
}
