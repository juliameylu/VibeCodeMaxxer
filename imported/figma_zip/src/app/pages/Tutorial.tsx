import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Car, DollarSign, Heart, Search } from "lucide-react";
import { useState } from "react";
import { JarvisLogo } from "../components/JarvisLogo";

export function Tutorial() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1208]/95 backdrop-blur-sm text-white flex flex-col" onClick={handleNext}>
      {/* Top Bar */}
      <div className="p-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black tracking-[0.35em] uppercase text-[#8BC34A]/40 mb-1">POLYJARVIS</p>
          <h1 className="text-2xl font-black uppercase tracking-tight">USING POLYJARVIS</h1>
        </div>
        <button onClick={() => navigate("/dashboard")} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="icons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 w-full max-w-sm"
            >
              <div className="flex items-center gap-6 text-left">
                <div className="w-12 h-12 bg-[#8BC34A]/15 text-[#8BC34A] rounded-xl flex items-center justify-center shadow-lg border border-[#8BC34A]/20">
                  <Car size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">NEEDS A CAR</p>
                  <p className="text-white/40 text-sm">Indicates you probably need to drive here.</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-left">
                <div className="w-12 h-12 bg-[#8BC34A]/15 text-[#8BC34A] rounded-xl flex items-center justify-center shadow-lg border border-[#8BC34A]/20">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">COST</p>
                  <p className="text-white/40 text-sm">Shows if a place is free ($) or pricey ($$$).</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-left">
                <div className="w-12 h-12 bg-[#8BC34A]/15 text-[#8BC34A] rounded-xl flex items-center justify-center shadow-lg border border-[#8BC34A]/20">
                  <Heart size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">SAVE IT</p>
                  <p className="text-white/40 text-sm">Tap the heart to save an event for later.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="jarvis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="w-24 h-24 bg-[#F2E8CF] rounded-full mx-auto flex items-center justify-center shadow-xl">
                <JarvisLogo size={52} className="text-[#233216]" />
              </div>
              <h2 className="text-3xl font-black uppercase">ASK JARVIS</h2>
              <p className="text-lg text-white/60 max-w-xs mx-auto">
                Tap the green bubble at any time to ask for help planning your day or finding specific vibes.
              </p>
            </motion.div>
          )}
          
          {step === 2 && (
             <motion.div
              key="explore"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="w-24 h-24 bg-[#8BC34A]/15 text-[#8BC34A] rounded-full mx-auto flex items-center justify-center shadow-xl border border-[#8BC34A]/20">
                <Search size={40} />
              </div>
              <h2 className="text-3xl font-black uppercase">GO EXPLORE</h2>
              <p className="text-lg text-white/60 max-w-xs mx-auto">
                Use the Explore tab to browse categories like Hiking, Food, and Study Spots.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12">
        <p className="text-white/20 text-sm uppercase tracking-widest font-black text-center animate-pulse">
          TAP ANYWHERE TO CONTINUE
        </p>
      </div>
    </div>
  );
}