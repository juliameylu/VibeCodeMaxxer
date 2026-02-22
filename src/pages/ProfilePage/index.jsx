import { Link } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { useAuth } from "../../lib/auth/AuthContext";

export default function ProfilePage() {
  const auth = useAuth();

  return (
    <AppShell title="Profile" subtitle="Preferences, account, and settings">
      <section className="glass-card p-4">
        <p className="text-xs uppercase tracking-wide text-ink/60">Account</p>
        <p className="mt-1 font-semibold text-ink">{auth.user?.display_name || "Student"}</p>
        <p className="text-sm text-soft">{auth.user?.email}</p>
      </section>

      <section className="glass-card p-4">
        <p className="text-xs uppercase tracking-wide text-ink/60">Preferences</p>
        <p className="mt-1 text-sm text-soft">Vibe: {auth.preferences?.vibe || "-"}</p>
        <p className="text-sm text-soft">Budget: {auth.preferences?.budget || "-"}</p>
        <p className="text-sm text-soft">Categories: {(auth.preferences?.categories || []).join(", ") || "-"}</p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/settings" className="chip chip-idle py-3 text-center text-sm">Settings</Link>
        <Link to="/onboarding/preferences" className="chip chip-idle py-3 text-center text-sm">Edit Preferences</Link>
      </div>

      <button onClick={auth.signOut} className="chip chip-active w-full py-3 text-sm">Sign out</button>
    </AppShell>
  );
}
