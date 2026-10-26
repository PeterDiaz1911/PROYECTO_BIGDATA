# Alcance funcional por perfil

Esta matriz describe funciones ejecutables, no etiquetas del menú. La seguridad de los datos está en PostgreSQL/RPC; las celdas no convierten las capacidades pendientes en módulos operativos.

**Estados:** Implementado = flujo persistente disponible; Parcial = operación acotada o depende de configuración externa; Pendiente = no existe funcionalidad de producto.

| Capacidad comprobable | Administrador | Operador | Clasificación | Transporte | Repartidor | Supervisor / Analista | Cliente |
|---|---|---|---|---|---|---|---|
| Inicio de sesión y perfil cargado desde Supabase | Implementado | Implementado | Implementado | Implementado | Implementado | Implementado | Implementado |
| Consultar envíos e historial autorizados por RLS | Implementado | Implementado (agencia) | Implementado (agencia) | Implementado (agencia) | Implementado (agencia) | Implementado (global) | Implementado (propios) |
| Registrar envío, tracking aleatorio y evento inicial | Pendiente | Implementado | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Asignar clasificación, transporte o reparto al envío | Implementado | Implementado (misma agencia) | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Avanzar de estado en una transacción con historial | Parcial (todas las transiciones) | Pendiente | Parcial (clasificación asignada) | Parcial (tránsito asignado) | Parcial (entrega asignada) | Pendiente | Pendiente |
| Cola de trabajo y bandeja por empleado asignado | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Portal público de tracking (no es una capacidad RBAC) | No aplica | No aplica | No aplica | No aplica | No aplica | No aplica | No aplica |
| Administración de usuarios, roles y activación desde interfaz | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Gestión de agencias y cobertura | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Clasificación como módulo de reglas, escaneo y bandejas | Pendiente | Pendiente | Parcial (solo transición manual asignada) | Pendiente | Pendiente | Pendiente | Pendiente |
| Despachos, rutas y planificación | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Gestión y asignación de vehículos | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Gestión integral de entregas | Pendiente | Pendiente | Pendiente | Pendiente | Parcial (estados, sin prueba de entrega) | Pendiente | Pendiente |
| Incidencias, evidencias y comprobantes | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Reportes, métricas y exportaciones | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |
| Auditoría de cambios y eventos de estado | Implementado (historial de envíos, no bitácora administrativa completa) | Implementado (eventos de agencia) | Implementado (eventos visibles) | Implementado (eventos visibles) | Implementado (eventos visibles) | Implementado (eventos visibles) | Implementado (envíos propios) |

## Límites conocidos de la primera entrega

- La ruta pública y el backend Turnstile están implementados, pero su disponibilidad funcional es **parcial** hasta desplegar `public-tracking` y configurar el widget y el secreto. Esta capacidad no pertenece a ninguno de los siete perfiles.
- Las asignaciones cubren únicamente empleado, envío, rol operativo y agencia. No existen turnos, vehículos, rutas ni asignaciones por destino.
- El operador puede registrar un envío para un cliente con correo confirmado; el RPC determina el `user_id` desde `customers`/`auth.users`. El cliente no puede invocar el RPC ni elegir un destinatario para apropiarse de envíos.
- La consulta pública devuelve solo código, estado actual, agencia/ciudad, fechas y descripción pública. No devuelve dirección, cliente, contenido interno ni historial.
- El historial se escribe mediante triggers en la misma transacción que el alta/cambio de estado. La identidad proviene de `auth.uid()`.
- La auditoría disponible es historial logístico inmutable desde el cliente; no registra todos los cambios administrativos de perfiles/agencias.
- Las cuentas inactivas conservan acceso a su propio perfil para mostrar el motivo del bloqueo, pero no pueden consultar ni modificar envíos.
- El primer administrador y las cuentas de personal se habilitan en SQL Editor usando acceso administrativo del proyecto, nunca desde la clave pública.
