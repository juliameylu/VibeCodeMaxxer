import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, User } from "lucide-react";
import { JarvisLogo } from "../components/JarvisLogo";

const landingBg = "https://images.unsplash.com/photo-1766378870877-d3a95c349668?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMGhpbGxzJTIwQ2FsaWZvcm5pYSUyMHN1bnNldCUyMG5hdHVyZXxlbnwxfHx8fDE3NzE3MjUxODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const heroLines = [
  "What will you accomplish today?",
  "Discover hidden SLO gems",
  "Balance work and play",
  "Your Cal Poly adventure starts here",
  "Find your perfect study spot",
  "Beach day or Bishop Peak?",
  "Explore with your crew",
  "Let Jarvis plan your day",
];

const promptPills = [
  "Best tacos near campus?",
  "Plan a beach trip",
  "Where to study tonight?",
  "Free things to do",
  "Sunset hike spots",
  "Coffee with WiFi",
  "Weekend road trip ideas",
  "Live music this week",
  "Best tri-tip in SLO?",
  "Cheap date ideas",
  "Dog-friendly spots",
  "Farmers market tips",
];

export function Landing() {
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroLines.length), 3000);
    return () => clearInterval(t);
  }, []);

  const marqueeItems = [...promptPills, ...promptPills];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-transparent">
      {/* BG image */}
      <div className="absolute inset-0 z-0">
        <img src={landingBg} alt="" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/30 via-[#0d1208]/50 to-[#0d1208]" />
      </div>
      <div
        className="relative z-10"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: "100dvh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex-1 overflow-y-auto flex flex-col items-center">
          {/* Spacer above hero block */}
          <div className="flex-1 min-h-[4vh]" />

          {/* Center content block: Logo + Title + Rotating text */}
          <div className="z-10 flex flex-col items-center text-center px-5 max-w-md mx-auto">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
              className="mb-4 relative"
            >
              <div className="absolute inset-0 -m-4 rounded-full bg-[#F2E8CF]/15 blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 bg-[#F2E8CF] rounded-full flex items-center justify-center shadow-2xl shadow-[#F2E8CF]/20 border-4 border-[#F2E8CF]/40">
                <JarvisLogo size={44} className="text-[#233216]" />
              </div>
            </motion.div>

            {/* POLYJARVIS logo text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-2"
            >
              <h1 className="text-[clamp(1.35rem,5vw,1.85rem)] tracking-[0.18em] uppercase font-black drop-shadow-lg">
                <span className="text-white">POLY</span>
                <span className="text-[#F2E8CF]">JARVIS</span>
              </h1>
              <p className="text-[9px] text-white/40 font-bold tracking-[0.16em] uppercase mt-0.5">
                SAN LUIS OBISPO LIFESTYLE DASHBOARD
              </p>
            </motion.div>

            {/* Rotating hero text */}
            <div className="h-20 flex items-center justify-center w-full mt-2">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={heroIdx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5 }}
                  className="text-3xl font-bold text-white leading-snug drop-shadow-md"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {heroLines[heroIdx]}
                </motion.h2>
              </AnimatePresence>
            </div>
          </div>

          {/* Spacer below hero block to keep it centered/higher */}
          <div className="flex-1 min-h-[8vh]" />

          {/* Bottom stack */}
          <div className="mt-auto w-full flex-shrink-0">
            {/* CTAs - keep clear spacing near home indicator */}
            <div className="z-10 w-full px-6 max-w-sm mx-auto space-y-4 mb-10 -translate-y-[2px]">
              <Link to="/signin">
                <button className="w-full py-4 bg-white rounded-2xl shadow-xl shadow-white/10 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
                  <span className="text-lg font-bold text-[#1a2e10]">Get Started</span>
                  <ArrowRight className="text-[#1a2e10]" size={20} />
                </button>
              </Link>

              <Link to="/signin" className="block">
                <button className="w-full py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
                  <User className="text-white/70" size={16} />
                  <span className="text-white/80 text-sm font-bold">Sign In</span>
                </button>
              </Link>
            </div>

            {/* Marquee prompt pills */}
            <div className="z-10 w-full overflow-hidden pb-2">
              <div className="flex mb-1.5">
                <div className="flex gap-2 shrink-0" style={{ animation: "marquee-left 55s linear infinite" }}>
                  {marqueeItems.map((pill, i) => (
                    <span
                      key={`r1-${i}`}
                      className="bg-white/12 backdrop-blur-md text-white/80 text-xs font-medium px-4 py-2 rounded-full border border-white/20 whitespace-nowrap"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex">
                <div className="flex gap-2 shrink-0" style={{ animation: "marquee-right 60s linear infinite" }}>
                  {[...marqueeItems].reverse().map((pill, i) => (
                    <span
                      key={`r2-${i}`}
                      className="bg-white/8 backdrop-blur-md text-white/60 text-xs font-medium px-4 py-2 rounded-full border border-white/15 whitespace-nowrap"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* "ask jarvis..." pinned to bottom of visible stack */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="z-10 text-white/30 text-xs tracking-[0.15em] pb-2 text-center italic"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ask jarvis...
            </motion.p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
