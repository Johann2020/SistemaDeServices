import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, ChevronDown, Loader2, X, Map, Clock } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

// Static fallbacks for zero-delay instant render and offline resilience
const ARG_PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'Tucumán'
].sort();

interface GeorefFieldsProps {
  provinciaValue: string;
  setProvinciaValue: (val: string) => void;
  localidadValue: string;
  setLocalidadValue: (val: string) => void;
  variant?: 'blue' | 'indigo';
  labelClassName?: string;
  inputClassName?: string;
}

export const GeorefFields: React.FC<GeorefFieldsProps> = ({
  provinciaValue,
  setProvinciaValue,
  localidadValue,
  setLocalidadValue,
  variant = 'blue',
  labelClassName,
  inputClassName
}) => {
  const { clients } = useCRM();

  const [provinces, setProvinces] = useState<string[]>(ARG_PROVINCES);
  const [localities, setLocalities] = useState<string[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingLocalities, setIsLoadingLocalities] = useState(false);

  const frequentProvinces = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      if (c.provincia) counts[c.provincia] = (counts[c.provincia] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [clients]);

  const frequentLocalities = useMemo(() => {
    if (!provinciaValue) return [];
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      if (c.provincia === provinciaValue && c.localidad) {
        counts[c.localidad] = (counts[c.localidad] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [clients, provinciaValue]);

  // Filter and dropdown states
  const [provQuery, setProvQuery] = useState(provinciaValue);
  const [localQuery, setLocalQuery] = useState(localidadValue);
  const [isProvOpen, setIsProvOpen] = useState(false);
  const [isLocalOpen, setIsLocalOpen] = useState(false);

  // Refs for closing on click outside
  const provContainerRef = useRef<HTMLDivElement>(null);
  const localContainerRef = useRef<HTMLDivElement>(null);

  // Sync inputs with outer values if they change externally
  useEffect(() => {
    setProvQuery(provinciaValue);
  }, [provinciaValue]);

  useEffect(() => {
    setLocalQuery(localidadValue);
  }, [localidadValue]);

  // Fetch provinces on mount to ensure fresh data
  useEffect(() => {
    async function loadProvinces() {
      setIsLoadingProvinces(true);
      try {
        const response = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre');
        if (response.ok) {
          const data = await response.json();
          if (data && data.provincias) {
            const fetchedNames = data.provincias.map((p: any) => p.nombre).sort();
            setProvinces(fetchedNames.length > 0 ? fetchedNames : ARG_PROVINCES);
          }
        }
      } catch (err) {
        console.warn('Georef provinces API failed, using static fallback:', err);
      } finally {
        setIsLoadingProvinces(false);
      }
    }
    loadProvinces();
  }, []);

  // Fetch localities whenever selected province changes
  useEffect(() => {
    if (!provinciaValue) {
      setLocalities([]);
      return;
    }

    async function loadLocalities() {
      setIsLoadingLocalities(true);
      try {
        // Find exact or closest matching province name for the query parameter
        const queryProv = provinciaValue === 'CABA' ? 'Ciudad Autónoma de Buenos Aires' : provinciaValue;
        const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(queryProv)}&campos=nombre&max=2500`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.localidades) {
            // Deduplicate names, sort alphabetically
            const names: string[] = Array.from(new Set(data.localidades.map((loc: any) => loc.nombre))) as string[];
            names.sort();
            setLocalities(names);
          }
        }
      } catch (err) {
        console.warn('Georef localities API failed, manual entry only:', err);
        setLocalities([]);
      } finally {
        setIsLoadingLocalities(false);
      }
    }

    loadLocalities();
  }, [provinciaValue]);

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (provContainerRef.current && !provContainerRef.current.contains(event.target as Node)) {
        setIsProvOpen(false);
      }
      if (localContainerRef.current && !localContainerRef.current.contains(event.target as Node)) {
        setIsLocalOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtering lists
  const filteredProvinces = provinces.filter(p =>
    p.toLowerCase().includes(provQuery.toLowerCase())
  );

  const filteredLocalities = localities.filter(l =>
    l.toLowerCase().includes(localQuery.toLowerCase())
  );

  const focusRing = variant === 'indigo' ? 'focus:ring-indigo-500' : 'focus:ring-sky-500';
  const defaultLabelClass = variant === 'indigo'
    ? 'text-xs font-semibold text-slate-500 block'
    : 'text-xs font-bold text-slate-655 block text-slate-705';
  const defaultInputClass = variant === 'indigo'
    ? `w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 ${focusRing} focus:bg-white pr-9 transition`
    : `w-full text-xs p-2.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 ${focusRing} pr-9 transition`;

  const finalLabelClass = labelClassName || defaultLabelClass;
  const finalInputClass = inputClassName || defaultInputClass;

  return (
    <>
      {/* Provincia Selector */}
      <div className="space-y-1 relative" ref={provContainerRef}>
        <label className={`${finalLabelClass} flex items-center space-x-1`}>
          <Map className="h-3 w-3 text-slate-400 shrink-0" />
          <span>Provincia</span>
        </label>
        <div className="relative">
          <input
            type="text"
            autoComplete="one-time-code"
            name="provincia_custom_field_search"
            value={provQuery}
            onFocus={() => setIsProvOpen(true)}
            onChange={(e) => {
              setProvQuery(e.target.value);
              setProvinciaValue(e.target.value);
              setIsProvOpen(true);
              // Clear locality if province resets
              if (!e.target.value) {
                setLocalQuery('');
                setLocalidadValue('');
              }
            }}
            placeholder="Seleccione o escriba provincia..."
            className={finalInputClass}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {isLoadingProvinces ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : provQuery ? (
              <button
                type="button"
                onClick={() => {
                  setProvQuery('');
                  setProvinciaValue('');
                  setLocalQuery('');
                  setLocalidadValue('');
                  setIsProvOpen(true);
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Dropdown list */}
        {isProvOpen && (
          <div className="absolute z-[60] left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs animate-scale-up animate-duration-150">
            {filteredProvinces.length === 0 ? (
              <div
                className="p-3 text-slate-400 italic text-center cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  setProvinciaValue(provQuery);
                  setIsProvOpen(false);
                }}
              >
                Usar "{provQuery}"
              </div>
            ) : (
              <>
                {!provQuery && frequentProvinces.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Frecuentes
                    </div>
                    {frequentProvinces.map(({ name, count }) => (
                      <button
                        key={`freq-${name}`}
                        type="button"
                        onClick={() => {
                          setProvQuery(name);
                          setProvinciaValue(name);
                          setLocalQuery('');
                          setLocalidadValue('');
                          setIsProvOpen(false);
                          setIsLocalOpen(true);
                        }}
                        className={`w-full text-left px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                          provinciaValue === name ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{count}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}
                {filteredProvinces.map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => {
                      setProvQuery(prov);
                      setProvinciaValue(prov);
                      setLocalQuery('');
                      setLocalidadValue('');
                      setIsProvOpen(false);
                      setIsLocalOpen(true);
                    }}
                    className={`w-full text-left px-3 py-2 cursor-pointer transition ${
                      provinciaValue === prov ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Localidad Selector */}
      <div className="space-y-1 relative" ref={localContainerRef}>
        <label className={`${finalLabelClass} flex items-center space-x-1`}>
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Localidad</span>
        </label>
        <div className="relative">
          <input
            type="text"
            autoComplete="one-time-code"
            name="localidad_custom_field_search"
            value={localQuery}
            onFocus={() => setIsLocalOpen(true)}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setLocalidadValue(e.target.value);
              setIsLocalOpen(true);
            }}
            placeholder={provinciaValue ? "Seleccione o escriba localidad..." : "Seleccione provincia primero"}
            className={`${finalInputClass} ${!provinciaValue ? 'opacity-70 bg-slate-50/50' : ''}`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {isLoadingLocalities ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : localQuery ? (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  setLocalidadValue('');
                  setIsLocalOpen(true);
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Dropdown list */}
        {isLocalOpen && provinciaValue && (
          <div className="absolute z-[60] left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs animate-scale-up animate-duration-150">
            {filteredLocalities.length === 0 && !frequentLocalities.length ? (
              <div
                className="p-3 text-slate-400 italic text-center cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  setLocalidadValue(localQuery);
                  setIsLocalOpen(false);
                }}
              >
                {localQuery ? `Usar "${localQuery}"` : 'Escriba para añadir localidad'}
              </div>
            ) : (
              <>
                {!localQuery && frequentLocalities.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Frecuentes
                    </div>
                    {frequentLocalities.map(({ name, count }) => (
                      <button
                        key={`freq-${name}`}
                        type="button"
                        onClick={() => {
                          setLocalQuery(name);
                          setLocalidadValue(name);
                          setIsLocalOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                          localidadValue === name ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{count}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}
                {filteredLocalities.length === 0 ? (
                  <div
                    className="p-3 text-slate-400 italic text-center cursor-pointer hover:bg-slate-50"
                    onClick={() => {
                      setLocalidadValue(localQuery);
                      setIsLocalOpen(false);
                    }}
                  >
                    {localQuery ? `Usar "${localQuery}"` : 'Escriba para añadir localidad'}
                  </div>
                ) : (
                  filteredLocalities.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setLocalQuery(loc);
                        setLocalidadValue(loc);
                        setIsLocalOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 cursor-pointer transition ${
                        localidadValue === loc ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {loc}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
