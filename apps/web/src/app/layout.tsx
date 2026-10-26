import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Logística | Gestión de envíos",
  description:
    "Gestión autenticada de encomiendas y trazabilidad logística.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
