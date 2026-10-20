"use client";

import { useState } from "react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { RoleDashboard } from "@/features/dashboard/RoleDashboard";
import type { NavigationItem, Role } from "@/features/dashboard/types";

export default function HomePage() {
  const [role, setRole] = useState<Role>("admin");
  const [activeItem, setActiveItem] = useState("Resumen");

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setActiveItem("Resumen");
  }

  function navigate(item: NavigationItem) {
    if (item.key === "tracking-public") {
      setRole("client");
      setActiveItem("Consultar envío");
      return;
    }
    setActiveItem(item.label);
  }

  return (
    <WorkspaceShell
      role={role}
      activeItem={activeItem}
      onRoleChange={changeRole}
      onNavigate={navigate}
    >
      <RoleDashboard role={role} activeItem={activeItem} />
    </WorkspaceShell>
  );
}
