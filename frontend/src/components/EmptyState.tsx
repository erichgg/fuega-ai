import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title = 'No data yet', description = 'Data will appear here once the system starts generating it.', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="p-2.5 rounded-xl bg-fuega-card border border-fuega-border mb-2.5">
        <Inbox className="w-5 h-5 text-fuega-text-muted" />
      </div>
      <h3 className="text-[13px] font-medium text-fuega-text-primary">{title}</h3>
      <p className="mt-0.5 text-[11px] text-fuega-text-muted max-w-xs">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
