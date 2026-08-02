import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DraggableWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  defaultX?: number;
  defaultY?: number;
}

export function DraggableWindow({
  isOpen,
  onClose,
  title,
  icon,
  children,
  initialWidth = 800,
  initialHeight = 400,
  minWidth = 400,
  minHeight = 300,
  defaultX,
  defaultY
}: DraggableWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [pos, setPos] = useState({ x: defaultX ?? (window.innerWidth - initialWidth) / 2, y: defaultY ?? (window.innerHeight - initialHeight) / 2 });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragRef = useRef<{ startX: number; startY: number; initialPos: { x: number; y: number } } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; initialSize: { w: number; h: number } } | null>(null);

  // Bounds enforcement
  useEffect(() => {
    const handleResize = () => {
      if (!isMaximized) {
        setPos(p => ({
          x: Math.min(Math.max(0, p.x), window.innerWidth - size.w),
          y: Math.min(Math.max(0, p.y), window.innerHeight - size.h)
        }));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size, isMaximized]);

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if (isMaximized) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPos: { ...pos }
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setPos({
      x: Math.min(Math.max(0, dragRef.current.initialPos.x + dx), window.innerWidth - size.w),
      y: Math.min(Math.max(0, dragRef.current.initialPos.y + dy), window.innerHeight - size.h)
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialSize: { ...size }
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing || !resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    
    setSize({
      w: Math.max(minWidth, Math.min(window.innerWidth - pos.x, resizeRef.current.initialSize.w + dx)),
      h: Math.max(minHeight, Math.min(window.innerHeight - pos.y, resizeRef.current.initialSize.h + dy))
    });
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    setIsResizing(false);
    resizeRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const [mounted, setMounted] = useState(false);
  const [zIndex, setZIndex] = useState(400);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bringToFront = () => {
    // A simple approach to bring to front: find the highest z-index and add 1
    const windows = document.querySelectorAll('.draggable-window-portal');
    let maxZ = 400;
    windows.forEach(w => {
      const z = parseInt(window.getComputedStyle(w).zIndex, 10);
      if (!isNaN(z) && z > maxZ) maxZ = z;
    });
    if (zIndex <= maxZ) {
      setZIndex(maxZ + 1);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={`draggable-window-portal fixed flex flex-col glass-panel overflow-hidden transition-[width,height,transform] ${
        isMaximized ? 'inset-4 rounded-xl' : 'rounded-xl shadow-2xl'
      } ${isDragging || isResizing ? 'select-none' : ''}`}
      onPointerDownCapture={bringToFront}
      style={isMaximized ? { zIndex } : {
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex
      }}
    >
      {/* Header (Drag Handle) */}
      <div 
        className="h-10 bg-black/20 dark:bg-white/5 border-b border-border-subtle flex items-center justify-between px-4 shrink-0 cursor-move"
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        onPointerCancel={handlePointerUpDrag}
        onDoubleClick={() => setIsMaximized(!isMaximized)}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {icon}
          <h3 className="text-[11px] font-bold text-text-primary uppercase tracking-widest">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={onClose}
            className="p-1.5 rounded-md text-text-secondary hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-transparent">
        {children}
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
          onPointerDown={handlePointerDownResize}
          onPointerMove={handlePointerMoveResize}
          onPointerUp={handlePointerUpResize}
          onPointerCancel={handlePointerUpResize}
        >
          <svg viewBox="0 0 10 10" width="8" height="8" stroke="currentColor" strokeWidth="2" className="text-border-subtle" fill="none">
            <path d="M 8 2 L 8 8 L 2 8" />
            <path d="M 4 8 L 8 4" />
          </svg>
        </div>
      )}
    </div>,
    document.body
  );
}
