# Decisiones de arquitectura

Estado: propuesta inicial de la etapa 1; pendiente de validar contra `docs/referencia.pdf`.

## Alcance y fuente

El espacio de trabajo no contenía el PDF al iniciar este trabajo. Estas decisiones se basan exclusivamente en el requerimiento funcional compartido y no presentan como verificados los procesos ni el modelo de datos de SERPOST. Los datos de la aplicación serán ficticios y de demostración académica hasta que se autoricen fuentes reales.

## Decisiones

1. **Monorepositorio con pnpm workspaces.** Mantener frontend, API, contratos compartidos y analítica en paquetes separados para facilitar desarrollo coordinado sin acoplar sus ciclos de despliegue.
2. **Monolito modular para la API.** NestJS con módulos de dominio y límites explícitos; la API REST versionada es la autoridad para reglas logísticas y persistencia.
3. **Aplicación web independiente.** Next.js App Router consume `/api/v1`; Bootstrap 5/React-Bootstrap define el sistema visual. La interfaz no replica reglas de negocio.
4. **Persistencia operacional relacional.** MySQL 8 con Prisma ORM 7, migraciones versionadas y transacciones para operaciones críticas. Confirmar compatibilidad oficial entre Prisma 7 y MySQL antes de instalar o fijar versiones.
5. **Sesión web protegida.** Preferir sesiones revocables mediante cookie HttpOnly, Secure en producción y SameSite apropiado; proteger mutaciones frente a CSRF. La API validará autorización en cada operación.
6. **Historial de seguimiento inmutable.** Registrar cada evento como nuevo dato; las rectificaciones serán eventos vinculados, no actualizaciones ni eliminaciones del historial.
7. **Data Warehouse separado.** Mantener `serpost_dw` independiente del esquema transaccional. Definir `Fact_Envios` con una fila por envío y ciclo de vida para evitar duplicar envíos al relacionar operaciones, incidencias o intentos.
8. **ETL fuera de la ruta operativa.** Proceso Python ejecutable manualmente, idempotente y observable; no bloqueará transacciones de la API.
9. **Analítica descriptiva antes de ML.** Los modelos predictivos se habilitarán solo cuando haya datos y evaluación temporal suficientes; no se mostrarán predicciones de muestra como resultados reales.
10. **Entidades complementarias justificadas.** Evaluar `vehiculo`, `ruta` y `despacho_envio`: los vehículos permiten representar capacidad; las rutas, los trayectos planificados; la relación despacho-envío permite agrupar envíos sin limitar un despacho a un único envío. Son propuestas de diseño, no tablas atribuidas al esquema del documento.
11. **Privacidad y separación público/interno.** El endpoint público de tracking expondrá únicamente estado, fechas, centros y eventos expresamente permitidos, nunca datos personales de remitente o destinatario.
12. **Entorno local reproducible.** Docker Compose para MySQL y servicios que se incorporen después; secretos en variables de entorno y `.env.example` sin credenciales reales.

## Modelo operacional y discrepancia pendiente

El requerimiento recibido enumera 18 tablas para el capítulo II, pero indica que los diagramas del PDF muestran 15. Como el PDF no está disponible, no es posible comprobar la diferencia, los nombres originales, sus columnas ni sus relaciones. Por tanto:

- La lista de 18 entidades es una referencia del requerimiento, no un esquema verificado.
- No se debe ejecutar ni publicar una migración definitiva hasta revisar el PDF.
- La propuesta ER de `diagrama-er.md` es conceptual y distingue las entidades enumeradas de las complementarias.
- En la siguiente revisión se documentará la conciliación entre diagramas y secciones antes de cerrar el modelo físico.

## Decisiones pendientes de evidencia

- Disponibilidad, capítulos y modelo exacto de `docs/referencia.pdf`.
- Cardinalidades, claves candidatas, estados y transiciones logísticas del documento.
- Zona horaria y precisión de fechas requerida por las fuentes autorizadas.
- Versiones compatibles y vigentes de Node.js LTS, NestJS, Next.js y Prisma 7 al instalar.
- Política institucional para retención de datos, auditoría, privacidad y credenciales de demostración.
