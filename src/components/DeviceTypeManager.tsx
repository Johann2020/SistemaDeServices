import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { Settings, Plus, X, Check } from 'lucide-react';

interface DeviceTypeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceTypeManager: React.FC<DeviceTypeManagerProps> = ({ isOpen, onClose }) => {
  const { allDeviceTypes, activeDeviceTypes, addDeviceType, setActiveDeviceTypes, showToast } = useCRM();
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [newTypeName, setNewTypeName] = useState('');

  const validation = useMemo(() => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return { status: 'empty' as const, message: '' };
    const lower = trimmed.toLowerCase();
    const exactMatch = allDeviceTypes.some(t => t.toLowerCase() === lower);
    if (exactMatch) return { status: 'duplicate' as const, message: 'Esta categoria ya existe' };
    const similar = allDeviceTypes.find(t =>
      t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase()) ||
      t.toLowerCase().startsWith(lower) || lower.startsWith(t.toLowerCase())
    );
    if (similar) return { status: 'similar' as const, message: `Categoria similar encontrada: ${similar}` };
    return { status: 'available' as const, message: 'Categoria disponible' };
  }, [newTypeName, allDeviceTypes]);

  const handleAdd = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed || validation.status === 'duplicate') return;
    addDeviceType(trimmed);
    showToast(`Categoria "${trimmed}" agregada`, 'success');
    setNewTypeName('');
  };

  const handleToggle = (type: string) => {
    const isActive = activeDeviceTypes.includes(type);
    if (isActive) {
      setActiveDeviceTypes(activeDeviceTypes.filter(t => t !== type));
    } else {
      setActiveDeviceTypes([...activeDeviceTypes, type]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Tipos de Dispositivo</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              activeTab === 'add'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Nueva Categoria
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              activeTab === 'manage'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Gestionar Categorias
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'add' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Nombre de la categoria</label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  placeholder="Ej: Router, Drone, Proyector"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition font-medium"
                />
              </div>

              {newTypeName.trim() && (
                <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
                  validation.status === 'duplicate'
                    ? 'bg-red-50 text-red-600'
                    : validation.status === 'similar'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {validation.status === 'available' && <Check className="inline h-3 w-3 mr-1" />}
                  {validation.message}
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={!newTypeName.trim() || validation.status === 'duplicate'}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {allDeviceTypes.map(type => {
                const isActive = activeDeviceTypes.includes(type);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition"
                  >
                    <span className={`text-xs font-medium ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                      {type}
                    </span>
                    <button
                      onClick={() => handleToggle(type)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 italic mt-3 px-3">
                Los servicios existentes no se veran afectados al desactivar una categoria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
