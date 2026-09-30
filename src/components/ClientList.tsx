import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Client } from '../types';
import { GeorefFields } from './GeorefFields';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin,
  Calendar, 
  History, 
  X,
  UserPlus,
  Check,
  MessageSquare,
  Globe,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';

import { OrderStatus } from '../types';

interface ClientListProps {
  setActiveTab?: (tab: string) => void;
  setSelectedOrderId?: (id: string | null) => void;
  setActiveOrderTab?: (tab: OrderStatus) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  setActiveTab,
  setSelectedOrderId,
  setActiveOrderTab
}) => {
  const { clients, orders, addClient, updateClientDetails, deleteClientWithData, showToast } = useCRM();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // Cleanup States
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupDaysThreshold, setCleanupDaysThreshold] = useState(90);
  const [cleanupOnlyNoOrders, setCleanupOnlyNoOrders] = useState(false);
  const [selectedCleanupClientIds, setSelectedCleanupClientIds] = useState<Record<string, boolean>>({});
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [cleanupExcludeWithActive, setCleanupExcludeWithActive] = useState(true);

  // New Client schema based on the Argentine image
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [provincia, setProvincia] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comments, setComments] = useState('');

  const resetForm = () => {
    setName('');
    setDoc('');
    setProvincia('');
    setLocalidad('');
    setAddress('');
    setPhone('');
    setPhone2('');
    setComments('');
    setEditingClient(null);
    setIsAddingClient(false);
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setDoc(client.documentId || '');
    setProvincia(client.provincia || '');
    setLocalidad(client.localidad || '');
    setAddress(client.address || '');
    setPhone(client.phone || '');
    setPhone2(client.phone2 || '');
    setComments(client.comments || '');
    setIsAddingClient(true);
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Por favor ingrese el Nombre de Cliente.', 'warning');
      return;
    }
    
    if (editingClient) {
      updateClientDetails(editingClient.id, {
        name,
        documentId: doc || '',
        phone: phone || '',
        phone2,
        provincia,
        localidad,
        address,
        comments
      });
      showToast('Cliente actualizado con éxito.', 'success');
    } else {
      addClient({
        name,
        documentId: doc || '',
        phone: phone || '',
        phone2,
        provincia,
        localidad,
        address,
        comments
      });
      showToast('Cliente registrado con éxito.', 'success');
    }
    
    resetForm();
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.phone2 && c.phone2.includes(searchQuery)) ||
    (c.documentId && c.documentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.provincia && c.provincia.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.localidad && c.localidad.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getClientLastActivity = (client: Client) => {
    const clientOrders = orders.filter(o => o.clientId === client.id);
    let lastDate = new Date(client.createdAt);
    
    clientOrders.forEach(o => {
      const oDate = new Date(o.updatedAt || o.createdAt);
      if (oDate > lastDate) {
        lastDate = oDate;
      }
    });
    
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - lastDate.getTime());
    const inactiveDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    
    return {
      lastDate,
      inactiveDays,
      totalOrders: clientOrders.length,
      activeOrders: clientOrders.filter(o => o.status !== 'Entregado').length,
      hasOrders: clientOrders.length > 0
    };
  };

  const cleanupClientsList = clients.map(client => ({
    client,
    activity: getClientLastActivity(client)
  })).filter(({ client, activity }) => {
    if (cleanupExcludeWithActive && activity.activeOrders > 0) {
      return false;
    }
    if (cleanupOnlyNoOrders) {
      return activity.totalOrders === 0;
    }
    return activity.inactiveDays >= cleanupDaysThreshold;
  });

  const allSelected = cleanupClientsList.length > 0 && cleanupClientsList.every(({ client }) => selectedCleanupClientIds[client.id]);

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedCleanupClientIds({});
    } else {
      const updated: Record<string, boolean> = {};
      cleanupClientsList.forEach(({ client }) => {
        updated[client.id] = true;
      });
      setSelectedCleanupClientIds(updated);
    }
  };

  const selectedCount = Object.keys(selectedCleanupClientIds).filter(
    id => selectedCleanupClientIds[id] && cleanupClientsList.some(item => item.client.id === id)
  ).length;

  const handleBulkDelete = () => {
    const idsToDelete = Object.keys(selectedCleanupClientIds).filter(
      id => selectedCleanupClientIds[id] && cleanupClientsList.some(item => item.client.id === id)
    );

    if (idsToDelete.length === 0) {
      showToast('Por favor, seleccione al menos un cliente para eliminar.', 'warning');
      return;
    }

    // Call delete function for each client
    idsToDelete.forEach(id => {
      deleteClientWithData(id, 'all');
    });

    showToast(`Se han eliminado ${idsToDelete.length} clientes correctamente.`, 'success');
    setSelectedCleanupClientIds({});
    setIsBulkDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio de Clientes</h2>
          <p className="text-slate-500 text-sm">Gestiona la agenda de contactos y revisa el historial clínico de sus equipos.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedCleanupClientIds({});
              setIsCleanupOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4 text-slate-500" />
            <span>Limpieza de Inactividad</span>
          </button>
          <button
            onClick={() => {
              if (isAddingClient) {
                resetForm();
              } else {
                setIsAddingClient(true);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>{isAddingClient ? 'Ocultar Formulario' : 'Nuevo Cliente'}</span>
          </button>
        </div>
      </div>

      {isAddingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleAddClientSubmit} 
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl animate-scale-up max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="pb-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5.5 w-5.5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                  {editingClient ? `Editar cliente: ${editingClient.name}` : 'Cargar Nuevo Cliente'}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition cursor-pointer text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 font-medium pb-2 text-left">
                {editingClient 
                  ? 'Modifique los datos correspondientes para actualizar la ficha de este cliente de forma definitiva.' 
                  : 'Ingrese los datos para registrar un nuevo cliente en la base de datos de manera definitiva.'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 block">Nombre *</label>
                  <input
                    type="text"
                    required
                    autoComplete="one-time-code"
                    name="client_fullname_field_custom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    name="client_tax_doc_field_custom"
                    value={doc}
                    onChange={(e) => setDoc(e.target.value)}
                    placeholder="Ej. 20-30456789-2"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                  />
                </div>

                {/* Campo Provincia & Localidad (Georef API Autofill) */}
                <GeorefFields
                  provinciaValue={provincia}
                  setProvinciaValue={setProvincia}
                  localidadValue={localidad}
                  setLocalidadValue={setLocalidad}
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
                    name="client_phy_address_field_custom"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    name="client_phone_mobile_field_custom"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Móvil o celular principal"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                  />
                </div>

                {/* Telefono 2 */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">Teléfono 2</label>
                  <input
                    type="text"
                    autoComplete="one-time-code"
                    name="client_alternative_phone_field_custom"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                    placeholder="Teléfono alternativo"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                  />
                </div>

                {/* Comentarios */}
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">Comentarios</label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Notas o aclaraciones iniciales sobre este cliente..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-5 border-t border-slate-100 flex justify-end space-x-3 shrink-0">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
              >
                {editingClient ? 'Actualizar Cliente' : 'Registrar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            autoComplete="off"
            placeholder="Filtrar por nombre, teléfono, CUIT/DNI, localidad, comentarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-800 ${searchQuery ? 'pr-10' : 'pr-4'}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Clients Bento Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          // Find all orders that belong to this client
          const clientOrders = orders.filter(o => o.clientId === client.id);

          return (
            <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition">{client.name}</h3>
                  <span className="font-mono text-[10.5px] text-slate-400 font-bold uppercase tracking-wide">DNI/CUIT: {client.documentId}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(client)}
                    className="p-1 text-[#1374a2] hover:text-[#0e5c81] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Editar Cliente"
                  >
                    <Pencil className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingClient(client)}
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Eliminar Cliente"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                  <Users className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              {/* Contact parameters */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">Tel 1: {client.phone}</span>
                </div>
                {client.phone2 && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">Tel 2: {client.phone2}</span>
                  </div>
                )}
                
                {/* Location (Provincia & Localidad) */}
                {(client.provincia || client.localidad) && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">
                      {client.localidad || 'S/E'}{client.provincia ? `, ${client.provincia}` : ''}
                    </span>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">{client.address}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-[10px] text-slate-400">Registrado el {new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Comments block */}
              {client.comments && (
                <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/70 text-xs text-slate-650 flex items-start space-x-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="italic text-[11px] leading-relaxed text-slate-600">"{client.comments}"</p>
                </div>
              )}

              {/* Associated device histories */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>Cronograma de Diagnósticos</span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10.5px] font-bold rounded">
                    {clientOrders.length} equipo(s)
                  </span>
                </div>

                {clientOrders.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No registra ingresos en el laboratorio todavía.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {clientOrders.map(ord => {
                      const isClickable = !!(setActiveTab && setSelectedOrderId && setActiveOrderTab);
                      return (
                        <div 
                          key={ord.id} 
                          onClick={() => {
                            if (isClickable) {
                              setSelectedOrderId!(ord.id);
                              setActiveOrderTab!(ord.status);
                              setActiveTab!('kanban');
                            }
                          }}
                          className={`bg-slate-50 border border-slate-200 p-2 rounded flex justify-between items-center text-[11px] transition duration-150 ${
                            isClickable 
                              ? 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 active:bg-indigo-50' 
                              : ''
                          }`}
                          title={isClickable ? "Haga clic para abrir ficha de trabajo" : undefined}
                        >
                          <div className="flex items-center space-x-1">
                            <strong className="text-slate-800 font-mono text-[10px] text-indigo-600 mr-1.5">{ord.id}</strong>
                            <span className="font-semibold text-slate-700">{ord.brand} {ord.model}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                            ord.status === 'Ingresado' ? 'bg-zinc-100 text-zinc-700' :
                            ord.status === 'En Reparación' ? 'bg-blue-50 text-blue-700' :
                            ord.status === 'Listo' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-indigo-50 text-indigo-700' // Entregado
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE ELIMINACIÓN DE CLIENTE */}
      {deletingClient && (() => {
        const clientOrders = orders.filter(o => o.clientId === deletingClient.id);
        const hasLinkedData = clientOrders.length > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-scale-up">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-2 text-rose-600">
                  <AlertTriangle className="h-5 w-5 text-rose-600 animate-pulse animate-duration-1000" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Eliminar Cliente</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingClient(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-left">
                <p className="text-sm text-slate-700">
                  ¿Está seguro de que desea proceder con la eliminación de <strong>{deletingClient.name}</strong> (DNI/CUIT: {deletingClient.documentId})?
                </p>

                {hasLinkedData ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-800 space-y-1">
                      <p className="font-bold">¡Atención! Este cliente tiene registros vinculados:</p>
                      <p>Posee un total de <strong className="underline">{clientOrders.length} service(s) / equipo(s)</strong> en su historial de reparaciones actualmente.</p>
                      <p>Seleccione la modalidad de eliminación que prefiere realizar:</p>
                    </div>

                    <div className="space-y-3">
                      {/* Option 1: Only services */}
                      <button
                        type="button"
                        onClick={() => {
                          deleteClientWithData(deletingClient.id, 'only_services');
                          showToast('Servicios eliminados y equipos restaurados a estado "Ingresado" correctamente.', 'success');
                          setDeletingClient(null);
                        }}
                        className="w-full text-left p-3 border border-amber-200 bg-amber-50/30 hover:bg-amber-50 rounded-xl transition flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="h-5 w-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono mt-0.5 group-hover:bg-amber-200">
                          1
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">Borrar sólo los services del cliente</p>
                          <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                            Limpia los costos de mano de obra, vacía repuestos y restablece las órdenes a estado inicial <strong>"Ingresado"</strong>. Los equipos siguen ingresados pero sin cargos técnicos.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Services and equipments */}
                      <button
                        type="button"
                        onClick={() => {
                          deleteClientWithData(deletingClient.id, 'services_and_equipments');
                          showToast('Todas las órdenes y equipos de este cliente han sido eliminados de forma definitiva.', 'success');
                          setDeletingClient(null);
                        }}
                        className="w-full text-left p-3 border border-rose-200 bg-rose-50/20 hover:bg-rose-50/50 rounded-xl transition flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="h-5 w-5 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono mt-0.5 group-hover:bg-rose-200">
                          2
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">Los services y los equipos</p>
                          <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                            Elimina por completo todas las órdenes de trabajo y equipos vinculados a este cliente. El perfil comercial del cliente <strong>permanece registrado</strong> en el directorio.
                          </p>
                        </div>
                      </button>

                      {/* Option 3: All complete */}
                      <button
                        type="button"
                        onClick={() => {
                          deleteClientWithData(deletingClient.id, 'all');
                          showToast('Cliente y todo su historial de servicios y equipos eliminados con éxito del sistema.', 'success');
                          setDeletingClient(null);
                        }}
                        className="w-full text-left p-3 border border-rose-300 bg-rose-600/5 hover:bg-rose-600/10 rounded-xl transition flex items-start gap-3 cursor-pointer group"
                      >
                        <div className="h-5 w-5 bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono mt-0.5 group-hover:bg-rose-700">
                          3
                        </div>
                        <div>
                          <p className="font-bold text-rose-900 text-xs uppercase tracking-tight">Todo completo (Services, equipos y cliente)</p>
                          <p className="text-[11px] text-rose-700/80 leading-normal mt-0.5">
                            Eliminación definitiva absoluta. Borra al cliente del directorio general, sus equipos asociados y su historial de órdenes técnicos de forma irreversible.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    Este cliente no posee órdenes, equipos ni servicios vinculados actualmente, por lo que su ficha se borrará de forma limpia y directa del directorio.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeletingClient(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                {!hasLinkedData && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteClientWithData(deletingClient.id, 'all');
                      showToast('Cliente eliminado correctamente.', 'success');
                      setDeletingClient(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Confirmar Eliminación
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE LIMPIEZA / DEPURACIÓN DE INACTIVIDAD */}
      {isCleanupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden animate-scale-up max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2 text-indigo-700">
                <Trash2 className="h-5 w-5" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Depurar Clientes por Prolongada Inactividad</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCleanupOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter controls and inputs */}
            <div className="p-5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-start text-xs">
              
              {/* Presets and custom input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Filtro de Inactividad de Clientes</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setCleanupDaysThreshold(30);
                        setCleanupOnlyNoOrders(false);
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        cleanupDaysThreshold === 30 && !cleanupOnlyNoOrders
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      30 días
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCleanupDaysThreshold(90);
                        setCleanupOnlyNoOrders(false);
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        cleanupDaysThreshold === 90 && !cleanupOnlyNoOrders
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      90 días
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCleanupDaysThreshold(180);
                        setCleanupOnlyNoOrders(false);
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        cleanupDaysThreshold === 180 && !cleanupOnlyNoOrders
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      180 d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCleanupDaysThreshold(365);
                        setCleanupOnlyNoOrders(false);
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        cleanupDaysThreshold === 365 && !cleanupOnlyNoOrders
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      365 d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCleanupOnlyNoOrders(true);
                      }}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        cleanupOnlyNoOrders
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Sin Órdenes
                    </button>
                  </div>

                  {!cleanupOnlyNoOrders && (
                    <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 w-full">
                      <span className="text-slate-400 font-medium shrink-0">Personalizado:</span>
                      <input
                        type="number"
                        min="1"
                        max="3000"
                        value={cleanupDaysThreshold}
                        onChange={(e) => setCleanupDaysThreshold(Math.max(1, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-xs font-bold text-slate-800 bg-transparent py-1 border-0 focus:ring-0 focus:outline-none"
                      />
                      <span className="text-slate-400 font-medium shrink-0">días</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Option Toggles */}
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Seguridad y Resguardo</label>
                <label className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={cleanupExcludeWithActive}
                    onChange={(e) => {
                      setCleanupExcludeWithActive(e.target.checked);
                      setSelectedCleanupClientIds({});
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-[11px] font-semibold text-slate-600 leading-tight">
                    Proteger clientes con órdenes activas
                  </span>
                </label>
              </div>

            </div>

            {/* List Header and selection info */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 font-medium">
              <div>
                Se detectaron <span className="font-bold text-slate-800">{cleanupClientsList.length}</span> clientes inactivos bajo este criterio de búsqueda.
              </div>
              <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  Seleccionados: {selectedCount}
                </span>
              </div>
            </div>

            {/* Main scrollable list */}
            <div className="flex-1 overflow-y-auto p-5">
              {cleanupClientsList.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Check className="h-10 w-10 text-emerald-500 mx-auto bg-emerald-50 p-2 rounded-full border border-emerald-100 animate-bounce" />
                  <p className="font-bold text-slate-800 text-sm">¡Base de datos en óptimo estado!</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
                    No se encontraron clientes que cumplan con la inactividad seleccionada de {cleanupOnlyNoOrders ? 'no contar con órdenes físicas registradas' : `mínimo ${cleanupDaysThreshold} días`}. ¡Buen trabajo!
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-medium uppercase tracking-wider text-[10px] pb-2">
                      <th className="py-2.5 px-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Equipos / Services Cargados</th>
                      <th className="py-2.5 px-3">Última Actividad Registrada</th>
                      <th className="py-2.5 px-3 text-right">Tiempo Inactivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cleanupClientsList.map(({ client, activity }) => {
                      const isSelected = !!selectedCleanupClientIds[client.id];
                      return (
                        <tr 
                          key={client.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-indigo-50/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedCleanupClientIds(prev => ({
                                  ...prev,
                                  [client.id]: !prev[client.id]
                                }));
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{client.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold uppercase mt-0.5">DNI/CUIT: {client.documentId || 'Sin registrar'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1.5 font-medium">
                              {activity.hasOrders ? (
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10.5px]">
                                  {activity.totalOrders} órdenes
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[10.5px]">
                                  Sin órdenes creadas
                                </span>
                              )}
                              
                              {activity.activeOrders > 0 && (
                                <span className="bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-100 text-[10px] shrink-0 animate-pulse">
                                  {activity.activeOrders} en curso
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate">
                              {client.provincia || 'N/A'}, {client.localidad || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-700">
                              {new Date(activity.lastDate).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {activity.hasOrders ? 'Último ticket cerrado/modificado' : 'Fecha de registro comercial'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold font-mono text-slate-800">
                              {activity.inactiveDays} días
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Inactivo
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsCleanupOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cerrar Depurador
              </button>
              
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center space-x-1.5 group select-none"
              >
                <Trash2 className="h-4 w-4 text-rose-100 group-hover:animate-shake" />
                <span>Eliminar Seleccionados ({selectedCount})</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN MASIVA */}
      {isBulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="p-5 border-b border-rose-100 flex items-center space-x-2 text-rose-600 bg-rose-50/50">
              <AlertTriangle className="h-5 w-5 text-rose-600 animate-pulse shrink-0" />
              <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider">¡Confirmación Crítica Requerida!</h4>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-left text-xs">
              <p className="text-slate-700 text-sm leading-relaxed">
                Está a punto de eliminar de manera definitiva a <strong className="text-rose-600 text-base">{selectedCount}</strong> clientes seleccionados.
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg leading-normal font-medium">
                Esta acción es <strong className="uppercase font-extrabold text-xs">completamente irreversible</strong>. Se eliminará el perfil comercial del cliente, junto con sus números de contacto, direcciones, y **toda orden de servicio o equipamiento vinculado**, borrando por completo sus registros contables e históricos de forma irrevocable.
              </div>

              {/* List of names being deleted */}
              <div className="space-y-1">
                <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1.5">Clientes que se eliminarán:</p>
                <div className="max-h-24 overflow-y-auto bg-slate-50 border border-slate-200 rounded p-2 divide-y divide-slate-200 font-bold text-slate-700">
                  {cleanupClientsList
                    .filter(({ client }) => selectedCleanupClientIds[client.id])
                    .map(({ client }) => (
                      <div key={client.id} className="py-1 text-[11px] flex justify-between">
                        <span>• {client.name}</span>
                        <span className="text-[10px] text-slate-405 font-mono">DNI/CUIT: {client.documentId}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsBulkDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition cursor-pointer font-sans"
              >
                No, cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer font-sans shadow-sm"
              >
                Sí, confirmar eliminación
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
