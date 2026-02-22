import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

export default function AuthSigninPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const nextUser = await auth.signIn({ email, password });
      const redirectPath = auth.consumePendingRedirect();
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(nextUser?.onboarding_complete ? "/home" : "/onboarding/preferences", { replace: true });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="glass-card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-ink">Sign In</h1>
        <p className="mt-1 text-sm text-soft">Use your Cal Poly email and password.</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@calpoly.edu"
            type="email"
            required
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            required
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
          />
          <button disabled={loading} className="chip chip-active w-full py-3 text-sm disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </form>

        <p className="mt-4 text-sm text-soft">
          Need an account? <Link to="/auth/signup" className="font-semibold text-ink">Get started</Link>
        </p>
      </section>
    </div>
  );
}
