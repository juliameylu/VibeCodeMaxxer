import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../lib/pageshell/AppShell";
import { apiFetch } from "../../lib/apiClient";

export default function ExploreCategoryPage() {
  const { category } = useParams();
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    apiFetch(`/api/explore?category=${encodeURIComponent(category || "all")}`)
      .then((data) => active && setItems(data.items || []))
      .catch(() => active && setItems([]));

    return () => {
      active = false;
    };
  }, [category]);

  return (
    <AppShell title={`Explore ${category || "all"}`} subtitle="Trending, free, tonight, and weekend picks">
      {items.map((item) => (
        <article key={item.id} className="row-pill">
          <h2 className="font-bold text-ink">{item.title}</h2>
          <p className="text-sm text-soft">{item.description}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-soft">
            <span>{item.when}</span>
            <span>{item.rating}★</span>
            <Link to={`/item/${item.id}`} className="font-semibold text-ink">Event info</Link>
          </div>
        </article>
      ))}
    </AppShell>
  );
}
