import clsx from 'clsx';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'orange' | 'teal' | 'indigo' | 'pink' | 'yellow';
  sparklineData?: number[];
  onClick?: () => void;
}

const colorMap = {
  orange: { icon: 'text-fuega-orange bg-fuega-orange/10', bar: '#FF6B2C', sparkline: '#FF6B2C' },
  teal: { icon: 'text-fuega-teal bg-fuega-teal/10', bar: '#00D4AA', sparkline: '#00D4AA' },
  indigo: { icon: 'text-indigo-400 bg-indigo-400/10', bar: '#6366F1', sparkline: '#6366F1' },
  pink: { icon: 'text-pink-400 bg-pink-400/10', bar: '#EC4899', sparkline: '#EC4899' },
  yellow: { icon: 'text-yellow-400 bg-yellow-400/10', bar: '#EAB308', sparkline: '#EAB308' },
};

export function StatCard({ label, value, subValue, trend, trendValue, icon, color = 'orange', sparklineData, onClick }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={clsx(
        'bg-fuega-card border border-fuega-border rounded-lg px-2.5 py-2 relative overflow-hidden group hover:border-fuega-border/80 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Left edge color bar */}
      <div className="absolute top-0 left-0 bottom-0 w-[2px]" style={{ backgroundColor: c.bar, opacity: 0.6 }} />
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-fuega-text-muted uppercase tracking-wider truncate">{label}</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <p className="text-lg font-bold text-fuega-text-primary tracking-tight leading-tight num">{value}</p>
            {subValue && <p className="text-[10px] text-fuega-text-muted truncate">{subValue}</p>}
            {trend && trendValue && (
              <span className={clsx('text-[10px] font-medium', {
                'text-green-400': trend === 'up',
                'text-red-400': trend === 'down',
                'text-fuega-text-muted': trend === 'neutral',
              })}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'} {trendValue}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {icon && <div className={clsx('p-1 rounded-md flex-shrink-0', c.icon)}>{icon}</div>}
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} color={c.sparkline} width={48} height={16} />
          )}
        </div>
      </div>
    </div>
  );
}
