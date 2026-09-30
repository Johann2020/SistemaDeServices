import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Unlock } from 'lucide-react';

interface PatternLockInputProps {
  value: string; // e.g. "1-5-9-8" or empty
  onChange: (val: string) => void;
  title?: string;
  isEditable?: boolean;
}

const NODES = [
  { id: 1, x: 16.66, y: 16.66 },
  { id: 2, x: 50.0,  y: 16.66 },
  { id: 3, x: 83.33, y: 16.66 },
  { id: 4, x: 16.66, y: 50.0 },
  { id: 5, x: 50.0,  y: 50.0 },
  { id: 6, x: 83.33, y: 50.0 },
  { id: 7, x: 16.66, y: 83.33 },
  { id: 8, x: 50.0,  y: 83.33 },
  { id: 9, x: 83.33, y: 83.33 },
];

export const PatternLockInput: React.FC<PatternLockInputProps> = ({
  value,
  onChange,
  title = 'Patrón de Desbloqueo',
  isEditable = true
}) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  
  // Ref to always get the freshest pattern in fast pointermove event handlers
  const patternRef = useRef<number[]>([]);
  patternRef.current = pattern;

  useEffect(() => {
    if (!value) {
      setPattern([]);
    } else {
      const parsed = value
        .split('-')
        .map(Number)
        .filter(n => n >= 1 && n <= 9);
      
      // Only set if different to avoid infinite trigger render cycles
      if (parsed.join('-') !== pattern.join('-')) {
        setPattern(parsed);
      }
    }
  }, [value]);

  const checkPointerCollision = (rect: DOMRect, clientX: number, clientY: number, currentPattern: number[]) => {
    // Calculate 0-100 coordinates relative to container
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    let nearestNodeId = -1;
    let minDistance = 16; // Increased threshold to 16% for easier/smoother snap on drawing dragging

    NODES.forEach((node) => {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNodeId = node.id;
      }
    });

    if (nearestNodeId !== -1 && !currentPattern.includes(nearestNodeId)) {
      return { nodeId: nearestNodeId, x, y };
    }
    return { nodeId: null, x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditable) return;
    
    // Prevent browser actions like scrolling or highlighting text while drawing
    e.preventDefault();
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // Request pointer capture to keep receiving moves outside the container bounds
    try {
      container.setPointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }

    setIsDrawing(true);
    
    const { nodeId, x, y } = checkPointerCollision(rect, e.clientX, e.clientY, []);
    if (nodeId !== null) {
      const nextPat = [nodeId];
      setPattern(nextPat);
      onChange(nextPat.join('-'));
    } else {
      setPattern([]);
      onChange('');
    }
    
    setPointerPos({ x, y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !isEditable) return;
    
    // Smooth custom drag and prevent scrolling on mobile devices
    e.preventDefault();
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    const currentPattern = patternRef.current;
    const { nodeId, x, y } = checkPointerCollision(rect, e.clientX, e.clientY, currentPattern);
    
    setPointerPos({ x, y });
    
    if (nodeId !== null) {
      const nextPattern = [...currentPattern, nodeId];
      setPattern(nextPattern);
      onChange(nextPattern.join('-'));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setPointerPos(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
  };

  const handleClear = () => {
    if (!isEditable) return;
    setPattern([]);
    setPointerPos(null);
    onChange('');
  };

  const getPathData = () => {
    if (pattern.length === 0) return '';
    let d = pattern
      .map((nodeId, idx) => {
        const node = NODES.find(n => n.id === nodeId);
        if (!node) return '';
        return `${idx === 0 ? 'M' : 'L'} ${node.x} ${node.y}`;
      })
      .join(' ');

    if (isDrawing && pointerPos && pattern.length > 0) {
      d += ` L ${pointerPos.x} ${pointerPos.y}`;
    }
    return d;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col items-center space-y-3">
      <div className="w-full flex justify-between items-center text-xs">
        <span className="font-semibold text-slate-500 flex items-center space-x-1">
          <Unlock className="h-3.5 w-3.5 text-indigo-500" />
          <span>{title}</span>
        </span>
        {isEditable && pattern.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-0.5 cursor-pointer text-[10px] bg-indigo-50 hover:bg-indigo-100/60 px-2 py-0.5 rounded transition"
          >
            <RefreshCw className="h-2.5 w-2.5 animate-spin-reverse" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* 3x3 Dot Grid & SVG tracer */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
        className={`relative w-40 h-40 bg-white border border-slate-100 rounded-xl shadow-xs select-none overflow-hidden ${
          isEditable ? 'cursor-crosshair active:scale-[1.01] transition-transform duration-100' : ''
        }`}
      >
        {/* SVG trace connection line */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Background grid lines for lock screen look */}
          <path
            d={getPathData()}
            fill="none"
            stroke="rgb(99, 102, 241)" // Indigo-500
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_1px_3px_rgba(99,102,241,0.55)]"
          />
        </svg>

        {/* Floating Interactive Nodes */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {NODES.map((node) => {
            const isSelected = pattern.includes(node.id);
            const indexInPattern = pattern.indexOf(node.id);
            const isLast = pattern[pattern.length - 1] === node.id;

            return (
              <div 
                key={node.id} 
                className="absolute animate-scale-up"
                style={{
                  left: `calc(${node.x}% - 17px)`,
                  top: `calc(${node.y}% - 17px)`,
                }}
              >
                <div
                  className={`w-8.5 h-8.5 rounded-full flex flex-col items-center justify-center transition-all duration-150 relative group ${
                    isSelected
                      ? isLast
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-105'
                        : 'bg-indigo-500 text-white ring-2 ring-indigo-50 scale-100'
                      : 'bg-slate-50 text-slate-400 border border-slate-200/50'
                  }`}
                >
                  <span className={`text-[9.5px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {node.id}
                  </span>
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white font-black text-[7px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                      {indexInPattern + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Sequence Indicator */}
      <div className="min-h-[22px] flex items-center justify-center w-full">
        {pattern.length > 0 ? (
          <div className="flex items-center space-x-1 flex-wrap justify-center px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 text-[10px] font-bold font-mono">
            {pattern.map((node, i) => (
              <React.Fragment key={node}>
                <span>{node}</span>
                {i < pattern.length - 1 && <span className="text-slate-400 text-[8px] mx-0.5">➔</span>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400 text-center">
            {isEditable ? '¡Arrastra o dibuja para conectar!' : 'Sin patrón registrado'}
          </span>
        )}
      </div>
    </div>
  );
};
