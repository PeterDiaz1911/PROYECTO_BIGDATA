"use client";

import { useState, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RoleCode, ShipmentStatus } from "@/lib/supabase/database.types";
import { findVisibleShipment, getShipmentErrorMessage, updateShipmentStatus } from "./shipmentApi";
import styles from "./ShipmentWorkspace.module.scss";

const statusNames: Record<ShipmentStatus, string> = {
  registered: "Registrado",
  classified: "Clasificado",
  in_transit: "En tránsito",
  at_destination: "En agencia de destino",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  delivery_failed: "Intento de entrega fallido",
  returned: "Devuelto",
};

const roleTransitions: Partial<Record<RoleCode, Partial<Record<ShipmentStatus, ShipmentStatus[]>>>> = {
  admin: {
    registered: ["classified"],
    classified: ["in_transit"],
    in_transit: ["at_destination"],
    at_destination: ["out_for_delivery"],
    out_for_delivery: ["delivered", "delivery_failed"],
    delivery_failed: ["out_for_delivery", "returned"],
  },
  sorter: { registered: ["classified"] },
  transport: { classified: ["in_transit"], in_transit: ["at_destination"] },
  courier: {
    at_destination: ["out_for_delivery"],
    out_for_delivery: ["delivered", "delivery_failed"],
    delivery_failed: ["out_for_delivery", "returned"],
  },
};

export { statusNames };

export function ShipmentStatusForm({
  client,
  role,
  onUpdated,
}: {
  client: SupabaseClient<Database>;
  role: RoleCode;
  onUpdated: () => void;
}) {
  const [trackingCode, setTrackingCode] = useState("");
  const [status, setStatus] = useState<ShipmentStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data: shipment, error: lookupError } = await findVisibleShipment(client, trackingCode);
      if (lookupError) throw lookupError;
      if (!shipment) throw new Error("shipment_not_found");
      const allowed = roleTransitions[role]?.[shipment.status] ?? [];
      if (!status || !allowed.includes(status)) {
        throw new Error("invalid_status_transition");
      }

      const { data, error: requestError } = await updateShipmentStatus(client, {
        trackingCode,
        status,
        note,
      });
      if (requestError) throw requestError;
      if (!data?.length) throw new Error("La operación no devolvió el cambio guardado.");
      setTrackingCode("");
      setStatus("");
      setNote("");
      onUpdated();
    } catch (cause) {
      setError(getShipmentErrorMessage(cause instanceof Error ? cause.message : "No se pudo actualizar el envío."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>SEGUIMIENTO OPERATIVO</span>
          <h2>Actualizar estado</h2>
          <p>La base de datos vuelve a validar el rol, la agencia y la transición antes de guardar el historial.</p>
        </div>
        <RefreshCw size={20} aria-hidden="true" />
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label>
          Código de tracking
          <input autoCapitalize="characters" maxLength={40} onChange={(event) => setTrackingCode(event.target.value)} required value={trackingCode} />
        </label>
        <label>
          Nuevo estado
          <select onChange={(event) => setStatus(event.target.value as ShipmentStatus | "")} required value={status}>
            <option value="">Selecciona el siguiente estado</option>
            {Object.entries(statusNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label>
          Nota de la operación
          <textarea maxLength={500} onChange={(event) => setNote(event.target.value)} required rows={3} value={note} />
        </label>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? "Guardando..." : "Guardar actualización"}
        </button>
      </form>
    </section>
  );
}
