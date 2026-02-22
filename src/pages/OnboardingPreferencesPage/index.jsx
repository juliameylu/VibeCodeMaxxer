import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

const CATEGORIES = ["food", "outdoor", "indoor", "concerts", "campus"];

export default function OnboardingPreferencesPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const initialCategories = useMemo(() => auth.preferences?.categories || ["food", "outdoor"], [auth.preferences]);
  const [categories, setCategories] = useState(initialCategories);
  const [vibe, setVibe] = useState(auth.preferences?.vibe || "chill");
  const [budget, setBudget] = useState(auth.preferences?.budget || "medium");
  const [transport, setTransport] = useState(auth.preferences?.transport || "walk");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleCategory = (category) => {
    setCategories((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await auth.savePreferences({ categories, vibe, budget, transport });
      navigate("/onboarding/calendar", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="glass-card w-full max-w-lg p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Onboarding</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">First-time preferences</h1>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Categories</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`chip ${categories.includes(category) ? "chip-active" : "chip-idle"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Vibe</span>
            <select value={vibe} onChange={(event) => setVibe(event.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm">
              <option value="active">active</option>
              <option value="chill">chill</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Budget</span>
            <select value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="free">free-first</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Transport</span>
            <select value={transport} onChange={(event) => setTransport(event.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm">
              <option value="walk">walk</option>
              <option value="bike">bike</option>
              <option value="car">car</option>
            </select>
          </label>

          <button disabled={saving} className="chip chip-active w-full py-3 text-sm disabled:opacity-60">
            {saving ? "Saving..." : "Continue to Calendar"}
          </button>

          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </form>
      </section>
    </div>
  );
}
