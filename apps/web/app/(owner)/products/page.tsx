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
  PackagePlus,
} from "lucide-react";
import { OwnerLayout } from "@/components/layouts/owner-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatCRC } from "@/lib/utils";
import { useStore } from "@/features/store/store-context";
import { Product } from "@/types";

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryName, setCategoryName] = useState("Abarrotes");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("13");
  const [stock, setStock] = useState("20");
  const [minStockAlert, setMinStockAlert] = useState("5");

  const categories = ["ALL", "Bebidas", "Licores", "Snacks", "Canasta Básica", "Abarrotes", "Lácteos", "Carnes", "Limpieza", "Otros"];

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setSku(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setBarcode("");
    setCategoryName("Abarrotes");
    setSalePrice("");
    setCostPrice("");
    setTaxRate("13");
    setStock("25");
    setMinStockAlert("5");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || "");
    setBarcode(p.barcode || "");
    setCategoryName(p.category_name || "Abarrotes");
    setSalePrice(p.sale_price.toString());
    setCostPrice(p.cost_price.toString());
    setTaxRate(p.tax_rate.toString());
    setStock((p.stock ?? 0).toString());
    setMinStockAlert(p.min_stock_alert.toString());
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        sku: sku || null,
        barcode: barcode || null,
        category_name: categoryName,
        sale_price: parseFloat(salePrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        tax_rate: parseFloat(taxRate) || 13,
        stock: parseInt(stock, 10) || 0,
        min_stock_alert: parseInt(minStockAlert, 10) || 5,
      });
    } else {
      addProduct({
        name,
        sku: sku || `SKU-${Date.now()}`,
        barcode: barcode || null,
        category_name: categoryName,
        sale_price: parseFloat(salePrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        tax_rate: parseFloat(taxRate) || 13,
        stock: parseInt(stock, 10) || 0,
        min_stock_alert: parseInt(minStockAlert, 10) || 5,
      });
    }
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "ALL" || p.category_name === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-main tracking-tight">Catálogo de Productos ({products.length})</h1>
            <p className="text-xs text-text-muted">
              Gestiona los productos, precios en colones, stock en bodega y tarifas de IVA de tu negocio
            </p>
          </div>

          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Producto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              aria-label="Buscar producto por nombre, SKU o código de barras"
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-border rounded-2xl text-xs sm:text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            />
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-text-main"
                }`}
              >
                {cat === "ALL" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table or Professional Empty State */}
        {products.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <PackagePlus className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">Todavía no tienes productos registrados</h2>
              <p className="text-xs text-text-muted">
                Agrega los productos o artículos que vendes en tu negocio para que estén disponibles al instante en el Punto de Venta (POS).
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primer Producto
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Tabla de inventario de productos">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Producto</th>
                    <th scope="col" className="pb-3 font-bold">SKU / Código</th>
                    <th scope="col" className="pb-3 font-bold">Categoría</th>
                    <th scope="col" className="pb-3 font-bold">Precio Venta (CRC)</th>
                    <th scope="col" className="pb-3 font-bold">Tarifa IVA</th>
                    <th scope="col" className="pb-3 font-bold">Stock</th>
                    <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-text-muted">
                        No se encontraron productos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-bold text-text-main flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate max-w-xs">{p.name}</span>
                        </td>
                        <td className="py-3 font-mono text-text-secondary text-[11px]">
                          <div>{p.sku || "-"}</div>
                          {p.barcode && <div className="text-text-muted text-[10px]">{p.barcode}</div>}
                        </td>
                        <td className="py-3 text-text-secondary">{p.category_name || "General"}</td>
                        <td className="py-3 font-black text-text-main font-mono text-sm">{formatCRC(p.sale_price)}</td>
                        <td className="py-3">
                          <Badge variant="blue">{p.tax_rate}% IVA</Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-mono font-bold ${
                              (p.stock ?? 0) <= p.min_stock_alert ? "text-amber-500" : "text-emerald-500"
                            }`}
                          >
                            {p.stock} uds
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              aria-label={`Editar ${p.name}`}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProduct(p.id)}
                              aria-label={`Eliminar ${p.name}`}
                              className="p-1.5 text-text-muted hover:text-red-500 hover:bg-semantic-danger-bg rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre del Producto"
            placeholder="Ej: Leche Dos Pinos 1L Semidescremada"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Código SKU"
              placeholder="BEB-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <Input
              label="Código de Barras (EAN-13)"
              placeholder="7441001001"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Categoría
              </label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                {categories.filter((c) => c !== "ALL").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                Tarifa de IVA (Costa Rica)
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="13">13% - Tarifa General</option>
                <option value="1">1% - Canasta Básica Tributaria</option>
                <option value="2">2% - Medicamentos e Insumos</option>
                <option value="4">4% - Servicios de Salud y Boletos</option>
                <option value="0">0% - Exento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Precio de Venta (CRC ₡)"
              type="number"
              placeholder="1200"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              required
            />
            <Input
              label="Precio de Costo (CRC ₡)"
              type="number"
              placeholder="800"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Stock Inicial en Bodega"
              type="number"
              placeholder="25"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
            <Input
              label="Alerta Mínima de Stock"
              type="number"
              placeholder="5"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingProduct ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </Modal>
    </OwnerLayout>
  );
}