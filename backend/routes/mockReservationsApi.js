import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();
const reservationStore = new Map();
let reservationSequence = 1;

function isIsoUtc(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) return false;
  return text.endsWith("Z");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

function hashString(input) {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseDateOrToday(dateText) {
  if (!dateText) {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  }

  const parsed = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  }

  return parsed;
}

function slotLabel(startTs) {
  return new Date(startTs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function yelpReservationUrl(restaurantId, date, slotId, partyMax) {
  const idSuffix = String(restaurantId || "").replace(/^restaurant:/, "");
  const search = new URLSearchParams({
    date,
    time: slotId,
    covers: String(partyMax),
    source: "mock_api",
  });
  return `https://www.yelp.com/reservations/${encodeURIComponent(idSuffix)}?${search.toString()}`;
}

function generateMockSlots(restaurantId, dateText) {
  const baseDate = parseDateOrToday(dateText);
  const yyyy = baseDate.getUTCFullYear();
  const mm = String(baseDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(baseDate.getUTCDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const seed = hashString(`${restaurantId}_${date}`);
  const candidateMinutes = [1020, 1065, 1110, 1170, 1230, 1290];

  let picked = candidateMinutes.filter((_, index) => (seed + index) % 2 === 0);
  if (picked.length < 3) picked = candidateMinutes.slice(1, 5);

  const slots = picked.slice(0, 5).map((minutes, index) => {
    const start = new Date(baseDate);
    start.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + 90);

    const slotId = `slot_${Math.abs(hashString(`${restaurantId}_${date}_${index}_${minutes}`)).toString(36).slice(0, 8)}`;
    const partySizeMax = 4 + ((seed + index) % 5);

    return {
      slot_id: slotId,
      start_ts: start.toISOString(),
      end_ts: end.toISOString(),
      label: slotLabel(start.toISOString()),
      seats_remaining: 2 + ((seed + index) % 5),
      provider: "yelp",
      source: "mock_yelp",
      party_size_min: 1,
      party_size_max: partySizeMax,
      is_bookable: true,
      reservation_url: yelpReservationUrl(restaurantId, date, slotId, partySizeMax),
      cancellation_policy: "Free cancellation up to 2 hours before reservation time.",
      deposit_cents: 0,
      currency: "usd",
    };
  });

  return { date, slots };
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function nextReservationId() {
  const next = `rsv_${String(reservationSequence).padStart(6, "0")}`;
  reservationSequence += 1;
  return next;
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (url && serviceRoleKey) {
    return { url, key: serviceRoleKey };
  }

  if (url && anonKey) {
    return { url, key: anonKey };
  }

  return { url: "", key: "" };
}

function hasSupabaseConfig(config) {
  return Boolean(config.url && config.key);
}

async function callSupabaseRest(config, pathWithQuery, init = {}) {
  const response = await fetch(`${config.url}/rest/v1/${pathWithQuery}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message || "Supabase REST request failed.")
        : typeof payload === "object" && payload && "error" in payload
          ? String(payload.error || "Supabase REST request failed.")
          : `Supabase REST request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function loadSupabaseReservations(userId) {
  if (!isUuid(userId)) return null;
  const config = getSupabaseConfig();
  if (!hasSupabaseConfig(config)) return null;

  const payload = await callSupabaseRest(
    config,
    `restaurant_reservations?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`,
    { method: "GET" },
  );

  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row) => ({
    reservation_id: String(row.reservation_id || ""),
    user_id: userId,
    restaurant_id: String(row.restaurant_entity_id || ""),
    restaurant_name: String(row.restaurant_name || "Restaurant"),
    slot_id: String(row.slot_id || ""),
    start_ts: String(row.start_ts || ""),
    end_ts: String(row.end_ts || ""),
    party_size: Number(row.party_size || 2),
    special_requests: normalizeTextArray(row.special_requests),
    notes: String(row.notes || ""),
    status: String(row.status || "confirmed"),
    created_at: String(row.created_at || new Date().toISOString()),
  })).filter((row) => row.reservation_id && row.restaurant_id && row.start_ts && row.end_ts);
}

router.get("/api/mock-reservations/availability", (req, res) => {
  const restaurantId = String(req.query.restaurant_id || "").trim();
  const restaurantName = String(req.query.restaurant_name || "Restaurant").trim();
  const dateText = String(req.query.date || "").trim() || undefined;

  if (!restaurantId) {
    res.status(400).json({ error: "restaurant_id is required" });
    return;
  }

  const { date, slots } = generateMockSlots(restaurantId, dateText);
  res.json({
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    date,
    slots,
    source: "mock_yelp",
    provider: "yelp",
    currency: "usd",
  });
});

router.post("/api/mock-reservations/book", async (req, res) => {
  const {
    user_id: userId,
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    slot_id: slotId,
    start_ts: startTs,
    end_ts: endTs,
    party_size: partySize,
    special_requests: specialRequestsRaw,
    notes: notesRaw,
  } = req.body ?? {};

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "user_id is required" });
    return;
  }

  if (!restaurantId || typeof restaurantId !== "string") {
    res.status(400).json({ error: "restaurant_id is required" });
    return;
  }

  if (!slotId || typeof slotId !== "string") {
    res.status(400).json({ error: "slot_id is required" });
    return;
  }

  if (!startTs || typeof startTs !== "string" || !isIsoUtc(startTs)) {
    res.status(400).json({ error: "start_ts must be UTC ISO-8601" });
    return;
  }

  if (!endTs || typeof endTs !== "string" || !isIsoUtc(endTs)) {
    res.status(400).json({ error: "end_ts must be UTC ISO-8601" });
    return;
  }

  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 12) {
    res.status(400).json({ error: "party_size must be an integer between 1 and 12" });
    return;
  }

  const specialRequests = normalizeTextArray(specialRequestsRaw).slice(0, 12);
  const notes = typeof notesRaw === "string" ? notesRaw.trim().slice(0, 500) : "";
  const reservationId = nextReservationId();

  const reservation = {
    reservation_id: reservationId,
    user_id: userId,
    restaurant_id: restaurantId,
    restaurant_name: String(restaurantName || "Restaurant"),
    slot_id: slotId,
    start_ts: startTs,
    end_ts: endTs,
    party_size: partySize,
    special_requests: specialRequests,
    notes,
    status: "confirmed",
    created_at: new Date().toISOString(),
  };

  const reservationDate = startTs.slice(0, 10);
  const reservationUrl = yelpReservationUrl(restaurantId, reservationDate, slotId, partySize);

  const existing = reservationStore.get(userId) || [];
  reservationStore.set(userId, [reservation, ...existing]);

  const supabaseConfig = getSupabaseConfig();
  if (hasSupabaseConfig(supabaseConfig) && isUuid(userId)) {
    try {
      await callSupabaseRest(supabaseConfig, "restaurant_reservations?on_conflict=reservation_id", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([
          {
            id: randomUUID(),
            reservation_id: reservation.reservation_id,
            user_id: userId,
            restaurant_entity_id: reservation.restaurant_id,
            restaurant_name: reservation.restaurant_name,
            slot_id: reservation.slot_id,
            start_ts: reservation.start_ts,
            end_ts: reservation.end_ts,
            party_size: reservation.party_size,
            special_requests: reservation.special_requests,
            notes: reservation.notes,
            status: reservation.status,
            provider: "yelp",
            source: "mock_yelp",
            reservation_url: reservationUrl,
            cancellation_policy: "Free cancellation up to 2 hours before reservation time.",
            created_at: reservation.created_at,
            updated_at: reservation.created_at,
          },
        ]),
      });
    } catch {
      // Non-fatal fallback to in-memory storage.
    }
  }

  res.status(201).json({
    reservation_id: reservation.reservation_id,
    status: reservation.status,
    provider: "yelp",
    source: "mock_yelp",
    user_id: reservation.user_id,
    restaurant_id: reservation.restaurant_id,
    restaurant_name: reservation.restaurant_name,
    slot_id: reservation.slot_id,
    start_ts: reservation.start_ts,
    end_ts: reservation.end_ts,
    party_size: reservation.party_size,
    special_requests: reservation.special_requests,
    notes: reservation.notes,
    created_at: reservation.created_at,
    reservation_url: reservationUrl,
    cancellation_policy: "Free cancellation up to 2 hours before reservation time.",
    receipt: {
      message: "Mock reservation confirmed",
      total_cents: 0,
      currency: "usd",
    },
  });
});

router.get("/api/mock-reservations/:user_id", async (req, res) => {
  const userId = String(req.params.user_id || "").trim();

  if (isUuid(userId)) {
    try {
      const rows = await loadSupabaseReservations(userId);
      if (rows) {
        reservationStore.set(userId, rows);
        res.json({ user_id: userId, reservations: rows });
        return;
      }
    } catch {
      // fall through to memory response
    }
  }

  const reservations = reservationStore.get(userId) || [];
  res.json({ user_id: userId, reservations });
});

export default router;
