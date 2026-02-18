import clsx from 'clsx';
const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <div className={clsx('border-2 border-chispa-orange border-t-transparent rounded-full animate-spin', sizes[size], className)} />;
}
