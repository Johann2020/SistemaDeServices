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
      request<{ user: any }>('/auth/google', { method: 'POST', body: JSON.stringify({ code, redirectUri }) }),
    me: () => request<{ user: any }>('/auth/me'),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },
  clients: {
    list: () => request<any[]>('/clients'),
    get: (id: string) => request<any>(`/clients/${id}`),
    create: (data: any) => request<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => request<any[]>('/orders'),
    get: (id: string) => request<any>(`/orders/${id}`),
    create: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
    updateStatus: (id: string, status: string) => request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  inventory: {
    list: () => request<any[]>('/inventory'),
    create: (data: any) => request<any>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/inventory/${id}`, { method: 'DELETE' }),
  },
  technicians: {
    list: () => request<any[]>('/technicians'),
    create: (data: any) => request<any>('/technicians', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/technicians/${id}`, { method: 'DELETE' }),
  },
  budgets: {
    list: () => request<any[]>('/budgets'),
    create: (data: any) => request<any>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/budgets/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request<any[]>('/users'),
    create: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  },
  settings: {
    getAll: () => request<Record<string, string>>('/settings'),
    get: (key: string) => request<{ key: string; value: string }>(`/settings/${key}`),
    set: (key: string, value: string) => request<any>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
    bulkSet: (data: Record<string, string>) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  migrate: (data: any) => request<{ success: boolean; counts: any }>('/migrate', { method: 'POST', body: JSON.stringify(data) }),
  health: () => request<{ status: string }>('/health'),
};
