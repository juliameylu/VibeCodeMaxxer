#!/usr/bin/env node
/**
 * Seed helper for local backend + Supabase.
 *
 * Usage:
 *   node scripts/seed/seed_mock_users.js
 *   BACKEND_BASE_URL=http://localhost:8787 node scripts/seed/seed_mock_users.js --seed-only
 *   node scripts/seed/seed_mock_users.js --no-seed
 */

const BACKEND_BASE_URL = String(process.env.BACKEND_BASE_URL || "http://localhost:8787").replace(/\/+$/g, "");
const shouldSeed = !process.argv.includes("--no-seed");
const seedOnly = process.argv.includes("--seed-only");

async function call(path, body) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return payload;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`[seed_mock_users] backend=${BACKEND_BASE_URL}`);

  if (seedOnly) {
    const result = await call("/api/admin/supabase/seed-dummy-users", {});
    // eslint-disable-next-line no-console
    console.log("[seed_mock_users] seeded users:", result?.seeded_users || []);
    return;
  }

  const result = await call("/api/admin/supabase/reset", {
    confirm: "RESET_SUPABASE",
    seed: shouldSeed,
  });

  // eslint-disable-next-line no-console
  console.log("[seed_mock_users] reset result:", {
    cleared_tables: result?.cleared_tables || [],
    clear_errors: result?.clear_errors || [],
    seeded_dummy_users: result?.seeded_dummy_users || 0,
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[seed_mock_users] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
