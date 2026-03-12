"use client";

/**
 * AuthProvider — single source of truth for Supabase session state.
 *
 * Mounted once in layout.tsx.  All client components use useAuth() instead
 * of creating their own subscriptions, eliminating race conditions.
 *
 * Cross-subdomain detection: a visibilitychange listener re-reads the session
 * from cookies whenever the tab regains focus.  If the user logged in on
 * deepvortexai.art (Hub) and then switches to this tab, the .deepvortexai.art
 * cookie is found and the chat unlocks without a second login.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user:    User    | null;
  /** true once the initial getSession() has resolved — prevents flash of sign-in prompt */
  ready:   boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user:    null,
  ready:   false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready,   setReady]   = useState(false);

  const checkSession = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setReady(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // 1. Read the session cookie immediately on mount.
    //    If the Hub wrote a .deepvortexai.art cookie before this tab opened,
    //    it is found here and the user is auto-logged in with no second prompt.
    checkSession();

    // 2. Subscribe to auth events (login, logout, token refresh, INITIAL_SESSION).
    //    onAuthStateChange also fires INITIAL_SESSION synchronously when a
    //    stored session exists, so this acts as a second fast-path detector.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setReady(true);
      }
    );

    // 3. visibilitychange — fires when the user switches back to this tab
    //    from the Hub (or any other tab where they logged in).
    //    Re-checking the session here ensures the chat unlocks immediately
    //    without waiting for a token-refresh cycle.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
