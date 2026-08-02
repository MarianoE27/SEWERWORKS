import React, { useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  stickyFirstColumn?: boolean;
  onRowClick?: (row: TData) => void;
  rowHeight?: number;
}

export function ProTable<TData>({ 
  data, 
  columns, 
  stickyFirstColumn = false,
  onRowClick,
  rowHeight = 38 // Aumentado para mejor respiración
}: ProTableProps<TData>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    defaultColumn: {
      minSize: 60,
      size: 150,
      maxSize: 800,
    }
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto bg-bg-surface w-full h-full custom-scrollbar relative"
    >
      <div 
        role="table" 
        className="text-xs text-left text-text-secondary min-w-full"
        style={{ width: Math.max(table.getTotalSize(), parentRef.current?.clientWidth || 0) }}
      >
        {/* HEADER */}
        <div 
          role="rowgroup" 
          className="text-[10px] font-semibold tracking-wider uppercase bg-bg-primary sticky top-0 z-20 shadow-sm border-b border-border-subtle"
        >
          {table.getHeaderGroups().map(headerGroup => (
            <div key={headerGroup.id} role="row" className="flex">
              {headerGroup.headers.map((header, index) => {
                const isFirst = index === 0 && stickyFirstColumn;
                const isLast = index === headerGroup.headers.length - 1;
                return (
                  <div 
                    key={header.id}
                    role="columnheader"
                    className={`px-3 py-2.5 select-none flex items-center overflow-hidden border-r border-border-subtle/30 last:border-r-0 bg-bg-primary ${
                      isFirst ? 'sticky left-0 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]' : ''
                    } ${header.column.getCanSort() ? 'cursor-pointer hover:bg-bg-hover' : ''} ${isLast ? 'flex-1' : ''}`}
                    style={{ width: isLast ? undefined : header.getSize(), minWidth: header.column.columnDef.minSize }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center flex-1 truncate">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp size={10} className="ml-1 text-accent shrink-0" />,
                        desc: <ArrowDown size={10} className="ml-1 text-accent shrink-0" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* BODY */}
        <div 
          role="rowgroup" 
          className="relative"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {rows.length === 0 ? (
            <div className="p-4 text-center text-text-secondary text-[11px] absolute w-full">
              {t('table.no_data', 'No hay datos disponibles.')}
            </div>
          ) : (
            virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isEven = virtualRow.index % 2 === 0;
              return (
                <div 
                  key={row.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  role="row"
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`flex absolute top-0 left-0 w-full border-b border-border-subtle hover:bg-bg-hover/80 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const isFirst = index === 0 && stickyFirstColumn;
                    const isLast = index === row.getVisibleCells().length - 1;
                    return (
                      <div 
                        key={cell.id} 
                        role="cell"
                        className={`px-3 py-1.5 flex items-center overflow-hidden border-r border-border-subtle/30 last:border-r-0 ${isEven ? 'bg-bg-surface' : 'bg-bg-primary/30'} group-hover:bg-transparent transition-colors ${
                          isFirst ? 'sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)] font-bold text-text-primary' : ''
                        } ${isLast ? 'flex-1' : ''}`}
                        style={{ width: isLast ? undefined : cell.column.getSize(), minWidth: cell.column.columnDef.minSize }}
                      >
                        <div className="w-full text-[11px] break-words whitespace-pre-wrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
