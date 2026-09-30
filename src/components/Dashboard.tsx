import React from 'react';
import { useCRM } from '../context/CRMContext';
import { 
  Clock, 
  Wrench, 
  CheckCircle2, 
  DollarSign, 
  AlertTriangle, 
  UserCheck, 
  Smartphone, 
  Laptop, 
  Tv, 
  Gamepad2, 
  User,
  ArrowUpRight,
  Tablet,
  Monitor,
  Printer,
  Watch,
  Speaker,
  Microwave,
  Box
} from 'lucide-react';
import { OrderStatus, OrderPriority } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setSelectedOrderId: (id: string | null) => void;
  setActiveOrderTab: (tab: OrderStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  setActiveTab, 
  setSelectedOrderId,
  setActiveOrderTab
}) => {
  const { orders, stats, clients, delayConfig } = useCRM();

  const getOrderDelayStatus = (order: any) => {
    const now = new Date();
    
    if (order.status === 'Ingresado') {
      const createdDate = new Date(order.createdAt);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= delayConfig.pendingThresholdDays) {
        return { 
          isDelayed: true, 
          type: 'pending_delay', 
          label: `Revisión demorada`, 
          days: diffDays,
          color: 'bg-amber-100 text-amber-800 border-amber-200'
        };
      }
    } else if (order.status === 'Listo') {
      const updatedDate = new Date(order.updatedAt);
      const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= delayConfig.readyThresholdDays) {
        return { 
          isDelayed: true, 
          type: 'ready_delay', 
          label: `Retiro demorado`, 
          days: diffDays,
          color: 'bg-rose-100 text-rose-800 border-rose-200'
        };
      }
    }
    return { isDelayed: false, type: null, label: '', days: 0, color: '' };
  };

  const delayedOrders = orders
    .map(order => ({ ...order, delay: getOrderDelayStatus(order) }))
    .filter(o => o.delay.isDelayed);

  // Find urgent tickets: Status !== 'Entregado' and priority is 'Alta' or 'Crítica'
  const urgentOrders = orders
    .filter(o => o.status !== 'Entregado' && (o.priority === 'Alta' || o.priority === 'Crítica'))
    .slice(0, 5); // Take top 5

  // Unpaid/partially paid orders (Listo or Entregado with totalCost > 0)
  const unpaidOrders = orders
    .filter(o => {
      if (o.totalCost <= 0) return false;
      const ps = o.paymentStatus || 'Pendiente';
      if (ps === 'Pagado') return false;
      return o.status === 'Listo' || o.status === 'Entregado';
    })
    .sort((a, b) => {
      if (a.status === 'Entregado' && b.status !== 'Entregado') return -1;
      if (a.status !== 'Entregado' && b.status === 'Entregado') return 1;
      return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
    });


  // Calculate technicians workload:
  const technicianStats = orders
    .filter(o => o.status !== 'Entregado')
    .reduce((acc: { [key: string]: number }, order) => {
      const tech = order.assignedTechnician || 'Sin Asignar';
      acc[tech] = (acc[tech] || 0) + 1;
      return acc;
    }, {});

  // Group by Device Type for distribution
  const deviceStats = orders
    .filter(o => o.status !== 'Entregado')
    .reduce((acc: { [key: string]: number }, order) => {
      const type = order.deviceType || 'Otro';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

  const totalActiveDevices = (Object.values(deviceStats) as number[]).reduce((a, b) => a + b, 0);

  // Helper for priority color tags
  const getPriorityBadge = (priority: OrderPriority) => {
    switch (priority) {
      case 'Crítica':
        return 'bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20';
      case 'Alta':
        return 'bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20';
      case 'Media':
        return 'bg-blue-500/10 text-blue-600 border border-blue-200';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-200';
    }
  };

  // Helper for status colors
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Ingresado':
        return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
      case 'En Reparación':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Listo':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Entregado':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const handleViewOrder = (orderId: string, status: OrderStatus) => {
    setSelectedOrderId(orderId);
    setActiveOrderTab(status);
    setActiveTab('kanban');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Centro de Operaciones</h2>
          <p className="text-slate-500 text-sm">Resumen en tiempo real del taller de soporte técnico.</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Actualizado: Hace un momento</span>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 lg:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => { setActiveOrderTab('Ingresado'); setActiveTab('kanban'); }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Por Atender</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stats.pendingCount}</h3>
            </div>
            <div className="p-3 bg-zinc-100 rounded-xl text-zinc-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500 relative z-10">
            <span className="font-semibold text-zinc-600 mr-1.5">Equipos ingresados</span>
          </div>
        </div>

        {/* Metric 2 - En Reparación */}
        <div 
          onClick={() => { setActiveOrderTab('En Reparación'); setActiveTab('kanban'); }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">En Reparación</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stats.inRepairCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500 relative z-10">
            <span className="font-semibold text-blue-600 mr-1.5">En laboratorio</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => { setActiveOrderTab('Listo'); setActiveTab('kanban'); }}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Listos</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stats.readyCount}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500 relative z-10">
            <span className="font-semibold text-emerald-600 mr-1.5">Para entregar</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/10 rounded-full translate-x-8 -translate-y-8"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Facturado Mes</p>
              <h3 className="text-2xl font-bold text-white mt-3 tracking-tight">
                {stats.monthlyRevenue.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="p-3 bg-indigo-600/90 rounded-xl text-indigo-50">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-200 relative z-10">
            <span className="font-semibold text-white">Ingreso total</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-emerald-900 text-white rounded-xl p-5 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/10 rounded-full translate-x-8 -translate-y-8"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Ganancia Mes</p>
              <h3 className="text-2xl font-bold text-white mt-3 tracking-tight">
                {stats.monthlyProfit.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="p-3 bg-emerald-600/90 rounded-xl text-emerald-50">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-200 relative z-10">
            <span className="font-semibold text-white">Ganancia Neta</span>
          </div>
        </div>
      </div>

      {/* Delayed Orders / Alert Panel */}
      {delayedOrders.length > 0 && (
        <div className="bg-white border border-rose-100 rounded-xl p-5 shadow-xs animate-slide-down">
          <div className="flex items-center justify-between pb-3 border-b border-rose-100/60">
            <div className="flex items-center space-x-2 text-rose-700">
              <AlertTriangle className="h-5 w-5 animate-pulse text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Alertas de Demora en Taller ({delayedOrders.length})</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold font-sans">
              Límite: {delayConfig.pendingThresholdDays}d ingreso / {delayConfig.readyThresholdDays}d listo
            </span>
          </div>
          
          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {delayedOrders.slice(0, 6).map((order) => (
              <div 
                key={order.id}
                onClick={() => handleViewOrder(order.id, order.status)}
                className={`p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white group`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-indigo-650">{order.id}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${order.delay.color}`}>
                    {order.delay.label} ({order.delay.days}d)
                  </span>
                </div>
                
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-800 truncate">{order.brand} {order.model}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Cliente: {order.clientName}</p>
                </div>
                
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-indigo-600 font-semibold group-hover:text-indigo-800">
                  <span>Téc: {order.assignedTechnician}</span>
                  <span className="flex items-center space-x-0.5">
                    <span>Atender</span>
                    <ArrowUpRight className="h-3 w-3 text-indigo-500" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpaid Orders Reminder Panel */}
      {unpaidOrders.length > 0 && (
        <div className="bg-white border border-amber-100 rounded-xl p-5 shadow-xs animate-slide-down">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100/60">
            <div className="flex items-center space-x-2 text-amber-700">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Cobros Pendientes ({unpaidOrders.length})</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold font-sans">
              {unpaidOrders.reduce((sum, o) => {
                const paid = o.amountPaid || 0;
                return sum + (o.totalCost - paid);
              }, 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })} por cobrar
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {unpaidOrders.slice(0, 6).map((order) => {
              const paid = order.amountPaid || 0;
              const remaining = order.totalCost - paid;
              const isPartial = (order.paymentStatus || 'Pendiente') === 'Parcial';
              return (
                <div
                  key={order.id}
                  onClick={() => handleViewOrder(order.id, order.status)}
                  className="p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white group"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-indigo-650">{order.id}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      isPartial
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}>
                      {isPartial ? 'Pago parcial' : 'Sin pagar'}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <p className="text-xs font-bold text-slate-800 truncate">{order.brand} {order.model}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cliente: {order.clientName}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-[10px]">
                      <span className="text-slate-400">Resta: </span>
                      <span className="font-bold text-amber-600">
                        {remaining.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <span className="flex items-center space-x-0.5 text-[10px] text-indigo-600 font-semibold group-hover:text-indigo-800">
                      <span>Ver</span>
                      <ArrowUpRight className="h-3 w-3 text-indigo-500" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {unpaidOrders.length > 6 && (
            <p className="text-[10px] text-slate-400 mt-3 text-center font-semibold">
              +{unpaidOrders.length - 6} servicios más con cobro pendiente
            </p>
          )}
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Urgent tickets panel (Col Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">Atención Inmediata</h3>
            </div>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-700 rounded-full">
              {orders.filter(o => o.status !== 'Entregado' && (o.priority === 'Alta' || o.priority === 'Crítica')).length} Críticos Activos
            </span>
          </div>

          {urgentOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle2 className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-sm">No hay servicios críticos pendientes</p>
              <p className="text-xs text-slate-400 mt-1">¡Buen trabajo! Todas las órdenes de alta prioridad están gestionadas.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-medium text-xs uppercase tracking-wider pb-3">
                    <th className="py-3 px-2">Ticket</th>
                    <th className="py-3 px-2">Equipo</th>
                    <th className="py-3 px-2">Cliente</th>
                    <th className="py-3 px-2">Prioridad</th>
                    <th className="py-3 px-2">Estado</th>
                    <th className="py-3 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {urgentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 group transition-colors">
                      <td className="py-3.5 px-2 font-mono font-bold text-indigo-600 text-xs">
                        {order.id}
                      </td>
                      <td className="py-3.5 px-2">
                        <div className="font-medium text-slate-800">{order.brand} {order.model}</div>
                        <span className="text-[11px] text-slate-400 font-sans block">{order.deviceType}</span>
                      </td>
                      <td className="py-3.5 px-2 text-slate-600">
                        <div className="font-medium text-slate-700 text-xs">{order.clientName}</div>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <button
                          onClick={() => handleViewOrder(order.id, order.status)}
                          className="inline-flex items-center space-x-1 py-1 px-2.5 rounded hover:bg-slate-100 text-indigo-600 font-semibold text-xs transition-colors"
                        >
                          <span>Atender</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Breakdown Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-5">Distribución de Equipos</h3>
            
            {totalActiveDevices === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Carga un nuevo equipo para ver estadísticas de volumen.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(deviceStats).map(([type, count]) => {
                  const percentage = Math.round(((count as number) / totalActiveDevices) * 100);
                  
                  // Simple dynamic icons
                  const renderDeviceIcon = (dev: string) => {
                    const cleanDev = dev.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (cleanDev.includes('telefono') || cleanDev.includes('celular') || cleanDev.includes('smartphone') || cleanDev.includes('movil') || cleanDev.includes('phone')) return <Smartphone className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('notebook') || cleanDev.includes('laptop') || cleanDev.includes('portatil') || cleanDev.includes('macbook')) return <Laptop className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('tablet') || cleanDev.includes('ipad')) return <Tablet className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('pc') || cleanDev.includes('cpu') || cleanDev.includes('desktop') || cleanDev.includes('computadora')) return <Monitor className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('televisor') || cleanDev.includes('tv') || cleanDev.includes('monitor') || cleanDev.includes('pantalla')) return <Tv className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('impresora') || cleanDev.includes('printer')) return <Printer className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('consola') || cleanDev.includes('videojuego') || cleanDev.includes('playstation') || cleanDev.includes('xbox') || cleanDev.includes('nintendo') || cleanDev.includes('gamepad')) return <Gamepad2 className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('smartwatch') || cleanDev.includes('reloj') || cleanDev.includes('watch')) return <Watch className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('radio') || cleanDev.includes('audio') || cleanDev.includes('parlante') || cleanDev.includes('speaker')) return <Speaker className="h-4 w-4 text-slate-400" />;
                    if (cleanDev.includes('microondas') || cleanDev.includes('horno')) return <Microwave className="h-4 w-4 text-slate-400" />;
                    return <Box className="h-4 w-4 text-slate-400" />;
                  };

                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2 text-slate-700 font-medium">
                          {renderDeviceIcon(type)}
                          <span>{type}</span>
                        </div>
                        <span className="text-slate-500 font-semibold">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total de Clientes</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{clients.length}</p>
              </div>
              <button 
                onClick={() => setActiveTab('clients')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
              >
                <span>Ver clientes</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Technicians & Queue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Workload */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center space-x-2 mb-6">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900 text-base">Carga por Técnico (Órdenes Activas)</h3>
          </div>

          <div className="space-y-4">
            {Object.keys(technicianStats).length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-sm">No hay ordenes activas asignadas.</p>
            ) : (
              Object.entries(technicianStats).map(([tech, count]) => {
                const totalActive = orders.filter(o => o.status !== 'Entregado').length;
                const percentage = totalActive > 0 ? Math.round(((count as number) / totalActive) * 100) : 0;
                
                return (
                  <div key={tech} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs uppercase">
                        {tech.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{tech}</p>
                        <p className="text-[10px] text-slate-400">{count} asignaciones activas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-slate-700">{percentage}%</span>
                      </div>
                      <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Tips or Advice Guide */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-indigo-100 rounded-xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-5050/10 rounded-full translate-x-12 -translate-y-12"></div>
          
          <div className="space-y-4 relative z-10">
            <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">CRM WORKSHOP TIPS</span>
            <h4 className="text-lg font-bold text-white">Guía Rápida de Operación</h4>
            <ul className="text-xs space-y-3 pt-2 text-indigo-200">
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>Ingresa el equipo primero seleccionando un cliente o registrando uno sobre la marcha.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>En el **Tablero Kanban**, haz click en la tarjeta para añadir repuestos, notas de técnico y diagnósticos.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>Usa la **búsqueda predictiva** para evitar duplicar clientes en la base de datos local.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 relative z-10">
            <button
              onClick={() => setActiveTab('new-service')}
              className="w-full bg-white text-indigo-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Ingresar Nueva Orden de Trabajo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
