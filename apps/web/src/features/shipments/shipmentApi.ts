import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Shipment, ShipmentHistory, ShipmentStatus } from "@/lib/supabase/database.types";

export type ShipmentView = Pick<
  Shipment,
  | "id"
  | "tracking_code"
  | "status"
  | "destination"
  | "service"
  | "weight_kg"
  | "contents"
  | "created_at"
  | "updated_at"
>;

export async function listVisibleShipments(client: SupabaseClient<Database>) {
  return client
    .from("shipments")
    .select("id, tracking_code, status, destination, service, weight_kg, contents, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function findVisibleShipment(
  client: SupabaseClient<Database>,
  trackingCode: string,
) {
  return client
    .from("shipments")
    .select("id, tracking_code, status, destination, service, weight_kg, contents, created_at, updated_at")
    .eq("tracking_code", trackingCode.trim().toUpperCase())
    .maybeSingle();
}

export async function getShipmentHistory(client: SupabaseClient<Database>, shipmentId: string) {
  return client
    .from("shipment_history")
    .select("id, shipment_id, status, note, actor_id, created_at")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });
}

export async function createShipment(
  client: SupabaseClient<Database>,
  input: {
    customerEmail: string;
    destination: string;
    publicDescription: string;
    service: "standard" | "express";
    weightKg: number;
    contents: string;
  },
) {
  return client.rpc("create_shipment", {
    p_customer_email: input.customerEmail.trim(),
    p_destination: input.destination.trim(),
    p_public_description: input.publicDescription.trim(),
    p_service: input.service,
    p_weight_kg: input.weightKg,
    p_contents: input.contents.trim(),
  });
}

export async function listAssignableStaff(
  client: SupabaseClient<Database>,
  roleCode: "sorter" | "transport" | "courier",
) {
  return client
    .from("profiles")
    .select("id, full_name, role_code, agency_id, is_active")
    .eq("role_code", roleCode)
    .eq("is_active", true)
    .order("full_name");
}

export async function assignShipment(
  client: SupabaseClient<Database>,
  input: {
    trackingCode: string;
    staffId: string;
    roleCode: "sorter" | "transport" | "courier";
  },
) {
  return client.rpc("assign_shipment", {
    p_tracking_code: input.trackingCode.trim().toUpperCase(),
    p_staff_id: input.staffId,
    p_role_code: input.roleCode,
  });
}

export async function updateShipmentStatus(
  client: SupabaseClient<Database>,
  input: { trackingCode: string; status: ShipmentStatus; note: string },
) {
  return client.rpc("update_shipment_status", {
    p_tracking_code: input.trackingCode.trim().toUpperCase(),
    p_status: input.status,
    p_note: input.note.trim(),
  });
}

export function getShipmentErrorMessage(message: string) {
  if (message.includes("confirmed_customer_not_found")) {
    return "No encontramos un cliente con correo confirmado. Pídele que cree su cuenta y confirme el correo.";
  }
  if (message.includes("operator_agency_required")) {
    return "Tu perfil de operador aún no tiene una agencia asignada. Contacta al administrador.";
  }
  if (message.includes("shipment_update_role_required")) {
    return "Tu rol no está autorizado para actualizar el estado.";
  }
  if (message.includes("shipment_assignment_required")) {
    return "No tienes una asignación activa para este envío.";
  }
  if (message.includes("shipment_assignment_role_required")) {
    return "Solo un administrador u operador puede asignar personal.";
  }
  if (message.includes("staff_agency_or_role_mismatch")) {
    return "El empleado debe estar activo, tener el rol seleccionado y pertenecer a la agencia del envío.";
  }
  if (message.includes("invalid_status_transition")) {
    return "Ese cambio de estado no está permitido para tu rol o para el estado actual del envío.";
  }
  if (message.includes("shipment_not_found")) {
    return "Envío no encontrado o no tienes autorización para consultarlo.";
  }
  if (message.includes("operator_role_required")) {
    return "Solo un operador postal autorizado puede registrar encomiendas.";
  }
  if (message.includes("valid_status_note_required")) {
    return "Escribe una nota para guardar el cambio de estado.";
  }
  if (message.includes("invalid_shipment_details")) {
    return "Revisa los datos de la encomienda: deben ser válidos y estar completos.";
  }
  if (message.includes("tracking_code_is_immutable")) {
    return "El código de tracking no se puede modificar.";
  }
  return message;
}

export type { ShipmentHistory, ShipmentStatus };
