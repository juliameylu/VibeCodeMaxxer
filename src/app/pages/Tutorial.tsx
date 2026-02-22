import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Car, Bus, DollarSign, Pin, Search, Users, ClipboardList, Sparkles, ArrowRight, ArrowDown, Bike, ExternalLink, Home, Compass, Timer, Zap, ChevronDown, Music, User, Navigation, UtensilsCrossed, MapPin, Map, MessageCircle, TreePine, Mountain, Waves, Sun } from "lucide-react";
import { useState } from "react";
import { JarvisLogo } from "../components/JarvisLogo";

const stepBackgrounds = [
  "https://images.unsplash.com/photo-1678070803622-226b432921d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=60",
  "https://images.unsplash.com/photo-1579446772002-51b88cf774fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=60",
  "https://images.unsplash.com/photo-1761895565224-6e8df5afcf56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=60",
  "https://images.unsplash.com/photo-1754948977336-2a166758a4aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=60",
  "https://images.unsplash.com/photo-1770563181870-eca60076ffd8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=60",
];

const steps = [
  {
    title: "Welcome to",
    accent: "PolyJarvis",
    subtitle: "Your gateway to everything San Luis Obispo",
    themeColor: "#F2E8CF",
    themeEmoji: "🌿",
    items: [
      { icon: Home, label: "Home", desc: "Your dashboard with live weather, focus timer, tasks, and friends activity.", highlight: true },
      { icon: Compass, label: "Explore", desc: "Browse 230+ curated SLO spots. Filter by category, pin favorites, get personalized picks." },
      { icon: Users, label: "Jams", desc: "Create group hangouts. Add spots, invite friends, and vote on locations together." },
      { icon: ClipboardList, label: "Plans", desc: "Build visual day itineraries with events from Explore. Drag to reorder." },
      { icon: User, label: "Profile", desc: "Your pinned spots, preferences, friends, and account settings." },
    ],
  },
  {
    title: "Your Home",
    accent: "Dashboard",
    subtitle: "Five modes to match your energy",
    themeColor: "#8BC34A",
    themeEmoji: "🏡",
    items: [
      { icon: Compass, label: "Explore Mode", desc: "Quick access to nearby spots, inside/outside picks, and friends' activity feed.", highlight: true },
      { icon: Timer, label: "Work Mode", desc: "Focus timer with study streak tracking. Your PolyTree grows as you study." },
      { icon: UtensilsCrossed, label: "Dine Mode", desc: "Jarvis becomes a food expert. Ask about tacos, brunch, late night, or any cuisine." },
      { icon: Map, label: "Map Mode", desc: "Interactive map of all SLO spots with bus routes, friends' locations, and category filtering." },
      { icon: MessageCircle, label: "Social Mode", desc: "See what friends are up to and coordinate plans together." },
    ],
  },
  {
    title: "Discover",
    accent: "SLO",
    subtitle: "230+ real places, curated for Cal Poly students",
    themeColor: "#64B5F6",
    themeEmoji: "🗺️",
    items: [
      { icon: Compass, label: "Explore Page", desc: "Masonry grid with category filters: Food, Coffee, Hikes, Beaches, Study, Music, and more.", highlight: true },
      { icon: Map, label: "Map View", desc: "Every spot on a warm-toned map with category-specific icons. Friends show up too." },
      { icon: Pin, label: "Pin Spots", desc: "Tap the pin icon to save any place. Pinned spots appear in Profile and on the Map." },
      { icon: MapPin, label: "Place Details", desc: "Full info with transport modes, stats, tags, and one-tap 'Add to Jam or Plan'." },
    ],
  },
  {
    title: "Getting",
    accent: "Around",
    subtitle: "SLO is Gold-level Bicycle Friendly. Here's what to know.",
    themeColor: "#FFB74D",
    themeEmoji: "🚌",
    items: [
      { icon: Bus, label: "SLO Transit", desc: "FREE with Cal Poly ID! Route 4 goes downtown, Route 6 is the campus loop.", highlight: true, link: "https://www.slocity.org/government/department-directory/public-works/slo-transit" },
      { icon: Bus, label: "Mustang Shuttle", desc: "Campus loop shuttle, also free for students.", link: "https://afd.calpoly.edu/sustainability/commute-options/mustang-shuttle" },
      { icon: Bike, label: "Bike / Scooter", desc: "SLO is Gold-level Bike Friendly! Great for downtown trips — often faster than driving." },
      { icon: Car, label: "Car / Rideshare", desc: "Needed for beaches and day trips. Free parking: side streets off Broad St." },
    ],
  },
  {
    title: "Master",
    accent: "PolyJarvis",
    subtitle: "These features will change how you experience SLO",
    themeColor: "#CE93D8",
    themeEmoji: "✨",
    items: [
      { icon: Sparkles, label: "Ask Jarvis", desc: "Your AI guide with deep SLO knowledge. Ask about food, hikes, plans, or say \"make a plan\" to start building.", highlight: true },
      { icon: Users, label: "Jams", desc: "Group hangouts with real-time RSVP and voting. Share invite links with your crew." },
      { icon: ClipboardList, label: "Plans", desc: "Visual step-by-step itineraries. Trip, Daily, or Event mode with themed backgrounds." },
      { icon: Timer, label: "PolyTree", desc: "In Work mode, your study tree grows with every session. Track hours and build streaks." },
      { icon: Sparkles, label: "Train Jarvis", desc: "Go to Profile > Preferences. Swipe through activities to teach Jarvis your style." },
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
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 text-white flex flex-col overflow-hidden">
      {/* Background image — changes per step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-0"
        >
          <img
            src={stepBackgrounds[step]}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0d1208]/85 to-[#0d1208]/98" />
        </motion.div>
      </AnimatePresence>

      {/* Ambient glow matching step color */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none opacity-10 transition-colors duration-700"
        style={{ backgroundColor: current.themeColor }}
      />

      {/* Header */}
      <div className="p-5 flex justify-between items-center flex-shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-full border transition-colors duration-500"
            style={{ backgroundColor: `${current.themeColor}15`, borderColor: `${current.themeColor}25` }}
          >
            <JarvisLogo size={18} style={{ color: current.themeColor }} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/30 capitalize tracking-wider">App Tour</span>
            <span className="text-[9px] font-bold text-white/15 ml-2">
              {step + 1} of {steps.length}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-3 py-1.5 bg-white/8 rounded-full text-[10px] font-bold text-white/40 hover:text-white/60 active:scale-90 transition-all border border-white/10"
        >
          Skip Tour
        </button>
      </div>

      {/* Progress bar — themed color */}
      <div className="px-5 mb-4 flex-shrink-0 relative z-10">
        <div className="h-1 bg-white/6 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${current.themeColor}, ${current.themeColor}CC)` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 overflow-y-auto relative z-10 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Title with emoji badge */}
            <div className="mb-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 border"
                style={{ backgroundColor: `${current.themeColor}15`, borderColor: `${current.themeColor}20` }}
              >
                <span className="text-xl">{current.themeEmoji}</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold capitalize tracking-tight"
              >
                {current.title}{" "}
                <span style={{ color: current.themeColor }}>{current.accent}</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-white/35 mt-1"
              >
                {current.subtitle}
              </motion.p>
            </div>

            {/* Feature cards */}
            <div className="space-y-2.5">
              {current.items.map((item, i) => {
                const Icon = item.icon;
                const hasLink = "link" in item && item.link;
                const isHighlight = "highlight" in item && item.highlight;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="border rounded-xl p-4 backdrop-blur-sm transition-colors"
                    style={{
                      backgroundColor: isHighlight ? `${current.themeColor}10` : "rgba(255,255,255,0.04)",
                      borderColor: isHighlight ? `${current.themeColor}25` : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isHighlight ? `${current.themeColor}25` : `${current.themeColor}12`,
                        }}
                      >
                        <Icon size={20} style={{ color: current.themeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white capitalize tracking-wider">
                          {item.label}
                        </p>
                        <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                      </div>
                      {isHighlight && (
                        <div
                          className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                          style={{ backgroundColor: current.themeColor }}
                        />
                      )}
                    </div>
                    {hasLink && (
                      <a
                        href={(item as any).link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-2.5 ml-14 text-[10px] font-bold px-3 py-1.5 rounded-full border w-fit active:opacity-80 transition-opacity"
                        style={{
                          color: current.themeColor,
                          backgroundColor: `${current.themeColor}12`,
                          borderColor: `${current.themeColor}20`,
                        }}
                      >
                        <ExternalLink size={10} /> Open Website
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
      <div className="p-5 pb-[max(24px,env(safe-area-inset-bottom))] flex-shrink-0 relative z-10">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-colors duration-500"
          style={{
            backgroundColor: current.themeColor,
            color: "#233216",
            boxShadow: `0 10px 25px ${current.themeColor}20`,
          }}
        >
          {step < steps.length - 1 ? "Next" : "Let's Explore SLO!"}
          <ArrowRight size={18} />
        </motion.button>
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-2 py-2 text-white/25 text-sm font-bold"
          >
            Back
          </button>
        )}

        {/* Dot indicators — themed */}
        <div className="flex justify-center gap-2 mt-3">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 6,
                backgroundColor: i === step ? current.themeColor : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}