import { supabase } from "/utils/supabase/client";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const isSupabaseConfigured = Boolean(projectId && publicAnonKey);

function notConfiguredResult() {
  return {
    data: null,
    error:
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  };
}

function normalizeError(error, fallback) {
  if (error?.message) return error.message;
  return fallback;
}

/**
 * Fetch all events from Supabase events_catalog
 */
export async function listEventsFromSupabase(limit = 500) {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error:
        "Supabase is not configured. First, click 'Reset Supabase + Reseed Dummy Users' in Profile.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("events_catalog")
      .select("id,title,category,description,payload")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(500, Number(limit) || 500)));

    if (error) {
      // Gracefully handle missing table or other errors
      const errorMsg = error.message || "";
      if (
        error.code === "42P01" || 
        errorMsg.includes("does not exist") ||
        errorMsg.includes("events_catalog") ||
        errorMsg.includes("schema cache")
      ) {
        return {
          data: [],
          error:
            "⚠️ Supabase tables not initialized. Go to Profile → Click 'Reset Supabase + Reseed Dummy Users' button, then try again.",
        };
      }
      return {
        data: [],
        error: normalizeError(error, "Could not list events."),
      };
    }

    // Transform payload-encoded events
    const events = Array.isArray(data)
      ? data.map((event) => ({
          id: event.id,
          title: event.title,
          category: event.category,
          description: event.description,
          ...((event.payload &&
            typeof event.payload === "object" &&
            event.payload) ||
            {}),
        }))
      : [];

    return { data: events, error: "" };
  } catch (err) {
    return { data: [], error: normalizeError(err, "Could not list events.") };
  }
}

/**
 * Fetch user preferences from Supabase
 */
export async function getUserPreferencesFromSupabase(userId) {
  if (!isSupabaseConfigured) {
    return notConfiguredResult();
  }

  if (!userId) {
    return { data: null, error: "User ID is required." };
  }

  try {
    const { data, error } = await supabase
      .from("preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No row found - return empty preferences
        return {
          data: {
            user_id: userId,
            categories: [],
            vibe: null,
            budget: null,
            transport: null,
            price_max: null,
            distance_max_m: null,
            diet_tags: [],
            event_tags: [],
            favorite_categories: [],
          },
          error: "",
        };
      }
      return {
        data: null,
        error: normalizeError(error, "Could not load preferences."),
      };
    }

    return { data, error: "" };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, "Could not load preferences."),
    };
  }
}

/**
 * Save/update user preferences in Supabase
 */
export async function saveUserPreferencesToSupabase(userId, preferences) {
  if (!isSupabaseConfigured) {
    return notConfiguredResult();
  }

  if (!userId) {
    return { data: null, error: "User ID is required." };
  }

  try {
    const payload = {
      user_id: userId,
      categories: preferences.categories || [],
      vibe: preferences.vibe || null,
      budget: preferences.budget || null,
      transport: preferences.transport || null,
      price_max: preferences.price_max || null,
      distance_max_m: preferences.distance_max_m || null,
      diet_tags: preferences.diet_tags || [],
      event_tags: preferences.event_tags || [],
      favorite_categories: preferences.favorite_categories || [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return {
        data: null,
        error: normalizeError(error, "Could not save preferences."),
      };
    }

    return { data, error: "" };
  } catch (err) {
    return {
      data: null,
      error: normalizeError(err, "Could not save preferences."),
    };
  }
}
/**
 * Save Jarvis chat history to localStorage for backup
 * (Doesn't touch other tables - isolated implementation)
 */
export async function saveJarvisChatHistoryToStorage(chatMessages) {
  try {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      messageCount: chatMessages.length,
      messages: chatMessages,
    };

    // Save to localStorage as backup
    localStorage.setItem("jarvis_chat_backup", JSON.stringify(backup));

    return {
      data: backup,
      error: "",
    };
  } catch (err) {
    return {
      data: null,
      error: "Could not save chat history.",
    };
  }
}

/**
 * Export Jarvis chat as JSON string for download
 */
export function exportJarvisChatAsJson(chatMessages) {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    messageCount: chatMessages.length,
    messages: chatMessages,
  };
  return JSON.stringify(backup, null, 2);
}
