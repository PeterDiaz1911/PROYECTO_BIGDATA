"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, PackageCheck, Search } from "lucide-react";
import styles from "@/features/auth/AuthScreen.module.scss";
import trackingStyles from "@/features/shipments/ShipmentWorkspace.module.scss";

type PublicShipment = {
  tracking_code: string;
  status: string;
  agency_name: string;
  city: string;
  created_at: string;
  updated_at: string;
  public_description: string;
};

type TurnstileApi = {
  render: (
    target: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const statusLabels: Record<string, string> = {
  registered: "Registrado",
  classified: "Clasificado",
  in_transit: "En tránsito",
  at_destination: "En agencia de destino",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  delivery_failed: "Intento de entrega fallido",
  returned: "Devuelto",
};

export default function PublicTrackingPage() {
  const challengeRef = useRef<HTMLDivElement>(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [shipment, setShipment] = useState<PublicShipment | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const target = challengeRef.current;
    if (!siteKey || !target) {
      setChallengeError("Falta configurar la clave pública de Turnstile.");
      return;
    }

    let widgetId: string | null = null;
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    const renderWidget = () => {
      if (!window.turnstile || !target || widgetId) return;
      widgetId = window.turnstile.render(target, {
        sitekey: siteKey,
        action: "public_tracking",
        callback: (token) => {
          setChallengeToken(token);
          setChallengeError("");
        },
        "expired-callback": () => setChallengeToken(""),
        "error-callback": () => {
          setChallengeToken("");
          setChallengeError("No se pudo cargar la verificación antiabuso.");
        },
      });
      target.dataset.widgetId = widgetId;
    };

    if (window.turnstile) {
      renderWidget();
    } else if (script) {
      script.addEventListener("load", renderWidget);
      script.addEventListener("error", () => setChallengeError("No se pudo cargar la verificación antiabuso."));
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.addEventListener("load", renderWidget);
      script.addEventListener("error", () => setChallengeError("No se pudo cargar la verificación antiabuso."));
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setShipment(null);
    setSearched(false);
    if (!/^SP-PE-[0-9A-F]{32}$/i.test(trackingCode.trim())) {
      setSearched(true);
      return;
    }
    if (!challengeToken) {
      setError("Completa la verificación antiabuso antes de consultar.");
      return;
    }

    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!projectUrl || !publicKey) {
      setError("Falta configurar Supabase para el seguimiento público.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${projectUrl}/functions/v1/public-tracking`, {
        method: "POST",
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackingCode, turnstileToken: challengeToken }),
      });
      const result = await response.json() as { shipment?: PublicShipment | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo consultar el seguimiento.");
      setShipment(result.shipment ?? null);
      setSearched(true);
      setChallengeToken("");
      const widgetId = challengeRef.current?.dataset.widgetId;
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar el seguimiento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="tracking-title">
        <div className={styles.brand}>
          <span className={styles.brandIcon}><PackageCheck size={21} /></span>
          <span><strong>Logística</strong><small>GESTIÓN DE ENVÍOS</small></span>
        </div>
        <div className={styles.heading}>
          <div className={styles.eyebrow}>SEGUIMIENTO PÚBLICO</div>
          <h1 id="tracking-title">Consulta tu envío</h1>
          <p>El tracking es un código privado. La consulta pública no muestra dirección, propietario ni historial detallado.</p>
        </div>
        <form className={trackingStyles.form} onSubmit={submit}>
          <label>
            Código de tracking
            <input
              autoCapitalize="characters"
              maxLength={40}
              onChange={(event) => setTrackingCode(event.target.value)}
              placeholder="SP-PE-0123456789ABCDEF0123456789ABCDEF"
              required
              value={trackingCode}
            />
          </label>
          <div ref={challengeRef} aria-label="Verificación antiabuso" />
          {challengeError && <div className={trackingStyles.error} role="alert">{challengeError}</div>}
          {error && <div className={trackingStyles.error} role="alert">{error}</div>}
          <button className={trackingStyles.primaryButton} disabled={busy || !challengeToken} type="submit">
            <Search size={16} />{busy ? "Consultando..." : "Consultar"}
          </button>
        </form>
        {searched && !shipment && <div className={trackingStyles.empty} role="status">Envío no encontrado.</div>}
        {shipment && (
          <section className={trackingStyles.trackingResult} aria-label="Resultado de seguimiento">
            <div className={trackingStyles.shipmentTop}>
              <strong>{shipment.tracking_code}</strong>
              <span className={trackingStyles.status}>{statusLabels[shipment.status] ?? "En proceso"}</span>
            </div>
            <p>{shipment.public_description}</p>
            <p>{shipment.agency_name} · {shipment.city}</p>
            <p>Registrado: {new Date(shipment.created_at).toLocaleString("es-PE")}</p>
            <p>Última actualización: {new Date(shipment.updated_at).toLocaleString("es-PE")}</p>
          </section>
        )}
        <div className={styles.links}>
          <Link href="/"><ArrowLeft size={14} /> Volver al inicio de sesión</Link>
        </div>
      </section>
    </main>
  );
}
