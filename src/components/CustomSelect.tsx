import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Cpu, 
  Monitor, 
  Printer, 
  Gamepad2, 
  Watch, 
  Radio, 
  Flame, 
  RefreshCw, 
  Wind, 
  Coffee, 
  Camera, 
  Sliders, 
  Wrench,
  HelpCircle,
  Flag,
  User,
  LogIn,
  CheckCircle2,
  PackageCheck,
  ClipboardList
} from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

// Helper to resolve device or contextual icon automatically
export const getContextualIcon = (value: string) => {
  const normValue = value.toLowerCase().trim();

  // Status mapping
  if (normValue === 'ingresado') {
    return <ClipboardList className="h-4 w-4 text-zinc-500" />;
  }
  if (normValue === 'en reparacion' || normValue === 'en reparación') {
    return <Wrench className="h-4 w-4 text-blue-500" />;
  }
  if (normValue === 'listo') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (normValue === 'entregado') {
    return <PackageCheck className="h-4 w-4 text-indigo-500" />;
  }

  // Devices mapping
  if (normValue.includes('notebook') || normValue.includes('netbook') || normValue.includes('laptop')) {
    return <Laptop className="h-4 w-4" />;
  }
  if (normValue === 'teléfono' || normValue === 'telefono' || normValue.includes('smartphone') || normValue.includes('celular')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (normValue === 'tablet') {
    return <Tablet className="h-4 w-4" />;
  }
  if (normValue.includes('cpu') || normValue.includes('pc') || normValue === 'computadora' || normValue.includes('all-in-one') || normValue.includes('all in one')) {
    return <Cpu className="h-4 w-4" />;
  }
  if (normValue.includes('televisor') || normValue.includes('monitor') || normValue.includes('tv') || normValue.includes('audio/video')) {
    return <Monitor className="h-4 w-4" />;
  }
  if (normValue.includes('impresora')) {
    return <Printer className="h-4 w-4" />;
  }
  if (normValue.includes('consola') || normValue.includes('videojuegos') || normValue.includes('gamepad') || normValue.includes('ps4') || normValue.includes('ps5') || normValue.includes('playstation')) {
    return <Gamepad2 className="h-4 w-4" />;
  }
  if (normValue.includes('smartwatch') || normValue === 'reloj') {
    return <Watch className="h-4 w-4" />;
  }
  if (normValue.includes('radio') || normValue.includes('parlante') || normValue.includes('audio') || normValue.includes('equipo de audio')) {
    return <Radio className="h-4 w-4" />;
  }
  if (normValue.includes('microondas') || normValue.includes('horno')) {
    return <Flame className="h-4 w-4" />;
  }
  if (normValue.includes('lavarropas') || normValue.includes('secarropas')) {
    return <RefreshCw className="h-4 w-4" />;
  }
  if (normValue.includes('aire') || normValue.includes('ventilador') || normValue.includes('accondicionado')) {
    return <Wind className="h-4 w-4" />;
  }
  if (normValue.includes('cafetera')) {
    return <Coffee className="h-4 w-4" />;
  }
  if (normValue.includes('licuadora') || normValue.includes('procesadora')) {
    return <Sliders className="h-4 w-4" />;
  }
  if (normValue.includes('cámara') || normValue.includes('camara') || normValue.includes('fotográfica')) {
    return <Camera className="h-4 w-4" />;
  }
  
  // Priority mapping
  if (normValue === 'baja') {
    return <Flag className="h-4 w-4 text-emerald-500 fill-emerald-50" />;
  }
  if (normValue === 'media') {
    return <Flag className="h-4 w-4 text-amber-500 fill-amber-50" />;
  }
  if (normValue === 'alta') {
    return <Flag className="h-4 w-4 text-orange-500 fill-orange-50" />;
  }
  if (normValue === 'crítica' || normValue === 'critica') {
    return <Flag className="h-4 w-4 text-rose-500 fill-rose-50 animate-pulse" />;
  }

  // Fallback for technician name
  if (value && !value.startsWith('--') && (normValue.includes('ana') || normValue.includes('carlos') || normValue.includes('luis') || normValue.includes('elena') || normValue.includes('técnico') || normValue.includes('tecnico') || normValue.length > 5)) {
    return <User className="h-4 w-4 text-slate-500" />;
  }

  if (normValue.includes('otro') || normValue.includes('otras')) {
    return <Wrench className="h-4 w-4" />;
  }

  return <HelpCircle className="h-4 w-4" />;
};

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => {
    if (!value) return false;
    const val1 = opt.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const val2 = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (val1 === val2) return true;
    if (val2 === 'laptop' && val1 === 'notebook') return true;
    if ((val2 === 'smartphone' || val2 === 'celular') && val1 === 'telefono') return true;
    if ((val2 === 'pc' || val2 === 'cpu' || val2 === 'cpu / pc' || val2 === 'all-in-one') && val1 === 'cpu / pc desktop') return true;
    if ((val2 === 'netbook' || val2 === 'portatil') && val1 === 'notebook') return true;
    if (val2 === 'consola' && val1 === 'consola de videojuegos') return true;
    if (val2 === 'gps' && val1 === 'otro') return true;
    return false;
  });
  const hasIcon = selectedOption ? !!getContextualIcon(selectedOption.value) : false;

  // Smart detection for compact environments (where parent passes custom padding like p-1.5, or small texts)
  const isCompact = className.includes('p-1.5') || className.includes('py-1.5') || className.includes('text-[10px]') || className.includes('text-[10.5px]');

  // Strip conflicting layout and padding classes from extra className to protect internal design
  const cleanedClassName = className
    .split(' ')
    .filter(c => {
      const cls = c.trim();
      return (
        cls !== '' &&
        !cls.startsWith('p-') &&
        !cls.startsWith('py-') &&
        !cls.startsWith('px-') &&
        !cls.startsWith('rounded') &&
        !cls.startsWith('bg-') &&
        !cls.startsWith('border-') &&
        !cls.startsWith('text-')
      );
    })
    .join(' ');

  // Determine button styles dynamically based on layout mode (compact vs standard)
  const buttonStyleClasses = isCompact
    ? `bg-white border border-slate-200 rounded text-slate-800 font-semibold ${
        hasIcon ? 'py-1 pl-1.5 pr-2' : 'py-1.5 px-2.5'
      }`
    : `bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold ${
        hasIcon ? 'py-1.5 pl-2 pr-2.5' : 'py-2.5 px-3.5'
      }`;

  return (
    <div className="relative w-full min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition cursor-pointer flex justify-between items-center ${buttonStyleClasses} ${cleanedClassName}`}
      >
        <div className="flex items-center space-x-2 truncate">
          {selectedOption && (
            <div className={`bg-slate-100 border border-slate-200/60 rounded-md text-slate-600 flex items-center justify-center shrink-0 ${
              isCompact ? 'p-0.5' : 'p-1'
            }`}>
              {React.isValidElement(getContextualIcon(selectedOption.value))
                ? React.cloneElement(getContextualIcon(selectedOption.value) as React.ReactElement, {
                    className: isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'
                  })
                : getContextualIcon(selectedOption.value)
              }
            </div>
          )}
          <span className={`truncate ${isCompact ? 'font-semibold text-slate-800' : 'font-bold text-slate-700'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 mr-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[60] left-0 min-w-full w-max max-w-[280px] md:max-w-[320px] top-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs animate-scale-up">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-1.5 cursor-pointer transition-colors flex items-center space-x-3 ${
                value === opt.value 
                  ? 'bg-indigo-50/70 text-indigo-900 font-bold' 
                  : 'hover:bg-slate-50 text-slate-700 font-medium'
              }`}
            >
              <div className={`border rounded-lg p-1.5 flex items-center justify-center shrink-0 transition-colors ${
                value === opt.value
                  ? 'bg-indigo-100/60 border-indigo-200 text-indigo-700'
                  : 'bg-cyan-50/40 border-cyan-100/50 text-cyan-800'
              }`}>
                {getContextualIcon(opt.value)}
              </div>
              <span className="font-semibold text-slate-800">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
