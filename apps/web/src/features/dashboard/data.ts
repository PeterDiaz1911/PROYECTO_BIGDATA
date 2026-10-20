import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Map,
  MapPin,
  Package,
  PackageCheck,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { Role, RoleDefinition } from "./types";

export const roles: RoleDefinition[] = [
  {
    id: "admin",
    label: "Administrador",
    shortLabel: "Administración",
    initials: "AD",
    description: "Control general de la plataforma",
    navigation: [
      { key: "overview", label: "Resumen", icon: LayoutDashboard },
      { key: "users", label: "Usuarios y roles", icon: Users },
      { key: "centers", label: "Centros operativos", icon: Building2 },
      { key: "shipments", label: "Envíos", icon: Package },
      { key: "catalogs", label: "Catálogos", icon: Settings2 },
      { key: "audit", label: "Auditoría", icon: ShieldCheck },
    ],
  },
  {
    id: "operator",
    label: "Operador postal",
    shortLabel: "Operaciones",
    initials: "OP",
    description: "Admisión y registro de envíos",
    navigation: [
      { key: "overview", label: "Resumen", icon: LayoutDashboard },
      { key: "new-shipment", label: "Registrar envío", icon: Package },
      { key: "shipments", label: "Envíos", icon: ClipboardList },
      { key: "clients", label: "Clientes", icon: Users },
      { key: "tracking-public", label: "Consultar envío", icon: ScanLine },
    ],
  },
  {
    id: "sorter",
    label: "Encargado de clasificación",
    shortLabel: "Clasificación",
    initials: "CL",
    description: "Clasificación y encaminamiento",
    navigation: [
      { key: "overview", label: "Resumen", icon: LayoutDashboard },
      { key: "queue", label: "Bandeja de clasificación", icon: Boxes },
      { key: "scan", label: "Escanear paquete", icon: ScanLine },
      { key: "routes", label: "Encaminamiento", icon: Route },
      { key: "incidents", label: "Incidencias", icon: Activity },
    ],
  },
  {
    id: "transport",
    label: "Encargado de transporte",
    shortLabel: "Transporte",
    initials: "TR",
    description: "Despachos, vehículos y rutas",
    navigation: [
      { key: "overview", label: "Resumen", icon: LayoutDashboard },
      { key: "dispatches", label: "Despachos", icon: Truck },
      { key: "routes", label: "Rutas", icon: Map },
      { key: "fleet", label: "Vehículos", icon: Truck },
      { key: "incidents", label: "Incidencias", icon: Activity },
    ],
  },
  {
    id: "courier",
    label: "Repartidor",
    shortLabel: "Reparto",
    initials: "RE",
    description: "Entregas asignadas y visitas",
    navigation: [
      { key: "overview", label: "Mi jornada", icon: LayoutDashboard },
      { key: "deliveries", label: "Entregas asignadas", icon: PackageCheck },
      { key: "route", label: "Mi ruta", icon: MapPin },
      { key: "history", label: "Historial", icon: FileText },
    ],
  },
  {
    id: "analyst",
    label: "Supervisor / Analista",
    shortLabel: "Analítica",
    initials: "AN",
    description: "Indicadores y supervisión",
    navigation: [
      { key: "overview", label: "Resumen", icon: LayoutDashboard },
      { key: "performance", label: "Rendimiento", icon: BarChart3 },
      { key: "centers", label: "Centros y zonas", icon: Map },
      { key: "incidents", label: "Incidencias", icon: Activity },
      { key: "reports", label: "Reportes", icon: FileText },
    ],
  },
  {
    id: "client",
    label: "Cliente externo",
    shortLabel: "Tracking público",
    initials: "CL",
    description: "Consulta pública de seguimiento",
    navigation: [
      { key: "tracking-public", label: "Consultar envío", icon: ScanLine },
    ],
  },
];

export const demoShipments = [
  {
    code: "SP-PE-8426-0915",
    recipient: "María Fernanda Rojas",
    destination: "Miraflores, Lima",
    service: "Expreso",
    status: "En reparto",
    tone: "blue",
    time: "09:42",
  },
  {
    code: "SP-PE-8426-0914",
    recipient: "Carlos Mendoza",
    destination: "Arequipa, Arequipa",
    service: "Estándar",
    status: "En tránsito",
    tone: "violet",
    time: "09:18",
  },
  {
    code: "SP-PE-8426-0913",
    recipient: "Lucía Salazar",
    destination: "Trujillo, La Libertad",
    service: "Expreso",
    status: "Clasificado",
    tone: "amber",
    time: "08:56",
  },
  {
    code: "SP-PE-8426-0912",
    recipient: "Diego Paredes",
    destination: "Cusco, Cusco",
    service: "Estándar",
    status: "Admitido",
    tone: "green",
    time: "08:21",
  },
];

export const weeklyVolumes = [
  { day: "Lun", volume: 42 },
  { day: "Mar", volume: 58 },
  { day: "Mié", volume: 49 },
  { day: "Jue", volume: 74 },
  { day: "Vie", volume: 63 },
  { day: "Sáb", volume: 86 },
  { day: "Dom", volume: 39 },
];

export function getRole(roleId: Role) {
  return roles.find((role) => role.id === roleId) ?? roles[0];
}
