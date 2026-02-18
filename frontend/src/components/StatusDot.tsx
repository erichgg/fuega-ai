import clsx from 'clsx';

const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  running: 'bg-blue-500',
  pending: 'bg-gray-400',
  offline: 'bg-red-500',
};

interface StatusDotProps {
  status: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' };

export function StatusDot({ status, pulse = false, size = 'md', label, className }: StatusDotProps) {
  const color = statusColors[status] || statusColors.pending;

  return (
    <span role="status" aria-label={label || status} className={clsx('inline-flex items-center gap-1.5', className)}>
      <span className={clsx('rounded-full flex-shrink-0', color, sizeMap[size], pulse && 'animate-pulse')} />
      {label && <span className="text-[11px] text-chispa-text-muted">{label}</span>}
    </span>
  );
}
