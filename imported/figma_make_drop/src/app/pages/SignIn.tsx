import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "/utils/supabase/client";
import { toast } from "sonner";
import { User, Lock, ArrowRight, UserPlus, Mail, CalendarSync, Key, Info, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { JarvisLogo } from "../components/JarvisLogo";

const natureBg = "https://images.unsplash.com/photo-1715559929451-4019bf7315a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTYW4lMjBMdWlzJTIwT2Jpc3BvJTIwQmlzaG9wJTIwUGVhayUyMHNjZW5pYyUyMG1vdW50YWluJTIwbmF0dXJlJTIwYWVzdGhldGljfGVufDF8fHx8MTc3MTcxODgwM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

export function SignIn() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [canvasToken, setCanvasToken] = useState("");
  const [calendarLinked, setCalendarLinked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---- Step 1: Auth ----
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const emailLower = email.trim().toLowerCase();
    const pw = password.trim();

    if (!emailLower || !pw) {
      setErrorMsg("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      await supabase.auth.signOut();

      if (isSignUp) {
        // --- SIGN UP FLOW ---
        console.log(`[Auth] Signup: ${emailLower}`);
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-6c4f77a7/signup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ email: emailLower, password: pw, name: name.trim() }),
          }
        );

        const data = await res.json();
        console.log(`[Auth] Signup response: ${res.status}`, data);

        if (!res.ok) {
          if (data.code === "email_exists" || data.error?.includes("already")) {
            toast.info("Account exists — signing you in...");
            setIsSignUp(false);
            const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password: pw });
            if (error) {
              throw new Error("Account exists, but password didn't match. Please sign in with your correct password.");
            }
            toast.success("Signed in!");
            navigate("/dashboard");
            return;
          }
          throw new Error(data.error || "Sign up failed");
        }

        toast.message("Creating account...");
        await new Promise(r => setTimeout(r, 1000));
        
        let success = false;
        
        for (let i = 1; i <= 3; i++) {
          const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password: pw });
          if (!error) { 
            success = true; 
            break; 
          }
          console.log(`[Auth] Auto-signin attempt ${i} failed:`, error);
          if (i < 3) await new Promise(r => setTimeout(r, 1000 * i));
        }

        if (!success) {
           setIsSignUp(false);
           toast.success("Account created! Please sign in.");
           setLoading(false);
           return;
        }

        toast.success("Account created!");
        setStep(2); // → assignments setup
      } else {
        // --- SIGN IN FLOW ---
        console.log(`[Auth] Sign-in: ${emailLower}`);
        const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password: pw });
        
        if (error) {
          console.error("[Auth] Sign-in error:", error);
          if (error.message.includes("Invalid login credentials")) {
             throw new Error("Incorrect email or password. If you don't have an account, please Create Account.");
          }
          throw error;
        }
        
        toast.success("Signed in!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("[Auth] Error:", err);
      setErrorMsg(err.message || "Authentication failed");
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: Canvas / Calendar → then straight to preferences ----
  const handleLinkCanvas = () => {
    if (canvasToken.trim()) {
      localStorage.setItem("canvas_token", canvasToken.trim());
      toast.success("Canvas linked!");
    }
    navigate("/preferences");
  };

  const handleCalendarSync = () => {
    setCalendarLinked(true);
    toast.success("Calendar synced!");
  };

  const skipToPreferences = () => {
    navigate("/preferences");
  };

  // ---- Progress bar ----
  const totalSteps = isSignUp ? 2 : 1;
  const progress = isSignUp ? (step / totalSteps) * 100 : 100;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
       {/* BG image */}
       <div className="absolute inset-0 z-0">
        <img src={natureBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-[#0d1208]/50 backdrop-blur-[2px]" />
      </div>

      {/* Progress bar for signup */}
      {isSignUp && step > 1 && (
        <div className="absolute top-8 left-0 w-full px-8 z-20">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full bg-[#8BC34A] rounded-full shadow-[0_0_10px_rgba(139,195,74,0.5)]"
              initial={{ width: "50%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-white/60 font-bold mt-2 text-center tracking-wider">
            Step {step} of {totalSteps}
          </p>
        </div>
      )}

      <div className="w-full max-w-md px-6 py-8 z-10">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-[#F2E8CF] rounded-full mx-auto flex items-center justify-center shadow-xl border-4 border-[#8BC34A]/20"
          >
            <JarvisLogo size={42} className="text-[#233216]" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              {step === 1
                ? isSignUp ? "Join the Herd" : "Welcome Back"
                : "Link Your Assignments"}
            </h1>
            <p className="text-sm text-white/70 mt-2 font-medium">
              {step === 1
                ? "Your Cal Poly lifestyle hub"
                : "Import deadlines so you know when to lock in"}
            </p>
          </div>
        </div>

        {/* Card */}
        <motion.div layout className="bg-[#F2E8CF] rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ===== STEP 1: Auth ===== */}
            {step === 1 && (
              <motion.form
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleAuth}
                className="p-8 space-y-6"
              >
                {/* Error Banner */}
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-bold">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold text-[#5C4D3C] uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                      <input type="text" placeholder="Mustang Mike" value={name} onChange={e => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-[#5C4D3C] uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                    <input type="email" required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-[#5C4D3C] uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                    <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                  </div>
                </div>

                <div className="bg-[#4A6628]/10 border border-[#4A6628]/20 p-3 rounded-xl text-xs text-[#233216] flex items-start gap-2.5 leading-relaxed">
                  <Info size={16} className="flex-shrink-0 mt-0.5 text-[#4A6628]" />
                  <span>Separate PolyJarvis account — don't use your Cal Poly password.</span>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-[#233216] text-[#F2E8CF] py-4 rounded-2xl font-extrabold text-lg shadow-lg hover:bg-[#1A2611] hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none">
                  {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
                  {!loading && (isSignUp ? <UserPlus size={20} /> : <ArrowRight size={20} />)}
                </button>

                <div className="text-center pt-4 border-t border-[#5C4D3C]/10 space-y-3">
                  <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
                    className="text-xs font-bold text-[#4A6628] hover:underline tracking-wider">
                    {isSignUp ? "Already have an account? Sign In" : "New here? Create Account"}
                  </button>
                  <div>
                    <Link to="/" className="text-xs text-[#5C4D3C]/60 hover:text-[#233216]">Back to PolyJarvis</Link>
                  </div>
                </div>
              </motion.form>
            )}

            {/* ===== STEP 2: Assignments & Calendar ===== */}
            {step === 2 && (
              <motion.div
                key="assignments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 space-y-6"
              >
                <p className="text-sm text-[#5C4D3C] leading-relaxed">
                  Connect Canvas or your calendar to see deadlines on your dashboard.
                </p>

                {/* Canvas Token */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-[#5C4D3C] uppercase tracking-widest">Canvas Access Token</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                    <input type="password" placeholder="Paste token here..." value={canvasToken} onChange={e => setCanvasToken(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-sm font-mono text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                  </div>
                  <p className="text-[10px] text-[#5C4D3C]/60">Canvas → Account → Settings → New Access Token</p>
                </div>

                {/* Calendar Sync */}
                <div className="bg-white/50 border border-[#5C4D3C]/10 rounded-2xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-[#4A6628]/10 rounded-xl flex-shrink-0">
                    <CalendarSync size={20} className="text-[#4A6628]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-[#233216]">Sync your calendar</p>
                    <p className="text-[11px] text-[#5C4D3C]/70 mb-3">Google Calendar, Apple, or Outlook</p>
                    <button
                      onClick={handleCalendarSync}
                      className={`text-xs font-bold px-4 py-2 rounded-full transition-all border ${
                        calendarLinked
                          ? "bg-[#4A6628] text-white border-[#4A6628]"
                          : "bg-white text-[#4A6628] border-[#4A6628]/20 hover:border-[#4A6628]"
                      }`}
                    >
                      {calendarLinked ? (
                        <span className="flex items-center gap-1"><Check size={14} /> Synced!</span>
                      ) : (
                        "Connect Calendar"
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button onClick={skipToPreferences} className="flex-1 py-3.5 text-[#5C4D3C]/60 font-bold text-sm rounded-2xl hover:bg-[#5C4D3C]/5 transition-colors">
                    Skip for now
                  </button>
                  <button onClick={handleLinkCanvas}
                    className="flex-1 py-3.5 bg-[#233216] text-[#F2E8CF] rounded-2xl font-extrabold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#1A2611]">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
