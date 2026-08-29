"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Tag,
  Barcode,
  Edit2,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";
import { Product } from "@/types";

const INITIAL_PRODUCTS: Product[] = [
  { id: "1", name: "Coca-Cola 600ml Descartable", barcode: "7441001001", sku: "BEB-001", sale_price: 1200, cost_price: 800, min_stock_alert: 10, tax_rate: 13, category_name: "Bebidas", stock: 50 },
  { id: "2", name: "Cerveza Imperial 350ml Lata", barcode: "7441002002", sku: "LIC-001", sale_price: 1400, cost_price: 950, min_stock_alert: 24, tax_rate: 13, category_name: "Licores", stock: 45 },
  { id: "3", name: "Papas Tosty Clásicas 115g", barcode: "7441003003", sku: "SNK-001", sale_price: 850, cost_price: 550, min_stock_alert: 15, tax_rate: 13, category_name: "Snacks", stock: 30 },
  { id: "4", name: "Café Rey 500g Tradicional", barcode: "7441004004", sku: "ABA-001", sale_price: 2800, cost_price: 2100, min_stock_alert: 8, tax_rate: 1, category_name: "Canasta Básica", stock: 20 },
  { id: "5", name: "Agua Cristal 600ml Sin Gas", barcode: "7441005005", sku: "BEB-002", sale_price: 700, cost_price: 400, min_stock_alert: 12, tax_rate: 13, category_name: "Bebidas", stock: 60 },
  { id: "6", name: "Galletas Chiky Chocolate", barcode: "7441006006", sku: "SNK-002", sale_price: 650, cost_price: 420, min_stock_alert: 10, tax_rate: 13, category_name: "Snacks", stock: 5 },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryName, setCategoryName] = useState("Abarrotes");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("13");
  const [minStockAlert, setMinStockAlert] = useState("10");

  const categories = ["ALL", "Bebidas", "Licores", "Snacks", "Canasta Básica", "Abarrotes"];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "ALL" || p.category_name === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: Product = {
      id: Date.now().toString(),
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: barcode || undefined,
      category_name: categoryName,
      sale_price: parseFloat(salePrice) || 0,
      cost_price: parseFloat(costPrice) || 0,
      tax_rate: parseFloat(taxRate) || 13,
      min_stock_alert: parseFloat(minStockAlert) || 5,
      stock: 0,
    };
    setProducts([newProd, ...products]);
    setIsNewProductModalOpen(false);
    setName("");
    setSku("");
    setBarcode("");
    setSalePrice("");
    setCostPrice("");
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Catálogo de Productos</h1>
            <p className="text-xs text-[#8E929E]">Administración de artículos, precios e impuestos IVA de Costa Rica</p>
          </div>
          <Button variant="primary" onClick={() => setIsNewProductModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E929E]" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#141518] border border-[#26282E] rounded-xl text-xs text-white placeholder-[#6C707E] focus:outline-none focus:border-[#0EA5FF]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#0EA5FF] text-white"
                    : "bg-[#141518] border border-[#26282E] text-[#8E929E] hover:text-white"
                }`}
              >
                {cat === "ALL" ? "Todas las Categorías" : cat}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8E929E] border-b border-[#26282E]">
                  <th className="pb-3">Producto / Descripción</th>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3">SKU / Código</th>
                  <th className="pb-3">Tarifa IVA</th>
                  <th className="pb-3 text-right">Precio Costo</th>
                  <th className="pb-3 text-right">Precio Venta (IVA incl.)</th>
                  <th className="pb-3 text-center">Stock Actual</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26282E]">
                {filteredProducts.map((p) => {
                  const isLow = (p.stock || 0) <= p.min_stock_alert;
                  return (
                    <tr key={p.id} className="hover:bg-[#1A1B1F]/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-[#1A1B1F] rounded-lg border border-[#26282E]">
                            <Package className="w-4 h-4 text-[#0EA5FF]" />
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{p.name}</span>
                            <span className="text-[10px] text-[#6C707E]">Mín. Alerta: {p.min_stock_alert} uds</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="blue">{p.category_name}</Badge>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-[#8E929E]">
                        <div>{p.sku || "-"}</div>
                        {p.barcode && <div className="text-[10px] text-[#6C707E]">{p.barcode}</div>}
                      </td>
                      <td className="py-3">
                        <Badge variant={p.tax_rate === 13 ? "default" : p.tax_rate === 1 ? "success" : "warning"}>
                          IVA {p.tax_rate}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono text-[#8E929E]">{formatCRC(p.cost_price)}</td>
                      <td className="py-3 text-right font-mono font-bold text-white">{formatCRC(p.sale_price)}</td>
                      <td className="py-3 text-center">
                        <Badge variant={isLow ? "danger" : "success"}>
                          {p.stock} uds {isLow && "(Bajo Stock)"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button className="p-1.5 hover:bg-[#26282E] text-[#8E929E] hover:text-white rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isNewProductModalOpen} onClose={() => setIsNewProductModalOpen(false)} title="Registrar Nuevo Producto" maxWidth="lg">
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nombre del Producto"
                placeholder="Ej: Leche Dos Pinos Semidescremada 1L"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Código SKU"
              placeholder="Ej: LEC-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <Input
              label="Código de Barras"
              placeholder="Ej: 7441001234567"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CFCFD4]">Categoría</label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
              >
                <option value="Abarrotes">Abarrotes</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Licores">Licores</option>
                <option value="Snacks">Snacks</option>
                <option value="Canasta Básica">Canasta Básica</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#CFCFD4]">Impuesto IVA (Costa Rica)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1B1F] border border-[#26282E] rounded-xl text-xs text-white focus:outline-none focus:border-[#0EA5FF]"
              >
                <option value="13">13% - General (Código 01)</option>
                <option value="4">4% - Reducido Medicamentos (Código 02)</option>
                <option value="2">2% - Reducido Insumos Agro (Código 03)</option>
                <option value="1">1% - Canasta Básica (Código 04)</option>
                <option value="0">0% - Exento (Código 08)</option>
              </select>
            </div>

            <Input
              label="Precio de Costo (CRC)"
              type="number"
              placeholder="Ej: 800"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              required
            />

            <Input
              label="Precio de Venta con IVA (CRC)"
              type="number"
              placeholder="Ej: 1200"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              required
            />

            <Input
              label="Alerta de Stock Mínimo"
              type="number"
              placeholder="Ej: 10"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-[#26282E] flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Producto
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}