import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function PlanCardPage() {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("");

  const load = async () => {
    const data = await apiFetch(`/api/plans/${planId}/results`);
    setPlan(data.plan);
  };

  useEffect(() => {
    load();
  }, [planId]);

  const rsvp = async (value) => {
    await apiFetch(`/api/plans/${planId}/rsvp`, { method: "POST", body: { rsvp: value } });
    setStatus(`RSVP saved: ${value}`);
  };

  const invite = async () => {
    const data = await apiFetch("/api/invites/generate", {
      method: "POST",
      body: { entity_type: "plan", entity_id: planId }
    });
    setStatus(`Invite link: ${data.link}`);
  };

  if (!plan) return <AppShell title="Plan Card" subtitle="Loading..." />;

  return (
    <AppShell title={plan.title} subtitle="Plan card, RSVP, and invites">
      <section className="row-pill">
        <p className="text-sm text-soft">Status: {plan.status}</p>
        {plan.finalized_option_json ? (
          <p className="mt-1 text-sm font-semibold text-ink">Final: {plan.finalized_option_json.title}</p>
        ) : (
          <p className="mt-1 text-sm text-soft">Not finalized yet.</p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => rsvp("yes")} className="chip chip-active text-xs">RSVP Yes</button>
        <button onClick={() => rsvp("no")} className="chip chip-idle text-xs">RSVP No</button>
        <button onClick={() => rsvp("maybe")} className="chip chip-idle text-xs">RSVP Maybe</button>
      </div>

      <button onClick={invite} className="chip chip-idle w-full py-3 text-sm">Invite people</button>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
