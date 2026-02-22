import { supabase } from "/utils/supabase/client";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const PROFILE_COLUMNS = "id,email,display_name,cal_poly_email,onboarding_complete,created_at,updated_at";
const isSupabaseConfigured = Boolean(projectId && publicAnonKey);

function notConfiguredResult() {
  return {
    data: null,
    error: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  };
}

function normalizeError(error, fallback) {
  if (error?.message) return error.message;
  return fallback;
}

export async function upsertProfile({ id, email, displayName }) {
  if (!isSupabaseConfigured) {
    return notConfiguredResult();
  }

  const payload = {
    id,
    email: String(email || "").toLowerCase(),
    display_name: String(displayName || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    return { data: null, error: normalizeError(error, "Could not upsert profile.") };
  }

  return { data, error: "" };
}

export async function getProfileById(userId) {
  if (!isSupabaseConfigured) {
    return notConfiguredResult();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) {
    return { data: null, error: normalizeError(error, "Could not load profile.") };
  }

  return { data, error: "" };
}

export async function listProfiles(limit = 25) {
  if (!isSupabaseConfigured) {
    return { data: [], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, Number(limit) || 25)));

  if (error) {
    return { data: [], error: normalizeError(error, "Could not list profiles.") };
  }

  return { data: Array.isArray(data) ? data : [], error: "" };
}
