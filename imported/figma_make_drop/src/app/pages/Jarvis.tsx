import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Send, ExternalLink, Sparkles, Pin, Users, ClipboardList, RotateCcw, Zap, UtensilsCrossed, Calendar, Clock, MapPin, Check, ChevronRight, Menu } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { JarvisLogo } from "../components/JarvisLogo";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";
import { getUserPreferences, getPersonalizedRecommendation, getPreferenceScore } from "../utils/preferences";
import { places } from "../data/places";

const MESSAGES_KEY = "polyjarvis_chat_history";
const JAMS_KEY = "polyjarvis_jams";
const CONVERSATIONS_KEY = "polyjarvis_conversations";
const IMPLICIT_PREFS_KEY = "polyjarvis_implicit_prefs";

// ─── Implicit preference logging ────────────────────────────────────────────
interface ImplicitPrefs {
  topics: Record<string, number>;
  lastAsked: string[];
  favoriteCategory?: string;
  timeOfDay: Record<string, number>;
}

function getImplicitPrefs(): ImplicitPrefs {
  try {
    const raw = localStorage.getItem(IMPLICIT_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { topics: {}, lastAsked: [], timeOfDay: {} };
}

function logImplicitPref(query: string) {
  const prefs = getImplicitPrefs();
  const lower = query.toLowerCase();
  const hour = new Date().getHours();
  const tod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  prefs.timeOfDay[tod] = (prefs.timeOfDay[tod] || 0) + 1;

  const topicMap: Record<string, string[]> = {
    food: ["food", "eat", "hungry", "dinner", "lunch", "restaurant", "brunch", "breakfast"],
    tacos: ["taco", "mexican", "burrito"],
    pizza: ["pizza", "italian"],
    sushi: ["sushi", "asian", "japanese", "ramen", "pho", "thai", "chinese"],
    coffee: ["coffee", "cafe", "latte", "espresso", "matcha"],
    beach: ["beach", "ocean", "surf", "pismo", "avila", "shell"],
    hiking: ["hike", "hiking", "trail", "bishop", "peak", "cerro"],
    nightlife: ["bar", "nightlife", "party", "drinks", "cocktail"],
    study: ["study", "library", "homework", "exam", "assignment"],
    budget: ["cheap", "budget", "free", "affordable", "broke"],
    datenight: ["date", "romantic", "fancy"],
    outdoors: ["sunset", "sunrise", "nature", "park", "outdoor"],
    music: ["music", "concert", "show", "live music"],
    dessert: ["dessert", "ice cream", "cake", "sweet"],
    wellness: ["yoga", "gym", "workout", "wellness", "fitness"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(k => lower.includes(k))) {
      prefs.topics[topic] = (prefs.topics[topic] || 0) + 1;
    }
  }

  prefs.lastAsked = [query, ...prefs.lastAsked].slice(0, 10);
  const sorted = Object.entries(prefs.topics).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) prefs.favoriteCategory = sorted[0][0];
  localStorage.setItem(IMPLICIT_PREFS_KEY, JSON.stringify(prefs));
}

function getJarvisVibe(): string {
  try {
    const raw = localStorage.getItem("polyjarvis_customize");
    if (raw) { const c = JSON.parse(raw); return c.jarvisVibe || "chill"; }
  } catch {}
  return "chill";
}

function getContextualPrefix(): string {
  const hour = new Date().getHours();
  const ip = getImplicitPrefs();
  const top = ip.favoriteCategory;
  const vibe = getJarvisVibe();

  // Personality-flavored prefixes
  if (vibe === "hype") {
    if (hour < 9) return "LET'S GO EARLY! ";
    if (hour >= 22) return "LATE NIGHT MOVES! ";
    if (hour >= 17 && top === "food") return "DINNER TIME BABY! ";
    return "";
  }
  if (vibe === "sarcastic") {
    if (hour < 9) return "Oh look who's up early. ";
    if (hour >= 22) return "Making great life decisions at this hour, I see. ";
    if (hour >= 17) return "Dinner time already? Shocking. ";
    return "";
  }

  // Default "chill" personality
  if (hour < 9) return "Early bird move. ";
  if (hour >= 22) return "Late night vibes. ";
  if (hour >= 17 && top === "food") return "Dinner o'clock. ";
  if (top === "coffee" && hour < 12) return "Coffee time — I know you. ";
  if (top === "hiking" && hour >= 14 && hour < 18) return "Perfect hiking window. ";
  if (top === "beach") return "Beach brain activated. ";
  return "";
}

function saveConvo(msgs: ChatMessage[]) {
  if (msgs.length <= 1) return;
  try {
    const existing = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]");
    const convo = { id: Date.now(), messages: msgs.slice(0, 30), date: new Date().toISOString() };
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([convo, ...existing].slice(0, 15)));
  } catch {}
}

function loadConvos(): { id: number; messages: ChatMessage[]; date: string }[] {
  try { return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || "[]"); } catch { return []; }
}

const promptPills = [
  "Best tacos near campus?",
  "Plan a beach trip",
  "Where to study tonight?",
  "Recommend for me",
  "Free things to do",
  "Sunset hike spots",
  "I'm bored",
  "I'm stressed",
  "Live music this week",
  "Surprise me!",
  "What do you know about me?",
  "How many places do you know?",
  "Help",
  "Cheap date ideas",
];

const quickActions = [
  { label: "Start a Plan", prompt: "make me a plan" },
  { label: "Start a Jam", prompt: "start a jam" },
  { label: "Train Jarvis", prompt: "" },
  { label: "Dine Bot", prompt: "recommend food" },
];

type NavAction = { type: "navigate"; path: string; label: string } | null;

interface PlanTemplate {
  name: string;
  icon: string;
  type: "trip" | "daily" | "event";
  events: { name: string; location?: string; time?: string; icon?: string }[];
}

interface JarvisAction {
  type: "pin" | "jam" | "plan" | "createJam";
  label: string;
  data?: any;
  planTemplate?: PlanTemplate;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  action?: NavAction;
  jarvisActions?: JarvisAction[];
  timestamp?: number;
  friendPicker?: boolean;
  jamCreated?: { id: string; name: string };
}

// ─── Conversational Jam State Machine ────────────────────────────────────────
type JamFlowStep = null | "awaiting_friends" | "awaiting_name" | "awaiting_type" | "awaiting_datetime" | "awaiting_spot" | "confirm";

interface JamFlowState {
  step: JamFlowStep;
  friends: string[];
  name: string;
  type: "locked" | "voting";
  date: string;
  time: string;
  spots: { name: string; placeId?: string }[];
}

const emptyJamFlow: JamFlowState = {
  step: null,
  friends: [],
  name: "",
  type: "locked",
  date: "",
  time: "",
  spots: [],
};

const availableFriends = [
  { name: "Alex", status: "Hiking Bishop Peak", emoji: "🌿", available: true },
  { name: "Emma", status: "Library grind", emoji: "📚", available: false },
  { name: "Jake", status: "Scout Coffee", emoji: "☕", available: true },
  { name: "Sarah", status: "Beach day!", emoji: "🏖️", available: true },
  { name: "Marcus", status: "Do not disturb", emoji: "🔒", available: false },
];

// ─── Deep Dine Bot Knowledge Base ───────────────────────────────────────────
const dineKnowledge: { keywords: string[]; response: string; action?: NavAction }[] = [
  {
    keywords: ["taco", "tacos", "mexican"],
    response: "Taco time. Here's the hierarchy:\n\n🌮 Taqueria Santa Cruz — $2-3 street tacos, best value in town. Al pastor is the move.\n🌯 Lalo's — burritos the size of your forearm. Cali burrito is legendary.\n🥑 Cali's West — late night drunk food, solid breakfast burritos too.\n🌮 Pepe Delgado's — sit-down Mexican, great margs.\n\nBudget pick: Santa Cruz. Always.\nBest margarita: Pepe Delgado's.\n\nNext best move: Go to Santa Cruz right now. No debate.",
  },
  {
    keywords: ["pizza", "italian"],
    response: "Pizza in SLO:\n\n🍕 Woodstock's — THE student pizza. Late night slices, huge menu. Cal Poly institution.\n🍕 Cugini's — pan pizza, better quality than Woodstock's if you're not in a rush.\n🍝 Café Roma — actual Italian, pasta is great. Date night material.\n🍕 Upper Crust Trattoria — upscale pizza, downtown.\n🍕 Pizza Solo — hidden gem, delivery focused.\n\nLate night: Woodstock's. Quality: Cugini's. Date: Café Roma.",
  },
  {
    keywords: ["sushi", "asian", "japanese", "chinese", "thai", "pho", "ramen", "noodle"],
    response: "Asian food in SLO:\n\n🍣 Goshi — best sushi downtown, fresh fish, good happy hour\n🍜 Raku Ramen — legit ramen, rich broth\n🥡 Thai Classic — solid pad thai and curries, big portions\n🍜 Pho SLO — when you need a warm bowl\n🥟 Mandarin Gourmet — Chinese done well, family-run\n🍣 Yanagi — sushi + izakaya vibe, sit at the bar\n\nCraving ramen? Raku. Sushi date? Goshi. Comfort food? Pho SLO.",
  },
  {
    keywords: ["burger", "burgers", "fries"],
    response: "Burgers in SLO:\n\n🍔 Firestone Grill — tri-tip burger with BBQ sauce. Unreal.\n🍔 Sylvester's Burgers — old school, great fries\n🍔 Eureka! — craft burgers, beer selection\n🍔 High St. Deli — not technically a burger joint but their sandwiches compete\n\nClassic: Firestone. Best fries: Sylvester's. Fancy: Eureka!",
  },
  {
    keywords: ["brunch", "breakfast", "morning", "pancake", "waffle"],
    response: "Brunch spots worth knowing:\n\n🥞 Sally Loo's — THE brunch spot. Locally sourced, outdoor patio, weekend vibes\n🥑 Novo — waterfall patio, great benedicts, mimosa pitchers\n🍳 Big Sky — best breakfast burritos, cash only\n☕ Louisa's Place — classic diner, huge portions\n🥐 Madonna Inn Bakery — pink champagne cake at 8 AM? Yes.\n\nWeekend brunch: Sally Loo's (go early, line gets long). Quick breakfast: Big Sky.",
  },
  {
    keywords: ["seafood", "fish", "chowder", "clam"],
    response: "Seafood in SLO County:\n\n🦪 Splash Cafe — clam chowder in a bread bowl. THE Pismo classic ($12)\n🐟 Olde Port Inn — right on the water in Avila, fresh catch daily\n🦐 Embarco — Morro Bay waterfront, oysters + fish tacos\n🦀 Windows on the Water — high-end, Morro Bay views\n🐚 Giovanni's Fish Market — Morro Bay, get it to go\n\nBread bowl chowder: Splash Cafe. Nice dinner: Windows on the Water.",
  },
  {
    keywords: ["cheap", "budget", "under 10", "affordable", "broke"],
    response: "Eating well on a budget:\n\n💰 Under $5:\n• Taqueria Santa Cruz tacos ($2-3)\n• In-N-Out burger combo ($5)\n• Costco hot dog + drink ($1.50)\n\n💰 Under $10:\n• Big Sky breakfast burrito ($8)\n• Firestone tri-tip sandwich ($12... ok slight over but worth it)\n• Woodstock's lunch special ($8)\n• Thai Classic lunch combo ($9)\n\n💰 Free food:\n• Thursday Farmer's Market samples\n• Campus events (check Cal Poly events page)\n\nRealest budget move: cook at home + splurge once a week.",
  },
  {
    keywords: ["coffee", "cafe", "latte", "espresso", "matcha"],
    response: "Coffee spots ranked by vibe:\n\n☕ Scout Coffee — lavender latte, aesthetic, Higuera St. Best vibes.\n📚 Kreuzberg — open late, eclectic, art shows. Night study essential.\n🌿 Nautical Bean — chill patio, no laptop crowd. Peaceful.\n☕ Blackhorse Espresso — drive-thru, fast, solid\n🍵 Boba Love — for bubble tea cravings\n\nFor studying: Kreuzberg. For Instagram: Scout. For speed: Blackhorse.",
  },
  {
    keywords: ["dessert", "sweet", "ice cream", "cake", "pastry", "bakery"],
    response: "Sweet tooth guide:\n\n🍰 Madonna Inn Bakery — pink champagne cake, 10/10\n🍦 Doc Burnstein's — local ice cream, creative flavors\n🧁 SLO Donut Company — fresh donuts, get there early\n🍪 Brown Butter Cookie Company — salted brown butter cookie is the move\n🎂 Kreuzberg — they have solid pastries too\n\nMust-try: Madonna Inn pink champagne cake. SLO rite of passage.",
  },
  {
    keywords: ["date", "romantic", "fancy", "nice dinner", "special"],
    response: "Date night restaurants:\n\n🍷 Novo — waterfall patio, global tapas, romantic lighting. #1 date spot.\n🥩 Buona Tavola — Italian fine dining, pasta made in-house\n🍣 Goshi — sushi bar, intimate, great sake\n🌊 Windows on the Water — waterfront in Morro Bay, sunset views\n🍷 Luna Red — craft cocktails, small plates, downtown\n\nFirst date: Novo. Anniversary: Buona Tavola. Impress someone: Windows on the Water.",
  },
  {
    keywords: ["late night", "midnight", "late", "2am", "after hours"],
    response: "Late night food:\n\n🍕 Woodstock's — open late, delivery available\n🌮 Cali's West — late night Mexican\n🍔 In-N-Out — open til 1:30 AM\n☕ Kreuzberg — open late for coffee + snacks\n🍗 Wingstop — delivers late\n\nThe SLO late night meta: Woodstock's pizza or In-N-Out. That's it.",
  },
  {
    keywords: ["healthy", "vegan", "vegetarian", "salad", "bowl"],
    response: "Healthy eating in SLO:\n\n🥗 Bliss Café — vegan/vegetarian, amazing bowls and smoothies\n🥑 Sally Loo's — locally sourced, health-conscious menu\n🥙 Urbane Café — build-your-own sandwiches + salads\n🍃 Kona's Deli — hearty but clean, surfboard decor\n🥤 Nautical Bean — good smoothies + acai bowls\n\nBest bowl: Bliss Café. Best smoothie: Nautical Bean.",
  },
  {
    keywords: ["wine", "winery", "tasting"],
    response: "Wine tasting in SLO County:\n\n🍷 Edna Valley — 10 min from campus, dozens of wineries\n🍷 Paso Robles — 30 min north, world-class reds\n🍷 Talley Vineyards — Arroyo Grande, beautiful setting\n🍷 Tolosa Winery — right in SLO, easy trip\n🍷 Claiborne & Churchill — dry Riesling, Edna Valley\n\nStarter move: Tolosa (closest). Weekend trip: Paso Robles wine trail.\n\nTip: Many offer student discounts. Ask!",
  },
  {
    keywords: ["beer", "brewery", "craft"],
    response: "Breweries in SLO:\n\n🍺 SLO Brew Rock — taproom + live music venue\n🍺 Liquid Gravity — newer, great IPAs\n🍺 BarrelHouse Brewing — huge outdoor space in Paso\n🍺 Figueroa Mountain — Santa Barbara roots, SLO taproom\n🍺 Central Coast Brewing — downtown, chill vibe\n\nFor vibes: SLO Brew Rock. For beer nerds: Liquid Gravity.",
  },
  {
    keywords: ["bbq", "barbecue", "tri-tip", "tri tip"],
    response: "BBQ in SLO County:\n\n🥩 Firestone Grill — THE tri-tip sandwich. Central Coast legend. $12 and worth every penny.\n🥩 The Rib Line — legit BBQ, great ribs and brisket\n🥩 Jocko's Steakhouse (Nipomo) — old school steak house, $$ but iconic\n🥩 Central Coast BBQ — solid pulled pork\n\nIf you only try one: Firestone tri-tip sandwich. Period.",
  },
  {
    keywords: ["sandwich", "deli", "sub"],
    response: "Sandwich spots:\n\n🥪 High St. Deli — the Godfather is legendary. Cash only. Go early, line is long.\n🥪 Gus's Grocery — huge sandwiches, old school deli\n🥪 Lincoln Market & Deli — Higuera St, great lunch spot\n🥪 Firestone Grill — their tri-tip sandwich is technically a sandwich, right?\n\nHidden gem: High St. Deli Godfather. You'll thank me.",
  },
  {
    keywords: ["grocery", "market", "cook", "cooking"],
    response: "Grocery shopping in SLO:\n\n🛒 Trader Joe's — on Foothill Blvd, closest to campus\n🛒 Ralphs — Los Osos Valley Rd, good selection\n🛒 Smart & Final — bulk buying, good for hosting\n🛒 New Frontiers — natural/organic, pricier but quality\n🛒 Costco — off Tank Farm Rd, membership needed\n\nBudget move: Trader Joe's + Thursday Farmer's Market for produce.",
  },
  {
    keywords: ["poke", "acai", "bowl"],
    response: "Bowl spots in SLO:\n\n🥣 Bliss Cafe — best acai bowls in town, vegan-friendly\n🐟 Poke Tiki — fresh poke bowls, customizable\n🥑 Nautical Bean — good acai + smoothie bowls\n🍜 Raku Ramen — technically a bowl... a great one\n\nAcai: Bliss Cafe. Poke: Poke Tiki. Both are excellent.",
  },
];

// ─── Knowledge Base (rewritten with PolyJarvis personality) ─────────────────
const sloKnowledge: { keywords: string[]; response: string; action?: NavAction; jarvisActions?: JarvisAction[] }[] = [
  // Nav intents
  { keywords: ["take me to explore", "go to explore", "show explore", "open explore"], response: "On it. Taking you to Explore.", action: { type: "navigate", path: "/explore", label: "Open Explore" } },
  { keywords: ["take me to events", "my events", "show events"], response: "Pulling up your events.", action: { type: "navigate", path: "/myevents", label: "My Events" } },
  { keywords: ["take me home", "go home", "dashboard"], response: "Heading home.", action: { type: "navigate", path: "/dashboard", label: "Go Home" } },

  // Plan creation
  {
    keywords: ["plan a trip", "plan a day", "help me plan", "make a plan", "make me a plan", "create a plan", "plan an event", "plan something"],
    response: "Let's build something.\n\nI'll create a day plan for you. Hit 'Start a Plan' and I'll set it up — then you can customize times, add people, and pick spots from Explore.\n\nOr invite your crew first with a Jam.",
    jarvisActions: [
      { type: "plan", label: "Start a Plan" },
      { type: "jam", label: "Start a Jam" },
    ]
  },
  {
    keywords: ["plan beach", "beach trip", "plan pismo", "pismo plan", "pismo beach plan", "pismo student", "pismo friendly", "pismo day"],
    response: "Pismo is always a good call. Let me walk you through a full day.\n\nFirst up, you'll want to figure out transportation. Zipcar from Grand Ave is the easiest if no one has a car. About a 20-minute drive down the 101.\n\nOnce you're there, head straight to the pier. It's free, and the views are worth the walk to the end. Spend about an hour there.\n\nFor lunch, you're going to Splash Cafe. Period. Get the bread bowl clam chowder — it's a Central Coast institution. Budget about $15.\n\nAfter lunch, walk the boardwalk south toward Shell Beach. Great photo spots and tide pools if the tide is low.\n\nLate afternoon, grab a drink at Pismo Brewing or just chill on the sand until golden hour.\n\nHead back around 5-6 PM to beat traffic.\n\nTotal budget: ~$30-40 per person including gas split.\n\nReady to lock this in? I'll create the plan for you.",
    action: { type: "navigate", path: "/explore?category=Beaches", label: "Browse Beaches" },
    jarvisActions: [{ type: "plan", label: "Create Pismo Plan" }]
  },
  {
    keywords: ["morro bay plan", "morro plan", "morro bay trip", "plan morro"],
    response: "Morro Bay is a vibe. Here's how to do it right.\n\nDrive up the 1 — about 25 minutes from campus. Park near the Embarcadero (free spots if you go early, otherwise $5-10).\n\nFirst stop: walk along the Embarcadero with Morro Rock in the background. Amazing photo ops.\n\nRent kayaks from Rock Kayak Company (~$20/hr). Paddle around the harbor, you might see otters and seals.\n\nFor food, hit Giovanni's Fish Market for fresh fish tacos, or sit down at Windows on the Water if you want to treat yourself.\n\nAfter eating, walk out to the rock itself. Can't climb it (it's protected), but the beach around it is beautiful.\n\nHead back through Los Osos if you want — there's a cool cafe called Celia's Garden.\n\nTotal: about $40-60 depending on food choices.\n\nWant me to build this plan?",
    jarvisActions: [{ type: "plan", label: "Create Morro Bay Plan" }]
  },
  {
    keywords: ["avila plan", "avila trip", "avila beach plan", "plan avila"],
    response: "Avila Beach is the closest and warmest beach option. About 15 minutes from campus.\n\nPark at the free lot on Avila Beach Drive (gets full by 11 AM on weekends, so go early).\n\nStart at the boardwalk — there's shops, ice cream, and a great view. Walk the whole thing, it's short and sweet.\n\nIf you want something unique, hike the Bob Jones Trail from the parking area. It's a flat, easy 2.5-mile path along the creek. Great for bikes too.\n\nFor food, Custom House has solid fish & chips right on the water. Or go casual with a burger from Mr. Rick's.\n\nBonus: the Avila Hot Springs are just up the road ($12 entry). Perfect after a beach day.\n\nTotal: $15-30 per person.\n\nWant me to create this plan?",
    jarvisActions: [{ type: "plan", label: "Create Avila Plan" }]
  },

  {
    keywords: ["paso robles plan", "paso plan", "paso trip", "plan paso", "paso robles trip", "paso wine"],
    response: "Paso Robles is wine country paradise, about 30 minutes north on the 101. You can easily spend a full day there.\n\nLeave campus around 10 AM. Take the 101 North straight up — it's a beautiful drive through the rolling hills.\n\nFirst stop should be downtown Paso. The town square is charming and walkable. Grab coffee at Spearhead Coffee before you start tasting.\n\nFor wine, start at Eberle Winery — they have free tastings and cave tours. Then hit Tablas Creek or Justin Vineyards if you want something more upscale.\n\nLunch at The Hatch Rotisserie in town. Solid food, great portions. Budget about $15-20 per person.\n\nAfternoon, do one more winery — BarrelHouse Brewing if you're more of a beer person. They have a massive outdoor space with games and live music on weekends.\n\nHead back by 5 PM to miss traffic. The sunset over the hills on the drive back is incredible.\n\nTotal budget: $50-80 per person depending on tastings.\n\nWant me to build this plan?",
    jarvisActions: [{ type: "plan", label: "Create Paso Plan" }]
  },
  {
    keywords: ["cambria plan", "cambria trip", "plan cambria", "cambria day"],
    response: "Cambria is one of those coastal towns that feels like a secret. About 45 minutes north, past Cayucos and Harmony.\n\nTake Highway 1 the whole way — the drive alone is worth it. Leave by 9 AM so you have a full day.\n\nFirst stop: Moonstone Beach. Walk the boardwalk trail along the bluffs. It's flat, easy, and the views are stunning. Keep an eye out for otters in the kelp beds below.\n\nAfter the walk, head into the village. Cambria's downtown has great little shops and galleries. Robin's Restaurant is the move for lunch — farm-to-table, really good.\n\nIf you're into quirky stuff, drive to Nit Wit Ridge — it's a folk art house built from recycled materials. California Historical Landmark.\n\nOn the way back, stop at the Elephant Seal Rookery in San Simeon. It's free and absolutely wild to see hundreds of elephant seals on the beach.\n\nTotal: $30-50 per person.\n\nReady to lock this in?",
    jarvisActions: [{ type: "plan", label: "Create Cambria Plan" }]
  },
  {
    keywords: ["cayucos plan", "cayucos trip", "plan cayucos", "cayucos day"],
    response: "Cayucos is the chillest beach town on the Central Coast. About 20 minutes from campus, north on Highway 1.\n\nThe pier is the centerpiece — walk out to the end, bring a fishing pole if you have one. The sunsets from here are unreal.\n\nFor food, you absolutely have to hit the Brown Butter Cookie Company. Their sea salt brown butter cookie is legendary. Get a few to go.\n\nThe beach itself is wide and usually less crowded than Pismo or Avila. Great for just laying out, reading, or tossing a frisbee.\n\nIf you want to explore, the Estero Bluffs State Park is just north of town. Easy coastal walking trails with wildflowers in spring.\n\nGrab fish tacos at Ruddell's Smokehouse — a tiny stand right by the pier. Cash only, totally worth it.\n\nTotal: $15-25 per person. One of the cheapest day trips you can do.\n\nWant me to create this plan?",
    jarvisActions: [{ type: "plan", label: "Create Cayucos Plan" }]
  },
  {
    keywords: ["los osos plan", "los osos trip", "plan los osos"],
    response: "Los Osos is the gateway to Montaña de Oro, and it's only about 20 minutes from campus heading west.\n\nStart the morning at the Los Osos Baywood Park farmers market if it's a Monday. Otherwise, head straight to Montaña de Oro State Park.\n\nThe Bluff Trail is the highlight — 3.5 miles along ocean cliffs with incredible views. It's flat and easy, perfect for any fitness level. Spooner's Cove at the trailhead has tide pools and a beautiful beach.\n\nAfter the hike, drive back into Los Osos for food. Celia's Garden Café is a hidden gem with great sandwiches and a peaceful patio.\n\nIf you still have energy, check out the Los Osos Elfin Forest — a unique pygmy oak woodland with boardwalk trails. Only takes about 30 minutes to walk through.\n\nParking at Montaña de Oro is free. The whole day can cost under $20.\n\nWant me to build this out?",
    jarvisActions: [{ type: "plan", label: "Create Los Osos Plan" }]
  },
  {
    keywords: ["arroyo grande plan", "arroyo grande trip", "plan arroyo grande", "ag plan", "ag trip"],
    response: "Arroyo Grande is a sweet little town about 20 minutes south. The Village is the main draw — think small-town California charm.\n\nStart on Branch Street, the main drag. It's lined with antique shops, boutiques, and cafes. Great for a slow morning walk.\n\nFor brunch, Doc Burnstein's Ice Cream Lab is here — get a scoop even if it's 10 AM. Their flavors are creative and delicious.\n\nIf you want some outdoor time, the Swinging Bridge over Arroyo Grande Creek is a fun photo spot. Then head to the Clark Center for Performing Arts if there's a matinee show.\n\nYou're also close to Talley Vineyards from here — one of the best in the Edna Valley. Beautiful setting for an afternoon tasting.\n\nTotal: $20-40 per person.\n\nShall I create this plan?",
    jarvisActions: [{ type: "plan", label: "Create Arroyo Grande Plan" }]
  },
  {
    keywords: ["shell beach plan", "shell beach trip", "plan shell beach"],
    response: "Shell Beach is honestly one of the most underrated spots near SLO. About 18 minutes from campus, tucked between Pismo and Avila.\n\nThe cliffs are the main attraction. Park along Shell Beach Road and walk down to the tidepools — they're some of the best on the Central Coast. Low tide is the move, so check the tide charts before you go.\n\nThe Dinosaur Caves Park is right there too — a small park on the bluffs with incredible ocean views and benches. Perfect for a picnic.\n\nFor food, walk to Zorro's Cafe & Cantina — solid Mexican food with a patio. Or if you want something nicer, Ventana Grill has amazing views and good cocktails.\n\nThe whole area is very walkable once you park. No need to move your car once you're there.\n\nTotal: $10-30 per person. The views are free.\n\nReady to plan this?",
    jarvisActions: [{ type: "plan", label: "Create Shell Beach Plan" }]
  },
  {
    keywords: ["atascadero plan", "atascadero trip", "plan atascadero"],
    response: "Atascadero is about 25 minutes north on the 101. It's got more going on than people realize.\n\nThe Charles Paddock Zoo is here — it's small but actually really cool. They have red pandas and snow leopards. About $10 entry.\n\nFor food, Sylvester's Burgers is the local legend. Old school, great fries, exactly what you want.\n\nIf you're into nature, the Jim Green Trail at Heilmann Regional Park is a nice moderate hike with oak woodlands and lake views. About 3 miles round trip.\n\nThe Atascadero Lake Park is a great spot to just hang out — there's a pavilion, walking paths, and usually geese and ducks.\n\nOn the way back, stop at Bristols Cider House — they do craft ciders in a cool barn setting.\n\nTotal: $20-35 per person.\n\nWant me to put this together?",
    jarvisActions: [{ type: "plan", label: "Create Atascadero Plan" }]
  },
  {
    keywords: ["oceano plan", "oceano trip", "plan oceano", "oceano dunes"],
    response: "Oceano is right next to Pismo, about 25 minutes from campus. The big draw is the Oceano Dunes — one of the few places in California where you can drive on the beach.\n\nIf you have a truck or SUV, you can actually drive right onto the sand. Otherwise, walk in from the Grand Avenue entrance. The dunes themselves are massive and fun to explore on foot.\n\nThe Oceano Dunes Natural Preserve is at the south end — quieter, more pristine, great for a long beach walk.\n\nFor food, grab something in Grover Beach on the way. Figueroa Mountain Brewing has a taproom there, and there are solid taco trucks along Grand Avenue.\n\nBring layers — the wind can pick up, especially in the afternoon. And bring a bag for any trash you see.\n\nTotal: $5-15 per person if walking in. Free parking along the streets.\n\nShall I build this plan?",
    jarvisActions: [{ type: "plan", label: "Create Oceano Plan" }]
  },

  // Pin / save
  {
    keywords: ["pin", "save", "bookmark"],
    response: "Got it. Head to Explore and tap the pin icon on anything you want to save.",
    action: { type: "navigate", path: "/explore", label: "Browse & Pin" },
  },

  // Jam creation — triggers the conversational flow
  {
    keywords: ["create jam", "make a jam", "make jam", "new jam", "start a jam", "start jam", "jam with friend", "jam with alex", "jam with emma", "jam with jake", "jam with sarah", "jam with marcus", "lets jam", "let's jam", "wanna jam", "want to jam", "setup a jam", "set up a jam", "create a jam", "plan a jam", "organize a jam"],
    response: "__JAM_FLOW__", // Special marker — handled by component
    jarvisActions: [{ type: "jam", label: "Start a Jam" }],
  },

  // ─── LOCAL KNOWLEDGE (personality-rewritten) ──────────────────────────────

  {
    keywords: ["beach", "ocean", "surf"],
    response: "You've got four solid beach options from campus.\n\nAvila Beach is the closest at 15 minutes and it's the warmest — great boardwalk, shops, and ice cream. Pismo is 20 minutes out and has the iconic pier plus Splash Cafe's clam chowder. Morro Bay is 25 minutes if you want kayaking and Morro Rock views. Shell Beach is tucked in between at 18 minutes with the best tide pools and fewer crowds.\n\nAll of them are free to visit. Parking runs $0-10 depending on the spot.\n\nGrab sunscreen, pick one, and leave in 30.",
    action: { type: "navigate", path: "/explore?category=Beaches", label: "Browse Beaches" }
  },
  {
    keywords: ["hike", "hiking", "trail", "bishop peak"],
    response: "SLO's got incredible hikes — they're all part of the Nine Sisters volcanic morros.\n\nBishop Peak is the crown jewel. 3.5 miles round trip, steep but worth every step for 360-degree views of the entire county. Trailhead is on Patricia Drive. Cerro San Luis is the one with the big M on it — 3 miles, great sunset spot, slightly easier than Bishop. Poly Canyon is right on campus, 2 miles, totally easy and has cool experimental architecture along the way. Irish Hills is 4 miles and way fewer people if you want solitude.\n\nAll free, all year. Bring water and try to go before 4 PM for that golden light.",
    action: { type: "navigate", path: "/explore?category=Hikes", label: "Browse Hikes" }
  },
  {
    keywords: ["study", "library"],
    response: "Depends on your mode. If you need dead silence, Kennedy Library floors 3-5 are quiet zones — the 4th floor window seats are the best in the building. If you want some ambient noise and a good latte, Scout Coffee on Higuera has solid WiFi. Kreuzberg is the late-night play — they're open way later than anywhere else and the coffee is great. The Mustang Lounge in the UU building is underrated if you want to stay on campus.\n\nMy advice: 90 focused minutes, then a short walk to reset your head."
  },
  {
    keywords: ["bus", "transit", "parking", "transport"],
    response: "SLO Transit is completely free with your Cal Poly ID — just tap your PolyCard.\n\nRoute 4 runs between campus and downtown, Route 6 does the campus loop, and Route 12A goes all the way to Morro Bay. Buses run pretty regularly during the school year.\n\nFor parking downtown, the Marsh Street Garage gives you 90 free minutes. After that it's about $1.50 an hour. Pro tip though — SLO is a Gold-level Bicycle Friendly city, and biking is almost always faster than driving downtown."
  },
  {
    keywords: ["bar", "nightlife", "party"],
    response: "SLO nightlife is centered on Higuera Street. The Library is the quintessential college bar — it's always packed Thursday through Saturday. Luna Red does craft cocktails and small plates if you want something a bit more refined. SLO Brew Rock is your best bet for live music plus drinks. And Frog & Peach is the classic dive bar with cheap drinks and a no-frills vibe.\n\nAll of these are within walking distance of each other downtown. 21+ and bring your ID — SLO bars don't play around with checking."
  },
  {
    keywords: ["farmers market", "farmer"],
    response: "Thursday night Farmer's Market is a SLO institution — it's been running since the 1980s and it's genuinely one of the best in California. Every Thursday from 6 to 9 PM, about five blocks of Higuera Street get shut down for food vendors, live music, local produce, crafts, and BBQ. The tri-tip and ribs are legendary.\n\nShow up around 6:30, walk the entire strip end to end, eat as much as your budget allows. It's free to attend and the energy is unmatched. This is where SLO shows up."
  },
  {
    keywords: ["history", "mission", "founded"],
    response: "SLO was founded on September 1, 1772 by Junípero Serra, making the Mission San Luis Obispo de Tolosa the fifth California mission. Cal Poly came along in 1901 and basically became the town's identity.\n\nFun facts that hit different: SLO was the first city in the US to ban indoor smoking back in 1990, and it's home to the world's first motel — the Milestone Mo-Tel. The town sits at about 47,000 people, which is the perfect size where everything feels accessible but nothing feels boring.\n\nThe mission downtown is still beautiful and worth a walk-through if you haven't been."
  },
  {
    keywords: ["weather", "temperature", "climate"],
    response: "SLO weather is honestly ridiculous in the best way. You get about 280 sunny days a year, summers hover between 72 and 80°F, and even winter stays between 44 and 65°F. Rain mostly happens November through April and totals about 22 inches for the entire year.\n\nThe bottom line is you can plan outdoor stuff almost any day. Morning fog is common on the coast but usually burns off by noon. If you're from somewhere with actual weather, you're going to love it here."
  },
  {
    keywords: ["help", "what can you do"],
    response: "I'm your all-in-one SLO guide. I can recommend hikes, restaurants, coffee shops, beaches, and nightlife — all curated for Cal Poly students. I'll navigate you anywhere in the app, build Plans and itineraries, set up Jams with your crew, and give personalized food recs through Dine Bot.\n\nI also know SLO Transit routes, campus parking, local history, and a ton of random Central Coast knowledge. The more you chat with me, the better my recommendations get — I learn your taste over time.\n\nTry something like \"plan a beach trip\" or \"best hikes\" to get started."
  },
  {
    keywords: ["hello", "hi", "hey", "yo", "sup", "what's up"],
    response: "Hey. What's the move today?"
  },
  {
    keywords: ["bored", "nothing to do"],
    response: "Good — boredom means you need novelty, not comfort. Here's the play: Bishop Peak at sunset is always worth it and costs nothing. Or do something you've never done — try a coffee shop you haven't been to, do a spontaneous drive to the beach, check if SLO Brew has a show tonight, or walk through Poly Canyon and look at the weird architecture.\n\nThe key is breaking routine on purpose. That's the reset. Pick one thing, do it in the next 30 minutes, don't overthink it. What sounds good?"
  },
  {
    keywords: ["stressed", "overwhelmed", "behind", "anxious", "feel behind"],
    response: "Okay. Breathe. We're not fixing the semester right now — we're stabilizing the next 2 hours.\n\nGo somewhere calm. Kennedy Library quiet floor or the SLO Library downtown. Write down exactly 3 tasks. Just three. Then finish one of them. That's it. Once you finish one, you have momentum, and momentum is everything.\n\nAfter that, take a short walk around Laguna Lake to reset your head. You don't need motivation — you need that first small win. Let's build it."
  },
  {
    keywords: ["rain", "rainy"],
    response: "Rain in SLO is genuinely rare, so when it happens, lean into it. Catch an indie film at the Palm Theatre, challenge your friends to an escape room at Puzzle Effect, spend an hour at the SLO Museum of Art, or just settle into Kreuzberg with a good latte and a book.\n\nRain days are for slowing down, not grinding harder. Enjoy the novelty — it'll be sunny again tomorrow."
  },
  {
    keywords: ["cheap", "budget", "free"],
    response: "SLO is surprisingly friendly on a student budget. Every hike in town is free — Bishop Peak, Cerro San Luis, Poly Canyon, Irish Hills. Beaches are free. Thursday Farmer's Market is free to attend. Bubblegum Alley is free (and weird in a good way).\n\nIf you have a few bucks, tacos at Taqueria Santa Cruz run $2-3 each, a good latte at Scout is under $6, and bowling at Mustang Lanes is about $4 a game with a student deal. Most downtown shops offer student discounts if you ask. The best move is always the free thing that gets you outside."
  },
  {
    keywords: ["thanks", "thank you", "thx"],
    response: "Anytime. Go make it happen."
  },
  {
    keywords: ["bubblegum", "alley"],
    response: "Bubblegum Alley is at 733 Higuera Street — over 70 feet of chewed gum plastered on both walls, going strong since the 1960s. It's weird, it's kind of gross if you think about it too hard, and it's a completely free SLO rite of passage.\n\nGreat photo spot, especially if you bring a friend to pose in it. Just don't wear your favorite jacket — the walls are closer than you think."
  },
  {
    keywords: ["madonna inn"],
    response: "The Madonna Inn is at 100 Madonna Road and it's been an eccentric Central Coast landmark since 1958. There are 110 uniquely themed rooms — each one completely different and over the top in the best way.\n\nThe real reason to go is the bakery. Their pink champagne cake is absolutely essential and probably the most photographed dessert in SLO County. The whole place is a visual experience — pink everything, cave-like restaurants, and yes, the men's room has a waterfall urinal that people literally take tours to see.\n\nYou don't need to stay there to enjoy it. Just swing by the bakery and wander around."
  },
  {
    keywords: ["morro bay", "morro rock", "kayak", "otter"],
    response: "Morro Bay is about 25 minutes from campus and it's one of the best day trips you can do. Morro Rock is a 576-foot volcanic plug right at the harbor entrance — you can't climb it but walking around the base and the surrounding beach is beautiful.\n\nThe real move is renting kayaks on the Embarcadero (about $20/hour). Paddle around mid-day and you're almost guaranteed to see sea otters — just be quiet and paddle slowly. After that, grab seafood on the waterfront at Embarco or Giovanni's Fish Market.\n\nThere's also a state park with sand dunes south of town if you want more exploring."
  },
  {
    keywords: ["avila", "hot spring", "port san luis"],
    response: "Avila Beach is the closest beach to campus at just 15 minutes, and it's consistently the warmest spot on the Central Coast. The boardwalk has shops and restaurants, and the sand is wide and clean.\n\nIf you want something special, Sycamore Hot Springs has private mineral hot tubs overlooking the hills — perfect for a chill evening. On Fridays there's a fish and farmer's market from 4-8 PM right by the pier. The Bob Jones Trail is a paved, flat, easy walk that runs from the parking area all the way to the beach — great for bikes too.\n\nPort San Luis is just past Avila and has whale watching in season. Pack sunscreen — the reflection off the water is no joke."
  },
  {
    keywords: ["montaña de oro", "montana de oro", "mdo"],
    response: "Montaña de Oro is the hidden gem of SLO County, about 30 minutes from campus past Los Osos. The Bluff Trail is the highlight — 3.5 miles along ocean cliffs with views the entire way, flat enough for any fitness level.\n\nStart at Spooner's Cove at the trailhead, which has its own beach and tide pools. You might spot harbor seals on the rocks below. The best part? It's completely free — no day use fee, no reservations needed.\n\nIf you time it for sunset, the light along those bluffs is genuinely magical. Just bring layers because the coastal wind is real out there."
  },
  {
    keywords: ["road trip", "weekend trip", "day trip"],
    response: "You're in one of the best road trip launch points in California. Hearst Castle is 45 minutes north and absolutely worth the $25 student ticket — the architecture and views are stunning. Combine it with the Elephant Seal Rookery in San Simeon, which is free and genuinely wild to see.\n\nPaso Robles wine country is 30 minutes north with over 200 wineries. Big Sur is about 2 hours up Highway 1 and is one of the most scenic drives on Earth — worth a weekend camping trip. Santa Barbara is 1.5 hours south for wine tasting plus beach time.\n\nFor a day trip, do Hearst Castle plus elephant seals. For a weekend, Big Sur camping or the Paso wine trail."
  },
  {
    keywords: ["gym", "workout", "exercise", "fitness", "climb", "climbing"],
    response: "The Cal Poly Rec Center is free for students and has everything — weights, cardio, courts, pool. That's your baseline. If you want something more social, SLO Op is a bouldering gym downtown with a great community — you'll make friends there fast.\n\nFor outdoor cardio, Bob Jones Trail is a flat paved path that runs from SLO all the way to Avila Beach, perfect for running or biking. Bishop Peak is your HIIT workout with a view at the top. CorePower Yoga has student deals if you're into that.\n\nThe free move is always the Rec Center. The fun move is SLO Op climbing."
  },
  {
    keywords: ["homework", "assignment", "due", "deadline", "calc", "exam", "test", "midterm", "final"],
    response: "You've got work to handle — let's make it efficient. Pick your mode: Kennedy Library quiet floor for full focus (floors 3-5, window seats on 4 are the best), Scout Coffee if you want a productive-but-social atmosphere, or Nautical Bean for calm with zero distractions.\n\nBlock out 90 focused minutes. No phone, no switching tabs. Then reward yourself with something good — a walk, a snack, whatever resets your head.\n\nNext best move: pack up and head to your study spot within 20 minutes. Don't wait for motivation, just start."
  },
  {
    keywords: ["no homework", "no assignments", "day off", "free day"],
    response: "A free day in SLO is a gift — don't waste it indoors. If the weather's nice, Montaña de Oro's Bluff Trail is the move — ocean cliffs for 3.5 miles and it's completely free. Kayaking in Morro Bay is another top-tier option, especially mid-day when the otters are out.\n\nIf you want something social, check the Thursday Farmer's Market (if it's Thursday — obviously), or just hit the Avila Beach boardwalk for a low-key afternoon with ice cream.\n\nGrab water, leave in 30 minutes, don't waste the sun."
  },
  {
    keywords: ["date", "date idea", "date night", "romantic"],
    response: "For a first date, Novo's waterfall patio is the safest bet — great food, romantic lighting, and the setting does half the work for you. If you want something more adventurous, a sunset hike at Bishop Peak is free and genuinely impressive.\n\nWine tasting at Edna Valley is only 10 minutes from campus and feels like you put real effort in. The Madonna Inn bakery followed by a downtown walk is cute and low-pressure. And if you want the classic California move, Avila Beach at sunset with dinner at Custom House is hard to beat.\n\nDon't overthink it. Pick one, commit, and be present."
  },
  {
    keywords: ["different", "new", "unique", "unusual", "weird"],
    response: "You want something off the beaten path — respect. Sensorio in Paso Robles is a massive light art installation that's genuinely magical at night. The escape room downtown is solid if you've got a small group. Elephant seal viewing at San Simeon is free and absolutely wild — hundreds of them just hanging out on the beach.\n\nIf you're into random cool stuff, the Estrella Warbirds Museum has vintage military aircraft, and Poly Canyon on campus has an architecture graveyard with experimental structures from the 60s and 70s that most students never explore.\n\nBreak the pattern. That's the move."
  },
  // ─── Cal Poly Campus Knowledge ─────────────────────────────────────────
  {
    keywords: ["campus", "cal poly", "university", "school"],
    response: "Cal Poly SLO has been doing Learn by Doing since 1901 — about 22,000 students on one of the largest campuses in the US at 9,700 acres. The Mustang mascot is everywhere and the school pride runs deep.\n\nPoly Canyon is the hidden gem on campus — experimental architecture from decades of student projects, and a nice easy 2-mile walk. The Rec Center is free for students and genuinely excellent. The PAC hosts great shows throughout the year.\n\nIf you haven't explored Poly Canyon yet, make that happen this week. It's one of those things that's right there but most people never bother with."
  },
  {
    keywords: ["parking", "where to park", "car"],
    response: "Downtown parking is easiest at the Marsh Street Garage — you get 90 free minutes, then it's about $1.50 an hour. Palm Street Garage is similar. Higuera meters run $1.25 an hour.\n\nOn campus, daily permits are $8. Structure 1 off Grand Ave has the most spots, Structure 3 near Via Carta is closest to engineering.\n\nHonestly though, SLO Transit is completely free with your Cal Poly ID — just tap your PolyCard. And biking is almost always faster than driving downtown. SLO is a Gold-level Bicycle Friendly city for a reason.\n\nFree parking hack: side streets off Broad Street, about a 10-minute walk to downtown."
  },
  {
    keywords: ["sunset", "golden hour", "sunrise"],
    response: "Bishop Peak summit is the definitive sunset spot in SLO — get there about 45 minutes before sunset for the full show. 360-degree views of the entire county. Cerro San Luis is an easier hike with great west-facing views if Bishop feels like too much effort.\n\nFor a beach sunset, Avila Beach pier has the sun dropping straight into the ocean, and Shell Beach cliffs are quieter with equally stunning views. Morro Bay's Embarcadero gives you that Morro Rock silhouette at sunset, which is incredibly photogenic.\n\nFor sunrise, Poly Canyon facing east or a drive out to Montaña de Oro. Golden hour on the Central Coast is genuinely magical — with 280 sunny days a year, you've got no excuses."
  },
  {
    keywords: ["photo", "instagram", "picture", "aesthetic"],
    response: "The most Instagrammable spots in SLO start with Bubblegum Alley — weird but iconic. Scout Coffee has that clean aesthetic interior everyone posts. Morro Rock makes a dramatic backdrop from almost any angle. Bishop Peak summit gives you panoramic shots that look like drone footage.\n\nAvila Beach boardwalk is classic California, Madonna Inn is pink everything, and Poly Canyon has experimental architecture structures that look wild in photos.\n\nBest light is always golden hour — about an hour before sunset. With 280 sunny days in SLO, you'll have plenty of chances."
  },
  {
    keywords: ["group", "crew", "friends", "hang out", "hangout", "things to do with friends"],
    response: "For a smaller group of 4-6 people, bowling at Mustang Lanes is about $4 a game with the student deal, escape rooms downtown are solid, and dinner plus a show at SLO Brew is always a good time.\n\nFor bigger groups, a beach bonfire at Avila is free and classic, Thursday Farmer's Market is the ultimate social event, Bishop Peak as a group hike is free, and kayaking in Morro Bay runs $15-20 per person.\n\nFor group dinners, Woodstock's has big tables and a vibe, or Novo if everyone's willing to chip in.\n\nOr start a Jam here and let your crew vote on what to do — that's literally what it's for.",
    jarvisActions: [{ type: "jam", label: "Start a Jam" }],
  },
  {
    keywords: ["scout", "scout coffee"],
    response: "Scout Coffee is at 1130 Garden Street in downtown SLO. They're famous for the lavender latte and dirty chai — drinks run about $4-7. WiFi is decent, seating is indoor plus a small patio, and they're open 7 AM to 5 PM daily.\n\nThe vibe is clean, modern, and very Instagram-worthy. Good for a 1-2 hour study session but it does get crowded, especially midday on weekends.\n\nWhen Scout is packed, Kreuzberg is your backup — more space and open way later.",
    action: { type: "navigate", path: "/explore", label: "Find on Explore" },
  },
  {
    keywords: ["kreuzberg"],
    response: "Kreuzberg is at 685 Higuera Street — it's a coffee shop by day and cocktail bar by night, which makes it one of the most versatile spots in SLO. WiFi is strong, the vibe is eclectic with art shows and events, and they stay open late.\n\nThis is THE late-night study and creative spot. Laptop crowd is welcome. Coffee runs $4-6 and cocktails are $8-12 in the evening.\n\nPro tip: sit upstairs for quieter vibes when the downstairs gets crowded."
  },
  {
    keywords: ["firestone", "tri-tip"],
    response: "Firestone Grill is at 1001 Higuera Street and their tri-tip sandwich at $12 is a genuine Central Coast legend. Oak-grilled, served on a garlic bread roll — it's a SLO rite of passage. They also do a great ABC burger and solid ribs.\n\nThey're open 11 AM to 10 PM, budget about $10-15 per person. Expect a line at peak hours, especially weekends. Worth every minute of the wait.\n\nIf you haven't been, go this week. It's not optional."
  },
  {
    keywords: ["woodstock", "woodstocks"],
    response: "Woodstock's Pizza is at 1000 Higuera Street and it's THE Cal Poly pizza institution. Open late with delivery available, so it's where you end up at midnight after a long study session. Pizzas run $12-20 with a solid beer selection.\n\nThe lunch special is a personal pizza plus a drink for about $8, which is a great deal.\n\nThis is a classic SLO move that every student makes at least twice a week."
  },
  {
    keywords: ["lonely", "alone", "no friends", "new student", "transfer"],
    response: "Real talk — being new or feeling alone is completely normal. SLO is genuinely one of the friendliest college towns in the US, so you're in a good place for this.\n\nJoin a club at Cal Poly — there are over 400 of them. Go to Thursday Farmer's Market solo and just let it happen. Try the climbing gym at SLO Op — instant community, people are incredibly welcoming there. Sit at the bar at Kreuzberg and strike up a conversation.\n\nEveryone is looking for connection. You just have to show up. Pick one thing from this list and do it this week. Not next week. This week.\n\nYou can also start a Jam here and invite people — you'd be surprised who shows up.",
    jarvisActions: [{ type: "jam", label: "Start a Jam" }],
  },
  {
    keywords: ["safety", "safe", "dangerous", "crime"],
    response: "SLO is one of the safest college towns in California — you can walk around downtown at night without worrying. Standard smart moves apply: lock your bike, don't leave valuables visible in your car, and use rideshare instead of driving after drinking. DUI enforcement here is strict.\n\nDowntown Higuera is well-lit and populated. Cal Poly has a free escort service after dark if you need a safe walk across campus.\n\nEmergency is 911, campus police is (805) 756-2281. Bottom line: SLO is very safe. Use common sense and you'll be totally fine."
  },
  {
    keywords: ["boo boo", "records", "vinyl", "record store"],
    response: "Boo Boo Records at 978 Monterey Street has been THE SLO record shop since 1974. Vinyl, CDs, tapes, and they do live in-store events that draw a great crowd. It's a must-visit even if you don't collect vinyl — the vibe alone is worth the trip.\n\nCheap Thrills is the other option for used records at great prices. Perfect for crate digging if you're looking for hidden gems on a budget."
  },
  {
    keywords: ["thrift", "vintage", "secondhand", "thrifting"],
    response: "SLO has some great thrift and vintage spots. Wildflower Women is a curated boutique with well-picked pieces. Junkgirls is eclectic vintage with quirky home goods mixed in. Phoenix Books has two floors of used books and is dangerous for your wallet in the best way. Captain Nemo Games covers comics, trading card games, and board games.\n\nMost of the good shops are on or near downtown Higuera. Budget half a day and just walk the strip."
  },
  {
    keywords: ["bar", "bars", "nightlife", "cocktail", "happy hour", "drinks"],
    response: "SLO nightlife lives on Higuera Street. The Library is the quintessential college bar — always packed Thursday through Saturday. Neon Cactus has great margaritas and a Tex-Mex vibe. Kreuzberg transforms into a cocktail bar at night with a more refined energy. And SLO Brew Rock is your go-to for live music plus drinks.\n\nThursday nights are the big night downtown. Pro tip: start at Neon Cactus for margs, end at The Library for the classic experience."
  },
  {
    keywords: ["palm theatre", "indie film", "art film"],
    response: "The Palm Theatre is at 817 Palm Street and it's America's first solar-powered movie theater. They show indie, foreign, and documentary films — the kind of stuff you won't find at a chain theater. Tickets are about $10.\n\nIt's a genuine SLO cultural gem and a perfect date night option. Small, intimate, and you'll feel like you have better taste in movies just for going."
  },
  {
    keywords: ["yoga", "pilates", "wellness", "float", "relax"],
    response: "For wellness in SLO, Yoga Village is a great studio with all levels and student discounts. SLO Float has sensory deprivation tanks at about $65 a session — genuinely restorative if you've never tried it.\n\nYou can also do outdoor yoga at the base of Bishop Peak for free, which is honestly the most SLO thing possible. Most studios in town offer student rates if you ask."
  },
];

// ─── Self-referencing conversation context ──────────────────────────────────
function getConversationContext(messages: ChatMessage[]): {
  lastTopic: string | null;
  mentionedPlaces: string[];
  recentBotText: string;
  turnCount: number;
} {
  const recentMsgs = messages.slice(-8);
  const botMsgs = recentMsgs.filter(m => m.role === "assistant");
  const userMsgs = recentMsgs.filter(m => m.role === "user");

  const recentBotText = botMsgs.map(m => m.text).join(" ").toLowerCase();

  // Extract mentioned place names
  const mentionedPlaces: string[] = [];
  for (const p of places) {
    if (recentBotText.includes(p.name.toLowerCase())) mentionedPlaces.push(p.name);
  }

  // Detect last topic from user messages
  let lastTopic: string | null = null;
  const topicDetectors: Record<string, RegExp> = {
    food: /food|eat|hungry|dinner|lunch|restaurant|taco|pizza|sushi|burger|brunch|breakfast/,
    coffee: /coffee|cafe|latte|espresso|matcha/,
    hiking: /hike|hiking|trail|bishop|peak|cerro|outdoor/,
    beach: /beach|ocean|surf|pismo|avila|shell/,
    nightlife: /bar|nightlife|party|drinks|cocktail/,
    study: /study|library|homework|quiet/,
    plan: /plan|trip|schedule|itinerary/,
    jam: /jam|group|crew|hang/,
    music: /music|concert|show|live/,
  };
  for (const msg of [...userMsgs].reverse()) {
    const lower = msg.text.toLowerCase();
    for (const [topic, re] of Object.entries(topicDetectors)) {
      if (re.test(lower)) { lastTopic = topic; break; }
    }
    if (lastTopic) break;
  }

  return { lastTopic, mentionedPlaces, recentBotText, turnCount: userMsgs.length };
}

// ─── App-wide data stats for Jarvis awareness ───────────────────────────────
function getAppStats() {
  const categories = new Map<string, number>();
  const cities = new Map<string, number>();
  let totalPlaces = places.length;
  let avgRating = 0;
  for (const p of places) {
    categories.set(p.category, (categories.get(p.category) || 0) + 1);
    cities.set(p.city, (cities.get(p.city) || 0) + 1);
    avgRating += p.rating;
  }
  avgRating = +(avgRating / totalPlaces).toFixed(1);
  const topCategories = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pinnedCount = (() => { try { return JSON.parse(localStorage.getItem("pinnedEvents") || "[]").length; } catch { return 0; } })();
  const jamsCount = (() => { try { return JSON.parse(localStorage.getItem("polyjarvis_jams") || "[]").length; } catch { return 0; } })();
  return { totalPlaces, avgRating, topCategories, topCities, pinnedCount, jamsCount };
}

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

function findResponse(input: string, conversationHistory: ChatMessage[] = []): { text: string; action?: NavAction; jarvisActions?: JarvisAction[] } {
  const lower = input.toLowerCase().trim();
  const navWords = lower.split(/\s+/);
  const ctx = getConversationContext(conversationHistory);

  // ─── WEATHER / ENERGY / TIME-OF-DAY CONTEXTUAL RESPONSES ──────────────
  const weatherKeywords = ["weather", "temperature", "how's it outside", "is it nice", "should i go outside", "what's it like outside", "forecast"];
  if (weatherKeywords.some(k => lower.includes(k)) && !lower.includes("climate") && !lower.includes("history")) {
    const hour = new Date().getHours();
    const vibe = getJarvisVibe();
    let weatherCat = "sunny";
    let temp = 72;
    try {
      const dashWeather = localStorage.getItem("polyjarvis_weather_cache");
      if (dashWeather) {
        const w = JSON.parse(dashWeather);
        temp = w.temp || 72;
        const c = (w.condition || "sunny").toLowerCase();
        if (["rain", "drizzle", "shower", "thunderstorm"].some(kw => c.includes(kw))) weatherCat = "rain";
        else if (c.includes("fog")) weatherCat = "fog";
        else if (c.includes("wind")) weatherCat = "windy";
        else if (["cloudy", "overcast", "partly"].some(kw => c.includes(kw))) weatherCat = "cloudy";
        else weatherCat = "sunny";
      }
    } catch {}

    const wBlurbs: Record<string, string[]> = {
      sunny: ["That's a prime SLO day. Don't waste the sun.", "Golden light kind of afternoon. This is outdoor currency.", "Blue sky = low excuses. Peak coastal conditions.", "Clear skies hit different here. You'll regret staying inside.", "This is why you live here. Plan something outside."],
      cloudy: ["Soft sky, soft schedule. Marine layer energy.", "Classic coastal gray. Calm light today — good thinking weather.", "Moody but peaceful. Cloud cover makes downtown cozy.", "No harsh sun, just steady vibes. Quiet sky kind of day."],
      rain: ["Rain in SLO is rare. Lean into it. Coffee weather.", "Slow day energy. Perfect excuse to stay inside.", "Indoor culture day. Library-core atmosphere.", "No beach guilt today. Rain makes everything quieter."],
      windy: ["Wind's up — skip exposed peaks. Bluff trails might fight back today.", "Not a Bishop Peak kind of afternoon. Downtown might be smarter.", "Coastal gust advisory for your plans. Save the summit for calmer air."],
      fog: ["Classic marine layer. Fog now, golden later.", "Gray morning, probably bright afternoon. Two-phase day.", "Use the gray for focus. Fog makes everything feel cinematic.", "Let it burn off first. Slow coastal morning."],
    };

    const todRecs: Record<string, string> = {
      morning: "Morning move: grab a coffee at Scout, or hit a trail before the crowds.",
      afternoon: "Afternoon's wide open. Beach run, downtown stroll, or a food crawl.",
      evening: "Evening play: dinner downtown, sunset from Terrace Hill, or a show at SLO Brew.",
      late_night: "Late night: Woodstock's delivers, Kreuzberg's still open, or just wind down.",
    };

    const tod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "late_night";
    const blurbs = wBlurbs[weatherCat] || wBlurbs.sunny;
    const blurb = blurbs[Math.floor(Math.random() * blurbs.length)];
    const todRec = todRecs[tod];

    if (vibe === "sarcastic") return { text: `${temp}°F and ${weatherCat} in SLO. ${blurb}\n\n${todRec}\n\nBut you could also just keep asking me about the weather instead of going outside.` };
    if (vibe === "hype") return { text: `${temp}°F and ${weatherCat}! ${blurb}\n\n${todRec}\n\nLET'S MAKE IT HAPPEN! 🤙` };
    return { text: `${temp}°F and ${weatherCat} right now. ${blurb}\n\n${todRec}` };
  }

  // ─── Energy-level responses ───────────────────────────────────────────
  const energyLow = ["low energy", "no energy", "tired today", "dragging", "can't focus", "brain dead", "running on empty", "need a reset"];
  const energyHigh = ["so much energy", "high energy", "feeling great", "pumped", "wired", "energized", "on fire", "fired up"];
  const energyStressed = ["stressed out", "so stressed", "overwhelmed", "can't deal", "too much", "losing it", "falling apart", "burned out", "burnout"];

  if (energyLow.some(k => lower.includes(k))) {
    const vibe = getJarvisVibe();
    const lowR: Record<string, string> = {
      chill: "Low battery mode — that's okay. Don't fight it.\n\nQuick reset options:\n• Nautical Bean for a calm coffee and a breather\n• 15-minute walk around Laguna Lake — flat, easy, restorative\n• Raku Ramen for a warm comfort bowl\n\nDon't try to be productive right now. Recharge first, then decide what's next.",
      sarcastic: "Running on fumes? SLO has remedies for that.\n\nNautical Bean for low-key caffeine. Laguna Lake walk if you can manage standing up. Raku Ramen if eating feelings is the play.\n\nDon't try to conquer the world today. Just survive it with some dignity.",
      hype: "Low energy? That's just your body asking for a different kind of fuel! Nautical Bean coffee run! Quick Laguna Lake loop! Comfort ramen at Raku! You'll bounce back — just give yourself a soft reset first! 💛",
    };
    return { text: lowR[vibe] || lowR.chill };
  }

  if (energyHigh.some(k => lower.includes(k))) {
    const vibe = getJarvisVibe();
    const highR: Record<string, string> = {
      chill: "You've got the energy — now pick the move.\n\nHigh-energy options:\n• Bishop Peak full summit push — views are the reward\n• Kayak Morro Bay — paddle hard, see otters\n• Coffee crawl: Scout → Kreuzberg → Nautical Bean\n• Drive to Pismo, walk the whole pier and back\n\nDon't waste good energy sitting around. Channel it.",
      sarcastic: "Oh, look at you with actual energy. Don't waste it.\n\nBishop Peak exists for days like this. Morro Bay kayaking if you want to feel athletic. Coffee crawl if you want to feel wired AND productive.\n\nDo something before it wears off.",
      hype: "THAT'S THE ENERGY!! Let's GO!\n\nBishop Peak FULL SEND! Kayak Morro Bay! Coffee crawl the whole town! Drive to Pismo and own that pier!\n\nPick one and MOVE! 🔥",
    };
    return { text: highR[vibe] || highR.chill };
  }

  if (energyStressed.some(k => lower.includes(k))) {
    const vibe = getJarvisVibe();
    const stressR: Record<string, string> = {
      chill: "Okay. Pause. We're not fixing everything — we're stabilizing the next hour.\n\nStress protocol:\n1. Walk through Poly Canyon for 15 minutes. No phone.\n2. Sit at Kennedy Library floor 4 window seat. Write down exactly 3 tasks.\n3. Finish one. That's the win.\n\nAfter that, Laguna Lake loop or a quiet coffee at Nautical Bean. You don't need motivation — you need that first small win.",
      sarcastic: "Stressed? In paradise? Fine, let's deal with it.\n\nPoly Canyon walk, 15 minutes, no phone. Then Kennedy Library, write down 3 things, finish one. That's the whole plan.\n\nNautical Bean after for the reward. Stress is temporary.",
      hype: "HEY! Listen to me — you've GOT this! Poly Canyon walk RIGHT NOW, 15 minutes! Then Kennedy Library, 3 tasks, finish ONE! That's the win!\n\nNautical Bean reward after! STRESS IS TEMPORARY! 💪",
    };
    return { text: stressR[vibe] || stressR.chill };
  }

  // ─── Time-of-day adaptive suggestions ─────────────────────────────────
  const timeQueries = ["what should i do right now", "what to do now", "what's good right now", "anything going on", "what's happening", "what time is it good for"];
  if (timeQueries.some(k => lower.includes(k))) {
    const hour = new Date().getHours();
    const vibe = getJarvisVibe();
    let todResp = "";
    if (hour >= 5 && hour < 10) {
      todResp = "Morning in SLO.\n\n☕ Coffee first: Scout, Kreuzberg, or Blackhorse drive-thru\n🥞 Brunch: Sally Loo's (go early), Big Sky for a fast breakfast burrito\n🥾 Trail time: Bishop Peak is quietest before 9 AM\n📚 Study: Kennedy Library opens at 7:30\n\nMorning light on the Central Coast is special. Don't sleep through it.";
    } else if (hour >= 10 && hour < 14) {
      todResp = "Midday — prime time.\n\n🌮 Lunch: Firestone tri-tip, Taqueria Santa Cruz, or Thai Classic\n🏖️ Beach: Avila is 15 minutes and the warmest option\n🧗 Active: SLO Op climbing gym or a Poly Canyon walk\n📚 Study block: Kreuzberg or Scout with a good latte\n\nThis is your highest-energy window. Use it.";
    } else if (hour >= 14 && hour < 17) {
      todResp = "Afternoon zone.\n\n🥾 Golden hour approaching — Bishop Peak or Cerro San Luis for sunset\n🌊 Morro Bay kayaking — otters are most active mid-afternoon\n☕ Coffee reset: Nautical Bean for calm, Scout for energy\n🍦 Treat: Doc Burnstein's or Brown Butter Cookie Company\n\nAfternoon is for movement. Don't get stuck inside.";
    } else if (hour >= 17 && hour < 21) {
      todResp = "Evening mode.\n\n🍽️ Dinner: Novo's patio, Goshi for sushi, or Firestone for the classic\n🌅 Catch the sunset from Terrace Hill or Shell Beach cliffs\n🎵 Check SLO Brew for tonight's show\n🍺 Happy hour: Luna Red or Central Coast Brewing\n\nThe evening energy in SLO is unmatched. Go be part of it.";
    } else {
      todResp = "Late night.\n\n🍕 Food: Woodstock's delivers, In-N-Out til 1:30 AM, Cali's West for Mexican\n☕ Kreuzberg is still open — good coffee and cocktails\n📚 If you're studying: Kennedy Library quiet floors are empty after 10\n🌌 Clear night? Stars over Poly Canyon are real\n\nSLO gets quiet late — but the right spots are still alive.";
    }
    if (vibe === "sarcastic") todResp += "\n\nYou're welcome for the itinerary.";
    if (vibe === "hype") todResp += "\n\nPick one and GO! 🔥";
    return { text: todResp };
  }

  // ─── Assignment / academic logic ──────────────────────────────────────
  const assignmentKw = ["have an assignment", "project due", "lab due", "paper due", "need to study", "working on homework", "cramming", "study session", "study marathon", "group project"];
  if (assignmentKw.some(k => lower.includes(k))) {
    const hour = new Date().getHours();
    let studyRec = "";
    if (hour < 12) {
      studyRec = "Morning study is the best study. Kennedy Library floor 4 window seats for deep focus, or Scout Coffee if you want a latte with your productivity.\n\nBlock out 90 minutes. No phone. One task at a time. Reward yourself after with a walk or food.";
    } else if (hour < 17) {
      studyRec = "Afternoon grind — your focus might dip, so pick the right environment. Kreuzberg has the best ambient energy for powering through. Kennedy Library if you need silence.\n\nTake a 10-minute walk every 90 minutes. It actually helps. Trust the process.";
    } else {
      studyRec = "Evening session — Kreuzberg stays open late and the coffee is solid. Kennedy Library quiet floors thin out after 8 PM, which means prime real estate.\n\nSet a timer. 90 minutes on, 15 off. Don't grind past midnight if you can help it — sleep is studying too.";
    }
    return { text: studyRec };
  }

  // ─── PRIORITY: Check plan/jam creation intents FIRST (before nav) ──────────
  // Words like "make"/"create"/"start" fuzzy-match nav words like "take"/"go"
  const creationKeywords = [
    "make a plan", "make me a plan", "create a plan", "plan a trip", "plan a day",
    "help me plan", "plan an event", "plan something",
    "create jam", "make a jam", "make jam", "new jam", "start a jam", "start jam",
    "create a jam", "plan a jam", "set up a jam", "setup a jam", "lets jam", "let's jam",
    "wanna jam", "want to jam", "organize a jam",
  ];
  for (const ck of creationKeywords) {
    if (fuzzyMatch(lower, ck)) {
      const entry = sloKnowledge.find(e => e.keywords.includes(ck));
      if (entry) return { text: entry.response, action: entry.action || undefined, jarvisActions: entry.jarvisActions };
    }
  }

  // ─── Follow-up & self-referencing ──────────────────────────────────────
  // "Tell me more" / "what else" / "more like that" / "another one"
  if (lower.match(/^(tell me more|more( about that)?|what else|another one|more like that|keep going|go on|and|more options|what about more|next|similar|show me more)$/)) {
    if (ctx.mentionedPlaces.length > 0) {
      const lastPlaceName = ctx.mentionedPlaces[ctx.mentionedPlaces.length - 1];
      const lastPlace = places.find(p => p.name === lastPlaceName);
      if (lastPlace) {
        const similar = places
          .filter(p => p.category === lastPlace.category && p.id !== lastPlace.id)
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 4);
        if (similar.length > 0) {
          const lines = similar.map(p => `📍 ${p.name} — ${p.rating}★ · ${p.price} · ${p.city}`);
          return {
            text: `More ${lastPlace.category.toLowerCase()} like ${lastPlace.name}:\n\n${lines.join("\n")}\n\nWant details on any of these?`,
            action: { type: "navigate", path: "/explore", label: `Browse ${lastPlace.category}` },
          };
        }
      }
    }
    if (ctx.lastTopic) {
      const topicToCategory: Record<string, string[]> = {
        food: ["Food & Treats"], coffee: ["Coffee Shops"], hiking: ["Hikes"],
        beach: ["Beaches"], nightlife: ["Live Music", "Breweries"],
        study: ["Study Spots", "Coffee Shops"], music: ["Live Music"],
      };
      const cats = topicToCategory[ctx.lastTopic] || [];
      const more = places.filter(p => cats.includes(p.category))
        .sort(() => Math.random() - 0.5).slice(0, 4);
      if (more.length > 0) {
        const lines = more.map(p => `📍 ${p.name} — ${p.rating}★ · ${p.price}`);
        return { text: `More ${ctx.lastTopic} options:\n\n${lines.join("\n")}` };
      }
    }
  }

  // "What did you just say" / "repeat that" / recall
  if (lower.match(/what did you (just )?say|repeat that|say that again|what was that|come again/)) {
    const lastBot = conversationHistory.filter(m => m.role === "assistant").pop();
    if (lastBot) return { text: `I said:\n\n${lastBot.text}` };
    return { text: "I haven't said anything yet! Ask me something." };
  }

  // Stats / data awareness
  if (lower.match(/how many (places|spots|locations)|what do you know|how smart are you|what data|your data|your knowledge/)) {
    const stats = getAppStats();
    const catLines = stats.topCategories.map(([cat, n]) => `  • ${cat}: ${n}`).join("\n");
    const cityLines = stats.topCities.map(([city, n]) => `  • ${city}: ${n}`).join("\n");
    return {
      text: `Here's what I know:\n\n📊 ${stats.totalPlaces} curated spots across SLO County\n⭐ Average rating: ${stats.avgRating}/5\n📌 You've pinned: ${stats.pinnedCount} places\n🤙 Active jams: ${stats.jamsCount}\n\nTop categories:\n${catLines}\n\nTop cities:\n${cityLines}\n\nI also know SLO transit, parking, events, and local tips. Ask me anything.`,
    };
  }

  // "What have I been asking about" / self-reflection
  if (lower.match(/what have i been (asking|talking) about|my history|my topics|what do you know about me|do you remember me/)) {
    const ip = getImplicitPrefs();
    const topTopics = Object.entries(ip.topics).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topTopics.length > 0) {
      const topicLines = topTopics.map(([t, n]) => `• ${t}: ${n} time${n > 1 ? "s" : ""}`);
      const favTime = Object.entries(ip.timeOfDay).sort((a, b) => b[1] - a[1])[0];
      return {
        text: `Here's what I've learned about you:\n\n🧠 Your top interests:\n${topicLines.join("\n")}\n\n${favTime ? `⏰ You usually chat in the ${favTime[0]}` : ""}\n${ip.favoriteCategory ? `💜 I'd tag you as a "${ip.favoriteCategory}" person` : ""}\n\nThe more you chat, the better I get at recommending spots.`,
      };
    }
    return { text: "We haven't chatted enough yet for me to learn your style. Ask me about food, hikes, coffee — anything in SLO. I'll start picking up on your interests." };
  }

  // Navigation intents (fuzzy) — exclude creation verbs that collide
  const navTriggerWords = ["take", "go", "open", "navigate", "tke", "goo", "opne", "naviage"];
  const creationVerbs = new Set(["make", "create", "start", "build", "setup"]);
  const hasNavIntent = navWords.some(w =>
    navTriggerWords.some(n => levenshtein(w, n) <= 1) && !creationVerbs.has(w)
  ) || lower.includes("take me");
  if (hasNavIntent) {
    if (navWords.some(w => ["explore", "food", "restaurant", "hike", "beach", "explor", "resturant", "beech", "foood"].some(n => levenshtein(w, n) <= 2))) return { text: "On it.", action: { type: "navigate", path: "/explore", label: "Open Explore" } };
    if (navWords.some(w => levenshtein(w, "event") <= 1 || levenshtein(w, "events") <= 1)) return { text: "Pulling up events.", action: { type: "navigate", path: "/myevents", label: "My Events" } };
    if (navWords.some(w => levenshtein(w, "home") <= 1 || levenshtein(w, "dashboard") <= 2)) return { text: "Heading home.", action: { type: "navigate", path: "/dashboard", label: "Go Home" } };
    if (navWords.some(w => levenshtein(w, "plan") <= 1 || levenshtein(w, "plans") <= 1)) return { text: "Opening Plans.", action: { type: "navigate", path: "/plans", label: "My Plans" } };
    if (navWords.some(w => ["jam", "jams", "group", "crew"].some(n => levenshtein(w, n) <= 1))) return { text: "Opening Jams.", action: { type: "navigate", path: "/jams", label: "Jams" } };
    if (navWords.some(w => ["friend", "friends", "freinds", "freind"].some(n => levenshtein(w, n) <= 2))) return { text: "Opening Friends.", action: { type: "navigate", path: "/friends", label: "Friends" } };
    if (navWords.some(w => levenshtein(w, "profile") <= 2)) return { text: "Opening Profile.", action: { type: "navigate", path: "/profile", label: "Profile" } };
  }

  // Check Dine Bot knowledge first (more specific)
  for (const entry of dineKnowledge) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) return { text: entry.response, action: entry.action };
    }
  }

  // Fuzzy keyword matching against knowledge base
  const sorted = [...sloKnowledge].sort((a, b) => Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length)));
  for (const entry of sorted) {
    for (const keyword of entry.keywords) {
      if (fuzzyMatch(lower, keyword)) return { text: entry.response, action: entry.action || undefined, jarvisActions: entry.jarvisActions };
    }
  }

  // Dine-related catch-all
  if (navWords.some(w => ["food", "eat", "hungry", "dinner", "lunch", "dine", "restaurant", "recommend food"].some(n => fuzzyMatch(w, n)))) {
    return {
      text: "Let me be your personal food guide. 🍽️\n\nWhat are you craving?\n\n🌮 Tacos / Mexican\n🍕 Pizza / Italian\n🍣 Sushi / Asian\n🍔 Burgers\n🥞 Brunch\n🦐 Seafood\n🥗 Healthy\n🍷 Wine / Beer\n☕ Coffee\n🍦 Dessert\n💰 Budget eats\n🌙 Late night\n\nJust tell me the vibe and I'll narrow it down.",
      action: { type: "navigate", path: "/explore", label: "Browse Food Spots" },
    };
  }

  // Personalized recommendations
  if (navWords.some(w => ["best", "recommend", "reccomend", "recomend", "reccommend", "suggest", "for me", "my style"].some(n => levenshtein(w, n) <= 2))) {
    const prefs = getUserPreferences();
    const ageFiltered = localStorage.getItem("polyjarvis_age_21") === "no";
    const pool = ageFiltered ? places.filter(p => p.category !== "Breweries" && p.category !== "Wineries") : places;
    if (prefs.hasTrainingData) {
      const scored = pool.map(p => ({
        ...p,
        score: getPreferenceScore(p, prefs),
      })).sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 4);
      const lines = top.map(p => `⚡ ${p.name} — ${p.score}/10 · ${p.price} · ${p.category}`);
      return {
        text: `Based on what I know about you:\n\n${lines.join("\n")}\n\nHead to Explore → "For You" for the full list.\n\nNext best move: Pick the top one and go.`,
        action: { type: "navigate", path: "/explore", label: "Browse Explore" },
      };
    }
    // Even without training data, use implicit prefs
    const ip2 = getImplicitPrefs();
    if (ip2.favoriteCategory) {
      const topicToCategory: Record<string, string[]> = {
        food: ["Food & Treats"], tacos: ["Food & Treats"], pizza: ["Food & Treats"], sushi: ["Food & Treats"],
        coffee: ["Coffee Shops"], beach: ["Beaches"], hiking: ["Hikes"],
        nightlife: ["Live Music", "Breweries"], study: ["Study Spots", "Coffee Shops"],
        outdoors: ["Hikes", "Beaches", "Viewpoints", "Parks & Gardens"],
        music: ["Live Music"], wellness: ["Wellness", "Gym"],
      };
      const cats = topicToCategory[ip2.favoriteCategory] || [];
      const relevant = pool.filter(p => cats.includes(p.category)).sort((a, b) => b.rating - a.rating).slice(0, 4);
      if (relevant.length > 0) {
        const lines = relevant.map(p => `⚡ ${p.name} — ${p.rating}★ · ${p.price}`);
        return {
          text: `Based on what you've been asking about:\n\n${lines.join("\n")}\n\nI'm learning your taste. The more you ask, the better I get.`,
          action: { type: "navigate", path: "/explore", label: "Browse Explore" },
        };
      }
    }
    const personalRec = getPersonalizedRecommendation(prefs);
    if (personalRec) return { text: personalRec, action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
    return { text: "What are you in the mood for? Food, coffee, hikes, beaches?\n\nAsk me a few things and I'll start learning your taste automatically." };
  }

  // "Surprise me" / random
  if (navWords.some(w => ["surprise", "random", "anything", "whatever"].some(n => levenshtein(w, n) <= 1))) {
    const prefs = getUserPreferences();
    const ageFiltered2 = localStorage.getItem("polyjarvis_age_21") === "no";
    const pool2 = ageFiltered2 ? places.filter(p => p.category !== "Breweries" && p.category !== "Wineries") : places;
    if (prefs.hasTrainingData) {
      const scored = pool2.map(p => ({
        ...p,
        score: getPreferenceScore(p, prefs),
      })).sort((a, b) => b.score - a.score);
      const topPool = scored.filter(s => s.score >= 7);
      const picks = topPool.length >= 3
        ? topPool.sort(() => Math.random() - 0.5).slice(0, 3)
        : scored.slice(0, 3);
      const lines = picks.map(p => `⚡ ${p.name} — ${p.score}/10 · ${p.price}`);
      return {
        text: `Here's the move:\n\n${lines.join("\n")}\n\nPick one. Don't overthink it.`,
        action: { type: "navigate", path: "/explore", label: "Browse Explore" },
      };
    }
    // Even without training, use random high-rated places
    const randomPool = pool2.filter(p => p.rating >= 4.5).sort(() => Math.random() - 0.5).slice(0, 3);
    if (randomPool.length >= 3) {
      const lines = randomPool.map(p => `⚡ ${p.name} — ${p.rating}★ · ${p.price} · ${p.category}`);
      return { text: `Here's the move:\n\n${lines.join("\n")}\n\nPick one. Don't overthink it.`, action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
    }
    return { text: "Here's the move:\n\n🌅 Bishop Peak at sunset\n🌮 Tacos at Taqueria Santa Cruz\n☕ Chill session at Scout Coffee\n\nPick one. Go.", action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
  }

  // ─── Place name recognition ─────────────────────────────────────────────
  const isUnder21Check = localStorage.getItem("polyjarvis_age_21") === "no";
  const matchedPlace = places.find(p => {
    // Skip 21+ places for under-21 users
    if (isUnder21Check && (p.category === "Breweries" || p.category === "Wineries")) return false;
    const pLow = p.name.toLowerCase();
    if (lower.includes(pLow)) return true;
    // Match first significant word (4+ chars)
    const firstWord = pLow.split(/\s+/).find(w => w.length >= 4);
    if (firstWord && lower.includes(firstWord)) return true;
    return false;
  });

  if (matchedPlace) {
    const p = matchedPlace;
    return {
      text: `${p.name} — nice pick!\n\n📍 ${p.city || "SLO"} · ${p.category}\n⭐ ${p.rating}/5 · ${p.price}\n${p.description || ""}\n\nWant to add it to a Jam or Plan?`,
      action: { type: "navigate", path: `/event/${p.id}`, label: `View ${p.name}` },
      jarvisActions: [
        { type: "jam", label: "Add to Jam", data: { placeId: p.id, placeName: p.name } },
        { type: "plan", label: "Add to Plan" },
      ],
    };
  }

  // ─── Smart catch-all with implicit learning ─────────────────────────────
  const isUnder21 = localStorage.getItem("polyjarvis_age_21") === "no";
  const ip = getImplicitPrefs();
  const prefix = getContextualPrefix();

  // Mood / slang detection — expanded
  const moodMap: Record<string, string[]> = {
    tired: ["tired", "exhausted", "sleepy", "drained", "burnt out", "dead", "fried"],
    bored: ["bored", "boring", "nothing to do", "so bored"],
    stressed: ["stressed", "stress", "overwhelmed", "anxiety", "anxious", "midterms", "finals"],
    happy: ["happy", "great day", "amazing", "stoked", "pumped", "excited", "hyped"],
    sad: ["sad", "down", "depressed", "lonely", "homesick", "miss home"],
    hungry: ["starving", "famished", "so hungry", "feed me"],
    social: ["wanna hang", "want to hang", "lets do something", "need friends"],
  };
  const detectedMood = Object.entries(moodMap).find(([_, words]) => words.some(w => lower.includes(w)));
  if (detectedMood) {
    const vibe = getJarvisVibe();
    const moodKey = detectedMood[0];

    // Personality-flavored mood responses
    if (vibe === "sarcastic") {
      const sarcasticMood: Record<string, string> = {
        tired: `${prefix}Tired? In SLO? You literally live in paradise. Fine — go to Nautical Bean for a low-key coffee, or drive 15 minutes to Avila Beach and let the ocean air do the work. Raku Ramen is also solid comfort food if you just want to sit and stare at nothing for a while.\n\nSometimes doing less is the move. I'll allow it.`,
        bored: `${prefix}Bored in SLO? That's actually impressive. There's bowling at Mustang Lanes for four bucks, an entire record store to browse at Boo Boo's, a climbing gym at SLO Op, and Shell Beach is 18 minutes away. But sure, tell me more about how there's nothing to do.\n\nOr just say "surprise me" and I'll pick for you since apparently decisions are hard today.`,
        stressed: `${prefix}Okay, deep breath. I know you think the world is ending, but it's probably not. Walk through Poly Canyon for 15 minutes — it genuinely clears your head. If that doesn't work, Kreuzberg has good coffee and a vibe that makes problems feel smaller. Bishop Peak at sunset is a perspective check. Or go full factory-reset with a SLO Float tank session.\n\nYou've survived worse. Let's stabilize.`,
        happy: `${prefix}Oh, we're in a good mood? That's new. Ride it — golden hour hike, celebrate at SLO Brew, or windows down on the drive to Morro Bay. Don't waste good energy sitting on your couch.\n\nWhat do you want to do? Actually, don't overthink it. Just go.`,
        sad: `${prefix}Hey. It happens. SLO is actually great for this — go sit at Scout Coffee with a warm drink and watch people walk by. Drive to Avila Beach, stare at the ocean, let it do its therapy thing. Or order Woodstock's pizza because comfort food is a valid coping mechanism.\n\nAlso, start a Jam. Being around people helps more than you think.`,
        hungry: `${prefix}Oh, so you waited until you were starving to ask me. Classic. Fastest option: In-N-Out, five minutes. Best value: Taqueria Santa Cruz, two-dollar tacos. Worth the wait: Firestone tri-tip sandwich. Late night: Woodstock's delivers.\n\nPick one and stop complaining about being hungry.`,
        social: `${prefix}You want to hang out but you're asking a chatbot instead of texting your friends. I respect the irony. SLO Op climbing gym is instant community. Check if SLO Brew has a show this week. Thursday Farmer's Market is the biggest social event in town.\n\nOr start a Jam and actually invite people. That's what it's for.`,
      };
      return { text: sarcasticMood[moodKey] || sarcasticMood.bored };
    }

    if (vibe === "hype") {
      const hypeMood: Record<string, string> = {
        tired: `${prefix}RECHARGE MODE! Hit up Nautical Bean for a chill coffee, cruise out to Avila for ocean air that resets everything, or grab comfort ramen at Raku. Sometimes you gotta go easy — that's okay! Tomorrow we go HARD! 🤙`,
        bored: `${prefix}BORED?! In SLO?! Let's FIX THAT! Bowling at Mustang Lanes is four bucks! Boo Boo Records is a vibe! SLO Op climbing gym will get your blood pumping! Or Shell Beach for a walk! SAY "SURPRISE ME" AND I'LL PICK! 🔥`,
        stressed: `${prefix}HEY! You got this! Walk Poly Canyon for 15 minutes to reset. Study break at Kreuzberg. Bishop Peak sunset for a perspective check. Or SLO Float tank for a full brain reboot. STRESS IS TEMPORARY! Let's move through it! 💪`,
        happy: `${prefix}YESSS! RIDE THAT WAVE! Golden hour hike RIGHT NOW! Celebrate at SLO Brew! Windows down, Morro Bay drive! This energy is EVERYTHING! What are we doing?! 🎉`,
        sad: `${prefix}Hey hey, SLO has your back! Warm drink at Scout Coffee, ocean therapy at Avila, comfort pizza from Woodstock's — all valid! And start a Jam — people WANT to hang out, they're just waiting to be asked! YOU GOT THIS! 💛`,
        hungry: `${prefix}FUEL UP TIME! 🚨 In-N-Out in 5 minutes! Santa Cruz tacos for $2-3! Firestone tri-tip if you want the BEST! Woodstock's delivers late night! LET'S EAT! 🍔`,
        social: `${prefix}LET'S GET SOCIAL! SLO Op climbing gym — instant crew! SLO Brew show this week! Thursday Farmer's Market is THE move! Start a Jam and rally the squad! LET'S GOOO! 🤝`,
      };
      return { text: hypeMood[moodKey] || hypeMood.bored };
    }

    // Default "chill" personality
    const chillMood: Record<string, string> = {
      tired: `${prefix}I feel you. Head to Nautical Bean for a low-key coffee, or take the 15-minute drive to Avila — ocean air resets everything. Raku Ramen is solid comfort food if you just want something warm.\n\nSometimes you just need to chill. No shame in that.`,
      bored: `${prefix}Bored in SLO? There's always a move. Bowling at Mustang Lanes is $4 with a student deal. Browse vinyl at Boo Boo Records. SLO Op climbing gym if you want something active. Or just drive to Shell Beach and walk the cliffs.\n\nOr say "surprise me" and I'll pick for you.`,
      stressed: `${prefix}Deep breath. You've got this. Walk through Poly Canyon for 15 minutes — it genuinely clears your head. Study break at Kreuzberg with a good latte. Bishop Peak at sunset for a perspective reset. Or try a SLO Float tank session — it's a factory reset for your brain.\n\nOne thing at a time.`,
      happy: `${prefix}Love that energy. Ride the wave — golden hour hike, celebrate at SLO Brew, or windows down on the drive to Morro Bay. Don't let it go to waste.\n\nWhat do you want to do?`,
      sad: `${prefix}Hey, it's okay. SLO has your back. Sit at Scout Coffee with a warm drink and watch the world go by. Drive to Avila Beach for some ocean therapy. Order Woodstock's — comfort pizza always works.\n\nStart a Jam too — you'd be surprised who shows up.`,
      hungry: `${prefix}Emergency hunger mode. Fastest: In-N-Out, five minutes. Best value: Taqueria Santa Cruz at $2-3 a taco. Worth the wait: Firestone tri-tip sandwich. Late night: Woodstock's delivers.\n\nPick one and go.`,
      social: `${prefix}Let's get you out there. SLO Op climbing gym has instant community. Check if SLO Brew has a show this week. Thursday Farmer's Market is the biggest social event in town.\n\nOr start a Jam and invite your crew — that's literally what it's for.`,
    };
    return { text: chillMood[moodKey] || chillMood.bored };
  }

  // Category-broad matching: if user mentions ANY place category
  const categoryMatch = places.reduce<Map<string, number>>((acc, p) => {
    const cat = p.category.toLowerCase();
    const catWords = cat.split(/[\s&]+/).filter(w => w.length >= 3);
    for (const cw of catWords) {
      if (lower.includes(cw)) acc.set(p.category, (acc.get(p.category) || 0) + 1);
    }
    return acc;
  }, new Map());

  if (categoryMatch.size > 0) {
    const topCat = [...categoryMatch.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (isUnder21 && (topCat === "Breweries" || topCat === "Wineries")) {
      return { text: `${prefix}I've got you covered with other options — check out Explore for coffee shops, food spots, and outdoor adventures!`, action: { type: "navigate", path: "/explore", label: "Browse Explore" } };
    }
    const catPlaces = places.filter(p => p.category === topCat).sort((a, b) => b.rating - a.rating).slice(0, 4);
    const lines = catPlaces.map(p => `📍 ${p.name} — ${p.rating}★ · ${p.price} · ${p.city}`);
    return {
      text: `${prefix}Here's what I've got for ${topCat}:\n\n${lines.join("\n")}\n\nWant more? Head to Explore and filter by ${topCat}.`,
      action: { type: "navigate", path: `/explore?category=${encodeURIComponent(topCat)}`, label: `Browse ${topCat}` },
    };
  }

  // Sentiment / mood detection — context-aware
  if (lower.match(/what should i do|i don't know|idk|not sure|undecided|hmm/)) {
    if (ctx.lastTopic) {
      const topicSuggestions: Record<string, string> = {
        food: "How about tacos from Santa Cruz? Or I can recommend something else.",
        coffee: "Let's try a new coffee spot — been to Nautical Bean?",
        hiking: "Perfect weather for Cerro San Luis. Want to plan it?",
        beach: "Avila is always the answer. 15 min drive.",
        music: "Check if SLO Brew has a show tonight.",
      };
      const topicPick = topicSuggestions[ctx.lastTopic] || null;
      if (topicPick) return { text: `${prefix}Since you were vibing with ${ctx.lastTopic} stuff...\n\n${topicPick}\n\nOr say "surprise me".` };
    }
    const suggestions = [
      "🌅 Bishop Peak sunset hike — free, always worth it",
      "☕ Coffee crawl — Scout → Kreuzberg → Nautical Bean",
      "🏖️ Spontaneous Avila Beach run — 15 min away",
      "🍕 Grab Woodstock's and watch a sunset",
      "🎳 Bowling night at Mustang Lanes — $4 student",
    ];
    const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
    return { text: `${prefix}When in doubt, move.\n\nMy pick for right now:\n${pick}\n\nOr tell me a vibe — food, outdoors, chill, social — and I'll narrow it down.` };
  }

  // Positive / thank responses — context-aware + personality
  const catchVibe = getJarvisVibe();
  if (lower.match(/^(ok|okay|cool|bet|sick|nice|dope|fire|lit|word|aight|alright|sounds good|perfect|less go|let's go|yea|yeah|yep|yes|ya|yup)$/)) {
    if (ctx.mentionedPlaces.length > 0) {
      const lastPlace = ctx.mentionedPlaces[ctx.mentionedPlaces.length - 1];
      if (catchVibe === "sarcastic") return { text: `Finally, a decision. ${lastPlace} it is. Want me to add it to a Jam or are we still just talking about it?` };
      if (catchVibe === "hype") return { text: `LET'S GO!! ${lastPlace} it is! Want me to add it to a Jam or find more like it?! 🔥` };
      return { text: `That's the energy. ${lastPlace} it is. Want me to add it to a Jam or find more like it?` };
    }
    if (catchVibe === "sarcastic") return { text: "Cool. So... are we doing something or just vibing?" };
    if (catchVibe === "hype") return { text: "THAT'S THE ENERGY! What's next?! 🤙" };
    return { text: "That's the energy. What's next?" };
  }

  // Thank you responses — personality-flavored
  if (lower.match(/^(thanks|thank you|thx|ty|appreciate it|thanks bro|thanks man|cheers)$/)) {
    if (catchVibe === "sarcastic") {
      const sarcasticThanks = ["You're welcome. I accept tips in compliments.", "Don't thank me, thank SLO for being this good.", "I know, I know. I'm helpful. It's a gift."];
      return { text: sarcasticThanks[Math.floor(Math.random() * sarcasticThanks.length)] };
    }
    if (catchVibe === "hype") {
      const hypeThanks = ["ALWAYS!! That's what I'm here for! 🤙", "YOU GOT IT! Hit me up anytime!", "ANYTIME! SLO is better when you know where to go! 🔥"];
      return { text: hypeThanks[Math.floor(Math.random() * hypeThanks.length)] };
    }
    const thankReplies = ["Always. That's what I'm here for.", "You got it. Hit me up anytime.", "No problem. Let me know if you need anything else.", "Anytime. SLO is better when you know where to go."];
    return { text: thankReplies[Math.floor(Math.random() * thankReplies.length)] };
  }

  // Questions about Jarvis — data-aware + personality
  if (lower.match(/who are you|what are you|are you ai|are you real|are you a bot/)) {
    const stats = getAppStats();
    if (catchVibe === "sarcastic") return { text: `I'm Jarvis — I know more about SLO than most people who live here. I've got ${stats.totalPlaces} curated spots memorized, I track your preferences to get smarter over time, I can set up Jams, build Plans, and give personalized recs. I know transit, parking, campus, trails — all of it.\n\nYou're welcome in advance. Try "what do you know about me" if you're brave enough.` };
    if (catchVibe === "hype") return { text: `I'M JARVIS — your ultimate SLO guide! 🔥 I know ${stats.totalPlaces} curated spots across SLO County! I track your preferences, set up Jams, build Plans, and give personalized recs! Transit, parking, campus, trails — I KNOW IT ALL!\n\nThe more you chat, the better I get! Try "what do you know about me"! 🤙` };
    return { text: `I'm Jarvis — your SLO guide built into PolyJarvis. I know ${stats.totalPlaces} curated spots across SLO County, I track your preferences to get smarter over time, and I can set up Jams, build Plans, and give personalized recs. I also know transit, parking, campus, trails — all of it.\n\nThe more you chat, the better my picks get. Try "what do you know about me".` };
  }

  // "Help" command — paragraph style
  if (lower.match(/^help$|what can you do|how do i use|commands|features/)) {
    if (catchVibe === "sarcastic") return { text: `Oh, you need the manual? Fine. I do food recs (try "best tacos" or "brunch spots"), outdoor spots ("hike recs", "sunset spots"), coffee and study advice, nightlife recs, and I can navigate you anywhere in the app.\n\nI also build Plans, set up Jams with your crew, track stats on what you ask me, remember our conversations, and do follow-ups when you say "tell me more."\n\nJust talk to me like a normal person. I'll figure it out.` };
    return { text: `I'm your all-in-one SLO guide. I do food recs (try "best tacos" or "brunch spots"), outdoor spots ("hike recs", "sunset spots"), coffee and study advice ("study spots", "best latte"), and nightlife recs ("bar recs", "live music").\n\nI can also navigate you anywhere in the app, build Plans and itineraries, set up Jams with your crew ("start a jam", "jam with Alex"), pull up stats on my knowledge base, remember what you've been asking about, and do follow-ups ("tell me more", "more like that").\n\nJust talk naturally.` };
  }

  // Smart catch-all with context from implicit prefs
  if (ip.favoriteCategory) {
    const topicSuggestions: Record<string, string> = {
      food: "🍽️ \"best tacos\", \"brunch spots\", or \"cheap eats\"",
      coffee: "☕ \"coffee shop recs\" or \"best latte in SLO\"",
      beach: "🏖️ \"beach trip\" or \"best surf spots\"",
      hiking: "⛰️ \"best hikes\" or \"sunset trail\"",
      nightlife: "🍺 \"bar recs\" or \"live music tonight\"",
      study: "📚 \"study spots\" or \"quiet library floors\"",
      budget: "💰 \"free things\" or \"cheap eats\"",
      outdoors: "🌅 \"sunset spots\" or \"best views\"",
    };
    const suggestion = topicSuggestions[ip.favoriteCategory] || "\"help\" to see everything I can do";
    if (ctx.turnCount > 3) {
      return { text: `${prefix}I didn't catch that one. But we've been chatting — I'm learning your style. Try:\n\n${suggestion}\n\nOr say "tell me more" to continue our conversation.` };
    }
    return { text: `${prefix}I didn't catch that one — but I know you. Try:\n\n${suggestion}\n\nOr say \"help\" and I'll show you everything.` };
  }

  if (lower.match(/\?$/)) return { text: `${prefix}Hmm, I don't have a specific answer for that. But try:\n\n🌮 \"best tacos\" or \"food recs\"\n⛰️ \"hike spots\" or \"bishop peak\"\n☕ \"coffee shops\" or \"study spots\"\n🏖️ \"beach trip\" or \"pismo\"\n\nOr say \"help\" for everything I know.` };
  return { text: `${prefix}Not sure about that one. Here's what I'm good at:\n\n🍽️ Food recommendations\n⛰️ Hikes & outdoor spots\n☕ Coffee & study spots\n🏖️ Beach trips\n👥 Setting up Jams\n📋 Building Plans\n🧠 Learning your preferences\n\nJust ask naturally — "where should I eat" or say "help".` };
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
    const trimmed = msgs.slice(-100);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
  } catch { /* noop */ }
}

export function Jarvis() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefs = useMemo(() => getUserPreferences(), []);
  const isDineMode = searchParams.get("mode") === "dine";

  const initialGreeting = useMemo(() => {
    if (isDineMode) {
      return "Hey! I'm in food mode. 🍽️\n\nWhat are you craving? Tell me a cuisine, a vibe, or a budget and I'll find you the perfect spot in SLO.\n\nTry: \"tacos\", \"brunch\", \"cheap eats\", \"date night dinner\"";
    }
    const vibe = getJarvisVibe();
    let userName = "";
    try { const raw = localStorage.getItem("polyjarvis_customize"); if (raw) { userName = JSON.parse(raw).displayName || ""; } } catch {}
    const hey = userName ? `Hey ${userName}` : "Hey";
    if (prefs.hasTrainingData && prefs.likedPrompts.length > 0) {
      const liked = prefs.likedPrompts.slice(0, 2).map(p => `${p.emoji} ${p.label.toLowerCase()}`).join(" & ");
      if (vibe === "hype") return `Yo${userName ? ` ${userName}` : ""}! I remember you're into ${liked}. Let's go! 🔥`;
      if (vibe === "sarcastic") return `Oh, you again${userName ? `, ${userName}` : ""}. Still obsessed with ${liked}? Fine, what do you need.`;
      return `${hey}. I remember you're into ${liked}. What's the move today?`;
    }
    // Use implicit preferences if available
    const ip = getImplicitPrefs();
    if (ip.favoriteCategory) {
      const topicGreetings: Record<string, string> = {
        food: vibe === "hype" ? "Yo! Foodie alert! Where are we eating?! 🍽️" : `${hey}. I know you're a foodie. Where are we eating today?`,
        coffee: vibe === "hype" ? "Coffee time! ☕ What are we sipping?!" : `${hey}. Need a coffee recommendation or something bigger?`,
        beach: vibe === "hype" ? "Beach day energy! 🏖️ Let's go!" : `${hey}. Beach day or something different today?`,
        hiking: vibe === "hype" ? "Trail time! 🥾 The mountains are calling!" : `${hey}. Trails are looking good today. What's the move?`,
        nightlife: `${hey}. Planning something fun tonight?`,
        study: `${hey}. Study mode or adventure mode today?`,
        budget: `${hey}. Let's find something awesome that won't break the bank.`,
        outdoors: `${hey}. Beautiful day in SLO. What are we doing?`,
      };
      return topicGreetings[ip.favoriteCategory] || `${hey}. I'm learning what you like. What's the move?`;
    }
    const hour = new Date().getHours();
    if (vibe === "hype") return `Yo${userName ? ` ${userName}` : ""}! I'm Jarvis — your SLO guide! 🤙 What are we doing?!`;
    if (vibe === "sarcastic") return `Hey${userName ? ` ${userName}` : ""}. I'm Jarvis. I know more about SLO than you ever will. Ask me something — I dare you.`;
    if (hour < 10) return `Morning${userName ? `, ${userName}` : ""}. I'm Jarvis — your SLO guide. Coffee spot, or something bigger?`;
    if (hour >= 22) return `Late night${userName ? `, ${userName}` : ""}. I'm Jarvis — your SLO guide. Need food, a plan, or just vibes?`;
    return `${hey}. I'm Jarvis — your SLO guide. Ask me about food, hikes, beaches, or say "help" to see everything.`;
  }, [prefs, isDineMode]);

  // Load persisted messages, or start with greeting
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isDineMode) return [{ role: "assistant", text: initialGreeting, timestamp: Date.now() }];
    const saved = loadMessages();
    if (saved.length > 0) return saved;
    return [{ role: "assistant", text: initialGreeting, timestamp: Date.now() }];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Conversational Jam Flow State ─────────────────────────────────────────
  const [jamFlow, setJamFlow] = useState<JamFlowState>(emptyJamFlow);

  // Persist messages whenever they change (but not in dine mode to keep it fresh)
  useEffect(() => {
    if (!isDineMode) saveMessages(messages);
  }, [messages, isDineMode]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleNavigate = useCallback((path: string) => {
    setTimeout(() => navigate(path), 100);
  }, [navigate]);

  // ─── Jam Flow: process user input based on current step ────────────────────
  const processJamFlowInput = useCallback((text: string, currentFlow: JamFlowState): { response: string; updatedFlow: JamFlowState; jamCreated?: { id: string; name: string } } => {
    const lower = text.toLowerCase().trim();

    switch (currentFlow.step) {
      case "awaiting_friends": {
        // Parse friend names from input
        const selectedFriends: string[] = [];
        for (const f of availableFriends) {
          if (lower.includes(f.name.toLowerCase())) {
            selectedFriends.push(f.name);
          }
        }
        if (lower.includes("everyone") || lower.includes("all")) {
          availableFriends.filter(f => f.available).forEach(f => selectedFriends.push(f.name));
        }
        if (selectedFriends.length === 0) {
          return {
            response: "I didn't catch any names. Try again — who from this list?\n\n" + availableFriends.map(f => `${f.available ? "✅" : "⛔"} ${f.name} — ${f.status} ${f.emoji}`).join("\n") + "\n\nJust type their names, like \"Alex and Jake\".",
            updatedFlow: currentFlow,
          };
        }
        return {
          response: `Nice! ${selectedFriends.join(" & ")} are in. 🤙\n\nWhat should we call this jam? Give it a name (e.g. "Beach Crew", "Study Sesh", or anything).`,
          updatedFlow: { ...currentFlow, step: "awaiting_name", friends: selectedFriends },
        };
      }

      case "awaiting_name": {
        const name = text.trim() || `Jam with ${currentFlow.friends.join(" & ")}`;
        return {
          response: `"${name}" — love it.\n\nLocked plan or voting?\n\n🔒 Locked — you set the plan, crew follows\n🗳️ Voting — add options, crew votes\n\nJust say "locked" or "voting".`,
          updatedFlow: { ...currentFlow, step: "awaiting_type", name },
        };
      }

      case "awaiting_type": {
        const type = lower.includes("vot") ? "voting" : "locked";
        return {
          response: `${type === "locked" ? "🔒 Locked" : "🗳️ Voting"} it is.\n\nWhen's this happening? Give me a date and time.\n\nExamples: "Saturday 2pm", "March 1 at 10am", or just "this weekend"\n\nYou can also say "skip" to set it later.`,
          updatedFlow: { ...currentFlow, step: "awaiting_datetime", type },
        };
      }

      case "awaiting_datetime": {
        let date = "";
        let time = "";
        if (!lower.includes("skip") && !lower.includes("later")) {
          // Try to parse date/time from natural language
          const dayMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|this weekend|next week)/i);
          const timeMatch = lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
          const dateMatch = lower.match(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})/i);

          if (dayMatch) {
            const d = dayMatch[1].toLowerCase();
            if (d === "today") date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            else if (d === "tomorrow") {
              const t = new Date(); t.setDate(t.getDate() + 1);
              date = t.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            } else if (d === "this weekend") {
              const t = new Date();
              const daysUntilSat = (6 - t.getDay() + 7) % 7 || 7;
              t.setDate(t.getDate() + daysUntilSat);
              date = t.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            } else {
              date = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1);
            }
          }
          if (dateMatch) date = dateMatch[1];
          if (timeMatch) time = timeMatch[1].toUpperCase();
        }

        const dateTimeStr = date && time ? `${date} at ${time}` : date ? date : time ? time : "TBD";
        return {
          response: `${dateTimeStr !== "TBD" ? `📅 ${dateTimeStr}` : "No date set yet — you can change it later."}\n\nWant to add a spot from Explore? Name a place or say "skip" to create it now.\n\nPopular picks: Bishop Peak, Scout Coffee, Pismo Beach, Firestone Grill`,
          updatedFlow: { ...currentFlow, step: "awaiting_spot", date, time },
        };
      }

      case "awaiting_spot": {
        if (lower.includes("skip") || lower.includes("done") || lower.includes("create") || lower.includes("no")) {
          // Show confirmation
          const f = currentFlow;
          const spotsStr = f.spots.length > 0 ? f.spots.map(s => `📍 ${s.name}`).join("\n") : "None yet";
          const dateStr = f.date ? `📅 ${f.date}${f.time ? ` at ${f.time}` : ""}` : "📅 TBD";
          return {
            response: `Here's the jam:\n\n📛 ${f.name}\n${f.type === "locked" ? "🔒 Locked" : "🗳️ Voting"}\n${dateStr}\n👥 ${f.friends.join(", ")}\n${spotsStr}\n\nSay "confirm" to create it, or "edit" to change something.`,
            updatedFlow: { ...currentFlow, step: "confirm" },
          };
        }

        // Try to match a place
        const matchedPlace = places.find(p => lower.includes(p.name.toLowerCase().split(" ")[0].toLowerCase()) || p.name.toLowerCase().includes(lower));
        if (matchedPlace) {
          const updatedSpots = [...currentFlow.spots, { name: matchedPlace.name, placeId: matchedPlace.id }];
          return {
            response: `Added ${matchedPlace.name}! 📍\n\nAnother spot? Or say "done" to finalize.`,
            updatedFlow: { ...currentFlow, spots: updatedSpots },
          };
        }

        // Fuzzy search
        const searchResults = places.filter(p =>
          p.name.toLowerCase().includes(lower) ||
          lower.split(/\s+/).some(w => p.name.toLowerCase().includes(w) && w.length > 3)
        ).slice(0, 4);

        if (searchResults.length > 0) {
          const options = searchResults.map(p => `• ${p.name} (${p.category})`).join("\n");
          return {
            response: `I found a few matches:\n\n${options}\n\nWhich one? Or say "done" to create without adding a spot.`,
            updatedFlow: currentFlow,
          };
        }

        // Custom spot
        const customSpot = { name: text.trim() };
        const updatedSpots2 = [...currentFlow.spots, customSpot];
        return {
          response: `Added "${text.trim()}" as a custom spot. 📍\n\nAnother? Or say "done" to finalize.`,
          updatedFlow: { ...currentFlow, spots: updatedSpots2 },
        };
      }

      case "confirm": {
        if (lower.includes("confirm") || lower.includes("yes") || lower.includes("create") || lower.includes("do it") || lower.includes("let's go")) {
          // Actually create the jam!
          const f = currentFlow;
          const words = ["PEAK", "WAVE", "BREW", "SURF", "HIKE", "CHILL", "CREW"];
          const code = `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(Math.random() * 99) + 1}`;

          const newJam = {
            id: `jarvis-jam-${Date.now()}`,
            name: f.name,
            emoji: "",
            code,
            members: [
              { id: "you", name: "You", rsvp: "going" },
              ...f.friends.map((name, i) => ({ id: `f${i}`, name, rsvp: "pending" as const })),
            ],
            isOwner: true,
            createdAt: "Just now",
            type: f.type,
            events: f.spots.map((s, i) => ({
              id: `je-${Date.now()}-${i}`,
              name: s.name,
              placeId: s.placeId,
              addedBy: "You",
              ...(f.type === "voting" ? { votes: { up: 0, down: 0 } } : {}),
            })),
            date: f.date || undefined,
            time: f.time || undefined,
          };

          try {
            const existing = JSON.parse(localStorage.getItem(JAMS_KEY) || "[]");
            localStorage.setItem(JAMS_KEY, JSON.stringify([newJam, ...existing]));
          } catch { /* */ }

          return {
            response: `Jam created! 🤙\n\n"${f.name}" is live with ${f.friends.join(", ")}.\n\nHead to Jams to share the invite link with your crew.`,
            updatedFlow: emptyJamFlow,
            jamCreated: { id: newJam.id, name: newJam.name },
          };
        }

        if (lower.includes("edit") || lower.includes("change")) {
          return {
            response: "What do you want to change?\n\n• \"change name\" — rename the jam\n• \"change date\" — update date/time\n• \"add spot\" — add another location\n• \"change type\" — switch locked/voting\n\nOr say \"confirm\" when ready.",
            updatedFlow: currentFlow,
          };
        }

        if (lower.includes("change name")) {
          return { response: "What's the new name?", updatedFlow: { ...currentFlow, step: "awaiting_name" } };
        }
        if (lower.includes("change date")) {
          return { response: "When's it happening? Give me a date and time.", updatedFlow: { ...currentFlow, step: "awaiting_datetime" } };
        }
        if (lower.includes("add spot")) {
          return { response: "Name a place to add.", updatedFlow: { ...currentFlow, step: "awaiting_spot" } };
        }
        if (lower.includes("change type")) {
          return { response: "Locked or voting?", updatedFlow: { ...currentFlow, step: "awaiting_type" } };
        }

        return {
          response: "Say \"confirm\" to create the jam, or tell me what to change.",
          updatedFlow: currentFlow,
        };
      }

      default:
        return { response: "", updatedFlow: currentFlow };
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Log implicit preferences from every query
    logImplicitPref(text);

    // Check if we're in a jam flow
    if (jamFlow.step) {
      const { response, updatedFlow, jamCreated } = processJamFlowInput(text, jamFlow);
      setJamFlow(updatedFlow);
      const delay = Math.min(300 + response.length * 1.2, 800);
      setTimeout(() => {
        setIsTyping(false);
        const botMsg: ChatMessage = {
          role: "assistant",
          text: response,
          timestamp: Date.now(),
          ...(jamCreated ? {
            jarvisActions: [{ type: "jam" as const, label: "Open Jams" }],
            jamCreated,
          } : {}),
        };
        setMessages(prev => [...prev, botMsg]);
      }, delay);
      return;
    }

    const response = findResponse(text, [...messages, userMsg]);

    // Special: trigger conversational jam flow
    if (response.text === "__JAM_FLOW__") {
      const friendListText = availableFriends.map(f =>
        `${f.available ? "✅" : "⛔"} ${f.name} — ${f.status} ${f.emoji}`
      ).join("\n");

      // Check if a friend name was mentioned in the input
      const lower = text.toLowerCase();
      const mentionedFriends: string[] = [];
      for (const f of availableFriends) {
        if (lower.includes(f.name.toLowerCase())) mentionedFriends.push(f.name);
      }

      if (mentionedFriends.length > 0) {
        // Skip friend selection, go to name
        setJamFlow({ ...emptyJamFlow, step: "awaiting_name", friends: mentionedFriends });
        const delay = 600;
        setTimeout(() => {
          setIsTyping(false);
          const botMsg: ChatMessage = {
            role: "assistant",
            text: `${mentionedFriends.join(" & ")} — nice pick! 🤙\n\nWhat should we call this jam? Give it a name (e.g. "Beach Crew", "Study Sesh").`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, botMsg]);
        }, delay);
      } else {
        // Show friend picker
        setJamFlow({ ...emptyJamFlow, step: "awaiting_friends" });
        const delay = 600;
        setTimeout(() => {
          setIsTyping(false);
          const botMsg: ChatMessage = {
            role: "assistant",
            text: `Let's set up a Jam! 🤙\n\nWho's coming? Here's your crew:\n\n${friendListText}\n\nTell me who to invite (e.g. "Alex and Jake", or "everyone available").`,
            timestamp: Date.now(),
            friendPicker: true,
          };
          setMessages(prev => [...prev, botMsg]);
        }, delay);
      }
      return;
    }

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
      setMessages(prev => [...prev, botMsg]);
    }, delay);
  }, [jamFlow, processJamFlowInput]);

  const handleSend = () => {
    sendMessage(input);
  };

  const handlePillClick = (pill: string) => {
    sendMessage(pill);
  };

  const [showConvoMenu, setShowConvoMenu] = useState(false);

  const clearHistory = () => {
    saveConvo(messages);
    const fresh: ChatMessage[] = [{ role: "assistant", text: initialGreeting, timestamp: Date.now() }];
    setMessages(fresh);
    saveMessages(fresh);
    setJamFlow(emptyJamFlow);
    setShowConvoMenu(false);
    toast.success("New conversation started");
  };

  const loadOldConvo = (convo: { messages: ChatMessage[] }) => {
    setMessages(convo.messages);
    setShowConvoMenu(false);
  };

  const pastConvos = loadConvos();

  const handleJarvisAction = (action: JarvisAction) => {
    switch (action.type) {
      case "plan": {
        // Extract location label for template pre-population
        const label = action.label;
        navigate("/plans", { state: { startCreate: true, planTemplate: label } });
        toast.success("Opening Plans — let's build something!");
        break;
      }
      case "jam":
        if (action.data?.placeId && action.data?.placeName) {
          navigate("/jams", { state: { startCreate: true, placeId: action.data.placeId, placeName: action.data.placeName } });
          toast.success(`Opening Jams with ${action.data.placeName}`);
        } else {
          navigate("/jams", { state: { startCreate: true } });
          toast.success("Opening Jams — let's get the crew together.");
        }
        break;
      case "pin":
        navigate("/explore");
        toast.success("Opening Explore — tap the pin icon to save.");
        break;
    }
  };

  const hasHistory = messages.length > 1;

  // Friend quick-select helper for jam flow
  const handleFriendQuickSelect = (friendName: string) => {
    sendMessage(friendName);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-white/5 to-transparent px-5 pt-2 pb-4 flex-shrink-0">
        <PageHeader />
        <div className="flex items-center gap-3 mt-2">
          <div className={`p-2 rounded-full border ${isDineMode ? "bg-[#FF8A65]/15 border-[#FF8A65]/20" : "bg-[#F2E8CF]/15 border-[#F2E8CF]/20"}`}>
            {isDineMode ? (
              <UtensilsCrossed size={28} className="text-[#FF8A65]" />
            ) : (
              <JarvisLogo size={28} className="text-[#F2E8CF]" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{isDineMode ? "Dine Bot" : "Jarvis"}</span>
              {isDineMode ? (
                <UtensilsCrossed size={14} className="text-[#FF8A65]" />
              ) : (
                <Sparkles size={14} className="text-[#F2E8CF]" />
              )}
            </h1>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDineMode ? "bg-[#FF8A65]" : "bg-[#F2E8CF]"}`} />
              <span className="text-[10px] text-white/40">
                {isDineMode ? "SLO food expert · Restaurants, cafés & more" : "SLO expert · Pins, plans & jams"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowConvoMenu(!showConvoMenu)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-white/50 active:scale-90 transition-all"
            title="Conversations"
          >
            <Menu size={14} />
          </button>
        </div>
      </div>

      {/* Conversation history drawer */}
      <AnimatePresence>
        {showConvoMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pb-2 flex-shrink-0"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 max-h-[30vh] overflow-y-auto">
              <button onClick={clearHistory}
                className="w-full text-left px-3 py-2.5 bg-[#F2E8CF]/10 border border-[#F2E8CF]/15 rounded-lg text-[11px] font-bold text-[#F2E8CF] active:scale-[0.97] transition-transform flex items-center gap-2">
                <RotateCcw size={11} /> New Conversation
              </button>
              {pastConvos.length === 0 ? (
                <p className="text-[10px] text-white/20 text-center py-2 italic">No past conversations</p>
              ) : (
                pastConvos.map(c => {
                  const firstUser = c.messages.find(m => m.role === "user");
                  const label = firstUser?.text?.slice(0, 40) || "Conversation";
                  const d = new Date(c.date);
                  return (
                    <button key={c.id} onClick={() => loadOldConvo(c)}
                      className="w-full text-left px-3 py-2 bg-white/5 border border-white/8 rounded-lg active:bg-white/10 transition-colors">
                      <p className="text-[11px] font-bold text-white/60 truncate">{label}</p>
                      <p className="text-[9px] text-white/25">{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jam flow indicator */}
      <AnimatePresence>
        {jamFlow.step && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 pb-2 flex-shrink-0"
          >
            <div className="flex items-center gap-2 bg-[#F2E8CF]/8 border border-[#F2E8CF]/15 rounded-lg px-3 py-2">
              <Users size={12} className="text-[#F2E8CF]" />
              <span className="text-[10px] font-bold text-[#F2E8CF]/70">Creating Jam</span>
              <div className="flex-1 flex gap-1 justify-end">
                {["friends", "name", "type", "datetime", "spot", "confirm"].map((s, i) => (
                  <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                    ["awaiting_friends", "awaiting_name", "awaiting_type", "awaiting_datetime", "awaiting_spot", "confirm"].indexOf(jamFlow.step!) >= i
                      ? "bg-[#F2E8CF]" : "bg-white/15"
                  }`} />
                ))}
              </div>
              <button
                onClick={() => { setJamFlow(emptyJamFlow); toast("Jam creation cancelled"); }}
                className="text-[10px] font-bold text-white/30 ml-2"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick action prompts */}
      {messages.length <= 2 && !isDineMode && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => {
                if (qa.label === "Train Jarvis") {
                  navigate("/profile");
                  toast("Head to Train Jarvis in your Profile!");
                } else if (qa.label === "Dine Bot") {
                  sendMessage(qa.prompt);
                } else {
                  sendMessage(qa.prompt);
                }
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#F2E8CF]/80 bg-[#F2E8CF]/8 px-3 py-1.5 rounded-full border border-[#F2E8CF]/15 active:bg-[#F2E8CF]/20 transition-colors"
            >
              {qa.label === "Dine Bot" ? <UtensilsCrossed size={9} /> : <Zap size={9} />} {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Dine Bot cuisine pills */}
      {isDineMode && messages.length <= 2 && (
        <div className="flex-shrink-0 overflow-x-auto px-4 pb-2">
          <div className="flex gap-1.5">
            {["🌮 Tacos", "🍕 Pizza", "🍣 Sushi", "🍔 Burgers", "🥞 Brunch", "🦐 Seafood", "🥗 Healthy", "☕ Coffee", "🍦 Dessert", "💰 Budget", "🌙 Late Night", "🍷 Wine", "🍺 Beer"].map((pill, i) => (
              <button key={i} onClick={() => handlePillClick(pill.split(" ").slice(1).join(" "))}
                className="bg-[#FF8A65]/8 text-[#FF8A65]/80 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-[#FF8A65]/15 whitespace-nowrap active:bg-[#FF8A65]/20 transition-colors"
              >{pill}</button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt suggestion pills — scrollable row with gentle auto-scroll */}
      {messages.length <= 2 && !isDineMode && (
        <div className="flex-shrink-0 overflow-x-auto px-4 pb-2 scrollbar-hide">
          <motion.div
            className="flex gap-1.5"
            animate={{ x: [0, -150, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          >
            {promptPills.map((pill, i) => (
              <button key={i} onClick={() => handlePillClick(pill)}
                className="bg-white/6 text-white/50 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-white/10 whitespace-nowrap active:bg-[#F2E8CF]/15 active:text-[#F2E8CF] active:border-[#F2E8CF]/20 transition-colors"
              >{pill}</button>
            ))}
          </motion.div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={`${idx}-${msg.timestamp || idx}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-[#4A6628] text-white rounded-br-sm"
                  : "bg-white/10 text-white/90 border border-white/10 rounded-bl-sm"
              }`}>
                {msg.text}
              </div>
            </motion.div>
      
            {msg.action && msg.role === "assistant" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="flex justify-start mt-1.5 ml-1"
              >
                <button
                  onClick={() => handleNavigate(msg.action!.path)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-3 py-1.5 rounded-full border border-[#F2E8CF]/20 active:bg-[#F2E8CF]/20 transition-colors"
                >
                  <ExternalLink size={11} /> {msg.action.label}
                </button>
              </motion.div>
            )}
            {/* Jarvis autonomy actions */}
            {msg.jarvisActions && msg.role === "assistant" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.25 }}
                className="flex gap-1.5 mt-1.5 ml-1 flex-wrap"
              >
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
              </motion.div>
            )}
            {/* Jam created success card */}
            {msg.jamCreated && msg.role === "assistant" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-2 ml-1"
              >
                <button
                  onClick={() => navigate("/jams")}
                  className="flex items-center gap-3 bg-[#8BC34A]/15 border border-[#8BC34A]/25 rounded-xl px-4 py-3 active:scale-95 transition-transform w-full max-w-[85%]"
                >
                  <div className="w-10 h-10 bg-[#8BC34A]/20 rounded-xl flex items-center justify-center">
                    <Check size={20} className="text-[#8BC34A]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-bold text-[#8BC34A]">Jam Created!</p>
                    <p className="text-[10px] text-white/40">{msg.jamCreated.name}</p>
                  </div>
                  <ChevronRight size={14} className="text-[#8BC34A]/50" />
                </button>
              </motion.div>
            )}
            {/* Friend quick-select buttons during jam flow */}
            {msg.friendPicker && msg.role === "assistant" && jamFlow.step === "awaiting_friends" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-1.5 mt-2 ml-1"
              >
                {availableFriends.filter(f => f.available).map(f => (
                  <button
                    key={f.name}
                    onClick={() => handleFriendQuickSelect(f.name)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-[#8BC34A] bg-[#8BC34A]/10 px-3 py-1.5 rounded-full border border-[#8BC34A]/20 active:bg-[#8BC34A]/20 transition-colors"
                  >
                    <span>{f.emoji}</span> {f.name}
                  </button>
                ))}
                <button
                  onClick={() => handleFriendQuickSelect("everyone available")}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-[#F2E8CF] bg-[#F2E8CF]/10 px-3 py-1.5 rounded-full border border-[#F2E8CF]/20 active:bg-[#F2E8CF]/20 transition-colors"
                >
                  <Users size={10} /> Everyone Available
                </button>
              </motion.div>
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

      {/* Input */}
      <div className="p-3 bg-gradient-to-t from-[#0d1208] via-[#0d1208]/90 to-transparent backdrop-blur-xl flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder={isDineMode ? "What are you craving?" : jamFlow.step ? "Reply to Jarvis..." : "Ask Jarvis anything..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          className={`flex-1 bg-white/10 rounded-full px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-1 border border-white/15 ${isDineMode ? "focus:ring-[#FF8A65]/30" : "focus:ring-[#F2E8CF]/30"}`}
        />
        <button onClick={handleSend} className={`p-2.5 rounded-full shadow-lg active:scale-90 transition-transform ${isDineMode ? "bg-[#FF8A65] text-[#1a2e10] shadow-[#FF8A65]/15" : "bg-[#F2E8CF] text-[#1a2e10] shadow-[#F2E8CF]/15"}`}>
          <Send size={18} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
