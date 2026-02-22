import { Router } from "express";
import { nextReservationId, shortStableSuffix } from "../store/ids.js";
import { memoryStore } from "../store/memoryStore.js";
import { isIsoUtc, nowIsoUtc } from "../store/time.js";
import type { MockReservation, MockReservationSlot } from "../store/types.js";

const router = Router();

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseDateOrToday(dateText?: string): Date {
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

function slotLabel(startTs: string): string {
  return new Date(startTs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function yelpReservationUrl(restaurantId: string, date: string, slotId: string, partyMax: number): string {
  const idSuffix = restaurantId.replace(/^restaurant:/, "");
  const search = new URLSearchParams({
    date,
    time: slotId,
    covers: String(partyMax),
    source: "mock_api",
  });
  return `https://www.yelp.com/reservations/${encodeURIComponent(idSuffix)}?${search.toString()}`;
}

function generateMockSlots(restaurantId: string, dateText?: string): { date: string; slots: MockReservationSlot[] } {
  const baseDate = parseDateOrToday(dateText);
  const yyyy = baseDate.getUTCFullYear();
  const mm = String(baseDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(baseDate.getUTCDate()).padStart(2, "0");
  const date = `${yyyy}-${mm}-${dd}`;

  const seed = hashString(`${restaurantId}_${date}`);
  const candidateMinutes = [1020, 1065, 1110, 1170, 1230, 1290]; // 5:00 PM - 9:30 PM UTC basis

  let picked = candidateMinutes.filter((_, index) => (seed + index) % 2 === 0);
  if (picked.length < 3) picked = candidateMinutes.slice(1, 5);

  const slots = picked.slice(0, 5).map((minutes, index) => {
    const start = new Date(baseDate);
    start.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + 90);

    const slotId = `slot_${shortStableSuffix(`${restaurantId}_${date}_${index}_${minutes}`)}`;
    const partySizeMax = 4 + ((seed + index) % 5);

    return {
      slot_id: slotId,
      start_ts: start.toISOString(),
      end_ts: end.toISOString(),
      label: slotLabel(start.toISOString()),
      seats_remaining: 2 + ((seed + index) % 5),
      provider: "yelp" as const,
      source: "mock_yelp" as const,
      party_size_min: 1,
      party_size_max: partySizeMax,
      is_bookable: true,
      reservation_url: yelpReservationUrl(restaurantId, date, slotId, partySizeMax),
      cancellation_policy: "Free cancellation up to 2 hours before reservation time.",
      deposit_cents: 0,
      currency: "usd" as const,
    };
  });

  return { date, slots };
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

router.post("/api/mock-reservations/book", (req, res) => {
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

  const specialRequests = Array.isArray(specialRequestsRaw)
    ? specialRequestsRaw
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const notes = typeof notesRaw === "string" ? notesRaw.trim().slice(0, 500) : "";

  const reservation: MockReservation = {
    reservation_id: nextReservationId(),
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
    created_at: nowIsoUtc(),
  };

  const existing = memoryStore.mockReservations.get(userId) ?? [];
  memoryStore.mockReservations.set(userId, [reservation, ...existing]);
  const reservationDate = startTs.slice(0, 10);
  const reservationUrl = yelpReservationUrl(restaurantId, reservationDate, slotId, partySize);

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

router.get("/api/mock-reservations/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  const reservations = memoryStore.mockReservations.get(userId) ?? [];

  res.json({
    user_id: userId,
    reservations,
  });
});

export default router;
