# Matriz inicial de roles y permisos

Propuesta derivada del requerimiento funcional; los permisos efectivos deben validarse en la API y no solo en la interfaz.

| Capacidad | Administrador | Operador postal | Clasificación | Transporte | Repartidor | Supervisor / Analista | Cliente público |
|---|---:|---:|---:|---:|---:|---:|---:|
| Administrar usuarios, roles y permisos | Sí | No | No | No | No | No | No |
| Administrar empleados y centros | Sí | No | No | No | No | No | No |
| Administrar catálogos | Sí | No | No | No | No | No | No |
| Registrar y consultar clientes | Sí | Sí | No | No | No | No | No |
| Crear envíos y generar tracking | Sí | Sí | No | No | No | No | No |
| Consultar información operativa de envíos | Sí | Sí | Sí | Sí | Asignados | Sí | No |
| Clasificar y encaminar envíos | Sí | No | Sí | No | No | Solo lectura | No |
| Preparar y actualizar despachos | Sí | No | No | Sí | No | Solo lectura | No |
| Consultar envíos asignados para reparto | Sí | No | No | No | Sí | Solo lectura | No |
| Registrar intento, entrega o devolución | Sí | No | No | No | Sí | No | No |
| Registrar incidencias operativas | Sí | Sí | Sí | Sí | Asignados | No | No |
| Consultar dashboard y analítica | Sí | No | No | No | No | Sí | No |
| Consultar auditoría | Sí | No | No | No | No | Solo lectura autorizada | No |
| Consultar tracking público permitido | Sí | Sí | Sí | Sí | Sí | Sí | Sí, por código |

`Sí` expresa una autorización funcional propuesta, no un permiso ya implementado. La API deberá además restringir los datos por asignación/centro cuando corresponda, registrar acciones sensibles y devolver al cliente externo únicamente campos expresamente permitidos.
