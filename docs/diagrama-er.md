# Modelo entidad-relación conceptual

Este diagrama es una propuesta de análisis basada en la lista entregada por el usuario. No representa un esquema comprobado del PDF ni debe usarse como migración física definitiva antes de revisar `docs/referencia.pdf`.

## Entidades enumeradas en el requerimiento

```mermaid
erDiagram
    rol ||--o{ usuario : asigna
    usuario ||--o| empleado : vincula
    departamento ||--o{ provincia : contiene
    provincia ||--o{ distrito : contiene
    distrito ||--o{ centro_operativo : ubica
    cliente ||--o{ envio : remitente_o_destinatario
    tipo_envio ||--o{ envio : clasifica
    estado_envio ||--o{ envio : estado_actual
    envio ||--|| paquete : describe
    tipo_contenido ||--o{ paquete : clasifica
    envio ||--o{ historial_seguimiento : registra
    tipo_operacion ||--o{ operacion_logistica : clasifica
    envio ||--o{ operacion_logistica : recibe
    empleado ||--o{ operacion_logistica : ejecuta
    centro_operativo ||--o{ operacion_logistica : ocurre_en
    envio ||--o{ incidencia : afecta
    empleado ||--o{ incidencia : registra
    centro_operativo ||--o{ despacho : origina_o_recibe
```

La lista entregada nombra 18 entidades: `rol`, `usuario`, `empleado`, `departamento`, `provincia`, `distrito`, `centro_operativo`, `cliente`, `envio`, `paquete`, `tipo_envio`, `tipo_contenido`, `estado_envio`, `tipo_operacion`, `operacion_logistica`, `historial_seguimiento`, `despacho` e `incidencia`. Las cardinalidades anteriores son hipótesis para discutir, no inferencias confirmadas del documento.

## Entidades complementarias propuestas

```mermaid
erDiagram
    despacho ||--|{ despacho_envio : agrupa
    envio ||--o{ despacho_envio : se_transporta_en
    despacho }o--|| vehiculo : utiliza
    empleado ||--o{ despacho : conduce
    ruta ||--o{ despacho : planifica
    centro_operativo ||--o{ ruta : origen_o_destino
    ruta ||--o{ ruta : conecta
```

- `vehiculo`: capacidad de peso/volumen y asignación a un traslado.
- `ruta`: trayecto planeado y centros de origen/destino.
- `despacho_envio`: asociación que permite agrupar varios envíos y conservar su relación con despachos.

La forma de representar origen y destino, rutas con varios tramos, asignaciones de empleados y estados de despacho requiere contraste con los procesos del PDF.

## Reglas de integridad propuestas

- Tracking único e inmutable.
- Eventos de seguimiento insert-only; rectificaciones como nuevos eventos relacionados.
- Transiciones de estado validadas en una operación transaccional.
- Capacidad de vehículo validada antes de confirmar la asignación del despacho.
- Granularidad de `Fact_Envios`: una fila por envío; agregar por separado operaciones e incidencias antes de integrarlas a métricas para evitar multiplicaciones.
