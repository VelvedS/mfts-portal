import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabaseConfigured, getSupabaseClient, getSupabaseSync } from "./supabase";
import { setAuthToken } from "./queryClient";
import type { Session } from "@supabase/supabase-js";

export interface PortalUser {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarInitials: string;
  teamMemberId: number | null;
}

// Default guest user — allows the client to view everything without logging in
const GUEST_USER: PortalUser = {
  id: 0,
  email: "guest@mfts-portal.com",
  name: "Guest",
  role: "client",
  avatarInitials: "DS",
  teamMemberId: null,
};

interface AuthContextType {
  session: Session | null;
  user: PortalUser;
  loading: boolean;
  configured: boolean;
  isAuthenticated: boolean; // true when signed in via Supabase (admin/team)
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch portal user profile using the current session token
  async function fetchPortalUser(accessToken: string): Promise<PortalUser | null> {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        // If user doesn't exist in portal yet, set them up
        if (res.status === 401) {
          const setupRes = await fetch("/api/auth/setup", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });
          if (setupRes.ok) return await setupRes.json();
        }
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  function updateSession(newSession: Session | null) {
    setSession(newSession);
    // Keep the query client's auth token in sync
    setAuthToken(newSession?.access_token || null);
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;

    getSupabaseClient().then(async (supabase) => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      updateSession(initialSession);
      if (initialSession) {
        const portalUser = await fetchPortalUser(initialSession.access_token);
        setAuthUser(portalUser);
      }
      setLoading(false);

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          updateSession(session);
          if (session) {
            const portalUser = await fetchPortalUser(session.access_token);
            setAuthUser(portalUser);
          } else {
            setAuthUser(null);
          }
        }
      );
      subscription = data.subscription;
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      return { error: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    const supabase = getSupabaseSync();
    if (supabase) {
      await supabase.auth.signOut();
    }
    updateSession(null);
    setAuthUser(null);
  };

  // Use the authenticated user if signed in, otherwise fall back to guest
  const user = authUser || GUEST_USER;
  const isAuthenticated = !!authUser && !!session;

  return (
    <AuthContext.Provider value={{ session, user, loading, configured: supabaseConfigured, isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
