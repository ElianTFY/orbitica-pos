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
  Printer,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
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
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_CRC" | "SINPE" | "CARD" | "MIXED">("CASH_CRC");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [sinpeRef, setSinpeRef] = useState<string>("");
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

  const numCash = parseFloat(cashReceived) || 0;
  const change = Math.max(0, numCash - total);

  const completeSale = () => {
    const seq = Math.floor(1000 + Math.random() * 9000);
    const saleNum = `V-${seq.toString().padStart(6, "0")}`;
    const key = `5062908260031018889990010000104000000${seq.toString().padStart(4, "0")}112345678`;
    const consecutive = `0010000104000000${seq.toString().padStart(4, "0")}`;

    const receiptPayload = {
      sale_number: saleNum,
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      store: {
        name: "Minimarket San José Express",
        legal_name: "Comercial San José S.A.",
        legal_id: "3-101-888999",
        phone: "2222-3344",
        email: "facturacion@sanjoseexpress.cr",
        address: "San José Centro, Avenida Central",
        branch_name: "Sucursal Central (001)",
      },
      customer: {
        name: "CLIENTE CONTADO",
        identification: null,
      },
      hacienda: {
        doc_type: "04 Tiquete Electrónico",
        consecutive: consecutive,
        numeric_key: key,
        resolution: "Autorizada mediante resolución Nº DGT-R-48-2016",
        qr_url: `https://tribunet.hacienda.go.cr/docs/${key}`,
      },
      items: cart.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        unit_price: it.product.sale_price,
        tax_amount: (it.product.sale_price * (it.product.tax_rate / 100)) * it.quantity,
        total: (it.product.sale_price * (1 + it.product.tax_rate / 100)) * it.quantity,
      })),
      totals: {
        subtotal,
        discount: 0,
        tax: totalTax,
        total,
        currency: "CRC",
      },
      payments: [
        {
          method: paymentMethod,
          amount: paymentMethod === "CASH_CRC" ? numCash : total,
          reference: sinpeRef || null,
        },
      ],
      footer_message: "¡Gracias por su compra en San José Express!",
    };

    setLastReceiptData(receiptPayload);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
    clearCart();
    setCashReceived("");
    setSinpeRef("");
  };

  const filteredProducts = SAMPLE_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <OwnerLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)]">
        {/* Left Side: Product Search & Quick Catalog */}
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre, SKU o escanear código de barras (F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2.5 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF] transition-colors"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Barcode className="w-4 h-4 text-[#8E929E]" />
                <span className="text-[10px] text-[#6C707E] font-mono bg-[#1A1B1F] px-1.5 py-0.5 rounded border border-[#26282E]">
                  F2
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-3.5 bg-[#141518] border border-[#26282E] rounded-xl hover:border-[#0EA5FF]/50 hover:bg-[#1A1B1F] transition-all text-left flex flex-col justify-between group active:scale-[0.98]"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono text-[#8E929E] uppercase tracking-wider">{p.category_name}</span>
                      <span className="text-[10px] font-bold text-emerald-400">IVA {p.tax_rate}%</span>
                    </div>
                    <h3 className="text-xs font-semibold text-white group-hover:text-[#0EA5FF] transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-[#26282E]/50">
                    <span className="text-sm font-bold text-white font-mono">{formatCRC(p.sale_price)}</span>
                    <span className="text-[10px] text-[#8E929E] font-mono">Stock: {p.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cart Summary & Checkout Bar */}
        <div className="w-full lg:w-96 bg-[#141518] border border-[#26282E] rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-[#26282E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#0EA5FF]" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Detalle de Venta</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-[#FF453A] hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3 h-3" />
                Vaciar
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#26282E]/40">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-[#8E929E]">
                <Barcode className="w-8 h-8 opacity-40" />
                <p className="text-xs">Escanea un producto o selecciona del catálogo para iniciar la venta.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{item.product.name}</h4>
                    <span className="text-[11px] text-[#8E929E] font-mono">
                      {formatCRC(item.product.sale_price)} c/u
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#1A1B1F] p-1 rounded-lg border border-[#26282E]">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 hover:bg-[#26282E] rounded text-[#CFCFD4] hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-white px-1.5 font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 hover:bg-[#26282E] rounded text-[#CFCFD4] hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-white font-mono block">
                      {formatCRC(item.product.sale_price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Checkout Button */}
          <div className="p-4 bg-[#1A1B1F] border-t border-[#26282E] space-y-3">
            <div className="space-y-1.5 text-xs text-[#8E929E]">
              <div className="flex justify-between">
                <span>Subtotal Gravado:</span>
                <span className="font-mono text-white">{formatCRC(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA Costa Rica:</span>
                <span className="font-mono text-white">{formatCRC(totalTax)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#26282E]">
                <span>TOTAL A COBRAR:</span>
                <span className="font-mono text-[#0EA5FF]">{formatCRC(total)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3.5 text-sm font-bold shadow-lg shadow-[#0EA5FF]/20"
            >
              Cobrar (F4 / Espacio)
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Cobro de Venta (Terminal POS)" maxWidth="md">
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