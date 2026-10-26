import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Vary": "Origin",
};

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://peterdiaz1911.github.io",
]);

type PublicShipment = {
  tracking_code: string;
  status: string;
  agency_name: string;
  city: string;
  created_at: string;
  updated_at: string;
  public_description: string;
};

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const cors = origin && allowedOrigins.has(origin)
    ? { ...corsHeaders, "Access-Control-Allow-Origin": origin }
    : corsHeaders;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST" || !origin || !allowedOrigins.has(origin)) {
    return json({ error: "Solicitud no permitida." }, 403, cors);
  }
  if (Number(request.headers.get("content-length") ?? "0") > 8192) {
    return json({ error: "Solicitud demasiado grande." }, 413, cors);
  }

  const apiUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!apiUrl || !serviceRoleKey || !turnstileSecret) {
    console.error("Missing public-tracking function configuration.");
    return json({ error: "El seguimiento público no está configurado." }, 503, cors);
  }

  let body: { trackingCode?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400, cors);
  }
  const trackingCode = typeof body.trackingCode === "string"
    ? body.trackingCode.trim().toUpperCase()
    : "";
  const turnstileToken = typeof body.turnstileToken === "string"
    ? body.turnstileToken
    : "";
  if (!/^SP-PE-[0-9A-F]{32}$/.test(trackingCode) || turnstileToken.length < 10 || turnstileToken.length > 4096) {
    return json({ error: "Código o verificación inválidos." }, 400, cors);
  }

  let verification: Response;
  try {
    verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
      }),
    });
  } catch (cause) {
    console.error("Turnstile verification request failed.", cause);
    return json({ error: "No se pudo contactar la verificación antiabuso." }, 502, cors);
  }
  if (!verification.ok) {
    console.error(`Turnstile verification failed with HTTP ${verification.status}.`);
    return json({ error: "No se pudo validar el desafío. Inténtalo nuevamente." }, 502, cors);
  }
  let verificationResult: { success?: boolean; hostname?: string; action?: string };
  try {
    verificationResult = await verification.json();
  } catch (cause) {
    console.error("Turnstile returned an invalid response.", cause);
    return json({ error: "La verificación antiabuso devolvió una respuesta inválida." }, 502, cors);
  }
  const expectedHost = new URL(origin).hostname;
  if (
    !verificationResult.success
    || verificationResult.hostname !== expectedHost
    || verificationResult.action !== "public_tracking"
  ) {
    return json({ error: "La verificación antiabuso no fue válida." }, 403, cors);
  }

  const supabase = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc("lookup_public_tracking", {
    p_tracking_code: trackingCode,
  });
  if (error) {
    console.error(`Public tracking lookup failed: ${error.code ?? "unknown"}.`);
    return json({ error: "No se pudo consultar el seguimiento." }, 500, cors);
  }
  const shipment = (data as PublicShipment[] | null)?.[0] ?? null;
  return json({ shipment }, 200, cors);
});

function json(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Cache-Control": "no-store" },
  });
}
