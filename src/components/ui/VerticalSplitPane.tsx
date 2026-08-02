import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VerticalSplitPaneProps {
  /** Top panel content */
  top: React.ReactNode;
  /** Bottom panel content */
  bottom: React.ReactNode;
  /** Initial ratio for the top panel (0–1, default 0.6) */
  initialRatio?: number;
  /** Minimum height in px for top panel */
  minTopHeight?: number;
  /** Minimum height in px for bottom panel */
  minBottomHeight?: number;
  /** CSS class for the outer container */
  className?: string;
}

export function VerticalSplitPane({
  top,
  bottom,
  initialRatio = 0.6,
  minTopHeight = 120,
  minBottomHeight = 120,
  className = '',
}: VerticalSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const y = e.clientY - rect.top;

      // Clamp to min sizes
      const minTop = minTopHeight / totalHeight;
      const maxTop = 1 - minBottomHeight / totalHeight;
      const newRatio = Math.max(minTop, Math.min(maxTop, y / totalHeight));
      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minTopHeight, minBottomHeight]);

  const topPercent = `${ratio * 100}%`;
  const bottomPercent = `${(1 - ratio) * 100}%`;

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Top panel */}
      <div className="min-h-0 overflow-hidden flex" style={{ height: topPercent }}>
        {top}
      </div>

      {/* Divider */}
      <div
        className="group relative shrink-0 flex items-center justify-center select-none"
        style={{ height: '5px' }}
        onMouseDown={handleMouseDown}
      >
        {/* Hit area - invisible wider zone for easier grabbing */}
        <div className="absolute inset-x-0 -top-2 -bottom-2 cursor-row-resize z-10" />

        {/* Visible line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border-subtle group-hover:bg-accent/50 transition-colors duration-150" />

        {/* Grip indicator */}
        <div className="relative z-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-1 rounded-full bg-border-subtle group-hover:bg-accent/60 transition-all duration-150 group-hover:w-10 group-hover:h-1.5 group-hover:shadow-[0_0_6px_rgba(255,100,0,0.15)]" />
        </div>
      </div>

      {/* Bottom panel */}
      <div className="min-h-0 overflow-hidden flex flex-col" style={{ height: bottomPercent }}>
        {bottom}
      </div>
    </div>
  );
}
