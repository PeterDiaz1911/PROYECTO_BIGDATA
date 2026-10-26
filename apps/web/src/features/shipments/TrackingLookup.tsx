"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { findVisibleShipment, getShipmentHistory } from "./shipmentApi";
import type { ShipmentHistory, ShipmentStatus } from "./shipmentApi";
import { statusNames } from "./ShipmentStatusForm";
import styles from "./ShipmentWorkspace.module.scss";

type Result = {
  id: string;
  tracking_code: string;
  status: ShipmentStatus;
  destination: string;
  created_at: string;
  updated_at: string;
};

export function TrackingLookup({ client }: { client: SupabaseClient<Database> }) {
  const [code, setCode] = useState("");
  const [shipment, setShipment] = useState<Result | null>(null);
  const [history, setHistory] = useState<ShipmentHistory[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSearched(false);
    setShipment(null);
    setHistory([]);
    try {
      const { data, error: lookupError } = await findVisibleShipment(client, code);
      if (lookupError) throw lookupError;
      if (!data) {
        setSearched(true);
        return;
      }
      const { data: entries, error: historyError } = await getShipmentHistory(client, data.id);
      if (historyError) throw historyError;
      setShipment(data);
      setHistory(entries ?? []);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el tracking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>SEGUIMIENTO DE ENVÍOS</span>
          <h2>Consulta tu encomienda</h2>
          <p>Solo se muestran envíos asignados a tu cuenta; un código ajeno se trata como no encontrado.</p>
        </div>
      </div>
      <form className={styles.trackingForm} onSubmit={submit}>
        <label>
          Código de tracking
          <input autoCapitalize="characters" maxLength={40} onChange={(event) => setCode(event.target.value)} placeholder="SP-PE-AAAAmmdd-00000001" required value={code} />
        </label>
        <button className={styles.primaryButton} disabled={busy} type="submit"><Search size={16} />{busy ? "Consultando..." : "Consultar"}</button>
      </form>
      {error && <div className={styles.error} role="alert">No se pudo consultar el envío: {error}</div>}
      {searched && !error && !shipment && <div className={styles.empty} role="status">Envío no encontrado.</div>}
      {shipment && (
        <div className={styles.trackingResult}>
          <div className={styles.shipmentTop}>
            <strong>{shipment.tracking_code}</strong>
            <span className={styles.status}>{statusNames[shipment.status]}</span>
          </div>
          <p>{shipment.destination}</p>
          <h3>Historial de seguimiento</h3>
          {history.length === 0 ? (
            <p className={styles.muted}>Este envío aún no tiene actualizaciones de historial.</p>
          ) : (
            <ol className={styles.timeline}>
              {history.map((entry) => (
                <li key={entry.id}>
                  <strong>{statusNames[entry.status]}</strong>
                  <p>{entry.note}</p>
                  <span>{new Date(entry.created_at).toLocaleString("es-PE")} · Personal autenticado</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
