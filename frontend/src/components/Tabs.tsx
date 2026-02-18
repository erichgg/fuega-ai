import clsx from 'clsx';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export function Tabs({ tabs, active, onChange, variant = 'pill', className }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div role="tablist" className={clsx('flex gap-4 border-b border-fuega-border', className)}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => onChange(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 pb-2 px-1 text-[12px] font-medium transition-colors border-b-2 -mb-px',
              active === tab.key
                ? 'border-fuega-orange text-fuega-orange'
                : 'border-transparent text-fuega-text-muted hover:text-fuega-text-primary'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuega-input text-fuega-text-muted">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="tablist" className={clsx('flex gap-0.5 bg-fuega-card border border-fuega-border rounded-lg p-0.5 w-fit', className)}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
            active === tab.key
              ? 'bg-fuega-orange text-white'
              : 'text-fuega-text-secondary hover:text-fuega-text-primary'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={clsx(
              'text-[10px] px-1 py-0.5 rounded',
              active === tab.key ? 'bg-white/20' : 'bg-fuega-input'
            )}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
