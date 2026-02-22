import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "/utils/supabase/client";
import { toast } from "sonner";
import { User, Lock, ArrowRight, UserPlus, Mail, CalendarSync, Key, Hash, Info, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { JarvisLogo } from "../components/JarvisLogo";
import { setSession } from "../../lib/auth/session";
import { syncMockGoogleCalendarForUser } from "../../lib/hooks/useUserCalendarState";
import { apiFetch } from "../../lib/apiClient";
import { bootstrapBackendUser } from "../../lib/api/backend";

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
  const [friendCode, setFriendCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const persistAppSessionFromSupabaseUser = async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    if (!authUser?.email) return null;

    const emailLower = authUser.email.toLowerCase();
    const username = emailLower.split("@")[0].replace(/[^a-z0-9._-]/g, "");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    const displayName = String(
      authUser.user_metadata?.name
      || authUser.user_metadata?.full_name
      || name
      || username,
    ).trim();

    const appSession = setSession({
      user_id: authUser.id,
      username,
      name: displayName,
      email: emailLower,
      timezone,
    });

    await bootstrapBackendUser(
      {
        user_id: appSession.user_id,
        email: appSession.email,
        name: appSession.name,
        timezone: appSession.timezone,
      },
      {
        syncCalendar: false,
        syncSupabase: true,
      },
    ).catch(() => null);

    return appSession;
  };

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
            // Attempt sign in immediately
            const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password: pw });
            if (error) {
              throw new Error("Account exists, but password didn't match. Please sign in with your correct password.");
            }
            await persistAppSessionFromSupabaseUser();
            toast.success("Signed in!");
            navigate("/dashboard");
            return;
          }
          throw new Error(data.error || "Sign up failed");
        }

        // Wait for propagation + auto-sign-in with retry
        // Sometimes supabase takes a moment to replicate the new user
        toast.message("Creating account...");
        await new Promise(r => setTimeout(r, 1000));
        
        let lastErr: any = null;
        let success = false;
        
        for (let i = 1; i <= 3; i++) {
          const { error } = await supabase.auth.signInWithPassword({ email: emailLower, password: pw });
          if (!error) { 
            success = true; 
            break; 
          }
          console.log(`[Auth] Auto-signin attempt ${i} failed:`, error);
          lastErr = error;
          if (i < 3) await new Promise(r => setTimeout(r, 1000 * i));
        }

        if (!success) {
           // If auto-login fails, just ask them to login manually
           setIsSignUp(false);
           toast.success("Account created! Please sign in.");
           setLoading(false);
           return;
        }

        await persistAppSessionFromSupabaseUser();
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
        
        await persistAppSessionFromSupabaseUser();
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

  // ---- Step 2: Canvas / Calendar ----
  const handleLinkCanvas = async () => {
    const token = canvasToken.trim();
    if (!token) {
      setStep(3);
      return;
    }

    localStorage.setItem("canvas_token", token);
    try {
      await apiFetch("/api/canvas/connect/token", {
        method: "POST",
        body: { token },
      });
      toast.success("Canvas linked and saved to your profile.");
    } catch (error: any) {
      toast.warning(error?.message || "Canvas token saved locally, but profile sync failed.");
    }
    setStep(3);
  };

  const handleCalendarSync = async () => {
    setLoading(true);
    try {
      const session = await persistAppSessionFromSupabaseUser();
      if (!session?.email) {
        throw new Error("Sign in first to sync calendar.");
      }

      await syncMockGoogleCalendarForUser({
        user_id: session.user_id,
        email: session.email,
        name: session.name,
        username: session.username,
        timezone: session.timezone,
      });

      setCalendarLinked(true);
      toast.success("Google Calendar linked + availability synced.");
    } catch (err: any) {
      toast.error(err?.message || "Calendar sync failed.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 3: Friend Code ----
  const handleFriendCode = () => {
    if (friendCode.trim()) {
      localStorage.setItem("polyjarvis_friend_code", friendCode.trim().toUpperCase());
      toast.success("Code applied!");
    }
    navigate("/preferences");
  };

  const skipToNext = () => {
    if (step === 2) setStep(3);
    else navigate("/preferences");
  };

  // ---- Progress bar ----
  const totalSteps = isSignUp ? 3 : 1;
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
              initial={{ width: "33%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-white/60 font-bold mt-2 text-center uppercase tracking-wider">
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
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
              {step === 1
                ? isSignUp ? "Join the Herd" : "Welcome Back"
                : step === 2
                ? "Link Your Assignments"
                : "Got a Friend Code?"}
            </h1>
            <p className="text-sm text-white/70 mt-2 font-medium">
              {step === 1
                ? "Your Cal Poly lifestyle hub"
                : step === 2
                ? "Balance work and play — we'll track what's due"
                : "Join a crew or skip for now"}
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
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
                    <label className="text-[11px] font-bold text-[#5C4D3C] uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                      <input type="text" placeholder="Mustang Mike" value={name} onChange={e => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#5C4D3C] uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                    <input type="email" required placeholder="you@calpoly.edu" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#5C4D3C] uppercase tracking-wider">Password</label>
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
                  className="w-full bg-[#233216] text-[#F2E8CF] py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#1A2611] hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none">
                  {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
                  {!loading && (isSignUp ? <UserPlus size={20} /> : <ArrowRight size={20} />)}
                </button>

                <div className="text-center pt-4 border-t border-[#5C4D3C]/10 space-y-3">
                  <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
                    className="text-xs font-bold text-[#4A6628] hover:underline uppercase tracking-wider">
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
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="p-8 space-y-6"
              >
                <p className="text-sm text-[#5C4D3C] leading-relaxed">
                  PolyJarvis can show your upcoming assignments so you know when to lock in and when to explore. Connect Canvas or your calendar below.
                </p>

                {/* Canvas Token */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#5C4D3C] uppercase tracking-wider">Canvas Access Token</label>
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
                    <p className="text-sm font-bold text-[#233216]">Sync your calendar</p>
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
                  <button onClick={skipToNext} className="flex-1 py-3.5 text-[#5C4D3C]/60 font-bold text-sm rounded-2xl hover:bg-[#5C4D3C]/5 transition-colors">
                    Skip for now
                  </button>
                  <button onClick={handleLinkCanvas}
                    className="flex-1 py-3.5 bg-[#233216] text-[#F2E8CF] rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#1A2611]">
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ===== STEP 3: Friend Code ===== */}
            {step === 3 && (
              <motion.div
                key="friendcode"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="p-8 space-y-6"
              >
                <p className="text-sm text-[#5C4D3C] leading-relaxed">
                  If a friend shared a crew code with you, enter it below to join their group. No code? No worries — you can always add one later.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#5C4D3C] uppercase tracking-wider">Friend Code</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C4D3C]/50" size={18} />
                    <input type="text" placeholder="e.g. PISMO-7" value={friendCode}
                      onChange={e => setFriendCode(e.target.value.toUpperCase())}
                      className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-[#5C4D3C]/10 rounded-2xl text-base font-mono uppercase tracking-wider text-[#233216] placeholder:text-[#5C4D3C]/40 focus:outline-none focus:bg-white focus:border-[#4A6628] focus:ring-2 focus:ring-[#4A6628]/20 transition-all" />
                  </div>
                </div>

                <div className="bg-[#4A6628]/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-[#233216]/80 font-medium">
                    Don't have a code? That's totally fine — you can create your own crew or join one later from the Jams tab.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button onClick={skipToNext} className="flex-1 py-3.5 text-[#5C4D3C]/60 font-bold text-sm rounded-2xl hover:bg-[#5C4D3C]/5 transition-colors">
                    Do it later
                  </button>
                  <button onClick={handleFriendCode}
                    className="flex-1 py-3.5 bg-[#233216] text-[#F2E8CF] rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-[#1A2611]">
                    {friendCode.trim() ? "Join Crew" : "Continue"} <ArrowRight size={16} />
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
