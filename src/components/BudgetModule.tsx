import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Budget, BudgetItem, BudgetStatus, OrderPriority, SparePartInventoryItem } from '../types';
import { CustomSelect } from './CustomSelect';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Eye, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Printer, 
  ArrowRight, 
  TrendingUp, 
  Calendar, 
  User, 
  Cpu, 
  Tag, 
  DollarSign, 
  Package, 
  Check, 
  Briefcase,
  X,
  FileCheck2,
  Wrench
} from 'lucide-react';

export const BudgetModule: React.FC = () => {
  const { 
    budgets, 
    clients, 
    inventory, 
    technicians, 
    addBudget, 
    updateBudgetStatus, 
    updateBudgetDetails, 
    deleteBudget, 
    convertBudgetToOrder,
    workshopName,
    workshopLogo,
    showToast,
    orders,
    addInventoryItem,
    exchangeRate,
    categoryMargins,
    ticketSub
  } = useCRM();

  const { user } = useAuth();

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | BudgetStatus>('Todos');

  // Edit / Created modals/views state
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal to convert budget to service ticket
  const [convertingBudget, setConvertingBudget] = useState<Budget | null>(null);
  const [assignedTech, setAssignedTech] = useState('');
  const [orderPriority, setOrderPriority] = useState<OrderPriority>('Media');

  // Active print preview state
  const [printingBudget, setPrintingBudget] = useState<Budget | null>(null);

  // Form State
  const [formType, setFormType] = useState<'servicio' | 'simple'>('servicio');
  const [formClientName, setFormClientName] = useState('');
  const [formClientId, setFormClientId] = useState<string | undefined>(undefined);
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formDeviceType, setFormDeviceType] = useState('Notebook');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formValidDays, setFormValidDays] = useState('15');
  const [formItems, setFormItems] = useState<Omit<BudgetItem, 'id'>[]>([]);

  // Predictive Client search state
  const [clientQuery, setClientQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Predictive Order search state for service budgets
  const [formOrderId, setFormOrderId] = useState<string | undefined>(undefined);
  const [orderQuery, setOrderQuery] = useState('');
  const [showOrderSuggestions, setShowOrderSuggestions] = useState(false);
  const [isManualService, setIsManualService] = useState(false);

  // Order suggestions list
  const suggestedOrders = useMemo(() => {
    if (!orderQuery.trim()) return [];
    return orders.filter(o => 
      o.id.toLowerCase().includes(orderQuery.toLowerCase()) || 
      o.clientName.toLowerCase().includes(orderQuery.toLowerCase()) ||
      o.brand.toLowerCase().includes(orderQuery.toLowerCase()) ||
      o.model.toLowerCase().includes(orderQuery.toLowerCase())
    ).slice(0, 5);
  }, [orders, orderQuery]);

  // Predictive Inventory search state for item form
  const [activeItemIndexForPartSearch, setActiveItemIndexForPartSearch] = useState<number | null>(null);
  const [partQuery, setPartQuery] = useState('');
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);

  // New inline part creation modal states
  const [showNewPartModal, setShowNewPartModal] = useState(false);
  const [newPartModalIndex, setNewPartModalIndex] = useState<number | null>(null);
  const [newPartName, setNewPartName] = useState('');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartCategory, setNewPartCategory] = useState('Otro');
  const [newPartIva, setNewPartIva] = useState<'Exento' | '10.5%' | '21.0%'>('Exento');
  const [newPartCurrency, setNewPartCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [newPartPricingType, setNewPartPricingType] = useState<'margin' | 'manual'>('manual');
  const [newPartCostPrice, setNewPartCostPrice] = useState<number>(0);
  const [newPartMarginPercent, setNewPartMarginPercent] = useState<number>(35);
  const [newPartFinalPrice, setNewPartFinalPrice] = useState<number>(0);
  const [newPartStock, setNewPartStock] = useState<number>(5);
  const [newPartCompatible, setNewPartCompatible] = useState('');
  const [isNewPartCategoryDropdownOpen, setIsNewPartCategoryDropdownOpen] = useState(false);

  const categoryOptions = useMemo(() => {
    return Object.keys(categoryMargins).length > 0
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
  }, [categoryMargins]);

  // Statistics
  const stats = useMemo(() => {
    const total = budgets.length;
    const pending = budgets.filter(b => b.status === 'Borrador' || b.status === 'Enviado').length;
    const approved = budgets.filter(b => b.status === 'Aprobado').length;
    const approvedValue = budgets.filter(b => b.status === 'Aprobado').reduce((sum, b) => sum + b.totalCost, 0);
    const convertedValue = budgets.filter(b => b.status === 'Aprobado' && b.convertedToOrderId).reduce((sum, b) => sum + b.totalCost, 0);

    return {
      total,
      pending,
      approved,
      approvedValue,
      convertedValue
    };
  }, [budgets]);

  // Client suggestions autocomplete list
  const suggestedClients = useMemo(() => {
    if (!clientQuery.trim()) return [];
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientQuery.toLowerCase()) || 
      (c.phone && c.phone.includes(clientQuery))
    ).slice(0, 5);
  }, [clientQuery, clients]);

  // Part suggestions autocomplete list
  const suggestedParts = useMemo(() => {
    if (!partQuery.trim()) return inventory.slice(0, 8);
    return inventory.filter(p =>
      p.name.toLowerCase().includes(partQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(partQuery.toLowerCase())
    ).slice(0, 8);
  }, [partQuery, inventory]);

  const handleSelectSuggestedClient = (client: typeof clients[0]) => {
    setFormClientName(client.name);
    setFormClientId(client.id);
    setFormClientPhone(client.phone || '');
    setClientQuery('');
    setShowClientSuggestions(false);
  };

  const handleSelectSuggestedPart = (part: SparePartInventoryItem, index: number) => {
    const updated = [...formItems];
    updated[index] = {
      name: part.name,
      type: 'repuesto',
      price: part.finalPrice || part.price || 0,
      quantity: 1
    };
    setFormItems(updated);
    setPartQuery('');
    setShowPartSuggestions(false);
    setActiveItemIndexForPartSearch(null);
  };

  const handleSelectSuggestedOrder = (order: typeof orders[0]) => {
    setFormOrderId(order.id);
    setOrderQuery(`[${order.id}] ${order.clientName}`);
    setFormClientId(order.clientId);
    setFormClientName(order.clientName);
    setFormClientPhone(order.clientPhone || '');
    setFormDeviceType(order.deviceType);
    setFormBrand(order.brand);
    setFormModel(order.model);
    setFormSerialNumber(order.serialNumber);
    setShowOrderSuggestions(false);
  };

  const handleOpenNewPartModal = (index: number, nameQuery: string) => {
    setNewPartModalIndex(index);
    setNewPartName(nameQuery);
    setNewPartSku(`REP-${Date.now().toString().slice(-6)}`);
    setNewPartCategory('Otro');
    setNewPartIva('Exento');
    setNewPartCurrency('ARS');
    setNewPartPricingType('manual');
    setNewPartCostPrice(0);
    setNewPartMarginPercent(35);
    setNewPartFinalPrice(0);
    setNewPartStock(5);
    setNewPartCompatible('');
    setIsNewPartCategoryDropdownOpen(false);
    setShowNewPartModal(true);
    setShowPartSuggestions(false);
  };

  const handleNewPartCategoryChange = (cat: string) => {
    setNewPartCategory(cat);
    if (newPartPricingType === 'margin') {
      const defaultMargin = categoryMargins[cat] !== undefined ? categoryMargins[cat] : 35;
      setNewPartMarginPercent(defaultMargin);
      setNewPartFinalPrice(
        Math.round(newPartCostPrice * (1 + defaultMargin / 100) * 100) / 100
      );
    }
  };

  const handleNewPartPricingTypeChange = (type: 'margin' | 'manual') => {
    setNewPartPricingType(type);
    if (type === 'margin') {
      const defaultMargin = categoryMargins[newPartCategory] !== undefined ? categoryMargins[newPartCategory] : 35;
      setNewPartMarginPercent(defaultMargin);
      setNewPartFinalPrice(
        Math.round(newPartCostPrice * (1 + defaultMargin / 100) * 100) / 100
      );
    }
  };

  const handleNewPartCostPriceChange = (cost: number) => {
    setNewPartCostPrice(cost);
    if (newPartPricingType === 'margin') {
      setNewPartFinalPrice(Math.round(cost * (1 + newPartMarginPercent / 100) * 100) / 100);
    } else {
      if (cost > 0) {
        const calculatedMargin = Math.round(((newPartFinalPrice - cost) / cost) * 100 * 10) / 10;
        setNewPartMarginPercent(calculatedMargin);
      }
    }
  };

  const handleNewPartMarginPercentChange = (margin: number) => {
    setNewPartMarginPercent(margin);
    if (newPartPricingType === 'margin') {
      setNewPartFinalPrice(Math.round(newPartCostPrice * (1 + margin / 100) * 100) / 100);
    }
  };

  const handleNewPartFinalPriceChange = (final: number) => {
    setNewPartFinalPrice(final);
    if (newPartPricingType === 'manual') {
      if (newPartCostPrice > 0) {
        const calculatedMargin = Math.round(((final - newPartCostPrice) / newPartCostPrice) * 100 * 10) / 10;
        setNewPartMarginPercent(calculatedMargin);
      } else {
        setNewPartMarginPercent(100);
      }
    }
  };

  const handleSaveNewPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim() || newPartCostPrice < 0 || newPartFinalPrice <= 0) {
      showToast('Por favor complete los campos obligatorios del repuesto.', 'warning');
      return;
    }

    const calculatedPriceInARS = Math.round(
      newPartCurrency === 'USD' ? newPartFinalPrice * exchangeRate : newPartFinalPrice
    );

    addInventoryItem({
      name: newPartName,
      sku: newPartSku.toUpperCase() || `REP-${Date.now().toString().slice(-6)}`,
      category: newPartCategory,
      iva: newPartIva,
      currency: newPartCurrency,
      pricingType: newPartPricingType,
      costPrice: Number(newPartCostPrice),
      marginPercent: Number(newPartMarginPercent),
      finalPrice: Number(newPartFinalPrice),
      price: calculatedPriceInARS, // Sale price in pesos (ARS)
      stock: Number(newPartStock) || 0,
      compatibleDevices: newPartCompatible
    });

    showToast('Repuesto creado e ingresado al inventario con éxito', 'success');

    // Automatically assign to triggering items index as ARS pesos
    if (newPartModalIndex !== null) {
      const updated = [...formItems];
      updated[newPartModalIndex] = {
        name: newPartName,
        type: 'repuesto',
        price: calculatedPriceInARS,
        quantity: 1
      };
      setFormItems(updated);
    }

    setShowNewPartModal(false);
    setNewPartModalIndex(null);
  };

  // Filtered Budgets List
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const matchesStatus = statusFilter === 'Todos' || b.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesStatus;

      const matchesId = b.id.toLowerCase().includes(term);
      const matchesClient = b.clientName.toLowerCase().includes(term);
      const matchesDevice = (b.brand || '').toLowerCase().includes(term) || 
                            (b.model || '').toLowerCase().includes(term);
      
      return matchesStatus && (matchesId || matchesClient || matchesDevice);
    });
  }, [budgets, statusFilter, searchTerm]);

  // Initialize Form for creating
  const openCreateForm = () => {
    setFormType('servicio');
    setFormClientName('');
    setFormClientId(undefined);
    setFormClientPhone('');
    setFormDeviceType('Notebook');
    setFormBrand('');
    setFormModel('');
    setFormSerialNumber('');
    setFormNotes('');
    setFormValidDays('15');
    setFormItems([
      { name: 'Mano de Obra Diagnóstico y Diagnóstico Inicial', type: 'mano_obra', price: 15000, quantity: 1 }
    ]);
    setClientQuery('');
    setPartQuery('');
    setFormOrderId(undefined);
    setOrderQuery('');
    setIsManualService(false);
    setIsEditing(false);
    setIsCreating(true);
  };

  // Initialize Form for editing
  const openEditForm = (budget: Budget) => {
    setFormType(budget.type || 'servicio');
    setFormClientName(budget.clientName);
    setFormClientId(budget.clientId);
    setFormClientPhone(budget.clientPhone || '');
    setFormDeviceType(budget.deviceType || 'Notebook');
    setFormBrand(budget.brand || '');
    setFormModel(budget.model || '');
    setFormSerialNumber(budget.serialNumber || '');
    setFormNotes(budget.notes || '');
    setFormOrderId(budget.orderId);
    setOrderQuery(budget.orderId || '');
    setIsManualService(budget.type === 'servicio' && !budget.orderId);
    
    // Calculate validity days from validUntil date if possible
    if (budget.validUntil) {
      const diffTime = Math.abs(new Date(budget.validUntil).getTime() - new Date(budget.createdAt).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormValidDays(String(diffDays));
    } else {
      setFormValidDays('15');
    }

    setFormItems(budget.items.map(item => ({
      name: item.name,
      type: item.type,
      price: item.price,
      quantity: item.quantity
    })));

    setClientQuery('');
    setPartQuery('');
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleAddItemLine = () => {
    setFormItems(prev => [...prev, { name: '', type: 'repuesto', price: 0, quantity: 1 }]);
  };

  const handleRemoveItemLine = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemLineChange = (index: number, field: string, value: any) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'type' && value !== item.type) {
          return { ...item, [field]: value, name: '' };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) {
      showToast('Por favor, ingrese el nombre del cliente', 'error');
      return;
    }

    if (formItems.some(i => !i.name.trim() || i.price <= 0)) {
      showToast('Por favor, complete todos los ítems con descripción y precio válido', 'error');
      return;
    }

    // Prepare date limit
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + parseInt(formValidDays || '15'));

    const parsedItems = formItems.map((item, idx) => ({
      id: `it-${Date.now()}-${idx}`,
      name: item.name,
      type: item.type,
      price: Number(item.price),
      quantity: Number(item.quantity)
    }));

    const budgetData = {
      clientId: formClientId,
      clientName: formClientName,
      clientPhone: formClientPhone,
      deviceType: formType === 'simple' ? undefined : formDeviceType,
      brand: formType === 'simple' ? undefined : formBrand,
      model: formType === 'simple' ? undefined : formModel,
      serialNumber: formType === 'simple' ? undefined : formSerialNumber,
      items: parsedItems,
      status: (isEditing && viewingBudget ? viewingBudget.status : 'Borrador') as BudgetStatus,
      notes: formNotes,
      validUntil: validUntilDate.toISOString(),
      type: formType,
      orderId: formType === 'simple' ? undefined : formOrderId
    };

    if (isEditing && viewingBudget) {
      updateBudgetDetails(viewingBudget.id, budgetData);
      // Refresh current viewing budget
      const updatedBudget = {
        ...viewingBudget,
        ...budgetData,
        totalCost: parsedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      };
      setViewingBudget(updatedBudget);
      setIsEditing(false);
    } else {
      const budget = addBudget(budgetData);
      setViewingBudget(budget);
      setIsCreating(false);
    }
  };

  const handleConvertClick = (budget: Budget) => {
    setConvertingBudget(budget);
    // Suggest first technician if available
    setAssignedTech(technicians[0]?.name || activeUserLabel());
    setOrderPriority('Media');
  };

  const handleConvertConfirm = () => {
    if (!convertingBudget) return;
    const ticketId = convertBudgetToOrder(convertingBudget.id, assignedTech, orderPriority);
    if (ticketId) {
      // Refresh list & status
      setConvertingBudget(null);
      // Retrieve the newly updated budget with conversion status
      const updated = budgets.find(b => b.id === convertingBudget.id);
      if (updated) {
        setViewingBudget({ ...updated, status: 'Aprobado', convertedToOrderId: ticketId });
      } else {
        setViewingBudget(null);
      }
    }
  };

  const activeUserLabel = () => {
    if (user) return user.name;
    return 'Administrador';
  };

  const getStatusColor = (status: BudgetStatus) => {
    switch (status) {
      case 'Borrador':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      case 'Enviado':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Aprobado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rechazado':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="budgets-module-root" className="space-y-6">
      
      {/* Module Title & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">Presupuestos</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Gestión, cotización y conversión directa de presupuestos en órdenes de servicio.</p>
        </div>
        <button 
          id="btn-new-budget"
          type="button"
          onClick={openCreateForm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95 shrink-0 self-start md:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Crear Presupuesto</span>
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Emitidos</span>
            <span className="text-xl font-extrabold text-slate-800 block font-mono">{stats.total}</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pendientes/Enviados</span>
            <span className="text-xl font-extrabold text-slate-800 block font-mono">{stats.pending}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Send className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Aprobados</span>
            <span className="text-xl font-extrabold text-slate-800 block font-mono">{stats.approved}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Monto Aprobado</span>
            <span className="text-xl font-extrabold text-slate-800 block font-mono">
              ${stats.approvedValue.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      {!isCreating && !isEditing && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-1 w-full md:w-auto">
              {(['Todos', 'Borrador', 'Enviado', 'Aprobado', 'Rechazado'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition select-none ${
                    statusFilter === st 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar por ID, cliente, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider select-none">
                  <th className="px-6 py-3.5">Presupuesto</th>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">Dispositivo</th>
                  <th className="px-6 py-3.5">Fecha Emisión</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Monto Total</th>
                  <th className="px-6 py-3.5 text-center">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBudgets.length > 0 ? (
                  filteredBudgets.map((b) => (
                    <tr 
                      key={b.id}
                      className="hover:bg-slate-50/75 transition cursor-pointer font-semibold"
                      onClick={() => setViewingBudget(b)}
                    >
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded font-mono font-bold text-[11px]">
                          {b.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs">{b.clientName}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{b.clientPhone || 'Sin teléfono'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {b.type === 'simple' ? (
                            <>
                              <span className="text-indigo-650 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-1 select-none">
                                <Briefcase className="h-3 w-3" />
                                <span>Simple / Venta</span>
                              </span>
                              <span className="text-slate-800 text-xs font-bold leading-normal">
                                {b.brand || 'Venta directa'}
                              </span>
                              {b.model && (
                                <span className="text-[10px] text-slate-500 font-medium leading-none mt-1">
                                  {b.model}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-slate-800 text-xs font-bold">
                                {b.deviceType || 'Equipo'}: {b.brand} {b.model}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium font-mono">
                                S/N: {b.serialNumber || 'Sin número de serie'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {b.items.length} {b.items.length === 1 ? 'ítem' : 'ítems'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-extrabold text-slate-900 text-xs">
                        ${b.totalCost.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setViewingBudget(b)}
                            className="p-1 px-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded transition font-bold flex items-center space-x-1"
                            title="Ver detalles"
                          >
                            <Eye className="h-4.5 w-4.5 text-slate-400 hover:text-indigo-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(b)}
                            className="p-1 px-1.5 hover:bg-amber-50 hover:text-amber-600 rounded transition font-bold flex items-center space-x-1"
                            title="Editar"
                            disabled={b.status === 'Aprobado'}
                          >
                            <Edit2 className={`h-4.5 w-4.5 ${b.status === 'Aprobado' ? 'text-slate-300' : 'text-slate-400 hover:text-amber-600'}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Está seguro de que desea eliminar el presupuesto ${b.id}?`)) {
                                deleteBudget(b.id);
                              }
                            }}
                            className="p-1 px-1.5 hover:bg-rose-50 hover:text-rose-600 rounded transition font-bold"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4.5 w-4.5 text-slate-400 hover:text-rose-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
                      No se encontraron presupuestos que coincidan con los filtros activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FORM PANEL */}
      {(isCreating || isEditing) && (
        <form onSubmit={handleSaveBudget} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-extrabold text-slate-900 font-display">
              {isCreating 
                ? (formType === 'servicio' ? 'Nuevo Presupuesto de Servicio' : 'Nuevo Presupuesto Simple / Venta') 
                : `Editar Presupuesto ${viewingBudget?.id}`
              }
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
              }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Selector de Tipo de Presupuesto */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50 border border-indigo-100/30 p-4 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-indigo-900 block font-display">Tipo de Presupuesto</span>
              <span className="text-[10px] font-bold text-slate-500 block">
                {formType === 'servicio' 
                  ? 'Asociado a un servicio técnico, análisis o reparación de un equipo físico.' 
                  : 'Para ofrecer conjuntos de repuestos, accesorios, armado de PC, u otras cotizaciones directas.'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 p-1 rounded-lg shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setFormType('servicio');
                  if (formItems.length === 0) {
                    setFormItems([{ name: 'Mano de Obra Diagnóstico y Diagnóstico Inicial', type: 'mano_obra', price: 15000, quantity: 1 }]);
                  }
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer select-none text-center ${
                  formType === 'servicio'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Servicio Técnico
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('simple');
                  if (formItems.length === 1 && formItems[0].name === 'Mano de Obra Diagnóstico y Diagnóstico Inicial') {
                    setFormItems([]);
                  }
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer select-none text-center ${
                  formType === 'simple'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Presupuesto Simple
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formType === 'servicio' && !isManualService ? (
              <>
                {/* Flow for SERVICE BUDGET using existing service tickets */}
                {!formOrderId ? (
                  <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-indigo-700 font-extrabold text-xs uppercase tracking-wider">
                      <Wrench className="h-4 w-4" />
                      <span>Vincular Servicio Técnico / Orden en Taller</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 leading-normal max-w-2xl">
                      Para interconectar correctamente con el taller, seleccione un servicio técnico registrado. Esto auto-completará los datos del cliente y del equipo automáticamente.
                    </p>
                    <div className="relative space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Buscar Servicio por Nro Ticket, Cliente, Marca o Modelo</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar ticket... Ej: TS-1001, Carlos, Samsung..."
                          value={orderQuery}
                          onChange={(e) => {
                            setOrderQuery(e.target.value);
                            setShowOrderSuggestions(true);
                          }}
                          onFocus={() => setShowOrderSuggestions(true)}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                        />
                      </div>

                      {showOrderSuggestions && (
                        <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 p-1 max-h-56 overflow-y-auto">
                          {suggestedOrders.length > 0 ? (
                            suggestedOrders.map((order) => (
                              <button
                                key={order.id}
                                type="button"
                                onClick={() => handleSelectSuggestedOrder(order)}
                                className="w-full flex items-center justify-between p-2.5 hover:bg-indigo-50 rounded-md text-left font-semibold text-slate-700 border-b border-slate-100/30 last:border-0 cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-indigo-700">{order.id} - {order.clientName}</span>
                                  <span className="text-[10px] text-slate-500 font-bold mt-0.5">{order.deviceType}: {order.brand} {order.model}</span>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">S/N: {order.serialNumber || 'S.D.'}</span>
                                </div>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
                                  {order.status}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs font-bold text-slate-400">
                              {orderQuery.trim().length > 0 ? 'No se encontraron servicios coincidentes' : 'Escriba para buscar un servicio técnico...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualService(true);
                          setFormOrderId(undefined);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold cursor-pointer"
                      >
                        O ingresar datos de cliente/equipo de forma manual si no hay ticket aún →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-1 md:col-span-2 p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-stretch justify-between gap-5 col-span-1 md:col-span-2">
                    <div className="space-y-3 flex-1 col-span-1 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono">
                          Servicio Asociado: {formOrderId}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">• Datos sincronizados automáticamente</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white/60 p-3 rounded-lg border border-slate-100/50">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DATOS DEL CLIENTE</span>
                          <p className="text-xs font-black text-slate-900 mt-1 leading-normal">{formClientName}</p>
                          {formClientPhone && (
                            <p className="text-[10px] font-bold text-slate-500 font-mono mt-0.5">Tel: {formClientPhone}</p>
                          )}
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg border border-slate-100/50">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DETALLES DEL EQUIPO</span>
                          <p className="text-xs font-black text-slate-900 mt-1 leading-normal">
                            {formDeviceType}: {formBrand} {formModel}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">S/N: {formSerialNumber || 'Ninguno'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex sm:flex-col justify-end items-end gap-2 border-t sm:border-t-0 sm:border-l border-slate-200/50 pt-3 sm:pt-0 sm:pl-4">
                      <button
                        type="button"
                        onClick={() => {
                          setFormOrderId(undefined);
                          setOrderQuery('');
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-700 hover:text-slate-900 rounded-lg transition flex items-center gap-1 cursor-pointer select-none"
                      >
                        <X className="h-3.5 w-3.5 text-slate-400" />
                        <span>Desvincular</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Fallback Manual form (or simple budget type) */}
                {/* Cliente Detail */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
                    <User className="h-4 w-4" />
                    <span>Datos del Cliente</span>
                  </div>
                  
                  <div className="relative space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Buscar o ingresar nuevo cliente..."
                      value={formClientName}
                      onChange={(e) => {
                        setFormClientName(e.target.value);
                        setClientQuery(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                    />

                    {showClientSuggestions && suggestedClients.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 p-1 max-h-48 overflow-y-auto">
                        {suggestedClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectSuggestedClient(client)}
                            className="w-full flex flex-col p-2 hover:bg-indigo-50 rounded-md text-left font-semibold text-slate-700"
                          >
                            <span className="text-xs">{client.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{client.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Teléfono de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej: 351 654-3210"
                      value={formClientPhone}
                      onChange={(e) => setFormClientPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Device Detail (conditionally rendered) */}
                {formType === 'servicio' ? (
                  <div id="device-info-card" className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
                      <Cpu className="h-4 w-4" />
                      <span>Equipo a Presupuestar</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Categoría</label>
                        <select
                          value={formDeviceType}
                          onChange={(e) => setFormDeviceType(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="Notebook">Notebook</option>
                          <option value="Teléfono">Teléfono</option>
                          <option value="CPU / PC Desktop">CPU / PC Desktop</option>
                          <option value="Consola de Videojuegos">Consola</option>
                          <option value="Tablet">Tablet</option>
                          <option value="Smartwatch">Smartwatch</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                        <input
                          type="text"
                          placeholder="Ej: Asus, Apple"
                          value={formBrand}
                          onChange={(e) => setFormBrand(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                        <input
                          type="text"
                          placeholder="Ej: Vivobook, iPhone 11"
                          value={formModel}
                          onChange={(e) => setFormModel(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nro Serie / IMEI</label>
                        <input
                          type="text"
                          placeholder="S/N o IMEI..."
                          value={formSerialNumber}
                          onChange={(e) => setFormSerialNumber(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                        />
                      </div>
                    </div>
                    {isManualService && (
                      <div className="text-[10px] flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualService(false);
                            setOrderQuery('');
                          }}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold cursor-pointer"
                        >
                          ← Volver a buscar orden / Vincular Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div id="simple-info-card" className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
                      <Briefcase className="h-4 w-4" />
                      <span>Detalle de Cotización Simple</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Referencia / Título *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: PC Armada para Diseño, Combo SSD + Ram"
                        value={formBrand}
                        onChange={(e) => {
                          setFormBrand(e.target.value);
                          setFormDeviceType('Venta/Repuestos');
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Especificaciones o Resumen</label>
                      <input
                        type="text"
                        placeholder="Ej: Ryzen 5, 16GB RAM, SSD 1TB..."
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Validation / Expiry */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1">
                <Calendar className="h-4 w-4" />
                <span>Vigencia y Notas</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Días de Validez</label>
                <select
                  value={formValidDays}
                  onChange={(e) => setFormValidDays(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="7">7 días corridos</option>
                  <option value="15">15 días corridos</option>
                  <option value="30">30 días corridos</option>
                  <option value="45">45 días corridos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Términos Especiales / Notas</label>
                <input
                  type="text"
                  placeholder="Garantía de parte por 90 días, requiere seña, etc..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* BUDGET ITEMS LIST DYNAMIC SECTION */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-800 text-sm font-display">Detalle de Costos (Items de Reparación)</h3>
              </div>
              <button
                type="button"
                onClick={handleAddItemLine}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer leading-none"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Ítem</span>
              </button>
            </div>

            <div className="space-y-0">
              {/* Table header - shown once */}
              {formItems.length > 0 && (
                <div className="hidden md:flex items-center gap-3 px-3 pb-2 border-b border-slate-200/60 mb-2">
                  <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase">Descripción del Repuesto / Trabajo</span>
                  <span className="w-36 text-[10px] font-bold text-slate-400 uppercase">Tipo de Costo</span>
                  <span className="w-32 text-[10px] font-bold text-slate-400 uppercase">Precio Unit. ($)</span>
                  <span className="w-20 text-[10px] font-bold text-slate-400 uppercase">Cant.</span>
                  <span className="w-28 text-[10px] font-bold text-slate-400 uppercase text-right pr-2">Subtotal</span>
                  <span className="w-9"></span>
                </div>
              )}

              {formItems.map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 hover:bg-slate-50/50 px-3 py-2 rounded-lg border-b border-slate-100/60 last:border-0 relative transition">

                  {/* Item Description & Search */}
                  <div className="flex-1 relative">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase leading-none block mb-1">Descripción *</label>
                    <input
                      type="text"
                      required
                      placeholder={item.type === 'repuesto' ? 'Buscar o escribir repuesto...' : 'Escribir mano de obra / trabajo especial...'}
                      value={item.name}
                      onChange={(e) => {
                        handleItemLineChange(idx, 'name', e.target.value);
                        if (item.type === 'repuesto') {
                          setPartQuery(e.target.value);
                          setActiveItemIndexForPartSearch(idx);
                          setShowPartSuggestions(true);
                        }
                      }}
                      onFocus={() => {
                        if (item.type === 'repuesto') {
                          setPartQuery(item.name);
                          setActiveItemIndexForPartSearch(idx);
                          setShowPartSuggestions(true);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
                    />

                    {/* Autocomplete for Parts */}
                    {item.type === 'repuesto' && showPartSuggestions && activeItemIndexForPartSearch === idx && (
                      <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 p-1 max-h-56 overflow-y-auto">
                        {suggestedParts.map((part) => (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => handleSelectSuggestedPart(part, idx)}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-md text-left font-semibold text-slate-700 border-b border-slate-100/50 last:border-0 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{part.name}</span>
                              <span className="text-[10px] text-emerald-600 font-bold">Stock: {part.stock} u. • SKU {part.sku}</span>
                            </div>
                            <span className="text-xs font-mono font-black text-indigo-700">${(part.finalPrice || part.price || 0).toLocaleString('es-AR')}</span>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleOpenNewPartModal(idx, partQuery)}
                          className="w-full flex items-center gap-2 p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-md text-left font-black text-xs text-indigo-800 transition cursor-pointer"
                        >
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>
                            {partQuery.trim()
                              ? `¿No existe? Registrar "${partQuery}" en inventario`
                              : `+ Registrar nuevo repuesto en inventario`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Type select */}
                  <div className="w-full md:w-36">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase leading-none block mb-1">Tipo</label>
                    <select
                      value={item.type}
                      onChange={(e) => handleItemLineChange(idx, 'type', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="repuesto">🔧 Repuesto</option>
                      <option value="mano_obra">💼 Mano de Obra</option>
                    </select>
                  </div>

                  {/* Unit price */}
                  <div className="w-full md:w-32">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase leading-none block mb-1">Precio ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0.00"
                      disabled={item.type === 'repuesto'}
                      value={item.price || ''}
                      onChange={(e) => handleItemLineChange(idx, 'price', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-hidden transition ${
                        item.type === 'repuesto'
                          ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200'
                          : 'bg-white border-slate-200 focus:border-indigo-500 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-full md:w-20">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase leading-none block mb-1">Cant.</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemLineChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {/* Total Line price */}
                  <div className="w-full md:w-28 text-right select-none pr-2">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase leading-none block mb-1">Subtotal</label>
                    <span className="text-xs font-mono font-black text-slate-700">
                      ${((item.price || 0) * (item.quantity || 1)).toLocaleString('es-AR')}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItemLine(idx)}
                    className="absolute md:static top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}

              {formItems.length === 0 && (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 font-bold">
                  Agregue ítems para detallar los costos del presupuesto técnico de manera clara.
                </div>
              )}
            </div>
          </div>

          {/* Form Actions Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="text-slate-500 font-semibold text-xs py-1 text-center sm:text-left">
              Monto Total Estimado:{' '}
              <span className="font-mono font-black text-slate-900 text-lg ml-1.5">
                ${formItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer select-none text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/10 cursor-pointer text-center"
              >
                <span>Guardar Presupuesto</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* DETAIL MODAL FOR ACTIVE BUDGET */}
      {viewingBudget && !isEditing && !isCreating && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-[500] animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border border-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <span className="bg-indigo-600 text-white font-mono font-bold px-3 py-1 text-sm rounded-lg shadow-sm">
                  {viewingBudget.id}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">Detalle de Cotización</h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono leading-none mt-1">Registrado el {new Date(viewingBudget.createdAt).toLocaleString('es-AR')}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingBudget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Client & Device Grid info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100/50 rounded-xl space-y-3">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Contacto Cliente</span>
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-800 font-black text-sm">{viewingBudget.clientName}</p>
                    <p className="text-slate-550 font-bold font-mono">Teléfono: {viewingBudget.clientPhone || 'No registrado'}</p>
                    <span className="inline-block mt-2 text-[10px] bg-slate-200 text-slate-600 rounded px-2 py-0.5 leading-none font-bold">
                      ID Cliente: {viewingBudget.clientId || 'Cliente externo'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100/50 rounded-xl space-y-3">
                  {viewingBudget.type === 'simple' ? (
                    <>
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Detalle de Cotización Simple</span>
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-800 font-black text-sm">
                          Reg.: {viewingBudget.brand || 'Venta de repuestos'}
                        </p>
                        {viewingBudget.model && (
                          <p className="text-slate-550 font-semibold">Resumen: {viewingBudget.model}</p>
                        )}
                        <span className="inline-block mt-2 text-[10px] bg-slate-200 text-slate-600 rounded px-2 py-0.5 leading-none font-bold">
                          Validado: {viewingBudget.validUntil ? new Date(viewingBudget.validUntil).toLocaleDateString('es-AR') : 'Sin expiración'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Especificación de Equipo</span>
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-800 font-black text-sm">
                          {viewingBudget.deviceType || 'Equipo'}: {viewingBudget.brand} {viewingBudget.model}
                        </p>
                        <p className="text-slate-550 font-serif font-bold">Serie/IMEI: {viewingBudget.serialNumber || 'No registrada'}</p>
                        <span className="inline-block mt-2 text-[10px] bg-slate-200 text-slate-600 rounded px-2 py-0.5 leading-none font-bold">
                          Validado: {viewingBudget.validUntil ? new Date(viewingBudget.validUntil).toLocaleDateString('es-AR') : 'Sin expiración'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status Update Options */}
              <div className="p-4 border border-slate-100 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado Actual del Presupuesto</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusColor(viewingBudget.status)}`}>
                    {viewingBudget.status}
                  </span>
                </div>
                
                {viewingBudget.status !== 'Aprobado' ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400 mr-2">Marcar como:</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateBudgetStatus(viewingBudget.id, 'Enviado');
                        setViewingBudget(prev => prev ? { ...prev, status: 'Enviado' } : null);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                    >
                      Enviado (Cliente)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConvertClick(viewingBudget)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center space-x-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>Aprobar / Iniciar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateBudgetStatus(viewingBudget.id, 'Rechazado');
                        setViewingBudget(prev => prev ? { ...prev, status: 'Rechazado' } : null);
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer"
                    >
                      Rechazado
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {viewingBudget.convertedToOrderId ? (
                      <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                        <FileCheck2 className="h-4.5 w-4.5" />
                        <span>Convertido a Ticket de Servicio: {viewingBudget.convertedToOrderId}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertClick(viewingBudget)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center space-x-1.5 shadow-md hover:shadow-indigo-600/15 cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Generar Órden de Trabajo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-display">Desglose de Ítems Presupuestados</span>
                
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider select-none">
                        <th className="px-5 py-3">Descripción</th>
                        <th className="px-5 py-3 text-center">Tipo</th>
                        <th className="px-5 py-3 text-right">Precio Unitario</th>
                        <th className="px-5 py-3 text-center">Cantidad</th>
                        <th className="px-5 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {viewingBudget.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-slate-800 font-bold">{item.name}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${item.type === 'repuesto' ? 'bg-amber-105 text-amber-800' : 'bg-indigo-50 text-indigo-800'}`}>
                              {item.type === 'repuesto' ? 'Repuesto' : 'Mano de Obra'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono">${item.price.toLocaleString('es-AR')}</td>
                          <td className="px-5 py-3.5 text-center font-mono">{item.quantity}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                            ${(item.price * item.quantity).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-extrabold text-slate-800 text-xs">
                        <td colSpan={4} className="px-5 py-4 text-right">Valor Total Estimado:</td>
                        <td className="px-5 py-4 text-right font-mono font-black text-slate-900 text-sm">
                          ${viewingBudget.totalCost.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Private Notes info */}
              {viewingBudget.notes && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/15 rounded-xl text-xs space-y-1 text-slate-700 leading-relaxed font-semibold">
                  <p className="font-extrabold text-[#a16207] uppercase tracking-wider text-[10px]">Términos especiales cargados:</p>
                  <p>{viewingBudget.notes}</p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-between items-center select-none">
              <div>
                <button
                  type="button"
                  onClick={() => setPrintingBudget(viewingBudget)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="h-4.5 w-4.5 text-slate-400" />
                  <span>Imprimir Presupuesto</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setViewingBudget(null)}
                  className="bg-slate-200/85 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(viewingBudget)}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
                  disabled={viewingBudget.status === 'Aprobado'}
                >
                  Editar Presupuesto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TICKET / BUDGET CONVERSION CONFIG MODAL */}
      {convertingBudget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[600] animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative border border-slate-100">
            <div className="p-4.5 border-b border-slate-150 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 font-display">Aprobar y Generar Ticket de Servicio</h3>
              <button onClick={() => setConvertingBudget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs font-semibold text-slate-700">
              <p className="leading-normal">
                Está a punto de convertir el presupuesto <strong className="text-indigo-655">{convertingBudget.id}</strong> en un Ticket de Servicio de laboratorio para su reparación activa.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase leading-none block">Técnico Asignado</label>
                <select
                  value={assignedTech}
                  onChange={(e) => setAssignedTech(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
                >
                  {technicians.map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value={activeUserLabel()}>{activeUserLabel()}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase leading-none block">Prioridad de Reparación</label>
                <select
                  value={orderPriority}
                  onChange={(e) => setOrderPriority(e.target.value as OrderPriority)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>

              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-500 leading-normal">
                Se crearán automáticamente las imputaciones de mano de obra y repuestos especificados en esta cotización. El estado inicial será <strong>"Ingresado"</strong>.
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConvertingBudget(null)}
                className="bg-slate-200 hover:bg-slate-250 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConvertConfirm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition font-bold"
              >
                Confirmar y Ordenar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / COMPROBANTE MODAL */}
      {printingBudget && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[700] overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl relative my-8">
            
            {/* Top print preview banner */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2 text-xs font-bold">
                <Printer className="h-4.5 w-4.5 text-indigo-400" />
                <span>Vista Previa de Impresión - Presupuesto Técnico</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center space-x-1 cursor-pointer leading-none"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir Comprobante</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingBudget(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Frame wrapper */}
            <div 
              id="printable-budget-document" 
              className="bg-white p-12 flex flex-col space-y-8 text-slate-800 font-sans leading-relaxed text-xs overflow-y-auto max-h-[80vh] print:max-h-none print:p-0"
            >
              {/* Report Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    {workshopLogo ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <img src={workshopLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    ) : null}
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none font-display">
                        {workshopLogo ? null : (workshopName || "S.A.T. SERVICIO TÉCNICO")}
                      </h1>
                      <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">
                        {ticketSub || "Laboratorio de Soporte y Microsoldadura"}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">Comprobante técnico oficial de cotización de servicios.</p>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest leading-none">PRESUPUESTO</div>
                  <div className="text-xl font-black tracking-tight font-mono text-indigo-755 leading-none mt-1.5">{printingBudget.id}</div>
                  <div className="text-[10px] font-bold text-slate-500 font-mono mt-2">
                    Emisión: {new Date(printingBudget.createdAt).toLocaleDateString('es-AR')}
                  </div>
                  <div className="text-[10px] font-bold text-rose-600 font-mono">
                    Vence: {printingBudget.validUntil ? new Date(printingBudget.validUntil).toLocaleDateString('es-AR') : 'S.D.'}
                  </div>
                </div>
              </div>

              {/* Stakeholders info grids */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">CONTACTO COMERCIAL</span>
                  <div className="space-y-0.5 font-semibold text-slate-700">
                    <p className="text-xs font-black text-slate-900">{printingBudget.clientName}</p>
                    <p className="font-mono">Teléfono: {printingBudget.clientPhone || 'No cargado'}</p>
                    <p className="text-[10px]">Término de pago: Contado / Contra Entrega</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  {printingBudget.type === 'simple' ? (
                    <>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">CONCEPTO DE LA COTIZACIÓN</span>
                      <div className="space-y-0.5 font-semibold text-slate-700">
                        <p className="text-xs font-black text-slate-900 leading-normal">
                          Detalle: {printingBudget.brand || 'Venta directa / Repuestos'}
                        </p>
                        {printingBudget.model && (
                          <p className="font-semibold text-slate-650 mt-0.5">Especificaciones: {printingBudget.model}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">Destino: Entrega directa / Retiro por local</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">DETALLE DE EQUIPO</span>
                      <div className="space-y-0.5 font-semibold text-slate-700">
                        <p className="text-xs font-black text-slate-900">
                          {printingBudget.deviceType || 'Equipo'}: {printingBudget.brand} {printingBudget.model}
                        </p>
                        <p className="font-serif font-bold">IMEI/Serie: {printingBudget.serialNumber || 'Nro no cargado'}</p>
                        <p className="text-[10px]">Estado de recepción: Para diagnóstico en taller</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Main table of components */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-display">DETALLE DE REPUESTOS Y MANO DE OBRA</span>
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">
                        <th className="px-4 py-3">Detalle del Ítem / Reparación</th>
                        <th className="px-4 py-3 text-center w-28">Clasificación</th>
                        <th className="px-4 py-3 text-right w-36">Precio Unitario</th>
                        <th className="px-4 py-3 text-center w-24">Cant.</th>
                        <th className="px-4 py-3 text-right w-36">Importe Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                      {printingBudget.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-800 font-bold">{item.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[9px] uppercase font-bold text-slate-500">
                              {item.type === 'repuesto' ? 'Repuesto' : 'Mano de Obra'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">${item.price.toLocaleString('es-AR')}</td>
                          <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            ${(item.price * item.quantity).toLocaleString('es-AR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t border-slate-300 font-black text-slate-900 text-xs">
                        <td colSpan={4} className="px-4 py-4 text-right uppercase tracking-wider text-[10px]">Total Estimado Reparación:</td>
                        <td className="px-4 py-4 text-right font-mono text-slate-950 font-black text-sm">
                          ${printingBudget.totalCost.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* T&C of budget */}
              <div className="space-y-2 border-t border-slate-200 pt-5">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-display">VALIDEZ Y TÉRMINOS LEGALES</span>
                <div className="text-[10px] text-slate-500 bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-1.5 leading-normal">
                  <p>1. Este comprobante técnico constituye una estimación provisoria de costos operada por el laboratorio técnico bajo diagnóstico visual inicial y/o microchips descriptos precedentemente.</p>
                  <p>2. El presente presupuesto cuenta con una validez máxima de {formValidDays || '15'} días corridos desde su emisión. Pasado dicho plazo, la orden queda sujeta a actualización por variación cambiaria o disponibilidad física de componentes.</p>
                  {printingBudget.notes && (
                    <p className="font-bold text-slate-900 border-t border-slate-200/50 pt-1.5 mt-1.5">
                      <strong>Condiciones Particulares:</strong> {printingBudget.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-12 pt-10">
                <div className="text-center space-y-1.5 flex flex-col items-center">
                  <div className="w-48 border-b border-slate-400 h-10"></div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-display">FIRMA CLIENTE / CONFORMIDAD</span>
                  <p className="text-[9px] text-slate-400 font-medium">Declaro aceptar la cotización y la viabilidad de reparación.</p>
                </div>

                <div className="text-center space-y-1.5 flex flex-col items-center">
                  <div className="w-48 border-b border-slate-400 h-10 flex items-end justify-center text-[10px] font-bold text-slate-600 italic">Laboratorio Técnico</div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-display">RESPONSABLE TALLER</span>
                  <p className="text-[9px] text-slate-400 font-medium">Control de presupuestos y repuestos Mecatrónika.</p>
                </div>
              </div>
            </div>

            {/* Print preview actions footer */}
            <div className="p-4 bg-slate-200 border-t border-slate-300 flex justify-end space-x-2 print:hidden select-none">
              <button
                type="button"
                onClick={() => setPrintingBudget(null)}
                className="bg-slate-300 hover:bg-slate-350 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer"
              >
                Cerrar Comprobante
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>Imprimir Presupuesto</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ON-THE-FLY NEW SPARE PART REGISTRATION MODAL */}
      {showNewPartModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[800] animate-fade-in">
          <form
            onSubmit={handleSaveNewPart}
            className="bg-white border border-slate-250 rounded-2xl p-6 shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up max-w-3xl w-full max-h-[95vh] overflow-y-auto text-xs text-slate-755 font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:col-span-4 pb-2 border-b border-slate-150 flex justify-between items-center bg-indigo-50/20 -mx-6 -mt-6 p-4 rounded-t-2xl">
              <h3 className="font-extrabold text-indigo-700 text-xs uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Package className="h-4.5 w-4.5 text-indigo-600" />
                <span>Registrar Nuevo Repuesto / Componente</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewPartModal(false);
                  setNewPartModalIndex(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-1 relative md:col-span-1">
              <label className="text-xs font-bold text-slate-900 block">
                Tipo/Categoría *
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsNewPartCategoryDropdownOpen(!isNewPartCategoryDropdownOpen)
                }
                className="w-full text-left text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-705 font-bold focus:bg-white focus:outline-none flex justify-between items-center cursor-pointer shadow-3xs hover:bg-slate-100/50 transition h-[38px] group"
              >
                <span className="truncate">{newPartCategory}</span>
                <span
                  className="text-slate-400 text-[10px] transition-transform duration-200"
                  style={{
                    transform: isNewPartCategoryDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0)",
                  }}
                >
                  ▼
                </span>
              </button>

              {isNewPartCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-[100%] mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 font-bold text-xs text-slate-700 divide-y divide-slate-50/50">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        handleNewPartCategoryChange(cat);
                        setIsNewPartCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 transition hover:bg-indigo-55 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer flex items-center justify-between ${
                        newPartCategory === cat
                          ? "bg-indigo-50 text-indigo-600 font-extrabold"
                          : ""
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {newPartCategory === cat && (
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
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
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
                value={newPartSku}
                onChange={(e) => setNewPartSku(e.target.value)}
                placeholder="Ej. REP-SCR-IPH13PM"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 block">
                Moneda de Cálculo
              </label>
              <div className="grid grid-cols-2 gap-1.5 h-[38px]">
                <button
                  type="button"
                  onClick={() => setNewPartCurrency("ARS")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center cursor-pointer select-none ${
                    newPartCurrency === "ARS"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Pesos ($)
                </button>
                <button
                  type="button"
                  onClick={() => setNewPartCurrency("USD")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center cursor-pointer select-none ${
                    newPartCurrency === "USD"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Dólares (U$D)
                </button>
              </div>
            </div>

            <div className="space-y-1 border-slate-200/50">
              <label className="text-xs font-bold text-slate-900 block">
                IVA aplicable
              </label>
              <select
                value={newPartIva}
                onChange={(e) => setNewPartIva(e.target.value as any)}
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
                  onClick={() => handleNewPartPricingTypeChange("margin")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center truncate cursor-pointer select-none ${
                    newPartPricingType === "margin"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  % Margen fijo ({categoryMargins[newPartCategory] || 35}%)
                </button>
                <button
                  type="button"
                  onClick={() => handleNewPartPricingTypeChange("manual")}
                  className={`h-full w-full px-1 text-[11px] font-bold rounded-lg border transition flex items-center justify-center cursor-pointer select-none ${
                    newPartPricingType === "manual"
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
                Precio de Costo ({newPartCurrency === "USD" ? "U$D" : "$"}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={newPartCostPrice || ""}
                onChange={(e) =>
                  handleNewPartCostPriceChange(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            {newPartPricingType === "margin" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">
                  Ganancia Margen (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={newPartMarginPercent}
                    onChange={(e) =>
                      handleNewPartMarginPercentChange(parseFloat(e.target.value) || 0)
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
              className={`space-y-1 ${newPartPricingType === "manual" ? "md:col-span-2" : "col-span-1"}`}
            >
              <label className="text-xs font-bold text-slate-900 block">
                Precio Final Venta ({newPartCurrency === "USD" ? "U$D" : "$"}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                disabled={newPartPricingType === "margin"}
                value={newPartFinalPrice || ""}
                onChange={(e) =>
                  handleNewPartFinalPriceChange(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className={`w-full text-xs p-2.5 border rounded-lg font-black placeholder-slate-400 focus:outline-none transition ${
                  newPartPricingType === "margin"
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
                value={newPartStock}
                onChange={(e) => setNewPartStock(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1 col-span-1 md:col-span-4">
              <label className="text-xs font-semibold text-slate-550 block">
                Modelos de Equipos Compatibles
              </label>
              <input
                type="text"
                value={newPartCompatible}
                onChange={(e) => setNewPartCompatible(e.target.value)}
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
                    {newPartCurrency === "USD" ? "U$D " : "$ "}
                    {newPartCostPrice.toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="border-r border-slate-200/50 pr-2">
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Precio Venta
                  </span>
                  <span className="text-indigo-600 font-black text-xs">
                    {newPartCurrency === "USD" ? "U$D " : "$ "}
                    {newPartFinalPrice.toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="border-r border-slate-200/50 pr-2">
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Rentabilidad Neta
                  </span>
                  <span className="text-emerald-600 font-black text-xs block">
                    {newPartCurrency === "USD" ? "U$D " : "$ "}
                    {(newPartFinalPrice - newPartCostPrice).toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({newPartMarginPercent}% de margen)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[9px] uppercase">
                    Ref. en Pesos (ARS)
                  </span>
                  <span className="text-amber-600 font-black text-sm block">
                    $
                    {(newPartCurrency === "USD"
                      ? newPartFinalPrice * exchangeRate
                      : newPartFinalPrice
                    ).toLocaleString("es-AR", {
                      minimumFractionDigits: 0,
                    })}{" "}
                    ARS
                  </span>
                  {newPartCurrency === "USD" && (
                    <span className="text-[9px] text-slate-400 font-normal block animate-pulse">
                      Cotización USD: ${exchangeRate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewPartModal(false);
                  setNewPartModalIndex(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer shadow-xs font-bold"
              >
                Dar de Alta y Aplicar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
