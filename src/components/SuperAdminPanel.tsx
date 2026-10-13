import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Crown, Users, FileText, Package, Wrench, User,
  LogIn, RefreshCw, BarChart3, Calendar, Clock
} from 'lucide-react';

interface AccountData {
  id: string;
  email: string;
  name: string;
  picture: string;
  tenantId: string;
  role: string;
  createdAt: string;
  stats: { clients: number; orders: number; inventory: number; technicians: number; budgets: number };
  loginStats: { total: number; today: number; last7: number; last30: number; lastLogin: string | null };
}

export const SuperAdminPanel: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.superadmin.accounts();
      setAccounts(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar cuentas');
    }
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleSwitchTenant = async (acc: AccountData) => {
    setSwitching(acc.id);
    try {
      await api.superadmin.switchTenant(acc.id);
      localStorage.setItem('superadmin_impersonating', acc.name);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar de cuenta');
      setSwitching(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'Nunca';
    try {
      return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const totalOrders = accounts.reduce((s, a) => s + a.stats.orders, 0);
  const totalClients = accounts.reduce((s, a) => s + a.stats.clients, 0);
  const totalLoginsToday = accounts.reduce((s, a) => s + a.loginStats.today, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-white">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Super Admin Panel</h1>
              <p className="text-sm text-slate-500">Gestión global de cuentas y tenants</p>
            </div>
          </div>
          <button
            onClick={loadAccounts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Global stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <Users className="h-3.5 w-3.5" />
              Cuentas Totales
            </div>
            <p className="text-2xl font-bold text-slate-800">{accounts.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <Wrench className="h-3.5 w-3.5" />
              Órdenes Totales
            </div>
            <p className="text-2xl font-bold text-indigo-600">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <User className="h-3.5 w-3.5" />
              Clientes Totales
            </div>
            <p className="text-2xl font-bold text-emerald-600">{totalClients}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Logins Hoy
            </div>
            <p className="text-2xl font-bold text-amber-600">{totalLoginsToday}</p>
          </div>
        </div>

        {/* Accounts table */}
        {loading && accounts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando cuentas...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700">Cuentas Registradas ({accounts.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {accounts.map(acc => (
                <div key={acc.id} className="px-5 py-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-4">
                    {/* Account info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {acc.picture ? (
                        <img src={acc.picture} alt="" className="h-10 w-10 rounded-full shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 font-bold text-sm">
                            {acc.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{acc.name}</p>
                        <p className="text-xs text-slate-500 truncate">{acc.email}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            Creada: {formatDate(acc.createdAt)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            Último login: {formatDateTime(acc.loginStats.lastLogin)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data stats */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <StatBadge icon={Wrench} label="Órdenes" value={acc.stats.orders} color="indigo" />
                        <StatBadge icon={User} label="Clientes" value={acc.stats.clients} color="emerald" />
                        <StatBadge icon={Package} label="Repuestos" value={acc.stats.inventory} color="blue" />
                        <StatBadge icon={FileText} label="Presup." value={acc.stats.budgets} color="purple" />
                        <StatBadge icon={BarChart3} label="Logins 30d" value={acc.loginStats.last30} color="amber" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      <button
                        onClick={() => handleSwitchTenant(acc)}
                        disabled={switching === acc.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                        title={`Ingresar al CRM de ${acc.name}`}
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        {switching === acc.id ? 'Ingresando...' : 'Ingresar'}
                      </button>
                    </div>
                  </div>

                  {/* Login activity mini bar */}
                  <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-400">
                    <span>Hoy: <strong className="text-slate-600">{acc.loginStats.today}</strong></span>
                    <span>7 días: <strong className="text-slate-600">{acc.loginStats.last7}</strong></span>
                    <span>30 días: <strong className="text-slate-600">{acc.loginStats.last30}</strong></span>
                    <span>Total: <strong className="text-slate-600">{acc.loginStats.total}</strong></span>
                    <span className="ml-auto font-mono text-slate-300 text-[9px]">{acc.tenantId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBadge: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`${colors[color] || colors.indigo} rounded-lg px-2 py-1.5 min-w-[52px]`} title={label}>
      <Icon className="h-3 w-3 mx-auto mb-0.5" />
      <p className="text-xs font-bold leading-none">{value}</p>
      <p className="text-[8px] mt-0.5 opacity-70 leading-none">{label}</p>
    </div>
  );
};
