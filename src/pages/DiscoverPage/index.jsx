import { MapPin, Sparkles, Star } from "lucide-react";
import MobileShell from "../../components/MobileShell";

const SPOTS = [
  { id: 1, name: "The Brew", hint: "Quiet seating until 6 PM", distance: "0.3 mi" },
  { id: 2, name: "SLO Library", hint: "Great for focused reading", distance: "0.4 mi" },
  { id: 3, name: "Mission Plaza", hint: "Quick reset walk", distance: "0.8 mi" },
];

export default function DiscoverPage() {
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
