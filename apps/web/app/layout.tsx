import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-context";

export const metadata: Metadata = {
  title: "ORBÍTICA POS | Sistema SaaS Punto de Venta",
  description: "Plataforma SaaS profesional de punto de venta, inventario y facturación electrónica para Costa Rica.",
  icons: {
    icon: "/brand/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0A0A0A] text-[#E5E6EA] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
