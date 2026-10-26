"use client";

import { useState } from "react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { RoleDashboard } from "@/features/dashboard/RoleDashboard";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { getRole } from "@/features/dashboard/data";
import type { NavigationItem } from "@/features/dashboard/types";
import type { Profile } from "@/lib/supabase/database.types";
import authStyles from "@/features/auth/AuthScreen.module.scss";

export default function HomePage() {
  return (
    <AuthProvider>
      <AuthenticatedHome />
    </AuthProvider>
  );
}

function AuthenticatedHome() {
  const {
    client,
    session,
    profile,
    loading,
    profileError,
    passwordRecovery,
    refreshProfile,
  } = useAuth();

  if (!client) {
    return (
      <main className={authStyles.page}>
        <section className={authStyles.card}>
          <h1>Falta configurar Supabase</h1>
          <p className={authStyles.heading}>
            Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en apps/web/.env.local.
            Ejecuta la migración documentada y reinicia la aplicación.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className={authStyles.page}><p role="status">Comprobando sesión y perfil...</p></main>;
  }

  if (passwordRecovery) return <AuthScreen />;
  if (!session) return <AuthScreen />;

  if (profileError || !profile) {
    return (
      <ProfileUnavailable
        client={client}
        message={profileError ?? "No se encontró el perfil asociado a esta cuenta."}
        onRetry={() => void refreshProfile(session.user.id)}
      />
    );
  }

  if (!profile.is_active) {
    return (
      <ProfileUnavailable
        client={client}
        message="Tu cuenta está desactivada y no puede acceder a operaciones ni datos. Contacta al administrador."
        onRetry={() => void refreshProfile(session.user.id)}
      />
    );
  }

  return <AuthenticatedWorkspace client={client} email={session.user.email ?? ""} profile={profile} />;
}

function AuthenticatedWorkspace({
  client,
  email,
  profile,
}: {
  client: NonNullable<ReturnType<typeof useAuth>["client"]>;
  email: string;
  profile: Profile;
}) {
  const [activeItem, setActiveItem] = useState(() => getRole(profile.role_code).navigation[0].label);

  function navigate(item: NavigationItem) {
    setActiveItem(item.label);
  }

  return (
    <WorkspaceShell
      profile={profile}
      email={email}
      client={client}
      activeItem={activeItem}
      onNavigate={navigate}
    >
      <RoleDashboard client={client} profile={profile} activeItem={activeItem} />
    </WorkspaceShell>
  );
}

function ProfileUnavailable({
  client,
  message,
  onRetry,
}: {
  client: NonNullable<ReturnType<typeof useAuth>["client"]>;
  message: string;
  onRetry: () => void;
}) {
  const [error, setError] = useState("");

  async function signOut() {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }

  return (
    <main className={authStyles.page}>
      <section className={authStyles.card}>
        <h1>Perfil no disponible</h1>
        <p>{message}</p>
        {error && <div className={authStyles.error} role="alert">{error}</div>}
        <div className={authStyles.links}>
          <button type="button" onClick={onRetry}>Volver a intentar</button>
          <button type="button" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </section>
    </main>
  );
}
