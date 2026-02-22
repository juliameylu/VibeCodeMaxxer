import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

const COUNTRY_CODES = [
  { label: "US (+1)", code: "+1" },
  { label: "Canada (+1)", code: "+1" },
  { label: "UK (+44)", code: "+44" },
  { label: "India (+91)", code: "+91" }
];

function toE164(countryCode, localNumber) {
  const cc = String(countryCode || "").trim();
  const digits = String(localNumber || "").replace(/\D/g, "");
  if (!cc || !digits) return "";
  return `${cc}${digits}`;
}

export default function AuthSignupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const phone = toE164(countryCode, phoneLocal);
      if (!/^\+\d{10,15}$/.test(phone)) {
        throw new Error("Enter a valid phone number.");
      }
      await auth.signUp({ email, password, displayName, phone });
      navigate("/onboarding/preferences", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <section className="glass-card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-ink">Create Account</h1>
        <p className="mt-1 text-sm text-soft">Email + password signup. Canvas can be connected later.</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
            className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
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
          <div className="grid grid-cols-3 gap-2">
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="rounded-2xl border border-black/10 bg-white/70 px-3 py-3 text-sm"
            >
              {COUNTRY_CODES.map((item) => (
                <option key={`${item.label}-${item.code}`} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <input
              value={phoneLocal}
              onChange={(event) => setPhoneLocal(event.target.value)}
              placeholder="6505551234"
              type="tel"
              required
              className="col-span-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
            />
          </div>
          <p className="text-xs text-soft">Saved as {toE164(countryCode, phoneLocal) || `${countryCode}...`}</p>
          <button disabled={loading} className="chip chip-active w-full py-3 text-sm disabled:opacity-60">
            {loading ? "Creating..." : "Create account"}
          </button>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </form>

        <p className="mt-4 text-sm text-soft">
          Have an account? <Link to="/auth/signin" className="font-semibold text-ink">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
