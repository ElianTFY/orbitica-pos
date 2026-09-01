import { SuperadminLayout } from "@/components/layouts/superadmin-layout";

export const metadata = {
  title: "Orbítica Hub — Superadmin Master",
  description: "Centro de mando administrativo interno de Orbítica POS SaaS",
};

export default function SuperadminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperadminLayout>{children}</SuperadminLayout>;
}
