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
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryName, setCategoryName] = useState("General");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("13");
  const [stock, setStock] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("5");
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic categories from existing products + defaults
  const uniqueCategories = Array.from(
    new Set(["ALL", "General", "Bebidas", "Snacks", "Abarrotes", "Limpieza", ...products.map((p) => p.category_name).filter(Boolean)])
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setBarcode("");
    setCategoryName("General");
    setSalePrice("");
    setCostPrice("");
    setTaxRate("13");
    setStock("0");
    setMinStockAlert("5");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || "");
    setBarcode(p.barcode || "");
    setCategoryName(p.category_name || "General");
    setSalePrice(p.sale_price.toString());
    setCostPrice((p.cost_price || 0).toString());
    setTaxRate(p.tax_rate.toString());
    setStock((p.stock ?? 0).toString());
    setMinStockAlert(p.min_stock_alert.toString());
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("El precio de venta debe ser un número mayor a 0.");
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        category_name: categoryName.trim() || "General",
        sale_price: priceNum,
        cost_price: parseFloat(costPrice) || 0,
        tax_rate: parseFloat(taxRate) || 13,
        stock: parseInt(stock, 10) || 0,
        min_stock_alert: parseInt(minStockAlert, 10) || 5,
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: barcode.trim() || null,
        category_name: categoryName.trim() || "General",
        sale_price: priceNum,
        cost_price: parseFloat(costPrice) || 0,
        tax_rate: parseFloat(taxRate) || 13,
        stock: parseInt(stock, 10) || 0,
        min_stock_alert: parseInt(minStockAlert, 10) || 5,
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
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
            {uniqueCategories.map((cat) => (
              <button
                key={cat || "ALL"}
                type="button"
                onClick={() => setSelectedCategory(cat || "ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedCategory === (cat || "ALL")
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface border border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {cat === "ALL" ? "Todos" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        {products.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary-subtle text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Package className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-bold text-text-main">No hay productos en el catálogo</h2>
              <p className="text-xs text-text-muted">
                Registra tus productos con precios, stock en bodega y código de barras para poder venderlos en el Punto de Venta (POS).
              </p>
            </div>
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Crear Primer Producto
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Catálogo de productos">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th scope="col" className="pb-3 font-bold">Producto</th>
                    <th scope="col" className="pb-3 font-bold">SKU / Barras</th>
                    <th scope="col" className="pb-3 font-bold">Categoría</th>
                    <th scope="col" className="pb-3 font-bold">Precio Venta</th>
                    <th scope="col" className="pb-3 font-bold">IVA</th>
                    <th scope="col" className="pb-3 font-bold">Stock</th>
                    <th scope="col" className="pb-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        No se encontraron productos con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-3 font-bold text-text-main">{p.name}</td>
                        <td className="py-3 font-mono text-text-muted">
                          {p.sku || p.barcode || "—"}
                        </td>
                        <td className="py-3 text-text-secondary">
                          <span className="px-2 py-0.5 bg-surface-secondary rounded-md border border-border text-[11px]">
                            {p.category_name || "General"}
                          </span>
                        </td>
                        <td className="py-3 font-black text-text-main font-mono">
                          {formatCRC(p.sale_price)}
                        </td>
                        <td className="py-3">
                          <Badge variant="blue">{p.tax_rate}% IVA</Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-mono font-bold ${
                              (p.stock ?? 0) <= p.min_stock_alert ? "text-amber-500" : "text-emerald-500"
                            }`}
                          >
                            {p.stock ?? 0} uds
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
                              onClick={() => setProductToDelete(p)}
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
          {formError && (
            <div className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-xs text-semantic-danger-text font-medium">
              {formError}
            </div>
          )}

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
              placeholder="SKU-001"
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
              <input
                list="category-suggestions"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej: Abarrotes"
                className="w-full px-3.5 py-2.5 bg-surface-input border border-border rounded-xl text-xs sm:text-sm text-text-main focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              />
              <datalist id="category-suggestions">
                {uniqueCategories.filter((c) => c !== "ALL").map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
              placeholder="0"
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

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setProductToDelete(null)}
          title="Confirmar Eliminación"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              ¿Estás seguro de que deseas eliminar el producto{" "}
              <strong className="text-text-main">{productToDelete.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setProductToDelete(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Eliminar Producto
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  );
}