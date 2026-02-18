import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { t } = useTranslation('common');
  const resolvedTitle = title ?? t('common:empty.title');
  const resolvedDescription = description ?? t('common:empty.description');
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="p-2.5 rounded-xl bg-fuega-card border border-fuega-border mb-2.5">
        <Inbox className="w-5 h-5 text-fuega-text-muted" />
      </div>
      <h3 className="text-[13px] font-medium text-fuega-text-primary">{resolvedTitle}</h3>
      <p className="mt-0.5 text-[11px] text-fuega-text-muted max-w-xs">{resolvedDescription}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
