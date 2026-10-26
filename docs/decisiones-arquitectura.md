# Decisiones de arquitectura

## Alcance

Primera entrega funcional para una interfaz Next.js estática, autenticación y flujo transaccional básico de encomiendas. El modelo de dominio sigue pendiente de cotejo con `docs/referencia.pdf`, que no estaba disponible en el espacio de trabajo.

## Decisiones aplicadas

1. **Exportación estática:** se preservan `output: "export"` y el `basePath` de GitHub Pages. No se agregan endpoints de Next.js ni se requiere servidor web propio.
2. **Supabase Auth:** inicio y cierre de sesión, alta exclusiva de clientes, confirmación de correo y recuperación de contraseña usan el cliente oficial de Supabase.
3. **Clave pública en el navegador:** la compilación solo recibe la URL y clave `anon`/`publishable`. Las credenciales de administración permanecen fuera del frontend.
4. **RBAC en PostgreSQL:** `profiles.role_code`, `agency_id` e `is_active` no se pueden insertar o actualizar desde el navegador. El signup crea siempre un cliente activo; el personal se provisiona en un canal administrativo.
5. **RLS para lecturas:** el cliente activo ve solo sus envíos/historial; el personal activo ve datos según agencia y rol; administrador/analista leen globalmente. Una cuenta inactiva no opera ni lee envíos.
6. **Escrituras mediante RPC:** `create_shipment`, `assign_shipment` y `update_shipment_status` comprueban actor, rol, agencia, activación, asignación y transición. El evento histórico se genera por trigger en la misma transacción.
7. **Tracking no enumerativo:** los códigos usan 128 bits aleatorios, `UNIQUE` e inmutabilidad. La consulta pública está tras Turnstile y una Edge Function. El RPC público solo es ejecutable por el runtime de servidor y retorna campos minimizados; nunca se concede `SELECT` anónimo a envíos/historial.
8. **Historial auditado:** `actor_id` proviene de `auth.uid()` y `created_at` de PostgreSQL; el navegador no puede insertar, alterar ni eliminar eventos directamente.
9. **Ajuste del dominio antes de producción:** estados, campos, retención, privacidad y roles deben revisarse contra documentación autorizada y políticas institucionales antes de cargar datos reales.

## Pendiente

- Aplicar la migración en un proyecto Supabase y ejecutar `supabase test db`; esas pruebas aún no se ejecutaron por falta de CLI/proyecto accesible.
- Desplegar la Edge Function y configurar Turnstile antes de habilitar el portal público.
- Validar el modelo y las transiciones con `docs/referencia.pdf`.
- Completar administración de agencias/empleados, bandejas, incidencias, evidencias, despachos/vehículos/rutas, analítica, ETL y reportes.
- Revisar políticas operativas, privacidad, retención, SMTP, observabilidad y recuperación de incidentes.
