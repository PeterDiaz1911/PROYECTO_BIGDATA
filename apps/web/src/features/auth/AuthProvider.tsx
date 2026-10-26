"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { Database, Profile } from "@/lib/supabase/database.types";

type AuthContextValue = {
  client: SupabaseClient<Database> | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  refreshProfile: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => createSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const refreshProfile = useCallback(async (userId: string) => {
    if (!client) return;

    setLoading(true);
    setProfile(null);
    setProfileError(null);
    try {
      const { data, error } = await client
        .from("profiles")
        .select("id, full_name, role_code, agency_id, is_active, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setProfileError(`No se pudo cargar tu perfil: ${error.message}`);
        return;
      }
      if (!data) {
        setProfileError("Tu cuenta no tiene un perfil habilitado. Contacta al administrador.");
        return;
      }
      setProfile(data);
    } catch (cause) {
      setProfile(null);
      setProfileError(`No se pudo cargar tu perfil: ${cause instanceof Error ? cause.message : "error desconocido"}`);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      if (_event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }
      queueMicrotask(() => {
        if (active) void refreshProfile(nextSession.user.id);
      });
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setProfileError(`No se pudo restaurar la sesión: ${error.message}`);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session) void refreshProfile(data.session.user.id);
      else setLoading(false);
    }).catch((cause: unknown) => {
      if (!active) return;
      setProfileError(`No se pudo restaurar la sesión: ${cause instanceof Error ? cause.message : "error desconocido"}`);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client, refreshProfile]);

  const value = useMemo(
    () => ({
      client,
      session,
      profile,
      loading,
      profileError,
      passwordRecovery,
      clearPasswordRecovery: () => setPasswordRecovery(false),
      refreshProfile,
    }),
    [client, session, profile, loading, profileError, passwordRecovery, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider.");
  }
  return context;
}
