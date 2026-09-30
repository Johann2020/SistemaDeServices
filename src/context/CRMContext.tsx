import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Client, Order, SparePartInventoryItem, OrderStatus, OrderPriority, OrderPart, CRMStats, DelayConfig, Technician, Toast, Budget, BudgetItem, BudgetStatus, PaymentStatus } from '../types';
import { DEVICE_TYPES } from '../data';
import { api } from '../api';

export interface ActionHistoryEntry {
  id: string;
  description: string;
  timestamp: string;
  state: {orders: Order[], clients: Client[], inventory: SparePartInventoryItem[]};
}

interface CRMContextType {
  orders: Order[];
  clients: Client[];
  inventory: SparePartInventoryItem[];
  budgets: Budget[];
  stats: CRMStats;
  delayConfig: DelayConfig;
  updateDelayConfig: (config: DelayConfig) => void;
  exchangeRate: number;
  updateExchangeRate: (rate: number) => void;
  categoryMargins: Record<string, number>;
  updateCategoryMargin: (category: string, margin: number) => void;
  addCategory: (name: string, margin: number) => void;
  deleteCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string, margin: number) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  removeToast: (id: string) => void;
  workshopName: string;
  workshopLogo: string;
  logoPosition: 'side' | 'top';
  ticketTitle: string;
  ticketSub: string;
  ticketTerms: string;
  updateWorkshopSettings: (settings: {
    name?: string;
    logo?: string;
    logoPosition?: 'side' | 'top';
    ticketTitle?: string;
    ticketSub?: string;
    ticketTerms?: string;
  }) => void;
  addOrder: (orderData: {
    clientId: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber: string;
    description: string;
    reportedProblem?: string;
    plannedWork?: string;
    priority: OrderPriority;
    assignedTechnician: string;
    laborCost: number;
    estimatedDelivery?: string;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderDetails: (orderId: string, data: Partial<Order>) => void;
  deleteOrder: (orderId: string) => void;
  addClient: (clientData: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClientDetails: (clientId: string, data: Partial<Client>) => void;
  addPartToOrder: (orderId: string, partId: string, quantity: number) => boolean;
  removePartFromOrder: (orderId: string, partId: string) => void;
  addInventoryItem: (itemData: Omit<SparePartInventoryItem, 'id'>) => void;
  updateInventoryItem: (itemId: string, data: Partial<SparePartInventoryItem>) => void;
  deleteInventoryItem: (itemId: string) => void;
  searchClientsPredictive: (query: string) => Client[];
  deleteClientWithData: (clientId: string, mode: 'only_services' | 'services_and_equipments' | 'all') => void;
  technicians: Technician[];
  addTechnician: (techData: Omit<Technician, 'id' | 'createdAt'>) => Technician;
  deleteTechnician: (id: string) => void;
  updateTechnician: (id: string, data: Partial<Technician>) => void;
  undo: () => void;
  canUndo: boolean;
  actionHistory: ActionHistoryEntry[];
  undoToPoint: (historyId: string) => void;
  addBudget: (budgetData: {
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    deviceType?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    items: BudgetItem[];
    status: BudgetStatus;
    notes?: string;
    validUntil?: string;
    type?: 'servicio' | 'simple';
    orderId?: string;
  }) => Budget;
  updateBudgetStatus: (budgetId: string, status: BudgetStatus) => void;
  updateBudgetDetails: (budgetId: string, data: Partial<Budget>) => void;
  deleteBudget: (budgetId: string) => void;
  convertBudgetToOrder: (budgetId: string, assignedTechnician: string, priority: OrderPriority) => string | null;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const normalizeDeviceType = (type: string): string => {
  const t = (type || '').trim().toLowerCase();
  if (t === 'laptop') return 'Notebook';
  if (t === 'smartphone' || t === 'celular' || t === 'telefono') return 'Teléfono';
  if (t === 'pc' || t === 'desktop') return 'CPU / PC Desktop';
  if (t === 'consola') return 'Consola de Videojuegos';
  if (t === 'tablet') return 'Tablet';
  if (t === 'smartwatch') return 'Smartwatch';
  if (t === 'audio/video' || t === 'audio' || t === 'video') return 'Radio / Equipo de Audio';
  return type;
};

const DEFAULT_TICKET_TERMS = `1. Diagnóstico Inicial: El presupuesto provisto es de carácter estimado. Al abrir el equipo, el laboratorio técnico se reserva el derecho de actualizarlo bajo aviso si se descubrieran daños ocultos persistentes.
2. Garantía Limitada: Todo trabajo técnico cuenta con una cobertura de 90 días corridos sobre la mano de obra aplicada y los componentes físicos sustituidos descriptos en el presente comprobante comercial.
3. Políticas de Resguardo: El cliente declara haber resguardado y copiado su información personal previo al ingreso. El taller no asume responsabilidad alguna ante caídas lógicas o formateos lógicos derivados de pruebas de hardware necesarias.
4. Abandono de Bienes: Pasados los 90 días desde la notificación formal del dictamen final ("Listo" o "Retirado/Devuelto"), el taller se reserva el derecho de aplicar cargos diarios por custodia de almacenamiento o subastar el dispositivo para cubrir gastos incurridos según el Código Civil.`;

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const activeUser = user;
  const tenantId = activeUser ? activeUser.tenantId : 'default';

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'success', 
    duration = 3500
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [workshopName, setWorkshopName] = useState<string>("S.A.T. SERVICIO TÉCNICO");
  const [workshopLogo, setWorkshopLogo] = useState<string>("");
  const [logoPosition, setLogoPosition] = useState<'side' | 'top'>("side");
  const [ticketTitle, setTicketTitle] = useState<string>("TICKET DE CONTROL");
  const [ticketSub, setTicketSub] = useState<string>("Laboratorio de Diagnóstico y Reparaciones Especializadas");
  const [ticketTerms, setTicketTerms] = useState<string>(DEFAULT_TICKET_TERMS);

  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<SparePartInventoryItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadedTenantId, setLoadedTenantId] = useState<string>('');
  const [delayConfig, setDelayConfig] = useState<DelayConfig>({
    pendingThresholdDays: 2,
    readyThresholdDays: 5
  });
  const [stats, setStats] = useState<CRMStats>({
    pendingCount: 0,
    inRepairCount: 0,
    readyCount: 0,
    deliveredCount: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    activeTickets: 0
  });

  const [exchangeRate, setExchangeRate] = useState<number>(1050);
  const [categoryMargins, setCategoryMargins] = useState<Record<string, number>>({
    'Celular': 40,
    'Notebook': 30,
    'Pantalla': 50,
    'Disco SSD': 25,
    'Batería': 45,
    'Memoria RAM': 20,
    'Teclado': 35,
    'Cargador': 50,
    'Conector de carga': 100,
    'Vidrio / Glass': 60,
    'Otro': 35
  });

  const updateExchangeRate = (rate: number) => {
    setExchangeRate(rate);
    api.settings.set('exchangeRate', String(rate)).catch(console.error);
  };

  const saveCategoryMargins = (margins: Record<string, number>) => {
    api.settings.set('categoryMargins', JSON.stringify(margins)).catch(console.error);
  };

  const updateCategoryMargin = (category: string, margin: number) => {
    setCategoryMargins(prev => {
      const updated = { ...prev, [category]: margin };
      saveCategoryMargins(updated);
      return updated;
    });
  };

  const addCategory = (name: string, margin: number) => {
    setCategoryMargins(prev => {
      const updated = { ...prev, [name]: margin };
      saveCategoryMargins(updated);
      return updated;
    });
  };

  const deleteCategory = (name: string) => {
    setCategoryMargins(prev => {
      const updated = { ...prev };
      delete updated[name];
      saveCategoryMargins(updated);
      return updated;
    });
  };

  const renameCategory = (oldName: string, newName: string, margin: number) => {
    setCategoryMargins(prev => {
      const updated = { ...prev };
      delete updated[oldName];
      updated[newName] = margin;
      saveCategoryMargins(updated);
      return updated;
    });

    setInventory(prev => {
      const updated = prev.map(item => {
        if (item.category === oldName) {
          return { ...item, category: newName };
        }
        return item;
      });
      updated.forEach(item => {
        if (item.category === newName) {
          api.inventory.update(item.id, { category: newName }).catch(console.error);
        }
      });
      return updated;
    });
  };

  // Load data from API when tenantId changes
  useEffect(() => {
    if (!activeUser) return;

    let cancelled = false;

    const loadFromAPI = async () => {
      try {
        const [apiClients, apiOrders, apiInventory, apiTechnicians, apiBudgets, apiSettings] = await Promise.all([
          api.clients.list().catch(() => null),
          api.orders.list().catch(() => null),
          api.inventory.list().catch(() => null),
          api.technicians.list().catch(() => null),
          api.budgets.list().catch(() => null),
          api.settings.getAll().catch(() => null),
        ]);

        if (cancelled) return;

        // If API returned data, use it; otherwise fall back to localStorage for migration
        if (apiClients !== null && apiClients.length > 0) {
          setClients(apiClients);
          setOrders((apiOrders || []).map((o: any) => ({
            ...o,
            deviceType: normalizeDeviceType(o.deviceType),
            partsUsed: o.partsUsed || [],
            statusHistory: o.statusHistory || [{ status: 'Ingresado', timestamp: o.createdAt }],
            laborCost: o.laborCost || 0,
            totalCost: o.totalCost || 0,
          })));
          setInventory(apiInventory || []);
          setTechnicians(apiTechnicians || []);
          setBudgets((apiBudgets || []).map((b: any) => ({ ...b, items: b.items || [] })));

          if (apiSettings) {
            if (apiSettings.exchangeRate) setExchangeRate(Number(apiSettings.exchangeRate) || 1050);
            if (apiSettings.categoryMargins) {
              try { setCategoryMargins(JSON.parse(apiSettings.categoryMargins)); } catch {}
            }
            if (apiSettings.delayConfig) {
              try { setDelayConfig(JSON.parse(apiSettings.delayConfig)); } catch {}
            }
            if (apiSettings.workshopName) setWorkshopName(apiSettings.workshopName);
            if (apiSettings.workshopLogo) setWorkshopLogo(apiSettings.workshopLogo);
            if (apiSettings.logoPosition) setLogoPosition(apiSettings.logoPosition as 'side' | 'top');
            if (apiSettings.ticketTitle) setTicketTitle(apiSettings.ticketTitle);
            if (apiSettings.ticketSub) setTicketSub(apiSettings.ticketSub);
            if (apiSettings.ticketTerms) setTicketTerms(apiSettings.ticketTerms);
          }

          setLoadedTenantId(tenantId);
          return;
        }

        // Fallback: load from localStorage and migrate to API
        loadFromLocalStorageFallback();
      } catch {
        // API not available, fall back to localStorage
        loadFromLocalStorageFallback();
      }
    };

    const loadFromLocalStorageFallback = () => {
      if (cancelled) return;

      const clientsKey = `crm_${tenantId}_clients`;
      const inventoryKey = `crm_${tenantId}_inventory`;
      const ordersKey = `crm_${tenantId}_orders`;
      const delayKey = `crm_${tenantId}_delay_config`;
      const techniciansKey = `crm_${tenantId}_technicians`;
      const exchangeRateKey = `crm_${tenantId}_exchange_rate`;
    const categoryMarginsKey = `crm_${tenantId}_category_margins`;

    const storedClients = localStorage.getItem(clientsKey);
    const storedInventory = localStorage.getItem(inventoryKey);
    const storedOrders = localStorage.getItem(ordersKey);
    const storedDelayConfig = localStorage.getItem(delayKey);
    const storedTechnicians = localStorage.getItem(techniciansKey);
    const storedExchangeRate = localStorage.getItem(exchangeRateKey);
    const storedCategoryMargins = localStorage.getItem(categoryMarginsKey);

    // Load Exchange Rate
    if (storedExchangeRate) {
      setExchangeRate(Number(storedExchangeRate));
    } else {
      setExchangeRate(1050);
    }

    // Load Workshop Settings
    const storedWorkshopName = localStorage.getItem(`crm_${tenantId}_workshop_name`);
    const storedWorkshopLogo = localStorage.getItem(`crm_${tenantId}_workshop_logo`);
    const storedLogoPosition = localStorage.getItem(`crm_${tenantId}_logo_position`);
    const storedTicketTitle = localStorage.getItem(`crm_${tenantId}_ticket_title`);
    const storedTicketSub = localStorage.getItem(`crm_${tenantId}_ticket_sub`);
    const storedTicketTerms = localStorage.getItem(`crm_${tenantId}_ticket_terms`);

    setWorkshopName(storedWorkshopName || "S.A.T. SERVICIO TÉCNICO");
    setWorkshopLogo(storedWorkshopLogo || "");
    setLogoPosition((storedLogoPosition === 'top' || storedLogoPosition === 'side') ? storedLogoPosition : "side");
    setTicketTitle(storedTicketTitle || "TICKET DE CONTROL");
    setTicketSub(storedTicketSub || "Laboratorio de Diagnóstico y Reparaciones Especializadas");
    setTicketTerms(storedTicketTerms || DEFAULT_TICKET_TERMS);

    // Load Category Margins
    const defaultLabels: Record<string, number> = {
      'Celular': 40,
      'Notebook': 30,
      'Pantalla': 50,
      'Disco SSD': 25,
      'Batería': 45,
      'Memoria RAM': 20,
      'Teclado': 35,
      'Cargador': 50,
      'Conector de carga': 100,
      'Vidrio / Glass': 60,
      'Otro': 35
    };
    if (storedCategoryMargins) {
      setCategoryMargins(JSON.parse(storedCategoryMargins));
    } else {
      setCategoryMargins(defaultLabels);
    }

    // 1. Clients
    let loadedClients: Client[] = [];
    if (storedClients) {
      loadedClients = JSON.parse(storedClients);
    } else {
      loadedClients = [];
    }
    setClients(loadedClients);

    // 2. Inventory
    let loadedInventory: SparePartInventoryItem[] = [];
    if (storedInventory) {
      loadedInventory = JSON.parse(storedInventory);
    } else {
      loadedInventory = [];
    }

    const standardInventory = loadedInventory.map(item => {
      const category = item.category || 'Otro';
      const iva = item.iva || '21.0%';
      const currency = item.currency || 'ARS';
      const pricingType = item.pricingType || 'manual';
      const finalPrice = item.finalPrice !== undefined ? item.finalPrice : (item.price || 0);
      const costPrice = item.costPrice !== undefined ? item.costPrice : Math.round(finalPrice * 0.7);
      const marginPercent = item.marginPercent !== undefined ? item.marginPercent : (Math.round(((finalPrice - costPrice) / (costPrice || 1)) * 100) || 35);
      const price = item.price !== undefined ? item.price : finalPrice;

      return {
        ...item,
        category,
        iva,
        currency,
        pricingType,
        finalPrice,
        costPrice,
        marginPercent,
        price
      } as SparePartInventoryItem;
    });

    setInventory(standardInventory);
    if (!storedInventory) {
      localStorage.setItem(inventoryKey, JSON.stringify(standardInventory));
    }

    // 3. Orders
    const repairOrderHistory = (order: Order): Order => {
      const history = [...(order.statusHistory || [])];
      let ingresado = history.find(h => h.status === 'Ingresado');
      if (!ingresado) {
        ingresado = { status: 'Ingresado', timestamp: order.createdAt };
        history.unshift(ingresado);
      }
      
      const tIngresado = new Date(ingresado.timestamp).getTime();
      const tFinal = new Date(order.updatedAt || order.createdAt).getTime();
      
      const hasEnReparacion = history.some(h => h.status === 'En Reparación');
      const hasListo = history.some(h => h.status === 'Listo');
      const hasEntregado = history.some(h => h.status === 'Entregado');
      
      if (order.status === 'En Reparación' || order.status === 'Listo' || order.status === 'Entregado') {
        if (!hasEnReparacion) {
          const ts = new Date(tIngresado + Math.max(3600000, (tFinal - tIngresado) * 0.3)).toISOString();
          history.push({ status: 'En Reparación', timestamp: ts });
        }
      }
      if (order.status === 'Listo' || order.status === 'Entregado') {
        if (!hasListo) {
          const ts = new Date(tIngresado + Math.max(7200000, (tFinal - tIngresado) * 0.7)).toISOString();
          history.push({ status: 'Listo', timestamp: ts });
        }
      }
      if (order.status === 'Entregado') {
        if (!hasEntregado) {
          const ts = new Date(tFinal).toISOString();
          history.push({ status: 'Entregado', timestamp: ts });
        }
      }
      
      const statusOrder: Record<OrderStatus, number> = {
        'Ingresado': 1,
        'En Reparación': 2,
        'Listo': 3,
        'Entregado': 4
      };
      
      const uniqueMap: Record<string, string> = {};
      history.forEach(h => {
        uniqueMap[h.status] = h.timestamp;
      });
      
      const uniqueHistory = Object.entries(uniqueMap).map(([status, timestamp]) => ({
        status: status as OrderStatus,
        timestamp
      })).sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

      return {
        ...order,
        statusHistory: uniqueHistory
      };
    };

    let loadedOrders: Order[] = [];
    if (storedOrders) {
      const parsedOrders: Order[] = JSON.parse(storedOrders);
      loadedOrders = parsedOrders.map(repairOrderHistory).map(o => ({
        ...o,
        deviceType: normalizeDeviceType(o.deviceType)
      }));
    } else {
      loadedOrders = [];
    }
    // Backfill costPrice for parts that don't have it
    let ordersPatched = false;
    loadedOrders = loadedOrders.map(o => {
      if (!o.partsUsed || o.partsUsed.length === 0) return o;
      const needsPatch = o.partsUsed.some(p => p.costPrice === undefined);
      if (!needsPatch) return o;
      ordersPatched = true;
      return {
        ...o,
        partsUsed: o.partsUsed.map(p =>
          p.costPrice === undefined ? { ...p, costPrice: Math.round(p.price * 0.7) } : p
        )
      };
    });
    if (ordersPatched) {
      localStorage.setItem(ordersKey, JSON.stringify(loadedOrders));
    }

    setOrders(loadedOrders);

    // 4. Technicians
    let loadedTechnicians: Technician[] = [];
    if (storedTechnicians) {
      const parsed = JSON.parse(storedTechnicians);
      loadedTechnicians = parsed.map((t: any) => ({
        ...t,
        category: t.category || 'Taller'
      }));
    } else {
      loadedTechnicians = [{
        id: `tech-${Date.now()}-self`,
        name: activeUser.name,
        category: 'Taller',
        createdAt: new Date().toISOString()
      }];
    }
    setTechnicians(loadedTechnicians);

    // 5. Delay config
    let loadedDelay: DelayConfig = { pendingThresholdDays: 2, readyThresholdDays: 5 };
    if (storedDelayConfig) {
      loadedDelay = JSON.parse(storedDelayConfig);
    } else {
      localStorage.setItem(delayKey, JSON.stringify(loadedDelay));
    }
    setDelayConfig(loadedDelay);

    // 6. Budgets
    const budgetsKey = `crm_${tenantId}_budgets`;
    const storedBudgets = localStorage.getItem(budgetsKey);
    let loadedBudgets: Budget[] = [];
    if (storedBudgets) {
      loadedBudgets = JSON.parse(storedBudgets);
    } else {
      loadedBudgets = [];
    }
    setBudgets(loadedBudgets);

      // Set the loaded tenant identifier to coordinate subsequent updates and prevent cross-writes
      setLoadedTenantId(tenantId);

      // Auto-migrate localStorage data to API
      const lsOrders = localStorage.getItem(`crm_${tenantId}_orders`);
      const lsClients = localStorage.getItem(`crm_${tenantId}_clients`);
      if (lsClients && JSON.parse(lsClients).length > 0) {
        const migrationData = {
          clients: JSON.parse(lsClients),
          orders: lsOrders ? JSON.parse(lsOrders) : [],
          inventory: localStorage.getItem(`crm_${tenantId}_inventory`) ? JSON.parse(localStorage.getItem(`crm_${tenantId}_inventory`)!) : [],
          technicians: localStorage.getItem(`crm_${tenantId}_technicians`) ? JSON.parse(localStorage.getItem(`crm_${tenantId}_technicians`)!) : [],
          budgets: localStorage.getItem(`crm_${tenantId}_budgets`) ? JSON.parse(localStorage.getItem(`crm_${tenantId}_budgets`)!) : [],
          settings: {
            exchangeRate: localStorage.getItem(`crm_${tenantId}_exchange_rate`) || '1050',
            categoryMargins: localStorage.getItem(`crm_${tenantId}_category_margins`) || '{}',
            delayConfig: localStorage.getItem(`crm_${tenantId}_delay_config`) || '{}',
            workshopName: localStorage.getItem(`crm_${tenantId}_workshop_name`) || '',
            workshopLogo: localStorage.getItem(`crm_${tenantId}_workshop_logo`) || '',
            logoPosition: localStorage.getItem(`crm_${tenantId}_logo_position`) || 'side',
            ticketTitle: localStorage.getItem(`crm_${tenantId}_ticket_title`) || '',
            ticketSub: localStorage.getItem(`crm_${tenantId}_ticket_sub`) || '',
            ticketTerms: localStorage.getItem(`crm_${tenantId}_ticket_terms`) || '',
          }
        };
        api.migrate(migrationData).then(() => {
          console.log('Data migrated from localStorage to SQLite successfully');
        }).catch(err => {
          console.warn('Migration to API failed (server might not be running):', err.message);
        });
      }
    };

    loadFromAPI();
    return () => { cancelled = true; };
  }, [tenantId]);

  const updateDelayConfig = (newConfig: DelayConfig) => {
    setDelayConfig(newConfig);
    api.settings.set('delayConfig', JSON.stringify(newConfig)).catch(console.error);
  };

  // Calculate statistics whenever data changes
  useEffect(() => {
    if (!activeUser || loadedTenantId !== tenantId) return;

    // Calculate dynamic stats
    const pendingCount = orders.filter(o => o.status === 'Ingresado').length;
    const inRepairCount = orders.filter(o => o.status === 'En Reparación').length;
    const readyCount = orders.filter(o => o.status === 'Listo').length;
    const deliveredCount = orders.filter(o => o.status === 'Entregado').length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getOrderBillingDate = (o: Order): Date => {
      if (o.statusHistory && o.statusHistory.length > 0) {
        const entregadoEntry = [...o.statusHistory].reverse().find(e => e.status === 'Entregado');
        if (entregadoEntry) return new Date(entregadoEntry.timestamp);
        return new Date(o.statusHistory[o.statusHistory.length - 1].timestamp);
      }
      return new Date(o.updatedAt || o.createdAt);
    };

    let monthlyProfit = 0;
    const monthlyRevenue = orders
      .filter(o => {
        if (o.status !== 'Entregado' && o.paymentStatus !== 'Pagado') return false;
        const billingDate = getOrderBillingDate(o);
        return billingDate.getMonth() === currentMonth && billingDate.getFullYear() === currentYear;
      })
      .reduce((sum, o) => {
        const partsCostSum = o.partsUsed.reduce((partsSum, p) => {
          const pCost = p.costPrice !== undefined ? p.costPrice : Math.round(p.price * 0.7);
          return partsSum + (pCost * p.quantity);
        }, 0);

        monthlyProfit += (o.totalCost - partsCostSum);
        return sum + o.totalCost;
      }, 0);

    const activeTickets = orders.filter(o => o.status !== 'Entregado').length;

    setStats({
      pendingCount,
      inRepairCount,
      readyCount,
      deliveredCount,
      monthlyRevenue,
      monthlyProfit,
      activeTickets
    });
  }, [orders, clients, inventory, budgets, loadedTenantId, tenantId]);

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setClients(prev => [...prev, newClient]);
    api.clients.create(newClient).catch(console.error);
    return newClient;
  };

  const addOrder = (orderData: {
    clientId: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber: string;
    description: string;
    reportedProblem?: string;
    plannedWork?: string;
    priority: OrderPriority;
    assignedTechnician: string;
    laborCost: number;
    estimatedDelivery?: string;
    devicePassword?: string;
    devicePattern?: string;
  }): Order => {
    // Find client details
    const client = clients.find(c => c.id === orderData.clientId);
    if (!client) {
      throw new Error('Cliente no registrado en el sistema.');
    }

    // Generate Order ID TS-100X
    const lastNum = orders.reduce((max, order) => {
      const match = order.id.match(/TS-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1000);

    const nextId = `TS-${lastNum + 1}`;
    const nowStr = new Date().toISOString();
    
    const newOrder: Order = {
      id: nextId,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone || '',
      deviceType: orderData.deviceType,
      brand: orderData.brand,
      model: orderData.model,
      serialNumber: orderData.serialNumber || 'S/N',
      description: orderData.reportedProblem || orderData.description,
      reportedProblem: orderData.reportedProblem || orderData.description,
      plannedWork: orderData.plannedWork || '',
      diagnosticNotes: '',
      workPerformed: '',
      status: 'Ingresado',
      priority: orderData.priority,
      assignedTechnician: orderData.assignedTechnician,
      partsUsed: [],
      laborCost: Number(orderData.laborCost) || 0,
      totalCost: Number(orderData.laborCost) || 0,
      estimatedDelivery: orderData.estimatedDelivery || '',
      devicePassword: orderData.devicePassword || '',
      devicePattern: orderData.devicePattern || '',
      paymentStatus: 'Pendiente',
      amountPaid: 0,
      statusHistory: [{ status: 'Ingresado', timestamp: nowStr }],
      createdAt: nowStr,
      updatedAt: nowStr
    };

    setOrders(prev => [newOrder, ...prev]);
    api.orders.create(newOrder).catch(console.error);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;

        const now = new Date().toISOString();
        const history = [...(order.statusHistory || [{ status: 'Ingresado' as OrderStatus, timestamp: order.createdAt }])];
        const lastEntry = history[history.length - 1];
        if (!lastEntry || lastEntry.status !== status) {
          history.push({ status, timestamp: now });
        }

        return {
          ...order,
          status,
          statusHistory: history,
          updatedAt: now
        };
      })
    );
    api.orders.updateStatus(orderId, status).catch(console.error);
  };

  const updateOrderDetails = (orderId: string, data: Partial<Order>) => {
    const apiData = { ...data };
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;

        const now = new Date().toISOString();
        const merged = { ...order, ...data, updatedAt: now };

        // Recalculate totalCost if parts or labor cost updated
        if (data.partsUsed !== undefined || data.laborCost !== undefined) {
          const partsSum = merged.partsUsed.reduce((sum, p) => sum + (p.price * p.quantity), 0);
          merged.totalCost = Number(merged.laborCost) + partsSum;
          apiData.totalCost = merged.totalCost;
        }

        // Track state transitions if status is updated inside the general details
        if (data.status !== undefined && data.status !== order.status) {
          const history = [...(order.statusHistory || [{ status: 'Ingresado' as OrderStatus, timestamp: order.createdAt }])];
          const lastEntry = history[history.length - 1];
          if (!lastEntry || lastEntry.status !== data.status) {
            history.push({ status: data.status, timestamp: now });
          }
          merged.statusHistory = history;
        }

        return merged;
      })
    );
    api.orders.update(orderId, apiData).catch(console.error);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    api.orders.delete(orderId).catch(console.error);
  };

  const addPartToOrder = (orderId: string, partId: string, quantity: number): boolean => {
    const part = inventory.find(p => p.id === partId);
    if (!part || part.stock < quantity) return false;

    // Deduct stock
    setInventory(prevInv =>
      prevInv.map(p =>
        p.id === partId ? { ...p, stock: p.stock - quantity } : p
      )
    );

    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id !== orderId) return order;

        // Check if part already added
        const existingPartIdx = order.partsUsed.findIndex(p => p.id === partId);
        let updatedParts: OrderPart[] = [...order.partsUsed];

        if (existingPartIdx > -1) {
          updatedParts[existingPartIdx] = {
            ...updatedParts[existingPartIdx],
            quantity: updatedParts[existingPartIdx].quantity + quantity
          };
        } else {
          updatedParts.push({
            id: partId,
            name: part.name,
            price: part.price,
            costPrice: part.costPrice !== undefined ? part.costPrice : Math.round(part.price * 0.7),
            quantity
          });
        }

        const labor = Number(order.laborCost) || 0;
        const partsSum = updatedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const totalCost = labor + partsSum;

        return {
          ...order,
          partsUsed: updatedParts,
          totalCost,
          updatedAt: new Date().toISOString()
        };
      })
    );

    // Sync both inventory and order to API
    const updatedPart = inventory.find(p => p.id === partId);
    if (updatedPart) {
      api.inventory.update(partId, { stock: updatedPart.stock - quantity }).catch(console.error);
    }
    // Order will be synced via the state update above triggering a full order update
    const currentOrder = orders.find(o => o.id === orderId);
    if (currentOrder) {
      api.orders.update(orderId, { partsUsed: currentOrder.partsUsed, totalCost: currentOrder.totalCost }).catch(console.error);
    }

    return true;
  };

  const removePartFromOrder = (orderId: string, partId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const ordPart = order.partsUsed.find(p => p.id === partId);
    if (!ordPart) return;

    // Restore stock
    setInventory(prevInv =>
      prevInv.map(p =>
        p.id === partId ? { ...p, stock: p.stock + ordPart.quantity } : p
      )
    );

    setOrders(prevOrders =>
      prevOrders.map(o => {
        if (o.id !== orderId) return o;

        const updatedParts = o.partsUsed.filter(p => p.id !== partId);
        const labor = Number(o.laborCost) || 0;
        const partsSum = updatedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const total = labor + partsSum;

        return {
          ...o,
          partsUsed: updatedParts,
          totalCost: total,
          updatedAt: new Date().toISOString()
        };
      })
    );
    if (ordPart) {
      const invItem = inventory.find(p => p.id === partId);
      if (invItem) api.inventory.update(partId, { stock: invItem.stock + ordPart.quantity }).catch(console.error);
    }
  };

  const addInventoryItem = (itemData: Omit<SparePartInventoryItem, 'id'>) => {
    const newItem: SparePartInventoryItem = {
      ...itemData,
      id: `part-${Date.now()}`
    };
    setInventory(prev => [...prev, newItem]);
    api.inventory.create(newItem).catch(console.error);
  };

  const updateInventoryItem = (itemId: string, data: Partial<SparePartInventoryItem>) => {
    setInventory(prev =>
      prev.map(item => (item.id === itemId ? { ...item, ...data } : item))
    );
    api.inventory.update(itemId, data).catch(console.error);
  };

  const deleteInventoryItem = (itemId: string) => {
    setInventory(prev => prev.filter(item => item.id !== itemId));
    api.inventory.delete(itemId).catch(console.error);
  };

  const updateClientDetails = (clientId: string, data: Partial<Client>) => {
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, ...data } : c))
    );
    api.clients.update(clientId, data).catch(console.error);
    // Cascade changes to any orders caching these client info fields
    setOrders(prev =>
      prev.map(order => {
        if (order.clientId === clientId) {
          const updated = {
            ...order,
            clientName: data.name !== undefined ? data.name : order.clientName,
            clientPhone: data.phone !== undefined ? data.phone : order.clientPhone
          };
          api.orders.update(order.id, { clientName: updated.clientName, clientPhone: updated.clientPhone }).catch(console.error);
          return updated;
        }
        return order;
      })
    );
  };

  const searchClientsPredictive = (query: string): Client[] => {
    if (!query.trim()) return [];
    const normalized = query.toLowerCase();
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(normalized) ||
        (c.phone && c.phone.includes(normalized)) ||
        (c.documentId && c.documentId.toLowerCase().includes(normalized))
    );
  };

  const deleteClientWithData = (
    clientId: string,
    mode: 'only_services' | 'services_and_equipments' | 'all'
  ) => {
    if (mode === 'only_services') {
      setOrders(prev =>
        prev.map(order => {
          if (order.clientId === clientId) {
            return {
              ...order,
              partsUsed: [],
              laborCost: 0,
              totalCost: 0,
              diagnosticNotes: '',
              workPerformed: '',
              status: 'Ingresado' as OrderStatus,
              updatedAt: new Date().toISOString()
            };
          }
          return order;
        })
      );
    } else if (mode === 'services_and_equipments') {
      orders.filter(o => o.clientId === clientId).forEach(o => api.orders.delete(o.id).catch(console.error));
      setOrders(prev => prev.filter(order => order.clientId !== clientId));
    } else if (mode === 'all') {
      orders.filter(o => o.clientId === clientId).forEach(o => api.orders.delete(o.id).catch(console.error));
      setOrders(prev => prev.filter(order => order.clientId !== clientId));
      setClients(prev => prev.filter(c => c.id !== clientId));
      api.clients.delete(clientId).catch(console.error);
    }
  };

  const addTechnician = (techData: Omit<Technician, 'id' | 'createdAt'>): Technician => {
    const trimmedName = techData.name.trim();
    if (technicians.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('Este técnico ya se encuentra registrado.');
    }
    const newTech: Technician = {
      ...techData,
      name: trimmedName,
      id: `tech-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    setTechnicians(prev => [...prev, newTech]);
    api.technicians.create(newTech).catch(console.error);
    return newTech;
  };

  const deleteTechnician = (id: string) => {
    setTechnicians(prev => prev.filter(t => t.id !== id));
    api.technicians.delete(id).catch(console.error);
  };

  const updateTechnician = (id: string, data: Partial<Technician>) => {
    if (data.name) {
      const trimmedName = data.name.trim();
      if (technicians.some(t => t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== id)) {
        throw new Error('Ya existe un técnico con este nombre.');
      }
    }

    let oldName = '';
    const newName = data.name ? data.name.trim() : '';

    setTechnicians(prev => prev.map(t => {
      if (t.id === id) {
        oldName = t.name;
        return { ...t, ...data, name: newName || t.name };
      }
      return t;
    }));
    api.technicians.update(id, { ...data, name: newName || undefined }).catch(console.error);

    // Cascade rename to existing orders matching the old assignedTechnician
    if (oldName && newName && oldName !== newName) {
      setOrders(prev =>
        prev.map(order =>
          order.assignedTechnician === oldName
            ? { ...order, assignedTechnician: newName, updatedAt: new Date().toISOString() }
            : order
        )
      );
    }
  };

  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const isUndoRedoActive = React.useRef(false);
  const isFirstLoad = React.useRef(true);
  const isLoaded = activeUser && loadedTenantId === tenantId;
  const prevState = React.useRef({orders, clients, inventory});

  const getDiffDescription = (prev: {orders: Order[], clients: Client[], inventory: SparePartInventoryItem[]}, current: {orders: Order[], clients: Client[], inventory: SparePartInventoryItem[]}) => {
    if (current.orders.length > prev.orders.length) {
      const newOrder = current.orders.find(o => !prev.orders.some(p => p.id === o.id));
      if (newOrder) return `Nuevo service creado: ${newOrder.brand} ${newOrder.model}`;
    }
    if (current.orders.length < prev.orders.length) {
      const delOrder = prev.orders.find(o => !current.orders.some(p => p.id === o.id));
      if (delOrder) return `Service eliminado: de ${delOrder.clientName}`;
    }
    
    if (current.clients.length > prev.clients.length) {
      const newClient = current.clients.find(c => !prev.clients.some(p => p.id === c.id));
      if (newClient) return `Nuevo cliente creado: ${newClient.name}`;
    }
    if (current.clients.length < prev.clients.length) {
      const delClient = prev.clients.find(c => !current.clients.some(p => p.id === c.id));
      if (delClient) return `Cliente eliminado: ${delClient.name}`;
    }

    for (const currOrd of current.orders) {
      const prevOrd = prev.orders.find(o => o.id === currOrd.id);
      if (prevOrd) {
        if (prevOrd.status !== currOrd.status) {
          if (currOrd.status === 'Entregado') {
            return `Service de ${currOrd.clientName} finalizado y entregado`;
          }
          return `Service de ${currOrd.clientName} cambió a ${currOrd.status}`;
        }
        if (prevOrd.priority !== currOrd.priority) {
          return `Prioridad de service de ${currOrd.clientName} cambiada a ${currOrd.priority}`;
        }
        if (prevOrd.totalCost !== currOrd.totalCost || prevOrd.partsUsed.length !== currOrd.partsUsed.length) {
          return `Costos/Repuestos actualizados del service de ${currOrd.clientName}`;
        }
        if (JSON.stringify(prevOrd) !== JSON.stringify(currOrd)) {
          return `Service editado: de ${currOrd.clientName}`;
        }
      }
    }

    for (const currCli of current.clients) {
      const prevCli = prev.clients.find(c => c.id === currCli.id);
      if (prevCli) {
        if (JSON.stringify(prevCli) !== JSON.stringify(currCli)) {
          return `Cliente editado: ${currCli.name}`;
        }
      }
    }

    if (current.inventory.length !== prev.inventory.length || JSON.stringify(current.inventory) !== JSON.stringify(prev.inventory)) {
      return `Inventario actualizado`;
    }

    return "Cambio en el sistema";
  };

  useEffect(() => {
    if (!isLoaded) return;
    
    if (isFirstLoad.current) {
      prevState.current = {orders, clients, inventory};
      isFirstLoad.current = false;
      return;
    }

    if (isUndoRedoActive.current) {
      // Allow new states to be recorded again after a short delay
      setTimeout(() => {
        isUndoRedoActive.current = false;
        prevState.current = {orders, clients, inventory};
      }, 50);
      return;
    } 

    const desc = getDiffDescription(prevState.current, {orders, clients, inventory});
    
    const newEntry: ActionHistoryEntry = {
      id: Math.random().toString(36).substring(2, 9),
      description: desc,
      timestamp: new Date().toISOString(),
      state: prevState.current
    };

    setActionHistory(prev => {
      const history = [...prev, newEntry];
      if (history.length > 5) return history.slice(history.length - 5);
      return history;
    });
    
    prevState.current = {orders, clients, inventory};
  }, [orders, clients, inventory, isLoaded]);

  const undo = React.useCallback(() => {
    setActionHistory(prev => {
      if (prev.length === 0) return prev;
      const historyCopy = [...prev];
      const previous = historyCopy.pop()!;
      
      isUndoRedoActive.current = true;
      setOrders(previous.state.orders);
      setClients(previous.state.clients);
      setInventory(previous.state.inventory);
      
      showToast('Se ha deshecho la última acción', 'info');
      return historyCopy;
    });
  }, [showToast]);

  const undoToPoint = React.useCallback((historyId: string) => {
    setActionHistory(prev => {
      const targetIndex = prev.findIndex(entry => entry.id === historyId);
      if (targetIndex === -1) return prev;
      
      const targetEntry = prev[targetIndex];
      // Keep everything before the target entry
      const newHistory = prev.slice(0, targetIndex);
      
      isUndoRedoActive.current = true;
      setOrders(targetEntry.state.orders);
      setClients(targetEntry.state.clients);
      setInventory(targetEntry.state.inventory);
      
      showToast('Estado revertido exitosamente', 'info');
      return newHistory;
    });
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
          return; // Don't undo if user is typing
        }
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const updateWorkshopSettings = (settings: {
    name?: string;
    logo?: string;
    logoPosition?: 'side' | 'top';
    ticketTitle?: string;
    ticketSub?: string;
    ticketTerms?: string;
  }) => {
    const apiUpdates: Record<string, string> = {};
    if (settings.name !== undefined) {
      setWorkshopName(settings.name);
      apiUpdates.workshopName = settings.name;
    }
    if (settings.logo !== undefined) {
      setWorkshopLogo(settings.logo);
      apiUpdates.workshopLogo = settings.logo;
    }
    if (settings.logoPosition !== undefined) {
      setLogoPosition(settings.logoPosition);
      apiUpdates.logoPosition = settings.logoPosition;
    }
    if (settings.ticketTitle !== undefined) {
      setTicketTitle(settings.ticketTitle);
      apiUpdates.ticketTitle = settings.ticketTitle;
    }
    if (settings.ticketSub !== undefined) {
      setTicketSub(settings.ticketSub);
      apiUpdates.ticketSub = settings.ticketSub;
    }
    if (settings.ticketTerms !== undefined) {
      setTicketTerms(settings.ticketTerms);
      apiUpdates.ticketTerms = settings.ticketTerms;
    }
    if (Object.keys(apiUpdates).length > 0) {
      api.settings.bulkSet(apiUpdates).catch(console.error);
    }
  };

  const addBudget = (budgetData: {
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    deviceType?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    items: BudgetItem[];
    status: BudgetStatus;
    notes?: string;
    validUntil?: string;
    type?: 'servicio' | 'simple';
    orderId?: string;
  }) => {
    const baseNum = 1001;
    const count = budgets.length;
    const nextNum = baseNum + count;
    let id = `PR-${nextNum}`;
    while (budgets.some(b => b.id === id)) {
      id = `PR-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const totalCost = budgetData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newBudget: Budget = {
      id,
      ...budgetData,
      totalCost,
      createdAt: new Date().toISOString()
    };

    setBudgets(prev => [newBudget, ...prev]);
    api.budgets.create(newBudget).catch(console.error);
    showToast(`Presupuesto ${id} creado con éxito`, 'success');
    return newBudget;
  };

  const updateBudgetStatus = (budgetId: string, status: BudgetStatus) => {
    setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, status } : b));
    api.budgets.update(budgetId, { status }).catch(console.error);
    showToast(`Estado de presupuesto actualizado`, 'success');
  };

  const updateBudgetDetails = (budgetId: string, data: Partial<Budget>) => {
    setBudgets(prev => prev.map(b => {
      if (b.id === budgetId) {
        const merged = { ...b, ...data };
        if (data.items) {
          merged.totalCost = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
        return merged;
      }
      return b;
    }));
    api.budgets.update(budgetId, data).catch(console.error);
    showToast(`Presupuesto actualizado`, 'success');
  };

  const deleteBudget = (budgetId: string) => {
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
    api.budgets.delete(budgetId).catch(console.error);
    showToast(`Presupuesto eliminado`, 'info');
  };

  const convertBudgetToOrder = (budgetId: string, assignedTechnician: string, priority: OrderPriority) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) {
      showToast('No se encontró el presupuesto', 'error');
      return null;
    }

    let clientId = budget.clientId;
    if (!clientId) {
      const existingClient = clients.find(c => c.name.trim().toLowerCase() === budget.clientName.trim().toLowerCase());
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = addClient({
          name: budget.clientName,
          phone: budget.clientPhone || '',
          comments: 'Creado desde presupuesto ' + budget.id
        });
        clientId = newClient.id;
      }
    }

    const spares = budget.items
      .filter(item => item.type === 'repuesto')
      .map(item => ({
        id: item.id || `pt-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

    const labor = budget.items
      .filter(item => item.type === 'mano_obra')
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const plannedWorkText = budget.items.filter(i => i.type === 'mano_obra').map(i => i.name).join('\n') || 'Según presupuesto ' + budget.id;

    // Check if budget is linked to an existing order
    const existingOrder = budget.orderId ? orders.find(o => o.id === budget.orderId) : null;

    let targetOrderId: string;

    if (existingOrder) {
      // Update the existing order instead of creating a new one
      const updatedParts = [...(existingOrder.partsUsed || [])];
      spares.forEach(sp => {
        if (!updatedParts.some(p => p.name.trim().toLowerCase() === sp.name.trim().toLowerCase())) {
          updatedParts.push({ id: sp.id, name: sp.name, price: sp.price, quantity: sp.quantity });
        }
      });
      const totalCost = (existingOrder.laborCost || 0) + labor + updatedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const currentPlanned = existingOrder.plannedWork || '';
      const mergedPlanned = currentPlanned ? currentPlanned + '\n' + plannedWorkText : plannedWorkText;

      updateOrderDetails(existingOrder.id, {
        laborCost: (existingOrder.laborCost || 0) + labor,
        assignedTechnician: assignedTechnician || existingOrder.assignedTechnician,
        plannedWork: mergedPlanned,
      });

      setOrders(prev => prev.map(o => {
        if (o.id === existingOrder.id) {
          return { ...o, partsUsed: updatedParts, totalCost, plannedWork: mergedPlanned, laborCost: (existingOrder.laborCost || 0) + labor };
        }
        return o;
      }));

      targetOrderId = existingOrder.id;
    } else {
      // Create a new order
      const orderData = {
        clientId: clientId || '',
        deviceType: budget.deviceType || 'Notebook',
        brand: budget.brand || '',
        model: budget.model || '',
        serialNumber: budget.serialNumber || '',
        description: `Reparación presupuestada según ${budget.id}. ` + (budget.notes || ''),
        reportedProblem: budget.notes || '',
        plannedWork: plannedWorkText,
        priority,
        assignedTechnician,
        laborCost: labor,
        estimatedDelivery: budget.validUntil || ''
      };

      const newOrder = addOrder(orderData);
      targetOrderId = newOrder.id;

      if (spares.length > 0) {
        setOrders(prev => prev.map(o => {
          if (o.id === newOrder.id) {
            const updatedParts = [...(o.partsUsed || [])];
            spares.forEach(sp => {
              updatedParts.push({ id: sp.id, name: sp.name, price: sp.price, quantity: sp.quantity });
            });
            const totalCost = labor + updatedParts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
            return { ...o, partsUsed: updatedParts, totalCost };
          }
          return o;
        }));
      }
    }

    // Deduct stock for spares
    if (spares.length > 0) {
      setInventory(prevInv => {
        const currentInv = [...prevInv];
        spares.forEach(sp => {
          const invIdx = currentInv.findIndex(p => p.name.trim().toLowerCase() === sp.name.trim().toLowerCase());
          if (invIdx > -1) {
            currentInv[invIdx] = { ...currentInv[invIdx], stock: Math.max(0, currentInv[invIdx].stock - sp.quantity) };
          }
        });
        return currentInv;
      });
    }

    setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, status: 'Aprobado', convertedToOrderId: targetOrderId } : b));
    showToast(`Presupuesto ${existingOrder ? 'vinculado al' : 'convertido a'} Ticket ${targetOrderId}`, 'success');
    return targetOrderId;
  };

  return (
    <CRMContext.Provider
      value={{
        orders,
        clients,
        inventory,
        budgets,
        stats,
        delayConfig,
        updateDelayConfig,
        exchangeRate,
        updateExchangeRate,
        categoryMargins,
        updateCategoryMargin,
        addCategory,
        deleteCategory,
        renameCategory,
        toasts,
        showToast,
        removeToast,
        workshopName,
        workshopLogo,
        logoPosition,
        ticketTitle,
        ticketSub,
        ticketTerms,
        updateWorkshopSettings,
        addOrder,
        updateOrderStatus,
        updateOrderDetails,
        deleteOrder,
        addClient,
        updateClientDetails,
        addPartToOrder,
        removePartFromOrder,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        searchClientsPredictive,
        deleteClientWithData,
        technicians,
        addTechnician,
        deleteTechnician,
        updateTechnician,
        undo,
        canUndo: actionHistory.length > 0,
        actionHistory,
        undoToPoint,
        addBudget,
        updateBudgetStatus,
        updateBudgetDetails,
        deleteBudget,
        convertBudgetToOrder
      }}
    >
      {children}
    </CRMContext.Provider>

  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
