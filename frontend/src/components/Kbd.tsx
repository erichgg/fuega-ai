import clsx from 'clsx';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={clsx(
      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-mono font-medium rounded bg-fuega-input border border-fuega-border text-fuega-text-muted',
      className
    )}>
      {children}
    </kbd>
  );
}
