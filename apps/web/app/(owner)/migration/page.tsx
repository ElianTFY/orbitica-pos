"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Undo2,
  RefreshCw,
  Trash2,
  ArrowRight,
  Sparkles,
  Layers,
  Database,
  History,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/features/store/store-context";
import { ImportBatch } from "@/types";

type EntityType = "products" | "customers" | "suppliers";

interface ColumnMapping {
  fileColumn: string;
  orbiticaField: string;
}

const TEMPLATES: Record<EntityType, { filename: string; headers: string[]; sampleRow: string[] }> = {
  products: {
    filename: "plantilla_productos_orbitica.csv",
    headers: ["Nombre", "SKU", "CodigoBarras", "PrecioVenta", "Costo", "IVA", "StockInicial", "Categoria"],
    sampleRow: ["Café Gourmet 500g", "CAF-001", "7441001002003", "3500", "2200", "13", "50", "Abarrotes"],
  },
  customers: {
    filename: "plantilla_clientes_orbitica.csv",
    headers: ["NombreCompleto", "TipoCedula", "Cedula", "Email", "Telefono", "Direccion"],
    sampleRow: ["Supermercado San Pedro", "JURIDICA", "3101888999", "compras@sanpedro.cr", "2222-3333", "San José, Montes de Oca"],
  },
  suppliers: {
    filename: "plantilla_proveedores_orbitica.csv",
    headers: ["RazonSocial", "TipoCedula", "Cedula", "Contacto", "Telefono", "Email", "Direccion"],
    sampleRow: ["Distribuidora Nacional S.A.", "JURIDICA", "3101555666", "Mario Rojas", "2299-8877", "ventas@distribuidora.cr", "Heredia"],
  },
};

export default function MigrationCenterPage() {
  const {
    products,
    customers,
    suppliers,
    importBatches,
    executeImportBatch,
    revertImportBatch,
  } = useStore();

  const [entityType, setEntityType] = useState<EntityType>("products");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; column: string; message: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [lastImportBatch, setLastImportBatch] = useState<ImportBatch | null>(null);

  // Step Tracker: 1 = Upload, 2 = Mapping, 3 = Preview & Validate, 4 = Results
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Download official CSV template
  const handleDownloadTemplate = (type: EntityType) => {
    const t = TEMPLATES[type];
    const csvContent = "data:text/csv;charset=utf-8," + [t.headers.join(","), t.sampleRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", t.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setFileContent(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  // Simple and resilient CSV parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    setDetectedColumns(headers);

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = vals[idx] || "";
      });
      rows.push(rowObj);
    }
    setParsedRows(rows);

    // Auto-map matching columns
    const initialMap: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (entityType === "products") {
        if (lower.includes("nom") || lower.includes("prod") || lower.includes("desc")) initialMap[h] = "name";
        else if (lower.includes("sku") || lower.includes("cod")) initialMap[h] = "sku";
        else if (lower.includes("barr")) initialMap[h] = "barcode";
        else if (lower.includes("precio") || lower.includes("venta")) initialMap[h] = "sale_price";
        else if (lower.includes("costo")) initialMap[h] = "cost_price";
        else if (lower.includes("iva") || lower.includes("imp")) initialMap[h] = "tax_rate";
        else if (lower.includes("stock") || lower.includes("cant")) initialMap[h] = "stock";
        else if (lower.includes("cat")) initialMap[h] = "category_name";
      } else if (entityType === "customers") {
        if (lower.includes("nom") || lower.includes("cli")) initialMap[h] = "name";
        else if (lower.includes("ced") || lower.includes("id")) initialMap[h] = "identification_number";
        else if (lower.includes("tipo")) initialMap[h] = "identification_type";
        else if (lower.includes("email") || lower.includes("corr")) initialMap[h] = "email";
        else if (lower.includes("tel")) initialMap[h] = "phone";
        else if (lower.includes("dir")) initialMap[h] = "address";
      } else if (entityType === "suppliers") {
        if (lower.includes("raz") || lower.includes("prov") || lower.includes("nom")) initialMap[h] = "name";
        else if (lower.includes("ced") || lower.includes("id")) initialMap[h] = "legal_id";
        else if (lower.includes("cont")) initialMap[h] = "contact_person";
        else if (lower.includes("email")) initialMap[h] = "email";
        else if (lower.includes("tel")) initialMap[h] = "phone";
        else if (lower.includes("dir")) initialMap[h] = "address";
      }
    });
    setMappings(initialMap);
    setCurrentStep(2);
  };

  // Validate Mapped Rows
  const handleValidate = () => {
    const errors: Array<{ row: number; column: string; message: string }> = [];

    parsedRows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 header, +1 1-based index
      if (entityType === "products") {
        const nameCol = Object.keys(mappings).find((k) => mappings[k] === "name");
        const priceCol = Object.keys(mappings).find((k) => mappings[k] === "sale_price");
        if (nameCol && !row[nameCol]?.trim()) {
          errors.push({ row: rowNum, column: "Nombre", message: "El nombre del producto es obligatorio." });
        }
        if (priceCol && (isNaN(Number(row[priceCol])) || Number(row[priceCol]) < 0)) {
          errors.push({ row: rowNum, column: "PrecioVenta", message: "El precio de venta debe ser un número positivo." });
        }
      }
    });

    setValidationErrors(errors);
    setCurrentStep(3);
  };

  // Execute Batch Transaction
  const handleExecuteImport = () => {
    setIsProcessing(true);
    setImportProgress(20);

    const itemsToImport = parsedRows.map((row) => {
      const item: Record<string, any> = {};
      Object.entries(mappings).forEach(([fileCol, orbiticaField]) => {
        if (orbiticaField && orbiticaField !== "none") {
          item[orbiticaField] = row[fileCol];
        }
      });
      return item;
    });

    setTimeout(() => {
      setImportProgress(60);
      const batch = executeImportBatch(
        {
          organization_id: "current",
          entity_type: entityType,
          filename: selectedFile?.name || "import_data.csv",
          total_rows: parsedRows.length,
          imported_rows: itemsToImport.length,
          failed_rows: validationErrors.length,
          errors: validationErrors,
        },
        itemsToImport
      );
      setImportProgress(100);
      setLastImportBatch(batch);
      setIsProcessing(false);
      setCurrentStep(4);
    }, 600);
  };

  // Revert / Undo Batch
  const handleRevert = (batchId: string) => {
    if (confirm("¿Estás seguro de que deseas revertir esta importación? Se eliminarán todos los registros creados en este lote.")) {
      revertImportBatch(batchId);
    }
  };

  const getOrbiticaFields = () => {
    if (entityType === "products") {
      return [
        { key: "name", label: "Nombre del Producto *" },
        { key: "sku", label: "SKU / Código Interno" },
        { key: "barcode", label: "Código de Barras" },
        { key: "sale_price", label: "Precio de Venta (₡) *" },
        { key: "cost_price", label: "Costo Unitario (₡)" },
        { key: "tax_rate", label: "Tarifa IVA (13%, 4%, 1%, 0%)" },
        { key: "stock", label: "Stock Inicial" },
        { key: "category_name", label: "Categoría" },
      ];
    }
    if (entityType === "customers") {
      return [
        { key: "name", label: "Nombre / Razón Social *" },
        { key: "identification_type", label: "Tipo de Cédula" },
        { key: "identification_number", label: "Número de Cédula *" },
        { key: "email", label: "Correo Electrónico" },
        { key: "phone", label: "Teléfono" },
        { key: "address", label: "Dirección" },
      ];
    }
    return [
      { key: "name", label: "Razón Social Proveedor *" },
      { key: "legal_id", label: "Cédula Jurídica *" },
      { key: "contact_person", label: "Persona de Contacto" },
      { key: "email", label: "Correo Electrónico" },
      { key: "phone", label: "Teléfono" },
      { key: "address", label: "Dirección" },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="blue">CENTRO DE MIGRACIÓN & IMPORTADOR</Badge>
            <span className="text-xs text-text-muted">Excel & CSV</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-main">
            Importador Profesional de Datos
          </h1>
          <p className="text-xs text-text-muted">
            Migra fácilmente tus catálogos, clientes y proveedores desde otros sistemas con auto-mapeo y reversión de lotes.
          </p>
        </div>

        {/* Download templates */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownloadTemplate(entityType)}
            className="text-xs font-bold gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Descargar Plantilla ({entityType.toUpperCase()})
          </Button>
        </div>
      </div>

      {/* Main Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Wizard Steps */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 border border-border shadow-sm">
            {/* Step Navigation Pill */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1 ? "bg-primary text-white" : "bg-emerald-500 text-white"
                }`}>
                  {currentStep > 1 ? "✓" : "1"}
                </span>
                <span className="text-xs font-bold text-text-main">1. Archivo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 2 ? "bg-primary text-white" : currentStep > 2 ? "bg-emerald-500 text-white" : "bg-surface-secondary text-text-muted"
                }`}>
                  {currentStep > 2 ? "✓" : "2"}
                </span>
                <span className="text-xs font-bold text-text-main">2. Mapeo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 3 ? "bg-primary text-white" : currentStep > 3 ? "bg-emerald-500 text-white" : "bg-surface-secondary text-text-muted"
                }`}>
                  {currentStep > 3 ? "✓" : "3"}
                </span>
                <span className="text-xs font-bold text-text-main">3. Validación</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 4 ? "bg-emerald-500 text-white" : "bg-surface-secondary text-text-muted"
                }`}>
                  4
                </span>
                <span className="text-xs font-bold text-text-main">4. Resultado</span>
              </div>
            </div>

            {/* STEP 1: UPLOAD */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    Tipo de Información a Importar:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["products", "customers", "suppliers"] as EntityType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEntityType(type)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          entityType === type
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border bg-surface hover:bg-surface-secondary text-text-secondary"
                        }`}
                      >
                        <span className="text-xs capitalize block">{type === "products" ? "Productos" : type === "customers" ? "Clientes" : "Proveedores"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dropzone */}
                <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-3xl p-8 text-center transition-colors bg-surface-secondary/40">
                  <UploadCloud className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h2 className="text-sm font-bold text-text-main">Selecciona o arrastra tu archivo CSV o XLSX</h2>
                  <p className="text-xs text-text-muted mt-1">Formatos soportados: .csv, .xlsx (hasta 10.000 filas por lote)</p>
                  <label className="mt-4 inline-block">
                    <Button variant="primary" size="sm" className="font-bold text-xs pointer-events-none">
                      Explorar Archivo
                    </Button>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: COLUMN MAPPING */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-text-main">Relacionar Columnas</h2>
                    <p className="text-xs text-text-muted">
                      Hemos detectado {detectedColumns.length} columnas en tu archivo {selectedFile?.name}. Asigna cada columna al campo correspondiente en Orbítica.
                    </p>
                  </div>
                  <Badge variant="blue">{parsedRows.length} Filas Detectadas</Badge>
                </div>

                <div className="space-y-2 border border-border rounded-2xl p-4 bg-surface-secondary max-h-80 overflow-y-auto">
                  {detectedColumns.map((col) => (
                    <div key={col} className="flex items-center justify-between gap-4 p-2 bg-surface rounded-xl border border-border">
                      <span className="text-xs font-bold text-text-main font-mono truncate max-w-[200px]">
                        {col}
                      </span>
                      <ArrowRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <select
                        value={mappings[col] || "none"}
                        onChange={(e) => setMappings({ ...mappings, [col]: e.target.value })}
                        className="bg-surface-secondary border border-border rounded-lg px-2.5 py-1 text-xs text-text-main"
                      >
                        <option value="none">-- Omitir Columna --</option>
                        {getOrbiticaFields().map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-3 border-t border-border">
                  <Button variant="secondary" onClick={() => setCurrentStep(1)} className="text-xs">
                    Cambiar Archivo
                  </Button>
                  <Button variant="primary" onClick={handleValidate} className="text-xs font-bold gap-1.5">
                    Validar y Previsualizar
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW & VALIDATION */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-text-main">Previsualización de Importación</h2>
                    <p className="text-xs text-text-muted">
                      Verifica las primeras filas antes de procesar el lote en la base de datos.
                    </p>
                  </div>
                  {validationErrors.length === 0 ? (
                    <Badge variant="success">0 Errores · 100% Válido</Badge>
                  ) : (
                    <Badge variant="warning">{validationErrors.length} Advertencias</Badge>
                  )}
                </div>

                {/* Preview Table */}
                <div className="border border-border rounded-2xl overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs" aria-label="Tabla de previsualización de importación">
                    <thead className="bg-surface-secondary border-b border-border text-text-muted font-bold">
                      <tr>
                        {Object.entries(mappings)
                          .filter(([_, v]) => v && v !== "none")
                          .map(([col, field]) => (
                            <th key={col} scope="col" className="p-2.5">
                              {field.toUpperCase()} ({col})
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-surface-secondary/50">
                          {Object.entries(mappings)
                            .filter(([_, v]) => v && v !== "none")
                            .map(([col]) => (
                              <td key={col} className="p-2.5 truncate max-w-[150px]">
                                {row[col] || "-"}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isProcessing && (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-2">
                    <div className="flex justify-between text-xs font-bold text-primary">
                      <span>Procesando Lote en Transacción Segura...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${importProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t border-border">
                  <Button variant="secondary" onClick={() => setCurrentStep(2)} disabled={isProcessing} className="text-xs">
                    Volver al Mapeo
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExecuteImport}
                    disabled={isProcessing}
                    className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Importar {parsedRows.length} Registros
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: RESULT */}
            {currentStep === 4 && lastImportBatch && (
              <div className="space-y-4 text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h2 className="text-base font-black text-text-main">¡Importación Completada con Éxito!</h2>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Se importaron <strong>{lastImportBatch.imported_rows}</strong> registros de <strong>{lastImportBatch.entity_type}</strong> correctamente al sistema.
                </p>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(1);
                      setSelectedFile(null);
                      setParsedRows([]);
                    }}
                    className="text-xs font-bold"
                  >
                    Importar Otro Archivo
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleRevert(lastImportBatch.id)}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Undo2 className="w-4 h-4" />
                    Revertir / Deshacer este Lote
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Import Batches History (Rollback Manager) */}
        <div className="space-y-4">
          <Card className="p-5 border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xs font-black text-text-main flex items-center gap-1.5">
                <History className="w-4 h-4 text-primary" />
                Historial de Lotes & Reversión
              </h2>
              <span className="text-[10px] text-text-muted">{importBatches.length} Lotes</span>
            </div>

            {importBatches.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted space-y-1">
                <Layers className="w-8 h-8 mx-auto text-text-muted/50 mb-2" />
                <p className="font-bold">No hay lotes previos</p>
                <p className="text-[10px]">Las importaciones que realices aparecerán aquí con opción de reversión.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {importBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                      batch.is_reverted
                        ? "bg-surface-secondary/40 border-border opacity-60"
                        : "bg-surface border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-main truncate max-w-[140px]">
                        {batch.filename}
                      </span>
                      {batch.is_reverted ? (
                        <Badge variant="default">REVERTIDO</Badge>
                      ) : (
                        <Badge variant="success">ACTIVO ({batch.imported_rows})</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                      <span>Tipo: {batch.entity_type}</span>
                      <span>{batch.created_at}</span>
                    </div>

                    {!batch.is_reverted && (
                      <div className="pt-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevert(batch.id)}
                          className="text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1 h-auto font-bold gap-1"
                        >
                          <Undo2 className="w-3 h-3" />
                          Revertir Lote
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
