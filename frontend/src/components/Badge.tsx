import clsx from 'clsx';

const variants = {
  active: 'bg-green-500/15 text-green-400',
  paused: 'bg-yellow-500/15 text-yellow-400',
  error: 'bg-red-500/15 text-red-400',
  budget_exceeded: 'bg-red-500/15 text-red-400',
  running: 'bg-blue-500/15 text-blue-400',
  completed: 'bg-green-500/15 text-green-400',
  failed: 'bg-red-500/15 text-red-400',
  pending: 'bg-chispa-text-muted/10 text-chispa-text-muted',
  paused_for_approval: 'bg-chispa-orange/15 text-chispa-orange',
  idea: 'bg-indigo-500/15 text-indigo-400',
  writing: 'bg-blue-500/15 text-blue-400',
  review: 'bg-purple-500/15 text-purple-400',
  published: 'bg-green-500/15 text-green-400',
  draft: 'bg-chispa-text-muted/10 text-chispa-text-muted',
};

type BadgeVariant = keyof typeof variants;

export function Badge({ variant, label }: { variant: string; label?: string }) {
  const v = (variant in variants ? variant : 'pending') as BadgeVariant;
  return (
    <span className={clsx(
      'inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium',
      variants[v]
    )}>
      {label || variant.replace(/_/g, ' ')}
    </span>
  );
}
