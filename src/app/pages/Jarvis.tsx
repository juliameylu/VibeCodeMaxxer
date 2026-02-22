import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Send, ExternalLink, Sparkles, Pin, Users, ClipboardList, Trash2 } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";
import { getUserPreferences, getPersonalizedRecommendation, getPreferenceScore } from "../utils/preferences";
import { places, getDistanceMiles, CAL_POLY_LAT, CAL_POLY_LNG, getPlaceEmoji, type Place } from "../data/places";
import { apiFetch } from "../../lib/apiClient";

const MESSAGES_KEY = "polyjarvis_chat_history";
const HOME_LOCATION_KEY = "polyjarvis_home_location";
const RESERVATION_STATUS_KEY = "polyjarvis_reservation_statuses";

const promptPills = [
  "Best tacos near campus?",
  "Plan a beach trip",
  "Where to study tonight?",
  "Recommend for me",
  "Free things to do",
  "Sunset hike spots",
  "I'm bored",
  "I feel behind",
  "Weekend road trip ideas",
  "Live music this week",
  "Surprise me!",
  "Cheap date ideas",
  "Farmers market tips",
];

const OUTDOOR_CATEGORIES = new Set([
  "Hikes",
  "Beaches",
  "Parks & Gardens",
  "Viewpoints",
  "Water Sports",
  "Day Trips",
]);

const INDOOR_CATEGORIES = new Set([
  "Study Spots",
  "Coffee Shops",
  "Museums",
  "Movies",
  "Art",
  "Food & Treats",
  "Games & Arcades",
  "Bowling",
  "Escape Rooms",
  "Libraries",
  "Shopping",
  "Theater & Comedy",
]);

const FOOD_CATEGORIES = new Set(["Food & Treats", "Coffee Shops", "Breweries"]);
const DATE_CATEGORIES = new Set(["Beaches", "Viewpoints", "Food & Treats", "Wineries", "Art", "Live Music"]);

const responseIntros = [
  "You want something worth your time.",
  "Good ask. Let's make this easy.",
  "I got you. Here's a strong shortlist.",
  "Perfect. I'm filtering this for you now.",
  "Let's pick something you'll actually do.",
  "Solid move. Here's what fits best.",
  "Let's optimize this with your context.",
  "Nice. I narrowed this to high-fit picks.",
  "You're asking the right question.",
  "Let's find the move, not just options.",
];

const responseMoves = [
  "Focus on low-friction options close by.",
  "I'll prioritize weather-safe picks first.",
  "I'll bias toward your saved preferences.",
  "I'll keep this realistic for today.",
  "I'll rank by vibe, time, and budget.",
  "I'll optimize for social fit.",
  "I'll avoid options that require a long commute.",
  "I'll include one safe choice and one stretch pick.",
  "I'll keep it simple and actionable.",
  "I'll target options you can start within 30 minutes.",
];

const FIND_VARIATIONS = responseIntros.flatMap((intro) => responseMoves.map((move) => `${intro} ${move}`));

function normalizeInput(input: string) {
  return input.toLowerCase().trim();
}

type FindContext = {
  vibe?: "outdoor" | "indoor" | "food" | "mix";
  budget?: "free" | "cheap" | "flexible";
  social?: "solo" | "date" | "group";
  timing?: "now" | "quick" | "tonight" | "weekend";
  weather?: "sunny" | "rainy" | "windy" | "hot" | "cold";
  meal?: "breakfast" | "brunch" | "lunch" | "dinner" | "late-night" | "coffee";
  hikeLength?: "short" | "long";
  effort?: "chill" | "active";
  transport?: "walk" | "bike" | "bus" | "car";
  wantsSwim?: boolean;
  wantsTan?: boolean;
  nearOnly?: boolean;
};

function isFindSomethingIntent(input: string) {
  const q = normalizeInput(input)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directPhrases = [
    "find me something to do",
    "find me something",
    "something to do",
    "things to do",
    "what should i do",
    "what can i do today",
    "what to do today",
    "any ideas",
    "im bored",
    "i m bored",
    "plan my day",
    "build my schedule",
    "create a schedule",
    "make me a plan",
    "make an agenda",
    "give me options",
    "recommend something",
    "suggest something",
    "what places are near me",
    "things to do near me",
    "what should we do",
    "ideas for tonight",
    "ideas for today",
    "activities for tonight",
    "activities for the weekend",
    "something fun to do",
    "something chill to do",
    "something active to do",
    "something cheap to do",
    "something free to do",
    "something indoors to do",
    "something outside to do",
    "find stuff to do",
    "show me stuff to do",
    "what to do around here",
    "what can i do around here",
    "what can i do nearby",
    "what can i do close by",
    "organize my day",
    "organize today for me",
    "create a day plan",
    "make a day plan",
  ];

  if (directPhrases.some((p) => q.includes(p))) return true;

  const hasPlannerVerb = /(find|recommend|suggest|pick|show|give|plan|build|organize|create|generate|need|want|help|where|what|go)/.test(q);
  const hasTargetNoun = /(something|anything|ideas|options|plan|agenda|schedule|day|today|tonight|weekend|activity|activities|thing|things|stuff|fun|spot|spots|place|places|hang out)/.test(q);
  const hasDoSignal = /(to do|do today|for today|right now|near me|nearby|around me|around here|close by|this weekend|weekend|tonight|today|hang out|after class|before dinner|after studying)/.test(q);
  const hasQuestionForm = /^(what|where|any|can you|could you|help me|got)/.test(q);
  const hasContextSignal = /(for me|date night|9 to 5|time blocked|my day|after studying|after class|before dinner)/.test(q);
  const hasNeedWantForm = /(i need|i want|we should|can we|want ideas)/.test(q);
  const hasWhereGoPattern = /where.*go.*(today|tonight|weekend|near|around|after)/.test(q);

  return (
    (hasPlannerVerb && hasTargetNoun && (hasDoSignal || hasContextSignal)) ||
    (hasQuestionForm && hasTargetNoun) ||
    (hasNeedWantForm && hasTargetNoun) ||
    (hasTargetNoun && hasDoSignal) ||
    hasWhereGoPattern
  );
}

function parseFindContext(input: string): FindContext {
  const q = normalizeInput(input);
  return {
    vibe: /outdoor|outside|hike|beach|nature/.test(q)
      ? "outdoor"
      : /indoor|inside|museum|movie|arcade|bowling|study/.test(q)
        ? "indoor"
        : /food|eat|restaurant|breakfast|brunch|lunch|dinner|coffee/.test(q)
          ? "food"
          : /mix|either|both|anything/.test(q)
            ? "mix"
            : undefined,
    budget: /free|no money|zero|0\$/.test(q)
      ? "free"
      : /cheap|budget|under|student/.test(q)
        ? "cheap"
        : /flexible|any budget|doesn'?t matter|doesnt matter/.test(q)
          ? "flexible"
          : undefined,
    social: /solo|alone|myself/.test(q)
      ? "solo"
      : /date|romantic|partner/.test(q)
        ? "date"
        : /group|friends|crew|team|with people/.test(q)
          ? "group"
          : undefined,
    timing: /now|right now|asap/.test(q)
      ? "now"
      : /quick|short|30 min|45 min|60 min|1 hour|1hr/.test(q)
        ? "quick"
        : /tonight|evening|night/.test(q)
          ? "tonight"
          : /weekend|saturday|sunday/.test(q)
            ? "weekend"
            : undefined,
    weather: /sunny|clear/.test(q)
      ? "sunny"
      : /rain|rainy|storm/.test(q)
        ? "rainy"
        : /wind|windy/.test(q)
          ? "windy"
          : /hot|heat|warm/.test(q)
            ? "hot"
            : /cold|chilly|freezing/.test(q)
              ? "cold"
              : undefined,
    meal: /breakfast/.test(q)
      ? "breakfast"
      : /brunch/.test(q)
        ? "brunch"
        : /lunch/.test(q)
          ? "lunch"
          : /dinner/.test(q)
            ? "dinner"
            : /late|late night/.test(q)
              ? "late-night"
              : /coffee|cafe|latte/.test(q)
                ? "coffee"
                : undefined,
    hikeLength: /short hike|easy hike|quick hike|under\s*3|2 mile|3 mile/.test(q)
      ? "short"
      : /long hike|hard hike|challenge|over\s*4|5 mile|6 mile/.test(q)
        ? "long"
        : undefined,
    effort: /chill|relax|easy|low energy/.test(q)
      ? "chill"
      : /active|adventure|workout|high energy/.test(q)
        ? "active"
        : undefined,
    transport: /walk|walking/.test(q)
      ? "walk"
      : /bike|biking/.test(q)
        ? "bike"
        : /bus|transit/.test(q)
          ? "bus"
          : /drive|car/.test(q)
            ? "car"
            : undefined,
    wantsSwim: /swim|ocean dip|water/.test(q),
    wantsTan: /tan|sunbathe|sun bath/.test(q),
    nearOnly: /near me|nearby|close by|around me/.test(q),
  };
}

function parseDistanceMiles(label: string): number {
  const match = label.match(/(\d+(\.\d+)?)\s*mile/i);
  return match ? Number(match[1]) : 999;
}

function parseDurationMinutes(raw?: string): number {
  if (!raw) return 999;
  const text = raw.toLowerCase();
  const hourRange = text.match(/(\d+)\s*-\s*(\d+)\s*hr/);
  if (hourRange) return Number(hourRange[1]) * 60;
  const hourOnly = text.match(/(\d+(\.\d+)?)\s*(hour|hr)/);
  if (hourOnly) return Math.round(Number(hourOnly[1]) * 60);
  const minOnly = text.match(/(\d+)\s*min/);
  if (minOnly) return Number(minOnly[1]);
  return 999;
}

function mealFits(placeName: string, tags: string[], meal?: FindContext["meal"]) {
  if (!meal) return true;
  const source = `${placeName} ${tags.join(" ")}`.toLowerCase();
  if (meal === "breakfast") return /(breakfast|acai|toast|coffee|brunch)/.test(source);
  if (meal === "brunch") return /(brunch|acai|toast|coffee)/.test(source);
  if (meal === "lunch") return /(lunch|deli|sandwich|taco|bowl|grill|pizza)/.test(source);
  if (meal === "dinner") return /(dinner|grill|pizza|sushi|brew|restaurant)/.test(source);
  if (meal === "late-night") return /(late|pizza|brew|bar|night)/.test(source);
  if (meal === "coffee") return /(coffee|cafe|latte|espresso)/.test(source);
  return true;
}

function pickFindVariation(seed: string) {
  const index = Math.abs(seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % FIND_VARIATIONS.length;
  return FIND_VARIATIONS[index];
}

type NavAction = { type: "navigate"; path: string; label: string } | null;

interface JarvisAction {
  type: "pin" | "jam" | "plan";
  label: string;
  data?: any;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  action?: NavAction;
  jarvisActions?: JarvisAction[];
  timestamp?: number;
}

type ReservationDraft = {
  restaurantName: string;
  reservationTime: string;
  partySize: number;
  specialRequest?: string;
};

type ReservationStatusRecord = {
  jobId: string;
  restaurantName: string;
  reservationTime: string;
  partySize: number;
  status: string;
  decision: string;
  updatedAt: number;
};

type RecommendationMemory = {
  kind: "find" | "food";
  seedPrompt: string;
  picks: Place[];
  baseLocation?: { label: string; lat: number; lng: number };
  updatedAt: number;
};

function isYesReply(input: string) {
  return /^(yes|y|yeah|yep|sure|ok|okay|do it|sounds good)$/i.test(input.trim());
}

function isNoReply(input: string) {
  return /^(no|n|nope|nah|not now|skip)$/i.test(input.trim());
}

function isReservationIntent(input: string) {
  const q = normalizeInput(input);
  return /(make|book|get|set up|create|call).*(reservation|table)/.test(q)
    || /(reservation|table).*(at|for)/.test(q);
}

function detectRestaurantName(input: string): string {
  const q = normalizeInput(input);
  const foodPlaces = places.filter((p) => FOOD_CATEGORIES.has(p.category));
  const match = foodPlaces
    .map((p) => p.name)
    .sort((a, b) => b.length - a.length)
    .find((name) => q.includes(normalizeInput(name)));
  if (match) return match;

  const atMatch = input.match(/\bat\s+([a-z0-9 '&.-]{2,})/i);
  if (atMatch?.[1]) {
    const cleaned = atMatch[1]
      .replace(/\b(tonight|today|tomorrow)\b.*$/i, "")
      .replace(/\bfor\s+\d+.*$/i, "")
      .replace(/\bat\s+\d.*$/i, "")
      .trim();
    if (cleaned.length > 1) return cleaned;
  }

  const generic = input
    .replace(/^(can you|could you|please)\s+/i, "")
    .replace(/^(make|book|get|set up|create|call)\s+(me\s+)?(a\s+)?/i, "")
    .replace(/\b(reservation|table)\b/gi, "")
    .replace(/\b(at|for)\b.*/i, "")
    .trim();

  return generic.length > 1 ? generic : "";
}

function parsePartySize(input: string): number | null {
  const forMatch = input.match(/\bfor\s+(\d{1,2})\b/i);
  if (forMatch?.[1]) return Number(forMatch[1]);
  const partyMatch = input.match(/\bparty\s+of\s+(\d{1,2})\b/i);
  if (partyMatch?.[1]) return Number(partyMatch[1]);
  return null;
}

function parseReservationTime(input: string): string | null {
  const lower = normalizeInput(input);
  const timeMatch = input.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const hasTonight = /\btonight\b/.test(lower);
  const hasTomorrow = /\btomorrow\b/.test(lower);
  const hasToday = /\btoday\b/.test(lower);

  if (timeMatch) {
    const raw = timeMatch[0].toUpperCase();
    if (hasTomorrow) return `Tomorrow ${raw}`;
    if (hasTonight) return `Tonight ${raw}`;
    if (hasToday) return `Today ${raw}`;
    return `Tonight ${raw}`;
  }

  if (hasTomorrow) return "Tomorrow evening";
  if (hasTonight) return "Tonight 7:00 PM";
  if (hasToday) return "Today evening";
  return null;
}

function parseSpecialRequest(input: string): string | undefined {
  const lower = normalizeInput(input);
  if (/outside|outdoor|patio/.test(lower)) return "Outdoor seating if possible";
  if (/inside|indoor/.test(lower)) return "Indoor seating preferred";
  if (/quiet/.test(lower)) return "Quiet table if available";
  if (/window/.test(lower)) return "Window seat if available";
  return undefined;
}

function buildReservationDraft(input: string): ReservationDraft | null {
  const restaurantName = detectRestaurantName(input);
  if (!restaurantName) return null;
  return {
    restaurantName,
    reservationTime: parseReservationTime(input) || "Tonight 7:00 PM",
    partySize: parsePartySize(input) || 2,
    specialRequest: parseSpecialRequest(input),
  };
}

function applyReservationEdits(draft: ReservationDraft, input: string): ReservationDraft {
  const restaurantName = detectRestaurantName(input) || draft.restaurantName;
  const reservationTime = parseReservationTime(input) || draft.reservationTime;
  const partySize = parsePartySize(input) || draft.partySize;
  const specialRequest = parseSpecialRequest(input) || draft.specialRequest;
  return { restaurantName, reservationTime, partySize, specialRequest };
}

type ClarificationState = {
  originalPrompt: string;
  vibe?: "outdoor" | "indoor" | "food" | "mix";
  budget?: "free" | "cheap" | "flexible";
  timing?: "now" | "quick" | "tonight" | "weekend";
  social?: "solo" | "date" | "group";
};

function shouldAskClarifyingQuestions(input: string) {
  const q = normalizeInput(input);
  return /(something to do|what should i do|find me something|i'm bored|im bored|any ideas|give me ideas|things to do)/.test(q);
}

function isIndecisiveIntent(input: string) {
  const q = normalizeInput(input);
  return /(^|\s)(idk|i dk|dont know|don't know|not sure|unsure|no clue|clueless)(\s|$)/.test(q)
    || /(dont know what to do|don't know what to do|not sure what to do|no clue what to do|i have no idea what to do)/.test(q)
    || /(i can t decide|i can't decide|can t decide|can't decide)/.test(q);
}

function isNearMeIntent(input: string) {
  const q = normalizeInput(input);
  return /(near me|nearby|close to me|around me|what.*near|places.*near)/.test(q);
}

function isRecommendationFollowUp(input: string) {
  const q = normalizeInput(input);
  return /(cheaper|cheap|budget|closer|close|nearer|more|less|different|another|instead|option|which one|best one|top one|narrow|refine|same but|what about|can you do|make it)/.test(q)
    || /\b(1|2|3|4|5)\b/.test(q);
}

function getSavedHomeLocation() {
  try {
    const raw = localStorage.getItem(HOME_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { label?: string; lat?: number; lng?: number };
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
      return {
        label: parsed.label || "Home",
        lat: parsed.lat,
        lng: parsed.lng,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveNearMeBaseLocation(): Promise<{ label: string; lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            label: "your current location",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          const home = getSavedHomeLocation();
          if (home) {
            resolve({ label: `your home (${home.label})`, lat: home.lat, lng: home.lng });
            return;
          }
          resolve({ label: "Cal Poly campus", lat: CAL_POLY_LAT, lng: CAL_POLY_LNG });
        },
        { enableHighAccuracy: false, timeout: 3500 }
      );
      return;
    }

    const home = getSavedHomeLocation();
    if (home) {
      resolve({ label: `your home (${home.label})`, lat: home.lat, lng: home.lng });
      return;
    }
    resolve({ label: "Cal Poly campus", lat: CAL_POLY_LAT, lng: CAL_POLY_LNG });
  });
}

function buildNearMeResponse(base: { label: string; lat: number; lng: number }) {
  const ranked = places
    .map((p) => ({
      place: p,
      miles: getDistanceMiles(base.lat, base.lng, p.lat, p.lng),
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 5);

  const lines = ranked.map((r, idx) => `${idx + 1}. ${getPlaceEmoji(r.place)} ${r.place.name} (${r.miles.toFixed(1)} mi • ${r.place.category} • ${r.place.price})`);
  return {
    text: `Closest spots near ${base.label}:\n\n${lines.join("\n")}\n\nWant me to narrow this to food, coffee, study, or outdoors?`,
    action: { type: "navigate", path: "/explore", label: "Open Explore" } as NavAction,
  };
}

function buildIndoorRecommendations() {
  const prefs = getUserPreferences();
  const indoorCategories = new Set([
    "Study Spots",
    "Coffee Shops",
    "Museums",
    "Movies",
    "Art",
    "Food & Treats",
    "Games & Arcades",
    "Bowling",
    "Escape Rooms",
    "Libraries",
    "Shopping",
  ]);

  const picks = places
    .filter((p) => indoorCategories.has(p.category))
    .map((p) => ({ place: p, score: getPreferenceScore(p, prefs) + Math.random() }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.place);

  const lines = picks.map((p, idx) => `${idx + 1}. ${getPlaceEmoji(p)} ${p.name} (${p.category} • ${p.price} • ${p.distance})`);
  return {
    text: `Best indoor options right now:\n\n${lines.join("\n")}\n\nWant this narrowed to study, coffee, food, or entertainment?`,
    action: { type: "navigate", path: "/explore", label: "Open Explore" } as NavAction,
  };
}

type FoodIntent = {
  meal?: "breakfast" | "brunch" | "lunch" | "dinner" | "late-night" | "coffee";
  cuisine?: "sushi" | "mexican" | "pizza" | "bbq" | "sandwich" | "healthy" | "coffee";
  cheap?: boolean;
};

function parseFoodIntent(input: string): FoodIntent | null {
  const q = normalizeInput(input);
  const wantsFood = /(breakfast|brunch|lunch|dinner|sushi|mexican|pizza|bbq|sandwich|deli|coffee|cafe|restaurant|food|eat|spots)/.test(q);
  if (!wantsFood) return null;

  const meal = /breakfast/.test(q)
    ? "breakfast"
    : /brunch/.test(q)
      ? "brunch"
      : /lunch/.test(q)
        ? "lunch"
        : /dinner/.test(q)
          ? "dinner"
          : /(late night|latenight|after midnight|night food)/.test(q)
            ? "late-night"
            : /(coffee|cafe|latte|espresso)/.test(q)
              ? "coffee"
              : undefined;

  const cuisine = /(sushi|japanese)/.test(q)
    ? "sushi"
    : /(mexican|taco|taqueria|burrito)/.test(q)
      ? "mexican"
      : /(pizza|pizzeria)/.test(q)
        ? "pizza"
        : /(bbq|barbecue|tri tip|tri-tip|grill)/.test(q)
          ? "bbq"
          : /(sandwich|deli|sub)/.test(q)
            ? "sandwich"
            : /(healthy|vegan|salad|acai|smoothie)/.test(q)
              ? "healthy"
              : /(coffee|cafe|latte|espresso)/.test(q)
                ? "coffee"
                : undefined;

  return {
    meal,
    cuisine,
    cheap: /(cheap|budget|under|student|affordable|low cost|inexpensive)/.test(q),
  };
}

function buildFoodIntentResponse(input: string): { text: string; action?: NavAction; picks: Place[] } | null {
  const intent = parseFoodIntent(input);
  if (!intent) return null;

  const prefs = getUserPreferences();
  const sourceLabel = `${intent.meal ? intent.meal : "food"}${intent.cuisine ? ` ${intent.cuisine}` : ""}${intent.cheap ? " cheap" : ""}`.trim();

  const rankedPrimary = places
    .filter((p) => {
      if (!FOOD_CATEGORIES.has(p.category)) return false;
      if (intent.cheap && !["Free", "$", "$$"].includes(p.price)) return false;
      if (intent.meal && !mealFits(p.name, p.tags || [], intent.meal)) return false;

      const hay = `${p.subcategory || ""} ${(p.tags || []).join(" ")} ${p.name}`.toLowerCase();
      if (intent.cuisine === "sushi") return /(sushi|japanese)/.test(hay);
      if (intent.cuisine === "mexican") return /(mexican|taco|taqueria|burrito)/.test(hay);
      if (intent.cuisine === "pizza") return /(pizza|pizzeria)/.test(hay);
      if (intent.cuisine === "bbq") return /(bbq|barbecue|tri tip|tri-tip|grill)/.test(hay);
      if (intent.cuisine === "sandwich") return /(sandwich|deli|sub)/.test(hay);
      if (intent.cuisine === "healthy") return /(healthy|vegan|salad|acai|smoothie|juice)/.test(hay);
      if (intent.cuisine === "coffee") return /(coffee|cafe|latte|espresso)/.test(hay);
      return true;
    })
    .map((p) => ({ p, score: getPreferenceScore(p, prefs) + p.rating + Math.random() }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.p);

  let picks = rankedPrimary;
  let usedFallback = false;

  if (!picks.length) {
    usedFallback = true;
    picks = places
      .filter((p) => {
        if (!FOOD_CATEGORIES.has(p.category)) return false;
        if (intent.cheap && !["Free", "$", "$$"].includes(p.price)) return false;
        if (intent.meal && !mealFits(p.name, p.tags || [], intent.meal)) return false;
        return true;
      })
      .map((p) => ({ p, score: getPreferenceScore(p, prefs) + p.rating + Math.random() }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.p);
  }

  if (!picks.length) return null;

  const lines = picks.map((p, idx) => `${idx + 1}. ${getPlaceEmoji(p)} ${p.name} (${p.subcategory || p.category} · ${p.price} · ${p.distance})`);
  const fallbackNote = usedFallback ? "\nI couldn't find an exact subcategory/tag match, so I used broader food results.\n" : "";

  return {
    text: `Best ${sourceLabel} picks right now:\n\n${lines.join("\n")}${fallbackNote}\nWant me to narrow this to top 3 by distance or price?`,
    action: { type: "navigate", path: "/explore", label: "Open Explore" } as NavAction,
    picks,
  };
}

function parseVibeAnswer(input: string): ClarificationState["vibe"] | null {
  const q = normalizeInput(input);
  if (/outdoor|outside|hike|beach|nature|active/.test(q)) return "outdoor";
  if (/indoor|inside|study|museum|movie|coffee/.test(q)) return "indoor";
  if (/food|eat|restaurant|coffee|brunch|dinner/.test(q)) return "food";
  if (/mix|either|both|surprise/.test(q)) return "mix";
  return null;
}

function parseBudgetAnswer(input: string): ClarificationState["budget"] | null {
  const q = normalizeInput(input);
  if (/free|no money|zero|0/.test(q)) return "free";
  if (/cheap|budget|under|low/.test(q)) return "cheap";
  if (/flexible|any|doesn't matter|doesnt matter/.test(q)) return "flexible";
  return null;
}

function parseTimingAnswer(input: string): ClarificationState["timing"] | null {
  const q = normalizeInput(input);
  if (/now|right now|asap/.test(q)) return "now";
  if (/quick|short|30|45|60|hour/.test(q)) return "quick";
  if (/tonight|evening|night/.test(q)) return "tonight";
  if (/weekend|saturday|sunday/.test(q)) return "weekend";
  return null;
}

function parseSocialAnswer(input: string): ClarificationState["social"] | null {
  const q = normalizeInput(input);
  if (/solo|alone|myself/.test(q)) return "solo";
  if (/date|partner|girlfriend|boyfriend|romantic/.test(q)) return "date";
  if (/group|friends|crew|party/.test(q)) return "group";
  return null;
}

function nextClarifyingQuestion(state: ClarificationState): string | null {
  if (!state.vibe) return "What vibe are you feeling? For example: outdoor, indoor, food, or mix.";
  if (!state.budget) return "Budget check. For example: free, cheap, or flexible.";
  if (!state.timing) return "When do you want to do it? For example: now, quick, tonight, or weekend.";
  if (!state.social) return "Who’s this for? For example: solo, date, or group.";
  return null;
}

function clarificationOptions(state: ClarificationState): string[] {
  if (!state.vibe) return ["Outdoor", "Indoor", "Food", "Mix"];
  if (!state.budget) return ["Free", "Cheap", "Flexible"];
  if (!state.timing) return ["Now", "Quick", "Tonight", "Weekend"];
  if (!state.social) return ["Solo", "Date", "Group"];
  return [];
}

function buildClarifiedRecommendation(state: ClarificationState): { text: string; action?: NavAction } {
  const prefs = getUserPreferences();
  const picks = places
    .filter((p) => {
      if (state.vibe === "outdoor" && !["Hikes", "Beaches", "Parks & Gardens", "Viewpoints", "Water Sports"].includes(p.category)) return false;
      if (state.vibe === "indoor" && !["Study Spots", "Coffee Shops", "Museums", "Movies", "Art", "Food & Treats"].includes(p.category)) return false;
      if (state.vibe === "food" && !["Food & Treats", "Coffee Shops", "Breweries"].includes(p.category)) return false;

      if (state.budget === "free" && p.price !== "Free") return false;
      if (state.budget === "cheap" && !["Free", "$", "$$"].includes(p.price)) return false;

      const est = (p.estimatedTime || "").toLowerCase();
      if (state.timing === "quick" && !/(30|45|60|min|1 hour|1hr)/.test(est)) return false;
      if (state.social === "group" && !(p.features || []).includes("group friendly")) return false;
      if (state.social === "date" && !["Beaches", "Viewpoints", "Food & Treats", "Wineries"].includes(p.category)) return false;
      return true;
    })
    .map((p) => ({ p, score: getPreferenceScore(p, prefs) + Math.random() }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);

  if (!picks.length) {
    return {
      text: "I couldn't find a perfect match with those constraints. Want me to loosen one filter (budget or timing)?",
      action: { type: "navigate", path: "/explore", label: "Browse Explore" },
    };
  }

  const lines = picks.map((p, i) => `${i + 1}. ${getPlaceEmoji(p)} ${p.name} (${p.category} · ${p.price} · ${p.distance})`);
  return {
    text: `Perfect. Based on your vibe, budget, timing, and who you're with:\n\n${lines.join("\n")}\n\nWant me to narrow this to one final pick?`,
    action: { type: "navigate", path: "/explore", label: "Open Explore" },
  };
}

function buildFindSomethingResponse(input: string, baseLocation?: { lat: number; lng: number; label: string }) {
  const prefs = getUserPreferences();
  const context = parseFindContext(input);
  const nowHour = new Date().getHours();
  const period = nowHour < 11 ? "morning" : nowHour < 15 ? "midday" : nowHour < 19 ? "afternoon" : "evening";
  const vibeLine = pickFindVariation(input);

  const ranked = places
    .filter((p) => {
      const category = p.category;
      const tags = p.tags || [];
      const features = p.features || [];
      const durationMin = parseDurationMinutes(p.estimatedTime);
      const distanceMiles = baseLocation
        ? getDistanceMiles(baseLocation.lat, baseLocation.lng, p.lat, p.lng)
        : parseDistanceMiles(p.distance);

      if (context.vibe === "outdoor" && !OUTDOOR_CATEGORIES.has(category)) return false;
      if (context.vibe === "indoor" && !INDOOR_CATEGORIES.has(category)) return false;
      if (context.vibe === "food" && !FOOD_CATEGORIES.has(category)) return false;

      if (context.social === "date" && !DATE_CATEGORIES.has(category)) return false;
      if (context.social === "group" && !features.includes("group friendly")) return false;

      if (context.budget === "free" && p.price !== "Free") return false;
      if (context.budget === "cheap" && !["Free", "$", "$$"].includes(p.price)) return false;

      if (context.timing === "quick" && durationMin > 70) return false;
      if (context.timing === "now" && distanceMiles > 10) return false;

      if (context.weather === "rainy" && OUTDOOR_CATEGORIES.has(category)) return false;
      if (context.weather === "hot" && category === "Hikes" && durationMin > 120) return false;
      if (context.weather === "cold" && (category === "Beaches" || category === "Water Sports")) return false;

      if (context.effort === "chill" && category === "Hikes" && durationMin > 120) return false;
      if (context.effort === "active" && !["Hikes", "Water Sports", "Gym", "Beaches"].includes(category)) return false;

      if (context.hikeLength === "short" && category === "Hikes" && durationMin > 150) return false;
      if (context.hikeLength === "long" && category === "Hikes" && durationMin < 120) return false;

      if (context.transport === "walk" && distanceMiles > 2.5) return false;
      if (context.transport === "bike" && distanceMiles > 6.5) return false;
      if (context.transport === "bus" && !features.includes("bus available")) return false;
      if (context.transport === "car" && distanceMiles > 25) return false;

      if (context.nearOnly && distanceMiles > 4) return false;

      if (context.wantsSwim && !["Beaches", "Water Sports"].includes(category)) return false;
      if (context.wantsTan && category !== "Beaches") return false;

      if (!mealFits(p.name, tags, context.meal)) return false;

      return true;
    })
    .map((p) => {
      const distanceMiles = baseLocation
        ? getDistanceMiles(baseLocation.lat, baseLocation.lng, p.lat, p.lng)
        : parseDistanceMiles(p.distance);
      const preferenceScore = getPreferenceScore(p, prefs);
      const nearScore = Math.max(0, 10 - distanceMiles * 1.4);
      const timeScore = Math.max(0, 8 - parseDurationMinutes(p.estimatedTime) / 30);
      const ratingScore = p.rating * 1.6;

      let weatherBonus = 0;
      if (!context.weather && period === "evening" && ["Viewpoints", "Beaches", "Live Music", "Food & Treats"].includes(p.category)) weatherBonus += 1.5;
      if (!context.weather && period === "morning" && ["Coffee Shops", "Hikes", "Study Spots"].includes(p.category)) weatherBonus += 1.5;
      if (context.weather === "sunny" && ["Beaches", "Hikes", "Viewpoints", "Parks & Gardens"].includes(p.category)) weatherBonus += 2;
      if (context.weather === "rainy" && INDOOR_CATEGORIES.has(p.category)) weatherBonus += 2;

      const score = preferenceScore * 1.4 + nearScore + timeScore + ratingScore + weatherBonus + Math.random();
      return { place: p, score, distanceMiles };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 4);
  if (!top.length) {
    return {
      text:
        `${vibeLine}\n\nI couldn't find a great fit with all constraints.\n\nTry loosening one of these:\n` +
        "1. Distance range\n2. Budget cap\n3. Indoor/outdoor lock\n\nThen ask: \"find me something quick and cheap\".",
      action: { type: "navigate", path: "/explore", label: "Open Explore" } as NavAction,
      picks: [] as Place[],
    };
  }

  const contextSummary = [
    context.vibe ? `vibe: ${context.vibe}` : null,
    context.budget ? `budget: ${context.budget}` : null,
    context.social ? `social: ${context.social}` : null,
    context.meal ? `meal: ${context.meal}` : null,
    context.hikeLength ? `hike: ${context.hikeLength}` : null,
    context.weather ? `weather: ${context.weather}` : null,
  ].filter(Boolean);

  const lines = top.map((entry, idx) => {
    const p = entry.place;
    const distance = baseLocation ? `${entry.distanceMiles.toFixed(1)} miles` : p.distance;
    return `${idx + 1}. ${getPlaceEmoji(p)} ${p.name} (${p.category} · ${p.price} · ${distance})`;
  });

  const followups = [
    "Want me to narrow this to one final pick?",
    "Say yes and I’ll lock one based on least travel time.",
    "I can switch this to a cheaper or more social version.",
    "Want a version optimized for studying later too?",
  ];
  const followup = followups[Math.floor(Math.random() * followups.length)];

  return {
    text:
      `${vibeLine}\n\n` +
      `Best options for ${period}${contextSummary.length ? ` (${contextSummary.join(" · ")})` : ""}:\n\n` +
      `${lines.join("\n")}\n\n${followup}`,
    action: { type: "navigate", path: "/explore", label: "Open Explore" } as NavAction,
    picks: top.map((x) => x.place),
  };
}

function buildFollowUpFromMemory(memory: RecommendationMemory, input: string) {
  const q = normalizeInput(input);

  const optionMatch = q.match(/\b(?:option\s*)?([1-5])\b/);
  if (optionMatch) {
    const idx = Number(optionMatch[1]) - 1;
    const pick = memory.picks[idx];
    if (pick) {
      return {
        text:
          `Good pick.\n\n${getPlaceEmoji(pick)} ${pick.name}\n` +
          `${pick.subcategory || pick.category} · ${pick.price} · ${pick.distance}\n\n` +
          `${pick.description}\n\nWant me to suggest a backup option too?`,
        action: { type: "navigate", path: `/event/${pick.id}`, label: "View Details" } as NavAction,
        memory,
      };
    }
  }

  if (/(best one|top one|which one should i pick|which one is best)/.test(q) && memory.picks.length > 0) {
    const top = memory.picks[0];
    return {
      text:
        `Go with this one:\n\n1. ${getPlaceEmoji(top)} ${top.name} (${top.subcategory || top.category} · ${top.price} · ${top.distance})\n\n` +
        `Reason: best overall fit from your last filters.\nWant me to give a cheaper backup too?`,
      action: { type: "navigate", path: `/event/${top.id}`, label: "Open Top Pick" } as NavAction,
      memory,
    };
  }

  const mergedPrompt = `${memory.seedPrompt}. ${input}`;

  if (memory.kind === "food") {
    const food = buildFoodIntentResponse(mergedPrompt);
    if (food) {
      return {
        text: food.text,
        action: food.action,
        memory: {
          ...memory,
          seedPrompt: mergedPrompt,
          picks: food.picks,
          updatedAt: Date.now(),
        } as RecommendationMemory,
      };
    }
  }

  const rec = buildFindSomethingResponse(mergedPrompt, memory.baseLocation);
  return {
    text: rec.text,
    action: rec.action,
    memory: {
      kind: "find",
      seedPrompt: mergedPrompt,
      picks: rec.picks,
      baseLocation: memory.baseLocation,
      updatedAt: Date.now(),
    } as RecommendationMemory,
  };
}

// ─── Knowledge Base (rewritten with PolyJarvis personality) ─────────────────
const sloKnowledge: { keywords: string[]; response: string; action?: NavAction; jarvisActions?: JarvisAction[] }[] = [
  // Nav intents
  { keywords: ["take me to explore", "go to explore", "show explore", "open explore"], response: "On it. Taking you to Explore.", action: { type: "navigate", path: "/explore", label: "Open Explore" } },
  { keywords: ["take me to events", "my events", "show events"], response: "Pulling up your events.", action: { type: "navigate", path: "/myevents", label: "My Events" } },
  { keywords: ["take me home", "go home", "dashboard"], response: "Heading home.", action: { type: "navigate", path: "/dashboard", label: "Go Home" } },

  // Plan creation
  {
    keywords: ["plan a trip", "plan a day", "help me plan", "make a plan", "make me a plan", "create a plan"],
    response: "Let's build something.\n\nI'll set up a day plan for you. Want to pull in spots from Explore or invite your Jams crew?",
    jarvisActions: [
      { type: "plan", label: "Start a Plan" },
      { type: "jam", label: "Add a Jam" },
    ]
  },
  {
    keywords: ["plan beach", "beach trip", "plan pismo"],
    response: "Solid call. Here's a Pismo day:\n\n🕐 10 AM — Pick up crew\n🚗 10:15 — Drive to Pismo (20 min)\n🏖️ 10:45 — Beach time\n🍽️ 12:30 — Splash Cafe chowder\n🌊 2 PM — Walk the pier\n🌅 5 PM — Sunset, head back\n\nNext best move: Lock in who's driving.",
    action: { type: "navigate", path: "/explore?category=Beaches", label: "Browse Beaches" },
    jarvisActions: [{ type: "plan", label: "Import to Plans" }]
  },

  // Pin / save
  {
    keywords: ["pin", "save", "bookmark"],
    response: "Got it. Head to Explore and tap the pin icon on anything you want to save.",
    action: { type: "navigate", path: "/explore", label: "Browse & Pin" },
  },

  // Jam creation
  {
    keywords: ["create jam", "make a jam", "new jam", "start a jam"],
    response: "Let's get a crew together. Head to Jams to set up a name and invite code.",
    action: { type: "navigate", path: "/jams", label: "Create a Jam" },
  },

  // ─── LOCAL KNOWLEDGE (personality-rewritten) ──────────────────────────────

  {
    keywords: ["fun things to do in slo", "fun things to do in san luis obispo", "things to do in slo", "things to do in san luis obispo", "what is slo"],
    response: "SLO stands for San Luis Obispo.\n\nFun things to do:\n\n🏖️ Avila Beach boardwalk + sunset\n🥾 Bishop Peak or Poly Canyon hike\n🌮 Downtown food run (tacos, deli, pizza)\n🎵 Live music at SLO Brew / Fremont\n🥕 Thursday Farmer's Market on Higuera\n\nTell me your vibe (outdoor, food, chill, active) and I’ll narrow this to your top 3.",
    action: { type: "navigate", path: "/explore", label: "Browse SLO Spots" }
  },
  {
    keywords: ["beach", "ocean", "surf"],
    response: "Beach options, sorted by vibe:\n\n🏖️ Avila Beach — warmest, boardwalk shops, 15 min\n🌊 Pismo Beach — pier + clam chowder, 20 min\n🪨 Morro Bay — kayaking + Morro Rock, 25 min\n🐚 Shell Beach — tide pools, quieter, 18 min\n\nAll free. Parking $0-10.\n\nNext best move: Grab sunscreen, leave in 30.",
    action: { type: "navigate", path: "/explore?category=Beaches", label: "Browse Beaches" }
  },
  {
    keywords: ["hike", "hiking", "trail", "bishop peak"],
    response: "SLO hikes — all part of the Nine Sisters morros:\n\n⛰️ Bishop Peak — best 360° views, 3.5mi, steep\n🏔️ Cerro San Luis — the 'M' hill, 3mi, solid sunset\n🌿 Poly Canyon — on campus, 2mi, easy\n🌲 Irish Hills — 4mi loop, fewer people\n\nAll free. Bishop trailhead on Patricia Dr.\n\nNext best move: Bring water, go before 4 PM for golden light.",
    action: { type: "navigate", path: "/explore?category=Hikes", label: "Browse Hikes" }
  },
  {
    keywords: ["coffee", "cafe", "latte"],
    response: "Coffee spots worth knowing:\n\n☕ Scout Coffee — lavender latte, aesthetic, Higuera St\n📚 Kreuzberg — late hours, great for night study\n🌿 Nautical Bean — chill patio, no crowds\n\nScout for vibes. Kreuzberg for function.\n\nNext best move: Pick one and be there in 15 minutes."
  },
  {
    keywords: ["food", "eat", "restaurant", "hungry", "taco", "tri-tip"],
    response: "Here's the SLO food hierarchy:\n\n🥩 Firestone Grill — tri-tip sandwich, the classic ($12)\n🍕 Woodstock's — late night pizza, student staple\n🌮 Taqueria Santa Cruz — tacos for $2-3, best value in town\n🍣 Goshi — solid sushi downtown\n\nBudget move: Thursday Farmer's Market. Free vibes, $5-8 meals.\n\nNext best move: If you're hungry now, Firestone. No debate.",
    action: { type: "navigate", path: "/explore", label: "Browse Food" }
  },
  {
    keywords: ["study", "library"],
    response: "Study spots, matched to your mode:\n\n📚 Kennedy Library — floors 3-5 quiet zones, 4th floor has the best seats\n☕ Scout Coffee — ambient noise + WiFi\n📖 Kreuzberg — open late, solid coffee\n🏛️ Mustang Lounge — UU building, underrated\n\nNext best move: 90 focused minutes, then a walk to reset."
  },
  {
    keywords: ["bus", "transit", "parking", "transport"],
    response: "SLO Transit is free with your Cal Poly ID.\n\n🚌 Route 4 — Campus ↔ Downtown\n🚌 Route 6 — Campus loop\n🚌 Route 12A — Campus ↔ Morro Bay\n\nFree parking: Marsh St Garage (90 min limit).\n\nSLO is Gold-level Bicycle Friendly — biking is usually faster than driving downtown."
  },
  {
    keywords: ["bar", "nightlife", "party"],
    response: "SLO nightlife, the essentials:\n\n🍺 The Library — the college classic, Higuera St\n🍷 Luna Red — craft cocktails, nicer vibe\n🎵 SLO Brew Rock — live music venue\n🍸 Frog & Peach — dive bar energy\n\nAll on or near Higuera. 21+ bring ID.\n\nNext best move: Check who's playing at Fremont or SLO Brew tonight."
  },
  {
    keywords: ["farmers market", "farmer"],
    response: "Thursday night Farmer's Market. Every week.\n\n📅 6-9 PM, Higuera Street\n📍 5 blocks shut down for food, music, people\n🍗 BBQ, produce, crafts, live performers\n\nBeen a SLO tradition since the 1980s. One of the best in California.\n\nNext best move: Show up around 6:30, walk the whole strip, eat everything."
  },
  {
    keywords: ["history", "mission", "founded"],
    response: "SLO facts worth knowing:\n\n🏛️ Founded September 1, 1772 by Junípero Serra\n⛪ Mission San Luis Obispo de Tolosa — 5th California mission\n🏫 Cal Poly founded 1901\n🌡️ First city in the US to ban indoor smoking (1990)\n🏨 Home of the world's first motel — Milestone Mo-Tel\n👥 Population: ~47,000"
  },
  {
    keywords: ["weather", "temperature", "climate"],
    response: "SLO weather is ridiculous (in a good way).\n\n☀️ ~280 sunny days a year\n🌡️ Summer: 72-80°F\n❄️ Winter: 44-65°F\n🌧️ Rain mostly Nov-Apr, ~22 inches total\n\nBottom line: You can plan outdoor stuff almost any day."
  },
  {
    keywords: ["help", "what can you do"],
    response: "Here's what I do:\n\n🥾 Recommend spots — hikes, food, coffee, beaches\n🗺️ Navigate you anywhere in the app\n📋 Build plans and itineraries\n📌 Pin and save places\n👥 Set up Jams (group plans)\n🚌 SLO transit info\n📜 Local history and facts\n\nTry: \"plan a beach trip\" or \"best hikes\""
  },
  {
    keywords: ["hello", "hi", "hey", "yo", "sup", "what's up"],
    response: "Hey. What's the move today?"
  },
  {
    keywords: ["bored", "nothing to do"],
    response: "Good. That means you need novelty, not comfort.\n\nTry:\n🌅 Bishop Peak at sunset\n☕ New coffee shop you haven't tried\n🏖️ Spontaneous beach run\n🎵 Check who's playing at SLO Brew\n🧗 Poly Canyon hike\n\nBreak routine on purpose. That's the reset.\n\nWhat sounds good?"
  },
  {
    keywords: ["stressed", "overwhelmed", "behind", "anxious", "feel behind"],
    response: "Okay. Breathe.\n\nWe're not fixing the semester right now. We're stabilizing the next 2 hours.\n\nHere's the move:\n1. Go somewhere calm — Kennedy quiet floor or SLO Library\n2. Write down exactly 3 tasks\n3. Finish just one\n\nAfter that, short walk around Laguna Lake to reset your head.\n\nYou don't need motivation. You need momentum.\n\nLet's build it."
  },
  {
    keywords: ["rain", "rainy"],
    response: "Rain in SLO is rare. Use it.\n\nIndoor ideas:\n🎬 Palm Theatre indie film\n🔑 Puzzle Effect escape room\n🎨 SLO Museum of Art\n☕ Coffee + reading at Kreuzberg\n\nRain days are for slowing down, not grinding harder."
  },
  {
    keywords: ["cheap", "budget", "free"],
    response: "Free: Every hike, Farmer's Market, beaches, Poly Canyon, Bubblegum Alley\nUnder $10: Tacos at Santa Cruz, Scout coffee, bowling at Mustang Lanes\n\nStudent discounts at most downtown shops. Ask.\n\nNext best move: Pick the free thing that gets you outside."
  },
  {
    keywords: ["thanks", "thank you", "thx"],
    response: "Anytime. Go make it happen."
  },
  {
    keywords: ["bubblegum", "alley"],
    response: "Bubblegum Alley:\n\n📍 733 Higuera Street\n🎨 70+ feet of chewed gum, going since the 1960s\n📸 Weird but iconic photo spot\n💰 Free\n\nSLO rite of passage. Just don't think about it too hard."
  },
  {
    keywords: ["madonna inn"],
    response: "The Madonna Inn:\n\n📍 100 Madonna Road\n🏰 Eccentric landmark since 1958\n🎨 110 uniquely themed rooms\n🍰 Pink champagne cake in the bakery — essential\n\nGreat for photos and their bakery. The men's waterfall urinal is... an experience."
  },
  {
    keywords: ["homework", "assignment", "due", "deadline", "calc", "exam", "test", "midterm", "final"],
    response: "You've got work to handle. Let's make it efficient.\n\nPick your mode:\n📚 Kennedy Library quiet floor — full focus\n☕ Scout Coffee — productive but social\n🌿 Nautical Bean — calm, no distractions\n\nGet 90 focused minutes done. Then reward yourself with something good.\n\nNext best move: Pack up and head to your study spot within 20 minutes."
  },
  {
    keywords: ["no homework", "no assignments", "day off", "free day"],
    response: "That's a gift of a day.\n\nPrime conditions for:\n⛰️ Montaña de Oro Bluff Trail\n🛶 Kayaking in Morro Bay (otters are usually out mid-day)\n🏖️ Pismo Preserve for coastal views\n\nOr something social:\n🥕 Downtown Farmer's Market (if it's Thursday)\n🏖️ Avila Beach boardwalk + ice cream\n\nNext best move: Grab water, leave in 30 minutes, don't waste the sun."
  },
  {
    keywords: ["date", "date idea", "date night", "romantic"],
    response: "Date ideas that actually work:\n\n🌅 Sunset at Bishop Peak — free, impressive\n🍷 Taste wine at Edna Valley — 10 min drive\n🍰 Madonna Inn bakery + downtown walk\n🎬 Sunset Drive-In — double feature, old school\n🌊 Avila Beach sunset + dinner at Custom House\n\nNext best move: Pick one. Don't overthink it."
  },
  {
    keywords: ["different", "new", "unique", "unusual", "weird"],
    response: "You want something different. Respect.\n\nTry:\n✨ Sensorio light field at night (Paso Robles)\n🔑 Escape room downtown\n🐘 Elephant seal viewing at San Simeon\n✈️ Estrella Warbirds Museum (random but cool)\n🏗️ Architecture Graveyard in Poly Canyon\n\nBreak the pattern. That's the move."
  },
];

// ─── Fuzzy matching ─────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

function fuzzyMatch(input: string, target: string): boolean {
  if (input.includes(target)) return true;
  const inputWords = input.split(/\s+/);
  const targetWords = target.split(/\s+/);
  for (const tw of targetWords) {
    if (tw.length < 3) { if (input.includes(tw)) continue; else return false; }
    let found = false;
    for (const iw of inputWords) {
      const maxDist = iw.length <= 4 ? 1 : 2;
      if (levenshtein(iw, tw) <= maxDist) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

function findResponse(input: string): { text: string; action?: NavAction; jarvisActions?: JarvisAction[] } {
  const lower = normalizeInput(input);
  const navWords = lower.split(/\s+/);

  if (/(^|\s)(indoor|inside)(\s|$)/.test(lower)) {
    const rec = buildIndoorRecommendations();
    return { text: rec.text, action: rec.action };
  }

  const foodIntentResponse = buildFoodIntentResponse(input);
  if (foodIntentResponse) {
    return { text: foodIntentResponse.text, action: foodIntentResponse.action };
  }

  // Navigation intents (fuzzy)
  const hasNavIntent = navWords.some(w => ["take", "go", "open", "navigate", "tke", "goo", "opne", "naviage"].some(n => levenshtein(w, n) <= 1)) || lower.includes("take me");
  if (hasNavIntent) {
    if (navWords.some(w => ["explore", "food", "restaurant", "hike", "beach", "explor", "resturant", "beech", "foood"].some(n => levenshtein(w, n) <= 2))) return { text: "On it.", action: { type: "navigate", path: "/explore", label: "Open Explore" } };
    if (navWords.some(w => levenshtein(w, "event") <= 1 || levenshtein(w, "events") <= 1)) return { text: "Pulling up events.", action: { type: "navigate", path: "/myevents", label: "My Events" } };
    if (navWords.some(w => levenshtein(w, "home") <= 1 || levenshtein(w, "dashboard") <= 2)) return { text: "Heading home.", action: { type: "navigate", path: "/dashboard", label: "Go Home" } };
    if (navWords.some(w => levenshtein(w, "plan") <= 1 || levenshtein(w, "plans") <= 1)) return { text: "Opening Plans.", action: { type: "navigate", path: "/plans", label: "My Plans" } };
    if (navWords.some(w => ["jam", "jams", "group", "crew"].some(n => levenshtein(w, n) <= 1))) return { text: "Opening Jams.", action: { type: "navigate", path: "/jams", label: "Jams" } };
    if (navWords.some(w => ["friend", "friends", "freinds", "freind"].some(n => levenshtein(w, n) <= 2))) return { text: "Opening Friends.", action: { type: "navigate", path: "/friends", label: "Friends" } };
    if (navWords.some(w => levenshtein(w, "profile") <= 2)) return { text: "Opening Profile.", action: { type: "navigate", path: "/profile", label: "Profile" } };
  }

  // Fuzzy keyword matching against knowledge base
  const sorted = [...sloKnowledge].sort((a, b) => Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length)));
  for (const entry of sorted) {
    for (const keyword of entry.keywords) {
      if (fuzzyMatch(lower, keyword)) return { text: entry.response, action: entry.action || undefined, jarvisActions: entry.jarvisActions };
    }
  }

  // Personalized recommendations
  if (navWords.some(w => ["best", "recommend", "reccomend", "recomend", "reccommend", "suggest", "for me", "my style"].some(n => levenshtein(w, n) <= 2))) {
    const prefs = getUserPreferences();
    if (prefs.hasTrainingData) {
      const scored = places.map(p => ({
        ...p,
        score: getPreferenceScore(p, prefs),
      })).sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 4);
      const lines = top.map(p => `⚡ ${getPlaceEmoji(p)} ${p.name} — ${p.score}/10 · ${p.price} · ${p.category}`);
      return {
        text: `Based on what I know about you:\n\n${lines.join("\n")}\n\nHead to Explore → "For You" for the full list.\n\nNext best move: Pick the top one and go.`,
        action: { type: "navigate", path: "/explore", label: "Browse Explore" },
      };
    }
    const personalRec = getPersonalizedRecommendation(prefs);
    if (personalRec) return { text: personalRec, action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
    return { text: "What are you in the mood for? Food, coffee, hikes, beaches?\n\nTip: Train me in Profile for personalized picks." };
  }

  // "Surprise me" / random
  if (navWords.some(w => ["surprise", "random", "anything", "whatever"].some(n => levenshtein(w, n) <= 1))) {
    const prefs = getUserPreferences();
    if (prefs.hasTrainingData) {
      const scored = places.map(p => ({
        ...p,
        score: getPreferenceScore(p, prefs),
      })).sort((a, b) => b.score - a.score);
      const topPool = scored.filter(s => s.score >= 7);
      const picks = topPool.length >= 3
        ? topPool.sort(() => Math.random() - 0.5).slice(0, 3)
        : scored.slice(0, 3);
      const lines = picks.map(p => `⚡ ${getPlaceEmoji(p)} ${p.name} — ${p.score}/10 · ${p.price}`);
      return {
        text: `Here's the move:\n\n${lines.join("\n")}\n\nPick one. Don't overthink it.`,
        action: { type: "navigate", path: "/explore", label: "Browse Explore" },
      };
    }
    return { text: "Here's the move:\n\n🌅 Bishop Peak at sunset\n🌮 Tacos at Taqueria Santa Cruz\n☕ Chill session at Scout Coffee\n\nPick one. Go.\n\nTrain me in Profile for better picks.", action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
  }

  // Catch-all
  if (lower.match(/\?$/)) return { text: "Not sure about that one. Try: hikes, food, beaches, or say \"help\" to see what I can do." };
  return { text: "I don't have that one yet. Try asking about food, hikes, coffee, beaches — or say \"help\" for the full list." };
}

// ─── Chat persistence helpers ───────────────────────────────────────────────
function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* noop */ }
  return [];
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    // Keep last 100 messages to avoid localStorage bloat
    const trimmed = msgs.slice(-100);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  } catch { /* noop */ }
}

function loadReservationStatuses(): ReservationStatusRecord[] {
  try {
    const raw = localStorage.getItem(RESERVATION_STATUS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertReservationStatus(next: ReservationStatusRecord) {
  const current = loadReservationStatuses();
  const filtered = current.filter((item) => item.jobId !== next.jobId);
  filtered.unshift(next);
  localStorage.setItem(RESERVATION_STATUS_KEY, JSON.stringify(filtered.slice(0, 25)));
}

export function Jarvis() {
  const navigate = useNavigate();
  const prefs = useMemo(() => getUserPreferences(), []);

  const initialGreeting = useMemo(() => {
    if (prefs.hasTrainingData && prefs.likedPrompts.length > 0) {
      const liked = prefs.likedPrompts.slice(0, 2).map(p => `${p.emoji} ${p.label.toLowerCase()}`).join(" & ");
      return `Hey. I remember you're into ${liked}. What's the move today?`;
    }
    return "Hey. I'm Jarvis — your SLO guide. What's the move?";
  }, [prefs]);

  // Load persisted messages, or start with greeting
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadMessages();
    if (saved.length > 0) return saved;
    return [{ role: "assistant", text: initialGreeting, timestamp: Date.now() }];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [awaitingRebalanceReply, setAwaitingRebalanceReply] = useState(false);
  const [clarification, setClarification] = useState<ClarificationState | null>(null);
  const [recommendationMemory, setRecommendationMemory] = useState<RecommendationMemory | null>(null);
  const [pendingReservation, setPendingReservation] = useState<ReservationDraft | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reservationPollRef = useRef<number | null>(null);
  const reservationPollJobRef = useRef<string>("");
  const reservationFinalNotifiedRef = useRef<Record<string, boolean>>({});

  // Persist messages whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => {
    return () => {
      if (reservationPollRef.current) {
        window.clearInterval(reservationPollRef.current);
        reservationPollRef.current = null;
      }
    };
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 100);
  }, [navigate]);

  const startReservationPolling = useCallback((jobId: string, restaurantName: string) => {
    if (reservationPollRef.current) {
      window.clearInterval(reservationPollRef.current);
      reservationPollRef.current = null;
    }
    reservationPollJobRef.current = jobId;

    const run = () => {
      apiFetch(`/api/agent/call/${jobId}`)
        .then((data) => {
          const job = data?.call_job;
          if (!job) return;

          const status = String(job.status || "").toLowerCase();
          const decision = String(job.reservation_decision || "").toLowerCase();
          upsertReservationStatus({
            jobId,
            restaurantName: job.restaurant_name || restaurantName,
            reservationTime: job.reservation_time || "",
            partySize: Number(job.party_size || 0),
            status,
            decision,
            updatedAt: Date.now(),
          });

          const isFinal =
            decision === "confirmed" ||
            decision === "declined" ||
            decision === "declined-timeout" ||
            status === "reservation-confirmed" ||
            status === "reservation-declined" ||
            status === "reservation-timeout" ||
            status === "failed";

          if (!isFinal || reservationFinalNotifiedRef.current[jobId]) return;

          reservationFinalNotifiedRef.current[jobId] = true;
          let text = `Reservation update for ${job.restaurant_name || restaurantName}: still in progress.`;
          if (decision === "confirmed" || status === "reservation-confirmed") {
            text = `Reservation confirmed at ${job.restaurant_name || restaurantName} for ${job.party_size || "?"} at ${job.reservation_time || "requested time"}.`;
          } else if (decision === "declined" || status === "reservation-declined") {
            text = `Reservation declined by ${job.restaurant_name || restaurantName}. Want me to try a different time?`;
          } else if (decision === "declined-timeout" || status === "reservation-timeout") {
            text = `No confirmation input received from ${job.restaurant_name || restaurantName}. Want me to retry with another time?`;
          } else if (status === "failed") {
            text = `The call to ${job.restaurant_name || restaurantName} failed. ${job.last_error ? `Reason: ${job.last_error}` : ""}`.trim();
          }

          setMessages((prev) => [...prev, { role: "assistant", text, timestamp: Date.now() }]);

          if (reservationPollRef.current && reservationPollJobRef.current === jobId) {
            window.clearInterval(reservationPollRef.current);
            reservationPollRef.current = null;
          }
        })
        .catch(() => {
          // Keep polling; transient errors are common while backend updates call state.
        });
    };

    run();
    reservationPollRef.current = window.setInterval(run, 7000);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const prompt = text.trim();
    const userMsg: ChatMessage = { role: "user", text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    if (pendingReservation) {
      const yes = isYesReply(prompt);
      const no = isNoReply(prompt);

      if (yes) {
        apiFetch("/api/agent/call/start", {
          method: "POST",
          body: {
            restaurant_name: pendingReservation.restaurantName,
            reservation_time: pendingReservation.reservationTime,
            party_size: pendingReservation.partySize,
            special_request: pendingReservation.specialRequest || "",
            group_id: "creator-only",
          },
        })
          .then((data) => {
            const job = data?.call_job;
            setIsTyping(false);
            setPendingReservation(null);
            if (job?.job_id) {
              upsertReservationStatus({
                jobId: job.job_id,
                restaurantName: pendingReservation.restaurantName,
                reservationTime: pendingReservation.reservationTime,
                partySize: pendingReservation.partySize,
                status: String(job?.status || "queued"),
                decision: String(job?.reservation_decision || "pending"),
                updatedAt: Date.now(),
              });
              startReservationPolling(job.job_id, pendingReservation.restaurantName);
            }
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                text: `Calling ${pendingReservation.restaurantName} now.\n\nReservation: ${pendingReservation.partySize} people at ${pendingReservation.reservationTime}.\n\nCall job: ${job?.job_id || "created"} (${job?.status || "started"}).\n\nI'll update you here when it is confirmed or declined.`,
                timestamp: Date.now(),
              },
            ]);
          })
          .catch((error) => {
            setIsTyping(false);
            const errText = error instanceof Error ? error.message : "Could not start reservation call.";
            const authHint = /session token/i.test(errText)
              ? "\n\nYour session expired. Sign in again, then retry."
              : "";
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                text: `I couldn't place the call yet: ${errText}${authHint}`,
                timestamp: Date.now(),
              },
            ]);
          });
        return;
      }

      if (no) {
        const msg = "No problem. I canceled that reservation call draft.";
        const delay = Math.min(260 + msg.length, 650);
        setTimeout(() => {
          setIsTyping(false);
          setPendingReservation(null);
          setMessages((prev) => [...prev, { role: "assistant", text: msg, timestamp: Date.now() }]);
        }, delay);
        return;
      }

      const updatedDraft = applyReservationEdits(pendingReservation, prompt);
      const confirmText = `Updated.\n\nI can call ${updatedDraft.restaurantName} for ${updatedDraft.partySize} at ${updatedDraft.reservationTime}${updatedDraft.specialRequest ? ` (${updatedDraft.specialRequest})` : ""}.\n\nReply YES to place the call, NO to cancel, or send edits (example: "for 4 at 8:30 PM").`;
      const delay = Math.min(260 + confirmText.length, 760);
      setTimeout(() => {
        setIsTyping(false);
        setPendingReservation(updatedDraft);
        setMessages((prev) => [...prev, { role: "assistant", text: confirmText, timestamp: Date.now() }]);
      }, delay);
      return;
    }

    if (isReservationIntent(prompt)) {
      const draft = buildReservationDraft(prompt);
      const reply = draft
        ? `I can call ${draft.restaurantName} and request a reservation for ${draft.partySize} at ${draft.reservationTime}${draft.specialRequest ? ` (${draft.specialRequest})` : ""}.\n\nReply YES to place the call, NO to cancel, or edit details (example: "for 4 at 8:30 PM").`
        : `I can do that. Tell me the place first.\n\nExample: "make me a reservation at Firestone for 2 at 7:30 PM".`;
      const delay = Math.min(260 + reply.length, 760);
      setTimeout(() => {
        setIsTyping(false);
        if (draft) setPendingReservation(draft);
        setMessages((prev) => [...prev, { role: "assistant", text: reply, timestamp: Date.now() }]);
      }, delay);
      return;
    }

    if (awaitingRebalanceReply) {
      const lower = prompt.toLowerCase();
      const yes = isYesReply(prompt);
      const no = isNoReply(prompt);
      const wantsStrict = /strict|stricter|deadline|urgent/.test(lower);
      const wantsLowerStress = /lower stress|less stress|calmer|lighter|balanced/.test(lower);

      if (yes || no || wantsStrict || wantsLowerStress) {
        const followup = no
          ? "Sounds good. Keeping your current plan as-is."
          : wantsStrict
            ? "Stricter deadline mode applied:\n\n1. Keep breaks to 5-10 min\n2. Tackle highest urgency first\n3. Push low-impact tasks to tomorrow\n\nIf you want, I can also make a lower-stress version."
            : "Lower-stress mode applied:\n\n1. Keep 10-15 min buffers between blocks\n2. Limit total focus blocks for today\n3. Protect one recovery block\n\nIf you want, I can make a stricter deadline version too.";

        const delay = Math.min(280 + followup.length, 750);
        setTimeout(() => {
          setIsTyping(false);
          setAwaitingRebalanceReply(false);
          setMessages(prev => [...prev, { role: "assistant", text: followup, timestamp: Date.now() }]);
        }, delay);
        return;
      }

      setAwaitingRebalanceReply(false);
    }

    if (clarification) {
      const updated: ClarificationState = {
        ...clarification,
        vibe: clarification.vibe ?? parseVibeAnswer(prompt) ?? undefined,
        budget: clarification.budget ?? parseBudgetAnswer(prompt) ?? undefined,
        timing: clarification.timing ?? parseTimingAnswer(prompt) ?? undefined,
        social: clarification.social ?? parseSocialAnswer(prompt) ?? undefined,
      };
      const question = nextClarifyingQuestion(updated);
      const finalized = question ? null : buildClarifiedRecommendation(updated);
      const followup = question || finalized!.text;
      const followupAction = finalized?.action;
      const delay = Math.min(260 + followup.length, 720);

      setTimeout(() => {
        setIsTyping(false);
        setClarification(question ? updated : null);
        setMessages(prev => [...prev, { role: "assistant", text: followup, action: followupAction, timestamp: Date.now() }]);
      }, delay);
      return;
    }

    if (recommendationMemory && isRecommendationFollowUp(prompt)) {
      const followup = buildFollowUpFromMemory(recommendationMemory, prompt);
      const delay = Math.min(260 + followup.text.length, 780);
      setTimeout(() => {
        setIsTyping(false);
        setRecommendationMemory(followup.memory);
        setMessages(prev => [...prev, {
          role: "assistant",
          text: followup.text,
          action: followup.action,
          timestamp: Date.now(),
        }]);
      }, delay);
      return;
    }

    const foodIntentDirect = buildFoodIntentResponse(prompt);
    if (foodIntentDirect) {
      const delay = Math.min(260 + foodIntentDirect.text.length, 760);
      setTimeout(() => {
        setIsTyping(false);
        setRecommendationMemory({
          kind: "food",
          seedPrompt: prompt,
          picks: foodIntentDirect.picks,
          updatedAt: Date.now(),
        });
        setMessages(prev => [...prev, {
          role: "assistant",
          text: foodIntentDirect.text,
          action: foodIntentDirect.action,
          timestamp: Date.now(),
        }]);
      }, delay);
      return;
    }

    if (isIndecisiveIntent(prompt)) {
      const response = buildFindSomethingResponse("find me something to do");
      const delay = Math.min(260 + response.text.length, 760);
      setTimeout(() => {
        setIsTyping(false);
        setRecommendationMemory({
          kind: "find",
          seedPrompt: "find me something to do",
          picks: response.picks,
          updatedAt: Date.now(),
        });
        setMessages(prev => [...prev, {
          role: "assistant",
          text: `No stress. I'll pick for you.\n\n${response.text}`,
          action: response.action,
          timestamp: Date.now(),
        }]);
      }, delay);
      return;
    }

    if (/(fun things to do in (slo|san luis obispo)|what is slo)/i.test(prompt)) {
      const response = findResponse(prompt);
      const delay = Math.min(260 + response.text.length, 760);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: "assistant",
          text: response.text,
          action: response.action,
          jarvisActions: response.jarvisActions,
          timestamp: Date.now(),
        }]);
      }, delay);
      return;
    }

    if (isFindSomethingIntent(prompt)) {
      const context = parseFindContext(prompt);
      const hasEnoughContext =
        Boolean(context.vibe) ||
        Boolean(context.budget) ||
        Boolean(context.social) ||
        Boolean(context.meal) ||
        Boolean(context.weather) ||
        Boolean(context.hikeLength) ||
        Boolean(context.timing) ||
        context.wantsSwim ||
        context.wantsTan ||
        context.nearOnly;

      if (context.nearOnly) {
        resolveNearMeBaseLocation().then((base) => {
          const response = buildFindSomethingResponse(prompt, base);
          const delay = Math.min(290 + response.text.length, 820);
          setTimeout(() => {
            setIsTyping(false);
            setRecommendationMemory({
              kind: "find",
              seedPrompt: prompt,
              picks: response.picks,
              baseLocation: base,
              updatedAt: Date.now(),
            });
            setMessages(prev => [...prev, {
              role: "assistant",
              text: response.text,
              action: response.action,
              timestamp: Date.now(),
            }]);
          }, delay);
        });
        return;
      }

      if (!hasEnoughContext && shouldAskClarifyingQuestions(prompt)) {
        const initialState: ClarificationState = { originalPrompt: prompt };
        const question = nextClarifyingQuestion(initialState) || "What vibe are you feeling? For example: outdoor.";
        const delay = Math.min(240 + question.length, 520);
        setTimeout(() => {
          setIsTyping(false);
          setClarification(initialState);
          setMessages(prev => [...prev, { role: "assistant", text: `I can do that. Quick check so I pick better options.\n\n${question}`, timestamp: Date.now() }]);
        }, delay);
        return;
      }

      const response = buildFindSomethingResponse(prompt);
      const delay = Math.min(280 + response.text.length, 800);
      setTimeout(() => {
        setIsTyping(false);
        setRecommendationMemory({
          kind: "find",
          seedPrompt: prompt,
          picks: response.picks,
          updatedAt: Date.now(),
        });
        setMessages(prev => [...prev, {
          role: "assistant",
          text: response.text,
          action: response.action,
          timestamp: Date.now(),
        }]);
      }, delay);
      return;
    }

    if (shouldAskClarifyingQuestions(prompt)) {
      const initialState: ClarificationState = { originalPrompt: prompt };
      const question = nextClarifyingQuestion(initialState) || "What vibe are you feeling? For example: outdoor.";
      const delay = Math.min(240 + question.length, 520);
      setTimeout(() => {
        setIsTyping(false);
        setClarification(initialState);
        setMessages(prev => [...prev, { role: "assistant", text: `I can do that. Quick check so I pick better options.\n\n${question}`, timestamp: Date.now() }]);
      }, delay);
      return;
    }

    if (isNearMeIntent(prompt)) {
      resolveNearMeBaseLocation().then((base) => {
        const response = buildNearMeResponse(base);
        const delay = Math.min(280 + response.text.length, 760);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            role: "assistant",
            text: response.text,
            action: response.action,
            timestamp: Date.now(),
          }]);
        }, delay);
      });
      return;
    }

    const response = findResponse(text);
    const delay = Math.min(300 + response.text.length * 1.2, 800);
    setTimeout(() => {
      setIsTyping(false);
      const botMsg: ChatMessage = {
        role: "assistant",
        text: response.text,
        action: response.action,
        jarvisActions: response.jarvisActions,
        timestamp: Date.now(),
      };
      if (/re-balance this for lower stress or stricter deadline mode/i.test(botMsg.text)) {
        setAwaitingRebalanceReply(true);
      }
      setMessages(prev => [...prev, botMsg]);
    }, delay);
  }, [awaitingRebalanceReply, pendingReservation]);

  const handleSend = () => {
    sendMessage(input);
  };

  const handlePillClick = (pill: string) => {
    sendMessage(pill);
  };

  const handleClarificationChip = (chip: string) => {
    sendMessage(chip.toLowerCase());
  };

  const clearHistory = () => {
    const fresh: ChatMessage[] = [{ role: "assistant", text: initialGreeting, timestamp: Date.now() }];
    setMessages(fresh);
    setClarification(null);
    setRecommendationMemory(null);
    saveMessages(fresh);
    toast.success("Chat cleared");
  };

  const handleJarvisAction = (action: JarvisAction) => {
    switch (action.type) {
      case "plan":
        navigate("/plans");
        toast.success("Opening Plans — build your itinerary.");
        break;
      case "jam":
        navigate("/jams");
        toast.success("Opening Jams — pick your crew.");
        break;
      case "pin":
        navigate("/explore");
        toast.success("Opening Explore — tap the pin icon to save.");
        break;
    }
  };

  // Check if returning with existing history
  const hasHistory = messages.length > 1;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-white/5 to-transparent px-5 pt-2 pb-4 flex-shrink-0">
        <PageHeader />
        <div className="flex items-center gap-3 mt-2">
          <div className="bg-[#F2E8CF]/15 p-2 rounded-full border border-[#F2E8CF]/20">
            <JarvisLogo size={28} className="text-[#F2E8CF]" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span style={{ fontFamily: "'Playfair Display', serif" }}>Jarvis</span>
              <Sparkles size={14} className="text-[#F2E8CF]" />
            </h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F2E8CF] animate-pulse" />
              <span className="text-[10px] text-white/40">SLO expert · Pins, plans & jams</span>
            </div>
          </div>
          {hasHistory && (
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-white/50 active:scale-90 transition-all"
              title="Clear chat history"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={`${idx}-${msg.timestamp || idx}`}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-[#4A6628] text-white rounded-br-sm"
                  : "bg-white/10 text-white/90 border border-white/10 rounded-bl-sm"
              }`}>
                {msg.text}
              </div>
            </div>
            {/* Navigation action */}
            {msg.action && msg.role === "assistant" && (
              <div className="flex justify-start mt-1.5 ml-1">
                <button
                  onClick={() => handleNavigate(msg.action!.path)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-3 py-1.5 rounded-full border border-[#F2E8CF]/20 active:bg-[#F2E8CF]/20 transition-colors"
                >
                  <ExternalLink size={11} /> {msg.action.label}
                </button>
              </div>
            )}
            {/* Jarvis autonomy actions */}
            {msg.jarvisActions && msg.role === "assistant" && (
              <div className="flex gap-1.5 mt-1.5 ml-1 flex-wrap">
                {msg.jarvisActions.map((ja, jaIdx) => (
                  <button
                    key={jaIdx}
                    onClick={() => handleJarvisAction(ja)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-white/70 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 active:bg-white/15 transition-colors"
                  >
                    {ja.type === "plan" && <ClipboardList size={10} />}
                    {ja.type === "jam" && <Users size={10} />}
                    {ja.type === "pin" && <Pin size={10} />}
                    {ja.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#F2E8CF]/50 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-[#F2E8CF]/50 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-[#F2E8CF]/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating prompt pills marquee — only shown on fresh conversations */}
      {messages.length <= 2 && (
        <div className="flex-shrink-0 overflow-hidden py-2">
          <div className="flex mb-1.5">
            <div className="flex gap-1.5 shrink-0" style={{ animation: "jarvis-scroll-left 55s linear infinite" }}>
              {[...promptPills, ...promptPills].map((pill, i) => (
                <button key={`a-${i}`} onClick={() => handlePillClick(pill)}
                  className="bg-white/10 backdrop-blur-sm text-white/70 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/15 whitespace-nowrap active:bg-[#F2E8CF]/15 active:text-[#F2E8CF] active:border-[#F2E8CF]/20 transition-colors"
                >{pill}</button>
              ))}
            </div>
          </div>
          <div className="flex">
            <div className="flex gap-1.5 shrink-0" style={{ animation: "jarvis-scroll-right 60s linear infinite" }}>
              {[...promptPills].reverse().concat([...promptPills].reverse()).map((pill, i) => (
                <button key={`b-${i}`} onClick={() => handlePillClick(pill)}
                  className="bg-white/8 backdrop-blur-sm text-white/50 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap active:bg-[#F2E8CF]/15 active:text-[#F2E8CF] active:border-[#F2E8CF]/20 transition-colors"
                >{pill}</button>
              ))}
            </div>
          </div>
          <style>{`
            @keyframes jarvis-scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes jarvis-scroll-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
          `}</style>
        </div>
      )}

      {/* Input */}
      {clarification && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
          {clarificationOptions(clarification).map((option) => (
            <button
              key={option}
              onClick={() => handleClarificationChip(option)}
              className="whitespace-nowrap bg-[#F2E8CF]/10 text-[#F2E8CF] border border-[#F2E8CF]/20 rounded-full px-3 py-1.5 text-[11px] font-bold active:scale-95 transition-transform"
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <div className="p-3 bg-black/40 backdrop-blur-xl border-t border-white/10 flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Ask Jarvis anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#F2E8CF]/30 border border-white/15"
        />
        <button onClick={handleSend} className="bg-[#F2E8CF] text-[#1a2e10] p-2.5 rounded-full shadow-lg shadow-[#F2E8CF]/15 active:scale-90 transition-transform">
          <Send size={18} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
