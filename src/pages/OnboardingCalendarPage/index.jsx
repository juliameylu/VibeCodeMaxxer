import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";
import { useAuth } from "../../lib/auth/AuthContext";

export default function OnboardingCalendarPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [icsContent, setIcsContent] = useState("BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Study Group\nEND:VEVENT\nEND:VCALENDAR");
  const [status, setStatus] = useState("");

  const connectGoogle = async () => {
    const start = await apiFetch("/api/calendar/google/connect-start", { method: "POST", body: {} });
    await apiFetch("/api/calendar/google/connect-complete", { method: "POST", body: { state: start.state } });
    auth.updateConnections({ ...(auth.connections || {}), calendar_google_connected: true });
    setStatus("Google Calendar connected.");
  };

  const importIcs = async () => {
    const data = await apiFetch("/api/calendar/ics/import", { method: "POST", body: { icsContent } });
    auth.updateConnections(data.connections);
    setStatus(`Imported ${data.imported_count} ICS entries.`);
  };

  const finish = () => {
    navigate("/home", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <section className="glass-card w-full max-w-lg p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Onboarding</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Calendar Connect</h1>
        <p className="mt-1 text-sm text-soft">Improves planning by using availability and class schedule context.</p>

        <div className="mt-4 space-y-3">
          <button onClick={connectGoogle} className="chip chip-active w-full py-3 text-sm">Connect Google Calendar</button>

          <div className="row-pill">
            <p className="text-sm font-semibold text-ink">Import .ics</p>
            <textarea value={icsContent} onChange={(event) => setIcsContent(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-white/70 p-2 text-xs" />
            <button onClick={importIcs} className="chip chip-idle mt-2 w-full py-2 text-sm">Import .ics now</button>
          </div>

          <button onClick={finish} className="chip chip-idle w-full py-3 text-sm">Manual later / Skip</button>
          <button onClick={finish} className="chip chip-active w-full py-3 text-sm">Go to Home</button>
        </div>

        {status ? <p className="mt-3 text-sm font-semibold text-ink">{status}</p> : null}
      </section>
    </div>
  );
}
