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
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
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
const OPENAI_MODEL_FALLBACKS = ["gpt-4.1-mini", "gpt-4o-mini"];

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

function canUseSupabaseRest() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRest(path, { method = "GET", body, prefer } = {}) {
  if (!canUseSupabaseRest()) return { ok: false, status: 0, data: null };
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      console.error("Supabase REST error", path, response.status, data);
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Supabase REST request failed", path, error?.message || error);
    return { ok: false, status: 0, data: null };
  }
}

async function ensureSupabaseProfile(user) {
  if (!user || !canUseSupabaseRest()) return;
  const supabaseUserId = getSupabaseUserId(user);
  await supabaseRest("/profiles", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: supabaseUserId,
      email: user.email,
      display_name: user.display_name || user.email?.split("@")?.[0] || "User",
      phone: user.phone || null,
      onboarding_complete: Boolean(user.onboarding_complete),
      updated_at: NOW().toISOString()
    }
  });
}

async function persistUserStateToSupabase(userId) {
  if (!userId || !canUseSupabaseRest()) return;
  const user = store.users.get(userId);
  if (!user) return;
  const supabaseUserId = getSupabaseUserId(user);

  await ensureSupabaseProfile(user);

  const preferences = getOrInitPreferences(userId);
  await supabaseRest("/preferences", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      user_id: supabaseUserId,
      categories: Array.isArray(preferences.categories) ? preferences.categories : [],
      vibe: preferences.vibe || null,
      budget: preferences.budget || null,
      transport: preferences.transport || null,
      updated_at: preferences.updated_at || NOW().toISOString()
    }
  });

  const connections = getOrInitConnections(userId);
  await supabaseRest("/connections", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      user_id: supabaseUserId,
      calendar_google_connected: Boolean(connections.calendar_google_connected),
      calendar_ics_connected: Boolean(connections.calendar_ics_connected),
      canvas_connected: Boolean(connections.canvas_connected),
      canvas_mode: connections.canvas_mode || null,
      last_calendar_sync_at: connections.last_calendar_sync_at || null,
      updated_at: connections.updated_at || NOW().toISOString()
    }
  });
}

async function persistPlanToSupabase(plan) {
  if (!plan || !canUseSupabaseRest()) return;
  const owner = store.users.get(plan.host_user_id);
  if (!owner) return;
  await ensureSupabaseProfile(owner);
  const supabaseOwnerId = getSupabaseUserId(owner);

  await supabaseRest("/plans", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: plan.id,
      host_user_id: supabaseOwnerId,
      title: plan.title,
      constraints_json: plan.constraints_json || {},
      status: plan.status || "draft",
      finalized_option_json: plan.finalized_option_json || null,
      created_at: plan.created_at || NOW().toISOString()
    }
  });

  const options = Array.isArray(plan.options) ? plan.options : [];
  if (options.length === 0) return;

  await supabaseRest(`/plan_options?plan_id=eq.${encodeURIComponent(plan.id)}`, {
    method: "DELETE"
  });

  await supabaseRest("/plan_options", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: options.map((option, index) => ({
      id: option.id || randomUUID(),
      plan_id: plan.id,
      option_json: option,
      score: Number(option?.score ?? 0),
      rank: index + 1
    }))
  });
}

async function persistJamToSupabase(jam) {
  if (!jam || !canUseSupabaseRest()) return;
  const owner = store.users.get(jam.host_user_id);
  if (!owner) return;
  await ensureSupabaseProfile(owner);
  const supabaseOwnerId = getSupabaseUserId(owner);

  await supabaseRest("/jams", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: jam.id,
      code: jam.code,
      host_user_id: supabaseOwnerId,
      name: jam.name,
      status: jam.status || "open",
      created_at: jam.created_at || NOW().toISOString()
    }
  });

  const hostMember = store.jamMembers.find((member) => member.jam_id === jam.id && member.user_id === jam.host_user_id);
  if (!hostMember) return;

  await supabaseRest("/jam_members", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: hostMember.id,
      jam_id: hostMember.jam_id,
      user_id: supabaseOwnerId,
      role: hostMember.role || "host",
      joined_at: hostMember.joined_at || NOW().toISOString()
    }
  });
}

async function persistReservationCallJobToSupabase(job) {
  if (!job || !canUseSupabaseRest()) return;
  const owner = store.users.get(job.user_id);
  if (!owner) return;
  await ensureSupabaseProfile(owner);
  const supabaseOwnerId = getSupabaseUserId(owner);
  await supabaseRest("/reservation_call_jobs", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: job.job_id,
      user_id: supabaseOwnerId,
      restaurant_name: job.restaurant_name,
      reservation_time: job.reservation_time,
      party_size: Number(job.party_size || 2),
      special_request: job.special_request || "",
      group_id: job.group_id || null,
      target_number: job.target_number || "",
      caller_number: job.caller_number || "",
      call_sid: job.call_sid || null,
      status: job.status || "queued",
      decision_digit: job.decision_digit || "",
      reservation_decision: job.reservation_decision || "pending",
      retry_used: Number(job.retry_used || 0),
      max_retries: Number(job.max_retries || 0),
      last_error: job.last_error || "",
      sms_state: job.sms_notifications?.state || "pending",
      sms_sent: Number(job.sms_notifications?.sent || 0),
      sms_failed: Number(job.sms_notifications?.failed || 0),
      sms_recipients: Number(job.sms_notifications?.recipients || 0),
      sms_errors_json: job.sms_notifications?.errors || [],
      attempts_json: Array.isArray(job.attempts) ? job.attempts : [],
      confirmed_reservation_id: job.confirmed_reservation_id || null,
      confirmed_plan_id: job.confirmed_plan_id || null,
      created_at: job.created_at || NOW().toISOString(),
      updated_at: job.updated_at || NOW().toISOString()
    }
  });
}

function parseReservationStartTimestamp(reservationTimeText) {
  const raw = String(reservationTimeText || "").trim();
  if (!raw) return NOW().toISOString();

  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return new Date(direct).toISOString();

  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return NOW().toISOString();
  let hour = Number(match[1] || 0);
  const minute = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  const base = NOW();
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

async function persistCallConfirmationArtifacts(job) {
  if (!job || !canUseSupabaseRest()) return { reservationId: "", planId: "" };
  const owner = store.users.get(job.user_id);
  if (!owner) return { reservationId: "", planId: "" };
  await ensureSupabaseProfile(owner);
  const supabaseOwnerId = getSupabaseUserId(owner);

  const startTs = parseReservationStartTimestamp(job.reservation_time);
  const endTs = new Date(new Date(startTs).getTime() + 90 * 60 * 1000).toISOString();
  const reservationId = String(job.confirmed_reservation_id || `call_${job.job_id}`);

  await supabaseRest("/restaurant_reservations", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      id: job.job_id,
      user_id: supabaseOwnerId,
      reservation_id: reservationId,
      restaurant_entity_id: `call:${job.job_id}`,
      restaurant_name: String(job.restaurant_name || "Restaurant"),
      slot_id: `call_slot_${String(job.job_id || "").slice(0, 8)}`,
      start_ts: startTs,
      end_ts: endTs,
      party_size: Number(job.party_size || 2),
      special_requests: job.special_request ? [String(job.special_request)] : [],
      notes: `Confirmed by phone call${job.target_number ? ` to ${job.target_number}` : ""}`,
      status: "confirmed",
      provider: "twilio",
      source: "voice_call",
      reservation_url: null,
      cancellation_policy: null,
      updated_at: NOW().toISOString()
    }
  });

  const createdPlan = {
    id: randomUUID(),
    host_user_id: job.user_id,
    title: `Reservation: ${job.restaurant_name}`,
    constraints_json: {
      weather: "clear",
      timeOfDay: "evening",
      source: "reservation_call_confirmation",
      call_job_id: job.job_id,
      client_plan_payload: {
        name: `Reservation: ${job.restaurant_name}`,
        icon: "Utensils",
        date: new Date(startTs).toLocaleDateString([], { month: "short", day: "numeric" }),
        type: "event",
        events: [
          {
            id: `reservation-${job.job_id}`,
            name: `Table for ${job.party_size} at ${job.restaurant_name}`,
            location: "Reservation confirmed by restaurant",
            time: new Date(startTs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            source: "custom",
            icon: "Utensils",
            note: job.special_request || "Created from reservation call confirmation.",
          }
        ]
      }
    },
    status: "finalized",
    finalized_option_json: {
      source: "reservation_call",
      restaurant_name: job.restaurant_name,
      reservation_time: job.reservation_time,
      party_size: job.party_size,
      reservation_id: reservationId,
    },
    created_at: NOW().toISOString(),
    options: []
  };

  store.plans.unshift(createdPlan);
  await persistPlanToSupabase(createdPlan);
  markStoreDirty();
  return { reservationId, planId: createdPlan.id };
}

function hydrateReservationCallJobFromRow(row) {
  if (!row) return null;
  return {
    job_id: row.id,
    user_id: row.user_id,
    restaurant_name: row.restaurant_name || "Restaurant",
    reservation_time: row.reservation_time || "",
    party_size: Number(row.party_size || 2),
    special_request: row.special_request || "",
    group_id: row.group_id || "",
    target_number: row.target_number || "",
    caller_number: row.caller_number || "",
    status: row.status || "queued",
    max_duration_seconds: RESERVATION_CALL_MAX_SECONDS,
    max_retries: Number(row.max_retries || 0),
    voice_script: "",
    attempts: Array.isArray(row.attempts_json) ? row.attempts_json : [],
    retry_used: Number(row.retry_used || 0),
    call_sid: row.call_sid || null,
    decision_digit: row.decision_digit || "",
    reservation_decision: row.reservation_decision || "pending",
    sms_notifications: {
      state: row.sms_state || "pending",
      sent: Number(row.sms_sent || 0),
      failed: Number(row.sms_failed || 0),
      recipients: Number(row.sms_recipients || 0),
      errors: Array.isArray(row.sms_errors_json) ? row.sms_errors_json : []
    },
    confirmed_reservation_id: row.confirmed_reservation_id || "",
    confirmed_plan_id: row.confirmed_plan_id || "",
    last_error: row.last_error || "",
    created_at: row.created_at || NOW().toISOString(),
    updated_at: row.updated_at || NOW().toISOString()
  };
}

async function loadReservationCallJobFromSupabase(jobId) {
  if (!jobId || !canUseSupabaseRest()) return null;
  const encodedJobId = encodeURIComponent(jobId);
  const out = await supabaseRest(
    `/reservation_call_jobs?select=*&id=eq.${encodedJobId}&limit=1`,
    { method: "GET" }
  );
  if (!out.ok || !Array.isArray(out.data) || out.data.length === 0) return null;
  const hydrated = hydrateReservationCallJobFromRow(out.data[0]);
  if (!hydrated) return null;
  store.reservationCallJobs.set(jobId, hydrated);
  return hydrated;
}

async function getOrLoadReservationCallJob(jobId) {
  if (!jobId) return null;
  const inMemory = store.reservationCallJobs.get(jobId);
  if (inMemory) return inMemory;
  return loadReservationCallJobFromSupabase(jobId);
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function getSupabaseUserId(user) {
  if (!user) return "";
  if (isUuid(user.supabase_id)) return user.supabase_id;
  if (isUuid(user.id)) {
    user.supabase_id = user.id;
    return user.id;
  }
  user.supabase_id = randomUUID();
  return user.supabase_id;
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

  const resolveFromAppHeaders = () => {
    const appUserIdRaw = String(req.header("x-app-user-id") || req.body?.user_id || "").trim();
    const appUserEmail = normalizeEmail(req.header("x-app-user-email") || req.body?.email || "");
    const appUserName = String(req.header("x-app-user-name") || req.body?.name || "SLO Student").trim() || "SLO Student";

    if (!appUserIdRaw && !appUserEmail) return null;

    let user = null;
    if (appUserIdRaw) {
      user = store.users.get(appUserIdRaw) || null;
    }
    if (!user && appUserEmail) {
      user = [...store.users.values()].find((candidate) => candidate.email === appUserEmail) || null;
    }

    if (!user) {
      const userId = appUserIdRaw || randomUUID();
      const fallbackEmail = appUserEmail || `${String(userId).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 36)}@app.local`;
      user = {
        id: userId,
        email: fallbackEmail,
        display_name: appUserName,
        cal_poly_email: fallbackEmail.endsWith("@calpoly.edu") ? fallbackEmail : "",
        onboarding_complete: false,
        created_at: NOW().toISOString(),
        password: null
      };
      store.users.set(userId, user);
      getOrInitPreferences(userId);
      getOrInitConnections(userId);
      markStoreDirty();
    }

    return { token: "app-header", userId: user.id, user };
  };

  const token = req.header("x-session-token") || req.body?.sessionToken || req.query?.sessionToken;
  if (token) {
    const userId = store.sessions.get(token);
    if (userId) {
      const user = store.users.get(userId);
      if (user) return { token, userId, user };
    }
  }

  const appIdentity = resolveFromAppHeaders();
  if (appIdentity) return appIdentity;

  res.status(401).json({ error: token ? "Invalid session token" : "Missing session token" });
  return null;
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

const SLO_KNOWLEDGE_NOTES = [
  "SLO stands for San Luis Obispo.",
  "Mission San Luis Obispo de Tolosa was founded in 1772.",
  "Cal Poly is a major campus anchor for student life in SLO.",
  "Downtown SLO Farmer's Market runs on Thursday evenings.",
  "Popular local categories: beaches, hikes, coffee, food, live music, campus events."
];

function summarizeUserContext(userId, clientContext = {}) {
  const prefs = getOrInitPreferences(userId);
  const connections = getOrInitConnections(userId);
  const studyLoad = computeStudyLoad(userId);
  const tasks = store.studyTasks
    .filter((task) => task.user_id === userId && !task.done)
    .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime())
    .slice(0, 10);
  const plans = store.plans.filter((plan) => plan.host_user_id === userId).slice(-8);
  const joinedPlanIds = new Set(
    store.planParticipants.filter((row) => row.user_id === userId).map((row) => row.plan_id)
  );
  const participantPlans = store.plans.filter((plan) => joinedPlanIds.has(plan.id)).slice(-8);
  const jams = store.jamMembers
    .filter((row) => row.user_id === userId)
    .map((row) => store.jams.find((jam) => jam.id === row.jam_id))
    .filter(Boolean)
    .slice(-8);
  const userGroups = store.groups.filter((group) => group.owner_user_id === userId).slice(-8);
  const eventStates = store.userEventStates.filter((row) => row.user_id === userId);
  const confirmedEvents = eventStates.filter((row) => row.state === "confirmed").length;
  const maybeEvents = eventStates.filter((row) => row.state === "maybe").length;
  const savedEvents = eventStates.filter((row) => row.state === "saved").length;

  return {
    client_context: clientContext,
    preferences: prefs,
    connections,
    study_load: studyLoad,
    upcoming_tasks: tasks,
    plans: plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      status: plan.status,
      created_at: plan.created_at
    })),
    participant_plans: participantPlans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      status: plan.status
    })),
    jams: jams.map((jam) => ({
      id: jam.id,
      code: jam.code,
      name: jam.name,
      status: jam.status
    })),
    groups: userGroups.map((group) => ({
      id: group.id,
      name: group.name
    })),
    event_state_summary: {
      confirmed: confirmedEvents,
      maybe: maybeEvents,
      saved: savedEvents
    },
    available_catalog_categories: [...new Set(store.eventsCatalog.map((item) => item.category))],
    slo_knowledge: SLO_KNOWLEDGE_NOTES
  };
}

function createPendingAction(payload) {
  const actionId = randomUUID();
  store.pendingActions.set(actionId, payload);
  return {
    action_id: actionId,
    type: payload.type,
    payload,
    requires_confirmation: true
  };
}

function extractJamCodeFromMessage(message) {
  const match = String(message || "").toUpperCase().match(/\b[A-Z0-9]{4,10}\b/);
  return match ? match[0] : "";
}

function inferProposedActions({ userId, message, cards, userContext }) {
  const lower = String(message || "").toLowerCase();
  const actions = [];
  const primaryCardId = cards[0]?.id || store.eventsCatalog[0]?.id || "event-brew-quiet";

  if (/(plan my day|build my schedule|create a time-blocked schedule|make an agenda|create plan|make a plan|plan)/.test(lower)) {
    actions.push(createPendingAction({
      type: "create_plan_draft",
      title: "Jarvis Plan Draft",
      constraints: {
        weather: String(userContext?.client_context?.weather || "clear"),
        timeOfDay: String(userContext?.client_context?.timeOfDay || "evening"),
        durationMin: 120
      }
    }));
  }

  if (/(rsvp|confirm this|save this event|mark as maybe|book this event)/.test(lower)) {
    const wantsMaybe = /(maybe|not sure)/.test(lower);
    const wantsSaved = /(save|bookmark|pin)/.test(lower);
    actions.push(createPendingAction({
      type: "rsvp_event",
      item_id: primaryCardId,
      state: wantsSaved ? "saved" : wantsMaybe ? "maybe" : "confirmed"
    }));
  }

  const jamCode = extractJamCodeFromMessage(message);
  if (/(join jam|accept jam|jam code|join code)/.test(lower)) {
    actions.push(createPendingAction({
      type: "join_jam",
      code: jamCode || "DEMO42"
    }));
  }

  if (/(add task|add assignment|new task|remind me|study task|homework task)/.test(lower)) {
    const titleMatch = String(message || "").match(/(?:add task|add assignment|new task)\s*:?(.+)$/i);
    const title = titleMatch?.[1]?.trim() || "Jarvis task";
    actions.push(createPendingAction({
      type: "add_study_task",
      title,
      due_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      course: "General",
      duration_min: 60
    }));
  }

  if (/(reservation|book|booking|zipcar|apple pay|pay|dinner booking|table)/.test(lower)) {
    actions.push(createPendingAction({
      type: "create_booking_intent",
      provider: /zipcar/.test(lower) ? "zipcar" : "external",
      item_id: primaryCardId
    }));
  }

  if (!actions.length && /(what can you automate|what can you do|automate)/.test(lower)) {
    actions.push(createPendingAction({
      type: "create_plan_draft",
      title: "Automation Demo Plan",
      constraints: { durationMin: 90, weather: "clear", timeOfDay: "afternoon" }
    }));
  }

  return actions;
}

async function generateAssistantReply(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return "I pulled your app context and ranked options. I can automate plan drafts, RSVPs, jam joins, tasks, and booking intents after you confirm.";
  }

  try {
    if (!openai) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    let lastError = null;
    for (const model of OPENAI_MODEL_FALLBACKS) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await openai.responses.create({
            model,
            input: [
              {
                role: "system",
                content: [
                  "You are OpenJarvis for SLO Planner.",
                  "Use the provided JSON app context as source of truth.",
                  "Recommend concrete next actions from the user's real plans/tasks/events.",
                  "When proposing writes, never claim they are complete before explicit confirmation.",
                  "If user request is ambiguous, ask 1-2 concise clarifying questions first.",
                  "Favor specific SLO suggestions with rationale tied to workload, weather, budget, and timing."
                ].join(" ")
              },
              {
                role: "user",
                content: JSON.stringify(payload)
              }
            ]
          });

          return response.output_text || "I have a few recommendations ready.";
        } catch (error) {
          lastError = error;
          const code = String(error?.code || "");
          const status = Number(error?.status || 0);
          const retryable = status === 429 || status >= 500 || code === "rate_limit_exceeded";
          if (!retryable || attempt >= 1) break;
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }
    console.error("OpenAI assistant reply failed", lastError?.message || lastError);
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

  app.post("/api/auth/signup", async (req, res) => {
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
    await persistUserStateToSupabase(userId);

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

  app.post("/api/auth/signin", async (req, res) => {
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
    await persistUserStateToSupabase(user.id);
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

  app.post("/api/preferences", async (req, res) => {
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
    await persistUserStateToSupabase(auth.userId);

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

  app.post("/api/plans", async (req, res) => {
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
    await persistPlanToSupabase(plan);
    res.json({ plan_id: plan.id, request_id: plan.id, options: plan.options, plan });
  });

  app.get("/api/plans", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const inMemoryPlans = store.plans
      .filter((candidate) => candidate.host_user_id === auth.userId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    let supabasePlans = [];
    if (canUseSupabaseRest()) {
      const user = store.users.get(auth.userId);
      if (user) {
        const supabaseUserId = getSupabaseUserId(user);
        const out = await supabaseRest(
          `/plans?select=*&host_user_id=eq.${encodeURIComponent(supabaseUserId)}&order=created_at.desc`,
          { method: "GET" }
        );
        if (out.ok && Array.isArray(out.data)) {
          supabasePlans = out.data.map((row) => ({
            id: row.id,
            host_user_id: auth.userId,
            title: row.title || "Plan",
            constraints_json: row.constraints_json || {},
            status: row.status || "draft",
            finalized_option_json: row.finalized_option_json || null,
            created_at: row.created_at || NOW().toISOString(),
            options: []
          }));
        }
      }
    }

    const mergedMap = new Map();
    [...supabasePlans, ...inMemoryPlans].forEach((plan) => {
      if (!plan?.id) return;
      if (!mergedMap.has(plan.id)) mergedMap.set(plan.id, plan);
    });

    const plans = Array.from(mergedMap.values()).map((plan) => {
      const client = plan.constraints_json?.client_plan_payload || {};
      return {
        id: plan.id,
        title: plan.title,
        status: plan.status || "draft",
        created_at: plan.created_at,
        constraints_json: plan.constraints_json || {},
        finalized_option_json: plan.finalized_option_json || null,
        client_plan_payload: {
          name: String(client.name || plan.title || "Plan"),
          icon: String(client.icon || "Clipboard"),
          date: client.date || null,
          type: client.type || "event",
          events: Array.isArray(client.events) ? client.events : [],
          notes: client.notes || null
        }
      };
    });

    res.json({ plans });
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

  app.post("/api/jams", async (req, res) => {
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
    await persistJamToSupabase(jam);

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
      confirmed_reservation_id: "",
      confirmed_plan_id: "",
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
    await persistReservationCallJobToSupabase(job);

    try {
      await placeReservationCallAttempt(jobId, 0);
      const next = store.reservationCallJobs.get(jobId);
      await persistReservationCallJobToSupabase(next);
      res.status(201).json({ call_job: next });
    } catch (error) {
      const failed = store.reservationCallJobs.get(jobId);
      failed.status = "failed";
      failed.last_error = error instanceof Error ? error.message : "Could not place call";
      failed.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, failed);
      markStoreDirty();
      await persistReservationCallJobToSupabase(failed);
      res.status(502).json({ error: failed.last_error });
    }
  });

  app.get("/api/agent/call/:jobId", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;
    const send = async () => {
      const job = await getOrLoadReservationCallJob(req.params.jobId);
      if (!job || job.user_id !== auth.userId) {
        res.status(404).json({ error: "Call job not found" });
        return;
      }
      res.json({ call_job: job });
    };
    send().catch(() => {
      res.status(500).json({ error: "Could not load call job" });
    });
  });

  app.post("/api/twilio/voice/reservation-twiml", async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    try {
      const jobId = String(req.query?.jobId || "");
      const job = await getOrLoadReservationCallJob(jobId);

      if (!job) {
        twiml.say({ voice: "alice", language: "en-US" }, "This reservation request is no longer available. Goodbye.");
        twiml.hangup();
        res.status(200).type("text/xml").send(twiml.toString());
        return;
      }

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

      res.status(200).type("text/xml").send(twiml.toString());
    } catch {
      twiml.say({ voice: "alice", language: "en-US" }, "We are unable to process this request right now. Goodbye.");
      twiml.hangup();
      res.status(200).type("text/xml").send(twiml.toString());
    }
  });

  app.post("/api/twilio/voice/input", async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    try {
      const jobId = String(req.query?.jobId || "");
      const digit = String(req.body?.Digits || "").trim();
      const job = await getOrLoadReservationCallJob(jobId);
      if (!job) {
        twiml.say({ voice: "alice", language: "en-US" }, "This reservation request has expired. Goodbye.");
        twiml.hangup();
        res.status(200).type("text/xml").send(twiml.toString());
        return;
      }

      job.decision_digit = digit;

      if (digit === "1") {
        job.reservation_decision = "confirmed";
        job.status = "reservation-confirmed";
        twiml.say({ voice: "alice", language: "en-US" }, "Thank you. Reservation confirmed.");
        const persisted = await persistCallConfirmationArtifacts(job);
        if (persisted?.reservationId) {
          job.confirmed_reservation_id = persisted.reservationId;
        }
        if (persisted?.planId) {
          job.confirmed_plan_id = persisted.planId;
        }
        const smsResult = await sendGroupReservationSms({
          userId: job.user_id,
          groupId: job.group_id,
          restaurantName: job.restaurant_name,
          partySize: job.party_size,
          reservationTime: job.reservation_time
        });
        const smsState = smsResult.errors.length > 0 && smsResult.sent === 0 && smsResult.recipients.length === 0
          ? "paused"
          : smsResult.failed > 0
            ? "partial"
            : "sent";
        job.sms_notifications = {
          state: smsState,
          sent: smsResult.sent,
          failed: smsResult.failed,
          recipients: smsResult.recipients.length,
          errors: smsResult.errors
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
      await persistReservationCallJobToSupabase(job);
    } catch {
      twiml.say({ voice: "alice", language: "en-US" }, "We could not process that input right now.");
    }

    twiml.say({ voice: "alice", language: "en-US" }, "Goodbye.");
    twiml.hangup();
    res.status(200).type("text/xml").send(twiml.toString());
  });

  app.post("/api/twilio/voice/status", async (req, res) => {
    const jobId = String(req.query?.jobId || "");
    const attemptIndex = Number(req.query?.attempt || 0);
    const callStatus = String(req.body?.CallStatus || "").toLowerCase();
    const callSid = String(req.body?.CallSid || "");
    const job = await getOrLoadReservationCallJob(jobId);

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
        await persistReservationCallJobToSupabase(job);
        try {
          await placeReservationCallAttempt(jobId, attemptIndex + 1);
          await persistReservationCallJobToSupabase(store.reservationCallJobs.get(jobId));
        } catch (error) {
          const next = store.reservationCallJobs.get(jobId);
          next.status = "failed";
          next.last_error = error instanceof Error ? error.message : "Retry attempt failed";
          next.updated_at = NOW().toISOString();
          store.reservationCallJobs.set(jobId, next);
          markStoreDirty();
          await persistReservationCallJobToSupabase(next);
        }
        res.status(200).json({ ok: true, retried: true });
        return;
      }
      job.status = "failed";
      job.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, job);
      markStoreDirty();
      await persistReservationCallJobToSupabase(job);
      res.status(200).json({ ok: true });
      return;
    }

    const decisionLocked = new Set([
      "reservation-confirmed",
      "reservation-declined",
      "reservation-timeout",
      "awaiting-followup"
    ]);
    if (decisionLocked.has(job.status)) {
      job.updated_at = NOW().toISOString();
      store.reservationCallJobs.set(jobId, job);
      markStoreDirty();
      await persistReservationCallJobToSupabase(job);
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
    await persistReservationCallJobToSupabase(job);
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
    const userContext = summarizeUserContext(auth.userId, context);
    const recommendations = rankedRecommendations(auth.userId, {
      weather: context.weather || "clear",
      timeOfDay: context.timeOfDay || "evening"
    });

    const cards = recommendations.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.description,
      deep_link: item.link,
      reason_tags: item.reason_tags,
      score: item.score
    }));

    const proposedActions = inferProposedActions({
      userId: auth.userId,
      message,
      cards,
      userContext
    });

    const assistantText = await generateAssistantReply({
      message,
      context: userContext,
      cards,
      proposedActions,
      capabilities: [
        "plan_draft",
        "rsvp_event",
        "join_jam",
        "add_study_task",
        "booking_intent",
        "calendar/canvas connection-aware recommendations",
        "study-load-aware prioritization"
      ]
    });

    store.aiActionLogs.push({
      id: randomUUID(),
      user_id: auth.userId,
      prompt: message,
      proposed_actions_json: proposedActions,
      confirmed_action_id: null,
      created_at: NOW().toISOString()
    });

    res.json({
      assistant_text: assistantText,
      cards,
      proposed_actions: proposedActions,
      context_used: userContext
    });
  });

  app.get("/api/agent/context", (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;
    const clientContext = {
      weather: String(req.query.weather || "clear"),
      timeOfDay: String(req.query.timeOfDay || "evening"),
      activeScreen: String(req.query.activeScreen || "/jarvis")
    };
    res.json({
      user_context: summarizeUserContext(auth.userId, clientContext),
      recommendations: rankedRecommendations(auth.userId, clientContext).slice(0, 5)
    });
  });

  app.post("/api/agent/image-generate", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const prompt = String(req.body?.prompt || "").trim();
    const requestedSize = String(req.body?.size || "1024x1024").trim();
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const size = allowedSizes.has(requestedSize) ? requestedSize : "1024x1024";

    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is missing on backend." });
      return;
    }

    try {
      if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size
      });

      const generated = response?.data?.[0];
      const b64 = generated?.b64_json;
      const imageUrl = generated?.url || (b64 ? `data:image/png;base64,${b64}` : "");

      if (!imageUrl) {
        res.status(502).json({ error: "Image generation returned no image payload." });
        return;
      }

      res.json({
        image_url: imageUrl,
        revised_prompt: generated?.revised_prompt || null,
        size
      });
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : "Image generation failed"
      });
    }
  });

  app.post("/api/agent/image-generate-personalized", async (req, res) => {
    const auth = requireSession(req, res);
    if (!auth) return;

    const placeName = String(req.body?.place_name || "San Luis Obispo destination").trim();
    const city = String(req.body?.city || "San Luis Obispo").trim();
    const category = String(req.body?.category || "activity").trim();
    const basePrompt = String(req.body?.prompt || "").trim();
    const headCircle = String(req.body?.head_circle || "").trim();
    const requestedSize = String(req.body?.size || "1024x1024").trim();
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const size = allowedSizes.has(requestedSize) ? requestedSize : "1024x1024";

    if (!headCircle || !headCircle.startsWith("data:image/")) {
      res.status(400).json({ error: "head_circle image data URL is required." });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is missing on backend." });
      return;
    }

    const scenarioPrompt = basePrompt || `Create a photorealistic travel photo of this exact person at ${placeName} in ${city}. The activity vibe should match ${category}. Keep face identity consistent, natural lighting, realistic proportions, and believable scene composition.`;

    try {
      if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }

      const match = headCircle.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: "Invalid head_circle data URL format." });
        return;
      }
      const mime = match[1];
      const b64 = match[2];
      const bytes = Buffer.from(b64, "base64");
      const ext = mime.includes("png") ? "png" : "jpg";
      const file = new File([bytes], `head-circle.${ext}`, { type: mime });

      let generated = null;
      try {
        const edited = await openai.images.edit({
          model: "gpt-image-1",
          image: file,
          prompt: scenarioPrompt,
          size
        });
        generated = edited?.data?.[0] || null;
      } catch {
        const fallback = await openai.images.generate({
          model: "gpt-image-1",
          prompt: `${scenarioPrompt} Keep the same person from the provided profile head reference.`,
          size
        });
        generated = fallback?.data?.[0] || null;
      }

      const outUrl = generated?.url || (generated?.b64_json ? `data:image/png;base64,${generated.b64_json}` : "");
      if (!outUrl) {
        res.status(502).json({ error: "Personalized image generation returned no image payload." });
        return;
      }

      res.json({
        image_url: outUrl,
        revised_prompt: generated?.revised_prompt || null,
        size
      });
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : "Personalized image generation failed"
      });
    }
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
