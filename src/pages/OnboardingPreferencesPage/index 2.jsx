import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import PageShell from "../../components/ui/PageShell";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import { connectCalendar, updatePreferences } from "../../lib/api/workflow";
import { setOnboardingCompleteLocal } from "../../lib/auth/session";

const CATEGORY_OPTIONS = ["events", "active", "chill", "restaurants", "sporting", "local-events", "concerts"];
const TRANSPORT_OPTIONS = ["uber", "lyft", "zipcar", "bus", "none"];

export default function OnboardingPreferencesPage() {
  const navigate = useNavigate();
  const [activityMode, setActivityMode] = useState("both");
  const [transport, setTransport] = useState(["none"]);
  const [favoriteCategories, setFavoriteCategories] = useState(["events", "restaurants"]);
  const [excludedCategories, setExcludedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleInArray(setter, list, value) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function savePreferences(linkCalendar) {
    setLoading(true);
    setError("");
    try {
      await updatePreferences({
        activity_mode: activityMode,
        transport_preferences: transport,
        favorite_categories: favoriteCategories,
        excluded_categories: excludedCategories,
        onboarding_completed: true
      });
      if (linkCalendar) {
        await connectCalendar("google");
      }
      setOnboardingCompleteLocal();
      navigate("/home", { replace: true });
    } catch (e) {
      setError(e.message || "Could not save preferences");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileShell showFab={false}>
      <SectionHeader title="First-Time Preferences" subtitle="Select what you want to do more of" />
      <PageShell>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Environment</p>
          <div className="mt-2 flex gap-2">
            {["indoor", "outdoor", "both"].map((value) => (
              <button key={value} className={`chip text-xs ${activityMode === value ? "chip-active" : "chip-idle"}`} onClick={() => setActivityMode(value)}>
                {value}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Transport</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRANSPORT_OPTIONS.map((value) => (
              <button key={value} className={`chip text-xs ${transport.includes(value) ? "chip-active" : "chip-idle"}`} onClick={() => toggleInArray(setTransport, transport, value)}>
                {value}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Categories You Want</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((value) => (
              <button key={value} className={`chip text-xs ${favoriteCategories.includes(value) ? "chip-active" : "chip-idle"}`} onClick={() => toggleInArray(setFavoriteCategories, favoriteCategories, value)}>
                {value}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/60">Don't Suggest</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((value) => (
              <button key={value} className={`chip text-xs ${excludedCategories.includes(value) ? "chip-active" : "chip-idle"}`} onClick={() => toggleInArray(setExcludedCategories, excludedCategories, value)}>
                {value}
              </button>
            ))}
          </div>
        </Card>

        {error ? <Card>{error}</Card> : null}

        <Card>
          <p className="text-sm text-soft">Link account to calendar (recommended)</p>
          <div className="mt-3 flex gap-2">
            <button className="chip chip-active text-xs" onClick={() => savePreferences(true)} disabled={loading}>
              {loading ? "Saving..." : "Save + Link Calendar"}
            </button>
            <button className="chip chip-idle text-xs" onClick={() => savePreferences(false)} disabled={loading}>
              Save Only
            </button>
          </div>
        </Card>
      </PageShell>
    </MobileShell>
  );
}
