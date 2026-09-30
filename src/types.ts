export interface Client {
  id: string;
  name: string;
  phone?: string; // Telefono 1
  phone2?: string; // Telefono 2
  documentId?: string; // DNI/CUIT
  provincia?: string;
  localidad?: string;
  address?: string; // Direccion
  comments?: string; // Comentarios
  createdAt: string;
}

export interface Technician {
  id: string;
  name: string;
  phone?: string; // Telefono 1
  phone2?: string; // Telefono 2
  documentId?: string; // DNI/CUIT
  provincia?: string;
  localidad?: string;
  address?: string; // Direccion
  comments?: string; // Comentarios
  category?: 'Taller' | 'Externo'; // Tipo de técnico (Taller u Externo)
  createdAt: string;
}

export type OrderStatus = 'Ingresado' | 'En Reparación' | 'Listo' | 'Entregado';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
}

export type OrderPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type PaymentStatus = 'Pendiente' | 'Parcial' | 'Pagado';

export interface OrderPart {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
}

export interface Order {
  id: string; // Ticket number like TS-1001
  clientId: string;
  clientName: string; // Cached for easy lookup
  clientPhone: string;
  deviceType: string; // Laptop, Smartphone, Consola, etc.
  brand: string;
  model: string;
  serialNumber: string;
  description: string; // Problem statement
  reportedProblem?: string; // Problema reportado (Ingreso)
  plannedWork?: string; // Trabajos a realizar (Ingreso)
  devicePassword?: string; // Contraseña o PIN del dispositivo
  devicePattern?: string; // Patrón de desbloqueo (para Teléfono o Tablet)
  diagnosticNotes?: string; // Technician diagnosis
  workPerformed?: string; // Work done by technician
  status: OrderStatus;
  priority: OrderPriority;
  assignedTechnician: string;
  partsUsed: OrderPart[];
  laborCost: number; // Cost of repair work itself
  totalCost: number; // laborCost + sum(parts.price * parts.quantity)
  estimatedDelivery?: string;
  cancellationReason?: string; // Motivo de cancelación
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SparePartInventoryItem {
  id: string;
  name: string;
  sku: string;
  price: number; // Final sale price in ARS (computed or manual, saved for backward compatibility with system-wide billing/orders)
  category?: string; // e.g., 'Celular', 'Notebook', 'Pantalla', 'Disco SSD', etc.
  iva?: 'Exento' | '10.5%' | '21.0%';
  currency?: 'ARS' | 'USD';
  costPrice?: number; // Precio de costo
  pricingType?: 'margin' | 'manual'; // 'margin' for auto fixed percent, 'manual' for custom final price
  marginPercent?: number; // Ganancia %
  finalPrice?: number; // Precio final en moneda original (ARS o USD)
  stock: number;
  compatibleDevices?: string;
}

export interface CRMStats {
  pendingCount: number; // Ingresado
  inRepairCount: number; // En Reparación
  readyCount: number; // Listo
  deliveredCount: number; // Entregado
  monthlyRevenue: number;
  monthlyProfit: number; // Ganancia neta
  activeTickets: number; // Non-delivered ones
}

export interface DelayConfig {
  pendingThresholdDays: number;
  readyThresholdDays: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string; // only for credentials auth
  role: 'admin' | 'technician' | 'reader';
  status: 'pending' | 'approved' | 'deactivated';
  authMethod: 'credentials' | 'google';
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  type: 'repuesto' | 'mano_obra';
  price: number;
  quantity: number;
}

export type BudgetStatus = 'Borrador' | 'Enviado' | 'Aprobado' | 'Rechazado';

export interface Budget {
  id: string; // e.g., PR-1001
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  deviceType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  items: BudgetItem[];
  totalCost: number;
  status: BudgetStatus;
  notes?: string;
  createdAt: string;
  validUntil?: string;
  convertedToOrderId?: string;
  type?: 'servicio' | 'simple';
  orderId?: string;
}



