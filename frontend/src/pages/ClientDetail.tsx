import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, Mail, DollarSign, CheckCircle2, Clock, Circle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ChartCard } from '../components/ChartCard';
import { EmptyState } from '../components/EmptyState';

const timelineIcon = (status: string) => {
  if (status === 'completed' || status === 'published') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === 'pending' || status === 'draft') return <Clock className="w-4 h-4 text-yellow-400" />;
  return <Circle className="w-4 h-4 text-fuega-text-muted" />;
};

export default function ClientDetail() {
  const { t } = useTranslation(['clientDetail', 'clients', 'common']);
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    api.clients.get(Number(id))
      .then(setClient)
      .catch(() => toast.error(t('common:errors.failedToLoad', { resource: t('clientDetail:title').toLowerCase() })))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-fuega-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="animate-fadeIn">
        <PageHeader
          title={t('clientDetail:title')}
          breadcrumbs={[
            { label: t('clients:title'), href: '/clients' },
            { label: t('clientDetail:notFound') },
          ]}
        />
        <EmptyState title={t('clientDetail:notFound')} description={t('clientDetail:notFoundDesc')} />
      </div>
    );
  }

  const deliverables = client.deliverables || [];
  const invoices = client.invoices || [];

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={client.business_name || client.name || t('clientDetail:title')}
        subtitle={client.name}
        breadcrumbs={[
          { label: t('clients:title'), href: '/clients' },
          { label: client.name },
        ]}
        status={<Badge variant={client.status} />}
      />

      <div className="flex items-center gap-4 mb-4 text-sm text-fuega-text-secondary">
        <div className="w-10 h-10 rounded-xl bg-fuega-orange/10 flex items-center justify-center">
          <span className="text-lg font-bold text-fuega-orange">{client.name?.charAt(0)}</span>
        </div>
        {client.country && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{client.country}</span>}
        {client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
        {client.website_url && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{client.website_url}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Deliverables as activity timeline */}
        <ChartCard title={t('clientDetail:deliverables.title')} subtitle={t('clientDetail:deliverables.items', { count: deliverables.length })}>
          {deliverables.length === 0 ? (
            <EmptyState title={t('clientDetail:deliverables.none')} />
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-fuega-border" />
              <div className="space-y-1">
                {deliverables.map((d: any) => (
                  <div key={d.id} className="relative flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-fuega-card-hover transition-colors">
                    {/* Timeline dot */}
                    <div className="absolute -left-6 top-2.5 flex items-center justify-center">
                      {timelineIcon(d.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fuega-text-primary truncate">{d.title}</p>
                      <p className="text-[10px] text-fuega-text-muted">{d.service_type} {d.due_date ? `\u00b7 ${t('clientDetail:deliverables.due', { date: d.due_date })}` : ''}</p>
                    </div>
                    <Badge variant={d.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Invoices */}
        <ChartCard title={t('clientDetail:invoices.title')} subtitle={t('clientDetail:invoices.records', { count: invoices.length })}>
          {invoices.length === 0 ? (
            <EmptyState title={t('clientDetail:invoices.none')} />
          ) : (
            <div className="space-y-1">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-fuega-card-hover transition-colors">
                  <DollarSign className="w-4 h-4 text-fuega-text-muted flex-shrink-0" />
                  <div className="flex-1">
                    <p className="num text-sm text-fuega-text-primary">${inv.amount_usd}</p>
                    <p className="text-[10px] text-fuega-text-muted">{t('clientDetail:invoices.period')}: {inv.period_start}</p>
                  </div>
                  <Badge variant={inv.status === 'paid' ? 'completed' : 'pending'} label={inv.status} />
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
