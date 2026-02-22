import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, Circle, Compass, Home, Search, UserRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../lib/apiClient";

const CATEGORY_LINKS = ["all", "food", "outdoor", "indoor", "concerts", "campus"];

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass, active: true },
  { to: "/jam/DEMO42", label: "Jams", icon: Circle },
  { to: "/ai", label: "Jarvis", icon: Bot },
  { to: "/profile", label: "Profile", icon: UserRound }
];

function coverFor(item) {
  const category = String(item?.category || "").toLowerCase();
  if (category === "food") return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?fm=jpg&fit=crop&w=900&q=80";
  if (category === "outdoor") return "https://images.unsplash.com/photo-1501555088652-021faa106b9b?fm=jpg&fit=crop&w=900&q=80";
  if (category === "indoor") return "https://images.unsplash.com/photo-1497366754035-f200968a6e72?fm=jpg&fit=crop&w=900&q=80";
  if (category === "concerts") return "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?fm=jpg&fit=crop&w=900&q=80";
  if (category === "campus") return "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?fm=jpg&fit=crop&w=900&q=80";
  return "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?fm=jpg&fit=crop&w=900&q=80";
}

export default function ExploreHubPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const search = params.get("search") || "";
  const sort = params.get("sort") || "trending";
  const category = params.get("category") || "all";

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (sort) query.set("sort", sort);
    if (category && category !== "all") query.set("category", category);

    apiFetch(`/api/explore?${query.toString()}`)
      .then((data) => {
        if (!active) return;
        setItems(data.items || []);
        setError("");
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError.message);
        setItems([]);
      });

    return () => {
      active = false;
    };
  }, [search, sort, category]);

  const visibleItems = useMemo(() => items.slice(0, 20), [items]);

  const setParam = (next) => {
    setParams({
      search: next.search ?? search,
      sort: next.sort ?? sort,
      category: next.category ?? category
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#f5f6f4] px-3 py-4 text-[#1c2320]">
      <div className="mx-auto w-full max-w-[430px] rounded-[34px] border border-black/5 bg-[#f3f4f2] p-3 pb-24 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
        <header className="rounded-[24px] bg-[#f8f8f7] p-3">
          <div className="flex items-center gap-2">
            <Link to="/home" className="rounded-full p-2 text-[#6a726c] hover:bg-black/5" aria-label="Back to home">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-lg font-bold text-[#1f2521]">Explore</h1>
          </div>

          <label className="relative mt-3 block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca39f]" />
            <input
              value={search}
              onChange={(event) => setParam({ search: event.target.value })}
              placeholder="Search places"
              className="h-10 w-full rounded-xl border border-black/5 bg-white px-9 text-sm text-[#2e3631] placeholder:text-[#a7aea9] focus:outline-none"
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_LINKS.map((value) => (
              <button
                key={value}
                onClick={() => setParam({ category: value })}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  category === value ? "bg-[#577d3b] text-white" : "bg-[#ebeeea] text-[#8e978f]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {[
              ["trending", "Trending"],
              ["free", "Free"],
              ["distance", "Nearby"]
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setParam({ sort: value })}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  sort === value ? "bg-[#dce7d5] text-[#3f5f2b]" : "bg-[#edf0ec] text-[#8f9891]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="mt-3 grid grid-cols-2 gap-2">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              to={`/item/${item.id}`}
              className="group relative overflow-hidden rounded-2xl border border-black/5 bg-[#dce2da]"
            >
              <img src={coverFor(item)} alt={item.title} className="h-32 w-full object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2.5">
                <p className="line-clamp-1 text-sm font-bold text-white">{item.title}</p>
                <p className="line-clamp-1 text-[10px] text-white/75">{item.category} • {item.distanceMiles} mi</p>
              </div>
              <div className="absolute left-2 top-2 rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-[#3d4f37]">
                {item.free ? "Free" : "$$"}
              </div>
            </Link>
          ))}
        </main>

        {error ? <p className="mt-3 text-xs font-semibold text-red-600">{error}</p> : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-[#f4f4f4] px-3 py-2">
        <ul className="mx-auto grid w-full max-w-[430px] grid-cols-5 gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, active }) => (
            <li key={to}>
              <Link to={to} className="flex flex-col items-center gap-1 rounded-2xl py-1 text-[10px] font-semibold">
                <Icon size={18} className={active ? "text-[#4e7e32]" : "text-[#bcc2bf]"} />
                <span className={active ? "text-[#4e7e32]" : "text-[#bcc2bf]"}>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
