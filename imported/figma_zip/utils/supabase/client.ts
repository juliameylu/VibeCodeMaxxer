import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

// Singleton Supabase Client for the Frontend
export const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
