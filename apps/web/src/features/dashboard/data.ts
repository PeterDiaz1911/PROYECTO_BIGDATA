import {
  Boxes,
  Package,
  PackageCheck,
  ScanLine,
  Truck,
} from "lucide-react";
import type { Role, RoleDefinition } from "./types";

export const roles: RoleDefinition[] = [
  {
    id: "admin",
    label: "Administrador",
    shortLabel: "Administración",
    initials: "AD",
    description: "Supervisión general",
    navigation: [
      { key: "shipments", label: "Envíos y asignaciones", icon: Package },
    ],
  },
  {
    id: "operator",
    label: "Operador postal",
    shortLabel: "Operaciones",
    initials: "OP",
    description: "Admisión de encomiendas",
    navigation: [
      { key: "admission", label: "Registrar y asignar", icon: Package },
    ],
  },
  {
    id: "sorter",
    label: "Encargado de clasificación",
    shortLabel: "Clasificación",
    initials: "CL",
    description: "Clasificación y encaminamiento",
    navigation: [
      { key: "classification", label: "Clasificación asignada", icon: Boxes },
    ],
  },
  {
    id: "transport",
    label: "Encargado de transporte",
    shortLabel: "Transporte",
    initials: "TR",
    description: "Actualización del tránsito asignado",
    navigation: [
      { key: "transit", label: "Tránsito asignado", icon: Truck },
    ],
  },
  {
    id: "courier",
    label: "Repartidor",
    shortLabel: "Reparto",
    initials: "RE",
    description: "Entrega de encomiendas",
    navigation: [
      { key: "delivery", label: "Entregas asignadas", icon: PackageCheck },
    ],
  },
  {
    id: "analyst",
    label: "Supervisor / Analista",
    shortLabel: "Supervisión",
    initials: "AN",
    description: "Consulta de operación",
    navigation: [
      { key: "shipment-query", label: "Consulta de envíos", icon: Package },
    ],
  },
  {
    id: "client",
    label: "Cliente",
    shortLabel: "Mi cuenta",
    initials: "CL",
    description: "Consulta de encomiendas propias",
    navigation: [
      { key: "tracking", label: "Seguimiento de envíos", icon: ScanLine },
    ],
  },
];

export function getRole(roleId: Role) {
  const role = roles.find((item) => item.id === roleId);
  if (!role) throw new Error(`Rol no configurado: ${roleId}`);
  return role;
}
