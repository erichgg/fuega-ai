// @refresh reset
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle, XCircle, Clock, Bot, Mail, Twitter,
  Search, Globe, ChevronDown, ChevronRight, CheckCheck, Edit3,
} from 'lucide-react';
import { api } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { useToast } from '../lib/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  send_email: <Mail className="w-4 h-4" />,
  post_tweet: <Twitter className="w-4 h-4" />,
  search_web: <Search className="w-4 h-4" />,
  web_search: <Globe className="w-4 h-4" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Approval {
  id: number;
  agent_slug: string;
  action_name: string;
  payload: any;
  context: any;
  created_at: string;
  status: string;
  decided_by: number | null;
  decided_at: string | null;
  rejection_reason: string | null;
  modified_payload: any;
  expires_at: string | null;
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPayload, setEditPayload] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const toast = useToast();
  const { events } = useWebSocket();

  const pendingApprovals = useMemo(
    () => approvals.filter(a => a.status === 'pending'),
    [approvals]
  );

  const fetchApprovals = useCallback(async () => {
    try {
      const data = await api.approvals.list();
      // Backend returns { items: [...], total_pending: N }
      setApprovals(Array.isArray(data) ? data : (data as any).items || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // WebSocket: refresh approvals list on real-time events
  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (
      latest.event === 'approval.requested' ||
      latest.event === 'approval.decided' ||
      latest.event === 'new_approval' ||
      latest.event === 'approval_request'
    ) {
      fetchApprovals();
    }
  }, [events, fetchApprovals]);

  const handleApprove = async (id: number, modifiedPayload?: any) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await api.approvals.approve(id, modifiedPayload);
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
      setEditingId(null);
      toast.success('Approved');
    } catch {
      toast.error('Failed to approve');
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await api.approvals.reject(id, rejectReason.trim());
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      setRejectingId(null);
      setRejectReason('');
      toast.success('Rejected');
    } catch {
      toast.error('Failed to reject');
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBulkApprove = async () => {
    const ids = pendingApprovals.map(a => a.id);
    if (ids.length === 0) return;
    ids.forEach(id => setProcessingIds(prev => new Set(prev).add(id)));
    try {
      await api.approvals.bulkApprove(ids);
      setApprovals(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'approved' } : a));
      toast.success(`Approved ${ids.length} items`);
    } catch {
      toast.error('Bulk approve failed');
    }
    setProcessingIds(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Approvals"
        subtitle={`${pendingApprovals.length} pending`}
        action={
          pendingApprovals.length > 1 ? (
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[12px] font-medium hover:bg-green-500/30 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Approve All ({pendingApprovals.length})
            </button>
          ) : undefined
        }
      />

      {approvals.length === 0 ? (
        <EmptyState
          title="No approval requests"
          description="When agents need human approval for actions, they will appear here."
        />
      ) : (
        <div className="space-y-2">
          {approvals.map(approval => {
            const isPending = approval.status === 'pending';
            const isExpanded = expandedId === approval.id;
            const isEditing = editingId === approval.id;
            const isRejecting = rejectingId === approval.id;
            const isProcessing = processingIds.has(approval.id);
            const icon = ACTION_ICONS[approval.action_name] || <Bot className="w-4 h-4" />;

            return (
              <div
                key={approval.id}
                className={`bg-fuega-card border rounded-lg overflow-hidden transition-colors ${
                  isPending ? 'border-fuega-orange/30' : 'border-fuega-border opacity-60'
                }`}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`p-1.5 rounded-lg ${isPending ? 'bg-fuega-orange/10 text-fuega-orange' : 'bg-fuega-card-hover text-fuega-text-muted'}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-fuega-text-primary">{approval.agent_slug}</span>
                      <Badge variant={approval.status === 'approved' ? 'completed' : approval.status === 'rejected' ? 'failed' : 'paused_for_approval'} label={approval.action_name?.replace(/_/g, ' ')} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-fuega-text-muted" />
                      <span className="text-[10px] text-fuega-text-muted">{timeAgo(approval.created_at)}</span>
                      {!isPending && <Badge variant={approval.status === 'approved' ? 'completed' : 'failed'} />}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                    className="p-1 text-fuega-text-muted hover:text-fuega-text-primary transition-colors"
                    title="Toggle payload"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {/* Action buttons */}
                  {isPending && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(isEditing ? null : approval.id);
                          setEditPayload(JSON.stringify(approval.payload, null, 2));
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                        title="Edit payload before approving"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <Spinner size="sm" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(isRejecting ? null : approval.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Payload preview (expandable) */}
                {isExpanded && approval.payload && (
                  <div className="px-3 pb-2.5 border-t border-fuega-border/50">
                    <pre className="mt-2 text-[11px] text-fuega-text-secondary whitespace-pre-wrap font-mono bg-fuega-input rounded-lg p-2.5 max-h-48 overflow-y-auto">
                      {JSON.stringify(approval.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Payload editor */}
                {isEditing && isPending && (
                  <div className="px-3 pb-2.5 border-t border-fuega-border/50 animate-slideDown">
                    <p className="text-[10px] text-fuega-text-muted mt-2 mb-1">Edit payload before approving:</p>
                    <textarea
                      value={editPayload}
                      onChange={e => setEditPayload(e.target.value)}
                      rows={6}
                      className="w-full bg-fuega-input border border-fuega-border rounded-lg px-3 py-2 text-[11px] text-fuega-text-primary font-mono focus:outline-none focus:border-fuega-orange/50 resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-1.5">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 rounded text-[11px] text-fuega-text-muted hover:text-fuega-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(editPayload);
                            handleApprove(approval.id, parsed);
                          } catch {
                            toast.error('Invalid JSON payload');
                          }
                        }}
                        className="px-2.5 py-1 rounded text-[11px] font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                      >
                        Approve with Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject reason input */}
                {isRejecting && isPending && (
                  <div className="px-3 pb-2.5 border-t border-fuega-border/50 animate-slideDown">
                    <p className="text-[10px] text-fuega-text-muted mt-2 mb-1">Rejection reason:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleReject(approval.id)}
                        placeholder="Why is this being rejected?"
                        className="flex-1 bg-fuega-input border border-fuega-border rounded-lg px-3 py-1.5 text-[12px] text-fuega-text-primary placeholder-fuega-text-muted focus:outline-none focus:border-red-500/50"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReject(approval.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
