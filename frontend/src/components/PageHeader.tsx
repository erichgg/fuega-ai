import clsx from 'clsx';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  tabs?: React.ReactNode;
  status?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, breadcrumbs, tabs, status }: PageHeaderProps) {
  return (
    <div className="mb-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-fuega-text-muted">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-40">/</span>}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-fuega-text-primary transition-colors">{crumb.label}</Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div className={clsx('flex items-center gap-2')}>
          <h1 className="text-base font-mono font-bold text-fuega-text-primary tracking-tight">{title}</h1>
          {subtitle && <p className="text-[11px] text-fuega-text-muted">{subtitle}</p>}
          {status}
        </div>
        {action}
      </div>
      {tabs && <div className="mt-2">{tabs}</div>}
    </div>
  );
}
