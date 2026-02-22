import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function PlanResultsPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);

  const load = async () => {
    const data = await apiFetch(`/api/plans/${requestId}/results`);
    setPlan(data.plan);
  };

  useEffect(() => {
    load();
  }, [requestId]);

  const reschedule = async () => {
    const data = await apiFetch(`/api/plans/${requestId}/reschedule`, { method: "POST", body: {} });
    setPlan(data.plan);
  };

  const finalize = async (optionId) => {
    await apiFetch(`/api/plans/${requestId}/rsvp`, {
      method: "POST",
      body: { rsvp: "yes", finalize_option_id: optionId }
    });
    navigate(`/plans/${requestId}`);
  };

  if (!plan) return <AppShell title="Plan Results" subtitle="Loading options..." />;

  return (
    <AppShell title="Plan Results" subtitle="Review options and reschedule if needed">
      <button onClick={reschedule} className="chip chip-idle w-full py-3 text-sm">Reschedule</button>
      {(plan.options || []).map((option) => (
        <article key={option.id} className="row-pill">
          <h2 className="font-bold text-ink">{option.title}</h2>
          <p className="text-xs text-soft">{new Date(option.start_iso).toLocaleString()} • {option.duration_min} min</p>
          <p className="mt-1 text-xs text-soft">Score {option.score} • Est. ${option.estimated_cost}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => finalize(option.id)} className="chip chip-active text-xs">Finalize</button>
            <Link to={`/plans/${requestId}`} className="chip chip-idle text-xs">Open plan card</Link>
          </div>
        </article>
      ))}
    </AppShell>
  );
}
