import React, { useState, useEffect } from "react";
import { useCRM } from "../context/CRMContext";
import {
  Package,
  Search,
  Plus,
  AlertCircle,
  ShoppingBag,
  BadgeAlert,
  Pencil,
  Trash2,
  X,
  Landmark,
  TrendingUp,
  Settings,
} from "lucide-react";
import { SparePartInventoryItem } from "../types";

export const InventoryManager: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    showToast,
    exchangeRate,
    updateExchangeRate,
    categoryMargins,
    updateCategoryMargin,
    addCategory,
    deleteCategory,
    renameCategory,
  } = useCRM();

  const categoryOptions =
    Object.keys(categoryMargins).length > 0
      ? Object.keys(categoryMargins)
      : [
          "Celular",
          "Notebook",
          "Pantalla",
          "Disco SSD",
          "Batería",
          "Memoria RAM",
          "Teclado",
          "Cargador",
          "Conector de carga",
          "Vidrio / Glass",
          "Otro",
        ];

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<SparePartInventoryItem | null>(
    null,
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempExchangeRate, setTempExchangeRate] =
    useState<number>(exchangeRate);

  // Custom Category States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryMargin, setNewCategoryMargin] = useState<number>(35);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(
    null,
  );
  const [editingCategoryNewName, setEditingCategoryNewName] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const filteredCategoryOptions = categoryOptions.filter((cat) =>
    cat.toLowerCase().includes(categorySearchQuery.toLowerCase()),
  );

  // Sync temp exchange rate on global updates
  useEffect(() => {
    setTempExchangeRate(exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        isCategoryDropdownOpen &&
        !target.closest(".category-select-container")
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryDropdownOpen]);

  // Form parameters
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Otro");
  const [iva, setIva] = useState<"Exento" | "10.5%" | "21.0%">("Exento");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [pricingType, setPricingType] = useState<"margin" | "manual">("manual");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [marginPercent, setMarginPercent] = useState<number>(35);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(5);
  const [compat, setCompat] = useState("");

  const resetForm = () => {
    setName("");
    setSku("");
    setCategory("Otro");
    setIva("Exento");
    setCurrency("ARS");
    setPricingType("manual");
    setCostPrice(0);
    setMarginPercent(35);
    setFinalPrice(0);
    setStock(5);
    setCompat("");
    setEditingItem(null);
    setIsAddingItem(false);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (pricingType === "margin") {
      const defaultMargin =
        categoryMargins[cat] !== undefined ? categoryMargins[cat] : 35;
      setMarginPercent(defaultMargin);
      setFinalPrice(
        Math.round(costPrice * (1 + defaultMargin / 100) * 100) / 100,
      );
    }
  };

  const handlePricingTypeChange = (type: "margin" | "manual") => {
    setPricingType(type);
    if (type === "margin") {
      const defaultMargin =
        categoryMargins[category] !== undefined
          ? categoryMargins[category]
          : 35;
      setMarginPercent(defaultMargin);
      setFinalPrice(
        Math.round(costPrice * (1 + defaultMargin / 100) * 100) / 100,
      );
    }
  };

  const handleCostPriceChange = (cost: number) => {
    setCostPrice(cost);
    if (pricingType === "margin") {
      setFinalPrice(Math.round(cost * (1 + marginPercent / 100) * 100) / 100);
    } else {
      if (cost > 0) {
        const calculatedMargin =
          Math.round(((finalPrice - cost) / cost) * 100 * 10) / 10;
        setMarginPercent(calculatedMargin);
      }
    }
  };

  const handleMarginPercentChange = (margin: number) => {
    setMarginPercent(margin);
    if (pricingType === "margin") {
      setFinalPrice(Math.round(costPrice * (1 + margin / 100) * 100) / 100);
    }
  };

  const handleFinalPriceChange = (final: number) => {
    setFinalPrice(final);
    if (pricingType === "manual") {
      if (costPrice > 0) {
        const calculatedMargin =
          Math.round(((final - costPrice) / costPrice) * 100 * 10) / 10;
        setMarginPercent(calculatedMargin);
      } else {
        setMarginPercent(100);
      }
    }
  };

  const handleStartEdit = (item: SparePartInventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setCategory(item.category || "Otro");
    setIva(item.iva || "21.0%");
    setCurrency(item.currency || "ARS");
    setPricingType(item.pricingType || "manual");
    setCostPrice(
      item.costPrice !== undefined
        ? item.costPrice
        : Math.round(item.price * 0.7),
    );
    setMarginPercent(
      item.marginPercent !== undefined ? item.marginPercent : 35,
    );
    setFinalPrice(item.finalPrice !== undefined ? item.finalPrice : item.price);
    setStock(item.stock);
    setCompat(item.compatibleDevices || "");
    setIsAddingItem(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || costPrice < 0 || finalPrice <= 0) {
      showToast(
        "Por favor complete los campos obligatorios del repuesto.",
        "warning",
      );
      return;
    }

    const calculatedPriceInARS = Math.round(
      currency === "USD" ? finalPrice * exchangeRate : finalPrice,
    );

    const itemProps = {
      name,
      sku: sku.toUpperCase(),
      category,
      iva,
      currency,
      pricingType,
      costPrice,
      marginPercent,
      finalPrice,
      price: calculatedPriceInARS, // Sale price in pesos (ARS)
      stock: Number(stock) || 0,
      compatibleDevices: compat,
    };

    if (editingItem) {
      updateInventoryItem(editingItem.id, itemProps);
      showToast("Repuesto actualizado con éxito.", "success");
    } else {
      addInventoryItem(itemProps);
      showToast("Repuesto agregado al inventario con éxito.", "success");
    }

    resetForm();
  };

  const filteredItems = inventory.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.compatibleDevices &&
        p.compatibleDevices.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const getStockStatusTag = (lvl: number) => {
    if (lvl === 0) {
      return {
        text: "Agotado",
        class: "bg-rose-100 text-rose-800 border-rose-200 font-bold",
        icon: <BadgeAlert className="h-3 w-3 mr-1" />,
      };
    }
    if (lvl < 5) {
      return {
        text: "Crítico (Bajo Stock)",
        class: "bg-amber-100 text-amber-800 border-amber-200",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      };
    }
    return {
      text: "Disponible",
      class: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: null,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Depósito de Repuestos
          </h2>
          <p className="text-slate-500 text-sm font-sans">
            Administra componentes electrónicos, pantallas y mallas físicas con
            control de IVA, divisas y márgenes de ganancia.
          </p>
        </div>
        <div className="flex items-center space-x-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowCategorySettings(true)}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition shadow-sm cursor-pointer h-9"
          >
            <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
            <span>Gestionar Categorías</span>
          </button>
          <button
            onClick={() => {
              if (isAddingItem) {
                resetForm();
              } else {
                setIsAddingItem(true);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition shadow-sm cursor-pointer h-9 animate-pulse-subtle"
          >
            <Plus className="h-4 w-4" />
            <span>{isAddingItem ? "Cerrar ventana" : "Nuevo Repuesto"}</span>
          </button>
        </div>
      </div>

      {/* Settings / Configuración collapsible */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="w-full flex items-center justify-between p-4 font-bold text-slate-700 hover:bg-slate-100/50 transition text-xs uppercase tracking-wider cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Package className="h-4.5 w-4.5 text-indigo-500" />
            <span>Configuración de Precios, Márgenes e IVA y Cambio</span>
          </div>
          <span className="text-indigo-600 hover:text-indigo-700 text-xs font-bold">
            {isConfigOpen
              ? "Ocultar ajustes"
              : "Configurar Dólar actual y % por Categoría"}
          </span>
        </button>

        {isConfigOpen && (
          <div className="p-5 border-t border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
            {/* Dollar exchange rate card */}
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3.5">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-emerald-500" />
                <span>💵 Cotización de Dólar</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Define el tipo de cambio oficial de referencia para convertir
                automáticamente costos y de venta en dólares (USD) a pesos
                argentinos (ARS) en la facturación general de órdenes.
              </p>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">
                  Tipo de cambio actual (1 USD = $ ARS)
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={tempExchangeRate}
                      onChange={(e) =>
                        setTempExchangeRate(Number(e.target.value) || 0)
                      }
                      className="w-full text-xs pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateExchangeRate(tempExchangeRate);
                      showToast(
                        `Tipo de cambio fijado en $${tempExchangeRate} ARS`,
                        "success",
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            {/* Category profit percentages config */}
            <div className="md:col-span-2 bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <span>📈 Márgenes de Ganancia (%) por Categoría</span>
                </h4>
                <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  Fórmula automática
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Porcentajes de rentabilidad de margen fijados para asociar un
                recargo automático al costo cuando registras nuevos repuestos de
                dicha categoría.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[170px] overflow-y-auto pr-1">
                {categoryOptions.map((cat) => {
                  const isEditingThis = editingCategoryName === cat;
                  return (
                    <div
                      key={cat}
                      className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start gap-1">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editingCategoryNewName}
                            onChange={(e) =>
                              setEditingCategoryNewName(e.target.value)
                            }
                            className="text-xs px-1.5 py-0.5 border border-indigo-300 rounded font-bold text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-[10px] font-bold text-slate-700 uppercase block truncate max-w-[110px]"
                            title={cat}
                          >
                            {cat}
                          </span>
                        )}

                        <div className="flex items-center space-x-1 shrink-0">
                          {isEditingThis ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmedName =
                                    editingCategoryNewName.trim();
                                  if (!trimmedName) {
                                    showToast(
                                      "El nombre no puede estar vacío",
                                      "warning",
                                    );
                                    return;
                                  }
                                  if (
                                    trimmedName !== cat &&
                                    categoryMargins[trimmedName]
                                  ) {
                                    showToast(
                                      "Ya existe una categoría con ese nombre",
                                      "warning",
                                    );
                                    return;
                                  }
                                  renameCategory(
                                    cat,
                                    trimmedName,
                                    categoryMargins[cat],
                                  );
                                  showToast(
                                    `Categoría renombrada a "${trimmedName}"`,
                                    "success",
                                  );
                                  setEditingCategoryName(null);
                                }}
                                className="text-emerald-650 hover:text-emerald-700 font-bold px-0.5 rounded text-[10px] cursor-pointer"
                                title="Guardar nombre"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryName(null)}
                                className="text-rose-500 hover:text-rose-600 font-bold px-0.5 rounded text-[10px] cursor-pointer"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryName(cat);
                                  setEditingCategoryNewName(cat);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                                title="Editar nombre"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              {cat !== "Otro" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `¿Estás seguro de que deseas eliminar la categoría "${cat}"?`,
                                      )
                                    ) {
                                      deleteCategory(cat);
                                      showToast(
                                        `Categoría "${cat}" eliminada`,
                                        "info",
                                      );
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                  title="Eliminar categoría"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          value={
                            categoryMargins[cat] !== undefined
                              ? categoryMargins[cat]
                              : 35
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateCategoryMargin(cat, val);
                          }}
                          className="w-full text-xs pr-6 pl-2 py-1 bg-slate-50/60 font-black text-slate-700 border border-slate-200 rounded focus:bg-white focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add category form */}
              <div className="border-t border-slate-200/60 pt-3.5 mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 flex items-center gap-1">
                  <Plus className="h-3 w-3 text-indigo-500" />
                  <span>Agregar Nueva Categoría / Tipo</span>
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Pin de Carga)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <div className="relative w-28">
                      <input
                        type="number"
                        placeholder="Ganancia %"
                        value={newCategoryMargin || ""}
                        onChange={(e) =>
                          setNewCategoryMargin(Number(e.target.value) || 0)
                        }
                        className="w-full text-xs pr-6 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-750 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        %
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCategoryName.trim();
                        if (!trimmed) {
                          showToast(
                            "Ingresa un nombre para la categoría.",
                            "warning",
                          );
                          return;
                        }
                        if (categoryMargins[trimmed]) {
                          showToast("Esta categoría ya existe.", "warning");
                          return;
                        }
                        addCategory(trimmed, newCategoryMargin || 35);
                        showToast(
                          `Categoría "${trimmed}" agregada con éxito.`,
                          "success",
                        );
                        setNewCategoryName("");
                        setNewCategoryMargin(35);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Settings Sub-Overlay Modal */}
      {showCategorySettings && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in"
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Gestionar Categorías y Margen de Ganancia
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategorySettings(false);
                  setCategorySearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              Porcentajes de rentabilidad de margen fijados para asociar un
              recargo automático al costo cuando registras nuevos repuestos de
              dicha categoría. Puedes añadir nuevas, cambiar nombres o
              borrarlas.
            </p>

            {/* Buscador de Categorías */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="Buscar tipo o categoría..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-semibold"
              />
              {categorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCategorySearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold p-1 transition cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {filteredCategoryOptions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <span className="text-xs text-slate-400 font-bold">
                  No se encontraron resultados para "{categorySearchQuery}"
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[245px] overflow-y-auto pr-1">
                {filteredCategoryOptions.map((cat) => {
                  const isEditingThis = editingCategoryName === cat;
                  return (
                    <div
                      key={cat}
                      className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start gap-1 font-bold text-xs">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editingCategoryNewName}
                            onChange={(e) =>
                              setEditingCategoryNewName(e.target.value)
                            }
                            className="text-xs px-1.5 py-0.5 border border-indigo-300 bg-white rounded font-bold text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-[10px] font-bold text-slate-700 uppercase block truncate max-w-[170px]"
                            title={cat}
                          >
                            {cat}
                          </span>
                        )}

                        <div className="flex items-center space-x-1 shrink-0">
                          {isEditingThis ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmedName =
                                    editingCategoryNewName.trim();
                                  if (!trimmedName) {
                                    showToast(
                                      "El nombre no puede estar vacío",
                                      "warning",
                                    );
                                    return;
                                  }
                                  if (
                                    trimmedName !== cat &&
                                    categoryMargins[trimmedName]
                                  ) {
                                    showToast(
                                      "Ya existe una categoría con ese nombre",
                                      "warning",
                                    );
                                    return;
                                  }
                                  renameCategory(
                                    cat,
                                    trimmedName,
                                    categoryMargins[cat],
                                  );
                                  showToast(
                                    `Categoría renombrada a "${trimmedName}"`,
                                    "success",
                                  );
                                  setEditingCategoryName(null);
                                }}
                                className="text-emerald-650 hover:text-emerald-700 font-bold px-1 rounded text-[11px] cursor-pointer"
                                title="Guardar nombre"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryName(null)}
                                className="text-rose-500 hover:text-rose-600 font-bold px-1 rounded text-[11px] cursor-pointer"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryName(cat);
                                  setEditingCategoryNewName(cat);
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                                title="Editar nombre"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              {cat !== "Otro" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `¿Estás seguro de que deseas eliminar la categoría "${cat}"?`,
                                      )
                                    ) {
                                      deleteCategory(cat);
                                      showToast(
                                        `Categoría "${cat}" eliminada`,
                                        "info",
                                      );
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                  title="Eliminar categoría"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          value={
                            categoryMargins[cat] !== undefined
                              ? categoryMargins[cat]
                              : 35
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            updateCategoryMargin(cat, val);
                          }}
                          className="w-full text-xs pr-6 pl-2 py-1 bg-white font-black text-slate-700 border border-slate-200 rounded focus:outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add category form */}
            <div className="border-t border-slate-100 pt-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-indigo-500" />
                <span>Agregar Nueva Categoría / Tipo</span>
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nombre (ej. Pin de Carga)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-semibold"
                />
                <div className="flex gap-2">
                  <div className="relative w-28">
                    <input
                      type="number"
                      placeholder="Ganancia %"
                      value={newCategoryMargin || ""}
                      onChange={(e) =>
                        setNewCategoryMargin(Number(e.target.value) || 0)
                      }
                      className="w-full text-xs pr-6 pl-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-750 focus:outline-none focus:bg-white"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCategoryName.trim();
                      if (!trimmed) {
                        showToast(
                          "Ingresa un nombre para la categoría.",
                          "warning",
                        );
                        return;
                      }
                      if (categoryMargins[trimmed]) {
                        showToast("Esta categoría ya existe.", "warning");
                        return;
                      }
                      addCategory(trimmed, newCategoryMargin || 35);
                      showToast(
                        `Categoría "${trimmed}" agregada con éxito.`,
                        "success",
                      );
                      setNewCategoryName("");
                      setNewCategoryMargin(35);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCategorySettings(false);
                  setCategorySearchQuery("");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded-lg transition cursor-pointer"
              >
                Listo, Terminar
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingItem && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up max-w-3xl w-full max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:col-span-4 pb-1 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-indigo-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-4.5 w-4.5" />
                <span>
                  {editingItem
                    ? `Editar Ficha de Repuesto: ${editingItem.name}`
                    : "Registrar Nuevo Repuesto / Componente"}
                </span>
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-1 relative category-select-container">
              <label className="text-xs font-bold text-slate-900 block">
                Tipo/Categoría *
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="w-full text-left text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:bg-white focus:outline-none flex justify-between items-center cursor-pointer shadow-3xs hover:bg-slate-100/50 transition h-[38px] group"
              >
                <span>{category}</span>
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="relative group/tooltip flex items-center justify-center">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCategorySettings(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer flex items-center justify-center"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </span>
                    {/* Instantly visible styled tooltip without delay */}
                    <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 bg-slate-900/95 text-white font-bold text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl z-50 whitespace-nowrap leading-none tracking-normal">
                      Gestionar Categorías
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95 w-0 h-0"></div>
                    </div>
                  </div>
                  <span
                    className="text-slate-400 text-[10px] transition-transform duration-200"
                    style={{
                      transform: isCategoryDropdownOpen
                        ? "rotate(180deg)"
                        : "rotate(0)",
                    }}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-[100%] mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 font-bold text-xs text-slate-700 divide-y divide-slate-50/50">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        handleCategoryChange(cat);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 transition hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer flex items-center justify-between ${
                        category === cat
                          ? "bg-indigo-50/50 text-indigo-600 font-extrabold"
                          : ""
                      }`}
                    >
                      <span>{cat}</span>
                      {category === cat && (
                        <span className="text-indigo-600 text-[9px]">●</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-900 block">
                Nombre del Repuesto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Pantalla OLED iPhone 13 Pro Max"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                Código SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej. REP-SCR-IPH13PM"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase text-slate-805 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                Moneda de Cálculo
              </label>
              <div className="grid grid-cols-2 gap-1.5 h-[38px]">
                <button
                  type="button"
                  onClick={() => setCurrency("ARS")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center ${
                    currency === "ARS"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Pesos ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center ${
                    currency === "USD"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Dólares (U$D)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                IVA aplicable
              </label>
              <select
                value={iva}
                onChange={(e) => setIva(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:bg-white focus:outline-none"
              >
                <option value="Exento">Exento (0%)</option>
                <option value="10.5%">IVA 10.5%</option>
                <option value="21.0%">IVA 21.0%</option>
              </select>
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-900 block">
                Fijación de Ganancia
              </label>
              <div className="grid grid-cols-2 gap-1.5 h-[38px]">
                <button
                  type="button"
                  onClick={() => handlePricingTypeChange("margin")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center truncate ${
                    pricingType === "margin"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  % Margen fijo
                </button>
                <button
                  type="button"
                  onClick={() => handlePricingTypeChange("manual")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center ${
                    pricingType === "manual"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Manual (Costo + Venta)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                Precio de Costo ({currency === "USD" ? "U$D" : "$"}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice || ""}
                onChange={(e) =>
                  handleCostPriceChange(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            {pricingType === "margin" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">
                  Ganancia Margen (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={marginPercent}
                    onChange={(e) =>
                      handleMarginPercentChange(parseFloat(e.target.value) || 0)
                    }
                    className="w-full text-xs p-2.5 pr-6 border rounded-lg font-black text-slate-800 focus:bg-white focus:outline-none bg-slate-50 border-slate-200"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>
            )}

            <div
              className={`space-y-1 ${pricingType === "manual" ? "md:col-span-2" : "col-span-1"}`}
            >
              <label className="text-xs font-bold text-slate-900 block">
                Precio Final Venta ({currency === "USD" ? "U$D" : "$"}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                disabled={pricingType === "margin"}
                value={finalPrice || ""}
                onChange={(e) =>
                  handleFinalPriceChange(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className={`w-full text-xs p-2.5 border rounded-lg font-black placeholder-slate-400 focus:outline-none transition ${
                  pricingType === "margin"
                    ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-white focus:ring-2 focus:ring-slate-100 focus:border-slate-300 border-slate-200 text-slate-800"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                Stock Disponible
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1 col-span-1 md:col-span-4">
              <label className="text-xs font-semibold text-slate-500 block">
                Modelos de Equipos Compatibles
              </label>
              <input
                type="text"
                value={compat}
                onChange={(e) => setCompat(e.target.value)}
                placeholder="Ej. iPhone 13 Pro Max, iPhone 13 Pro (128GB, 256GB, 512GB)..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
              />
            </div>

            {/* Dynamic preview block */}
            <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-[11px] text-slate-600 font-semibold shadow-xs">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide block">
                Resumen de Márgenes y Ganancia
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div className="border-r border-slate-200/50 pr-2">
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Costo
                  </span>
                  <span className="text-slate-800 font-black text-xs">
                    {currency === "USD" ? "U$D " : "$ "}
                    {costPrice.toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="border-r border-slate-200/50 pr-2">
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Precio Venta
                  </span>
                  <span className="text-indigo-600 font-black text-xs">
                    {currency === "USD" ? "U$D " : "$ "}
                    {finalPrice.toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="border-r border-slate-200/50 pr-2">
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Rentabilidad Neta
                  </span>
                  <span className="text-emerald-600 font-black text-xs block">
                    {currency === "USD" ? "U$D " : "$ "}
                    {(finalPrice - costPrice).toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({marginPercent}% de margen)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Ref. en Pesos (ARS)
                  </span>
                  <span className="text-amber-600 font-black text-sm block">
                    $
                    {(currency === "USD"
                      ? finalPrice * exchangeRate
                      : finalPrice
                    ).toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}{" "}
                    ARS
                  </span>
                  {currency === "USD" && (
                    <span className="text-[9px] text-slate-400 font-normal block">
                      Cotización USD: ${exchangeRate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer shadow-xs"
              >
                {editingItem ? "Actualizar Repuesto" : "Registrar en Depósito"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar repuestos por nombre, SKU, tipo, compatibilidad técnica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800 font-semibold ${searchQuery ? "pr-10" : "pr-4"}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 font-semibold">SKU / Componente</th>
              <th className="py-3.5 px-4 font-semibold">Compatibilidades</th>
              <th className="py-3.5 px-4 font-semibold">Costo Compra</th>
              <th className="py-3.5 px-4 font-semibold">Venta Final</th>
              <th className="py-3.5 px-4 font-semibold">Ganancia / Margen</th>
              <th className="py-3.5 px-4 font-semibold">Stock Físico</th>
              <th className="py-3.5 px-4 font-semibold">Estado</th>
              <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-slate-400 font-medium"
                >
                  No hay repuestos registrados bajo esta búsqueda.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const stockStatus = getStockStatusTag(item.stock);
                const currencySymbol = item.currency === "USD" ? "U$D " : "$ ";

                // Backup values for older seed items if missing
                const categoryLabel = item.category || "Otro";
                const ivaRate = item.iva || "21.0%";
                const nativeCost =
                  item.costPrice !== undefined
                    ? item.costPrice
                    : Math.round(item.price * 0.7);
                const nativeFinal =
                  item.finalPrice !== undefined ? item.finalPrice : item.price;
                const marginPercentValue =
                  item.marginPercent !== undefined ? item.marginPercent : 35;
                const profitAmount = nativeFinal - nativeCost;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800 text-xs leading-none">
                        {item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                          SKU: {item.sku}
                        </span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold capitalize">
                          {categoryLabel}
                        </span>
                        <span className="text-[9px] bg-slate-55/60 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-100">
                          IVA: {ivaRate}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium italic">
                      {item.compatibleDevices || "Ficha universal"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-700 text-xs">
                        {currencySymbol}
                        {nativeCost.toLocaleString("es-AR", {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Original
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-indigo-600 text-xs">
                        {currencySymbol}
                        {nativeFinal.toLocaleString("es-AR", {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                      {item.currency === "USD" ? (
                        <span
                          className="text-[10px] text-amber-600 font-bold block"
                          title="Convertido a Pesos Argentinos"
                        >
                          ≈ $
                          {item.price.toLocaleString("es-AR", {
                            minimumFractionDigits: 0,
                          })}{" "}
                          ARS
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal block">
                          ARS
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-emerald-600 text-xs">
                        {currencySymbol}
                        {profitAmount.toLocaleString("es-AR", {
                          minimumFractionDigits: 0,
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({marginPercentValue}% Ganancia)
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newStock = Math.max(0, item.stock - 1);
                            updateInventoryItem(item.id, { stock: newStock });
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.stock}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            updateInventoryItem(item.id, { stock: val });
                          }}
                          className="w-12 text-center text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            updateInventoryItem(item.id, { stock: item.stock + 1 });
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 font-bold text-xs transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${stockStatus.class}`}
                      >
                        {stockStatus.icon}
                        <span>{stockStatus.text}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition cursor-pointer inline-flex items-center"
                          title="Editar repuesto"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que deseas eliminar el repuesto "${item.name}"?`)) {
                              deleteInventoryItem(item.id);
                              showToast(`Repuesto eliminado con éxito`, 'info');
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition cursor-pointer inline-flex items-center"
                          title="Eliminar repuesto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
