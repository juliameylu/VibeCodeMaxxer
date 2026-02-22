import { apiFetch } from "../apiClient";

export function createReservationIntent({ venueId, datetime, partySize, idempotencyKey }) {
  return apiFetch("/api/reservation-intents", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey
    },
    body: {
      venueId,
      datetime,
      partySize
    }
  });
}

export function getReservationIntent(intentId) {
  return apiFetch(`/api/reservation-intents/${intentId}`);
}
