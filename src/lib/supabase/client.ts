import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { requireSupabaseEnv } from "./env";

/** Cliente de Supabase para Client Components. */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
