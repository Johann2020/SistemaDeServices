import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import {
  Users,
  Shield,
  User,
  Sparkles,
  CheckCircle,
  X,
  Settings,
  FileText,
  Image,
  Sliders,
  Activity
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();

  const {
    workshopName,
    workshopLogo,
    logoPosition,
    ticketTitle,
    ticketSub,
    ticketTerms,
    updateWorkshopSettings,
  } = useCRM();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'workshop'>('workshop');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const triggerSuccessMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Por favor elija un logo de hasta 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        updateWorkshopSettings({ logo: base64 });
        triggerSuccessMsg("¡Logo del taller cargado correctamente!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    updateWorkshopSettings({ logo: "" });
    triggerSuccessMsg("Se ha eliminado el logo del taller.");
  };

  return (
    <div className="space-y-6 select-none font-sans max-w-6xl mx-auto">
      {/* Upper banner summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Shield className="h-40 w-40" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-1.5">
          <div className="inline-flex items-center space-x-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-md text-xs font-semibold">
            <Sparkles className="h-3 w-3 mr-1" />
            <span>Consola de Conserjería de Administrador</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Panel de Control de Cuentas y Accesos</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Habilite o deniegue solicitudes de registro realizadas con credenciales del taller, 
            actualice los permisos por categorías (Supervisor, Técnico, Lector) o ingrese a la interfaz específica 
            de un usuario con la función de suplantación temporal de sesión.
          </p>
        </div>
      </div>

      {/* Internal interactive messages */}
      {successMsg && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-scale-up">
          <CheckCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sub Tabs Toggle */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 leading-none ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Usuarios y Accesos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('workshop')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center space-x-1.5 leading-none ${
            activeSubTab === 'workshop'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Configuración de Taller</span>
        </button>
      </div>

      {activeSubTab === 'users' && (
        <div className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
            <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Mi Cuenta</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Información de la sesión activa</p>
            </div>
          </div>

          {user && (
            <div className="p-6">
              <div className="flex items-center space-x-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0 select-none">
                  {user.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{user.email}</p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 text-blue-600 bg-blue-50/30 border border-blue-200 rounded-full px-2.5 py-0.5 text-[10px] select-none font-bold">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      <span>Google Auth</span>
                    </span>
                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'workshop' && (
        <div className="space-y-6">
          {/* Settings form cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Basic configurations column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center mb-2">
                  <Sliders className="h-4.5 w-4.5 mr-2 text-indigo-500" />
                  Identidad de Taller
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nombre Comercial del Taller</label>
                    <input
                      type="text"
                      value={workshopName}
                      onChange={(e) => updateWorkshopSettings({ name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs animate-none"
                      placeholder="Ej: S.A.T. SERVICIO TÉCNICO"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Subtítulo / Especialidad de Cabecera</label>
                    <input
                      type="text"
                      value={ticketSub}
                      onChange={(e) => updateWorkshopSettings({ ticketSub: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs"
                      placeholder="Ej: Laboratorio de Diagnóstico Informático"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Título en Recibo / Remito</label>
                    <input
                      type="text"
                      value={ticketTitle}
                      onChange={(e) => updateWorkshopSettings({ ticketTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-850 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs animate-none"
                      placeholder="Ej: TICKET DE CONTROL"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Disposición de Logo (Recibo)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateWorkshopSettings({ logoPosition: 'side' })}
                        className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition select-none flex items-center justify-center space-x-1.5 ${
                          logoPosition !== 'top'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
                        }`}
                      >
                        <span>Al costado (Lado)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWorkshopSettings({ logoPosition: 'top' })}
                        className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition select-none flex items-center justify-center space-x-1.5 ${
                          logoPosition === 'top'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
                        }`}
                      >
                        <span>Arriba (Superior)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Legal terms / letter size */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center">
                    <FileText className="h-4.5 w-4.5 mr-2 text-indigo-500" />
                    Condiciones del Ticket de Recepción
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Está seguro de reestablecer las cláusulas por defecto del sistema?")) {
                        updateWorkshopSettings({
                          ticketTerms: `1. Diagnóstico Inicial: El presupuesto provisto es de carácter estimado. Al abrir el equipo, el laboratorio técnico se reserva el derecho de actualizarlo bajo aviso si se descubrieran daños ocultos persistentes.
2. Garantía Limitada: Todo trabajo técnico cuenta con una cobertura de 90 días corridos sobre la mano de obra aplicada y los componentes físicos sustituidos descriptos en el presente comprobante comercial.
3. Políticas de Resguardo: El cliente declara haber resguardado y copiado su información personal previo al ingreso. El taller no asume responsabilidad alguna ante caídas lógicas o formateos lógicos derivados de pruebas de hardware necesarias.
4. Abandono de Bienes: Pasados los 90 días desde la notificación formal del dictamen final ("Listo" o "Retirado/Devuelto"), el taller se reserva el derecho de aplicar cargos diarios por custodia de almacenamiento o subastar el dispositivo para cubrir gastos incurridos según el Código Civil.`
                        });
                        triggerSuccessMsg("Cláusulas reestablecidas por defecto.");
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reestablecer Predeterminado
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Redacte aquí las condiciones contractuales o avisos importantes impresos al pie de cada remito de servicio.
                </p>

                <div className="space-y-1">
                  <textarea
                    value={ticketTerms}
                    rows={12}
                    onChange={(e) => updateWorkshopSettings({ ticketTerms: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-750 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 leading-relaxed"
                    placeholder="Ingrese las condiciones de recepción..."
                  />
                </div>
              </div>
            </div>

            {/* Logo and real-time visualization column */}
            <div className="space-y-6">
              {/* Logo upload block */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center mb-2">
                  <Image className="h-4.5 w-4.5 mr-2 text-indigo-500" />
                  Logo Oficial de Empresa
                </h3>

                {/* Logo preview zone */}
                {workshopLogo ? (
                  <div className="space-y-3.5">
                    <div className="h-32 border border-slate-150 rounded-xl bg-slate-50 flex items-center justify-center p-3">
                      <img src={workshopLogo} alt="Logo de empresa" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleClearLogo}
                        className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition cursor-pointer select-none text-center"
                      >
                        Quitar Logo
                      </button>
                      <label className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer select-none text-center block">
                        <span>Reemplazar</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition duration-150">
                    <div className="mx-auto h-10 w-10 text-slate-400 bg-slate-50 rounded-lg flex items-center justify-center mb-2 border border-slate-100">
                      <Image className="h-5 w-5" />
                    </div>
                    <label className="cursor-pointer">
                      <span className="text-indigo-600 font-bold text-xs hover:underline block mb-1">Cargar Archivo de Logo</span>
                      <p className="text-[9px] text-slate-400 uppercase font-semibold">Formatos JPG, PNG, GIF de hasta 2MB</p>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* Side bar min-preview badge */}
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold text-slate-400 bg-slate-800 px-2.5 py-0.5 border border-slate-700 rounded uppercase tracking-wider">Así se verá en menú lateral</span>
                </div>
                <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/45 flex items-center space-x-3">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white shrink-0">
                    <Activity className="h-5 w-5 stroke-[2]" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-bold truncate text-slate-105 leading-none">{workshopName || "S.A.T. SERVICIO TÉCNICO"}</h4>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">Tech CRM & Soporte</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal italic">
                  La identidad visual se propaga instantáneamente por todo el sistema, incluyendo cabeceras de remitos en PDF, impresión de comprobantes y remitentes de notificaciones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
