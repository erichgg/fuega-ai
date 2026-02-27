"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  MessageSquare,
  Flame,
  ChevronDown,
  ChevronRight,
  Settings,
  History,
  ArrowRight,
  Sparkles,
  FileText,
  PenLine,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GovernanceSkeleton } from "@/components/fuega/page-skeleton";
import { CampfirePicker } from "@/components/fuega/campfire-picker";
import { FlameGauge } from "@/components/fuega/flame-gauge";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api/client";
import type { Campfire, Proposal as ApiProposal } from "@/lib/api/client";
import {
  useCampfireSettings,
  type ResolvedSetting,
} from "@/lib/hooks/useGovernanceVariables";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProposalStatus = "discussion" | "voting" | "passed" | "rejected" | "executed";

interface Proposal {
  id: string;
  title: string;
  description: string;
  campfire: string;
  proposalType: "modify_prompt" | "addendum_prompt" | "change_settings";
  proposedChanges: Record<string, unknown>;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  commentCount: number;
  quorum: number;
  totalMembers: number;
  author: string;
  createdAt: string;
  endsAt: string;
}

interface SettingsHistoryEntry {
  variable_key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string | null;
  changed_by_username?: string;
  change_reason: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusConfig: Record<
  ProposalStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  discussion: {
    label: "Discussion",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: MessageSquare,
  },
  voting: {
    label: "Voting",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Vote,
  },
  passed: {
    label: "Passed",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  executed: {
    label: "Executed",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: CheckCircle2,
  },
};

const typeConfig: Record<string, { label: string; color: string; icon: typeof Settings }> = {
  change_settings: {
    label: "Settings Change",
    color: "bg-flame-500/20 text-flame-400 border-flame-500/30",
    icon: Settings,
  },
  modify_prompt: {
    label: "Prompt Modify",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    icon: PenLine,
  },
  addendum_prompt: {
    label: "Addendum",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    icon: FileText,
  },
};

const STATUS_FILTERS = ["all", "discussion", "voting", "passed", "rejected", "executed"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense
// ---------------------------------------------------------------------------

export default function GovernancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-16 text-center text-ash">
          Loading...
        </div>
      }
    >
      <GovernancePageInner />
    </React.Suspense>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

function GovernancePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campfireFilter = searchParams.get("campfire");

  // Page title
  React.useEffect(() => {
    document.title = campfireFilter
      ? `Governance: f/${campfireFilter} - fuega`
      : "Governance - fuega";
  }, [campfireFilter]);

  // Active tab: proposals | settings | history
  const [activeTab, setActiveTab] = React.useState<"proposals" | "settings" | "history">("proposals");
  const [proposals, setProposals] = React.useState<Proposal[]>([]);
  const [campfires, setCampfires] = React.useState<{ id: string; name: string; member_count?: number }[]>([]);
  const [campfireId, setCampfireId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<ProposalStatus | "all">("all");

  // Settings & history
  const { settings, loading: settingsLoading } = useCampfireSettings(campfireId);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [history, setHistory] = React.useState<SettingsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  // ---- Fetch campfires list ----
  React.useEffect(() => {
    let cancelled = false;
    async function fetchCampfires() {
      try {
        const res = await api.get<{ campfires: Campfire[] }>("/api/campfires", { limit: 100 });
        if (!cancelled) {
          setCampfires(res.campfires.map((c) => ({ id: c.id, name: c.name, member_count: c.member_count })));
          // Resolve campfireId if a name filter is set
          if (campfireFilter) {
            const match = res.campfires.find((c) => c.name === campfireFilter);
            if (match) setCampfireId(match.id);
          }
        }
      } catch {
        // Silently fail
      }
    }
    fetchCampfires();
    return () => { cancelled = true; };
  }, [campfireFilter]);

  // ---- Fetch proposals ----
  React.useEffect(() => {
    let cancelled = false;

    async function fetchProposals() {
      if (!campfireFilter || !campfireId) {
        setProposals([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        interface ApiProposalWithJoins extends ApiProposal {
          creator_username?: string;
          campfire_name?: string;
          member_count?: number;
        }
        const res = await api.get<{ proposals: ApiProposalWithJoins[] }>(
          "/api/proposals",
          { campfire_id: campfireId },
        );
        if (!cancelled) {
          setProposals(
            res.proposals.map((p): Proposal => ({
              id: p.id,
              title: p.title,
              description: p.description,
              campfire: campfireFilter,
              proposalType: (p.proposed_changes?.type as Proposal["proposalType"]) ?? "change_settings",
              proposedChanges: p.proposed_changes ?? {},
              status: (p.status === "failed" ? "rejected" : p.status === "implemented" ? "executed" : p.status) as ProposalStatus,
              votesFor: p.votes_for,
              votesAgainst: p.votes_against,
              commentCount: 0,
              quorum: Math.ceil((p.member_count ?? 0) * 0.3),
              totalMembers: p.member_count ?? 0,
              author: p.creator_username ?? "unknown",
              createdAt: p.created_at,
              endsAt: p.voting_ends_at ?? p.created_at,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load proposals");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProposals();
    return () => { cancelled = true; };
  }, [campfireFilter, campfireId]);

  // ---- Fetch settings history ----
  React.useEffect(() => {
    if (!campfireId || activeTab !== "history") return;
    let cancelled = false;
    setHistoryLoading(true);

    api
      .get<{ history: SettingsHistoryEntry[] }>(
        `/api/campfires/${campfireId}/settings/history`,
        { limit: 30 },
      )
      .then((res) => {
        if (!cancelled) setHistory(res.history);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => { cancelled = true; };
  }, [campfireId, activeTab]);

  const filteredProposals =
    statusFilter === "all"
      ? proposals
      : proposals.filter((p) => p.status === statusFilter);

  // Group settings by category
  const settingsByCategory = React.useMemo(() => {
    const groups: Record<string, ResolvedSetting[]> = {};
    for (const s of settings) {
      const cat = s.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [settings]);

  // ---- No campfire selected: show picker ----
  if (!campfireFilter) {
    return (
      <div className="max-w-5xl">
        <div className="mb-8">
          <h1 className="font-mono text-2xl font-bold text-foreground tracking-tight">
            Governance Dashboard
          </h1>
          <p className="mt-1 text-sm text-ash">
            Select a campfire to view proposals, settings, and change history.
          </p>
        </div>

        <div className="rounded-lg border border-charcoal bg-coal/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-flame-400" />
            <span className="text-sm font-medium text-ash">Choose a campfire</span>
          </div>
          <CampfirePicker
            campfires={campfires}
            selectedId=""
            onSelect={(id) => {
              const c = campfires.find((cf) => cf.id === id);
              if (c) router.push(`/governance?campfire=${c.name}`);
            }}
            loading={campfires.length === 0}
            className="max-w-md"
          />

          {campfires.length > 0 && (
            <div className="mt-6 border-t border-charcoal pt-4">
              <p className="text-xs text-smoke mb-3">Or browse by campfire:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {campfires.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/governance?campfire=${c.name}`)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-mono text-ash hover:bg-charcoal/50 hover:text-foreground transition-colors text-left"
                  >
                    <Flame className="h-3.5 w-3.5 text-flame-400 shrink-0" />
                    <span className="text-flame-400">f</span>
                    <span className="text-smoke mx-0.5">|</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Main dashboard view ----
  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-5 w-5 text-flame-400" />
            <h1 className="font-mono text-2xl font-bold text-foreground tracking-tight">
              Governance
            </h1>
          </div>
          <p className="text-sm text-ash flex items-center gap-1.5">
            <span className="font-mono">
              <span className="text-flame-400 font-semibold">f</span>
              <span className="text-smoke mx-0.5">|</span>
              <span className="text-foreground">{campfireFilter}</span>
            </span>
            <button
              onClick={() => router.push("/governance")}
              className="text-[10px] text-smoke hover:text-ash transition-colors ml-1"
            >
              (change)
            </button>
          </p>
        </div>
        {user && (
          <Link href={`/governance/create?campfire=${campfireFilter}`}>
            <Button variant="spark" size="sm" className="gap-1.5 self-start">
              <Plus className="h-4 w-4" />
              Create Proposal
            </Button>
          </Link>
        )}
      </div>

      {/* Tab navigation */}
      <div className="mt-5 flex items-center gap-1 border-b border-charcoal" role="tablist">
        {([
          { key: "proposals" as const, label: "Proposals", icon: Vote, count: proposals.length },
          { key: "settings" as const, label: "Current Settings", icon: Settings, count: settings.length },
          { key: "history" as const, label: "Change History", icon: History, count: undefined },
        ]).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-flame-400 text-flame-400"
                : "border-transparent text-smoke hover:text-ash",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono",
                activeTab === tab.key
                  ? "bg-flame-500/20 text-flame-400"
                  : "bg-charcoal text-smoke",
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB: Proposals ===== */}
      {activeTab === "proposals" && (
        <div className="mt-4">
          {/* Collapsible current settings summary */}
          {settings.length > 0 && (
            <div className="mb-4 rounded-lg border border-charcoal bg-coal/30">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ash hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-flame-400" />
                  Current Settings
                  {settings.filter((s) => !s.is_default).length > 0 && (
                    <span className="rounded-full bg-flame-500/20 px-1.5 py-0.5 text-[10px] font-mono text-flame-400">
                      {settings.filter((s) => !s.is_default).length} customized
                    </span>
                  )}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-smoke transition-transform",
                  settingsOpen && "rotate-180",
                )} />
              </button>
              {settingsOpen && (
                <div className="border-t border-charcoal px-4 pb-4 pt-2">
                  <SettingsGrid
                    settingsByCategory={settingsByCategory}
                    campfireName={campfireFilter}
                  />
                </div>
              )}
            </div>
          )}

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
            <Filter className="h-4 w-4 text-smoke" />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-flame-500/20 text-flame-400 border border-flame-500/30"
                    : "text-smoke hover:text-ash border border-transparent",
                )}
              >
                {status === "all" ? "All" : statusConfig[status].label}
                {status !== "all" && (
                  <span className="ml-1 text-[10px] opacity-60">
                    {proposals.filter((p) => p.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Proposals list */}
          <div className="mt-4 space-y-3">
            {loading ? (
              <GovernanceSkeleton />
            ) : error ? (
              <div className="py-16 text-center">
                <XCircle className="mx-auto h-12 w-12 text-red-400/60" />
                <p className="mt-4 text-ash">{error}</p>
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="py-16 text-center">
                <Vote className="mx-auto h-12 w-12 text-smoke/60" />
                <p className="mt-4 text-ash">
                  {statusFilter !== "all"
                    ? `No ${statusConfig[statusFilter].label.toLowerCase()} proposals`
                    : "No proposals yet"}
                </p>
                {user && (
                  <Link href={`/governance/create?campfire=${campfireFilter}`}>
                    <Button variant="spark" size="sm" className="mt-4 gap-1.5">
                      <Plus className="h-4 w-4" />
                      Create the first proposal
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              filteredProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: Current Settings ===== */}
      {activeTab === "settings" && (
        <div className="mt-4">
          {settingsLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-flame-400 border-t-transparent" />
              <p className="mt-3 text-sm text-smoke">Loading settings...</p>
            </div>
          ) : settings.length === 0 ? (
            <div className="py-12 text-center">
              <Settings className="mx-auto h-12 w-12 text-smoke/60" />
              <p className="mt-4 text-ash">No governance settings configured</p>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-smoke">
                  {settings.length} variables &middot;{" "}
                  {settings.filter((s) => !s.is_default).length} customized from defaults
                </p>
                {user && (
                  <Link href={`/governance/create?campfire=${campfireFilter}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 border-charcoal text-ash text-xs h-7">
                      <Sparkles className="h-3 w-3" />
                      Propose Change
                    </Button>
                  </Link>
                )}
              </div>
              <SettingsGrid
                settingsByCategory={settingsByCategory}
                campfireName={campfireFilter}
                expanded
              />
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: Change History ===== */}
      {activeTab === "history" && (
        <div className="mt-4">
          {historyLoading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-flame-400 border-t-transparent" />
              <p className="mt-3 text-sm text-smoke">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <History className="mx-auto h-12 w-12 text-smoke/60" />
              <p className="mt-4 text-ash">No settings changes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-0">
              <p className="text-xs text-smoke mb-4">
                Audit trail of governance setting changes
              </p>
              <div className="rounded-lg border border-charcoal overflow-hidden">
                {history.map((entry, i) => (
                  <div
                    key={`${entry.variable_key}-${entry.created_at}`}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 text-sm",
                      i !== history.length - 1 && "border-b border-charcoal/50",
                      i % 2 === 0 ? "bg-coal/30" : "bg-coal/10",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-flame-400">{entry.variable_key}</span>
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-red-400/80 line-through">
                            {entry.old_value ?? "default"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-smoke" />
                          <span className="text-green-400 font-medium">{entry.new_value}</span>
                        </span>
                      </div>
                      {entry.change_reason && (
                        <p className="mt-0.5 text-[11px] text-smoke truncate">
                          {entry.change_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-smoke shrink-0">
                      {entry.changed_by_username && (
                        <span>{entry.changed_by_username}</span>
                      )}
                      <span>{relativeTime(entry.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Grid (used in both collapsible and full tab)
// ---------------------------------------------------------------------------

function SettingsGrid({
  settingsByCategory,
  campfireName,
  expanded = false,
}: {
  settingsByCategory: Record<string, ResolvedSetting[]>;
  campfireName: string;
  expanded?: boolean;
}) {
  const categories = Object.entries(settingsByCategory);

  return (
    <div className="space-y-4">
      {categories.map(([category, catSettings]) => (
        <div key={category}>
          <h3 className="font-mono text-xs font-medium text-smoke uppercase tracking-wider mb-2">
            {category}
          </h3>
          <div className={cn(
            "rounded-md border border-charcoal/50 overflow-hidden",
            expanded ? "divide-y divide-charcoal/30" : "",
          )}>
            {catSettings.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-xs",
                  !expanded && i !== catSettings.length - 1 && "border-b border-charcoal/30",
                  !s.is_default && "bg-flame-500/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ash font-medium truncate">{s.display_name}</span>
                    {!s.is_default && (
                      <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-mono bg-flame-500/15 text-flame-400 border border-flame-500/20">
                        customized
                      </span>
                    )}
                  </div>
                  {expanded && s.description && (
                    <p className="mt-0.5 text-[10px] text-smoke truncate">{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "font-mono text-[11px]",
                    s.is_default ? "text-smoke" : "text-foreground",
                  )}>
                    {formatSettingValue(s)}
                  </span>
                  <Link
                    href={`/governance/create?campfire=${campfireName}&variable=${s.key}`}
                    className="text-smoke hover:text-flame-400 transition-colors"
                    title="Propose change"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatSettingValue(s: ResolvedSetting): string {
  if (s.data_type === "boolean") {
    return s.value === "true" ? "on" : "off";
  }
  if (s.value.length > 30) {
    return s.value.slice(0, 27) + "...";
  }
  return s.value;
}

// ---------------------------------------------------------------------------
// Proposal Card
// ---------------------------------------------------------------------------

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const config = statusConfig[proposal.status];
  const StatusIcon = config.icon;
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercent = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 0;

  const tc = typeConfig[proposal.proposalType] ?? typeConfig["change_settings"];
  if (!tc) return null;
  const TypeIcon = tc.icon;

  // Extract diff info for settings change proposals
  const settingsDiff = proposal.proposalType === "change_settings" && proposal.proposedChanges
    ? {
        key: (proposal.proposedChanges.variable_key as string) ?? null,
        value: (proposal.proposedChanges.proposed_value as string) ?? null,
      }
    : null;

  return (
    <Link
      href={`/governance/${proposal.id}`}
      className="block rounded-lg border border-charcoal bg-charcoal/50 p-4 transition-colors hover:border-flame-500/30 hover:bg-charcoal/70"
    >
      <div className="flex items-start gap-3">
        {/* Compact flame gauge */}
        <FlameGauge
          sparkVotes={proposal.votesFor}
          douseVotes={proposal.votesAgainst}
          quorum={proposal.quorum}
          totalMembers={proposal.totalMembers}
          size="sm"
          className="shrink-0 mt-1"
        />

        <div className="min-w-0 flex-1">
          {/* Meta row: type badge, campfire, author */}
          <div className="flex items-center gap-2 text-xs text-smoke flex-wrap">
            <Badge
              variant="outline"
              className={cn("gap-1 text-[10px] shrink-0", tc.color)}
            >
              <TypeIcon className="h-2.5 w-2.5" />
              {tc.label}
            </Badge>
            <span className="font-mono text-flame-400">
              <span className="text-lava-hot font-semibold">f</span>
              <span className="text-smoke mx-0.5">|</span>
              <span>{proposal.campfire}</span>
            </span>
            <span className="text-smoke">by {proposal.author}</span>
          </div>

          {/* Title */}
          <h3 className="mt-1.5 text-sm font-medium text-foreground">
            {proposal.title}
          </h3>

          {/* Settings change diff preview */}
          {settingsDiff?.key && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded bg-coal/60 border border-charcoal/50 px-2 py-1 w-fit">
              <span className="font-mono text-[11px] text-smoke">{settingsDiff.key}</span>
              <ArrowRight className="h-3 w-3 text-smoke" />
              <span className="font-mono text-[11px] text-green-400 font-medium">{settingsDiff.value}</span>
            </div>
          )}

          {/* Description excerpt */}
          <p className="mt-1.5 text-xs text-ash line-clamp-2">
            {proposal.description}
          </p>
        </div>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn("shrink-0 gap-1 text-[10px]", config.color)}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Footer meta */}
      <div className="mt-2 flex items-center gap-4 text-[10px] text-smoke">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {proposal.commentCount} comments
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeRemaining(proposal.endsAt)}
        </span>
        <span>{relativeTime(proposal.createdAt)}</span>
      </div>
    </Link>
  );
}
