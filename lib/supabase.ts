import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
// ANON_KEY is the documented name; PUBLISHABLE_KEY is accepted for older .env files.
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// http:// is allowed for local Supabase (npx supabase start).
export const isSupabaseConfigured = /^https?:\/\//.test(supabaseUrl) && supabaseKey.length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase URL/key missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY " +
      "to your .env file (see .env.example) and restart Expo.",
  );
}

// A placeholder URL keeps createClient from throwing; the app shows a
// "not set up" message instead of crashing when the .env is missing.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://not-configured.supabase.co",
  isSupabaseConfigured ? supabaseKey : "not-configured",
  {
    auth: {
      // AsyncStorage touches `window` during web static rendering; only use it in the app/browser.
      storage: Platform.OS === "web" && typeof window === "undefined" ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export const BILLS_BUCKET = "bills";
