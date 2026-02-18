import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
  getValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  compact?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  compact = false,
  className,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.getValue) return data;
    return [...data].sort((a, b) => {
      const va = col.getValue!(a);
      const vb = col.getValue!(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [data, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const allSelected = selectable && selectedKeys && data.length > 0 && data.every(r => selectedKeys.has(getRowKey(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowKey)));
    }
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const py = compact ? 'py-1.5' : 'py-2';
  const px = 'px-3';

  return (
    <div className={clsx('bg-fuega-card border border-fuega-border rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-fuega-border">
              {selectable && (
                <th className={clsx(px, py, 'w-8')}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="rounded border-fuega-border"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={clsx(
                    'text-left text-[10px] font-semibold text-fuega-text-muted uppercase tracking-wider',
                    px, py,
                    col.sortable && 'cursor-pointer select-none hover:text-fuega-text-secondary'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-[11px] text-fuega-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {sorted.map(row => {
              const key = getRowKey(row);
              const isSelected = selectable && selectedKeys?.has(key);
              return (
                <tr
                  key={key}
                  className={clsx(
                    'border-b border-fuega-border/50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-fuega-orange/5' : 'hover:bg-fuega-card-hover'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className={clsx(px, py)} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => toggleRow(key)}
                        aria-label="Select row"
                        className="rounded border-fuega-border"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={clsx(px, py)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
