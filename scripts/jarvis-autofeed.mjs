const API_BASE = process.env.API_BASE || "http://localhost:8787";
const EMAIL = (process.env.JARVIS_AUTOFEED_EMAIL || "jarvis-autofeed@guest.local").trim().toLowerCase();
const PASSWORD = (process.env.JARVIS_AUTOFEED_PASSWORD || "autofeed-pass-1234").trim();
const DISPLAY_NAME = (process.env.JARVIS_AUTOFEED_NAME || "Jarvis Autofeed").trim();
const PHONE = (process.env.JARVIS_AUTOFEED_PHONE || "+15555550100").trim();
const INTERVAL_MS = Number(process.env.JARVIS_AUTOFEED_INTERVAL_MS || 3500);
const MAX_COUNT = Number(process.env.JARVIS_AUTOFEED_MAX_COUNT || 0);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { once: false, count: MAX_COUNT, interval: INTERVAL_MS };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--once") parsed.once = true;
    if (arg === "--count" && args[i + 1]) parsed.count = Number(args[i + 1]) || 0;
    if (arg === "--interval" && args[i + 1]) parsed.interval = Number(args[i + 1]) || INTERVAL_MS;
  }
  return parsed;
}

async function request(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const message = json?.error || `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return json;
}

async function getSessionToken() {
  try {
    const signin = await request("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    return signin.sessionToken;
  } catch {
    const signup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        displayName: DISPLAY_NAME,
        phone: PHONE
      })
    });
    return signup.sessionToken;
  }
}

async function fetchExploreItems(sessionToken) {
  const data = await request("/api/explore?category=all&sort=trending", {
    headers: { "x-session-token": sessionToken }
  });
  return Array.isArray(data?.items) ? data.items : [];
}

function buildPrompt(items) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const foodItems = items.filter((i) => /food|coffee|brew|cafe|restaurant/i.test(`${i.category} ${i.title}`));
  const hikeItems = items.filter((i) => /hike|trail|peak|outdoor/i.test(`${i.category} ${i.title} ${i.description}`));
  const beachItems = items.filter((i) => /beach|ocean|water|pier/i.test(`${i.category} ${i.title} ${i.description}`));
  const cheapItems = items.filter((i) => i.free || i.price === "$" || /free|cheap|budget/i.test(`${i.description}`));

  const templates = [
    () => `Find me something to do in SLO right now.`,
    () => `I don't know what to do today, give me 3 options and why.`,
    () => `Plan my day from 9 to 5 with study blocks and one fun activity.`,
    () => `What should I work on first? Then suggest a break spot nearby.`,
    () => `Give me breakfast recommendations near campus.`,
    () => `Best cheap eats in SLO under $$.`,
    () => `Recommend indoor activities because of bad weather.`,
    () => `Give me outdoor options if weather is sunny.`,
    () => `Date spot ideas for tonight in SLO.`,
    () => `Short hike recommendations under 3 miles.`,
    () => `Long hike recommendations over 5 miles.`,
    () => `Things to do near me with bus access.`,
    () => `What can wait until tomorrow? Also suggest a chill cafe.`,
    () => `Build a realistic low-stress plan for today.`,
    () => `I have 4 hours of deep work, make a plan and one reward activity.`,
    () => `Sort my tasks by urgency and importance, then suggest dinner.`,
    () => `Give me a morning routine for a student in SLO.`,
    () => `Help me plan tonight around my study load.`,
    () => `Find a place for lunch and a walk after.`,
    () => `Give me fun things to do this weekend in SLO.`,
    () => `Show me ${pick(categories) || "food"} spots I might like.`,
    () => `Suggest alternatives to ${pick(foodItems)?.title || "dinner"} with similar vibe.`,
    () => `Recommend a hike like ${pick(hikeItems)?.title || "Bishop Peak"} but less crowded.`,
    () => `What beach plan can I do around ${pick(beachItems)?.title || "Pismo"}?`,
    () => `What free or budget options do I have tonight?`,
    () => `Give me top picks based on my preferences and weather.`,
    () => `Make an agenda that includes lunch, study, and movement.`,
    () => `What are my top 3 priorities today and a place to decompress after?`,
    () => `Plan a shutdown routine and where to grab food after.`,
    () => `Suggest something spontaneous nearby.`,
    () => `I want to tan and swim today, what should I do?`,
    () => `I'm feeling burnt out. Give me 2 chill options and 1 productive option.`,
    () => `Recommend breakfast, lunch, and dinner spots for one day in SLO.`,
    () => `If I only have 90 minutes free, what should I do?`,
    () => `Recommend one safe solo activity tonight.`,
    () => `Give me something social to do with friends.`,
    () => `Give me a cozy indoor study + coffee combo.`,
    () => `Suggest a plan with low driving time.`,
    () => `Build my schedule for today and include commute buffers.`,
    () => `Pick something for me. I can't decide.`,
    () => `Nearby spots I can do if I have no car.`,
    () => `Create a time-blocked schedule and add one fun place.`,
    () => `Best option if I need to stay on budget today.`,
    () => `Find me a quick food stop before class.`,
    () => `What should I do tonight if it's cold and windy?`,
    () => `Which activity is best for a first date?`,
    () => `Plan a mini-adventure for this afternoon.`,
    () => `Give me one top recommendation right now and explain why.`,
    () => `What are good things to do today based on weather?`,
    () => `Give me an indoor fallback if it starts raining.`,
    () => `Recommend something from these categories: ${categories.slice(0, 3).join(", ") || "food, outdoors, study"}.`,
    () => `Show me places near campus that are open now.`,
    () => `Make me a quick 3-step plan for the next 2 hours.`,
    () => `Find activities where I can bring a friend.`,
    () => `Find me something low effort but worth it.`,
    () => `Give me top free picks from this list: ${cheapItems.slice(0, 3).map((i) => i.title).join(", ") || "none yet"}.`,
  ];

  return pick(templates)();
}

function randomContext() {
  return {
    weather: pick(["clear", "sunny", "windy", "cloudy", "rain"]),
    timeOfDay: pick(["morning", "afternoon", "evening", "night"]),
    activeScreen: pick(["/home", "/explore", "/study", "/plans", "/jarvis"])
  };
}

async function sendPrompt(sessionToken, message, context) {
  return request("/api/agent/chat", {
    method: "POST",
    headers: { "x-session-token": sessionToken },
    body: JSON.stringify({ message, context })
  });
}

async function run() {
  const { once, count, interval } = parseArgs();
  const boundedCount = once ? 1 : count;
  let sent = 0;

  let sessionToken = await getSessionToken();
  let items = [];
  try {
    items = await fetchExploreItems(sessionToken);
  } catch (error) {
    console.warn(`[autofeed] could not load explore items: ${error.message}`);
  }

  console.log(`[autofeed] running against ${API_BASE}`);
  console.log(`[autofeed] account: ${EMAIL}`);
  console.log(`[autofeed] loaded items: ${items.length}`);
  console.log(`[autofeed] interval: ${interval}ms`);
  if (boundedCount > 0) {
    console.log(`[autofeed] target count: ${boundedCount}`);
  } else {
    console.log("[autofeed] target count: infinite");
  }

  let stop = false;
  process.on("SIGINT", () => {
    stop = true;
    console.log("\n[autofeed] stopping...");
  });
  process.on("SIGTERM", () => {
    stop = true;
    console.log("\n[autofeed] stopping...");
  });

  while (!stop && (boundedCount <= 0 || sent < boundedCount)) {
    const message = buildPrompt(items);
    const context = randomContext();
    try {
      const data = await sendPrompt(sessionToken, message, context);
      sent += 1;
      const cardCount = Array.isArray(data?.cards) ? data.cards.length : 0;
      const actionCount = Array.isArray(data?.proposed_actions) ? data.proposed_actions.length : 0;
      console.log(
        `[autofeed] #${sent} ok | cards=${cardCount} actions=${actionCount} | "${message.slice(0, 92)}${message.length > 92 ? "..." : ""}"`
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      if (/session token|unauthorized|invalid/i.test(messageText)) {
        try {
          sessionToken = await getSessionToken();
          console.log("[autofeed] session refreshed");
          continue;
        } catch (refreshError) {
          console.log(`[autofeed] session refresh failed: ${refreshError.message}`);
        }
      }
      console.log(`[autofeed] error: ${messageText}`);
    }

    if (!stop && (boundedCount <= 0 || sent < boundedCount)) {
      const jitter = Math.floor(Math.random() * 500);
      await sleep(interval + jitter);
    }
  }

  console.log(`[autofeed] done. total sent=${sent}`);
}

run().catch((error) => {
  console.error(`[autofeed] fatal: ${error.message}`);
  process.exitCode = 1;
});
