const API_BASE = process.env.API_BASE || "http://localhost:8787";
const EMAIL = (process.env.JARVIS_TRAIN_EMAIL || "jarvis-train@guest.local").trim().toLowerCase();
const PASSWORD = (process.env.JARVIS_TRAIN_PASSWORD || "train-pass-1234").trim();
const DISPLAY_NAME = (process.env.JARVIS_TRAIN_NAME || "Jarvis Trainer").trim();
const PHONE = (process.env.JARVIS_TRAIN_PHONE || "+15555550100").trim();
const TARGET_COUNT = Number(process.env.JARVIS_TRAIN_COUNT || 1000);
const DELAY_MS = Number(process.env.JARVIS_TRAIN_DELAY_MS || 120);
const ROUNDS = Number(process.env.JARVIS_TRAIN_ROUNDS || 1);
const WRITE_REPORT = String(process.env.JARVIS_TRAIN_REPORT || "1") !== "0";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { count: TARGET_COUNT, delay: DELAY_MS, rounds: ROUNDS };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--count" && args[i + 1]) parsed.count = Number(args[i + 1]) || TARGET_COUNT;
    if (arg === "--delay" && args[i + 1]) parsed.delay = Number(args[i + 1]) || DELAY_MS;
    if (arg === "--rounds" && args[i + 1]) parsed.rounds = Number(args[i + 1]) || ROUNDS;
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

function buildPromptBank({ items = [], categories = [] }) {
  const itemNames = items.map((i) => i.title).filter(Boolean).slice(0, 24);
  const baseCategories = [...new Set([...categories, ...items.map((i) => i.category).filter(Boolean)])].slice(0, 20);

  const vibes = ["outdoor", "indoor", "food", "active", "chill", "social", "solo", "date"];
  const budgets = ["free", "cheap", "student budget", "under $20", "flexible budget"];
  const timings = ["right now", "today", "tonight", "this afternoon", "this weekend", "in 90 minutes"];
  const weathers = ["sunny", "rainy", "windy", "hot", "cold", "cloudy"];
  const mealPrompts = ["breakfast", "brunch", "lunch", "dinner", "late-night food", "coffee"];
  const lengths = ["short hike under 3 miles", "long hike over 5 miles", "easy trail", "challenging trail"];
  const transports = ["walk", "bike", "bus", "car", "no car"];
  const planning = [
    "Plan my day",
    "Build my schedule for today",
    "What should I work on first?",
    "Give me a realistic plan for the day",
    "Make an agenda from 9 to 5",
    "Create a time-blocked schedule",
    "Organize this list for me: class reading, gym, groceries, assignment",
    "What are my top 3 priorities today?",
    "Sort these by urgency and importance: calc hw, laundry, meal prep, gym",
    "What can wait until tomorrow?"
  ];
  const automation = [
    "Create a plan draft for tonight",
    "Add a study task called finish physics lab",
    "Help me RSVP to an event",
    "Join jam code DEMO42",
    "Create a booking intent for dinner",
    "What can you automate for me right now?",
    "Make me a reservation at Firestone for 2 at 7:30 PM",
    "Book a table for 4 tomorrow at 8 PM",
    "Set up a jam plan with my friends",
    "Add this to my plans and remind me later"
  ];
  const campus = [
    "What are good things to do in SLO after studying?",
    "Fun things to do in San Luis Obispo this weekend",
    "Recommend things near Cal Poly",
    "What should I do between classes?",
    "Give me options close to campus",
    "Any ideas for a chill evening in SLO?"
  ];
  const followUps = [
    "Make that cheaper",
    "Make that closer",
    "Give me one final pick",
    "Can you give me indoor backup options?",
    "What if it starts raining?",
    "Now optimize for less driving time",
    "Now optimize for best vibe",
    "Now optimize for study load",
    "Give me the top 3 only"
  ];

  const prompts = [];

  for (const p of planning) prompts.push(p);
  for (const p of automation) prompts.push(p);
  for (const p of campus) prompts.push(p);

  for (const vibe of vibes) {
    for (const budget of budgets) {
      for (const timing of timings) {
        prompts.push(`Find me something ${vibe} to do ${timing} on a ${budget}.`);
      }
    }
  }

  for (const weather of weathers) {
    for (const vibe of vibes) {
      prompts.push(`It's ${weather} in SLO. Recommend ${vibe} options.`);
      prompts.push(`Base my activities on ${weather} weather and my workload.`);
    }
  }

  for (const meal of mealPrompts) {
    for (const budget of budgets) {
      prompts.push(`Show me ${meal} spots in SLO on a ${budget}.`);
      prompts.push(`Best ${meal} near campus with ${budget}.`);
    }
  }

  for (const length of lengths) {
    prompts.push(`Recommend a ${length} in SLO.`);
    prompts.push(`I want ${length} and then food nearby.`);
  }

  for (const transport of transports) {
    prompts.push(`Things to do near me if I only use ${transport}.`);
    prompts.push(`Plan my evening with ${transport} only.`);
  }

  for (const category of baseCategories) {
    prompts.push(`Give me top ${category} picks in SLO.`);
    prompts.push(`Recommend ${category} options for tonight.`);
    prompts.push(`What are budget-friendly ${category} activities?`);
  }

  for (const name of itemNames) {
    prompts.push(`Is ${name} a good option for me today?`);
    prompts.push(`Give me alternatives to ${name} with similar vibe.`);
    prompts.push(`Should I do ${name} now or later?`);
  }

  for (let i = 0; i < 140; i += 1) {
    const vibe = vibes[i % vibes.length];
    const budget = budgets[i % budgets.length];
    const timing = timings[i % timings.length];
    const weather = weathers[i % weathers.length];
    const meal = mealPrompts[i % mealPrompts.length];
    const follow = followUps[i % followUps.length];
    prompts.push(
      `I'm a Cal Poly student. Give me a ${vibe} plan for ${timing}, weather is ${weather}, budget is ${budget}, include ${meal}, and ${follow}.`
    );
  }

  for (const f of followUps) {
    prompts.push(f);
    prompts.push(`Based on your last recommendation: ${f}.`);
  }

  prompts.push("What places are near me?");
  prompts.push("Indoor");
  prompts.push("Outdoor");
  prompts.push("Find me something to do.");
  prompts.push("I'm bored, choose for me.");
  prompts.push("I don't know what to do.");
  prompts.push("Can you automate all next steps with confirmation?");
  prompts.push("Build a low-stress day plan and include one fun activity.");
  prompts.push("Build a strict deadline plan with breaks.");
  prompts.push("What can wait until tomorrow and where should I go tonight?");
  prompts.push("Give me date spot ideas in SLO.");
  prompts.push("Swim and tan options for today.");
  prompts.push("Cheap food after studying.");
  prompts.push("Best hikes in SLO with distance.");
  prompts.push("What should I do today based on weather?");

  return [...new Set(prompts.map((p) => p.trim()).filter(Boolean))];
}

async function fetchTrainingData(sessionToken) {
  const [explore, context] = await Promise.all([
    request("/api/explore?category=all&sort=trending", {
      headers: { "x-session-token": sessionToken }
    }).catch(() => ({ items: [] })),
    request("/api/agent/context?weather=clear&timeOfDay=afternoon&activeScreen=/jarvis", {
      headers: { "x-session-token": sessionToken }
    }).catch(() => ({ user_context: {} }))
  ]);
  return {
    items: Array.isArray(explore?.items) ? explore.items : [],
    categories: Array.isArray(context?.user_context?.available_catalog_categories)
      ? context.user_context.available_catalog_categories
      : []
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
  const { count, delay, rounds } = parseArgs();
  const sessionToken = await getSessionToken();
  const trainingData = await fetchTrainingData(sessionToken);
  const promptBank = buildPromptBank(trainingData);

  if (!promptBank.length) {
    throw new Error("No prompts generated.");
  }

  const report = {
    startedAt: new Date().toISOString(),
    apiBase: API_BASE,
    email: EMAIL,
    rounds,
    requestedCount: count,
    sent: 0,
    failed: 0,
    withCards: 0,
    withActions: 0,
    noText: 0,
    errors: [],
    samples: [],
    roundSummaries: []
  };

  console.log(`[jarvis-train] API: ${API_BASE}`);
  console.log(`[jarvis-train] user: ${EMAIL}`);
  console.log(`[jarvis-train] prompt bank: ${promptBank.length}`);
  console.log(`[jarvis-train] running prompts per round: ${count}`);

  for (let round = 1; round <= rounds; round += 1) {
    let prompts = shuffle(promptBank);
    while (prompts.length < count) {
      prompts = prompts.concat(shuffle(promptBank));
    }
    prompts = prompts.slice(0, count);

    const roundSummary = {
      round,
      sent: 0,
      failed: 0,
      withCards: 0,
      withActions: 0,
      noText: 0
    };
    console.log(`[jarvis-train] round ${round}/${rounds} started`);

    for (let i = 0; i < prompts.length; i += 1) {
      const message = prompts[i];
      const context = {
        weather: ["clear", "sunny", "windy", "rain"][i % 4],
        timeOfDay: ["morning", "afternoon", "evening", "night"][i % 4],
        activeScreen: ["/jarvis", "/explore", "/study", "/plans"][i % 4],
        trainingRun: true,
        trainingRound: round,
        trainingIndex: i + 1
      };

      try {
        const data = await sendPrompt(sessionToken, message, context);
        const assistantText = String(data?.assistant_text || "").trim();
        const cards = Array.isArray(data?.cards) ? data.cards.length : 0;
        const actions = Array.isArray(data?.proposed_actions) ? data.proposed_actions.length : 0;

        report.sent += 1;
        roundSummary.sent += 1;
        if (cards > 0) {
          report.withCards += 1;
          roundSummary.withCards += 1;
        }
        if (actions > 0) {
          report.withActions += 1;
          roundSummary.withActions += 1;
        }
        if (!assistantText) {
          report.noText += 1;
          roundSummary.noText += 1;
        }
        if (report.samples.length < 30) {
          report.samples.push({
            prompt: message,
            textPreview: assistantText.slice(0, 220),
            cards,
            actions
          });
        }

        if ((i + 1) % 25 === 0 || i === prompts.length - 1) {
          console.log(
            `[jarvis-train] round ${round}/${rounds} ${i + 1}/${prompts.length} | cards=${roundSummary.withCards} actions=${roundSummary.withActions} failed=${roundSummary.failed}`
          );
        }
      } catch (error) {
        report.failed += 1;
        roundSummary.failed += 1;
        if (report.errors.length < 80) {
          report.errors.push({
            prompt: message,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (delay > 0) await sleep(delay);
    }

    report.roundSummaries.push(roundSummary);
    console.log(
      `[jarvis-train] round ${round}/${rounds} done | sent=${roundSummary.sent} failed=${roundSummary.failed} withCards=${roundSummary.withCards} withActions=${roundSummary.withActions}`
    );
  }

  report.finishedAt = new Date().toISOString();
  console.log(
    `[jarvis-train] done | sent=${report.sent} failed=${report.failed} withCards=${report.withCards} withActions=${report.withActions} noText=${report.noText}`
  );

  if (WRITE_REPORT) {
    const fs = await import("node:fs/promises");
    const outDir = "tmp";
    const outFile = `${outDir}/jarvis-train-report.json`;
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outFile, JSON.stringify(report, null, 2), "utf8");
    console.log(`[jarvis-train] report written: ${outFile}`);
  }
}

run().catch((error) => {
  console.error(`[jarvis-train] fatal: ${error.message}`);
  process.exitCode = 1;
});
