import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { JarvisLogo } from "../components/JarvisLogo";

const landingBg = "https://images.unsplash.com/photo-1677272231727-8eff7058488f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYW4lMjBMdWlzJTIwT2Jpc3BvJTIwaGlsbHMlMjBnb2xkZW4lMjBzdW5zZXQlMjBDYWxpZm9ybmlhJTIwbGFuZHNjYXBlfGVufDF8fHx8MTc3MTcyMzk2MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

const heroLines = [
  "What will you do today?",
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
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-between overflow-hidden bg-transparent">
      {/* BG image */}
      <div className="absolute inset-0 z-0">
        <img src={landingBg} alt="" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/40 via-[#0d1208]/55 to-[#0d1208]" />
      </div>

      {/* Fixed header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="z-10 w-full pt-[max(16px,env(safe-area-inset-top))] px-6 pb-2"
      >
        <h1 className="text-center text-sm font-black tracking-[0.35em] uppercase text-white/50">
          POLYJARVIS
        </h1>
      </motion.div>

      {/* Top section */}
      <div className="z-10 flex flex-col items-center text-center px-6 flex-1 justify-center max-w-sm mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
          className="mb-6 relative"
        >
          <div className="absolute inset-0 -m-4 rounded-full bg-[#8BC34A]/25 blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 bg-[#F2E8CF] rounded-full flex items-center justify-center shadow-2xl shadow-[#8BC34A]/30 border-4 border-[#8BC34A]/30">
            <JarvisLogo size={52} className="text-[#233216]" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[#8BC34A] text-xl tracking-[0.3em] uppercase font-bold mb-10 drop-shadow-lg"
        >
          PolyJarvis
        </motion.p>

        {/* Rotating hero text */}
        <div className="h-24 flex items-center justify-center w-full mb-6">
          <AnimatePresence mode="wait">
            <motion.h1
              key={heroIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-white leading-snug drop-shadow-md"
            >
              {heroLines[heroIdx]}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Marquee prompt pills */}
        <div className="w-screen overflow-hidden mb-4 -mx-6">
          <div className="flex mb-2">
            <div className="flex gap-2 shrink-0" style={{ animation: "marquee-left 30s linear infinite" }}>
              {marqueeItems.map((pill, i) => (
                <span
                  key={`r1-${i}`}
                  className="bg-white/10 backdrop-blur-md text-white/80 text-xs font-medium px-4 py-2 rounded-full border border-white/15 whitespace-nowrap"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="flex">
            <div className="flex gap-2 shrink-0" style={{ animation: "marquee-right 35s linear infinite" }}>
              {[...marqueeItems].reverse().map((pill, i) => (
                <span
                  key={`r2-${i}`}
                  className="bg-white/8 backdrop-blur-md text-white/60 text-xs font-medium px-4 py-2 rounded-full border border-white/10 whitespace-nowrap"
                >
                  {pill}
                </span>
              ))}
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

      {/* Bottom CTAs */}
      <div className="z-10 w-full px-6 pb-10 max-w-sm mx-auto space-y-3">
        <Link to="/signin">
          <button className="w-full py-4 bg-[#8BC34A] rounded-2xl shadow-xl shadow-[#8BC34A]/20 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            <span className="text-lg font-bold text-[#1a2e10]">Get Started</span>
            <ArrowRight className="text-[#1a2e10]" size={20} />
          </button>
        </Link>

        <Link to="/signin" className="block text-center">
          <span className="text-white/60 text-sm font-medium hover:text-white transition-colors">
            Already have an account? <span className="underline underline-offset-2 decoration-white/40">Sign in</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
