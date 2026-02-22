import { Router } from "express";
import { nextUserId } from "../store/ids.js";
import { memoryStore } from "../store/memoryStore.js";
import { nowIsoUtc } from "../store/time.js";
import type { Preferences, User } from "../store/types.js";

const router = Router();

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

router.post("/api/users", (req, res) => {
  const { email, timezone } = req.body ?? {};

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  if (!timezone || typeof timezone !== "string") {
    res.status(400).json({ error: "timezone is required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUserId = memoryStore.usersByEmail.get(normalizedEmail);

  if (existingUserId) {
    const existing = memoryStore.users.get(existingUserId);
    if (existing) {
      res.json(existing);
      return;
    }
  }

  const now = nowIsoUtc();
  const user: User = {
    user_id: nextUserId(),
    email: normalizedEmail,
    timezone,
    created_at: now,
    updated_at: now,
  };

  memoryStore.users.set(user.user_id, user);
  memoryStore.usersByEmail.set(normalizedEmail, user.user_id);
  memoryStore.preferences.set(user.user_id, defaultPreferences(user.user_id));

  res.status(201).json(user);
});

router.get("/api/users/:user_id", (req, res) => {
  const { user_id: userId } = req.params;
  if (!userId.startsWith("u_")) {
    res.status(400).json({ error: "Invalid user_id format" });
    return;
  }

  const user = memoryStore.users.get(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

export default router;
