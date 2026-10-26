# Plataforma logística y trazabilidad

Aplicación web estática para GitHub Pages, con Supabase Auth y PostgreSQL como autoridad de sesión, permisos y persistencia. Next.js no usa Server Actions, middleware ni endpoints dinámicos. La clave `service_role` solo la consume la Edge Function del lado servidor de Supabase para el tracking público; nunca se configura en el frontend.

## Primera entrega funcional

- Registro abierto de clientes, confirmación de correo, inicio/cierre de sesión y recuperación.
- Roles cargados desde perfiles protegidos: administrador, operador, clasificación, transporte, repartidor, supervisor/analista y cliente.
- `create_shipment` crea desde una sesión de operador; PostgreSQL selecciona al cliente confirmado y genera un tracking aleatorio de 128 bits.
- `assign_shipment` valida rol, activación y agencia del empleado. Los roles de clasificación, transporte y reparto solo pueden avanzar envíos que tengan asignados.
- `update_shipment_status` valida identidad, estado, rol, asignación y agencia; el trigger agrega evento y actor en la misma transacción.
- Usuarios autenticados consultan envíos según propietario/rol/agencia. La interfaz pública no lee tablas: Turnstile valida una Edge Function que devuelve solo tracking, estado, agencia/ciudad, fechas y descripción pública.
- La matriz honesta de alcance por perfil está en [`docs/matriz-permisos.md`](docs/matriz-permisos.md). No confundir navegación con un módulo de negocio implementado.

## Configuración local

Next.js carga `.env.local` desde la raíz de la aplicación Next, no desde la raíz del monorepo. La ruta exacta es **`apps/web/.env.local`**.

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

Completa solo estos valores públicos:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-o-anon-publica>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<clave-sitekey-publica>
```

Los patrones `.env`, `.env.local` y `.env.*.local` están ignorados por Git. `.env.example` contiene solo marcadores. Nunca pongas `service_role`, claves `secret`, contraseñas de base de datos ni el secreto Turnstile en variables `NEXT_PUBLIC_*`.

## Crear o seleccionar el proyecto Supabase

1. En Supabase Dashboard, crea un proyecto o selecciona uno vacío/de pruebas. Anota el **Project ref** y la región. No hace falta crear ni compartir una clave administrativa con el frontend.
2. En **Project Settings → API**, copia Project URL y la clave publicable (`sb_publishable_...`) o `anon` legacy al `apps/web/.env.local`.
3. En Cloudflare Turnstile crea un widget con hostnames `localhost` y `peterdiaz1911.github.io`. Guarda el Site Key como `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; configura el Secret Key como secreto de la Edge Function, nunca en el repositorio.
4. En Supabase **Authentication → URL Configuration**, establece el Site URL de producción y añade estas Redirect URLs exactas:
   - Desarrollo y callback/recuperación: `http://localhost:3000/`
   - GitHub Pages y callback/recuperación: `https://peterdiaz1911.github.io/PROYECTO_BIGDATA/`

   Login, confirmación y recuperación retornan a la ruta raíz estática. El cliente Auth procesa los tokens de callback desde la URL; no se necesita una ruta API de Next.js. La ruta de tracking es `http://localhost:3000/tracking/` y `https://peterdiaz1911.github.io/PROYECTO_BIGDATA/tracking/`.
5. En **Authentication → Providers → Email**, habilita Email y confirmación de correo. Configura SMTP de producción si el proveedor de prueba no es suficiente. El alta pública siempre crea el rol `client`; el rol enviado como metadata por el navegador se ignora.

## Aplicar la migración conservando datos

La migración [`supabase/migrations/20261025230000_initial_logistics.sql`](supabase/migrations/20261025230000_initial_logistics.sql) no contiene `DROP`, `TRUNCATE` ni borrados de datos; crea el esquema inicial y las funciones. Aun así, es una migración inicial **no diseñada para re-ejecutarse** ni para sobrescribir tablas preexistentes.

- En un proyecto vacío, usa el SQL Editor para ejecutar el archivo completo una sola vez, o usa Supabase CLI y el control de migraciones: `supabase login`, `supabase link --project-ref <project-ref>` y `supabase db push`.
- Si el proyecto ya tiene datos/tablas logísticas o una migración anterior aplicada, primero crea/verifica un backup y revisa `supabase_migrations.schema_migrations` y el esquema existente. No borres tablas ni marques manualmente una migración como aplicada. Si hay objetos de nombre coincidente, detente y prepara una migración incremental revisada para esa base.
- En un entorno de desarrollo, abre el SQL Editor, pega y ejecuta [`supabase/tests/security_invariants.sql`](supabase/tests/security_invariants.sql). Crea usuarios/agencias de prueba dentro de una transacción y termina con `ROLLBACK`.

La migración instala tablas para roles, agencias, perfiles, clientes, envíos, asignaciones e historial; habilita RLS; revoca escrituras de cliente; y concede mutaciones solo mediante RPC validados. El RPC público `lookup_public_tracking` no es ejecutable por `anon` ni `authenticated`; solo lo llama el backend de la Edge Function.

## Desplegar el tracking público protegido

1. En Cloudflare, configura el widget para los hostnames indicados arriba.
2. Desde una terminal autenticada con Supabase CLI, enlaza el mismo project ref y configura únicamente el secreto de Turnstile:

   ```powershell
   supabase secrets set TURNSTILE_SECRET_KEY=<secreto-de-turnstile> --project-ref <project-ref>
   supabase functions deploy public-tracking --no-verify-jwt --project-ref <project-ref>
   ```

   La función necesita `SUPABASE_SERVICE_ROLE_KEY` solo en el entorno seguro de Supabase Functions, que Supabase proporciona a la función. No lo copies al frontend, `.env.local`, GitHub Actions ni chat. `verify_jwt = false` está limitado a esta función; el desafío Turnstile se verifica en el servidor y la respuesta de SQL es de campos permitidos.

## Agencias, cuentas de prueba y primer personal

La migración crea la agencia inicial `Lima Centro`. Para crear dos agencias de prueba, ejecuta en SQL Editor:

```sql
insert into public.agencies (name, region, city)
values
  ('Agencia A', 'Región de prueba A', 'Ciudad A'),
  ('Agencia B', 'Región de prueba B', 'Ciudad B')
on conflict (name) do nothing;
```

1. Desde la aplicación registra un usuario para cliente propietario, otro cliente ajeno, un primer administrador y el operador de Agencia A. Confirma todos sus correos. El trigger crea filas de `profiles` y `customers` vinculadas por el mismo UUID de `auth.users`.
2. **Bootstrap del primer administrador:** desde el SQL Editor autenticado como propietario del proyecto, corre el bloque siguiente reemplazando el correo; exige exactamente un usuario confirmado y no usa operaciones desde el navegador:

   ```sql
   do $$
   declare
     target_id uuid;
   begin
     select id into strict target_id
     from auth.users
     where lower(email) = lower('admin@tu-dominio.test')
       and email_confirmed_at is not null;

     update public.profiles
     set role_code = 'admin', agency_id = null, is_active = true
     where id = target_id;

     if not found then
       raise exception 'No existe el perfil confirmado que se desea promover';
     end if;
   end;
   $$;
   ```

3. Para asignar operador a Agencia A, con correo confirmado:

   ```sql
   update public.profiles as p
   set role_code = 'operator',
       agency_id = a.id,
       is_active = true
   from auth.users as u
   cross join public.agencies as a
   where p.id = u.id
     and lower(u.email) = lower('operador-a@tu-dominio.test')
     and u.email_confirmed_at is not null
     and a.name = 'Agencia A';
   ```

   Repite con un correo distinto y `Agencia B` para el operador B. Para el clasificador de Agencia A usa la misma estructura y `role_code = 'sorter'`. Los roles `transport` y `courier` requieren igualmente agencia.
4. Para probar un usuario inactivo, registra otra cuenta y desactívala con SQL Editor: `update public.profiles set is_active = false where id = (select id from auth.users where lower(email) = lower('inactivo@tu-dominio.test'));`. El cliente solo puede consultar el perfil propio para ver el bloqueo; no puede leer u operar envíos.
5. Operadores/Admin asignan cada envío a un empleado activo de la agencia desde **Asignar personal**. No se puede cambiar una asignación desde la API directa.

## Pruebas de permisos y flujo real

`supabase/tests/security_invariants.sql` es una prueba ejecutable de base de datos, no una comprobación superficial de que existan políticas. Revisa RLS/privilegios, genera fixtures de Agencia A y B, dos clientes, operador, clasificador y usuario inactivo; establece identidades JWT simuladas con `auth.uid()` y prueba RPC directos, acceso cruzado, asignaciones, escritura de historial y bloqueo anónimo. Toda la prueba se revierte al finalizar. Debe ejecutarse como propietario de la base (SQL Editor), porque crea `auth.users` de prueba y cambia temporalmente a los roles `authenticated`, `anon` y `service_role`.

Para solicitudes HTTP directas a PostgREST/Auth, [`supabase/tests/api-permissions.mjs`](supabase/tests/api-permissions.mjs) usa solo la URL y clave pública más cuentas de prueba, no modifica filas y no requiere `service_role`. En PowerShell, establece en el proceso las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TRACKING_CODE`, `OPERATOR_A_EMAIL`, `OPERATOR_A_PASSWORD`, `OPERATOR_B_EMAIL`, `OPERATOR_B_PASSWORD`, `OWNER_EMAIL`, `OWNER_PASSWORD`, `OTHER_EMAIL`, `OTHER_PASSWORD`, `SORTER_EMAIL`, `SORTER_PASSWORD`, `INACTIVE_EMAIL` e `INACTIVE_PASSWORD`, y ejecuta `node supabase/tests/api-permissions.mjs` con Node 20+ desde un entorno de desarrollo. Usa un envío nuevo de Agencia A sin asignación; el script no modifica filas. No uses cuentas ni datos de producción.

Tras aplicar las pruebas y desplegar la Edge Function, valida además con dos sesiones de navegador y solicitudes directas a Supabase:

1. Operador A crea un envío para el cliente propietario; guarda el tracking aleatorio.
2. Operador B no puede leerlo, asignarlo ni actualizarlo.
3. El clasificador no asignado falla por RPC; al asignarlo desde operador A, puede clasificarlo y la historia registra su UUID autenticado.
4. El cliente propietario ve el mismo envío y su historial en una sesión separada; el cliente ajeno y el usuario inactivo no lo ven.
5. Visitante anónimo no puede consultar tablas ni llamar al RPC público. La Edge Function requiere Turnstile y solo devuelve campos públicos.
6. Recarga ambas sesiones y confirma que estado/historial persisten. Un tracking inválido o ajeno muestra **“Envío no encontrado”** en el portal público.

La ejecución remota de estas pruebas queda pendiente hasta tener el proyecto Supabase configurado; no se reporta como ya probada.

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` inyecta durante el build las variables públicas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Crea esas tres como **Settings → Secrets and variables → Actions → Variables** del repositorio. Son valores públicos. `.env.local` solo sirve para Next local y no configura Actions. El build de Actions exporta `/PROYECTO_BIGDATA` y `/PROYECTO_BIGDATA/tracking/`; los callback/reset usan la raíz con basePath. Nunca crees una variable pública `service_role`.

## Comandos de desarrollo y alcance restante

```powershell
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
pnpm --filter @serpost/web lint
pnpm --filter @serpost/web typecheck
pnpm --filter @serpost/web build
```

La primera entrega aún no implementa la consola completa de administración, bandejas de trabajo, reglas de clasificación, despachos/rutas/vehículos, incidencias, evidencias, reportes ni auditoría administrativa integral. El detalle por rol y módulo está en [`docs/matriz-permisos.md`](docs/matriz-permisos.md).
