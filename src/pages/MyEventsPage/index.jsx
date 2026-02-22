import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function MyEventsPage() {
  const [confirmed, setConfirmed] = useState([]);
  const [maybe, setMaybe] = useState([]);

  useEffect(() => {
    apiFetch("/api/my-events").then((data) => {
      setConfirmed(data.confirmed || []);
      setMaybe(data.maybe || []);
    });
  }, []);

  return (
    <AppShell title="My Events" subtitle="Confirmed and maybe">
      <section className="glass-card p-4">
        <h2 className="font-bold text-ink">Confirmed</h2>
        <div className="mt-2 space-y-2">
          {confirmed.map((entry) => (
            <article key={entry.id} className="row-pill">
              <p className="font-semibold text-ink">{entry.item?.title}</p>
              <Link to={`/item/${entry.event_id}`} className="text-xs font-semibold text-ink">View details</Link>
            </article>
          ))}
          {confirmed.length === 0 ? <p className="text-sm text-soft">No confirmed events yet.</p> : null}
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="font-bold text-ink">Maybe</h2>
        <div className="mt-2 space-y-2">
          {maybe.map((entry) => (
            <article key={entry.id} className="row-pill">
              <p className="font-semibold text-ink">{entry.item?.title}</p>
              <p className="text-xs text-soft">Expires: {entry.expires_at ? new Date(entry.expires_at).toLocaleString() : "n/a"}</p>
            </article>
          ))}
          {maybe.length === 0 ? <p className="text-sm text-soft">No maybe events.</p> : null}
        </div>
      </section>
    </AppShell>
  );
}
