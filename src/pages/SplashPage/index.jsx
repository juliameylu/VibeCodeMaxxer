import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

export default function SplashPage() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-card w-full max-w-sm p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">SLO Planner</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Loading your session</h1>
          <p className="mt-2 text-sm text-soft">Checking auth, onboarding, and invite links...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  if (!auth.isOnboardingComplete) {
    return <Navigate to="/onboarding/preferences" replace />;
  }

  return <Navigate to="/home" replace />;
}
