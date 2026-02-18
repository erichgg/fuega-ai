import clsx from 'clsx';

const variants = {
  active: 'bg-green-500/15 text-green-400',
  paused: 'bg-yellow-500/15 text-yellow-400',
  error: 'bg-red-500/15 text-red-400',
  budget_exceeded: 'bg-red-500/15 text-red-400',
  running: 'bg-blue-500/15 text-blue-400',
  completed: 'bg-green-500/15 text-green-400',
  failed: 'bg-red-500/15 text-red-400',
  pending: 'bg-fuega-text-muted/10 text-fuega-text-muted',
  paused_for_approval: 'bg-fuega-orange/15 text-fuega-orange',
  idea: 'bg-indigo-500/15 text-indigo-400',
  writing: 'bg-blue-500/15 text-blue-400',
  review: 'bg-purple-500/15 text-purple-400',
  published: 'bg-green-500/15 text-green-400',
  draft: 'bg-fuega-text-muted/10 text-fuega-text-muted',
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
