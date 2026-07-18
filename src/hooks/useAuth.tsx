import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingForNewUser } from "./useUserSettings";
import { nativeStorage } from "@/lib/nativeStorage";

const OFFLINE_USER_KEY = "vistaOfflineUser";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreOfflineUser = async () => {
      if (navigator.onLine !== false) return false;
      const raw = await nativeStorage.getItem(OFFLINE_USER_KEY);
      if (!active || !raw) return false;
      try {
        setUser(JSON.parse(raw) as User);
        setSession(null);
        return true;
      } catch {
        await nativeStorage.removeItem(OFFLINE_USER_KEY);
        return false;
      }
    };

    const rememberUser = (nextUser: User) => {
      void nativeStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(nextUser));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (nextSession?.user) {
        setSession(nextSession);
        setUser(nextSession.user);
        rememberUser(nextSession.user);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        void nativeStorage.removeItem(OFFLINE_USER_KEY);
        setLoading(false);
      }
    });

    const restoreSession = async () => {
      try {
        const { data: { session: storedSession }, error } = await supabase.auth.getSession();
        if (!active) return;
        if (storedSession?.user) {
          setSession(storedSession);
          setUser(storedSession.user);
          rememberUser(storedSession.user);
        } else if (error || navigator.onLine === false) {
          await restoreOfflineUser();
        } else {
          setSession(null);
          setUser(null);
        }
      } catch {
        await restoreOfflineUser();
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleOnline = () => void restoreSession();
    window.addEventListener("online", handleOnline);
    void restoreSession();

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (!error) markOnboardingForNewUser(data.user?.id);
    return {
      error: error as Error | null,
      needsEmailConfirmation: !error && !!data.user && !data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await nativeStorage.removeItem(OFFLINE_USER_KEY);
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // O logout local continua válido quando o dispositivo está offline.
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
