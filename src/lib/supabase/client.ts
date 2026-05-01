"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createBrowserClient<Database>(url, anonKey);
}
