import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  Activity,
  User,
  ShieldCheck,
  LogOut,
  Undo2,
  FileText
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { stats, workshopName } = useCRM();
  const { user, logout } = useAuth();

  const activeUser = user;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'kanban', label: 'Services', icon: Wrench, badge: stats.pendingCount + stats.inRepairCount },
    { id: 'budgets', label: 'Presupuestos', icon: FileText, badge: null },
    { id: 'clients', label: 'Clientes', icon: Users, badge: null },
    { id: 'inventory', label: 'Repuestos', icon: Package, badge: null },
    { id: 'technicians', label: 'Técnicos', icon: User, badge: null },
    { id: 'history', label: 'Historial', icon: Undo2, badge: null }
  ];

  // If logged user is admin, allow visiting Admin Panel
  if (user?.role === 'admin') {
    menuItems.push({
      id: 'admin',
      label: 'Panel Administrador',
      icon: ShieldCheck,
      badge: null
    });
  }

  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getUserRoleLabel = (role: string) => {
    if (role === 'admin') return 'Administrador Taller';
    if (role === 'technician') return 'Técnico Especialista';
    return 'Lector Especialista';
  };

  return (
    <aside id="sidebar-container" className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shrink-0">
          <Activity className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="truncate">
          <h1 className="text-sm font-semibold tracking-tight leading-none text-white truncate font-display" title={workshopName || "Mecatrónika"}>
            {workshopName || "Mecatrónika"}
          </h1>
          <span className="text-[10px] text-slate-400 block mt-1 truncate">Tech CRM & Soporte</span>
        </div>
      </div>

      {/* User profile brief */}
      {activeUser && (
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/30 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
            {getInitials(activeUser.name)}
          </div>
          <div className="truncate">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase leading-tight">
              {getUserRoleLabel(activeUser.role)}
            </p>
            <p className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={activeUser.name}>
              {activeUser.name}
            </p>
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-2">Módulos de Taller</p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge > 0 && (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full leading-5 ${
                  isActive
                    ? 'bg-indigo-800 text-indigo-100'
                    : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 border-t border-slate-800/40 my-2 space-y-1.5">
          <button
            type="button"
            onClick={() => {
              if (confirmLogout) {
                logout();
              } else {
                setConfirmLogout(true);
                setTimeout(() => setConfirmLogout(false), 4000);
              }
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer font-bold text-left ${
              confirmLogout
                ? 'bg-rose-600/90 text-white shadow-md shadow-rose-600/10 animate-pulse'
                : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-400'
            }`}
          >
            <LogOut className={`h-4.5 w-4.5 shrink-0 transition-transform ${confirmLogout ? 'rotate-180' : ''}`} />
            <span>{confirmLogout ? '¿Confirmar Salida?' : 'Cerrar Sesión'}</span>
          </button>
        </div>
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-xs text-slate-400 space-y-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Base de datos local activa</span>
        </div>
        <p className="text-[11px] text-slate-500">Mecatrónika CRM v1.4.0</p>
      </div>
    </aside>
  );
};
