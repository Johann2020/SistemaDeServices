import type { Client, Order, SparePartInventoryItem, Technician, Budget } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  auth: {
    config: () => request<{ clientId: string }>('/auth/config'),
    google: (code: string, redirectUri: string) =>
      request<{ user: { id: string; email: string; name: string; tenantId: string; role: string } }>('/auth/google', { method: 'POST', body: JSON.stringify({ code, redirectUri }) }),
    me: () => request<{ user: { id: string; email: string; name: string; tenantId: string; role: string } }>('/auth/me'),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },
  clients: {
    list: () => request<Client[]>('/clients'),
    get: (id: string) => request<Client>(`/clients/${id}`),
    create: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => request<Order[]>('/orders'),
    get: (id: string) => request<Order>(`/orders/${id}`),
    create: (data: Partial<Order>) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Order>) => request<Order>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
    updateStatus: (id: string, status: string) => request<Order>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  inventory: {
    list: () => request<SparePartInventoryItem[]>('/inventory'),
    create: (data: Partial<SparePartInventoryItem>) => request<SparePartInventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SparePartInventoryItem>) => request<SparePartInventoryItem>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/inventory/${id}`, { method: 'DELETE' }),
  },
  technicians: {
    list: () => request<Technician[]>('/technicians'),
    create: (data: Partial<Technician>) => request<Technician>('/technicians', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Technician>) => request<Technician>(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/technicians/${id}`, { method: 'DELETE' }),
  },
  budgets: {
    list: () => request<Budget[]>('/budgets'),
    create: (data: Partial<Budget>) => request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Budget>) => request<Budget>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/budgets/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request<Array<{ id: string; name: string; email: string; role: string; status: string }>>('/users'),
    create: (data: Record<string, unknown>) => request<{ id: string; name: string; email: string; role: string }>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) => request<{ id: string; name: string; email: string; role: string }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  },
  settings: {
    getAll: () => request<Record<string, string>>('/settings'),
    get: (key: string) => request<{ key: string; value: string }>(`/settings/${key}`),
    set: (key: string, value: string) => request<{ success: boolean }>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
    bulkSet: (data: Record<string, string>) => request<{ success: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  migrate: (data: Record<string, unknown>) => request<{ success: boolean }>('/migrate', { method: 'POST', body: JSON.stringify(data) }),
  health: () => request<{ status: string }>('/health'),
};
