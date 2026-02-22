import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function MorroBayWaveLoading({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Sequence of animation stages
    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => setStage(2), 1500);
    const t3 = setTimeout(() => {
      setStage(3);
      setTimeout(onComplete, 800); // Wait for exit animation
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0d1208] flex items-center justify-center overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full h-full">
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e12] to-[#0d1208]" />

        {/* Morro Rock Silhouette (Simplified) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-64 h-48 bg-[#0a1808] rounded-full blur-3xl opacity-60"
        />
        
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2 }}
            className="absolute bottom-0 left-0 right-0 h-[40%] flex items-end justify-center"
        >
             {/* Abstract Rock Shape */}
             <svg viewBox="0 0 400 200" className="w-[120%] h-auto text-[#080c05] fill-current opacity-80 transform translate-y-10">
                <path d="M50 200 Q 150 50 200 80 Q 250 110 350 200 Z" />
             </svg>
        </motion.div>


        {/* Waves */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#006064] to-transparent opacity-30"
            initial={{ y: 100 }}
            animate={{ 
              y: [50, 0, 20],
              scaleY: [0.8, 1.2, 1]
            }}
            transition={{ 
              duration: 3, 
              delay: i * 0.4, 
              repeat: Infinity, 
              repeatType: "mirror",
              ease: "easeInOut"
            }}
            style={{ 
                zIndex: 10 + i,
                filter: `blur(${10 + i * 5}px)`
            }}
          />
        ))}

        {/* Wave Crash Effect */}
        <motion.div
             className="absolute bottom-10 left-0 right-0 h-32 bg-white/5 blur-xl"
             initial={{ opacity: 0 }}
             animate={{ opacity: [0, 0.4, 0] }}
             transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
        />


        {/* Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white tracking-[0.3em] uppercase drop-shadow-lg"
          >
            POLY<span className="text-[#F2E8CF]">JARVIS</span>
          </motion.h1>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.5 }}
             transition={{ delay: 0.5 }}
             className="text-[10px] text-white tracking-[0.2em] mt-2 capitalize"
          >
            Loading San Luis Obispo...
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}