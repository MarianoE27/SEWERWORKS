import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useProfileData } from './useProfileData';
import { ProfileToolbar } from './ProfileToolbar';
import { ProfileChart } from './ProfileChart';
import { ProfileBands } from './ProfileBands';

export function ProfileContainer() {
  const { profileMode } = useStore();
  const data = useProfileData();
  const [activeTab, setActiveTab] = useState<'chart' | 'bands'>('chart');
  const [zoom, setZoom] = useState(1); // 1.0 multiplier = 100% default
  const [verticalExaggeration, setVerticalExaggeration] = useState(1); // 1x default

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bandsContainerRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scrolling between chart and bands
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target === scrollContainerRef.current && bandsContainerRef.current) {
      bandsContainerRef.current.scrollLeft = target.scrollLeft;
    } else if (target === bandsContainerRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = target.scrollLeft;
    }
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-secondary select-none">
        <svg className="w-12 h-12 text-text-secondary/40 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Visualización del Perfil Longitudinal</h4>
        <p className="text-[10px] text-text-secondary/80 max-w-sm leading-relaxed">
          Seleccione una o más tuberías conectadas en el mapa para visualizar su perfil longitudinal continuo. 
        </p>
      </div>
    );
  }

  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-secondary select-none">
        <svg className="w-12 h-12 text-amber-500/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Simulación requerida</h4>
        <p className="text-[10px] text-text-secondary/80 max-w-sm leading-relaxed mb-3">
          El tramo seleccionado no posee cotas de solera calculadas. Por favor, calcule la red cloacal primero.
        </p>
        <button 
          onClick={() => useStore.getState().calculateNetwork()}
          className="px-3 py-1.5 rounded bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Calcular Red Ahora
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary/20 select-none overflow-hidden font-sans relative">
      <ProfileToolbar 
        exaggeration={verticalExaggeration} 
        onChangeExaggeration={setVerticalExaggeration}
        zoom={zoom}
        onChangeZoom={setZoom}
        tabs={
          profileMode === 'docked' ? (
            <div className="flex h-full w-[260px] shrink-0 border-r border-border-subtle/50">
              <button 
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'chart' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                onClick={() => setActiveTab('chart')}
              >
                Gráfico
              </button>
              <button 
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'bands' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                onClick={() => setActiveTab('bands')}
              >
                Tabla / Detalles
              </button>
            </div>
          ) : undefined
        }
      />
      
      {/* Chart Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 w-full relative min-h-0 overflow-auto custom-scrollbar ${(profileMode !== 'docked' || activeTab === 'chart') ? 'block' : 'hidden'}`}
      >
        <ProfileChart 
          data={data} 
          exaggeration={verticalExaggeration} 
          zoom={zoom} 
          isDocked={profileMode === 'docked'}
        />
      </div>

      {/* Bands (Guitarra) Area */}
      <div 
        ref={bandsContainerRef}
        onScroll={handleScroll}
        className={`${profileMode === 'docked' ? 'flex-1' : 'h-[360px]'} border-t border-border-subtle/50 overflow-x-auto overflow-y-auto custom-scrollbar shrink-0 bg-bg-primary/20 ${(profileMode !== 'docked' || activeTab === 'bands') ? 'block' : 'hidden'}`}
      >
        <ProfileBands 
          data={data} 
          zoom={zoom} 
          exaggeration={verticalExaggeration} 
        />
      </div>
    </div>
  );
}
