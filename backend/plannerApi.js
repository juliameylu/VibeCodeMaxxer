import OpenAI from "openai";
import { randomUUID } from "crypto";

let openai = null;
const AI_CACHE_TTL_MS = 1000 * 60 * 2;
const AI_TIMEOUT_MS = 3200;
const aiResponseCache = new Map();

const NOW = () => new Date();

const store = {
  users: new Map(),
  sessions: new Map(),
  preferences: new Map(),
  connections: new Map(),
  userEventStates: [],
  groups: [],
  groupMembers: [],
  invites: [],
  plans: [],
  planParticipants: [],
  jams: [],
  jamMembers: [],
  notifications: [],
  studyTasks: [],
  aiActionLogs: [],
  pendingActions: new Map(),
  eventsCatalog: [
    {
      id: "event-brew-quiet",
      title: "The Brew Coffeehouse",
      category: "food",
      vibe: "chill",
      budget: "low",
      transport: "walk",
      when: "tonight",
      free: false,
      rating: 4.7,
      distanceMiles: 0.3,
      reasonTags: ["quiet", "study-break"],
      description: "Quiet indoor seating and late-afternoon coffee specials.",
      link: "/item/event-brew-quiet"
    },
    {
      id: "event-bishop-peak",
      title: "Bishop Peak Sunset Hike",
      category: "outdoor",
      vibe: "active",
      budget: "free",
      transport: "car",
      when: "weekend",
      free: true,
      rating: 4.8,
      distanceMiles: 2.1,
      reasonTags: ["outdoor", "reset"],
      description: "Moderate hike with sunset views over SLO.",
      link: "/item/event-bishop-peak"
    },
    {
      id: "event-mission-plaza",
      title: "Mission Plaza Walk",
      category: "indoor",
      vibe: "chill",
      budget: "free",
      transport: "walk",
      when: "today",
      free: true,
      rating: 4.5,
      distanceMiles: 0.8,
      reasonTags: ["quick", "decompress"],
      description: "Easy 25-minute walk to reset between study blocks.",
      link: "/item/event-mission-plaza"
    },
    {
      id: "event-fremont-show",
      title: "Fremont Theater Show",
      category: "concerts",
      vibe: "active",
      budget: "medium",
      transport: "car",
      when: "tonight",
      free: false,
      rating: 4.6,
      distanceMiles: 1.6,
      reasonTags: ["music", "social"],
      description: "Live show at Fremont Theater in downtown SLO.",
      link: "/item/event-fremont-show"
    },
    {
      id: "event-campus-talk",
      title: "Cal Poly Innovation Talk",
      category: "campus",
      vibe: "chill",
      budget: "free",
      transport: "walk",
      when: "today",
      free: true,
      rating: 4.2,
      distanceMiles: 0.2,
      reasonTags: ["campus", "networking"],
      description: "Campus guest speaker event in the evening.",
      link: "/item/event-campus-talk"
    }
  ]
};

function createNotification({ userId, type, title, message, entityType = null, entityId = null }) {
  const notification = {
    id: randomUUID(),
    user_id: userId,
    type,
    title,
    message,
    entity_type: entityType,
    entity_id: entityId,
    read: false,
    created_at: NOW().toISOString()
  };
  store.notifications.push(notification);
  return notification;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function requireSession(req, res) {
  const token = req.header("x-session-token") || req.body?.sessionToken || req.query?.sessionToken;
  if (!token) {
    res.status(401).json({ error: "Missing session token" });
    return null;
  }

  const userId = store.sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid session token" });
    return null;
  }

  const user = store.users.get(userId);
  if (!user) {
    res.status(401).json({ error: "Session user not found" });
    return null;
  }

  return { token, userId, user };
}

function getOrInitConnections(userId) {
  const existing = store.connections.get(userId);
  if (existing) return existing;
  const next = {
    user_id: userId,
    calendar_google_connected: false,
    calendar_ics_connected: false,
    canvas_connected: false,
    canvas_mode: null,
    updated_at: NOW().toISOString()
  };
  store.connections.set(userId, next);
  return next;
}

function getOrInitPreferences(userId) {
  const existing = store.preferences.get(userId);
  if (existing) return existing;
  const next = {
    user_id: userId,
    categories: ["food", "outdoor", "campus"],
    vibe: "chill",
    budget: "medium",
    transport: "walk",
    updated_at: NOW().toISOString()
  };
  store.preferences.set(userId, next);
  return next;
}

function userBadges(userId) {
  const connections = getOrInitConnections(userId);
  return {
    calendar: Boolean(connections.calendar_google_connected || connections.calendar_ics_connected),
    canvas: Boolean(connections.canvas_connected)
  };
}

function computeStudyLoad(userId) {
  const now = NOW().getTime();
  const tasks = store.studyTasks.filter((task) => task.user_id === userId && !task.done);
  const unfinishedCount = tasks.length;
  const dueSoonCount = tasks.filter((task) => {
    const due = Date.parse(task.due_at);
    if (Number.isNaN(due)) return false;
    return due - now <= 1000 * 60 * 60 * 24;
  }).length;
  const urgencyWindow = tasks.some((task) => {
    const due = Date.parse(task.due_at);
    if (Number.isNaN(due)) return false;
    return due - now <= 1000 * 60 * 60 * 6;
  })
    ? 1
    : 0;

  return {
    due_soon_count: dueSoonCount,
    unfinished_count: unfinishedCount,
    urgency_window: urgencyWindow,
    study_load_score: dueSoonCount * 3 + unfinishedCount * 2 + urgencyWindow * 4
  };
}

function scoreEvent({ event, prefs, studyLoad, weather = "clear", timeOfDay = "evening" }) {
  let score = 0;
  if (prefs.categories?.includes(event.category)) score += 4;
  if (prefs.vibe === event.vibe) score += 3;
  if (prefs.budget === event.budget || (prefs.budget === "low" && event.free)) score += 2;
  if (prefs.transport && prefs.transport === event.transport) score += 2;
  if (weather === "rain" && event.category === "outdoor") score -= 4;
  if (timeOfDay === "night" && event.when === "tonight") score += 2;

  if (studyLoad.study_load_score >= 8 && event.category === "outdoor") score -= 2;
  if (studyLoad.study_load_score >= 8 && event.reasonTags.includes("quick")) score += 3;
  if (studyLoad.study_load_score < 5 && event.category === "concerts") score += 2;

  return score + Math.max(0, 5 - event.distanceMiles);
}

function rankedRecommendations(
  userId,
  { weather = "clear", timeOfDay = "evening", requestedCategories = [], strictCategoryMatch = false } = {}
) {
  const prefs = getOrInitPreferences(userId);
  const studyLoad = computeStudyLoad(userId);
  const categorySet = new Set(requestedCategories);

  return store.eventsCatalog
    .map((event) => ({
      ...event,
      score:
        scoreEvent({ event, prefs, studyLoad, weather, timeOfDay }) +
        (categorySet.size > 0
          ? categorySet.has(event.category)
            ? 12
            : strictCategoryMatch
              ? -30
              : -8
          : 0),
      study_load_score: studyLoad.study_load_score,
      reason_tags: [...event.reasonTags, `study-score-${studyLoad.study_load_score}`]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function parseMessageIntent(message) {
  const text = String(message || "").toLowerCase();
  const matches = [];

  const rules = [
    { category: "outdoor", keywords: ["hike", "hiking", "trail", "mountain", "peak", "beach", "surf", "sunset"] },
    { category: "food", keywords: ["food", "eat", "dinner", "lunch", "breakfast", "coffee", "cafe", "restaurant", "taco"] },
    { category: "concerts", keywords: ["concert", "music", "live show", "show", "band"] },
    { category: "campus", keywords: ["campus", "cal poly", "club", "student event"] },
    { category: "indoor", keywords: ["indoor", "museum", "walk", "study spot", "library", "quiet"] }
  ];

  rules.forEach((rule) => {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      matches.push(rule.category);
    }
  });

  const unique = [...new Set(matches)];
  const strict = unique.length > 0;
  return { requestedCategories: unique, strictCategoryMatch: strict };
}

function sanitizeCardsForIntent(candidateCards, fallbackCards, intent) {
  if (!intent.strictCategoryMatch || intent.requestedCategories.length === 0) {
    return Array.isArray(candidateCards) && candidateCards.length > 0 ? candidateCards : fallbackCards;
  }

  const allowed = new Set(intent.requestedCategories);
  const input = Array.isArray(candidateCards) ? candidateCards : [];
  const filtered = input.filter((card) => allowed.has(card.category));

  if (filtered.length > 0) return filtered;

  const fallbackFiltered = fallbackCards.filter((card) => allowed.has(card.category));
  return fallbackFiltered.length > 0 ? fallbackFiltered : fallbackCards;
}

function parseIcsSummary(content) {
  const lines = String(content || "").split(/\r?\n/);
  const events = [];
  let current = null;

  lines.forEach((line) => {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { title: "Untitled Event", start: null };
      return;
    }
    if (!current) return;
    if (line.startsWith("SUMMARY:")) current.title = line.replace("SUMMARY:", "").trim();
    if (line.startsWith("DTSTART")) {
      const value = line.split(":")[1];
      current.start = value || null;
    }
    if (line.startsWith("END:VEVENT")) {
      events.push(current);
      current = null;
    }
  });

  return events;
}

function generatePlanOptions({ constraints, recommendations }) {
  const now = NOW();
  const baseHour = Math.max(now.getHours() + 1, 16);
  const options = recommendations.slice(0, 3).map((item, index) => {
    const startHour = baseHour + index;
    return {
      id: randomUUID(),
      title: `${item.title} + focused block`,
      start_iso: new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0).toISOString(),
      duration_min: constraints.durationMin || 120,
      location: item.title,
      estimated_cost: item.free ? 0 : constraints.maxBudget === "low" ? 15 : 30,
      score: Math.round(item.score * 10) / 10
    };
  });

  return options;
}

async function generateAssistantReply(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return "Here are options ranked from your study load, vibe, and budget. I can draft a plan or create invite links if you confirm.";
  }

  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are OpenJarvis for SLO Planner. Be concise. Recommend activities and plans based on workload. Never claim writes are done before explicit confirmation."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    });

    return response.output_text || "I have a few recommendations ready.";
  } catch {
    return "I can still recommend options right now, but the AI model is temporarily unavailable.";
  }
}

function safeString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function normalizeChatContext(context, userId) {
  const prefs = getOrInitPreferences(userId);
  const study = computeStudyLoad(userId);
  const raw = context && typeof context === "object" ? context : {};
  const weather = typeof raw.weather === "string" ? raw.weather : raw.weather?.summary || "clear";

  return {
    screen: safeString(raw.activeScreen || raw.screen || "unknown"),
    weather: safeString(weather, "clear"),
    time_of_day: safeString(raw.timeOfDay || "evening"),
    study_load_score: study.study_load_score,
    due_soon_count: study.due_soon_count,
    unfinished_count: study.unfinished_count,
    preferences: {
      categories: Array.isArray(prefs.categories) ? prefs.categories : [],
      vibe: safeString(prefs.vibe || "chill"),
      budget: safeString(prefs.budget || "medium"),
      transport: safeString(prefs.transport || "walk")
    },
    upcoming_plan_count: store.plans.filter((plan) => plan.host_user_id === userId).length
  };
}

function parseJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function buildAiCacheKey({ message, context, cards, proposedActions }) {
  return JSON.stringify({
    message: String(message || "").trim().toLowerCase(),
    context,
    cards: Array.isArray(cards) ? cards.map((card) => ({ id: card.id, category: card.category, title: card.title })) : [],
    proposed_actions: Array.isArray(proposedActions) ? proposedActions.map((action) => action.type) : []
  });
}

function getCachedAiReply(key) {
  const row = aiResponseCache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > AI_CACHE_TTL_MS) {
    aiResponseCache.delete(key);
    return null;
  }
  return row.value;
}

function setCachedAiReply(key, value) {
  aiResponseCache.set(key, { at: Date.now(), value });
  if (aiResponseCache.size > 200) {
    const oldest = aiResponseCache.keys().next().value;
    if (oldest) aiResponseCache.delete(oldest);
  }
}

async function generateStructuredAssistantReply({ message, context, cards, proposedActions }) {
  const cacheKey = buildAiCacheKey({ message, context, cards, proposedActions });
  const cached = getCachedAiReply(cacheKey);
  if (cached) return cached;

  if (!process.env.OPENAI_API_KEY) {
    const fallback = {
      assistant_text:
        "Here are options ranked from your study load, vibe, and budget. I can draft a plan or create invite links if you confirm."
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  }

  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    const requestPromise = openai.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_output_tokens: 220,
      input: [
        {
          role: "system",
          content:
            "You are Jarvis, the SLO student planner assistant.\n" +
            "Goals:\n" +
            "- Help Cal Poly students plan around study load, budget, vibe, transport, and time.\n" +
            "- Prefer options from app data first; if missing, say so.\n" +
            "Rules:\n" +
            "- Never claim any write action is completed.\n" +
            "- For writes (RSVP, join jam, create plan, save event), only suggest confirmation.\n" +
            "- Keep answers concise and practical.\n" +
            "- If study load is high, prioritize low-friction options.\n" +
            "- Never relabel categories. A hike/outdoor request must return outdoor cards only.\n" +
            "- If no matching cards exist for requested intent, explicitly say no exact match.\n" +
            "Return strict JSON only with shape:\n" +
            "{ \"assistant_text\": string, \"cards\": [{\"id\": string, \"title\": string, \"subtitle\": string, \"deep_link\": string, \"reason_tags\": string[], \"category\": string}], \"proposed_actions\": [{\"action_id\": string, \"type\": string, \"payload\": object, \"requires_confirmation\": true}] }"
        },
        {
          role: "user",
          content: JSON.stringify({
            message,
            context,
            cards,
            proposed_actions: proposedActions
          })
        }
      ]
    });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("openai_timeout")), AI_TIMEOUT_MS);
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);

    const parsed = parseJsonObject(response.output_text || "");
    if (parsed && typeof parsed.assistant_text === "string") {
      const value = {
        assistant_text: parsed.assistant_text,
        cards: Array.isArray(parsed.cards) ? parsed.cards : cards,
        proposed_actions: Array.isArray(parsed.proposed_actions) ? parsed.proposed_actions : proposedActions
      };
      setCachedAiReply(cacheKey, value);
      return value;
    }

    const fallback = {
      assistant_text: response.output_text || "I have a few recommendations ready.",
      cards,
      proposed_actions: proposedActions
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  } catch {
    const fallback = {
      assistant_text:
        "I can still recommend options right now, but the AI model is temporarily unavailable.",
      cards,
      proposed_actions: proposedActions
    };
    setCachedAiReply(cacheKey, fallback);
    return fallback;
  }
}

export function registerPlannerApi(app) {
  app.post("/api/auth/signup", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim() || "SLO Student";

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const existing = [...store.users.values()].find((user) => user.email === email);
    if (existing) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const userId = randomUUID();
    const user = {
      id: userId,
      email,
      display_name: displayName,
      cal_poly_email: email.endsWith("@calpoly.edu") ? email : "",
      onboarding_complete: false,
      created_at: NOW().toISOString(),
      password
    };

    store.users.set(userId, user);
    getOrInitPreferences(userId);
    getOrInitConnections(userId);

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, userId);

    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: user.onboarding_complete
      }
    });
  });

  app.post("/api/auth/signin", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = [...store.users.values()].find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, user.id);
    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: user.onboarding_complete
      }
    });
  });

  app.post("/api/auth/session-bootstrap", (req, res) => {
    const token = req.header("x-session-token") || req.body?.sessionToken;
    if (!token) {
      res.json({ authenticated: false, pending_redirect: req.body?.pendingRedirect || null });
      return;
    }

    const userId = store.sessions.get(token);
    const user = userId ? store.users.get(userId) : null;
    if (!user) {
      res.json({ authenticated: false, pending_redirect: req.body?.pendingRedirect || null });
      return;
    }

    res.json({
      authenticated: true,
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        onboarding_complete: Boolean(user.onboarding_complete)
      },
      preferences: getOrInitPreferences(user.id),
      connections: getOrInitConnections(user.id),
      badges: userBadges(user.id),
      pending_redirect: req.body?.pendingRedirect || null
    });
  });

  app.post("/api/preferences", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const current = getOrInitPreferences(auth.userId);
    const next = {
      ...current,
      categories: Array.isArray(req.body?.categories) ? req.body.categories : current.categories,
      vibe: req.body?.vibe || current.vibe,
      budget: req.body?.budget || current.budget,
      transport: req.body?.transport || current.transport,
      updated_at: NOW().toISOString()
    };

    store.preferences.set(auth.userId, next);
    auth.user.onboarding_complete = true;

    res.json({ preferences: next, onboarding_complete: true });
  });

  app.post("/api/calendar/google/connect-start", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
      state: randomUUID(),
      message: "Use this URL to start Google OAuth in production."
    });
  });

  app.post("/api/calendar/google/connect-complete", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const connections = getOrInitConnections(auth.userId);
    connections.calendar_google_connected = true;
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    res.json({ connected: true, provider: "google", connections });
  });

  app.post("/api/calendar/ics/import", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const events = parseIcsSummary(req.body?.icsContent || "");
    const connections = getOrInitConnections(auth.userId);
    connections.calendar_ics_connected = true;
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    res.json({ imported_count: events.length, sample: events.slice(0, 5), connections });
  });

  app.post("/api/canvas/connect/oauth-start", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      auth_url: "https://canvas.instructure.com/login/oauth2/auth",
      message: "Canvas OAuth setup placeholder for v1."
    });
  });

  app.post("/api/canvas/connect/oauth-complete", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const connections = getOrInitConnections(auth.userId);
    connections.canvas_connected = true;
    connections.canvas_mode = "oauth";
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    if (!store.studyTasks.some((task) => task.user_id === auth.userId)) {
      store.studyTasks.push(
        {
          id: randomUUID(),
          user_id: auth.userId,
          source: "canvas",
          title: "Physics Problem Set 4",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
          course: "PHYS 141",
          duration_min: 120,
          done: false
        },
        {
          id: randomUUID(),
          user_id: auth.userId,
          source: "canvas",
          title: "BIO 161 Discussion Post",
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
          course: "BIO 161",
          duration_min: 45,
          done: false
        }
      );
    }

    res.json({ connected: true, mode: "oauth", connections });
  });

  app.post("/api/canvas/connect/token", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const token = String(req.body?.token || "").trim();
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    const connections = getOrInitConnections(auth.userId);
    connections.canvas_connected = true;
    connections.canvas_mode = "manual";
    connections.updated_at = NOW().toISOString();
    store.connections.set(auth.userId, connections);

    res.json({ connected: true, mode: "manual", connections });
  });

  app.get("/api/home/recommendations", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const weather = String(req.query.weather || "clear");
    const timeOfDay = String(req.query.timeOfDay || "evening");
    const recommendations = rankedRecommendations(auth.userId, { weather, timeOfDay });
    const studyLoad = computeStudyLoad(auth.userId);

    res.json({
      recommendations,
      study_load: studyLoad,
      due_today: studyLoad.due_soon_count > 0,
      badges: userBadges(auth.userId)
    });
  });

  app.get("/api/explore", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const category = String(req.query.category || "all");
    const search = String(req.query.search || "").toLowerCase();
    const sort = String(req.query.sort || "trending");
    const savedOnly = String(req.query.savedOnly || "0") === "1";

    const saved = new Set(
      store.userEventStates
        .filter((state) => state.user_id === auth.userId && state.state === "saved")
        .map((state) => state.event_id)
    );

    let list = store.eventsCatalog.filter((item) => (category === "all" ? true : item.category === category));
    if (search) {
      list = list.filter((item) => item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search));
    }
    if (savedOnly) {
      list = list.filter((item) => saved.has(item.id));
    }

    if (sort === "free") list = list.sort((a, b) => Number(b.free) - Number(a.free));
    if (sort === "distance") list = list.sort((a, b) => a.distanceMiles - b.distanceMiles);
    if (sort === "trending") list = list.sort((a, b) => b.rating - a.rating);

    res.json({ items: list.map((item) => ({ ...item, saved: saved.has(item.id) })) });
  });

  app.get("/api/items/:itemId", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const item = store.eventsCatalog.find((candidate) => candidate.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const states = store.userEventStates.filter((state) => state.user_id === auth.userId && state.event_id === item.id);
    res.json({ item, states });
  });

  app.post("/api/items/:itemId/state", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const item = store.eventsCatalog.find((candidate) => candidate.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const state = String(req.body?.state || "");
    if (!["confirmed", "maybe", "saved"].includes(state)) {
      res.status(400).json({ error: "state must be confirmed, maybe, or saved" });
      return;
    }

    const expiresAt = state === "maybe" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString() : null;

    store.userEventStates = store.userEventStates.filter(
      (row) => !(row.user_id === auth.userId && row.event_id === item.id && row.state === state)
    );

    const next = {
      id: randomUUID(),
      user_id: auth.userId,
      event_id: item.id,
      state,
      expires_at: expiresAt,
      created_at: NOW().toISOString()
    };
    store.userEventStates.push(next);

    res.json({ state: next });
  });

  app.get("/api/my-events", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const now = NOW();
    const rows = store.userEventStates.filter((row) => row.user_id === auth.userId && ["confirmed", "maybe"].includes(row.state));
    const activeRows = rows.filter((row) => !(row.state === "maybe" && row.expires_at && new Date(row.expires_at) < now));

    res.json({
      confirmed: activeRows
        .filter((row) => row.state === "confirmed")
        .map((row) => ({ ...row, item: store.eventsCatalog.find((item) => item.id === row.event_id) })),
      maybe: activeRows
        .filter((row) => row.state === "maybe")
        .map((row) => ({ ...row, item: store.eventsCatalog.find((item) => item.id === row.event_id) }))
    });
  });

  app.post("/api/groups", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const name = String(req.body?.name || "").trim();
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const group = {
      id: randomUUID(),
      owner_user_id: auth.userId,
      name,
      created_at: NOW().toISOString()
    };
    store.groups.push(group);

    res.json({ group });
  });

  app.get("/api/groups", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const groups = store.groups
      .filter((group) => group.owner_user_id === auth.userId)
      .map((group) => ({ ...group, members: store.groupMembers.filter((member) => member.group_id === group.id) }));

    res.json({ groups });
  });

  app.post("/api/groups/:groupId/members", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const group = store.groups.find((candidate) => candidate.id === req.params.groupId && candidate.owner_user_id === auth.userId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const member = {
      id: randomUUID(),
      group_id: group.id,
      member_type: req.body?.user_id ? "user" : "external_contact",
      user_id: req.body?.user_id || null,
      phone: req.body?.phone || null,
      email: req.body?.email || null,
      display_name: req.body?.display_name || "New member"
    };

    store.groupMembers.push(member);
    res.json({ member });
  });

  app.post("/api/invites/generate", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const entityType = String(req.body?.entity_type || "");
    const entityId = String(req.body?.entity_id || "");
    if (!entityType || !entityId) {
      res.status(400).json({ error: "entity_type and entity_id are required" });
      return;
    }

    const token = randomUUID().replace(/-/g, "").slice(0, 20);
    const invite = {
      id: randomUUID(),
      token,
      entity_type: entityType,
      entity_id: entityId,
      created_by: auth.userId,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    };
    store.invites.push(invite);

    if (entityType === "jam") {
      const jam = store.jams.find((candidate) => candidate.id === entityId);
      if (jam) {
        createNotification({
          userId: auth.userId,
          type: "jam_invite_link_created",
          title: "Jam invite link created",
          message: `Your invite link for ${jam.name} is ready to share.`,
          entityType: "jam",
          entityId: jam.id
        });
      }
    }

    res.json({ invite, link: `/join/${token}` });
  });

  app.get("/api/join/:token", (req, res) => {
    const invite = store.invites.find((candidate) => candidate.token === req.params.token);
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    res.json({ invite });
  });

  app.post("/api/join/:token/respond", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const invite = store.invites.find((candidate) => candidate.token === req.params.token);
    if (!invite) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    const response = {
      id: randomUUID(),
      invite_token: invite.token,
      user_id: auth.userId,
      rsvp: req.body?.rsvp || "maybe",
      comment: req.body?.comment || "",
      availability_blocks: req.body?.availability_blocks || []
    };

    if (invite.entity_type === "plan") {
      store.planParticipants.push({
        id: randomUUID(),
        plan_id: invite.entity_id,
        user_id: auth.userId,
        rsvp: response.rsvp,
        availability_blocks_json: response.availability_blocks,
        comment: response.comment
      });
    }

    if (invite.entity_type === "jam") {
      const jam = store.jams.find((candidate) => candidate.id === invite.entity_id);
      if (jam && !store.jamMembers.some((member) => member.jam_id === jam.id && member.user_id === auth.userId)) {
        store.jamMembers.push({
          id: randomUUID(),
          jam_id: jam.id,
          user_id: auth.userId,
          role: "member",
          joined_at: NOW().toISOString()
        });

        createNotification({
          userId: jam.host_user_id,
          type: "jam_member_joined",
          title: "New jam member",
          message: `${auth.user.display_name || auth.user.email} joined ${jam.name}.`,
          entityType: "jam",
          entityId: jam.id
        });
      }
    }

    res.json({ response });
  });

  app.post("/api/plans", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const constraints = req.body?.constraints || {};
    const recommendations = rankedRecommendations(auth.userId, {
      weather: constraints.weather || "clear",
      timeOfDay: constraints.timeOfDay || "evening"
    });

    const plan = {
      id: randomUUID(),
      host_user_id: auth.userId,
      title: req.body?.title || "New SLO plan",
      constraints_json: constraints,
      status: "draft",
      finalized_option_json: null,
      created_at: NOW().toISOString(),
      options: generatePlanOptions({ constraints, recommendations })
    };

    store.plans.push(plan);
    res.json({ plan_id: plan.id, request_id: plan.id, options: plan.options });
  });

  app.get("/api/plans/:id/results", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json({ plan });
  });

  app.post("/api/plans/:id/reschedule", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id && candidate.host_user_id === auth.userId);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const recommendations = rankedRecommendations(auth.userId, { weather: "clear", timeOfDay: "evening" });
    plan.options = generatePlanOptions({ constraints: plan.constraints_json || {}, recommendations });

    res.json({ plan });
  });

  app.post("/api/plans/:id/rsvp", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const plan = store.plans.find((candidate) => candidate.id === req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const participant = {
      id: randomUUID(),
      plan_id: plan.id,
      user_id: auth.userId,
      rsvp: req.body?.rsvp || "maybe",
      availability_blocks_json: req.body?.availability_blocks || [],
      comment: req.body?.comment || ""
    };
    store.planParticipants.push(participant);

    if (req.body?.finalize_option_id && plan.host_user_id === auth.userId) {
      const chosen = (plan.options || []).find((option) => option.id === req.body.finalize_option_id);
      if (chosen) {
        plan.finalized_option_json = chosen;
        plan.status = "finalized";
      }
    }

    res.json({ participant, plan });
  });

  app.post("/api/jams", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const jam = {
      id: randomUUID(),
      code,
      host_user_id: auth.userId,
      name: req.body?.name || "Weekend Jam",
      status: "open"
    };

    store.jams.push(jam);
    store.jamMembers.push({
      id: randomUUID(),
      jam_id: jam.id,
      user_id: auth.userId,
      role: "host",
      joined_at: NOW().toISOString()
    });

    createNotification({
      userId: auth.userId,
      type: "jam_created",
      title: "Jam created",
      message: `${jam.name} is live. Share code ${jam.code} to invite others.`,
      entityType: "jam",
      entityId: jam.id
    });

    res.json({ jam, link: `/jam/${code}` });
  });

  app.get("/api/jams/:code", (req, res) => {
    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    const members = store.jamMembers.filter((member) => member.jam_id === jam.id);
    res.json({ jam, members_count: members.length });
  });

  app.post("/api/jams/:code/accept", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    if (!store.jamMembers.some((member) => member.jam_id === jam.id && member.user_id === auth.userId)) {
      store.jamMembers.push({
        id: randomUUID(),
        jam_id: jam.id,
        user_id: auth.userId,
        role: "member",
        joined_at: NOW().toISOString()
      });

      createNotification({
        userId: jam.host_user_id,
        type: "jam_accepted",
        title: "Jam invite accepted",
        message: `${auth.user.display_name || auth.user.email} accepted your jam invite.`,
        entityType: "jam",
        entityId: jam.id
      });
    }

    res.json({ accepted: true, jam });
  });

  app.post("/api/jams/:code/decline", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const jam = store.jams.find((candidate) => candidate.code === req.params.code.toUpperCase());
    if (!jam) {
      res.status(404).json({ error: "Jam not found" });
      return;
    }

    store.jamMembers = store.jamMembers.filter((member) => !(member.jam_id === jam.id && member.user_id === auth.userId));

    createNotification({
      userId: jam.host_user_id,
      type: "jam_declined",
      title: "Jam invite declined",
      message: `${auth.user.display_name || auth.user.email} declined your jam invite.`,
      entityType: "jam",
      entityId: jam.id
    });
    res.json({ declined: true, jam });
  });

  app.get("/api/notifications", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const items = store.notifications
      .filter((notification) => notification.user_id === auth.userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const unread_count = items.filter((notification) => !notification.read).length;
    res.json({ notifications: items, unread_count });
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const notification = store.notifications.find(
      (candidate) => candidate.id === req.params.id && candidate.user_id === auth.userId
    );
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    notification.read = true;
    res.json({ notification });
  });

  app.post("/api/notifications/read-all", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    let updated = 0;
    store.notifications.forEach((notification) => {
      if (notification.user_id !== auth.userId || notification.read) return;
      notification.read = true;
      updated += 1;
    });

    res.json({ updated });
  });

  app.get("/api/study/tasks", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const tasks = store.studyTasks.filter((task) => task.user_id === auth.userId);
    res.json({ tasks, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/study/tasks", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const title = String(req.body?.title || "").trim();
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const task = {
      id: randomUUID(),
      user_id: auth.userId,
      source: req.body?.source || "manual",
      title,
      due_at: req.body?.due_at || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      course: req.body?.course || "General",
      duration_min: Number(req.body?.duration_min) || 60,
      done: false
    };
    store.studyTasks.push(task);

    res.json({ task, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/study/tasks/:taskId/toggle", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const task = store.studyTasks.find((candidate) => candidate.id === req.params.taskId && candidate.user_id === auth.userId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    task.done = !task.done;
    res.json({ task, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/agent/chat", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const context = normalizeChatContext(req.body?.context, auth.userId);
    const intent = parseMessageIntent(message);
    const recommendations = rankedRecommendations(auth.userId, {
      weather: context.weather || "clear",
      timeOfDay: context.time_of_day || "evening",
      requestedCategories: intent.requestedCategories,
      strictCategoryMatch: intent.strictCategoryMatch
    });

    const cards = recommendations.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description,
      deep_link: item.link,
      reason_tags: item.reason_tags,
      category: item.category,
      score: item.score
    }));

    const proposedActions = [];
    const lower = message.toLowerCase();

    if (lower.includes("plan")) {
      const actionId = randomUUID();
      const payload = {
        type: "create_plan_draft",
        title: "AI Draft Plan",
        constraints: { timeOfDay: "evening", weather: "clear", durationMin: 120 }
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("rsvp") || lower.includes("confirm")) {
      const actionId = randomUUID();
      const payload = {
        type: "rsvp_event",
        item_id: cards[0]?.id || store.eventsCatalog[0].id,
        state: "confirmed"
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("jam")) {
      const actionId = randomUUID();
      const payload = { type: "join_jam", code: "DEMO42" };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("task") || lower.includes("study")) {
      const actionId = randomUUID();
      const payload = {
        type: "add_study_task",
        title: "AI-added study block",
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        course: "General"
      };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    if (lower.includes("book") || lower.includes("reservation") || lower.includes("zipcar")) {
      const actionId = randomUUID();
      const payload = { type: "create_booking_intent", provider: "external", item_id: cards[0]?.id || "event-brew-quiet" };
      store.pendingActions.set(actionId, payload);
      proposedActions.push({ action_id: actionId, type: payload.type, payload, requires_confirmation: true });
    }

    const aiReply = await generateStructuredAssistantReply({
      message,
      context,
      cards,
      proposedActions
    });

    const chatId = randomUUID();
    store.aiActionLogs.push({
      id: chatId,
      user_id: auth.userId,
      prompt: message,
      context_json: context,
      cards_json: cards,
      assistant_text: aiReply.assistant_text,
      proposed_actions_json: proposedActions,
      confirmed_action_id: null,
      feedback_events: [],
      created_at: NOW().toISOString()
    });

    const finalCards = sanitizeCardsForIntent(aiReply.cards || cards, cards, intent);

    res.json({
      chat_id: chatId,
      assistant_text: aiReply.assistant_text,
      cards: finalCards,
      proposed_actions: aiReply.proposed_actions || proposedActions
    });
  });

  app.post("/api/agent/feedback", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const rawSignal = String(req.body?.signal || "").trim().toLowerCase();
    const signal = rawSignal === "helpful" || rawSignal === "up" ? "up" : rawSignal === "not_fit" || rawSignal === "down" ? "down" : null;
    if (!signal) {
      res.status(400).json({ error: "signal is required: helpful|not_fit (or up|down)" });
      return;
    }

    const chatId = String(req.body?.chat_id || "").trim();
    const cardIds = Array.isArray(req.body?.card_ids)
      ? req.body.card_ids.map((id) => String(id)).filter(Boolean).slice(0, 10)
      : [];
    const note = String(req.body?.note || "").trim().slice(0, 500);

    const feedback = {
      id: randomUUID(),
      user_id: auth.userId,
      signal,
      card_ids: cardIds,
      note,
      created_at: NOW().toISOString()
    };

    let attached_to_chat = false;
    if (chatId) {
      const log = store.aiActionLogs.find((row) => row.id === chatId && row.user_id === auth.userId);
      if (log) {
        if (!Array.isArray(log.feedback_events)) log.feedback_events = [];
        log.feedback_events.push(feedback);
        attached_to_chat = true;
      }
    }

    if (!attached_to_chat) {
      store.aiActionLogs.push({
        id: randomUUID(),
        user_id: auth.userId,
        prompt: String(req.body?.prompt || "").trim(),
        context_json: req.body?.context || {},
        cards_json: [],
        assistant_text: "",
        proposed_actions_json: [],
        confirmed_action_id: null,
        feedback_events: [feedback],
        created_at: NOW().toISOString()
      });
    }

    res.json({ ok: true, feedback, attached_to_chat });
  });

  app.post("/api/agent/actions/:actionId/confirm", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const action = store.pendingActions.get(req.params.actionId);
    if (!action) {
      res.status(404).json({ error: "Action not found or expired" });
      return;
    }

    let result = null;

    if (action.type === "create_plan_draft") {
      const recommendations = rankedRecommendations(auth.userId, { weather: "clear", timeOfDay: "evening" });
      const plan = {
        id: randomUUID(),
        host_user_id: auth.userId,
        title: action.title,
        constraints_json: action.constraints,
        status: "draft",
        finalized_option_json: null,
        created_at: NOW().toISOString(),
        options: generatePlanOptions({ constraints: action.constraints, recommendations })
      };
      store.plans.push(plan);
      result = { plan_id: plan.id, deep_link: `/plans/${plan.id}` };
    }

    if (action.type === "rsvp_event") {
      const row = {
        id: randomUUID(),
        user_id: auth.userId,
        event_id: action.item_id,
        state: action.state,
        expires_at: null,
        created_at: NOW().toISOString()
      };
      store.userEventStates.push(row);
      result = { event_id: row.event_id, state: row.state };
    }

    if (action.type === "join_jam") {
      const jam = store.jams.find((candidate) => candidate.code === action.code);
      result = jam ? { jam_id: jam.id, deep_link: `/jam/${jam.code}` } : { message: "Jam code not found" };
    }

    if (action.type === "add_study_task") {
      const task = {
        id: randomUUID(),
        user_id: auth.userId,
        source: "manual",
        title: action.title,
        due_at: action.due_at,
        course: action.course,
        duration_min: Number(action.duration_min) || 60,
        done: false
      };
      store.studyTasks.push(task);
      result = { task_id: task.id, title: task.title };
    }

    if (action.type === "create_booking_intent") {
      result = {
        provider: "opentable",
        deep_link: "https://www.opentable.com/",
        note: "Complete booking in provider flow."
      };
    }

    const chatId = String(req.body?.chat_id || "").trim();
    if (chatId) {
      const log = store.aiActionLogs.find((row) => row.id === chatId && row.user_id === auth.userId);
      if (log) {
        log.confirmed_action_id = req.params.actionId;
      }
    }

    store.pendingActions.delete(req.params.actionId);
    res.json({ confirmed: true, action_type: action.type, result });
  });

  app.post("/api/booking/intent", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const itemId = req.body?.item_id || "event-brew-quiet";
    const item = store.eventsCatalog.find((candidate) => candidate.id === itemId);
    res.json({
      item,
      providers: [
        { name: "OpenTable", deep_link: "https://www.opentable.com/" },
        { name: "Google Maps", deep_link: "https://maps.google.com/" }
      ],
      requires_external_completion: true
    });
  });

  app.post("/api/payments/applepay/merchant-session", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      status: "stub",
      message: "Apple Pay merchant validation stub ready. Wire payment processor credentials next phase.",
      merchant_session: null
    });
  });

  app.post("/api/payments/applepay/confirm", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    res.json({
      status: "stub",
      confirmed: false,
      message: "Apple Pay confirmation stub. Real processing is intentionally disabled in v1."
    });
  });
}
