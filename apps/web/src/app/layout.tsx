import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.scss";

export const metadata: Metadata = {
  title: "SERPOST | Panel logístico académico",
  description:
    "Demostración académica de gestión logística y trazabilidad de envíos. No es un portal oficial de SERPOST.",
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
