"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Printer,
  ShoppingBag,
  Grid,
  ArrowRight,
  PackagePlus,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import { useStore } from "@/features/store/store-context";
import { Product, CartItem } from "@/types";
import { formatCRC } from "@/lib/utils";

export default function POSPage() {
  const { products, recordSale, settings, importSampleProducts } = useStore();

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4" || (e.code === "Space" && e.ctrlKey)) {
        if (cart.length > 0) {
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
  }, [cart]);

  const addToCart = (product: Product) => {
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
  };

  const updateQuantity = (productId: string, delta: number) => {
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
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((acc, item) => acc + item.product.sale_price * item.quantity, 0);
  const totalTax = cart.reduce((acc, item) => {
    const itemSub = item.product.sale_price * item.quantity;
    return acc + itemSub * (item.product.tax_rate / 100);
  }, 0);
  const total = subtotal + totalTax;
  const totalItemCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  const numCash = parseFloat(cashReceived) || 0;
  const change = Math.max(0, numCash - total);

  const completeSale = () => {
    const { receiptData } = recordSale({
      items: cart.map((c) => ({ product: c.product, quantity: c.quantity })),
      paymentMethod,
      cashReceived: numCash,
      sinpeRef,
      customerName: customerName || "CLIENTE CONTADO",
      customerCedula,
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
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Mobile View Switcher Tabs (< lg) */}
        <div
          role="tablist"
          aria-label="Vistas del punto de venta móvil"
          className="flex lg:hidden bg-surface-secondary p-1 rounded-2xl border border-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMobileTab === "catalog"}
            onClick={() => setActiveMobileTab("catalog")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary ${
              activeMobileTab === "catalog"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
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
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ticket ({totalItemCount})</span>
            {cart.length > 0 && (
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                {formatCRC(total)}
              </span>
            )}
          </button>
        </div>

        {/* Main Grid: Dual Column on Desktop, Tabbed on Mobile */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-7.5rem)]">
          {/* Left Side: Product Search & Quick Catalog */}
          <div
            className={`flex-1 flex-col space-y-4 overflow-hidden ${
              activeMobileTab === "catalog" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Buscar producto por nombre, SKU o código de barras"
                placeholder="Buscar por nombre, SKU o escanear código (F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Barcode className="w-4 h-4 text-text-muted" />
                <span className="hidden sm:inline-block text-[10px] text-text-muted font-mono bg-surface-secondary px-1.5 py-0.5 rounded-lg border border-border">
                  F2
                </span>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 bg-surface border border-border rounded-3xl p-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center">
                    <PackagePlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">No hay productos disponibles</h3>
                    <p className="text-xs text-text-muted mt-1 max-w-sm">
                      {searchQuery
                        ? "No se encontraron productos que coincidan con la búsqueda."
                        : "Agrega tus productos en la sección de inventario para empezar a vender."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/products">
                      <Button variant="primary" size="sm">
                        + Registrar Productos
                      </Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={importSampleProducts}>
                      Cargar Ejemplos
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3.5">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="p-3 sm:p-4 bg-surface border border-border rounded-2xl hover:border-primary hover:bg-surface-hover transition-all text-left flex flex-col justify-between group active:scale-[0.97] touch-manipulation min-h-[110px] shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] sm:text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
                            {p.category_name || "General"}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 flex-shrink-0">
                            {p.tax_rate}% IVA
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-text-main group-hover:text-primary transition-colors line-clamp-2">
                          {p.name}
                        </h3>
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-border w-full">
                        <span className="text-sm sm:text-base font-black text-text-main font-mono">{formatCRC(p.sale_price)}</span>
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-mono">Stock: {p.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Cart Summary & Checkout */}
          <div
            className={`w-full lg:w-96 bg-surface border border-border rounded-3xl flex-col overflow-hidden shadow-card ${
              activeMobileTab === "cart" ? "flex min-h-[450px]" : "hidden lg:flex"
            }`}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-text-main uppercase tracking-wider">
                  Detalle de Venta ({totalItemCount})
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

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-border">
              {cart.length === 0 ? (
                <div className="h-full py-12 flex flex-col items-center justify-center text-center space-y-2 text-text-muted">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                  <p className="text-xs">El ticket está vacío. Toca un producto del catálogo para agregarlo.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-text-main truncate">{item.product.name}</h4>
                      <span className="text-[11px] text-text-muted font-mono">
                        {formatCRC(item.product.sale_price)} c/u
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-surface-secondary p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                        className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-main touch-manipulation focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-text-main px-2 font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        aria-label={`Aumentar cantidad de ${item.product.name}`}
                        className="p-1.5 hover:bg-surface-hover rounded-lg text-text-secondary hover:text-text-main touch-manipulation focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-xs font-black text-text-main font-mono block">
                        {formatCRC(item.product.sale_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Checkout Button */}
            <div className="p-4 bg-surface-secondary border-t border-border space-y-3">
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Subtotal Gravado:</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA Costa Rica:</span>
                  <span className="font-mono font-bold text-text-main">{formatCRC(totalTax)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-text-main pt-2 border-t border-border">
                  <span>TOTAL A COBRAR:</span>
                  <span className="font-mono text-emerald-500 text-lg">{formatCRC(total)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0}
                className="w-full py-4 text-sm font-bold shadow-sm touch-manipulation bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Cobrar Venta ({formatCRC(total)})
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Quick-Checkout Floating Bar (< lg) */}
        {cart.length > 0 && activeMobileTab === "catalog" && (
          <div className="fixed bottom-14 left-0 right-0 p-3 bg-surface/95 border-t border-border lg:hidden z-20 backdrop-blur-md flex items-center justify-between shadow-card">
            <div>
              <span className="text-[10px] text-text-muted uppercase font-bold block">{totalItemCount} productos</span>
              <span className="text-lg font-black text-emerald-500 font-mono">{formatCRC(total)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveMobileTab("cart")}
              >
                Ver Ticket
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Cobrar
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Cobro de Venta (Terminal POS)" maxWidth="md">
        <div className="space-y-5">
          <div className="p-4 bg-surface-secondary border border-border rounded-2xl text-center">
            <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Total a Pagar</span>
            <h2 className="text-3xl font-black text-emerald-500 font-mono mt-1">{formatCRC(total)}</h2>
          </div>

          {/* Document Type (Tiquete 04 vs Factura 01) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Tipo de Comprobante</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDocType("04")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  docType === "04"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                Tiquete Electrónico (04)
              </button>
              <button
                type="button"
                onClick={() => setDocType("01")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  docType === "01"
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                Factura Electrónica (01)
              </button>
            </div>
          </div>

          {docType === "01" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-surface-secondary rounded-xl border border-border">
              <Input
                label="Nombre / Razón Social Cliente"
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Forma de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH_CRC")}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold touch-manipulation focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === "CASH_CRC"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-main"
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("SINPE")}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold touch-manipulation focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === "SINPE"
                    ? "bg-primary-subtle border-primary text-primary shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-main"
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>SINPE</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold touch-manipulation focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === "CARD"
                    ? "bg-purple-500/10 border-purple-500 text-purple-500 shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-main"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarjeta</span>
              </button>
            </div>
          </div>

          {paymentMethod === "CASH_CRC" && (
            <div className="space-y-3">
              <Input
                label="Monto Entregado por Cliente (CRC)"
                type="number"
                placeholder="Ej: 5000"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                autoFocus
              />

              {/* Quick Cash Bills Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashReceived(total.toString())}
                  className="py-2 px-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-text-main font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Exacto
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceived("2000")}
                  className="py-2 px-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-emerald-500 font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                >
                  ₡2,000
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceived("5000")}
                  className="py-2 px-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-emerald-500 font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                >
                  ₡5,000
                </button>
                <button
                  type="button"
                  onClick={() => setCashReceived("10000")}
                  className="py-2 px-2 bg-surface-secondary hover:bg-surface-hover border border-border rounded-xl text-[11px] text-emerald-500 font-mono font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                >
                  ₡10,000
                </button>
              </div>

              {numCash > 0 && (
                <div className="p-3 bg-surface-secondary border border-border rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary">Vuelto a Entregar:</span>
                  <span className="text-lg font-black text-emerald-500 font-mono">{formatCRC(change)}</span>
                </div>
              )}
            </div>
          )}

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

          <Button
            variant="primary"
            size="lg"
            onClick={completeSale}
            disabled={paymentMethod === "CASH_CRC" && numCash < total}
            className="w-full py-4 font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Completar Venta e Imprimir Comprobante
          </Button>
        </div>
      </Modal>

      {/* Thermal Receipt Modal */}
      {lastReceiptData && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Tiquete Electrónico de Compra"
          maxWidth="md"
        >
          <ThermalReceipt data={lastReceiptData} onClose={() => setIsReceiptModalOpen(false)} />
        </Modal>
      )}
    </OwnerLayout>
  );
}