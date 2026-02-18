import clsx from 'clsx';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={clsx(
      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-mono font-medium rounded bg-chispa-input border border-chispa-border text-chispa-text-muted',
      className
    )}>
      {children}
    </kbd>
  );
}
