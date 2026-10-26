"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, PackagePlus } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createShipment, getShipmentErrorMessage } from "./shipmentApi";
import styles from "./ShipmentWorkspace.module.scss";

export function ShipmentRegistrationForm({
  client,
  onCreated,
}: {
  client: SupabaseClient<Database>;
  onCreated: () => void;
}) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [destination, setDestination] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [service, setService] = useState<"standard" | "express">("standard");
  const [weight, setWeight] = useState("");
  const [contents, setContents] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTrackingCode("");
    setBusy(true);
    try {
      const { data, error: requestError } = await createShipment(client, {
        customerEmail,
        destination,
        publicDescription,
        service,
        weightKg: Number(weight),
        contents,
      });
      if (requestError) throw requestError;
      const created = data?.[0];
      if (!created) throw new Error("La operación no devolvió el envío creado.");
      setTrackingCode(created.tracking_code);
      setCustomerEmail("");
      setDestination("");
      setPublicDescription("");
      setWeight("");
      setContents("");
      onCreated();
    } catch (cause) {
      setError(getShipmentErrorMessage(cause instanceof Error ? cause.message : "No se pudo registrar el envío."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>ADMISIÓN POSTAL</span>
          <h2>Registrar encomienda</h2>
          <p>El cliente debe tener una cuenta registrada y correo confirmado.</p>
        </div>
        <PackagePlus size={20} aria-hidden="true" />
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label>
          Correo de la cuenta cliente
          <input autoComplete="email" onChange={(event) => setCustomerEmail(event.target.value)} required type="email" value={customerEmail} />
        </label>
        <label>
          Dirección de destino
          <input maxLength={300} onChange={(event) => setDestination(event.target.value)} required value={destination} />
        </label>
        <label>
          Descripción pública del envío
          <select onChange={(event) => setPublicDescription(event.target.value)} required value={publicDescription}>
            <option value="">Selecciona una categoría general</option>
            <option value="Documentos">Documentos</option>
            <option value="Ropa">Ropa</option>
            <option value="Libros">Libros</option>
            <option value="Artículos generales">Artículos generales</option>
          </select>
          <small>Solo se publica esta categoría, no la descripción privada del contenido.</small>
        </label>
        <div className={styles.formRow}>
          <label>
            Servicio
            <select onChange={(event) => setService(event.target.value as "standard" | "express")} value={service}>
              <option value="standard">Estándar</option>
              <option value="express">Expreso</option>
            </select>
          </label>
          <label>
            Peso (kg)
            <input max="1000" min="0.01" onChange={(event) => setWeight(event.target.value)} required step="0.01" type="number" value={weight} />
          </label>
        </div>
        <label>
          Contenido declarado
          <input maxLength={300} onChange={(event) => setContents(event.target.value)} required value={contents} />
        </label>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {trackingCode && (
          <div className={styles.success} role="status">
            <CheckCircle2 size={18} />
            <span>Encomienda guardada. Código de tracking: <strong>{trackingCode}</strong></span>
          </div>
        )}
        <button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? "Guardando..." : "Registrar encomienda"}
        </button>
      </form>
    </section>
  );
}
