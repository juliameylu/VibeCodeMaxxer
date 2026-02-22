export interface SupabaseConfig {
  url: string;
  key: string;
  keySource: "service_role" | "anon" | "none";
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/g, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (url && serviceRoleKey) {
    return { url, key: serviceRoleKey, keySource: "service_role" };
  }

  if (url && anonKey) {
    return { url, key: anonKey, keySource: "anon" };
  }

  return { url: "", key: "", keySource: "none" };
}

export function hasSupabaseConfig(config: SupabaseConfig): boolean {
  return Boolean(config.url && config.key);
}

export async function callSupabaseRest(
  config: SupabaseConfig,
  pathWithQuery: string,
  init: RequestInit = {},
): Promise<unknown> {
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
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message || "Supabase REST request failed.")
        : typeof payload === "object" && payload && "error" in payload
          ? String((payload as { error?: unknown }).error || "Supabase REST request failed.")
          : `Supabase REST request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}
