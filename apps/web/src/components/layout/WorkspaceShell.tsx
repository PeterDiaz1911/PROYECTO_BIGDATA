"use client";

import { useState } from "react";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { getRole } from "@/features/dashboard/data";
import type { NavigationItem } from "@/features/dashboard/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/supabase/database.types";
import styles from "./WorkspaceShell.module.scss";

export function WorkspaceShell({
  profile,
  email,
  client,
  activeItem,
  onNavigate,
  children,
}: {
  profile: Profile;
  email: string;
  client: SupabaseClient<Database>;
  activeItem: string;
  onNavigate: (item: NavigationItem) => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const role = getRole(profile.role_code);

  async function signOut() {
    setSignOutError("");
    const { error } = await client.auth.signOut();
    if (error) setSignOutError(`No se pudo cerrar sesión: ${error.message}`);
  }

  function selectNavigation(item: NavigationItem) {
    onNavigate(item);
    setSidebarOpen(false);
  }

  return (
    <div className={styles.workspace}>
      {sidebarOpen && (
        <button
          aria-label="Cerrar menú de navegación"
          className={styles.sidebarScrim}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true"><span /><span /><span /></div>
          <div>
            <div className={styles.brandName}>LOGÍSTICA</div>
            <div className={styles.brandCaption}>GESTIÓN DE ENVÍOS</div>
          </div>
          <button aria-label="Cerrar menú" className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>

        <div className={styles.workspaceLabel}>CUENTA AUTENTICADA</div>
        <div className={styles.identity}>
          <span className={styles.roleAvatar}>{role.initials}</span>
          <span className={styles.roleText}><strong>{role.label}</strong><small>{profile.full_name}</small></span>
        </div>

        <div className={styles.navLabel}>ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal" className={styles.navigation}>
          {role.navigation.map((item) => {
            const Icon = item.icon;
            const selected = activeItem === item.label;
            return (
              <button
                aria-current={selected ? "page" : undefined}
                className={`${styles.navItem} ${selected ? styles.navItemActive : ""}`}
                key={item.key}
                onClick={() => selectNavigation(item)}
              >
                <Icon size={18} strokeWidth={selected ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.securityNote}>
            <ShieldCheck size={16} />
            <span>Los permisos se validan en Supabase, no solo en esta pantalla.</span>
          </div>
          <button className={styles.signOut} onClick={() => void signOut()}>
            <LogOut size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button aria-label="Abrir menú de navegación" className={styles.mobileMenu} onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
            <div className={styles.breadcrumb}><span>Espacio seguro</span><span className={styles.breadcrumbSlash}>/</span><strong>{activeItem}</strong></div>
          </div>
          <div className={styles.profile}>
            <div className={styles.profileAvatar}>{role.initials}</div>
            <div className={styles.profileDetails}><strong>{role.label}</strong><small>{email}</small></div>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.secureBanner}>
            <ShieldCheck size={16} />
            <span>Sesión protegida · datos limitados por tu rol, cuenta y políticas de acceso.</span>
          </div>
          {signOutError && <div className={styles.error} role="alert">{signOutError}</div>}
          {children}
        </div>
      </main>
    </div>
  );
}
