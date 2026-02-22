import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

export default function WelcomePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(auth.isOnboardingComplete ? "/home" : "/onboarding/preferences", { replace: true });
    }
  }, [auth.isAuthenticated, auth.isOnboardingComplete, navigate]);

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      const user = await auth.continueAsGuest();
      navigate(user?.onboarding_complete ? "/home" : "/onboarding/preferences", { replace: true });
    } catch (error) {
      setGuestError(error instanceof Error ? error.message : "Unable to continue as guest");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="glass-card w-full max-w-md p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Welcome</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">What will you do today?</h1>
        <p className="mt-3 text-sm text-soft">
          Plan your study, events, food, and group hangouts in SLO with AI-assisted recommendations.
        </p>

        <div className="mt-6 space-y-2">
          <Link to="/auth/signup" className="chip chip-active block w-full py-3 text-center text-sm">
            Get Started
          </Link>
          <Link to="/auth/signin" className="chip chip-idle block w-full py-3 text-center text-sm">
            Sign In
          </Link>
          <button onClick={continueAsGuest} disabled={guestLoading} className="chip chip-idle block w-full py-3 text-center text-sm disabled:opacity-60">
            {guestLoading ? "Continuing..." : "Continue as Guest"}
          </button>
        </div>
        {guestError ? <p className="mt-3 text-sm font-semibold text-red-600">{guestError}</p> : null}
      </section>
    </div>
  );
}
