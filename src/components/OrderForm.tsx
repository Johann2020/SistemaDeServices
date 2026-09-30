import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { DEVICE_TYPES } from '../data';
import { OrderPriority, Client } from '../types';
import { GeorefFields } from './GeorefFields';
import { CustomSelect } from './CustomSelect';
import { PatternLockInput } from './PatternLockInput';
import {   UserPlus, 
  Search, 
  Laptop, 
  Smartphone, 
  Tablet,
  Cpu,
  Package, 
  FileText, 
  Calendar, 
  ChevronDown, 
  User, 
  PlusCircle, 
  Wrench, 
  CheckCircle2, 
  Trash2,
  Lock,
  Sparkles,
  X
} from 'lucide-react';

interface OrderFormProps {
  setActiveTab?: (tab: string) => void;
  onClose?: () => void;
  onClientModalToggle?: (isOpen: boolean) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ setActiveTab, onClose, onClientModalToggle }) => {
  const { 
    clients, 
    addClient, 
    addOrder, 
    searchClientsPredictive,
    technicians,
    showToast,
    orders
  } = useCRM();

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    if (onClientModalToggle) {
      onClientModalToggle(isClientModalOpen);
    }
  }, [isClientModalOpen, onClientModalToggle]);
  
  // Predictive search states
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [suggestedClients, setSuggestedClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form states for creating a new client on the fly
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPhone2, setNewClientPhone2] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientProvincia, setNewClientProvincia] = useState('');
  const [newClientLocalidad, setNewClientLocalidad] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientComments, setNewClientComments] = useState('');

  // Form states for the Device / Maintenance order
  const [deviceType, setDeviceType] = useState('Teléfono');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reportedProblem, setReportedProblem] = useState('');
  const [plannedWork, setPlannedWork] = useState('');
  const [priority, setPriority] = useState<OrderPriority>('Media');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [laborCost, setLaborCost] = useState<number>(0);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [devicePattern, setDevicePattern] = useState('');

  // Set default technician: last assigned, or the only one if just one exists
  useEffect(() => {
    if (technicians.length > 0 && !assignedTechnician) {
      if (technicians.length === 1) {
        setAssignedTechnician(technicians[0].name);
      } else {
        const lastAssigned = [...orders]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .find(o => o.assignedTechnician && technicians.some(t => t.name === o.assignedTechnician));
        setAssignedTechnician(lastAssigned?.assignedTechnician || technicians[0].name);
      }
    }
  }, [technicians, assignedTechnician]);

  // Success Feedback view state
  const [createdOrderTicket, setCreatedOrderTicket] = useState<string | null>(null);

  // States for choosing registered devices vs entering a new one
  const [useExistingDevice, setUseExistingDevice] = useState(false);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number | null>(null);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        setIsDeviceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDeviceIcon = (type: string) => {
    const norm = type.toLowerCase();
    if (norm.includes('notebook') || norm.includes('laptop')) {
      return <Laptop className="h-4 w-4 text-indigo-500" />;
    }
    if (norm.includes('teléfono') || norm.includes('telefono') || norm.includes('celular') || norm.includes('smartphone')) {
      return <Smartphone className="h-4 w-4 text-emerald-500" />;
    }
    if (norm.includes('tablet')) {
      return <Tablet className="h-4 w-4 text-amber-500" />;
    }
    if (norm.includes('cpu') || norm.includes('pc') || norm.includes('computadora')) {
      return <Cpu className="h-4 w-4 text-cyan-500" />;
    }
    return <Package className="h-4 w-4 text-slate-500" />;
  };

  interface ClientDevice {
    deviceType: string;
    brand: string;
    model: string;
    serialNumber: string;
    devicePassword?: string;
    devicePattern?: string;
  }

  // Find all previous unique devices for this client from existing orders
  const clientDevices = useMemo(() => {
    if (!selectedClient) return [];
    const clientOrders = orders.filter(o => o.clientId === selectedClient.id);
    const uniqueMap = new Map<string, ClientDevice>();
    clientOrders.forEach(o => {
      const key = `${o.deviceType || ''}|${o.brand || ''}|${o.model || ''}|${o.serialNumber || ''}`.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          deviceType: o.deviceType || 'Teléfono',
          brand: o.brand || '',
          model: o.model || '',
          serialNumber: o.serialNumber || '',
          devicePassword: o.devicePassword || '',
          devicePattern: o.devicePattern || ''
        });
      }
    });
    return Array.from(uniqueMap.values());
  }, [selectedClient, orders]);

  // Sync state when selected client changes
  useEffect(() => {
    if (selectedClient) {
      const clientOrders = orders.filter(o => o.clientId === selectedClient.id);
      if (clientOrders.length > 0) {
        setUseExistingDevice(true);
        setSelectedDeviceIndex(0);
        const firstDev = clientOrders[0];
        setDeviceType(firstDev.deviceType || 'Teléfono');
        setBrand(firstDev.brand || '');
        setModel(firstDev.model || '');
        setSerialNumber(firstDev.serialNumber || '');
        setDevicePassword(firstDev.devicePassword || '');
        setDevicePattern(firstDev.devicePattern || '');
      } else {
        setUseExistingDevice(false);
        setSelectedDeviceIndex(null);
        setDeviceType('Teléfono');
        setBrand('');
        setModel('');
        setSerialNumber('');
        setDevicePassword('');
        setDevicePattern('');
      }
    } else {
      setUseExistingDevice(false);
      setSelectedDeviceIndex(null);
      setDeviceType('Teléfono');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setDevicePassword('');
      setDevicePattern('');
    }
  }, [selectedClient, orders]);

  // Trigger search on typing client filter
  const handleClientSearchChange = (val: string) => {
    setClientSearchQuery(val);
    setSelectedClient(null); // Reset choice
    if (val.trim()) {
      const matches = searchClientsPredictive(val);
      setSuggestedClients(matches);
    } else {
      setSuggestedClients([]);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearchQuery(client.name);
    setSuggestedClients([]);
  };

  const resetForm = () => {
    setClientSearchQuery('');
    setSelectedClient(null);
    setSuggestedClients([]);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientPhone2('');
    setNewClientDoc('');
    setNewClientProvincia('');
    setNewClientLocalidad('');
    setNewClientAddress('');
    setNewClientComments('');
    
    setDeviceType('Teléfono');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setReportedProblem('');
    setPlannedWork('');
    setPriority('Media');
    setAssignedTechnician(technicians[0]?.name || '');
    setLaborCost(0);
    setEstimatedDelivery('');
    setDevicePassword('');
    setDevicePattern('');
    setCreatedOrderTicket(null);
    setUseExistingDevice(false);
    setSelectedDeviceIndex(null);
  };

  const handleRegisterClientFromModal = () => {
    if (!newClientName) {
      showToast('Por favor complete el campo obligatorio (Nombre).', 'warning');
      return;
    }

    try {
      const client = addClient({
        name: newClientName,
        phone: newClientPhone || '',
        phone2: newClientPhone2 || '',
        documentId: newClientDoc || '',
        provincia: newClientProvincia,
        localidad: newClientLocalidad,
        address: newClientAddress,
        comments: newClientComments
      });

      // Clear new client form values
      setNewClientName('');
      setNewClientPhone('');
      setNewClientPhone2('');
      setNewClientDoc('');
      setNewClientProvincia('');
      setNewClientLocalidad('');
      setNewClientAddress('');
      setNewClientComments('');

      // Auto-select and link the client
      setSelectedClient(client);
      setClientSearchQuery(client.name);
      setSuggestedClients([]);
      
      // Close modal and focus on selection
      setIsClientModalOpen(false);
    } catch {
      showToast('Sucedió un error al registrar el cliente.', 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      showToast('Debe buscar y seleccionar un cliente registrado o registrar uno nuevo desde el botón "+ Registrar Nuevo Cliente".', 'warning');
      return;
    }
    const targetClientId = selectedClient.id;

    const missing: string[] = [];
    if (!brand) missing.push('Marca');
    if (!model) missing.push('Modelo');
    if (!reportedProblem && !plannedWork) missing.push('al menos uno de: Problema Reportado o Trabajos a Realizar');
    if (missing.length > 0) {
      showToast(`Debe completar: ${missing.join(', ')}.`, 'warning');
      return;
    }

    try {
      // Dispatches the order to State Context which handles ticket number and storage
      const order = addOrder({
        clientId: targetClientId,
        deviceType,
        brand,
        model,
        serialNumber: serialNumber || 'S/N',
        description: reportedProblem,
        reportedProblem,
        plannedWork,
        priority,
        assignedTechnician,
        laborCost: Number(laborCost) || 0,
        estimatedDelivery,
        devicePassword: (deviceType === 'Notebook' || deviceType === 'Teléfono' || deviceType === 'Tablet' || deviceType === 'CPU / PC Desktop') ? devicePassword : '',
        devicePattern: (deviceType === 'Teléfono' || deviceType === 'Tablet') ? devicePattern : ''
      });

      // Show congratulations detail sheet
      setCreatedOrderTicket(order.id);
    } catch {
      showToast('Sucedió un error al ingresar la orden de soporte.', 'error');
    }
  };

  return (
    <div id="device-intake-module" className="max-w-3xl mx-auto animate-fade-in">
      {!isClientModalOpen && (
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ingresar Nuevo Equipo</h2>
          <p className="text-slate-500 text-sm">Registra o selecciona un cliente para generar la orden de trabajo técnica.</p>
        </div>
      )}

      {!isClientModalOpen && (createdOrderTicket ? (
        /* Success Screen */
        <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-8 text-center space-y-6 animate-scale-up">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-9 w-9 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">¡Orden de Trabajo Generada!</h3>
            <p className="text-slate-500 text-sm">El equipo ha sido ingresado al laboratorio con éxito.</p>
            <div className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-black text-xl px-5 py-2.5 rounded-xl tracking-wider mt-2 shadow-xs">
              MEC-TICKET: {createdOrderTicket}
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Se ha creado un ID único de seguimiento. El ticket se encuentra asignado a <strong className="text-slate-600">{assignedTechnician}</strong> en estado **Ingresado**, listo para su diagnóstico en el laboratorio.
          </p>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3.5 justify-center">
            <button
              onClick={resetForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer select-none"
            >
              Cargar Otro Dispositivo
            </button>
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                } else if (setActiveTab) {
                  setActiveTab('kanban');
                }
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer select-none"
            >
              {onClose ? 'Ver en Tablero y Cerrar' : 'Ir al Tablero Kanban'}
            </button>
          </div>
        </div>
      ) : (
        /* Form Intake sheet */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
           {/* Section 1: Customer Linkage Header */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider">1. Información del Cliente</h3>
              </div>

              {/* Instant Modal Registration Button */}
              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Registrar Nuevo Cliente</span>
              </button>
            </div>

            {/* ALWAYS SEARCH PREDICTIVE FORM BLOCK */}
            <div id="search-client-panel" className="relative space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Buscar cliente por Nombre o Identificación:</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoComplete="new-password"
                  placeholder="Escribe 'Juan', 'María', 'Castillo'..."
                  value={clientSearchQuery}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  className={`w-full pl-9 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-slate-400 ${clientSearchQuery ? 'pr-9' : 'pr-4'}`}
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => handleClientSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Predictions dropdown */}
              {suggestedClients.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {suggestedClients.map((client) => (
                    <div
                      key={client.id}
                      id={`suggested-client-item-${client.id}`}
                      onClick={() => handleSelectClient(client)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{client.name}</p>
                        <p className="text-slate-400 font-medium text-[10.5px]">{client.phone}</p>
                      </div>
                      <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        {client.documentId}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Checked Confirmation Area */}
              {selectedClient && (
                <div className="mt-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Vinculado con éxito a <strong>{selectedClient.name}</strong> ({selectedClient.documentId})</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setSelectedClient(null); setClientSearchQuery(''); }}
                    className="text-slate-400 hover:text-slate-600 font-bold transition cursor-pointer"
                  >
                    Deseleccionar
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Section 2: Device Details */}
          <div className="p-6 space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Laptop className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-850 text-sm uppercase tracking-wider">2. Especificaciones del Equipo y Avería</h3>
            </div>

            {selectedClient && clientDevices.length > 0 && (
              <div id="client-equipments-toggle" className="bg-indigo-50/40 p-4 border border-indigo-100 rounded-xl space-y-3.5 animate-fade-in font-semibold text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-bold text-indigo-850 uppercase tracking-wider">Dispositivos registrados del cliente</h4>
                  <span className="bg-indigo-100 text-indigo-850 text-[10.5px] px-2.5 py-0.5 rounded-full font-extrabold font-mono">
                    {clientDevices.length} {clientDevices.length === 1 ? 'equipo' : 'equipos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUseExistingDevice(true);
                      if (clientDevices.length > 0) {
                        setSelectedDeviceIndex(0);
                        const dev = clientDevices[0];
                        setDeviceType(dev.deviceType);
                        setBrand(dev.brand);
                        setModel(dev.model);
                        setSerialNumber(dev.serialNumber);
                        setDevicePassword(dev.devicePassword || '');
                        setDevicePattern(dev.devicePattern || '');
                      }
                    }}
                    className={`p-3 text-left rounded-lg border text-xs font-bold transition flex items-center justify-between cursor-pointer select-none ${
                      useExistingDevice 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <Laptop className="h-4 w-4 shrink-0" />
                      <span>Seleccionar del historial</span>
                    </span>
                    {useExistingDevice && <span className="h-2 w-2 rounded-full bg-white block"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUseExistingDevice(false);
                      setSelectedDeviceIndex(null);
                      setDeviceType('Teléfono');
                      setBrand('');
                      setModel('');
                      setSerialNumber('');
                      setDevicePassword('');
                      setDevicePattern('');
                    }}
                    className={`p-3 text-left rounded-lg border text-xs font-bold transition flex items-center justify-between cursor-pointer select-none ${
                      !useExistingDevice 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5">
                      <PlusCircle className="h-4 w-4 shrink-0" />
                      <span>Cargar nuevo equipo</span>
                    </span>
                    {!useExistingDevice && <span className="h-2 w-2 rounded-full bg-white block"></span>}
                  </button>
                </div>

                {useExistingDevice && (
                  <div className="space-y-1.5 pt-1 animate-fade-in text-xs font-semibold relative" ref={deviceDropdownRef}>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Historial de Equipos registrado *</label>
                    
                    <button
                      type="button"
                      onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                      className="w-full text-left text-xs py-2.5 px-3.5 bg-white border border-slate-200 rounded-xl text-slate-850 font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition cursor-pointer flex justify-between items-center shadow-3xs"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="bg-slate-100 border border-slate-200/60 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                          {selectedDeviceIndex !== null && clientDevices[selectedDeviceIndex]
                            ? getDeviceIcon(clientDevices[selectedDeviceIndex].deviceType)
                            : <Laptop className="h-4 w-4 text-indigo-500" />
                          }
                        </div>
                        <span className="truncate text-slate-800">
                          {selectedDeviceIndex !== null && clientDevices[selectedDeviceIndex]
                            ? `${clientDevices[selectedDeviceIndex].deviceType} - ${clientDevices[selectedDeviceIndex].brand} ${clientDevices[selectedDeviceIndex].model} ${clientDevices[selectedDeviceIndex].serialNumber ? `(S/N: ${clientDevices[selectedDeviceIndex].serialNumber})` : '(Sin S/N)'}`
                            : 'Seleccione un equipo del historial...'
                          }
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isDeviceDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDeviceDropdownOpen && (
                      <div className="absolute z-50 left-0 w-full top-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs animate-scale-up">
                        {clientDevices.map((dev, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedDeviceIndex(idx);
                              setDeviceType(dev.deviceType);
                              setBrand(dev.brand);
                              setModel(dev.model);
                              setSerialNumber(dev.serialNumber);
                              setDevicePassword(dev.devicePassword || '');
                              setDevicePattern(dev.devicePattern || '');
                              setIsDeviceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 cursor-pointer transition-colors flex items-center space-x-3 border-b border-slate-100/40 last:border-0 ${
                              selectedDeviceIndex === idx 
                                ? 'bg-indigo-50/70 text-indigo-950 font-bold' 
                                : 'hover:bg-slate-50 text-slate-700 font-medium'
                            }`}
                          >
                            <div className={`border rounded-lg p-1.5 flex items-center justify-center shrink-0 transition-colors ${
                              selectedDeviceIndex === idx
                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}>
                              {getDeviceIcon(dev.deviceType)}
                            </div>
                            <div className="flex-1 min-w-0 pr-1.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-extrabold text-slate-800 text-[12px]">{dev.brand} {dev.model}</span>
                                <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono">
                                  {dev.deviceType}
                                </span>
                              </div>
                              {dev.serialNumber ? (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">S/N: {dev.serialNumber}</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-normal italic">Sin número de serie</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Tipo de Dispositivo</label>
                {useExistingDevice ? (
                  <div className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-bold select-none cursor-not-allowed h-[38px] flex items-center">
                    {deviceType}
                  </div>
                ) : (
                  <CustomSelect
                    value={deviceType}
                    onChange={(val) => setDeviceType(val)}
                    options={DEVICE_TYPES.map(type => ({ value: type, label: type }))}
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Marca *</label>
                <input
                  type="text"
                  required
                  disabled={useExistingDevice}
                  autoComplete="off"
                  placeholder="Ej. Apple, Lenovo, Sony"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition font-medium ${
                    useExistingDevice 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 font-bold' 
                      : 'bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:border-slate-300'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Modelo Físico *</label>
                <input
                  type="text"
                  required
                  disabled={useExistingDevice}
                  autoComplete="off"
                  placeholder="Ej. iPhone 13 Pro, ThinkPad X1"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition font-medium ${
                    useExistingDevice 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 font-bold' 
                      : 'bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Número de Serie (S/N)</label>
                <input
                  type="text"
                  disabled={useExistingDevice}
                  autoComplete="off"
                  placeholder="F8NK62LKD... o deja vacío si no tiene"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg placeholder-slate-404 focus:outline-none focus:ring-2 focus:ring-slate-100 transition font-mono ${
                    useExistingDevice 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 font-bold' 
                      : 'bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:border-slate-300'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Nivel de Prioridad</label>
                <CustomSelect
                  value={priority}
                  onChange={(val) => setPriority(val as OrderPriority)}
                  options={[
                    { value: 'Baja', label: 'Baja' },
                    { value: 'Media', label: 'Media' },
                    { value: 'Alta', label: 'Alta' },
                    { value: 'Crítica', label: 'Crítica' }
                  ]}
                />
              </div>
            </div>

            {/* Security Fields (Password/PIN and Pattern unlock) */}
            {(deviceType === 'Notebook' || deviceType === 'Teléfono' || deviceType === 'Tablet' || deviceType === 'CPU / PC Desktop') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/55 p-4 rounded-xl border border-slate-200 animate-fade-in font-semibold text-xs">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5 text-indigo-400 font-bold" />
                    <span>Contraseña / PIN de Desbloqueo</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Ej. 1234, admin, o deja vacío si no tiene"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal font-normal">
                    Contraseña del sistema operativo o PIN de inicio.
                  </p>
                </div>

                {(deviceType === 'Teléfono' || deviceType === 'Tablet') ? (
                  <div className="space-y-1">
                    <PatternLockInput
                      value={devicePattern}
                      onChange={(val) => setDevicePattern(val)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col justify-center text-slate-450 text-[11px] px-3.5 space-y-1.5 py-3 border border-dashed border-slate-200 bg-white rounded-lg select-none">
                    <p className="font-bold text-slate-500">¿Tiene patrón visual de desbloqueo?</p>
                    <p className="leading-normal text-slate-400">
                      Los patrones solo están disponibles para dispositivos táctiles como <strong>Teléfonos</strong> y <strong>Tablets</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Problema Reportado (Ingreso) *</label>
                <textarea
                  rows={3}
                  placeholder="Detalle de fallas reportadas por el cliente, golpes anteriores o estado estético..."
                  value={reportedProblem}
                  onChange={(e) => {
                    setReportedProblem(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  ref={(node) => {
                    if (node) {
                      node.style.height = 'auto';
                      node.style.height = `${node.scrollHeight}px`;
                    }
                  }}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition overflow-hidden resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Trabajos a Realizar (Ingreso) *</label>
                <textarea
                  rows={3}
                  placeholder="Descripción del servicio, mantenimiento preventivo o acciones específicas solicitado..."
                  value={plannedWork}
                  onChange={(e) => {
                    setPlannedWork(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  ref={(node) => {
                    if (node) {
                      node.style.height = 'auto';
                      node.style.height = `${node.scrollHeight}px`;
                    }
                  }}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition overflow-hidden resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Técnico Responsable Asignado</label>
                <CustomSelect
                  value={assignedTechnician}
                  onChange={(val) => setAssignedTechnician(val)}
                  options={technicians.length === 0 ? [
                    { value: '', label: '-- No hay técnicos disponibles --' }
                  ] : technicians.map(tech => ({
                    value: tech.name,
                    label: tech.name
                  }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Compromiso / Fecha Estimada Entrega</label>
                <div className="relative">
                  <input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer block */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[11px] text-slate-400 font-medium">* Campos obligatorios.</span>
            <div className="flex space-x-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition cursor-pointer select-none"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer select-none"
              >
                Limpiar todo
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer select-none"
              >
                Ingresar Turno Técnico
              </button>
            </div>
          </div>

        </form>
      ))}

      {/* MODAL PARA CARGAR NUEVO CLIENTE (Renderizado Directo en Tarjeta) */}
      {isClientModalOpen && (
        <div className="space-y-6 animate-scale-up text-left">
          
          {/* Modal Header */}
          <div className="pb-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5.5 w-5.5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Cargar Nuevo Cliente</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsClientModalOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium pb-2">
              Ingrese los datos para registrar un nuevo cliente en la base de datos de manera definitiva.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 block">Nombre *</label>
                <input
                  type="text"
                  required
                  autoComplete="one-time-code"
                  name="cliente_nombre_completo_custom"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ingrese el nombre completo"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                />
              </div>

              {/* DNI/CUIT */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">DNI/CUIT</label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  name="cliente_dni_cuit_custom"
                  value={newClientDoc}
                  onChange={(e) => setNewClientDoc(e.target.value)}
                  placeholder="Ej. 20-30456789-2"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                />
              </div>

              {/* Campo Provincia & Localidad (Georef API Autofill) */}
              <GeorefFields
                provinciaValue={newClientProvincia}
                setProvinciaValue={setNewClientProvincia}
                localidadValue={newClientLocalidad}
                setLocalidadValue={setNewClientLocalidad}
                variant="indigo"
                labelClassName="text-xs font-semibold text-slate-500 block"
                inputClassName="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 pr-9 transition font-medium"
              />

              {/* Direccion */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Dirección</label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  name="cliente_direccion_física_custom"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  placeholder="Calle, Número, Piso dpto"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                />
              </div>

              {/* Telefono 1 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Teléfono 1</label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  name="cliente_telefono_fijo_movil_custom"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="Móvil o celular principal"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-805 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                />
              </div>

              {/* Telefono 2 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Teléfono 2</label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  name="cliente_telefono_secundario_custom"
                  value={newClientPhone2}
                  onChange={(e) => setNewClientPhone2(e.target.value)}
                  placeholder="Teléfono alternativo"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
                />
              </div>

              {/* Comentarios */}
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Comentarios</label>
                <textarea
                  rows={2}
                  value={newClientComments}
                  onChange={(e) => setNewClientComments(e.target.value)}
                  placeholder="Notas o aclaraciones iniciales sobre este cliente..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-5 border-t border-slate-100 flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsClientModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegisterClientFromModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
            >
              Registrar y Seleccionar Cliente
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
