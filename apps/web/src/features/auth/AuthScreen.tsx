"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, PackageCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import styles from "./AuthScreen.module.scss";

type Mode = "login" | "register" | "recover" | "reset";

export function AuthScreen() {
  const { client, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    if (passwordRecovery) setMode("reset");
    if (!client) return;
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setMessage("");
        setError("");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [client, passwordRecovery]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPasswordUpdated(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!client) return;

    if (mode === "reset" && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else if (mode === "register") {
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: getRedirectUrl(),
          },
        });
        if (authError) throw authError;
        if (data.session) {
          setMessage("Cuenta creada. Tu sesión ya está activa.");
        } else {
          setMessage("Te enviamos un enlace de confirmación. Confirma tu correo antes de iniciar sesión.");
        }
      } else if (mode === "recover") {
        const { error: authError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: getRedirectUrl(),
        });
        if (authError) throw authError;
        setMessage("Si existe una cuenta para ese correo, recibirás un enlace para restablecer la contraseña.");
      } else {
        const { error: authError } = await client.auth.updateUser({ password });
        if (authError) throw authError;
        setPassword("");
        setConfirmation("");
        setMessage("Contraseña actualizada. Ya puedes continuar con tu cuenta.");
        setPasswordUpdated(true);
        setMode("login");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isReset = mode === "reset";
  const title = isLogin
    ? "Inicia sesión"
    : isRegister
      ? "Crea tu cuenta de cliente"
      : isReset
        ? "Define una nueva contraseña"
        : "Recupera tu acceso";

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-title">
        <div className={styles.brand}>
          <span className={styles.brandIcon}><PackageCheck size={21} /></span>
          <span><strong>Logística</strong><small>GESTIÓN DE ENVÍOS</small></span>
        </div>
        <div className={styles.heading}>
          <div className={styles.eyebrow}>PLATAFORMA DE TRAZABILIDAD</div>
          <h1 id="auth-title">{title}</h1>
          <p>
            {isLogin && "Accede al espacio de trabajo asignado a tu cuenta."}
            {isRegister && "El registro público crea únicamente cuentas de cliente."}
            {mode === "recover" && "Te enviaremos instrucciones al correo asociado a tu cuenta."}
            {isReset && "Elige una contraseña nueva para proteger tu cuenta."}
          </p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          {isRegister && (
            <label>
              Nombre completo
              <input
                autoComplete="name"
                maxLength={120}
                minLength={2}
                onChange={(event) => setFullName(event.target.value)}
                required
                value={fullName}
              />
            </label>
          )}
          {!isReset && (
            <label>
              Correo electrónico
              <span className={styles.inputWrap}>
                <Mail size={16} aria-hidden="true" />
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
          )}
          {(isLogin || isRegister || isReset) && (
            <label>
              {isReset ? "Nueva contraseña" : "Contraseña"}
              <input
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          )}
          {isReset && (
            <label>
              Confirmar contraseña
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </label>
          )}
          {error && <div className={styles.error} role="alert">{error}</div>}
          {message && <div className={styles.message} role="status">{message}</div>}
          <button className={styles.submit} disabled={busy} type="submit">
            {busy ? "Procesando..." : isLogin ? "Iniciar sesión" : isRegister ? "Crear cuenta" : isReset ? "Guardar contraseña" : "Enviar enlace"}
          </button>
        </form>

        <div className={styles.links}>
          <Link href="/tracking/">Consultar un envío sin iniciar sesión</Link>
          {isLogin && (
            <>
              <button type="button" onClick={() => changeMode("recover")}>¿Olvidaste tu contraseña?</button>
              <span>¿Eres cliente nuevo? <button type="button" onClick={() => changeMode("register")}>Crear cuenta</button></span>
              {passwordUpdated && (
                <button type="button" onClick={clearPasswordRecovery}>Continuar a mi espacio de trabajo</button>
              )}
            </>
          )}
          {isRegister && <button type="button" onClick={() => changeMode("login")}><ArrowLeft size={14} /> Volver a iniciar sesión</button>}
          {mode === "recover" && <button type="button" onClick={() => changeMode("login")}><ArrowLeft size={14} /> Volver a iniciar sesión</button>}
          {isReset && <span>La recuperación debe iniciarse desde el enlace enviado a tu correo.</span>}
        </div>
        <p className={styles.disclaimer}>Acceso protegido por Supabase Auth y políticas de base de datos.</p>
      </section>
    </main>
  );
}

function getRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
