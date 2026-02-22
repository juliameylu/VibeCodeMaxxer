import { Router } from "express";
import { memoryStore } from "../store/memoryStore.js";
import { nowIsoUtc } from "../store/time.js";
import type { Preferences } from "../store/types.js";

const router = Router();
const PRICE_SET = new Set(["$", "$$", "$$$", "$$$$"]);

function ensureUser(userId: string) {
  return memoryStore.users.has(userId);
}

function defaultPreferences(userId: string): Preferences {
  return {
    user_id: userId,
    price_max: "$$$",
    distance_max_m: 3000,
    diet_tags: [],
    event_tags: [],
    favorite_categories: [],
    updated_at: nowIsoUtc(),
  };
}

router.get("/api/preferences/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  if (!ensureUser(userId)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const prefs = memoryStore.preferences.get(userId) ?? defaultPreferences(userId);
  memoryStore.preferences.set(userId, prefs);
  res.json(prefs);
});

router.put("/api/preferences/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  if (!ensureUser(userId)) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const payload = req.body ?? {};

  if (payload.price_max && !PRICE_SET.has(payload.price_max)) {
    res.status(400).json({ error: "price_max must be one of $, $$, $$$, $$$$" });
    return;
  }

  if (payload.distance_max_m !== undefined && (!Number.isInteger(payload.distance_max_m) || payload.distance_max_m < 0)) {
    res.status(400).json({ error: "distance_max_m must be a positive integer" });
    return;
  }

  const current = memoryStore.preferences.get(userId) ?? defaultPreferences(userId);
  const next: Preferences = {
    user_id: userId,
    price_max: payload.price_max ?? current.price_max,
    distance_max_m: payload.distance_max_m ?? current.distance_max_m,
    diet_tags: Array.isArray(payload.diet_tags) ? payload.diet_tags : current.diet_tags,
    event_tags: Array.isArray(payload.event_tags) ? payload.event_tags : current.event_tags,
    favorite_categories: Array.isArray(payload.favorite_categories)
      ? payload.favorite_categories
      : current.favorite_categories,
    updated_at: nowIsoUtc(),
  };

  memoryStore.preferences.set(userId, next);
  res.json(next);
});

export default router;
