import React, { useState } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { ClientList } from './components/ClientList';
import { InventoryManager } from './components/InventoryManager';
import { TechnicianList } from './components/TechnicianList';
import { HistoryModule } from './components/HistoryModule';
import { AdminPanel } from './components/AdminPanel';
import { BudgetModule } from './components/BudgetModule';
import { LoginScreen } from './components/LoginScreen';
import { OrderStatus } from './types';
import {
  Bell,
  CalendarClock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  X
} from 'lucide-react';

function CRMAppContent() {
  const { user } = useAuth();
  const { stats, toasts, removeToast } = useCRM();

  const [activeTab, setActiveTab] = useState<string>(
    user?.role === 'admin' ? 'admin' : 'dashboard'
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeOrderStatusTab, setActiveOrderStatusTab] = useState<OrderStatus>('Ingresado');
  const [openNewOrderModal, setOpenNewOrderModal] = useState(false);

  const handleSetActiveTab = (tab: string) => {
    if (tab === 'new-service') {
      setOpenNewOrderModal(true);
      setActiveTab('kanban');
    } else {
      setActiveTab(tab);
    }
  };

  // Render current active tab component
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setActiveTab={handleSetActiveTab} 
            setSelectedOrderId={setSelectedOrderId} 
            setActiveOrderTab={setActiveOrderStatusTab} 
          />
        );
      case 'kanban':
        return (
          <KanbanBoard 
            selectedOrderId={selectedOrderId}
            setSelectedOrderId={setSelectedOrderId}
            activeOrderTab={activeOrderStatusTab}
            setActiveOrderTab={setActiveOrderStatusTab}
            setActiveTab={handleSetActiveTab}
            openNewOrderModal={openNewOrderModal}
            setOpenNewOrderModal={setOpenNewOrderModal}
          />
        );
      case 'clients':
        return (
          <ClientList 
            setActiveTab={handleSetActiveTab} 
            setSelectedOrderId={setSelectedOrderId} 
            setActiveOrderTab={setActiveOrderStatusTab} 
          />
        );
      case 'inventory':
        return <InventoryManager />;
      case 'budgets':
        return <BudgetModule />;
      case 'technicians':
        return <TechnicianList />;
      case 'history':
        return <HistoryModule />;
      case 'admin':
        return user?.role === 'admin' ? <AdminPanel /> : <Dashboard setActiveTab={handleSetActiveTab} setSelectedOrderId={setSelectedOrderId} setActiveOrderTab={setActiveOrderStatusTab} />;
      default:
        return <Dashboard setActiveTab={handleSetActiveTab} setSelectedOrderId={setSelectedOrderId} setActiveOrderTab={setActiveOrderStatusTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans select-none">
      
      {/* Main app body layout */}
      <div className="flex flex-1 h-full w-full overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} />

        {/* Main Workspace Frame */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Core Top bar header */}
          <header id="app-topbar" className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1.5 font-sans font-bold text-slate-700 text-xs">
              <span>Terminal:</span>
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-mono font-bold text-[10px]">
                LAB-01-ACTIVO
              </span>
              <span className="ml-3 hidden xs:inline text-slate-400 font-medium">Session:</span>
              <span className="hidden xs:inline bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono font-semibold text-[10px] capitalize">
                {user?.role}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick status pill */}
              <div className="hidden sm:flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-500 font-semibold">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                <span>Fecha: {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              {/* Notification alert */}
              <div className="relative p-1.5 hover:bg-slate-100 transition rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <Bell className="h-4.5 w-4.5" />
                {stats.pendingCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                )}
              </div>

              <div className="h-5 w-[1px] bg-slate-200"></div>

              {/* License verification */}
              <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Licencia Autorizada</span>
              </div>
            </div>
          </header>

          {/* Dynamic content canvas */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100/55 scroll-smooth">
            {renderTabContent()}
          </main>
        </div>
      </div>

      {/* Floating Toast notifications container */}
      <div id="toasts-container" className="fixed bottom-6 right-6 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-white border-slate-200';
          let iconColor = 'text-indigo-500';
          let IconComp = Info;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50/95 border-emerald-200/80 shadow-md shadow-emerald-500/5 backdrop-blur-xs';
            iconColor = 'text-emerald-600';
            IconComp = CheckCircle2;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50/95 border-rose-200/80 shadow-md shadow-rose-500/5 backdrop-blur-xs';
            iconColor = 'text-rose-600';
            IconComp = AlertCircle;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-50/95 border-amber-200/80 shadow-md shadow-amber-500/5 backdrop-blur-xs';
            iconColor = 'text-amber-600';
            IconComp = AlertCircle;
          }

          return (
            <div 
              key={toast.id}
              className={`flex items-start justify-between p-4 rounded-xl border ${bgClass} shadow-xl pointer-events-auto transition-all duration-300 animate-fade-in text-xs font-semibold`}
            >
              <div className="flex items-center space-x-3">
                <IconComp className={`${iconColor} h-5 w-5 shrink-0`} />
                <span className="text-slate-700 leading-normal">{toast.message}</span>
              </div>
              <button 
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition pl-3 cursor-pointer select-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white text-sm font-semibold animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <CRMAppContent key={user.id} />;
}

export default function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <AppContent />
      </CRMProvider>
    </AuthProvider>
  );
}
