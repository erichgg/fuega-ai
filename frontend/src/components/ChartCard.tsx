import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ChartCard({ title, subtitle, children, action, className = '', collapsible = false, defaultCollapsed = false }: ChartCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-fuega-card border border-fuega-border rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-fuega-border">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-fuega-text-muted hover:text-fuega-text-primary transition-colors">
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="flex items-baseline gap-2">
            <h3 className={clsx("text-[11px] uppercase tracking-wider font-mono font-semibold text-fuega-text-primary")}>{title}</h3>
            {subtitle && <p className="text-[10px] text-fuega-text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {!collapsed && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  );
}
