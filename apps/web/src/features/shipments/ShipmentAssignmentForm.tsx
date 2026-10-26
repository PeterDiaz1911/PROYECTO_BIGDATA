"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserRoundCog } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { assignShipment, getShipmentErrorMessage, listAssignableStaff } from "./shipmentApi";
import styles from "./ShipmentWorkspace.module.scss";

type AssignmentRole = "sorter" | "transport" | "courier";
type StaffOption = { id: string; full_name: string };

const roleLabels: Record<AssignmentRole, string> = {
  sorter: "Clasificación",
  transport: "Transporte",
  courier: "Reparto",
};

export function ShipmentAssignmentForm({
  client,
  onAssigned,
}: {
  client: SupabaseClient<Database>;
  onAssigned: () => void;
}) {
  const [trackingCode, setTrackingCode] = useState("");
  const [role, setRole] = useState<AssignmentRole>("sorter");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingStaff(true);
    setStaff([]);
    setStaffId("");
    void listAssignableStaff(client, role)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          setError(`No se pudo cargar el personal: ${queryError.message}`);
          return;
        }
        const available = (data ?? []).map(({ id, full_name }) => ({ id, full_name }));
        setStaff(available);
        setStaffId(available[0]?.id ?? "");
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(`No se pudo cargar el personal: ${cause instanceof Error ? cause.message : "error desconocido"}`);
      })
      .finally(() => {
        if (active) setLoadingStaff(false);
      });
    return () => { active = false; };
  }, [client, role]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { data, error: assignmentError } = await assignShipment(client, {
        trackingCode,
        staffId,
        roleCode: role,
      });
      if (assignmentError) throw assignmentError;
      if (!data?.length) throw new Error("La operación no devolvió la asignación guardada.");
      setMessage(`${roleLabels[role]} asignado correctamente.`);
      onAssigned();
    } catch (cause) {
      setError(getShipmentErrorMessage(cause instanceof Error ? cause.message : "No se pudo asignar el envío."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>ASIGNACIÓN OPERATIVA</span>
          <h2>Asignar personal</h2>
          <p>La base de datos valida rol, activación y agencia antes de guardar.</p>
        </div>
        <UserRoundCog size={20} aria-hidden="true" />
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label>
          Código de tracking
          <input
            autoCapitalize="characters"
            maxLength={40}
            onChange={(event) => setTrackingCode(event.target.value)}
            required
            value={trackingCode}
          />
        </label>
        <label>
          Función
          <select onChange={(event) => setRole(event.target.value as AssignmentRole)} value={role}>
            {Object.entries(roleLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label>
          Empleado activo del rol seleccionado
          <select
            disabled={loadingStaff || staff.length === 0}
            onChange={(event) => setStaffId(event.target.value)}
            required
            value={staffId}
          >
            {loadingStaff && <option value="">Cargando personal...</option>}
            {!loadingStaff && staff.length === 0 && <option value="">No hay personal disponible</option>}
            {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
        </label>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {message && <div className={styles.success} role="status">{message}</div>}
        <button className={styles.primaryButton} disabled={busy || loadingStaff || !staffId} type="submit">
          {busy ? "Asignando..." : "Guardar asignación"}
        </button>
      </form>
    </section>
  );
}
