"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Product, CartItem } from "@/types";
import { formatCRC } from "@/lib/utils";

const SAMPLE_CATALOG: Product[] = [
  { id: "1", name: "Coca-Cola 600ml Descartable", barcode: "7441001001", sku: "BEB-001", sale_price: 1200, cost_price: 800, min_stock_alert: 10, tax_rate: 13, category_name: "Bebidas", stock: 50 },
  { id: "2", name: "Cerveza Imperial 350ml Lata", barcode: "7441002002", sku: "LIC-001", sale_price: 1400, cost_price: 950, min_stock_alert: 24, tax_rate: 13, category_name: "Licores", stock: 45 },
  { id: "3", name: "Papas Tosty Clásicas 115g", barcode: "7441003003", sku: "SNK-001", sale_price: 850, cost_price: 550, min_stock_alert: 15, tax_rate: 13, category_name: "Snacks", stock: 30 },
  { id: "4", name: "Café Rey 500g Tradicional", barcode: "7441004004", sku: "ABA-001", sale_price: 2800, cost_price: 2100, min_stock_alert: 8, tax_rate: 1, category_name: "Canasta Básica", stock: 20 },
  { id: "5", name: "Agua Cristal 600ml Sin Gas", barcode: "7441005005", sku: "BEB-002", sale_price: 700, cost_price: 400, min_stock_alert: 12, tax_rate: 13, category_name: "Bebidas", stock: 60 },
  { id: "6", name: "Galletas Chiky Chocolate", barcode: "7441006006", sku: "SNK-002", sale_price: 650, cost_price: 420, min_stock_alert: 10, tax_rate: 13, category_name: "Snacks", stock: 25 },
];

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_CRC" | "SINPE" | "CARD" | "MIXED">("CASH_CRC");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [sinpeRef, setSinpeRef] = useState<string>("");
  const [saleSuccess, setSaleSuccess] = useState<boolean>(false);
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
        setSaleSuccess(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
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
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              lineTotal: newQty * item.unitPrice,
            };
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

  const subtotal = cart.reduce((acc, item) => acc + item.quantity * (item.unitPrice / (1 + item.taxRate / 100)), 0);
  const taxTotal = cart.reduce((acc, item) => acc + item.lineTotal - (item.unitPrice / (1 + item.taxRate / 100)) * item.quantity, 0);
  const total = cart.reduce((acc, item) => acc + item.lineTotal, 0);

  const numCash = parseFloat(cashReceived) || 0;
  const change = Math.max(0, numCash - total);

  const filteredProducts = SAMPLE_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const completeSale = () => {
    setSaleSuccess(true);
    setTimeout(() => {
      setCart([]);
      setIsPaymentModalOpen(false);
      setSaleSuccess(false);
      setCashReceived("");
      setSinpeRef("");
    }, 2000);
  };

  return (
    <OwnerLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6.5rem)]">
        <div className="lg:col-span-7 flex flex-col h-full space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E929E]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto o escanear código de barras (Atajo: F2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-3 bg-[#141518] border border-[#26282E] focus:border-[#0EA5FF] rounded-xl text-sm text-white placeholder-[#6C707E] focus:outline-none transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[#6C707E] font-mono bg-[#1A1B1F] px-2 py-1 rounded border border-[#26282E]">
              <Barcode className="w-3.5 h-3.5 text-[#0EA5FF]" />
              <span>SCAN</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col justify-between p-3.5 bg-[#141518] hover:bg-[#1A1B1F] border border-[#26282E] hover:border-[#0EA5FF] rounded-xl text-left transition-all duration-150 group"
              >
                <div className="space-y-1">
                  <Badge variant="blue" className="text-[9px]">
                    {p.category_name}
                  </Badge>
                  <h4 className="text-xs font-semibold text-white group-hover:text-[#0EA5FF] transition-colors line-clamp-2">
                    {p.name}
                  </h4>
                  <span className="text-[10px] text-[#6C707E] font-mono block">SKU: {p.sku}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#26282E] flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{formatCRC(p.sale_price)}</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Stock: {p.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#141518] border border-[#26282E] rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#26282E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#0EA5FF]" />
              <h3 className="text-sm font-bold text-white">Ticket de Venta Actual</h3>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-[#6C707E]">
                <Barcode className="w-10 h-10 text-[#26282E]" />
                <p className="text-xs">El carrito está vacío</p>
                <span className="text-[11px] text-[#8E929E]">Escanea o selecciona productos del catálogo</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 bg-[#1A1B1F] border border-[#26282E] rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-white truncate">{item.product.name}</h5>
                    <span className="text-[11px] text-[#8E929E]">
                      {formatCRC(item.unitPrice)} x {item.quantity} (IVA {item.taxRate}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded bg-[#26282E] hover:bg-[#3A3D46] text-white flex items-center justify-center text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded bg-[#26282E] hover:bg-[#3A3D46] text-white flex items-center justify-center text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-bold text-white">{formatCRC(item.lineTotal)}</span>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[#6C707E] hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-[#26282E] bg-[#101114] space-y-3">
            <div className="space-y-1.5 text-xs text-[#8E929E]">
              <div className="flex justify-between">
                <span>Subtotal (Neto):</span>
                <span className="font-mono text-white">{formatCRC(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos IVA:</span>
                <span className="font-mono text-white">{formatCRC(taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#26282E]">
                <span>TOTAL A COBRAR:</span>
                <span className="text-[#0EA5FF] font-mono">{formatCRC(total)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3 font-bold text-sm shadow-xl shadow-[#0EA5FF]/20"
            >
              COBRAR {formatCRC(total)} (F4 / Espacio)
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Cobro de Venta (POS)" maxWidth="md">
        {saleSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-white">¡Venta Completada con Éxito!</h3>
            <p className="text-xs text-[#8E929E]">Comprobante registrado e inventario descontado.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-center">
              <span className="text-xs text-[#8E929E] uppercase tracking-wider font-semibold">Total a Pagar</span>
              <h2 className="text-3xl font-black text-[#0EA5FF] font-mono mt-1">{formatCRC(total)}</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#CFCFD4] uppercase tracking-wider">Forma de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH_CRC")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === "CASH_CRC"
                      ? "bg-[#0EA5FF]/10 border-[#0EA5FF] text-[#0EA5FF]"
                      : "bg-[#1A1B1F] border-[#26282E] text-[#CFCFD4] hover:bg-[#222328]"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Efectivo CRC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("SINPE")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === "SINPE"
                      ? "bg-[#0EA5FF]/10 border-[#0EA5FF] text-[#0EA5FF]"
                      : "bg-[#1A1B1F] border-[#26282E] text-[#CFCFD4] hover:bg-[#222328]"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>SINPE Móvil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                    paymentMethod === "CARD"
                      ? "bg-[#0EA5FF]/10 border-[#0EA5FF] text-[#0EA5FF]"
                      : "bg-[#1A1B1F] border-[#26282E] text-[#CFCFD4] hover:bg-[#222328]"
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
                {numCash > 0 && (
                  <div className="p-3 bg-[#1A1B1F] border border-[#26282E] rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#CFCFD4]">Vuelto a Entregar:</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">{formatCRC(change)}</span>
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
              className="w-full py-3 font-bold text-sm"
            >
              Completar Venta e Imprimir Ticket
            </Button>
          </div>
        )}
      </Modal>
    </OwnerLayout>
  );
}
