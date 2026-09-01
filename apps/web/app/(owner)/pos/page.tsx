"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  ShoppingBag,
  Grid,
  ArrowRight,
  PackagePlus,
  Lock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { POSLayout } from "@/components/layouts/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import { useStore } from "@/features/store/store-context";
import { Product, CartItem } from "@/types";
import { formatCRC } from "@/lib/utils";

export default function POSPage() {
  const { products, recordSale, settings, activeCashSession } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<"catalog" | "cart">("catalog");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_CRC" | "SINPE" | "CARD" | "MIXED">("CASH_CRC");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [sinpeRef, setSinpeRef] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("CLIENTE CONTADO");
  const [customerCedula, setCustomerCedula] = useState<string>("");
  const [docType, setDocType] = useState<"04" | "01">("04");
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isCashOpen = activeCashSession?.status === "OPEN";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4" || (e.code === "Space" && e.ctrlKey)) {
        if (cart.length > 0 && isCashOpen) {
          e.preventDefault();
          setIsPaymentModalOpen(true);
        }
      } else if (e.key === "Escape") {
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, isCashOpen]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id === product.id) {
            const newQty = item.quantity + 1;
            return {
              ...item,
              quantity: newQty,
              lineTotal: item.unitPrice * newQty,
            };
          }
          return item;
        });
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discountPercentage: 0,
          unitPrice: product.sale_price,
          taxRate: product.tax_rate,
          lineTotal: product.sale_price,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, lineTotal: item.unitPrice * newQty }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalTax = cart.reduce((acc, item) => {
    const itemSub = item.unitPrice * item.quantity;
    return acc + itemSub * (item.taxRate / 100);
  }, 0);
  const total = subtotal + totalTax;
  const totalItemCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  const numCash = parseFloat(cashReceived) || 0;
  const change = Math.max(0, numCash - total);

  // Validation checks for completing sale
  const isInvoiceMissingCustomer =
    docType === "01" &&
    (!customerName.trim() || customerName === "CLIENTE CONTADO" || !customerCedula.trim());

  const isSinpeMissingRef = paymentMethod === "SINPE" && !sinpeRef.trim();

  const isCashInsufficient = paymentMethod === "CASH_CRC" && numCash < total;

  const canCompleteSale =
    !isProcessing &&
    !isInvoiceMissingCustomer &&
    !isSinpeMissingRef &&
    !isCashInsufficient;

  const completeSale = async () => {
    if (!canCompleteSale) return;
    setIsProcessing(true);
    try {
      // Small delay to prevent accidental double-tap
      await new Promise((r) => setTimeout(r, 100));
      const { receiptData } = recordSale({
        items: cart.map((c) => ({ product: c.product, quantity: c.quantity })),
        paymentMethod,
        cashReceived: numCash,
        sinpeRef: sinpeRef.trim(),
        customerName: customerName.trim() || "CLIENTE CONTADO",
        customerCedula: customerCedula.trim() || undefined,
        docType,
      });

      setLastReceiptData(receiptData);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      setCashReceived("");
      setSinpeRef("");
      setCustomerName("CLIENTE CONTADO");
      setCustomerCedula("");
      setDocType("04");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <POSLayout>
      {/* 
        Full viewport POS layout:
        - On mobile: tabs switch between catalog and cart panels
        - On desktop (lg+): dual-column split (catalog left, ticket right)
        Height: fills 100% of POSLayout's inner area (100dvh - topbar-h-16)
      */}
      <div className="h-full flex flex-col">
        {/* ── Cash Register Closed Warning Banner ─────────────────── */}
        {!isCashOpen && (
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-warning-bg border-b border-warning-border text-warning-text text-xs font-semibold">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>
              La caja está <strong>cerrada</strong>. Para registrar ventas primero debes{" "}
              <Link href="/cash-register" className="underline font-bold hover:opacity-80">
                abrir un turno de caja
              </Link>
              .
            </span>
          </div>
        )}

        {/* ── Mobile Tab Switcher ──────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Vistas del punto de venta móvil"
          className="flex-shrink-0 flex lg:hidden bg-surface border-b border-border px-3 py-2 gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMobileTab === "catalog"}
            onClick={() => setActiveMobileTab("catalog")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary ${
              activeMobileTab === "catalog"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main hover:bg-surface-secondary"
            }`}
          >
            <Grid className="w-4 h-4" />
            Catálogo ({products.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMobileTab === "cart"}
            onClick={() => setActiveMobileTab("cart")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary ${
              activeMobileTab === "cart"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main hover:bg-surface-secondary"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Ticket ({totalItemCount})
            {cart.length > 0 && (
              <span className="ml-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black">
                {formatCRC(total)}
              </span>
            )}
          </button>
        </div>

        {/* ── Main Split Panel ──────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">

          {/* LEFT: Product Catalog */}
          <div
            className={`flex-1 min-w-0 flex flex-col overflow-hidden border-r border-border ${
              activeMobileTab === "catalog" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Search Bar */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-b border-border bg-surface">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label="Buscar producto por nombre, SKU o código de barras"
                  placeholder="Buscar por nombre, SKU o escanear código (F2)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-surface-secondary border border-border rounded-xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Barcode className="w-4 h-4 text-text-muted" />
                  <span className="hidden sm:inline-block text-[10px] text-text-muted font-mono bg-surface px-1.5 py-0.5 rounded border border-border">
                    F2
                  </span>
                </div>
              </div>
            </div>

            {/* Product Grid — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center space-y-3 bg-surface border border-border rounded-2xl p-8 h-full min-h-[200px]">
                  <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center">
                    <PackagePlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">
                      {searchQuery ? "Sin resultados" : "No hay productos"}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 max-w-xs">
                      {searchQuery
                        ? `No se encontraron productos que coincidan con "${searchQuery}".`
                        : "Agrega tus productos en la sección de inventario para empezar a vender."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Link href="/products">
                      <Button variant="primary" size="sm">
                        + Registrar Productos
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="p-3 sm:p-3.5 bg-surface border border-border rounded-2xl hover:border-primary hover:bg-surface-hover transition-all text-left flex flex-col justify-between group active:scale-[0.97] touch-manipulation min-h-[100px] shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] sm:text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
                            {p.category_name || "General"}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 flex-shrink-0">
                            {p.tax_rate}%
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-primary transition-colors line-clamp-2">
                          {p.name}
                        </h3>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between pt-2 border-t border-border w-full">
                        <span className="text-sm font-black text-text-main font-mono">
                          {formatCRC(p.sale_price)}
                        </span>
                        <span className="text-[9px] text-text-muted font-mono">
                          Stock: {p.stock ?? 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart / Ticket Panel */}
          <div
            className={`w-full lg:w-80 xl:w-96 flex-shrink-0 flex-col bg-surface overflow-hidden ${
              activeMobileTab === "cart" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Cart Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-text-main uppercase tracking-wider">
                  Detalle de Venta
                  {totalItemCount > 0 && (
                    <span className="ml-1.5 text-primary font-mono">({totalItemCount})</span>
                  )}
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  aria-label="Vaciar todo el carrito"
                  className="text-[11px] text-semantic-danger-text hover:underline flex items-center gap-1 font-bold focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Vaciar
                </button>
              )}
            </div>

            {/* Cart Items — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-text-muted p-6">
                  <ShoppingBag className="w-8 h-8 opacity-30" />
                  <p className="text-xs">
                    El ticket está vacío.{" "}
                    <span className="hidden lg:inline">Haz clic en un producto para agregarlo.</span>
                    <span className="lg:hidden">Toca un producto del catálogo.</span>
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-text-main truncate">
                          {item.product.name}
                        </h4>
                        <span className="text-[11px] text-text-muted font-mono">
                          {formatCRC(item.product.sale_price)} c/u
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-surface-secondary rounded-xl border border-border p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          aria-label={`Disminuir cantidad de ${item.product.name}`}
                          className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-main touch-manipulation focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-text-main px-1.5 font-mono min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          aria-label={`Aumentar cantidad de ${item.product.name}`}
                          className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-main touch-manipulation focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right w-16 flex-shrink-0">
                        <span className="text-xs font-black text-text-main font-mono block">
                          {formatCRC(item.product.sale_price * item.quantity)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label={`Eliminar ${item.product.name} del ticket`}
                        className="p-1 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals & Checkout — fixed at bottom, never scrolls */}
            <div className="flex-shrink-0 border-t border-border bg-surface-secondary p-4 space-y-3 pb-safe">
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA Costa Rica:</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(totalTax)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-border">
                  <span className="font-black text-text-main text-sm">TOTAL:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 text-xl font-black">
                    {formatCRC(total)}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0 || !isCashOpen || isProcessing}
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 border-0 text-white"
              >
                {!isCashOpen ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Caja Cerrada — Abrir Turno
                  </>
                ) : (
                  <>
                    Cobrar Venta ({formatCRC(total)})
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-[10px] text-text-muted font-mono">
                F4 / Ctrl+Espacio = Cobrar • F2 = Buscar • Esc = Cancelar
              </div>
            </div>
          </div>
        </div>

        {/* Mobile floating quick checkout (only when on catalog tab and cart has items) */}
        {cart.length > 0 && activeMobileTab === "catalog" && isCashOpen && (
          <div className="flex-shrink-0 lg:hidden bg-surface border-t border-border px-3 py-2 flex items-center justify-between shadow-card">
            <div>
              <span className="text-[10px] text-text-muted uppercase font-bold block">{totalItemCount} producto{totalItemCount !== 1 ? "s" : ""}</span>
              <span className="text-lg font-black text-emerald-500 dark:text-emerald-400 font-mono">{formatCRC(total)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveMobileTab("cart")}>
                Ver Ticket
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="font-bold bg-emerald-600 hover:bg-emerald-500 border-0 text-white"
              >
                Cobrar
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => !isProcessing && setIsPaymentModalOpen(false)}
        title="Cobro de Venta — Terminal POS"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Total Display */}
          <div className="p-4 bg-surface-secondary border border-border rounded-2xl text-center">
            <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Total a Pagar</span>
            <h2 className="text-4xl font-black text-emerald-500 dark:text-emerald-400 font-mono mt-1">
              {formatCRC(total)}
            </h2>
          </div>

          {/* Document Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Tipo de Comprobante
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["04", "01"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocType(type)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                    docType === type
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {type === "04" ? "Tiquete Electrónico (04)" : "Factura Electrónica (01)"}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Data (only for invoice type 01) */}
          {docType === "01" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-surface-secondary rounded-xl border border-border">
              <Input
                label="Nombre / Razón Social"
                placeholder="Ej: Distribuidora Central S.A."
                value={customerName === "CLIENTE CONTADO" ? "" : customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <Input
                label="Cédula Física / Jurídica"
                placeholder="3101999999"
                value={customerCedula}
                onChange={(e) => setCustomerCedula(e.target.value)}
                required
              />
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
              Forma de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "CASH_CRC" as const, label: "Efectivo", icon: Banknote, color: "emerald" },
                { key: "SINPE" as const, label: "SINPE", icon: Smartphone, color: "blue" },
                { key: "CARD" as const, label: "Tarjeta", icon: CreditCard, color: "purple" },
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold touch-manipulation focus-visible:ring-2 focus-visible:ring-primary ${
                    paymentMethod === key
                      ? color === "emerald"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : color === "purple"
                        ? "bg-purple-500/10 border-purple-500 text-purple-500"
                        : "bg-primary-subtle border-primary text-primary"
                      : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-main"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash input */}
          {paymentMethod === "CASH_CRC" && (
            <div className="space-y-3">
              <Input
                label="Monto Entregado por Cliente (₡)"
                type="number"
                placeholder="Ej: 5000"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
              />
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Exacto", value: total.toString() },
                  { label: "₡2,000", value: "2000" },
                  { label: "₡5,000", value: "5000" },
                  { label: "₡10,000", value: "10000" },
                  { label: "₡20,000", value: "20000" },
                  { label: "₡50,000", value: "50000" },
                  { label: "₡100,000", value: "100000" },
                  { label: "₡500,000", value: "500000" },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCashReceived(value)}
                    className="py-2 px-1 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-text-main font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {numCash > 0 && (
                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary">Vuelto a Entregar:</span>
                  <span
                    className={`text-xl font-black font-mono ${
                      numCash >= total
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-red-500"
                    }`}
                  >
                    {numCash >= total ? formatCRC(change) : "Monto insuficiente"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SINPE ref input */}
          {paymentMethod === "SINPE" && (
            <Input
              label="Número de Teléfono / Comprobante SINPE"
              type="text"
              placeholder="Ej: 8888-9999 o Ref #123456"
              value={sinpeRef}
              onChange={(e) => setSinpeRef(e.target.value)}
              autoFocus
            />
          )}

          {isInvoiceMissingCustomer && (
            <p className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
              * Para Factura Electrónica (01) debe ingresar el nombre y cédula del cliente.
            </p>
          )}

          {isSinpeMissingRef && (
            <p className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
              * Debe ingresar el número de teléfono o referencia SINPE.
            </p>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={completeSale}
            disabled={!canCompleteSale}
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 border-0 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Completar Venta e Imprimir Comprobante
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* ── Receipt Modal ─────────────────────────────────────────────── */}
      {lastReceiptData && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Comprobante de Venta"
          maxWidth="md"
        >
          <ThermalReceipt data={lastReceiptData} onClose={() => setIsReceiptModalOpen(false)} />
        </Modal>
      )}
    </POSLayout>
  );
}