import Card from "../../../components/ui/Card";

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function PlaceCard({ place }) {
  return (
    <Card className="p-0 overflow-hidden">
      <img
        src={place.imageUrl}
        alt={place.name}
        className="h-36 w-full object-cover"
        loading="lazy"
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-ink leading-tight">{place.name}</h3>
          <span className="chip chip-idle px-2 py-1 text-[10px] uppercase">{place.category}</span>
        </div>

        <p className="mt-1 text-xs text-soft">{place.address}</p>

        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="font-semibold text-ink">⭐ {place.rating.toFixed(1)}</span>
          <span className="text-soft">{place.price}</span>
          <span className="text-soft">{formatDistance(place.distanceMeters)}</span>
          <span className={`chip px-2 py-1 text-[10px] ${place.isOpenNow ? "chip-active" : "chip-idle"}`}>
            {place.isOpenNow ? "Open now" : "Closed"}
          </span>
        </div>

        <a
          href={place.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs font-semibold text-amberSoft"
        >
          View on Yelp
        </a>
      </div>
    </Card>
  );
}
