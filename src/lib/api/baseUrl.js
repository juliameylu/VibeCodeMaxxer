const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");

export function withApiBase(path) {
  if (!API_BASE_URL) return path;
  if (!path.startsWith("/")) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}
