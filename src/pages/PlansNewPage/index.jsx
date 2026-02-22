import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function PlansNewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Tonight plan");
  const [durationMin, setDurationMin] = useState(120);
  const [maxBudget, setMaxBudget] = useState("medium");
  const [status, setStatus] = useState("");

  const createPlan = async (event) => {
    event.preventDefault();
    const data = await apiFetch("/api/plans", {
      method: "POST",
      body: {
        title,
        constraints: { durationMin: Number(durationMin), maxBudget, weather: "clear", timeOfDay: "evening" }
      }
    });

    setStatus("Plan request created.");
    navigate(`/plans/results/${data.request_id}`);
  };

  return (
    <AppShell title="Create Plan" subtitle="Start a plan request with constraints">
      <form onSubmit={createPlan} className="glass-card p-4 space-y-3">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm" />
        <label className="block text-sm text-ink">
          Duration (min)
          <input type="number" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm" />
        </label>
        <label className="block text-sm text-ink">
          Budget
          <select value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)} className="mt-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <button className="chip chip-active w-full py-3 text-sm">Generate Results</button>
      </form>
      {status ? <p className="text-sm font-semibold text-ink">{status}</p> : null}
    </AppShell>
  );
}
