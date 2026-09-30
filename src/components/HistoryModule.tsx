import React from 'react';
import { useCRM } from '../context/CRMContext';
import { Clock, Undo2, ChevronRight, CheckCircle2 } from 'lucide-react';

export const HistoryModule: React.FC = () => {
  const { actionHistory, undoToPoint } = useCRM();

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24 lg:pb-8 flex flex-col h-full overflow-y-auto">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-xs border border-slate-200 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-100 p-3 rounded-xl border border-indigo-200 shadow-inner">
            <Clock className="h-7 w-7 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Historial de Cambios</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Últimos {actionHistory.length} registros del sistema</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 mb-1">Registro de Actividad Reciente</h3>
          <p className="text-xs text-slate-500 font-medium">Revierta hacia un estado anterior del sistema haciendo clic en "Revertir a este punto". Tenga en cuenta que todas las acciones posteriores a la elegida también se desharán.</p>
        </div>

        <div className="p-0 overflow-y-auto flex-1">
          {actionHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="bg-slate-50 p-6 rounded-full mb-4 ring-8 ring-slate-50 ring-opacity-50">
                <Clock className="h-10 w-10 text-slate-300" />
              </div>
              <h4 className="text-slate-800 font-bold mb-2">No hay cambios recientes</h4>
              <p className="text-sm text-slate-500 max-w-sm">
                Las acciones que realicen en el sistema, como crear clientes o modificar services, aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 relative">
              <div className="absolute left-[39px] top-0 bottom-0 w-px bg-slate-200 z-0 hidden sm:block"></div>
              
              {/* Show most recent first. The array is chronological, so we reverse it for display. */}
              {[...actionHistory].reverse().map((entry, index) => {
                const isLatest = index === 0;
                
                return (
                  <div key={entry.id} className="p-4 sm:p-6 relative z-10 flex flex-col sm:flex-row gap-4 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex space-x-4 flex-1">
                      <div className={`mt-0.5 shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 ${isLatest ? 'bg-indigo-600 border-indigo-200 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {isLatest ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Clock className="h-4 w-4" />}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${isLatest ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <p className="text-sm font-black text-slate-800">{entry.description}</p>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          ID interno: <span className="font-mono">{entry.id}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center sm:justify-end shrink-0 pl-12 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => undoToPoint(entry.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer font-bold text-amber-600 hover:bg-amber-50 hover:text-amber-700 border border-amber-200/50"
                        title="Revertir a este punto (Se perderán las acciones posteriores)"
                      >
                        <Undo2 className="h-4 w-4" />
                        <span>Revertir a este punto</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
