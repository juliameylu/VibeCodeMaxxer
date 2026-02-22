import { Outlet, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";
import { FloatingJarvis } from "./components/FloatingJarvis";

const natureBg = "https://images.unsplash.com/photo-1584729125313-a0e1ca1b1e60?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjBob3VyJTIwZ3JlZW4lMjBoaWxscyUyMENhbGlmb3JuaWElMjBzdW5zZXQlMjB3YXJtJTIwbmF0dXJlfGVufDF8fHx8MTc3MTcyMzU0NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function Root() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen font-sans text-white selection:bg-[#8BC34A]/30 relative">
      {/* Fixed nature background */}
      <div className="fixed inset-0 z-0">
        <img src={natureBg} alt="" className="w-full h-full object-cover scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e10]/75 via-[#1a2e10]/70 to-[#0d1208]/85" />
      </div>
      <div className="relative z-10">
        <Toaster position="top-center" richColors theme="dark" />
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <FloatingJarvis />
      </div>
    </div>
  );
}