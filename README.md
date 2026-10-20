# Plataforma académica de logística y trazabilidad

Interfaz web de demostración para el proyecto de gestión logística y analítica de envíos. No es un portal oficial de SERPOST. Los registros visibles son ficticios y todavía no están conectados a una API ni a MySQL.

## Interfaz implementada

La aplicación permite recorrer paneles de demostración para:

- Administrador
- Operador postal
- Encargado de clasificación
- Encargado de transporte
- Repartidor
- Supervisor / Analista
- Cliente externo (consulta pública por tracking)

El selector de espacio de trabajo cambia la navegación y el contenido según el rol. El registro de envío valida la vista del formulario, las entregas del repartidor permiten simular un intento y el tracking muestra un timeline ficticio de ejemplo.

## Requisitos locales

- Node.js compatible con Next.js 15 (Node.js 20.9 o superior)
- Corepack habilitado y pnpm 10

Instalar pnpm si Corepack está disponible:

```powershell
corepack enable
corepack prepare pnpm@10.12.1 --activate
```

## Ejecutar la interfaz

Desde la raíz del repositorio:

```powershell
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

Comprobaciones disponibles:

```powershell
pnpm --filter @serpost/web build
pnpm --filter @serpost/web lint
```

## Alcance actual y siguientes pasos

Esta entrega corresponde a la capa inicial de interfaz. No incluye autenticación real, persistencia, control de acceso en servidor ni operaciones conectadas. No utilizar datos de demostración para decisiones operativas.

El siguiente desarrollo debe incorporar API NestJS, sesión segura y RBAC del lado servidor, MySQL y migraciones después de validar el modelo contra `docs/referencia.pdf`. El PDF no se encontraba en el espacio de trabajo al comenzar la etapa inicial.

## Publicación en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` construye la exportación estática y la publica en GitHub Pages al actualizar `main`. El sitio del repositorio estará en:

`https://peterdiaz1911.github.io/PROYECTO_BIGDATA/`

En el repositorio, selecciona **Settings → Pages → Build and deployment → Source: GitHub Actions**. El despliegue es solo del frontend de demostración: GitHub Pages no aloja la API NestJS ni MySQL.
