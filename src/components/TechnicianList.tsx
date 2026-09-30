import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { GeorefFields } from './GeorefFields';
import { CustomSelect } from './CustomSelect';
import { Technician } from '../types';
import { 
  User, 
  UserPlus, 
  Pencil, 
  Trash2, 
  X, 
  AlertTriangle,
  Phone,
  MapPin,
  CreditCard,
  Plus,
  Users
} from 'lucide-react';

export const TechnicianList: React.FC = () => {
  const { 
    technicians, 
    orders, 
    addTechnician, 
    deleteTechnician, 
    updateTechnician,
    showToast
  } = useCRM();

  // New Technician registration modal and input states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Taller' | 'Externo'>('Taller');
  const [doc, setDoc] = useState('');
  const [provincia, setProvincia] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [comments, setComments] = useState('');

  // Editing state managers
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'Taller' | 'Externo'>('Taller');
  const [editDoc, setEditDoc] = useState('');
  const [editProvincia, setEditProvincia] = useState('');
  const [editLocalidad, setEditLocalidad] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editComments, setEditComments] = useState('');

  // Deleting technician state
  const [deletingTech, setDeletingTech] = useState<Technician | null>(null);

  // Stats calculation per technician
  const getTechStats = (techName: string) => {
    const techOrders = orders.filter(o => o.assignedTechnician === techName);
    const active = techOrders.filter(o => o.status !== 'Entregado').length;
    const completed = techOrders.filter(o => o.status === 'Entregado' || o.status === 'Listo').length;
    return { total: techOrders.length, active, completed };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('El Nombre de Técnico es requerido.', 'warning');
      return;
    }

    try {
      addTechnician({
        name: name.trim(),
        category: category,
        documentId: doc.trim(),
        phone: phone.trim(),
        phone2: phone2.trim(),
        provincia,
        localidad,
        address: address.trim(),
        comments: comments.trim()
      });

      // Clear values representatively
      setName('');
      setCategory('Taller');
      setDoc('');
      setPhone('');
      setPhone2('');
      setProvincia('');
      setLocalidad('');
      setAddress('');
      setComments('');

      setIsAddModalOpen(false);
      showToast('Técnico registrado con éxito.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al registrar técnico.', 'error');
    }
  };

  const handleStartEdit = (tech: Technician) => {
    setEditingTech(tech);
    setEditName(tech.name);
    setEditCategory(tech.category || 'Taller');
    setEditDoc(tech.documentId || '');
    setEditPhone(tech.phone || '');
    setEditPhone2(tech.phone2 || '');
    setEditProvincia(tech.provincia || '');
    setEditLocalidad(tech.localidad || '');
    setEditAddress(tech.address || '');
    setEditComments(tech.comments || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    if (!editName.trim()) {
      showToast('El Nombre es de carácter obligatorio.', 'warning');
      return;
    }

    try {
      updateTechnician(editingTech.id, {
        name: editName.trim(),
        category: editCategory,
        documentId: editDoc.trim(),
        phone: editPhone.trim(),
        phone2: editPhone2.trim(),
        provincia: editProvincia,
        localidad: editLocalidad,
        address: editAddress.trim(),
        comments: editComments.trim()
      });

      setEditingTech(null);
      showToast('Ficha del técnico actualizada correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar datos.', 'error');
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingTech) {
      deleteTechnician(deletingTech.id);
      setDeletingTech(null);
    }
  };

  return (
    <div id="technicians-module" className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12 text-left">
      {/* Module Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight text-left">Directorio de Técnicos</h2>
          <p className="text-sm text-slate-500 mt-1 text-left">Administra el plantel interno de soporte o especialistas externos asignados para derivaciones.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-3">
          <div className="font-semibold text-xs bg-indigo-50/50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 inline-flex items-center space-x-1.5 height-fit">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span>Total plantilla:</span>
            <span className="font-mono font-bold bg-white text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-100/65">
              {technicians.length}
            </span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-xs hover:shadow-sm"
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Plus className="h-4.5 w-4.5 text-white" />
            <span className="text-white">Nuevo Técnico</span>
          </button>
        </div>
      </div>

      {/* Main Grid showing all technicians */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs text-left space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
          <h3 className="font-black text-slate-700 text-xs uppercase tracking-wider">Técnicos Registrados</h3>
          <span className="text-[11px] text-slate-400">Pase el cursor por la tarjeta para acciones rápidas</span>
        </div>

        {technicians.length === 0 ? (
          <div className="p-16 text-center bg-slate-50/40 rounded-xl border border-dashed border-slate-200/40 space-y-3">
            <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-slate-600 text-sm font-semibold">No se encontraron técnicos registrados en el taller.</p>
            <p className="text-slate-400 text-xs">Haga clic en el botón "Nuevo Técnico" ubicado arriba a la derecha para dar de alta su primera ficha técnica.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {technicians.map((tech) => {
              const stats = getTechStats(tech.name);
              const isExternal = tech.category === 'Externo';

              return (
                <div 
                  key={tech.id} 
                  className="border border-slate-200/50 hover:border-slate-200 bg-slate-50/15 hover:bg-white rounded-xl p-4.5 transition duration-150 flex flex-col justify-between shadow-2xs hover:shadow-xs group"
                >
                  <div className="text-left">
                    {/* Name panel & buttons */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 text-left">
                        <p className="font-black text-slate-800 text-sm leading-snug">{tech.name}</p>
                        <span className={`text-[10px] font-bold tracking-wider uppercase mt-1 inline-block px-1.5 py-0.5 rounded-md border ${
                          isExternal 
                            ? 'bg-amber-50/70 text-amber-705 border-amber-200/50' 
                            : 'bg-indigo-50/70 text-indigo-705 border-indigo-200/50'
                        }`}>
                          {isExternal ? 'Técnico Externo' : 'Técnico de Taller'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2 opacity-50 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleStartEdit(tech)}
                          className="p-1.5 text-slate-450 hover:text-indigo-600 hover:bg-slate-100/80 rounded transition cursor-pointer"
                          title="Editar Ficha"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTech(tech)}
                          className="p-1.5 text-slate-450 hover:text-rose-600 hover:bg-slate-100/80 rounded transition cursor-pointer"
                          title="Eliminar Técnico"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Additional fields display */}
                    <div className="mt-4 space-y-2 text-xs text-slate-600 text-left">
                      {tech.documentId && (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-500">DNI/CUIT: {tech.documentId}</span>
                        </div>
                      )}

                      {tech.phone && (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-600 font-medium">
                            {tech.phone} {tech.phone2 ? ` / ${tech.phone2}` : ''}
                          </span>
                        </div>
                      )}

                      {(tech.provincia || tech.localidad || tech.address) && (
                        <div className="flex items-start space-x-2 text-[11px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-500 leading-tight">
                            {tech.address ? `${tech.address}, ` : ''}
                            {tech.localidad || ''} {tech.provincia ? ` (${tech.provincia})` : ''}
                          </span>
                        </div>
                      )}

                      {tech.comments && (
                        <div className="mt-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/60 text-[10.5px] text-slate-550 leading-relaxed italic">
                          "{tech.comments}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance indicators */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/30">
                      <span className="text-[10px] text-slate-400 block font-medium">Asignados</span>
                      <span className="font-mono font-bold text-slate-800">{stats.total}</span>
                    </div>
                    <div className="bg-amber-500/5 p-1.5 rounded-lg border border-amber-500/10">
                      <span className="text-[10px] text-amber-600 block font-medium">Activos</span>
                      <span className="font-mono font-bold text-amber-705">{stats.active}</span>
                    </div>
                    <div className="bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10">
                      <span className="text-[10px] text-emerald-600 block font-medium">Listos</span>
                      <span className="font-mono font-bold text-emerald-705">{stats.completed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW Technician Registration Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-scale-up text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Alta de Nuevo Técnico</h3>
                  <p className="text-[11px] text-slate-450 mt-0.5">Registre la ficha de un nuevo operario técnico de taller o colaborador externo.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-slate-900 block">Nombre Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        placeholder="Ej. Martín Palermo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                      />
                    </div>
                  </div>

                  {/* Categoria (Taller u Externo) */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-slate-900 block">Categoría / Tipo de Técnico *</label>
                    <CustomSelect
                      value={category}
                      onChange={(val) => setCategory(val as 'Taller' | 'Externo')}
                      options={[
                        { value: 'Taller', label: 'Técnico del Taller (Interno)' },
                        { value: 'Externo', label: 'Técnico Externo (Soporte Tercerizado)' }
                      ]}
                    />
                  </div>

                  {/* DNI CUIT */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">DNI/CUIT</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Ej. 20-30456789-2"
                      value={doc}
                      onChange={(e) => setDoc(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Georeferencia (Provincia / Localidad) */}
                  <GeorefFields
                    provinciaValue={provincia}
                    setProvinciaValue={setProvincia}
                    localidadValue={localidad}
                    setLocalidadValue={setLocalidad}
                    variant="indigo"
                    labelClassName="text-xs font-semibold text-slate-500 block text-left"
                    inputClassName="w-full text-xs p-2.5 bg-slate-50/30 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 pr-9 transition font-medium"
                  />

                  {/* Direccion */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Dirección</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Calle, Número, Piso"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Telefono 1 */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Teléfono de Contacto 1</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Móvil principal"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                      />
                    </div>
                  </div>

                  {/* Telefono 2 */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Teléfono Alternativo 2</label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Contacto secundario o fijo"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Comentarios */}
                  <div className="space-y-1.5 text-xs md:col-span-2 text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Especialidad / Notas del Técnico</label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Especialista en cambio de integrados, microsoldaduras o reballing Apple"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs resize-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <UserPlus className="h-4 w-4 text-white" />
                  <span className="text-white">Registrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Dialog */}
      {editingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-scale-up text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-left">
              <div className="flex items-center space-x-2 text-left">
                <Pencil className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Editar Ficha de Técnico</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTech(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-slate-900 block">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Categoria (Taller u Externo) */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-slate-900 block">Categoría / Tipo de Técnico *</label>
                    <CustomSelect
                      value={editCategory}
                      onChange={(val) => setEditCategory(val as 'Taller' | 'Externo')}
                      options={[
                        { value: 'Taller', label: 'Técnico del Taller (Interno)' },
                        { value: 'Externo', label: 'Técnico Externo (Soporte Tercerizado)' }
                      ]}
                    />
                  </div>

                  {/* DNI CUIT */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">DNI/CUIT</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={editDoc}
                      onChange={(e) => setEditDoc(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Georef Provincia y Localidad */}
                  <GeorefFields
                    provinciaValue={editProvincia}
                    setProvinciaValue={setEditProvincia}
                    localidadValue={editLocalidad}
                    setLocalidadValue={setEditLocalidad}
                    variant="indigo"
                    labelClassName="text-xs font-semibold text-slate-500 block text-left"
                    inputClassName="w-full text-xs p-2.5 bg-slate-50/30 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-404 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 pr-9 transition font-medium"
                  />

                  {/* Dirección */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Dirección</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Teléfono 1 */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Teléfono 1</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Teléfono 2 */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Teléfono 2</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={editPhone2}
                      onChange={(e) => setEditPhone2(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs transition"
                    />
                  </div>

                  {/* Comentarios */}
                  <div className="space-y-1.5 text-xs md:col-span-2 text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Comentarios / Especialidad</label>
                    <textarea
                      rows={2}
                      value={editComments}
                      onChange={(e) => setEditComments(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/30 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 font-medium text-xs resize-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditingTech(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white rounded-lg transition cursor-pointer"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <span className="text-white">Guardar Ficha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTech && (() => {
        const stats = getTechStats(deletingTech.name);
        const hasWorkload = stats.total > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-scale-up text-left">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-left">
                <div className="flex items-center space-x-2 text-rose-600">
                  <AlertTriangle className="h-5 w-5 text-rose-650 animate-pulse" />
                  <h3 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Eliminar Técnico</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingTech(null)}
                  className="p-1 px-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer font-bold text-base"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                <p className="text-sm text-slate-700 text-left">
                  ¿Está seguro de que desea retirar a <strong>{deletingTech.name}</strong> del sistema?
                </p>

                {hasWorkload ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 space-y-2 text-left">
                    <p className="font-bold flex items-center gap-1 text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>¡Atención! Este técnico tiene servicios asignados:</span>
                    </p>
                    <p className="leading-relaxed">
                      Posee actualmente <strong>{stats.total} servicios vinculados</strong> (de los cuales <strong>{stats.active} siguen activos</strong> en curso).
                    </p>
                    <p className="leading-relaxed">
                      Le recomendamos reasignar sus servicios activos a otros operarios comerciales desde el tablero Kanban antes de proceder a la baja de su ficha técnica.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
                    Este técnico no posee órdenes vinculadas actualmente, por lo que su eliminación es totalmente limpia y segura.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeletingTech(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer"
                >
                  Confirmar Eliminación
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
