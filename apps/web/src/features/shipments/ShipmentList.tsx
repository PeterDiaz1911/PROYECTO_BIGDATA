"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVisibleShipments, type ShipmentView } from "./shipmentApi";
import { statusNames } from "./ShipmentStatusForm";
import styles from "./ShipmentWorkspace.module.scss";

export function ShipmentList({
  client,
  refreshKey,
}: {
  client: SupabaseClient<Database>;
  refreshKey: number;
}) {
  const [shipments, setShipments] = useState<ShipmentView[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setShipments([]);
    async function loadShipments() {
      try {
        const { data, error: requestError } = await listVisibleShipments(client);
        if (!active) return;
        if (requestError) {
          setError(`No se pudieron cargar los envíos: ${requestError.message}`);
        } else {
          setShipments(data ?? []);
        }
      } catch (cause) {
        if (active) {
          setError(`No se pudieron cargar los envíos: ${cause instanceof Error ? cause.message : "error desconocido"}`);
        }
      } finally {
        if (active) setBusy(false);
      }
    }
    void loadShipments();
    return () => { active = false; };
  }, [client, refreshKey]);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>DATOS PERSISTIDOS</span>
          <h2>Envíos accesibles para tu cuenta</h2>
          <p>La consulta queda limitada por las políticas de acceso de la agencia y del cliente.</p>
        </div>
      </div>
      {busy && <p className={styles.muted}>Cargando desde Supabase...</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {!busy && !error && shipments.length === 0 && <p className={styles.empty}>Aún no hay envíos visibles para tu cuenta.</p>}
      {!busy && shipments.length > 0 && (
        <div className={styles.shipmentList}>
          {shipments.map((shipment) => (
            <article className={styles.shipment} key={shipment.id}>
              <div className={styles.shipmentTop}>
                <strong>{shipment.tracking_code}</strong>
                <span className={styles.status}>{statusNames[shipment.status]}</span>
              </div>
              <p>{shipment.destination}</p>
              <div className={styles.shipmentMeta}>
                <span>{shipment.service === "express" ? "Expreso" : "Estándar"}</span>
                <span>{shipment.weight_kg} kg</span>
                <time dateTime={shipment.created_at}>{new Date(shipment.created_at).toLocaleString("es-PE")}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
