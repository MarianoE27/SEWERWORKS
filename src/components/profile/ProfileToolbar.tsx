import React from 'react';
import { ZoomIn, ZoomOut, Maximize, MoveHorizontal, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from 'react-i18next';

interface Props {
  exaggeration: number;
  onChangeExaggeration: (val: number) => void;
  zoom: number;
  onChangeZoom: (val: number) => void;
  tabs?: React.ReactNode;
}

export function ProfileToolbar({ exaggeration, onChangeExaggeration, zoom, onChangeZoom, tabs }: Props) {
  const { t } = useTranslation();
  const { profileMode, setProfileMode, setIsProfileFloatingOpen } = useStore();

  return (
    <div className="h-8 border-b border-border-subtle/50 flex items-center bg-bg-primary/40 shrink-0 z-10">
      {tabs}
      <div className={`flex items-center gap-4 ${tabs ? 'px-4' : 'px-3'}`}>
        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
          <Maximize size={12} />
          {t('profile.toolbar.vertical_zoom', 'Zoom Vertical:')}
        </span>
        <div className="flex bg-bg-surface/50 border border-border-subtle/50 rounded overflow-hidden">
          {[1, 2, 3, 5].map(val => (
            <button
              key={val}
              onClick={() => onChangeExaggeration(val)}
              className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${
                exaggeration === val 
                  ? 'bg-accent/20 text-accent font-bold' 
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {val}x
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-4 bg-border-subtle/50"></div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
          <MoveHorizontal size={12} />
          {t('profile.toolbar.horizontal_zoom', 'Zoom Horizontal:')}
        </span>
        <div className="flex items-center gap-1 bg-bg-surface/50 border border-border-subtle/50 rounded px-1 py-0.5">
          <button
            onClick={() => onChangeZoom(Math.max(0.5, zoom - 0.5))}
            className="p-0.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
            title={t('profile.toolbar.zoom_out', 'Alejar')}
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] font-mono text-accent w-8 text-center font-bold">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => onChangeZoom(Math.min(5, zoom + 0.5))}
            className="p-0.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
            title={t('profile.toolbar.zoom_in', 'Acercar')}
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      <div className="ml-auto">
        {profileMode === 'docked' && (
          <button
            onClick={() => {
              setProfileMode('floating');
              setIsProfileFloatingOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-1 bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
          >
            <ExternalLink size={12} />
            {t('profile.toolbar.undock', 'Desacoplar')}
          </button>
        )}
      </div>
      {tabs && <div className="mr-2" />}
    </div>
  );
}
