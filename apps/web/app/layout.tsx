import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/auth-context";
import { ThemeProvider } from "@/features/theme/theme-context";
import { StoreProvider } from "@/features/store/store-context";

export const metadata: Metadata = {
  title: "ORBÍTICA POS | Sistema SaaS Punto de Venta",
  description: "Plataforma SaaS profesional de punto de venta, inventario y facturación electrónica para Costa Rica.",
  icons: {
    icon: "/brand/icon.png",
  },
};

// Inline Anti-FOUC script to prevent theme flash before hydration
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('orbitica_accessibility_preferences_v1');
    var theme = 'dark';
    var contrast = false;
    var reducedMotion = false;
    var textSize = 'normal';

    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.theme === 'system') {
        var mql = window.matchMedia('(prefers-color-scheme: dark)');
        theme = mql.matches ? 'dark' : 'light';
      } else if (parsed.theme) {
        theme = parsed.theme;
      }
      contrast = !!parsed.highContrast;
      reducedMotion = !!parsed.reducedMotion;
      textSize = parsed.textSize || 'normal';
    } else {
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      theme = mql.matches ? 'dark' : 'light';
    }

    var doc = document.documentElement;
    doc.classList.remove('light', 'dark');
    doc.classList.add(theme);
    doc.setAttribute('data-theme', theme);
    doc.style.colorScheme = theme;

    if (contrast) doc.setAttribute('data-contrast', 'high');
    if (reducedMotion) doc.setAttribute('data-reduced-motion', 'true');
    doc.setAttribute('data-text-size', textSize);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-text-main antialiased selection:bg-primary selection:text-white">
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>{children}</StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}