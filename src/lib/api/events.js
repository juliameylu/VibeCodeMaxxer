import fixtures from "../../mocks/fixtures/events.json";
import { httpGetJson } from "./http";
import { withApiBase } from "./baseUrl";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

function isTonight(date) {
  const hour = date.getHours();
  return hour >= 17 || hour < 3;
}

function inThisWeek(date, now) {
  const end = new Date(now);
  end.setDate(now.getDate() + 7);
  return date >= now && date <= end;
}

export async function fetchCampusEvents(params = {}) {
  if (DEMO_MODE) {
    const { timeRange = "today", category = "all", query = "" } = params;
    const now = new Date();

    let results = fixtures.filter((event) => {
      const start = new Date(event.startTime);
      const eventText = `${event.title} ${event.location} ${event.description}`.toLowerCase();

      const categoryOk = category === "all" || event.category.toLowerCase() === category;
      const queryOk = !query || eventText.includes(String(query).toLowerCase());

      let timeOk = true;
      if (timeRange === "today") {
        timeOk = start.toDateString() === now.toDateString();
      } else if (timeRange === "tonight") {
        timeOk = start.toDateString() === now.toDateString() && isTonight(start);
      } else if (timeRange === "week") {
        timeOk = inThisWeek(start, now);
      }

      return categoryOk && queryOk && timeOk;
    });

    results = [...results].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    return {
      items: results,
      total: results.length,
    };
  }

  // TODO: wire this endpoint to a server-side Cal Poly NOW parser/proxy endpoint.
  // Keep scraping and any credentials server-side only.
  const search = new URLSearchParams({
    timeRange: params.timeRange || "today",
    category: params.category || "all",
    query: params.query || "",
  });

  return httpGetJson(withApiBase(`/api/events?${search.toString()}`));
}
