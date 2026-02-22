import { MapPin, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import MobileShell from "../../components/MobileShell";

const SPOTS = [
  { id: 1, name: "The Brew", hint: "Quiet seating until 6 PM", distance: "0.3 mi" },
  { id: 2, name: "SLO Library", hint: "Great for focused reading", distance: "0.4 mi" },
  { id: 3, name: "Mission Plaza", hint: "Quick reset walk", distance: "0.8 mi" },
];

export default function DiscoverPage() {
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [agentReply, setAgentReply] = useState("");
  const [error, setError] = useState("");

  const handleAskAgent = async (event) => {
    event.preventDefault();
    if (!prompt.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt.trim(),
          tasks: [
            { title: "Finalize bio slides", done: false },
            { title: "Submit physics set", done: false }
          ],
          preferences: {
            city: "San Luis Obispo",
            budget: "medium"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to contact planner agent.");
      }

      setAgentReply(data.reply || "No response.");
      setPrompt("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  return (
    <MobileShell>
      <section className="glass-card p-5">
        <p className="text-sm font-semibold text-ink/60">Explore</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-ink">
          <MapPin size={24} className="text-amberSoft" />
          Friendly Nearby Picks
        </h1>
        <p className="mt-1 text-sm text-soft">Simple places matched to your pace today.</p>
      </section>

      <section className="glass-card mt-5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Planner Agent</p>
        <h2 className="mt-1 text-lg font-bold text-ink">Ask for dinner, hikes, or study-break ideas</h2>

        <form onSubmit={handleAskAgent} className="mt-3 space-y-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I have 3 hours of studying left. Where should I eat in SLO tonight?"
            className="min-h-[84px] w-full rounded-2xl border border-black/10 bg-white/70 p-3 text-sm text-ink outline-none"
          />
          <button type="submit" disabled={sending} className="chip chip-active w-full py-3 text-sm disabled:opacity-60">
            {sending ? "Thinking..." : "Ask Planner"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        {agentReply ? <p className="row-pill mt-3 text-sm text-ink">{agentReply}</p> : null}
      </section>

      <section className="mt-5 space-y-3">
        {SPOTS.map((spot) => (
          <article key={spot.id} className="row-pill">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-ink">{spot.name}</h2>
                <p className="text-sm text-soft">{spot.hint}</p>
              </div>
              <span className="chip chip-idle text-xs">{spot.distance}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amberSoft">
              <MapPin size={14} />
              <span>Open now</span>
              <Sparkles size={14} />
              <span>Good fit for current plan</span>
              <Star size={14} />
            </div>
          </article>
        ))}
      </section>
    </MobileShell>
  );
}
