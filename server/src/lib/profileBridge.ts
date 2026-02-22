import { randomUUID } from "node:crypto";
import { memoryStore } from "../store/memoryStore.js";
import { nowIsoUtc } from "../store/time.js";
import { callSupabaseRest, type SupabaseConfig } from "./supabaseRest.js";

interface SupabaseProfileRow {
  id?: string;
  email?: string;
}

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function displayNameFromEmail(email: string): string {
  const local = normalizeEmail(email).split("@")[0] || "user";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

export async function resolveSupabaseProfileIdForUser(
  userId: string,
  config: SupabaseConfig,
): Promise<string | null> {
  const cached = memoryStore.supabaseProfileIdsByUserId.get(userId);
  if (cached) return cached;

  if (isUuid(userId)) {
    const byIdPayload = await callSupabaseRest(
      config,
      `profiles?select=id&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { method: "GET" },
    );
    const byIdRows = Array.isArray(byIdPayload) ? (byIdPayload as SupabaseProfileRow[]) : [];
    const byId = byIdRows[0];
    if (byId?.id) {
      memoryStore.supabaseProfileIdsByUserId.set(userId, byId.id);
      return byId.id;
    }
  }

  const user = memoryStore.users.get(userId);
  if (!user?.email) return null;

  const email = normalizeEmail(user.email);
  if (!email) return null;

  const selectPath =
    `profiles?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`;
  const existingPayload = await callSupabaseRest(config, selectPath, { method: "GET" });
  const existingRows = Array.isArray(existingPayload)
    ? (existingPayload as SupabaseProfileRow[])
    : [];

  const existing = existingRows[0];
  if (existing?.id) {
    memoryStore.supabaseProfileIdsByUserId.set(userId, existing.id);
    return existing.id;
  }

  const createdAt = nowIsoUtc();
  const insertRow = {
    id: randomUUID(),
    email,
    display_name: displayNameFromEmail(email),
    cal_poly_email: email.endsWith("@calpoly.edu") ? email : null,
    onboarding_complete: false,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const insertPayload = await callSupabaseRest(config, "profiles?on_conflict=email&select=id,email", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([insertRow]),
  });

  const insertedRows = Array.isArray(insertPayload)
    ? (insertPayload as SupabaseProfileRow[])
    : [];
  const inserted = insertedRows[0];
  if (!inserted?.id) return null;

  memoryStore.supabaseProfileIdsByUserId.set(userId, inserted.id);
  return inserted.id;
}
