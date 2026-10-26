"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, RoleCode } from "@/lib/supabase/database.types";
import { ShipmentList } from "./ShipmentList";
import { ShipmentAssignmentForm } from "./ShipmentAssignmentForm";
import { ShipmentRegistrationForm } from "./ShipmentRegistrationForm";
import { ShipmentStatusForm } from "./ShipmentStatusForm";
import { TrackingLookup } from "./TrackingLookup";
import styles from "./ShipmentWorkspace.module.scss";

const roleDescriptions: Record<RoleCode, string> = {
  admin: "Supervisa los envíos registrados y el flujo operativo de la agencia.",
  operator: "Registra encomiendas para clientes con cuenta confirmada.",
  sorter: "Clasifica encomiendas recibidas y registra el siguiente movimiento.",
  transport: "Actualiza el tránsito y la llegada a la agencia de destino.",
  courier: "Registra los intentos y resultados de entrega.",
  analyst: "Consulta los envíos autorizados para supervisión.",
  client: "Consulta únicamente las encomiendas asociadas a tu cuenta.",
};

export function ShipmentWorkspace({
  client,
  profile,
  activeItem,
}: {
  client: SupabaseClient<Database>;
  profile: Profile;
  activeItem: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const role = profile.role_code;
  const mayUpdate = ["admin", "sorter", "transport", "courier"].includes(role);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>{profile.full_name}</span>
          <h1>{role === "client" ? "Seguimiento de encomiendas" : activeItem}</h1>
          <p>{roleDescriptions[role]}</p>
        </div>
        <span className={styles.roleChip}>{profile.role_code}</span>
      </header>

      {role === "client" ? (
        <>
          <TrackingLookup client={client} />
          <ShipmentList client={client} refreshKey={refreshKey} />
        </>
      ) : (
        <>
          {(role === "operator" || mayUpdate) && (
            <div className={styles.columns}>
              {role === "operator" && <ShipmentRegistrationForm client={client} onCreated={refresh} />}
              {(role === "operator" || role === "admin") && (
                <ShipmentAssignmentForm client={client} onAssigned={refresh} />
              )}
              {mayUpdate && <ShipmentStatusForm client={client} role={role} onUpdated={refresh} />}
            </div>
          )}
          <ShipmentList client={client} refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}
