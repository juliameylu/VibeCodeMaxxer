import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { ArrowRight, Car, Bike, Footprints, Dumbbell, Music, PartyPopper, Users, BookOpen, CalendarDays, X as XIcon } from 'lucide-react';
import { clsx } from 'clsx';

type PreferenceState = {
  locationType: 'inside' | 'outside' | 'both' | null;
  commute: 'scooter' | 'car' | 'bike' | 'skateboard' | 'unicycle' | 'walk' | null;
  hasCar: boolean | null;
  zipcar: boolean | null;
  interests: string[];
  noTransportSuggestions: boolean;
};

// Custom SVG Icons
const ScooterIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 5h-5" />
    <path d="M12 5v11" />
    <circle cx="15.5" cy="17.5" r="2.5" />
    <circle cx="8.5" cy="17.5" r="2.5" />
    <path d="M12 16h3" />
  </svg>
);

const SkateboardIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 14c-2 0-3-2-5-2H7c-2 0-3 2-5 2" />
    <circle cx="6.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const UnicycleIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="16" r="4" />
    <path d="M12 16V8" />
    <path d="M9 8h6" />
    <path d="M12 8V4" />
    <path d="M10 4h4" />
    <path d="M9 16h6" />
  </svg>
);

export function Preferences() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PreferenceState>({
    locationType: null,
    commute: null,
    hasCar: null,
    zipcar: null,
    interests: [],
    noTransportSuggestions: false,
  });

  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
      if(isAnimating) {
          const timer = setTimeout(() => {
              navigate('/dashboard');
          }, 3500);
          return () => clearTimeout(timer);
      }
  }, [isAnimating, navigate]);

  const handleLocation = (val: 'inside' | 'outside' | 'both') => {
    setPrefs({ ...prefs, locationType: val });
    if (step === 0) setStep(1);
  };

  const handleCommute = (val: PreferenceState['commute']) => {
    setPrefs({ ...prefs, commute: val });
    if (step === 1) setStep(2);
  };

  const handleHasCar = (val: boolean) => {
      setPrefs({ ...prefs, hasCar: val });
      if (step === 2) setStep(3);
  };

  const handleZipcar = (val: boolean) => {
    setPrefs({ ...prefs, zipcar: val });
    if (step === 3) setStep(4);
  };

  const toggleInterest = (interest: string) => {
    const current = prefs.interests;
    if (current.includes(interest)) {
      setPrefs({ ...prefs, interests: current.filter((i) => i !== interest) });
    } else {
      setPrefs({ ...prefs, interests: [...current, interest] });
    }
  };

  const handleFinish = () => {
    localStorage.setItem('polyjarvis_prefs', JSON.stringify(prefs));
    setIsAnimating(true);
  };

  if (isAnimating) {
      return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#0a0f07] z-50 flex flex-col items-center justify-center text-white p-6 text-center"
          >
              <motion.h1 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="text-4xl md:text-6xl font-bold font-serif italic mb-4 text-[#F2E8CF]"
              >
                  Personalizing PolyJarvis...
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "200px" }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
                className="h-1 bg-[#8BC34A]/50 rounded-full mb-8"
              />
              <motion.p
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 1 }}
                 className="text-white/80 uppercase tracking-widest text-sm"
              >
                  Finding events for you
              </motion.p>
          </motion.div>
      );
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-start pt-12 p-6 text-white overflow-y-auto pb-32 bg-transparent">
      
      <div className="z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Step {step + 1} of 5</p>
          <h1 className="text-3xl font-bold text-white">Let's tailor your day.</h1>
          <p className="text-sm text-white/50">Select what you want — or skip with ✕</p>
        </div>

        {/* Question 1: Location Type */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            I feel like being...
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(['inside', 'outside', 'both'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => handleLocation(opt)}
                className={clsx(
                  "p-4 rounded-xl border-2 transition-all text-center capitalize font-bold text-sm backdrop-blur-sm",
                  prefs.locationType === opt
                    ? "bg-[#8BC34A] text-[#233216] border-[#8BC34A] shadow-md transform scale-105"
                    : "bg-white/8 border-white/10 text-white/60 hover:bg-white/12 hover:border-[#8BC34A]/30"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2: Commute */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                I usually commute with...
                <button onClick={() => { setPrefs({ ...prefs, noTransportSuggestions: true }); setStep(4); }}
                  className="ml-auto text-xs text-white/40 hover:text-white flex items-center gap-0.5">
                   <XIcon size={14} /> Skip
                 </button>
               </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'walk', label: 'Walking', icon: Footprints },
                  { id: 'bike', label: 'Bike', icon: Bike },
                  { id: 'car', label: 'Car', icon: Car },
                  { id: 'scooter', label: 'Scooter', icon: ScooterIcon },
                  { id: 'skateboard', label: 'Skateboard', icon: SkateboardIcon },
                  { id: 'unicycle', label: 'Unicycle', icon: UnicycleIcon },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleCommute(opt.id as any)}
                    className={clsx(
                      "p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-24 font-bold backdrop-blur-sm",
                      prefs.commute === opt.id
                        ? "bg-[#8BC34A] text-[#233216] border-[#8BC34A] shadow-md transform scale-105"
                        : "bg-white/8 border-white/10 text-white/60 hover:bg-white/12 hover:border-[#8BC34A]/30"
                    )}
                  >
                    {opt.icon && <opt.icon size={24} />}
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question 3: Has Car */}
        <AnimatePresence>
            {step >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span className="bg-[#8BC34A] text-[#233216] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        Do you have a car?
                    </h2>
                    <div className="flex gap-4">
                        {[
                        { val: true, label: 'Yes' },
                        { val: false, label: 'No' },
                        ].map((opt) => (
                        <button
                            key={opt.label}
                            onClick={() => handleHasCar(opt.val)}
                            className={clsx(
                            "flex-1 p-4 rounded-xl border-2 transition-all text-center font-bold backdrop-blur-sm",
                            prefs.hasCar === opt.val
                                ? "bg-[#8BC34A] text-[#233216] border-[#8BC34A] shadow-md transform scale-105"
                                : "bg-white/8 border-white/10 text-white/60 hover:bg-white/12 hover:border-[#8BC34A]/30"
                            )}
                        >
                            {opt.label}
                        </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Question 4: Zipcars */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <span className="bg-[#8BC34A] text-[#233216] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                Are you okay w/ Zipcars?
              </h2>
              <div className="flex gap-4">
                {[
                  { val: true, label: 'Yes' },
                  { val: false, label: 'No' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleZipcar(opt.val)}
                    className={clsx(
                      "flex-1 p-4 rounded-xl border-2 transition-all text-center font-bold backdrop-blur-sm",
                      prefs.zipcar === opt.val
                        ? "bg-[#8BC34A] text-[#233216] border-[#8BC34A] shadow-md transform scale-105"
                        : "bg-white/8 border-white/10 text-white/60 hover:bg-white/12 hover:border-[#8BC34A]/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question 5: Interests */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                I like... <span className="text-xs text-white/40 font-normal">(select multiple)</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                    'Food', 'Hiking', 'Animals', 'Crafts', 'Live Music', 'Study Spots', 'Beaches', 'Shopping',
                    'Gym', 'Dancing', 'Workout Classes', 'Nightlife', 'Student Events', 'Art', 'Museums',
                    'Concerts', 'Restaurants', 'Active/Sports', 'Chill/Indoor'
                ].map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={clsx(
                      "px-4 py-2.5 rounded-full border transition-all text-sm font-bold backdrop-blur-sm",
                      prefs.interests.includes(interest)
                        ? "bg-[#8BC34A] text-[#233216] border-[#8BC34A] shadow-md transform scale-105"
                        : "bg-white/8 border-white/10 text-white/60 hover:bg-white/12 hover:border-[#8BC34A]/30"
                    )}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              {/* Calendar Link */}
               <div className="bg-[#8BC34A]/10 border border-[#8BC34A]/20 rounded-xl p-4 flex items-start gap-3 backdrop-blur-sm">
                 <CalendarDays size={20} className="text-[#8BC34A] flex-shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm font-bold text-white">Link your calendar</p>
                   <p className="text-xs text-white/50 mb-2">Get smarter recommendations based on your schedule</p>
                   <button className="text-[10px] font-bold text-[#8BC34A] bg-[#8BC34A]/15 px-3 py-1.5 rounded-full border border-[#8BC34A]/20">
                     Coming soon
                   </button>
                 </div>
               </div>

               {/* Finish Button */}
               <div className="pt-6">
                <button
                  onClick={handleFinish}
                  disabled={prefs.interests.length === 0}
                  className={clsx(
                    "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                    prefs.interests.length > 0
                      ? "bg-[#8BC34A] text-[#233216] hover:bg-[#9CCC65] hover:scale-[1.02]"
                      : "bg-white/10 text-white/20 cursor-not-allowed"
                  )}
                >
                  Find My Adventures
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
