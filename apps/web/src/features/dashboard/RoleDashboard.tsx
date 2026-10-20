"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Filter,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  ShieldCheck,
  Plus,
  Search,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge, Button, Form } from "react-bootstrap";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { demoShipments, getRole, weeklyVolumes } from "./data";
import type { Role } from "./types";
import styles from "./RoleDashboard.module.scss";

type DashboardProps = { role: Role; activeItem: string };

const demoTrackingCode = "SP-PE-8426-0915";

export function RoleDashboard({ role, activeItem }: DashboardProps) {
  if (role === "client") return <TrackingPage />;

  if (activeItem !== "Resumen" && activeItem !== "Mi jornada") {
    return <WorkspaceSection role={role} activeItem={activeItem} />;
  }

  switch (role) {
    case "operator":
      return <OperatorDashboard />;
    case "sorter":
      return <SorterDashboard />;
    case "transport":
      return <TransportDashboard />;
    case "courier":
      return <CourierDashboard />;
    case "analyst":
      return <AnalystDashboard />;
    default:
      return <AdminDashboard />;
  }
}

function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.pageHeading}>
      <div>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className={styles.headingActions}>{children}</div>}
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  detail,
  icon: Icon,
  tone,
  down = false,
}: {
  label: string;
  value: string;
  change: string;
  detail: string;
  icon: typeof Package;
  tone: "blue" | "green" | "amber" | "violet";
  down?: boolean;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTop}>
        <div className={styles.metricLabel}>{label}</div>
        <div className={`${styles.metricIcon} ${styles[tone]}`}><Icon size={18} /></div>
      </div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricFooter}>
        <span className={`${styles.metricChange} ${down ? styles.negative : ""}`}>
          {down ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
          {change}
        </span>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`}>
      <div className={styles.panelHeading}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AdminDashboard() {
  return (
    <>
      <PageHeading
        eyebrow="MARTES, 20 DE OCTUBRE DE 2026"
        title="Resumen operativo"
        description="Vista general de la operación postal y logística."
      >
        <Button className={styles.primaryButton}><Download size={15} /> Exportar reporte</Button>
      </PageHeading>
      <div className={styles.metricGrid}>
        <MetricCard label="Envíos registrados" value="2,486" change="+12.8%" detail="vs. mes anterior" icon={Package} tone="blue" />
        <MetricCard label="Entregas exitosas" value="1,942" change="+8.2%" detail="vs. mes anterior" icon={PackageCheck} tone="green" />
        <MetricCard label="En tránsito" value="384" change="En operación" detail="envíos activos" icon={Truck} tone="violet" />
        <MetricCard label="Incidencias abiertas" value="23" change="-4.3%" detail="vs. mes anterior" icon={Activity} tone="amber" down />
      </div>
      <div className={styles.dashboardGrid}>
        <Panel title="Volumen de envíos" subtitle="Actividad de los últimos 7 días" className={styles.chartPanel}
          action={<button className={styles.periodButton}><CalendarDays size={14} /> Esta semana</button>}>
          <VolumeChart />
        </Panel>
        <Panel title="Estado de la operación" subtitle="Distribución de envíos de hoy">
          <div className={styles.statusSummary}>
            <div className={styles.statusTotal}><strong>486</strong><span>envíos en operación</span></div>
            <div className={styles.statusBar}><span className={styles.barDelivered} /><span className={styles.barTransit} /><span className={styles.barWaiting} /><span className={styles.barIncident} /></div>
            <div className={styles.statusLegend}>
              <Legend label="Entregados" value="58%" tone="green" />
              <Legend label="En tránsito" value="24%" tone="blue" />
              <Legend label="Pendientes" value="13%" tone="amber" />
              <Legend label="Con incidencia" value="5%" tone="red" />
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Actividad reciente" subtitle="Últimos movimientos registrados en la plataforma"
        action={<button className={styles.textAction}>Ver todos <ArrowRight size={14} /></button>}>
        <ShipmentTable />
      </Panel>
      <div className={styles.lowerGrid}>
        <Panel title="Centros operativos" subtitle="Actividad de hoy">
          <CenterList />
        </Panel>
        <Panel title="Accesos rápidos" subtitle="Tareas de administración">
          <div className={styles.quickActions}>
            <QuickAction icon={UserRound} title="Gestionar usuarios" detail="Roles y accesos" />
            <QuickAction icon={MapPin} title="Centros operativos" detail="Ubicaciones y cobertura" />
            <QuickAction icon={Activity} title="Revisar auditoría" detail="Actividad del sistema" />
          </div>
        </Panel>
      </div>
    </>
  );
}

function OperatorDashboard() {
  return (
    <>
      <PageHeading eyebrow="OPERACIONES POSTALES" title="Admisión de envíos" description="Registra nuevos paquetes y revisa el trabajo de ventanilla.">
        <Button className={styles.primaryButton}><Plus size={16} /> Registrar envío</Button>
      </PageHeading>
      <div className={styles.metricGrid}>
        <MetricCard label="Admitidos hoy" value="128" change="+16.4%" detail="vs. día anterior" icon={Package} tone="blue" />
        <MetricCard label="Pendientes de despacho" value="46" change="En preparación" detail="centro Lima Centro" icon={Truck} tone="amber" />
        <MetricCard label="Clientes atendidos" value="94" change="+8.1%" detail="hoy" icon={UserRound} tone="green" />
        <MetricCard label="Tiempo promedio" value="04:32" change="-00:48" detail="por admisión" icon={Clock3} tone="violet" down />
      </div>
      <div className={styles.operatorGrid}>
        <Panel title="Registro rápido" subtitle="Completa los datos principales para admitir un envío" className={styles.formPanel}>
          <QuickShipmentForm />
        </Panel>
        <Panel title="Turno de hoy" subtitle="Actividad de ventanilla">
          <div className={styles.shiftCard}>
            <div className={styles.shiftNumber}>128 <span>envíos admitidos</span></div>
            <VolumeChart compact />
            <div className={styles.shiftFoot}><span><i className={styles.greenDot} /> Turno activo</span><strong>08:00 — 16:00</strong></div>
          </div>
        </Panel>
      </div>
      <Panel title="Envíos recientes" subtitle="Registros ingresados desde este centro" action={<button className={styles.textAction}>Ver todos <ArrowRight size={14} /></button>}>
        <ShipmentTable />
      </Panel>
    </>
  );
}

function SorterDashboard() {
  return (
    <>
      <PageHeading eyebrow="CENTRO LIMA CENTRO" title="Bandeja de clasificación" description="Verifica, clasifica y encamina los paquetes recibidos.">
        <Button className={styles.primaryButton}><PackageCheck size={16} /> Iniciar clasificación</Button>
      </PageHeading>
      <div className={styles.metricGrid}>
        <MetricCard label="Por clasificar" value="38" change="12 prioritarios" detail="en bandeja" icon={Package} tone="amber" />
        <MetricCard label="Clasificados hoy" value="216" change="+14.2%" detail="vs. día anterior" icon={PackageCheck} tone="green" />
        <MetricCard label="En espera de ruta" value="54" change="6 destinos" detail="pendientes de despacho" icon={Truck} tone="blue" />
        <MetricCard label="Tiempo promedio" value="06:18" change="-01:12" detail="por paquete" icon={Clock3} tone="violet" down />
      </div>
      <div className={styles.sorterGrid}>
        <Panel title="Siguiente paquete" subtitle="Escanea o ingresa el código de tracking" className={styles.scanPanel}>
          <div className={styles.scanBox}>
            <div className={styles.scanIcon}><Package size={24} /></div>
            <strong>Listo para escanear</strong>
            <span>Coloca el código de barras frente al lector o ingrésalo manualmente.</span>
            <div className={styles.scanInput}><Search size={16} /><input placeholder="Ej. SP-PE-8426-0915" /><button aria-label="Buscar código"><ArrowRight size={16} /></button></div>
          </div>
        </Panel>
        <Panel title="Pendientes por destino" subtitle="Paquetes recibidos sin clasificación final">
          <DestinationList />
        </Panel>
      </div>
      <Panel title="Paquetes en bandeja" subtitle="Prioriza los envíos con mayor tiempo de espera" action={<button className={styles.periodButton}><Filter size={14} /> Filtrar</button>}>
        <ShipmentTable compact />
      </Panel>
    </>
  );
}

function TransportDashboard() {
  return (
    <>
      <PageHeading eyebrow="LOGÍSTICA Y DISTRIBUCIÓN" title="Despachos y transporte" description="Coordina la salida, llegada y capacidad de los vehículos.">
        <Button className={styles.primaryButton}><Plus size={16} /> Crear despacho</Button>
      </PageHeading>
      <div className={styles.metricGrid}>
        <MetricCard label="Despachos programados" value="18" change="7 por salir" detail="hoy" icon={Truck} tone="blue" />
        <MetricCard label="Vehículos en ruta" value="12" change="8 disponibles" detail="flota demo" icon={MapPin} tone="green" />
        <MetricCard label="Capacidad utilizada" value="72%" change="Peso y volumen" detail="promedio de flota" icon={Package} tone="violet" />
        <MetricCard label="Alertas de ruta" value="03" change="Requieren revisión" detail="incidencias abiertas" icon={Activity} tone="amber" />
      </div>
      <Panel title="Despachos de hoy" subtitle="Seguimiento de salidas entre centros" action={<button className={styles.periodButton}><CalendarDays size={14} /> 20 oct 2026</button>}>
        <div className={styles.dispatchList}>
          <DispatchRow code="DSP-0268" route="Lima Centro → Arequipa" vehicle="VAN-014 · J. Quispe" packages="48 paquetes" time="08:30" state="En ruta" tone="blue" progress={68} />
          <DispatchRow code="DSP-0269" route="Lima Centro → Trujillo" vehicle="CAM-008 · M. Torres" packages="62 paquetes" time="09:15" state="En ruta" tone="blue" progress={42} />
          <DispatchRow code="DSP-0270" route="Lima Centro → Cusco" vehicle="VAN-021 · R. Flores" packages="35 paquetes" time="10:00" state="Preparación" tone="amber" progress={18} />
          <DispatchRow code="DSP-0271" route="Lima Centro → Huancayo" vehicle="CAM-003 · A. Rojas" packages="51 paquetes" time="10:30" state="Programado" tone="gray" progress={0} />
        </div>
      </Panel>
      <div className={styles.lowerGrid}>
        <Panel title="Estado de flota" subtitle="Vehículos registrados para la demostración"><FleetList /></Panel>
        <Panel title="Alertas de transporte" subtitle="Revisión requerida">
          <AlertList />
        </Panel>
      </div>
    </>
  );
}

function CourierDashboard() {
  const [completed, setCompleted] = useState<string[]>([]);
  const deliveries = [
    { code: "SP-PE-8426-0915", name: "María Fernanda Rojas", address: "Av. Larco 1250, Miraflores", time: "09:30 - 10:30", kind: "Expreso" },
    { code: "SP-PE-8426-0908", name: "Jorge Luis Ponce", address: "Calle Schell 410, Miraflores", time: "10:30 - 11:30", kind: "Estándar" },
    { code: "SP-PE-8426-0892", name: "Ana Belén Castro", address: "Av. Benavides 1860, Surco", time: "11:30 - 12:30", kind: "Expreso" },
  ];
  return (
    <>
      <PageHeading eyebrow="MARTES, 20 DE OCTUBRE · TURNO MAÑANA" title="Hola, repartidor 👋" description="Aquí tienes tu jornada y las entregas asignadas para hoy.">
        <Button className={styles.secondaryButton}><MapPin size={15} /> Ver mi ruta</Button>
      </PageHeading>
      <div className={styles.courierSummary}>
        <div><span>PROGRESO DE LA JORNADA</span><strong>{completed.length} <small>/ {deliveries.length} entregas</small></strong><div className={styles.courierProgress}><span style={{ width: `${(completed.length / deliveries.length) * 100}%` }} /></div></div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}><Clock3 size={17} /><span>Ventana de reparto<strong>09:00 - 17:00</strong></span></div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryStat}><MapPin size={17} /><span>Zona asignada<strong>Miraflores · Surco</strong></span></div>
      </div>
      <div className={styles.deliveryHeading}><div><h2>Próximas entregas</h2><p>Ordenadas según la ruta asignada</p></div><Badge bg="light" text="dark">3 pendientes</Badge></div>
      <div className={styles.deliveryList}>
        {deliveries.map((delivery, index) => {
          const isDone = completed.includes(delivery.code);
          return (
            <article key={delivery.code} className={`${styles.deliveryCard} ${isDone ? styles.deliveryDone : ""}`}>
              <div className={styles.deliverySequence}>{isDone ? <Check size={17} /> : String(index + 1).padStart(2, "0")}</div>
              <div className={styles.deliveryMain}>
                <div className={styles.deliveryMeta}><span>{delivery.code}</span><Badge bg={delivery.kind === "Expreso" ? "primary" : "light"} text={delivery.kind === "Expreso" ? undefined : "dark"}>{delivery.kind}</Badge></div>
                <h3>{delivery.name}</h3>
                <p><MapPin size={14} /> {delivery.address}</p>
                <span className={styles.deliveryTime}><Clock3 size={13} /> {delivery.time}</span>
              </div>
              <div className={styles.deliveryActions}>
                <button className={styles.outlineButton}>Ver detalle</button>
                <button className={styles.deliveredButton} onClick={() => setCompleted((previous) => isDone ? previous.filter((item) => item !== delivery.code) : [...previous, delivery.code])}>
                  <CheckCircle2 size={15} /> {isDone ? "Deshacer" : "Registrar intento"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className={styles.courierHint}><Activity size={16} /><span><strong>Recuerda:</strong> registra el resultado de cada visita y el motivo si no se concreta la entrega.</span></div>
    </>
  );
}

function AnalystDashboard() {
  return (
    <>
      <PageHeading eyebrow="SUPERVISIÓN Y ANALÍTICA" title="Rendimiento logístico" description="Indicadores calculados sobre datos de demostración del periodo seleccionado.">
        <Button className={styles.secondaryButton}><CalendarDays size={15} /> Últimos 30 días</Button>
      </PageHeading>
      <div className={styles.metricGrid}>
        <MetricCard label="Entregas exitosas" value="92.4%" change="+2.1 pp" detail="vs. periodo anterior" icon={PackageCheck} tone="green" />
        <MetricCard label="Tiempo promedio" value="2.8 días" change="-0.3 días" detail="desde admisión" icon={Clock3} tone="blue" down />
        <MetricCard label="Entregas retrasadas" value="7.6%" change="-1.4 pp" detail="vs. periodo anterior" icon={Activity} tone="amber" down />
        <MetricCard label="Incidencias" value="146" change="+5.2%" detail="en el periodo" icon={XCircle} tone="violet" />
      </div>
      <div className={styles.dashboardGrid}>
        <Panel title="Volumen de envíos" subtitle="Conteo diario · periodo demostrativo" className={styles.chartPanel}
          action={<button className={styles.periodButton}><Filter size={14} /> Todos los centros</button>}>
          <VolumeChart />
        </Panel>
        <Panel title="Indicadores del periodo" subtitle="Cálculo ilustrativo sobre registros ficticios">
          <div className={styles.analyticsFacts}>
            <FactRow label="Envíos totales" value="2,486" />
            <FactRow label="Entregas a tiempo" value="2,297" />
            <FactRow label="Entregas fallidas" value="63" />
            <FactRow label="Pendientes" value="126" />
            <div className={styles.formulaNote}>Tasa exitosa = entregas exitosas / envíos con resultado final.</div>
          </div>
        </Panel>
      </div>
      <div className={styles.lowerGrid}>
        <Panel title="Desempeño por centro" subtitle="Entregas registradas a tiempo"><CenterList /></Panel>
        <Panel title="Estado del módulo predictivo" subtitle="Modelos de machine learning">
          <div className={styles.modelPending}><div><Activity size={20} /></div><strong>Entrenamiento pendiente</strong><p>Las predicciones se habilitarán cuando exista suficiente historial validado. No se muestran estimaciones ficticias.</p><Badge bg="light" text="dark">Sin modelo publicado</Badge></div>
        </Panel>
      </div>
    </>
  );
}

function TrackingPage() {
  const [trackingInput, setTrackingInput] = useState(demoTrackingCode);
  const [searched, setSearched] = useState(true);
  const formattedCode = useMemo(() => trackingInput.trim().toUpperCase(), [trackingInput]);

  return (
    <div className={styles.trackingPage}>
      <div className={styles.trackingHero}>
        <div className={styles.eyebrow}>SEGUIMIENTO DE ENVÍOS</div>
        <h1>Tu envío, siempre en camino.</h1>
        <p>Consulta el recorrido y estado de tu envío con tu código de tracking.</p>
        <form className={styles.trackingSearch} onSubmit={(event) => { event.preventDefault(); setSearched(Boolean(formattedCode)); }}>
          <Package size={19} />
          <input aria-label="Código de tracking" value={trackingInput} onChange={(event) => setTrackingInput(event.target.value)} placeholder="Ingresa tu código de tracking" />
          <Button type="submit" className={styles.primaryButton}><Search size={15} /> Consultar</Button>
        </form>
        <span className={styles.trackingHint}>Prueba de demostración: SP-PE-8426-0915</span>
      </div>
      {searched && formattedCode && (
        <div className={styles.trackingResult}>
          <div className={styles.trackingResultHead}>
            <div><span className={styles.eyebrow}>CÓDIGO DE ENVÍO</span><h2>{formattedCode}</h2></div>
            <Badge bg="primary">En reparto</Badge>
          </div>
          <div className={styles.trackingDestination}><div className={styles.destinationIcon}><MapPin size={19} /></div><div><span>DESTINO</span><strong>Miraflores, Lima</strong></div><div className={styles.estimated}><span>ÚLTIMA ACTUALIZACIÓN</span><strong>Hoy, 09:42</strong></div></div>
          <div className={styles.timeline}>
            <TimelineItem title="En reparto" detail="El envío está en ruta de entrega." location="Centro de distribución Miraflores" date="Hoy · 09:42" current />
            <TimelineItem title="Llegada al centro de destino" detail="El envío llegó al centro de distribución." location="Centro de distribución Lima Sur" date="Hoy · 07:18" />
            <TimelineItem title="En tránsito" detail="El envío salió hacia el centro de destino." location="Centro operativo Lima Centro" date="Ayer · 21:35" />
            <TimelineItem title="Envío admitido" detail="El envío fue registrado correctamente." location="Agencia Lima Centro" date="19 oct · 14:08" last />
          </div>
          <div className={styles.publicPrivacy}><ShieldCheck size={15} /> Por privacidad, esta consulta pública no muestra datos personales del remitente ni del destinatario.</div>
        </div>
      )}
      {!searched && <div className={styles.emptyTracking}>Ingresa un código para consultar el seguimiento.</div>}
      <div className={styles.trackingFooter}>DEMO ACADÉMICA · INFORMACIÓN FICTICIA · NO ES UN PORTAL OFICIAL DE SERPOST</div>
    </div>
  );
}

function WorkspaceSection({ role, activeItem }: { role: Role; activeItem: string }) {
  const roleData = getRole(role);
  const isShipmentForm = activeItem === "Registrar envío";
  return (
    <>
      <PageHeading
        eyebrow={roleData.label.toUpperCase()}
        title={activeItem}
        description={getSectionDescription(activeItem, role)}
      >
        {isShipmentForm && <Button className={styles.primaryButton}><Plus size={15} /> Crear envío</Button>}
        {!isShipmentForm && <Button className={styles.secondaryButton}><Download size={15} /> Exportar</Button>}
      </PageHeading>
      {isShipmentForm ? (
        <Panel title="Datos del envío" subtitle="Completa los datos para generar el registro y tracking">
          <QuickShipmentForm />
        </Panel>
      ) : (
        <>
          <div className={styles.sectionFilters}>
            <label className={styles.filterSearch}><Search size={16} /><input placeholder={`Buscar en ${activeItem.toLowerCase()}...`} /></label>
            <Button className={styles.secondaryButton}><Filter size={14} /> Filtros</Button>
            <Button className={styles.secondaryButton}><CalendarDays size={14} /> Este mes</Button>
          </div>
          <Panel title={activeItem} subtitle="Registros de demostración para la interfaz">
            {activeItem.toLowerCase().includes("entrega") || activeItem === "Mi ruta" ? <CourierDashboard /> : <ShipmentTable />}
          </Panel>
        </>
      )}
    </>
  );
}

function getSectionDescription(item: string, role: Role) {
  if (item === "Usuarios y roles") return "Administra accesos y responsabilidades del personal.";
  if (item === "Registrar envío") return "Ingresa los datos del paquete y genera un código de seguimiento.";
  if (item === "Bandeja de clasificación") return "Consulta los paquetes pendientes de verificación y encaminamiento.";
  if (item === "Despachos") return "Organiza las cargas, vehículos y traslados entre centros.";
  if (item === "Entregas asignadas") return "Consulta y actualiza los resultados de las visitas programadas.";
  if (role === "analyst") return "Indicadores y registros del periodo de análisis seleccionado.";
  return `Consulta y administra ${item.toLowerCase()} del flujo logístico.`;
}

function QuickShipmentForm() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Form className={styles.quickForm} onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
      <div className={styles.formSectionLabel}>INFORMACIÓN DEL REMITENTE</div>
      <div className={styles.formGrid}>
        <Form.Group><Form.Label>Nombre o razón social</Form.Label><Form.Control placeholder="Ej. Ana García" required /></Form.Group>
        <Form.Group><Form.Label>Documento</Form.Label><Form.Control placeholder="DNI / RUC" /></Form.Group>
      </div>
      <div className={styles.formSectionLabel}>DESTINO Y SERVICIO</div>
      <div className={styles.formGrid}>
        <Form.Group><Form.Label>Departamento destino</Form.Label><Form.Select defaultValue=""><option value="" disabled>Selecciona un departamento</option><option>Lima</option><option>Arequipa</option><option>La Libertad</option><option>Cusco</option></Form.Select></Form.Group>
        <Form.Group><Form.Label>Tipo de servicio</Form.Label><Form.Select defaultValue=""><option value="" disabled>Selecciona un servicio</option><option>Estándar</option><option>Expreso</option></Form.Select></Form.Group>
        <Form.Group><Form.Label>Peso (kg)</Form.Label><Form.Control type="number" min="0.1" step="0.1" placeholder="0.0" required /></Form.Group>
        <Form.Group><Form.Label>Contenido declarado</Form.Label><Form.Control placeholder="Descripción breve" /></Form.Group>
      </div>
      {submitted && <div className={styles.formSuccess}><CheckCircle2 size={16} /> Vista previa validada. El registro requiere conexión con la API.</div>}
      <div className={styles.formActions}><span>Los campos se validarán nuevamente en el servidor al integrar la API.</span><Button type="submit" className={styles.primaryButton}>Continuar <ArrowRight size={15} /></Button></div>
    </Form>
  );
}

function ShipmentTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.shipmentTable}>
        <thead><tr><th>CÓDIGO TRACKING</th><th>DESTINATARIO</th><th>DESTINO</th><th>SERVICIO</th><th>ESTADO</th><th>{compact ? "ESPERA" : "HORA"}</th><th aria-label="Acciones" /></tr></thead>
        <tbody>
          {demoShipments.map((shipment, index) => (
            <tr key={shipment.code}>
              <td><strong className={styles.trackingCode}>{shipment.code}</strong></td>
              <td><span className={styles.tablePerson}><span className={styles.tableAvatar}>{shipment.recipient.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>{shipment.recipient}</span></td>
              <td>{shipment.destination}</td>
              <td>{shipment.service}</td>
              <td><span className={`${styles.statusPill} ${styles[`status${shipment.tone}`]}`}><i />{shipment.status}</span></td>
              <td>{compact ? `${12 + index * 7} min` : shipment.time}</td>
              <td><button className={styles.moreButton} aria-label={`Más opciones para ${shipment.code}`}><MoreHorizontal size={17} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolumeChart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.chart} ${compact ? styles.chartCompact : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeklyVolumes} margin={{ top: 7, right: 7, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#edf0f5" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#98a3b2", fontSize: 10 }} dy={8} />
          {!compact && <YAxis axisLine={false} tickLine={false} tick={{ fill: "#a5afbd", fontSize: 9 }} />}
          <Tooltip cursor={{ fill: "#f3f6fb" }} contentStyle={{ border: "1px solid #e9edf3", borderRadius: 8, fontSize: 11 }} />
          <Bar dataKey="volume" name="Envíos" fill="#3168bd" radius={[5, 5, 0, 0]} maxBarSize={compact ? 20 : 31} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles[`dot${tone}`]}`} />{label}<strong>{value}</strong></div>;
}

function CenterList() {
  const centers = [
    { name: "Lima Centro", location: "Lima Metropolitana", volume: 328, percent: 82 },
    { name: "Arequipa", location: "Arequipa", volume: 214, percent: 63 },
    { name: "Trujillo", location: "La Libertad", volume: 186, percent: 52 },
  ];
  return <div className={styles.centerList}>{centers.map((center) => (
    <div className={styles.centerRow} key={center.name}>
      <div className={styles.centerIcon}><MapPin size={16} /></div>
      <div className={styles.centerInfo}><strong>{center.name}</strong><span>{center.location}</span><div className={styles.centerProgress}><i style={{ width: `${center.percent}%` }} /></div></div>
      <b>{center.volume}</b>
    </div>
  ))}</div>;
}

function QuickAction({ icon: Icon, title, detail }: { icon: typeof Package; title: string; detail: string }) {
  return <button className={styles.quickAction}><span><Icon size={16} /></span><div><strong>{title}</strong><small>{detail}</small></div><ChevronRight size={15} /></button>;
}

function DestinationList() {
  const destinations = [{ name: "Lima Metropolitana", count: 26, tone: "blue" }, { name: "Arequipa", count: 12, tone: "violet" }, { name: "La Libertad", count: 9, tone: "amber" }, { name: "Cusco", count: 7, tone: "green" }];
  return <div className={styles.destinationList}>{destinations.map((item) => <div className={styles.destinationRow} key={item.name}><span className={`${styles.destinationDot} ${styles[item.tone]}`} /><span>{item.name}</span><strong>{item.count}</strong><ChevronRight size={14} /></div>)}</div>;
}

function DispatchRow({ code, route, vehicle, packages, time, state, tone, progress }: { code: string; route: string; vehicle: string; packages: string; time: string; state: string; tone: string; progress: number }) {
  return <div className={styles.dispatchRow}><div className={styles.dispatchIcon}><Truck size={18} /></div><div className={styles.dispatchInfo}><div className={styles.dispatchMeta}><strong>{code}</strong><span>{time}</span><span className={`${styles.dispatchState} ${styles[`state${tone}`]}`}>{state}</span></div><h3>{route}</h3><p>{vehicle} <i /> {packages}</p><div className={styles.dispatchProgress}><span style={{ width: `${progress}%` }} /></div></div><button className={styles.moreButton} aria-label={`Más opciones para ${code}`}><MoreHorizontal size={17} /></button></div>;
}

function FleetList() {
  return <div className={styles.fleetList}><FleetRow code="VAN-014" type="Van · 1.2 t" status="En ruta" tone="blue" /><FleetRow code="CAM-008" type="Camión · 4.0 t" status="En ruta" tone="blue" /><FleetRow code="VAN-021" type="Van · 1.2 t" status="Disponible" tone="green" /></div>;
}

function FleetRow({ code, type, status, tone }: { code: string; type: string; status: string; tone: string }) {
  return <div className={styles.fleetRow}><span className={styles.fleetIcon}><Truck size={16} /></span><span><strong>{code}</strong><small>{type}</small></span><Badge bg={tone === "green" ? "success" : "primary"}>{status}</Badge></div>;
}

function AlertList() {
  return <div className={styles.alertList}><div className={styles.alertItem}><span className={styles.alertIcon}><Activity size={15} /></span><span><strong>Demora en ruta a Cusco</strong><small>DSP-0266 · Hace 18 min</small></span><ArrowRight size={14} /></div><div className={styles.alertItem}><span className={styles.alertIcon}><Activity size={15} /></span><span><strong>Revisar capacidad de vehículo</strong><small>DSP-0269 · Hace 42 min</small></span><ArrowRight size={14} /></div></div>;
}

function FactRow({ label, value }: { label: string; value: string }) {
  return <div className={styles.factRow}><span>{label}</span><strong>{value}</strong></div>;
}

function TimelineItem({ title, detail, location, date, current = false, last = false }: { title: string; detail: string; location: string; date: string; current?: boolean; last?: boolean }) {
  return <div className={`${styles.timelineItem} ${current ? styles.timelineCurrent : ""} ${last ? styles.timelineLast : ""}`}><div className={styles.timelineMarker}>{current ? <Truck size={15} /> : <Check size={14} />}</div><div className={styles.timelineCopy}><div><strong>{title}</strong>{current && <Badge bg="primary">Actual</Badge>}</div><p>{detail}</p><span><MapPin size={12} /> {location}</span></div><time>{date}</time></div>;
}
