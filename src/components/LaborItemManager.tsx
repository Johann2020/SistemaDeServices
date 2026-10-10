import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import { Settings, Plus, X, Trash2, DollarSign, Pencil, Check } from 'lucide-react';

interface LaborItemManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LaborItemManager: React.FC<LaborItemManagerProps> = ({ isOpen, onClose }) => {
  const { laborItemTemplates, setLaborItemTemplates, showToast } = useCRM();
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed || newPrice <= 0) return;
    if (laborItemTemplates.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Ya existe un ítem con ese nombre', 'error');
      return;
    }
    setLaborItemTemplates([...laborItemTemplates, { name: trimmed, price: newPrice }]);
    showToast(`Ítem "${trimmed}" agregado`, 'success');
    setNewName('');
    setNewPrice(0);
  };

  const handleDelete = (idx: number) => {
    const name = laborItemTemplates[idx].name;
    setLaborItemTemplates(laborItemTemplates.filter((_, i) => i !== idx));
    showToast(`Ítem "${name}" eliminado`, 'success');
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleStartEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditName(laborItemTemplates[idx].name);
    setEditPrice(laborItemTemplates[idx].price);
  };

  const handleSaveEdit = () => {
    if (editingIdx === null) return;
    const trimmed = editName.trim();
    if (!trimmed || editPrice <= 0) return;
    const duplicate = laborItemTemplates.some((t, i) => i !== editingIdx && t.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      showToast('Ya existe otro ítem con ese nombre', 'error');
      return;
    }
    const updated = laborItemTemplates.map((t, i) => i === editingIdx ? { name: trimmed, price: editPrice } : t);
    setLaborItemTemplates(updated);
    setEditingIdx(null);
    showToast('Ítem actualizado', 'success');
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
            <h2 className="text-sm font-bold text-slate-800">Ítems de Mano de Obra</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] text-slate-500">
            Agregá ítems predeterminados de mano de obra. Al crear una orden, aparecerán como sugerencias rápidas.
          </p>

          {/* Add new item */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-2">
            <input
              type="text"
              placeholder="Nombre del ítem (ej. Reinstalación Windows)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  placeholder="Precio"
                  value={newPrice || ''}
                  onChange={e => setNewPrice(parseFloat(e.target.value) || 0)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || newPrice <= 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </button>
            </div>
          </div>

          {/* List */}
          {laborItemTemplates.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">
              No hay ítems predeterminados todavía.
            </p>
          ) : (
            <div className="space-y-1.5">
              {laborItemTemplates.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {editingIdx === idx ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); }}
                        className="flex-1 min-w-0 text-xs p-1.5 bg-white border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        autoFocus
                      />
                      <div className="relative w-24">
                        <DollarSign className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                          type="number"
                          value={editPrice || ''}
                          onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); }}
                          className="w-full pl-5 pr-1.5 py-1.5 text-xs bg-white border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
                        />
                      </div>
                      <button onClick={handleSaveEdit} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingIdx(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded transition">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-700 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">${item.price.toLocaleString('es-AR')}</span>
                      </div>
                      <button onClick={() => handleStartEdit(idx)} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded transition">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDelete(idx)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-right">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
