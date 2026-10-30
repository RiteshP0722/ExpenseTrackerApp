import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { fetchProfile } from "../lib/api";
import { friendlyError } from "../lib/errors";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile, Role } from "../types/expense";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  /** Logged in AND the number was added by the admin. */
  isActive: boolean;
  isLoggedIn: boolean;
  /** True until we know the session and (if logged in) the profile. */
  loading: boolean;
  profileError: string | null;
  reloadProfile: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface ProfileState {
  userId: string;
  profile: Profile | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Supabase needs to be told when the app goes to the background so it
// only refreshes tokens while the app is open (recommended for React Native).
AppState.addEventListener("change", (state) => {
  if (!isSupabaseConfigured) return;
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  /** Profile (or load error) together with the user id it belongs to. */
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setSessionLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string): Promise<ProfileState> => {
    try {
      return { userId: id, profile: await fetchProfile(id), error: null };
    } catch (err) {
      return { userId: id, profile: null, error: friendlyError(err) };
    }
  }, []);

  // Load the profile (role, name, active) whenever a different user logs in.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void loadProfile(userId).then((state) => {
      if (alive) setProfileState(state);
    });
    return () => {
      alive = false;
    };
  }, [userId, loadProfile]);

  const reloadProfile = useCallback(async () => {
    if (userId) setProfileState(await loadProfile(userId));
  }, [userId, loadProfile]);

  const sendOtp = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    // Ignore a profile that belongs to a previous login.
    const current = userId && profileState?.userId === userId ? profileState : null;
    const profile = current?.profile ?? null;
    const active = !!profile?.active;
    return {
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      isAdmin: active && profile?.role === "admin",
      isActive: active,
      isLoggedIn: !!session,
      loading: sessionLoading || (!!userId && !current),
      profileError: current?.error ?? null,
      reloadProfile,
      sendOtp,
      verifyOtp,
      signOut,
    };
  }, [session, userId, profileState, sessionLoading, reloadProfile, sendOtp, verifyOtp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
