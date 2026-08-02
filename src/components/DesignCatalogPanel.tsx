import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ColumnDef } from '@tanstack/react-table';
import { ProTable } from './ui/ProTable';
import { useTranslation } from 'react-i18next';

interface DesignPanelProps {
  mode?: 'docked' | 'floating' | 'popout';
}

const CellInput = ({ value, onChange, step }: { value: number; onChange: (v: number) => void; step: string }) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      onChange(num);
      setLocalValue(num.toString());
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      step={step}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full h-6 bg-black/50 border border-white/10 hover:border-accent/50 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all rounded px-1.5 text-[11px] text-right font-mono text-text-primary focus:outline-none"
    />
  );
};

export function DesignCatalogPanel({ mode = 'docked' }: DesignPanelProps) {
  const { t } = useTranslation();
  const { parameters, updateParameters } = useStore();

  const handleAddConduit = () => {
    const newConduit = {
      id: `dn-${uuidv4()}`,
      dn: 0,
      iMin: 0,
      di: 0,
      trenchWidth: 0.5
    };
    updateParameters({
      conduitRepository: [...parameters.conduitRepository, newConduit]
    });
  };

  const handleRemoveConduit = (id: string) => {
    updateParameters({
      conduitRepository: parameters.conduitRepository.filter(c => c.id !== id)
    });
  };

  const handleUpdateConduitParam = (id: string, field: string, value: number) => {
    updateParameters({
      conduitRepository: parameters.conduitRepository.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    });
  };

  const diameterCatalogColumns = useMemo<ColumnDef<any>[]>(() => [
    { 
      accessorKey: 'dn', 
      header: t('catalog.cols.dn', 'DN (mm)'), 
      size: 110, 
      cell: info => {
        const c = info.row.original;
        return (
          <CellInput
            step="1"
            value={c.dn}
            onChange={(val) => handleUpdateConduitParam(c.id, 'dn', val)}
          />
        );
      }
    },
    { 
      accessorKey: 'di', 
      header: t('catalog.cols.di', 'Diámetro Int. (mm)'), 
      size: 130, 
      cell: info => {
        const c = info.row.original;
        return (
          <CellInput
            step="0.1"
            value={c.di}
            onChange={(val) => handleUpdateConduitParam(c.id, 'di', val)}
          />
        );
      }
    },
    { 
      accessorKey: 'iMin', 
      header: t('catalog.cols.i_min', 'Pendiente Mín. (‰)'), 
      size: 130, 
      cell: info => {
        const c = info.row.original;
        return (
          <CellInput
            step="0.0001"
            value={c.iMin}
            onChange={(val) => handleUpdateConduitParam(c.id, 'iMin', val)}
          />
        );
      }
    },
    { 
      accessorKey: 'trenchWidth', 
      header: t('catalog.cols.trench_width', 'Ancho Zanja (m)'), 
      size: 130,
      cell: info => {
        const c = info.row.original;
        return (
          <CellInput
            step="0.01"
            value={c.trenchWidth}
            onChange={(val) => handleUpdateConduitParam(c.id, 'trenchWidth', val)}
          />
        );
      }
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: info => (
        <button 
          onClick={() => handleRemoveConduit(info.row.original.id)}
          className="p-1 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors ml-1"
          title={t('catalog.delete_title', 'Eliminar diámetro')}
        >
          <Trash2 size={13} />
        </button>
      )
    }
  ], [t]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden select-none">
      <div className="flex-1 p-2">
        <section className="bg-white/[0.015] border border-white/[0.06] rounded-md flex flex-col h-full overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />
          <div className="px-2.5 py-1.5 border-b border-white/5 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-text-primary flex items-center gap-1.5 tracking-wider uppercase">
              <span className="w-1 h-2.5 rounded-full bg-accent inline-block" />
              {t('catalog.title', 'Catálogo de Diámetros')}
            </h3>
            <button
              type="button"
              onClick={handleAddConduit}
              className="h-6 flex items-center text-[9px] uppercase tracking-wider font-bold text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 hover:border-accent transition-colors px-2 rounded shadow-sm"
            >
              <Plus size={12} className="mr-1" />
              {t('catalog.add', 'Añadir Diámetro')}
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ProTable data={parameters.conduitRepository} columns={diameterCatalogColumns} />
          </div>
        </section>
      </div>
    </div>
  );
}
