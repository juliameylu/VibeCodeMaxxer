import OpenAI from "openai";
import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

let openai = null;
const AWS_REGION = process.env.AWS_REGION || "";
const AWS_DYNAMO_TABLE = process.env.AWS_DYNAMO_TABLE || "";
const AWS_STATE_PK = process.env.AWS_STATE_PK || "planner_state";
const AWS_STATE_SK = process.env.AWS_STATE_SK || "v1";
const SNAPSHOT_FLUSH_MS = Number(process.env.SNAPSHOT_FLUSH_MS || 2000);
const AUTH_MODE = process.env.AUTH_MODE || "session_or_cognito";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID || "";
const COGNITO_ISSUER = COGNITO_USER_POOL_ID && AWS_REGION
  ? `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`
  : "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";
const DEMO_TARGET_NUMBER = process.env.DEMO_TARGET_NUMBER || "";
const DEMO_SMS_TARGET_NUMBER = process.env.DEMO_SMS_TARGET_NUMBER || "";
const TWILIO_PUBLIC_BASE_URL = process.env.TWILIO_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "";
const JARVIS_CALL_TONE = process.env.JARVIS_CALL_TONE || "casual";
const DEMO_GUEST_PHONE_NUMBER = process.env.DEMO_GUEST_PHONE_NUMBER || "";
const DEMO_USER_PHONE_MAP_JSON = process.env.DEMO_USER_PHONE_MAP_JSON || "{}";
const RESERVATION_CALL_MAX_SECONDS = 120;
const RESERVATION_CALL_MAX_RETRIES = 1;
const SMS_NOTIFICATIONS_ENABLED = false;
const USE_AWS_STATE = Boolean(AWS_REGION && AWS_DYNAMO_TABLE);
const dynamo = USE_AWS_STATE
  ? DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }))
  : null;
const snapshotKey = { pk: AWS_STATE_PK, sk: AWS_STATE_SK };
const cognitoJwks = COGNITO_ISSUER ? createRemoteJWKSet(new URL(`${COGNITO_ISSUER}/.well-known/jwks.json`)) : null;
let storeDirty = false;
let snapshotWriteInFlight = null;
let twilioClient = null;

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
  studyTasks: [],
  aiActionLogs: [],
  messageDeliveries: [],
  pendingActions: new Map(),
  reservationCallJobs: new Map(),
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

function markStoreDirty() {
  storeDirty = true;
}

function serializeStore() {
  return {
    ...store,
    users: Object.fromEntries(store.users.entries()),
    sessions: Object.fromEntries(store.sessions.entries()),
    preferences: Object.fromEntries(store.preferences.entries()),
    connections: Object.fromEntries(store.connections.entries()),
    pendingActions: Object.fromEntries(store.pendingActions.entries()),
    reservationCallJobs: Object.fromEntries(store.reservationCallJobs.entries()),
    messageDeliveries: store.messageDeliveries
  };
}

function hydrateStore(snapshot) {
  if (!snapshot) return;
  store.users = new Map(Object.entries(snapshot.users || {}));
  store.sessions = new Map(Object.entries(snapshot.sessions || {}));
  store.preferences = new Map(Object.entries(snapshot.preferences || {}));
  store.connections = new Map(Object.entries(snapshot.connections || {}));
  store.pendingActions = new Map(Object.entries(snapshot.pendingActions || {}));
  store.reservationCallJobs = new Map(Object.entries(snapshot.reservationCallJobs || {}));
  store.messageDeliveries = snapshot.messageDeliveries || [];
  store.userEventStates = snapshot.userEventStates || [];
  store.groups = snapshot.groups || [];
  store.groupMembers = snapshot.groupMembers || [];
  store.invites = snapshot.invites || [];
  store.plans = snapshot.plans || [];
  store.planParticipants = snapshot.planParticipants || [];
  store.jams = snapshot.jams || [];
  store.jamMembers = snapshot.jamMembers || [];
  store.studyTasks = snapshot.studyTasks || [];
  store.aiActionLogs = snapshot.aiActionLogs || [];
  store.eventsCatalog = snapshot.eventsCatalog || store.eventsCatalog;
}

async function loadStoreSnapshot() {
  if (!dynamo) return;
  try {
    const out = await dynamo.send(new GetCommand({
      TableName: AWS_DYNAMO_TABLE,
      Key: snapshotKey
    }));
    if (!out.Item?.payload) return;
    hydrateStore(out.Item.payload.store);
    console.log("Loaded planner state snapshot from DynamoDB");
  } catch (error) {
    console.error("Failed to load planner snapshot:", error?.message || error);
  }
}

async function flushStoreSnapshot(force = false) {
  if (!dynamo) return;
  if (!force && !storeDirty) return;
  if (snapshotWriteInFlight) return snapshotWriteInFlight;
  snapshotWriteInFlight = dynamo.send(new PutCommand({
    TableName: AWS_DYNAMO_TABLE,
    Item: {
      ...snapshotKey,
      payload: {
        store: serializeStore(),
        updated_at: NOW().toISOString()
      }
    }
  }))
    .then(() => {
      storeDirty = false;
    })
    .catch((error) => {
      console.error("Failed to save planner snapshot:", error?.message || error);
    })
    .finally(() => {
      snapshotWriteInFlight = null;
    });
  return snapshotWriteInFlight;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (String(value || "").trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

function isLikelyE164(value) {
  return /^\+\d{10,15}$/.test(String(value || ""));
}

function canUseTwilio() {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && DEMO_TARGET_NUMBER && TWILIO_PUBLIC_BASE_URL);
}

function missingTwilioConfigKeys() {
  const required = {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    DEMO_TARGET_NUMBER,
    TWILIO_PUBLIC_BASE_URL
  };
  return Object.entries(required)
    .filter(([, value]) => !String(value || "").trim())
    .map(([key]) => key);
}

function twilioWebhookUrl(path) {
  const base = TWILIO_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

function getTwilioClient() {
  if (!canUseTwilio()) return null;
  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

function parseDemoUserPhoneMap() {
  try {
    const parsed = JSON.parse(DEMO_USER_PHONE_MAP_JSON || "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function resolveSignupPhone(email, submittedPhone) {
  const normalizedSubmitted = normalizePhone(submittedPhone);
  if (isLikelyE164(normalizedSubmitted)) return normalizedSubmitted;

  const phoneMap = parseDemoUserPhoneMap();
  const mapped = normalizePhone(phoneMap[normalizeEmail(email)] || "");
  if (isLikelyE164(mapped)) return mapped;

  if (normalizeEmail(email).endsWith("@guest.local")) {
    const guestFallback = normalizePhone(DEMO_GUEST_PHONE_NUMBER);
    if (isLikelyE164(guestFallback)) return guestFallback;
    return "+15550000000";
  }
  return "";
}

function requireSession(req, res) {
  if (req.cognitoUser?.userId) {
    return { token: "cognito", userId: req.cognitoUser.userId, user: req.cognitoUser.user };
  }
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

function rankedRecommendations(userId, { weather = "clear", timeOfDay = "evening" } = {}) {
  const prefs = getOrInitPreferences(userId);
  const studyLoad = computeStudyLoad(userId);

  return store.eventsCatalog
    .map((event) => ({
      ...event,
      score: scoreEvent({ event, prefs, studyLoad, weather, timeOfDay }),
      study_load_score: studyLoad.study_load_score,
      reason_tags: [...event.reasonTags, `study-score-${studyLoad.study_load_score}`]
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
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

async function generateReservationCallScript({ restaurantName, partySize, reservationTime, specialRequest }) {
  const fallback = [
    `Hi, this is an AI assistant helping someone book a table at ${restaurantName}.`,
    `Could you check if you have room for ${partySize} people at ${reservationTime}?`,
    specialRequest ? `Also, quick note: ${specialRequest}.` : null
  ].filter(Boolean).join(" ");

  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `Write a ${JARVIS_CALL_TONE} but polite phone script for a reservation request. Plain text only. Keep under 90 words.`
        },
        {
          role: "user",
          content: JSON.stringify({
            restaurantName,
            partySize,
            reservationTime,
            specialRequest,
            requirements: [
              "State this is an AI assistant calling on behalf of a customer.",
              "Ask politely for reservation confirmation."
            ]
          })
        }
      ]
    });
    const text = String(response.output_text || "").trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function sendGroupReservationSms({ userId, groupId, restaurantName, partySize, reservationTime }) {
  if (!SMS_NOTIFICATIONS_ENABLED) {
    return {
      sent: 0,
      failed: 0,
      recipients: [],
      errors: [
        "SMS demo paused: we were close to shipping group confirmation texts, but approval timing did not complete before the demo window."
      ]
    };
  }

  const client = getTwilioClient();
  const from = normalizePhone(TWILIO_PHONE_NUMBER);
  if (!client || !isLikelyE164(from)) {
    return { sent: 0, failed: 0, recipients: [], errors: ["Twilio SMS not configured"] };
  }

  const demoSmsOverride = normalizePhone(DEMO_SMS_TARGET_NUMBER);
  if (isLikelyE164(demoSmsOverride)) {
    const body = `Reservation confirmed at ${restaurantName} for ${partySize} at ${reservationTime}.`;
    try {
      const sms = await client.messages.create({
        to: demoSmsOverride,
        from,
        body
      });
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_demo_override",
        provider_ref: sms.sid,
        status: "sent",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: groupId,
          to: demoSmsOverride,
          override: true
        }
      });
      markStoreDirty();
      return {
        sent: 1,
        failed: 0,
        recipients: [{ phone: demoSmsOverride, user_id: null, display_name: "Demo SMS Target" }],
        errors: []
      };
    } catch (error) {
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_demo_override",
        provider_ref: "",
        status: "failed",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: groupId,
          to: demoSmsOverride,
          override: true,
          error: error instanceof Error ? error.message : "send failed"
        }
      });
      markStoreDirty();
      return {
        sent: 0,
        failed: 1,
        recipients: [{ phone: demoSmsOverride, user_id: null, display_name: "Demo SMS Target" }],
        errors: ["Failed SMS to demo override number"]
      };
    }
  }

  if (groupId === "creator-only") {
    const owner = store.users.get(userId);
    const ownerPhone = normalizePhone(owner?.phone || "");
    if (!isLikelyE164(ownerPhone)) {
      return { sent: 0, failed: 0, recipients: [], errors: ["Creator phone is missing or invalid"] };
    }
    const body = `Reservation confirmed at ${restaurantName} for ${partySize} at ${reservationTime}.`;
    try {
      const sms = await client.messages.create({
        to: ownerPhone,
        from,
        body
      });
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_creator_notify",
        provider_ref: sms.sid,
        status: "sent",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: "creator-only",
          to: ownerPhone
        }
      });
      markStoreDirty();
      return {
        sent: 1,
        failed: 0,
        recipients: [{ phone: ownerPhone, user_id: userId, display_name: owner?.display_name || "Creator" }],
        errors: []
      };
    } catch (error) {
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_creator_notify",
        provider_ref: "",
        status: "failed",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: "creator-only",
          to: ownerPhone,
          error: error instanceof Error ? error.message : "send failed"
        }
      });
      markStoreDirty();
      return {
        sent: 0,
        failed: 1,
        recipients: [{ phone: ownerPhone, user_id: userId, display_name: owner?.display_name || "Creator" }],
        errors: ["Failed SMS to creator"]
      };
    }
  }

  const group = store.groups.find((item) => item.id === groupId && item.owner_user_id === userId);
  if (!group) {
    return { sent: 0, failed: 0, recipients: [], errors: ["Selected group not found"] };
  }

  const members = store.groupMembers.filter((item) => item.group_id === group.id);
  const dedupe = new Set();
  const recipients = [];
  for (const member of members) {
    let phone = "";
    if (member.user_id) {
      const user = store.users.get(member.user_id);
      phone = normalizePhone(user?.phone || "");
    } else {
      phone = normalizePhone(member.phone || "");
    }
    if (!isLikelyE164(phone) || dedupe.has(phone)) continue;
    dedupe.add(phone);
    recipients.push({
      phone,
      member_id: member.id,
      user_id: member.user_id || null,
      display_name: member.display_name || "Member"
    });
  }

  if (recipients.length === 0) {
    const owner = store.users.get(userId);
    const ownerPhone = normalizePhone(owner?.phone || "");
    if (isLikelyE164(ownerPhone) && !dedupe.has(ownerPhone)) {
      recipients.push({
        phone: ownerPhone,
        member_id: "owner-fallback",
        user_id: userId,
        display_name: owner?.display_name || "Owner"
      });
      dedupe.add(ownerPhone);
    }
  }

  if (recipients.length === 0) {
    return { sent: 0, failed: 0, recipients: [], errors: ["No valid recipient phone numbers in selected group or owner profile"] };
  }

  const body = `Reservation confirmed at ${restaurantName} for ${partySize} at ${reservationTime}.`;
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const recipient of recipients) {
    try {
      const sms = await client.messages.create({
        to: recipient.phone,
        from,
        body
      });
      sent += 1;
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_group_notify",
        provider_ref: sms.sid,
        status: "sent",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: groupId,
          to: recipient.phone
        }
      });
    } catch (error) {
      failed += 1;
      errors.push(`Failed SMS to ${recipient.phone}`);
      store.messageDeliveries.push({
        id: randomUUID(),
        user_id: userId,
        channel: "sms",
        template: "reservation_confirmed_group_notify",
        provider_ref: "",
        status: "failed",
        sent_at: NOW().toISOString(),
        meta: {
          group_id: groupId,
          to: recipient.phone,
          error: error instanceof Error ? error.message : "send failed"
        }
      });
    }
  }
  markStoreDirty();
  return { sent, failed, recipients, errors };
}

async function placeReservationCallAttempt(jobId, attemptIndex) {
  const client = getTwilioClient();
  if (!client) {
    throw new Error("Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DEMO_TARGET_NUMBER, and TWILIO_PUBLIC_BASE_URL.");
  }
  const job = store.reservationCallJobs.get(jobId);
  if (!job) {
    throw new Error("Call job not found");
  }

  const call = await client.calls.create({
    to: job.target_number,
    from: normalizePhone(TWILIO_PHONE_NUMBER),
    url: twilioWebhookUrl(`/api/twilio/voice/reservation-twiml?jobId=${encodeURIComponent(jobId)}`),
    statusCallback: twilioWebhookUrl(`/api/twilio/voice/status?jobId=${encodeURIComponent(jobId)}&attempt=${attemptIndex}`),
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    timeout: 20,
    timeLimit: RESERVATION_CALL_MAX_SECONDS
  });

  const attemptRecord = {
    attempt_index: attemptIndex,
    call_sid: call.sid,
    status: call.status || "queued",
    created_at: NOW().toISOString(),
    updated_at: NOW().toISOString()
  };

  const attempts = Array.isArray(job.attempts) ? [...job.attempts] : [];
  const existingIndex = attempts.findIndex((item) => item.attempt_index === attemptIndex);
  if (existingIndex >= 0) {
    attempts[existingIndex] = attemptRecord;
  } else {
    attempts.push(attemptRecord);
  }

  job.attempts = attempts;
  job.current_attempt = attemptIndex;
  job.call_sid = call.sid;
  job.status = attemptIndex > 0 ? "retrying" : "calling";
  job.updated_at = NOW().toISOString();
  store.reservationCallJobs.set(jobId, job);
  markStoreDirty();
  return call;
}

export function registerPlannerApi(app) {
  loadStoreSnapshot().catch(() => {});
  setInterval(() => {
    flushStoreSnapshot(false).catch(() => {});
  }, SNAPSHOT_FLUSH_MS);

  app.use((req, res, next) => {
    res.on("finish", () => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && res.statusCode < 400) {
        markStoreDirty();
      }
    });
    next();
  });

  app.use(async (req, res, next) => {
    const auth = req.header("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return next();
    }
    if (AUTH_MODE === "session") {
      return next();
    }
    if (!cognitoJwks || !COGNITO_ISSUER) {
      return next();
    }
    const token = auth.slice(7).trim();
    if (!token) {
      return next();
    }
    try {
      const { payload } = await jwtVerify(token, cognitoJwks, {
        issuer: COGNITO_ISSUER
      });
      const tokenUse = String(payload.token_use || "");
      if (tokenUse !== "id" && tokenUse !== "access") {
        return next();
      }
      if (COGNITO_APP_CLIENT_ID && tokenUse === "id" && payload.aud !== COGNITO_APP_CLIENT_ID) {
        return next();
      }
      const userId = String(payload.sub || "");
      if (!userId) {
        return next();
      }
      const email = normalizeEmail(payload.email || `${userId}@cognito.local`);
      let user = store.users.get(userId);
      if (!user) {
        user = {
          id: userId,
          email,
          display_name: String(payload.name || payload["cognito:username"] || "SLO Student"),
          cal_poly_email: email.endsWith("@calpoly.edu") ? email : "",
          onboarding_complete: false,
          created_at: NOW().toISOString(),
          password: null
        };
        store.users.set(userId, user);
        getOrInitPreferences(userId);
        getOrInitConnections(userId);
        markStoreDirty();
      }
      req.cognitoUser = { userId, user };
      return next();
    } catch {
      return next();
    }
  });

  app.post("/api/auth/signup", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim() || "SLO Student";
    const phone = resolveSignupPhone(email, req.body?.phone);

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (!phone) {
      res.status(400).json({ error: "phone is required (E.164 format like +15551234567)" });
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
      phone,
      onboarding_complete: false,
      created_at: NOW().toISOString(),
      password
    };

    store.users.set(userId, user);
    getOrInitPreferences(userId);
    getOrInitConnections(userId);
    markStoreDirty();

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, userId);

    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone,
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
    markStoreDirty();
    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone || "",
        onboarding_complete: user.onboarding_complete
      }
    });
  });

  app.post("/api/auth/demo-session", (req, res) => {
    const email = normalizeEmail(req.body?.email || "demo@polyjarvis.local");
    const displayName = String(req.body?.display_name || "Demo User").trim() || "Demo User";

    let user = [...store.users.values()].find((candidate) => candidate.email === email);
    if (!user) {
      user = {
        id: randomUUID(),
        email,
        password: randomUUID(),
        display_name: displayName,
        phone: normalizePhone(req.body?.phone || DEMO_GUEST_PHONE_NUMBER || ""),
        onboarding_complete: false,
        created_at: NOW().toISOString()
      };
      store.users.set(user.id, user);
    }

    const sessionToken = randomUUID();
    store.sessions.set(sessionToken, user.id);
    markStoreDirty();

    res.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        phone: user.phone || "",
        onboarding_complete: Boolean(user.onboarding_complete)
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
        phone: user.phone || "",
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
    markStoreDirty();

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
    markStoreDirty();

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
    markStoreDirty();

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
    markStoreDirty();

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
    markStoreDirty();

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
    markStoreDirty();

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
    store.groupMembers.push({
      id: randomUUID(),
      group_id: group.id,
      member_type: "user",
      user_id: auth.userId,
      phone: auth.user.phone || null,
      email: auth.user.email || null,
      display_name: auth.user.display_name || "You"
    });
    markStoreDirty();

    res.json({ group });
  });

  app.get("/api/groups", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const groups = store.groups
      .filter((group) => group.owner_user_id === auth.userId)
      .map((group) => ({
        ...group,
        members: store.groupMembers
          .filter((member) => member.group_id === group.id)
          .map((member) => {
            if (member.user_id) {
              const linked = store.users.get(member.user_id);
              return {
                ...member,
                phone: linked?.phone || member.phone || null,
                email: linked?.email || member.email || null
              };
            }
            return member;
          })
      }));

    res.json({ groups });
  });

  app.get("/api/users/directory", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const users = [...store.users.values()]
      .filter((user) => user.id !== auth.userId)
      .map((user) => ({
        id: user.id,
        display_name: user.display_name || "User",
        email: user.email || "",
        phone: user.phone || ""
      }));
    res.json({ users });
  });

  app.post("/api/groups/:groupId/members", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const group = store.groups.find((candidate) => candidate.id === req.params.groupId && candidate.owner_user_id === auth.userId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const requestedUserId = String(req.body?.user_id || "").trim();
    const linkedUser = requestedUserId ? store.users.get(requestedUserId) : null;
    if (requestedUserId && !linkedUser) {
      res.status(404).json({ error: "Selected user not found" });
      return;
    }

    const member = {
      id: randomUUID(),
      group_id: group.id,
      member_type: linkedUser ? "user" : "external_contact",
      user_id: linkedUser?.id || null,
      phone: linkedUser?.phone || req.body?.phone || null,
      email: linkedUser?.email || req.body?.email || null,
      display_name: linkedUser?.display_name || req.body?.display_name || "New member"
    };

    store.groupMembers.push(member);
    markStoreDirty();
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
    markStoreDirty();

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
      }
    }
    markStoreDirty();

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
    markStoreDirty();
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
    markStoreDirty();

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
    markStoreDirty();

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
    markStoreDirty();

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
    }
    markStoreDirty();

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
    markStoreDirty();
    res.json({ declined: true, jam });
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
    markStoreDirty();

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
    markStoreDirty();
    res.json({ task, study_load: computeStudyLoad(auth.userId) });
  });

  app.post("/api/agent/call/start", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    if (!canUseTwilio()) {
      const missing = missingTwilioConfigKeys();
      res.status(500).json({
        error: "Twilio call feature is not configured. Please set Twilio credentials and TWILIO_PUBLIC_BASE_URL.",
        missing
      });
      return;
    }

    const restaurantName = String(req.body?.restaurant_name || "Restaurant").trim();
    const reservationTime = String(req.body?.reservation_time || "").trim();
    const specialRequest = String(req.body?.special_request || "").trim();
    const partySize = Math.max(1, Math.min(20, Number(req.body?.party_size || 2)));
    const selectedGroupId = String(req.body?.group_id || "").trim();
    const requestedTarget = normalizePhone(req.body?.target_number || DEMO_TARGET_NUMBER);
    const allowedTarget = normalizePhone(DEMO_TARGET_NUMBER);

    if (!reservationTime) {
      res.status(400).json({ error: "reservation_time is required" });
      return;
    }
    if (!selectedGroupId) {
      res.status(400).json({ error: "group_id is required to notify one selected group on confirmation" });
      return;
    }
    const selectedGroup = store.groups.find((group) => group.id === selectedGroupId && group.owner_user_id === auth.userId);
    if (!selectedGroup && selectedGroupId !== "creator-only") {
      res.status(404).json({ error: "Selected group not found" });
      return;
    }
    if (!allowedTarget || requestedTarget !== allowedTarget) {
      res.status(400).json({ error: "Only the configured DEMO_TARGET_NUMBER can be called in demo mode." });
      return;
    }

    const voiceScript = await generateReservationCallScript({
      restaurantName,
      partySize,
      reservationTime,
      specialRequest
    });

    const jobId = randomUUID();
    const nowIso = NOW().toISOString();
    const job = {
      job_id: jobId,
      user_id: auth.userId,
      restaurant_name: restaurantName,
      reservation_time: reservationTime,
      party_size: partySize,
      special_request: specialRequest,
      group_id: selectedGroupId,
      target_number: allowedTarget,
      caller_number: normalizePhone(TWILIO_PHONE_NUMBER),
      status: "queued",
      max_duration_seconds: RESERVATION_CALL_MAX_SECONDS,
      max_retries: RESERVATION_CALL_MAX_RETRIES,
      voice_script: voiceScript,
      attempts: [],
      retry_used: 0,
      call_sid: null,
      decision_digit: "",
      reservation_decision: "pending",
      sms_notifications: {
        state: "pending",
        sent: 0,
        failed: 0,
        recipients: 0,
        errors: []
      },
      last_error: "",
      created_at: nowIso,
      updated_at: nowIso
    };
    store.reservationCallJobs.set(jobId, job);
    markStoreDirty();

    try {
      await placeReservationCallAttempt(jobId, 0);
      const next = store.reservationCallJobs.get(jobId);
      res.status(201).json({ call_job: next });
    } catch (error) {
      const failed = store.reservationCallJobs.get(jobId);
      failed.status = "failed";
      failed.last_error = error instanceof Error ? error.message : "Could not place call";
      failed.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, failed);
      markStoreDirty();
      res.status(502).json({ error: failed.last_error });
    }
  });

  app.get("/api/agent/call/:jobId", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;
    const job = store.reservationCallJobs.get(req.params.jobId);
    if (!job || job.user_id !== auth.userId) {
      res.status(404).json({ error: "Call job not found" });
      return;
    }
    res.json({ call_job: job });
  });

  app.post("/api/twilio/voice/reservation-twiml", (req, res) => {
    const jobId = String(req.query?.jobId || "");
    const job = store.reservationCallJobs.get(jobId);
    if (!job) {
      res.status(404).type("text/xml").send("<Response><Say>Call request not found.</Say></Response>");
      return;
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: "alice", language: "en-US" }, job.voice_script || "Hello. This is a reservation request.");
    twiml.pause({ length: 1 });
    const gather = twiml.gather({
      input: "dtmf",
      numDigits: 1,
      action: twilioWebhookUrl(`/api/twilio/voice/input?jobId=${encodeURIComponent(jobId)}`),
      method: "POST",
      timeout: 7,
      actionOnEmptyResult: true
    });
    gather.say(
      { voice: "alice", language: "en-US" },
      "To confirm this reservation request, press 1. If this time does not work, press 2."
    );
    twiml.say({ voice: "alice", language: "en-US" }, "No selection received. This request will be marked as declined due to timeout.");
    twiml.hangup();

    job.status = "in-progress";
    job.updated_at = NOW().toISOString();
    store.reservationCallJobs.set(jobId, job);
    markStoreDirty();

    res.type("text/xml").send(twiml.toString());
  });

  app.post("/api/twilio/voice/input", async (req, res) => {
    const jobId = String(req.query?.jobId || "");
    const digit = String(req.body?.Digits || "").trim();
    const job = store.reservationCallJobs.get(jobId);
    if (!job) {
      res.status(404).type("text/xml").send("<Response><Say>Call request not found.</Say></Response>");
      return;
    }

    const twiml = new twilio.twiml.VoiceResponse();
    job.decision_digit = digit;

    if (digit === "1") {
      job.reservation_decision = "confirmed";
      job.status = "reservation-confirmed";
      twiml.say({ voice: "alice", language: "en-US" }, "Thank you. Reservation confirmed.");
      // SMS workflow intentionally paused for demo approval timing.
      // If re-enabled, call `sendGroupReservationSms(...)` here and map provider results.
      job.sms_notifications = {
        state: "paused",
        sent: 0,
        failed: 0,
        recipients: 0,
        errors: [
          "SMS demo paused: we were close to shipping group confirmation texts, but approval timing did not complete before the demo window."
        ]
      };
    } else if (digit === "2") {
      job.reservation_decision = "declined";
      job.status = "reservation-declined";
      twiml.say({ voice: "alice", language: "en-US" }, "Thank you. We have marked this request as declined.");
    } else if (!digit) {
      job.decision_digit = "2";
      job.reservation_decision = "declined-timeout";
      job.status = "reservation-timeout";
      twiml.say({ voice: "alice", language: "en-US" }, "No selection received. This request is marked as declined due to timeout.");
    } else {
      job.reservation_decision = "no-response";
      job.status = "awaiting-followup";
      twiml.say({ voice: "alice", language: "en-US" }, "No valid selection was received.");
    }

    job.updated_at = NOW().toISOString();
    store.reservationCallJobs.set(jobId, job);
    markStoreDirty();

    twiml.say({ voice: "alice", language: "en-US" }, "Goodbye.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  });

  app.post("/api/twilio/voice/status", async (req, res) => {
    const jobId = String(req.query?.jobId || "");
    const attemptIndex = Number(req.query?.attempt || 0);
    const callStatus = String(req.body?.CallStatus || "").toLowerCase();
    const callSid = String(req.body?.CallSid || "");
    const job = store.reservationCallJobs.get(jobId);

    if (!job) {
      res.status(200).json({ ok: true });
      return;
    }

    const attempts = Array.isArray(job.attempts) ? [...job.attempts] : [];
    const idx = attempts.findIndex((item) => item.attempt_index === attemptIndex || item.call_sid === callSid);
    if (idx >= 0) {
      attempts[idx] = {
        ...attempts[idx],
        status: callStatus || attempts[idx].status,
        call_sid: callSid || attempts[idx].call_sid,
        updated_at: NOW().toISOString()
      };
    }
    job.attempts = attempts;

    const retryableStatuses = new Set(["busy", "failed", "no-answer", "canceled"]);
    if (retryableStatuses.has(callStatus)) {
      if ((job.retry_used || 0) < RESERVATION_CALL_MAX_RETRIES) {
        job.retry_used = (job.retry_used || 0) + 1;
        job.status = "retrying";
        job.updated_at = NOW().toISOString();
        store.reservationCallJobs.set(jobId, job);
        markStoreDirty();
        try {
          await placeReservationCallAttempt(jobId, attemptIndex + 1);
        } catch (error) {
          const next = store.reservationCallJobs.get(jobId);
          next.status = "failed";
          next.last_error = error instanceof Error ? error.message : "Retry attempt failed";
          next.updated_at = NOW().toISOString();
          store.reservationCallJobs.set(jobId, next);
          markStoreDirty();
        }
        res.status(200).json({ ok: true, retried: true });
        return;
      }
      job.status = "failed";
      job.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, job);
      markStoreDirty();
      res.status(200).json({ ok: true });
      return;
    }

    const decisionLocked = new Set(["reservation-confirmed", "reservation-declined", "reservation-timeout", "awaiting-followup"]);
    if (decisionLocked.has(job.status)) {
      job.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, job);
      markStoreDirty();
      res.status(200).json({ ok: true, decision_locked: true });
      return;
    }

    if (callStatus === "completed") {
      job.status = job.status === "awaiting-followup" ? "awaiting-followup" : "completed";
    } else if (callStatus === "answered") {
      job.status = "in-progress";
    } else if (callStatus === "ringing" || callStatus === "queued" || callStatus === "initiated") {
      job.status = "calling";
    }

    job.updated_at = NOW().toISOString();
    store.reservationCallJobs.set(jobId, job);
    markStoreDirty();
    res.status(200).json({ ok: true });
  });

  app.post("/api/agent/chat", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const message = String(req.body?.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const context = req.body?.context || {};
    const recommendations = rankedRecommendations(auth.userId, {
      weather: context.weather || "clear",
      timeOfDay: context.timeOfDay || "evening"
    });

    const cards = recommendations.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description,
      deep_link: item.link,
      reason_tags: item.reason_tags,
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

    const assistantText = await generateAssistantReply({ message, context, cards, proposedActions });

    store.aiActionLogs.push({
      id: randomUUID(),
      user_id: auth.userId,
      prompt: message,
      proposed_actions_json: proposedActions,
      confirmed_action_id: null,
      created_at: NOW().toISOString()
    });

    res.json({ assistant_text: assistantText, cards, proposed_actions: proposedActions });
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
      markStoreDirty();
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
      markStoreDirty();
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
      markStoreDirty();
      result = { task_id: task.id, title: task.title };
    }

    if (action.type === "create_booking_intent") {
      result = {
        provider: "opentable",
        deep_link: "https://www.opentable.com/",
        note: "Complete booking in provider flow."
      };
    }

    store.pendingActions.delete(req.params.actionId);
    markStoreDirty();
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
