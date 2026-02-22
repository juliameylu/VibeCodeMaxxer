import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children, allowOnboardingRoutes = false }) {
  const location = useLocation();
  const auth = useAuth();

  if (auth.loading) {
    return <div className="p-8 text-center text-sm text-soft">Loading session...</div>;
  }

  if (!auth.isAuthenticated) {
    auth.setPendingRedirect(`${location.pathname}${location.search}`);
    return <Navigate to="/welcome" replace />;
  }

  if (!allowOnboardingRoutes && !auth.isOnboardingComplete) {
    return <Navigate to="/onboarding/preferences" replace />;
  }

  return children;
}
