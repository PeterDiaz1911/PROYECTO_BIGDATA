"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge, Dropdown } from "react-bootstrap";
import styles from "./WorkspaceShell.module.scss";
import { getRole, roles } from "@/features/dashboard/data";
import type { NavigationItem, Role } from "@/features/dashboard/types";

type WorkspaceShellProps = {
  role: Role;
  activeItem: string;
  onRoleChange: (role: Role) => void;
  onNavigate: (item: NavigationItem) => void;
  children: ReactNode;
};

export function WorkspaceShell({
  role,
  activeItem,
  onRoleChange,
  onNavigate,
  children,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const currentRole = getRole(role);

  function selectNavigation(item: NavigationItem) {
    onNavigate(item);
    setSidebarOpen(false);
  }

  return (
    <div className={styles.workspace}>
      {sidebarOpen && (
        <button
          className={styles.sidebarScrim}
          aria-label="Cerrar menú de navegación"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className={styles.brandName}>SERPOST</div>
            <div className={styles.brandCaption}>LOGÍSTICA · DEMO</div>
          </div>
          <button
            className={styles.closeSidebar}
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <div className={styles.workspaceLabel}>ESPACIO DE TRABAJO</div>
        <Dropdown className={styles.rolePicker}>
          <Dropdown.Toggle className={styles.roleToggle} id="role-picker">
            <span className={styles.roleAvatar}>{currentRole.initials}</span>
            <span className={styles.roleText}>
              <strong>{currentRole.shortLabel}</strong>
              <small>{currentRole.description}</small>
            </span>
            <ChevronDown size={16} />
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.roleMenu}>
            {roles.map((item) => (
              <Dropdown.Item
                key={item.id}
                active={item.id === role}
                onClick={() => onRoleChange(item.id)}
              >
                <span className={styles.menuInitials}>{item.initials}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        <div className={styles.navLabel}>MENÚ PRINCIPAL</div>
        <nav className={styles.navigation} aria-label="Navegación principal">
          {currentRole.navigation.map((item) => {
            const Icon = item.icon;
            const selected = activeItem === item.label;
            return (
              <button
                key={item.key}
                className={`${styles.navItem} ${selected ? styles.navItemActive : ""}`}
                aria-current={selected ? "page" : undefined}
                onClick={() => selectNavigation(item)}
              >
                <Icon size={18} strokeWidth={selected ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {item.key === "queue" && <span className={styles.navCount}>12</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.helpCard}>
            <span className={styles.helpIcon}><CircleHelp size={17} /></span>
            <strong>¿Necesitas ayuda?</strong>
            <p>Consulta la guía de operaciones logísticas.</p>
            <button onClick={() => onNavigate({ key: "help", label: "Centro de ayuda", icon: CircleHelp })}>
              Abrir centro de ayuda <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className={styles.demoNote}>
            <ShieldCheck size={15} />
            <span>Entorno académico de demostración</span>
          </div>
          <button className={styles.signOut} onClick={() => onRoleChange("client")}>
            <LogOut size={17} />
            <span>Salir del panel interno</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.mobileMenu}
              aria-label="Abrir menú de navegación"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className={styles.breadcrumb}>
              <span>Panel de control</span>
              <span className={styles.breadcrumbSlash}>/</span>
              <strong>{activeItem}</strong>
            </div>
          </div>
          <div className={styles.topbarActions}>
            <label className={styles.searchBox}>
              <Search size={17} />
              <input
                aria-label="Buscar envíos o tracking"
                placeholder="Buscar envío o tracking..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && <kbd>↵</kbd>}
            </label>
            <button className={styles.notificationButton} aria-label="Notificaciones">
              <Bell size={19} />
              <span />
            </button>
            <div className={styles.profile}>
              <div className={styles.profileAvatar}>{currentRole.initials}</div>
              <div className={styles.profileDetails}>
                <strong>{role === "client" ? "Consulta pública" : "Equipo de operaciones"}</strong>
                <small>{currentRole.label}</small>
              </div>
              <ChevronDown size={15} className={styles.profileChevron} />
            </div>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.demoBanner}>
            <Badge bg="warning" text="dark">DEMO</Badge>
            <span>
              Datos ficticios para demostración académica. Esta interfaz no es un portal oficial
              de SERPOST y aún no está conectada a una base de datos.
            </span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
