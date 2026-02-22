import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Car, Bus, DollarSign, Pin, Search, Users, ClipboardList, Sparkles, ArrowRight, Bike, ExternalLink } from "lucide-react";
import { useState } from "react";

const steps = [
  {
    title: "GETTING AROUND SLO",
    items: [
      { icon: Bus, label: "SLO TRANSIT", desc: "FREE with Cal Poly ID! Route 4 goes downtown.", link: "https://www.slocity.org/government/department-directory/public-works/slo-transit" },
      { icon: Bus, label: "MUSTANG SHUTTLE", desc: "Campus loop shuttle — free for students.", link: "https://afd.calpoly.edu/sustainability/commute-options/mustang-shuttle" },
      { icon: Car, label: "CAR / ZIPCAR", desc: "Need a car for beaches & day trips.", emoji: "🚗" },
      { icon: Bike, label: "BIKE / SCOOTER", desc: "SLO is Gold-level Bike Friendly! Great for downtown.", emoji: "🛴" },
    ],
  },
  {
    title: "YOUR TOOLS",
    items: [
      { icon: Sparkles, label: "JARVIS", desc: "Ask anything about SLO — even with typos! Food, hikes, plans." },
      { icon: Search, label: "EXPLORE", desc: "Browse categories, filter by price & transport mode." },
      { icon: ClipboardList, label: "PLANS", desc: "Build day itineraries as a flowchart." },
      { icon: Users, label: "JAMS", desc: "Create crews and plan together with invite codes." },
    ],
  },
  {
    title: "PRO TIPS",
    items: [
      { icon: Pin, label: "PIN & PLAN", desc: "Pin spots from Explore, then add them to Plans." },
      { icon: Sparkles, label: "TRAIN JARVIS", desc: "Go to Profile to teach Jarvis your preferences." },
      { icon: DollarSign, label: "BUDGET", desc: "Filter by Free/$/$$/$$$ on Explore. Farmers Market = cheap eats!" },
      { icon: Bus, label: "BUS IS FREE", desc: "SLO Transit is FREE with your Cal Poly ID!" },
    ],
  },
];

export function Tutorial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else navigate("/dashboard");
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1208]/95 backdrop-blur-xl text-white flex flex-col">
      {/* Header — no logo, just close button */}
      <div className="p-5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">HOW IT WORKS</span>
          <span className="text-[9px] font-bold text-white/15 uppercase">· STEP {step + 1}/{steps.length}</span>
        </div>
        <button onClick={() => navigate("/dashboard")} className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-all border border-white/10">
          <X size={18} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-4">
        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#F2E8CF] rounded-full"
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-2xl font-black uppercase tracking-tight mb-1">{current.title}</h2>

            <div className="space-y-2.5">
              {current.items.map((item, i) => {
                const Icon = item.icon;
                const hasLink = "link" in item && item.link;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white/8 border border-white/12 rounded-xl p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#F2E8CF]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-[#F2E8CF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase tracking-wider">{item.label}</p>
                        <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                    {hasLink && (
                      <a
                        href={(item as any).link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-2.5 ml-14 text-[10px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-3 py-1.5 rounded-full border border-[#F2E8CF]/20 w-fit active:bg-[#F2E8CF]/20 transition-colors"
                      >
                        <ExternalLink size={10} /> OPEN WEBSITE
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div className="p-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        <button
          onClick={handleNext}
          className="w-full py-4 bg-[#F2E8CF] text-[#233216] rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-lg shadow-[#F2E8CF]/15"
        >
          {step < steps.length - 1 ? "NEXT" : "LET'S GO!"}
          <ArrowRight size={18} />
        </button>
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-2 py-2 text-white/25 text-sm font-bold"
          >
            BACK
          </button>
        )}
      </div>
    </div>
  );
}
