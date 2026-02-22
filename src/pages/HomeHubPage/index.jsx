import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function HomeHubPage() {
  const [data, setData] = useState({ recommendations: [], study_load: null, badges: { calendar: false, canvas: false }, due_today: false });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/api/home/recommendations")
      .then((response) => {
        if (active) setData(response);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Home" subtitle="Recommendations based on preferences, weather, and study load">
      <section className="glass-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Quick actions</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Link to="/plans/new" className="chip chip-active text-center text-xs">Create Plan</Link>
          <Link to="/jam/DEMO42" className="chip chip-idle text-center text-xs">Start Jam</Link>
          <Link to="/ai" className="chip chip-idle text-center text-xs">Open AI Chat</Link>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Connection badges</p>
          <div className="flex gap-2 text-xs">
            <span className={`chip ${data.badges?.calendar ? "chip-active" : "chip-idle"}`}>Calendar</span>
            <span className={`chip ${data.badges?.canvas ? "chip-active" : "chip-idle"}`}>Canvas</span>
          </div>
        </div>
        {data.due_today ? (
          <Link to="/study" className="row-pill mt-3 block border-amberSoft/30 bg-amberSoft/10">
            <p className="text-sm font-semibold text-ink">Assignments Due</p>
            <p className="text-xs text-soft">Lock-in suggestion enabled from Study tab.</p>
          </Link>
        ) : null}
      </section>

      <section className="space-y-2">
        {data.recommendations.map((item) => (
          <article key={item.id} className="row-pill">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-ink">{item.title}</h2>
                <p className="text-xs text-soft">{item.description}</p>
              </div>
              <Link className="chip chip-idle text-xs" to={`/item/${item.id}`}>Open</Link>
            </div>
            <p className="mt-2 text-xs text-soft">Score {item.score?.toFixed?.(1) || item.score} • {item.reason_tags?.join(" • ")}</p>
          </article>
        ))}
      </section>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
    </AppShell>
  );
}
