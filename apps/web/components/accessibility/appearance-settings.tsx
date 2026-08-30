"use client";

import React from "react";
import {
  Sun,
  Moon,
  Laptop,
  Eye,
  ZapOff,
  Type,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useTheme, ThemeMode, TextSizeMode } from "@/features/theme/theme-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppearanceSettings() {
  const {
    theme,
    resolvedTheme,
    highContrast,
    reducedMotion,
    textSize,
    setTheme,
    setHighContrast,
    setReducedMotion,
    setTextSize,
    resetPreferences,
  } = useTheme();

  return (
    <div className="space-y-8">
      {/* 1. Theme Selection Cards */}
      <section aria-labelledby="theme-heading" className="space-y-4">
        <div>
          <h2 id="theme-heading" className="text-base font-bold text-text-main flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            Tema Visual
          </h2>
          <p className="text-xs text-text-muted">
            Personaliza el esquema de color para adaptar la interfaz a la iluminación de tu negocio o preferencia personal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Selección de tema">
          {/* Light Theme Card */}
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => setTheme("light")}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
              theme === "light"
                ? "bg-surface border-primary ring-2 ring-primary shadow-md"
                : "bg-surface border-border hover:border-border-strong hover:bg-surface-hover"
            }`}
          >
            {theme === "light" && (
              <span className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="w-5 h-5 fill-primary text-white" />
              </span>
            )}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-text-main block">Tema Blanco (Claro)</span>
                <span className="text-[11px] text-text-muted">Ideal para espacios iluminados y pantallas al sol.</span>
              </div>
            </div>
            {/* Visual Mini Preview */}
            <div className="mt-4 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0284C7]" />
              <div className="h-2 w-12 bg-[#CBD5E1] rounded" />
              <div className="h-2 w-6 bg-[#94A3B8] rounded ml-auto" />
            </div>
          </button>

          {/* Dark Theme Card */}
          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
              theme === "dark"
                ? "bg-surface border-primary ring-2 ring-primary shadow-md"
                : "bg-surface border-border hover:border-border-strong hover:bg-surface-hover"
            }`}
          >
            {theme === "dark" && (
              <span className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="w-5 h-5 fill-primary text-white" />
              </span>
            )}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-text-main block">Tema Negro (Oscuro)</span>
                <span className="text-[11px] text-text-muted">Descansa la vista en turnos nocturnos o interiores.</span>
              </div>
            </div>
            {/* Visual Mini Preview */}
            <div className="mt-4 p-2 bg-[#0A0A0A] border border-[#26282E] rounded-xl flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0EA5FF]" />
              <div className="h-2 w-12 bg-[#26282E] rounded" />
              <div className="h-2 w-6 bg-[#3A3D46] rounded ml-auto" />
            </div>
          </button>

          {/* System Theme Card */}
          <button
            type="button"
            role="radio"
            aria-checked={theme === "system"}
            onClick={() => setTheme("system")}
            className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
              theme === "system"
                ? "bg-surface border-primary ring-2 ring-primary shadow-md"
                : "bg-surface border-border hover:border-border-strong hover:bg-surface-hover"
            }`}
          >
            {theme === "system" && (
              <span className="absolute top-3 right-3 text-primary">
                <CheckCircle2 className="w-5 h-5 fill-primary text-white" />
              </span>
            )}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-surface-secondary border border-border flex items-center justify-center text-text-secondary">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-text-main block">Seguir el Sistema</span>
                <span className="text-[11px] text-text-muted">Cambia automáticamente con tu computadora o tablet.</span>
              </div>
            </div>
            {/* Visual Mini Preview */}
            <div className="mt-4 p-2 bg-surface-secondary border border-border rounded-xl flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="h-2 w-10 bg-border-strong rounded" />
              <div className="h-2 w-8 bg-border rounded ml-auto" />
            </div>
          </button>
        </div>
      </section>

      {/* 2. Visual Accessibility Toggles */}
      <section aria-labelledby="accessibility-heading" className="space-y-4">
        <div>
          <h2 id="accessibility-heading" className="text-base font-bold text-text-main flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            Opciones de Accesibilidad Visual (WCAG 2.2 AA)
          </h2>
          <p className="text-xs text-text-muted">
            Configuraciones avanzadas para usuarios con baja visión, sensibilidad al movimiento o requisitos de alto contraste.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* High Contrast Toggle */}
          <div className="p-4 bg-surface border border-border rounded-2xl flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-text-main block">Contraste Reforzado</span>
              <p className="text-xs text-text-muted">
                Intensifica los bordes y el contraste del texto para máxima legibilidad según el estándar WCAG AAA.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={highContrast}
              onClick={() => setHighContrast(!highContrast)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                highContrast ? "bg-primary" : "bg-surface-secondary border-border"
              }`}
            >
              <span className="sr-only">Activar contraste reforzado</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  highContrast ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="p-4 bg-surface border border-border rounded-2xl flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-text-main block">Reducir Animaciones</span>
              <p className="text-xs text-text-muted">
                Desactiva transiciones y efectos dinámicos para evitar mareos o distracciones.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                reducedMotion ? "bg-primary" : "bg-surface-secondary border-border"
              }`}
            >
              <span className="sr-only">Reducir animaciones</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  reducedMotion ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Text Size Scaling */}
      <section aria-labelledby="text-size-heading" className="space-y-4">
        <div>
          <h2 id="text-size-heading" className="text-base font-bold text-text-main flex items-center gap-2">
            <Type className="w-4 h-4 text-[#0EA5FF]" />
            Tamaño del Texto en Pantalla
          </h2>
          <p className="text-xs text-text-muted">
            Aumenta el tamaño de la tipografía en toda la plataforma sin desbordar tablas ni botones.
          </p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Escalado de tamaño de texto">
            <button
              type="button"
              role="radio"
              aria-checked={textSize === "normal"}
              onClick={() => setTextSize("normal")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                textSize === "normal"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface-secondary text-text-secondary border-border hover:bg-surface-hover hover:text-text-main"
              }`}
            >
              Normal (100%)
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={textSize === "large"}
              onClick={() => setTextSize("large")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                textSize === "large"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface-secondary text-text-secondary border-border hover:bg-surface-hover hover:text-text-main"
              }`}
            >
              Grande (+15%)
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={textSize === "xlarge"}
              onClick={() => setTextSize("xlarge")}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl border text-base font-semibold transition-all ${
                textSize === "xlarge"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface-secondary text-text-secondary border-border hover:bg-surface-hover hover:text-text-main"
              }`}
            >
              Extra Grande (+25%)
            </button>
          </div>
        </div>
      </section>

      {/* 4. Live Interactive Preview Box */}
      <section aria-labelledby="preview-heading" className="space-y-4">
        <div>
          <h2 id="preview-heading" className="text-base font-bold text-text-main flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Previsualización en Tiempo Real
          </h2>
          <p className="text-xs text-text-muted">
            Así se visualizan los componentes del punto de venta con tu configuración actual ({resolvedTheme === "light" ? "Tema Blanco" : "Tema Negro"}).
          </p>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-text-main block">Coca-Cola 600ml Descartable</span>
                <span className="text-[11px] text-text-muted">SKU: BEB-001 • IVA 13%</span>
              </div>
            </div>
            <Badge variant="success">STOCK DISPONIBLE</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-surface-secondary border border-border rounded-xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Precio de Venta</span>
              <span className="text-base font-black text-text-main font-mono">₡ 1,200</span>
            </div>
            <div className="p-3 bg-surface-secondary border border-border rounded-xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Impuesto IVA</span>
              <span className="text-base font-black text-primary font-mono">₡ 138</span>
            </div>
            <div className="p-3 bg-surface-secondary border border-border rounded-xl">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Total con IVA</span>
              <span className="text-base font-black text-emerald-500 font-mono">₡ 1,338</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button variant="primary" size="sm">
              Botón Primario
            </Button>
            <Button variant="secondary" size="sm">
              Botón Secundario
            </Button>
            <Button variant="outline" size="sm">
              Botón Borde
            </Button>
          </div>
        </Card>
      </section>

      {/* 5. Reset Preferences Button */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Las preferencias se guardan de forma automática en este navegador.
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={resetPreferences}
          className="text-text-muted hover:text-text-main"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restablecer Valores Predeterminados
        </Button>
      </div>
    </div>
  );
}