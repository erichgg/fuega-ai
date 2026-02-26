"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api/client";
import type { Campfire } from "@/lib/api/client";
import { useCreateProposal } from "@/lib/hooks/useProposals";
import {
  useGovernanceVariables,
  useCampfireSettings,
  type GovernanceVariable,
} from "@/lib/hooks/useGovernanceVariables";

const PROPOSAL_TYPES = [
  { value: "change_settings", label: "Settings Change", description: "Change a governance variable for this campfire" },
  { value: "modify_prompt", label: "Modify Prompt", description: "Modify the Tender prompt for this campfire" },
  { value: "addendum_prompt", label: "Addendum", description: "Add an addendum to the Tender prompt" },
] as const;

type ProposalType = (typeof PROPOSAL_TYPES)[number]["value"];

export default function CreateProposalPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-2xl py-16 text-center text-ash">
          Loading...
        </div>
      }
    >
      <CreateProposalInner />
    </React.Suspense>
  );
}

function CreateProposalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const campfireName = searchParams.get("campfire") ?? "";
  const preselectedVariable = searchParams.get("variable") ?? "";

  const { createProposal, creating, error: createError } = useCreateProposal();
  const { variables, loading: varsLoading } = useGovernanceVariables();

  const [campfireId, setCampfireId] = React.useState<string | null>(null);
  const [campfireLoading, setCampfireLoading] = React.useState(true);
  const [campfireError, setCampfireError] = React.useState<string | null>(null);

  // Fetch resolved campfire settings to show current values
  const { settings, loading: settingsLoading } = useCampfireSettings(campfireId);

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [proposalType, setProposalType] = React.useState<ProposalType>("change_settings");
  const [selectedVariable, setSelectedVariable] = React.useState<string>("");
  const [proposedValue, setProposedValue] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // Variable selector state
  const [variableSearch, setVariableSearch] = React.useState("");
  const [collapsedCategories, setCollapsedCategories] = React.useState<Set<string>>(new Set());
  const [showAdminOnly, setShowAdminOnly] = React.useState(false);

  // Pre-select variable from query param once variables finish loading
  React.useEffect(() => {
    if (preselectedVariable && !varsLoading && variables.length > 0 && !selectedVariable) {
      const match = variables.find((v) => v.key === preselectedVariable);
      if (match) {
        setSelectedVariable(match.key);
        setProposalType("change_settings");
      }
    }
  }, [preselectedVariable, varsLoading, variables, selectedVariable]);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Resolve campfire name to ID
  React.useEffect(() => {
    if (!campfireName) {
      setCampfireLoading(false);
      setCampfireError("No campfire specified. Go back and select a campfire.");
      return;
    }
    let cancelled = false;
    setCampfireLoading(true);
    setCampfireError(null);

    api
      .get<{ campfires: Campfire[] }>("/api/campfires", { limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const match = res.campfires.find((c) => c.name === campfireName);
        if (match) {
          setCampfireId(match.id);
        } else {
          setCampfireError(`Campfire "${campfireName}" not found.`);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCampfireError(
            err instanceof ApiError ? err.message : "Failed to load campfires",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCampfireLoading(false);
      });

    return () => { cancelled = true; };
  }, [campfireName]);

  // Get the selected variable details
  const activeVariable: GovernanceVariable | undefined = React.useMemo(
    () => variables.find((v) => v.key === selectedVariable),
    [variables, selectedVariable],
  );

  // Current campfire value for the selected variable
  const currentValue: string | undefined = React.useMemo(() => {
    if (!selectedVariable) return undefined;
    const s = settings.find((s) => s.key === selectedVariable);
    return s?.value ?? activeVariable?.default_value;
  }, [selectedVariable, settings, activeVariable]);

  // Whether the current value is a campfire override vs default
  const isCurrentDefault: boolean = React.useMemo(() => {
    if (!selectedVariable) return true;
    const s = settings.find((s) => s.key === selectedVariable);
    return s?.is_default ?? true;
  }, [selectedVariable, settings]);

  // Group active variables by category, split by requires_proposal
  const { proposalVariables, adminVariables } = React.useMemo(() => {
    const active = variables.filter((v) => v.is_active);
    const search = variableSearch.toLowerCase().trim();
    const filtered = search
      ? active.filter(
          (v) =>
            v.display_name.toLowerCase().includes(search) ||
            v.key.toLowerCase().includes(search) ||
            v.description.toLowerCase().includes(search) ||
            v.category.toLowerCase().includes(search)
        )
      : active;

    const proposal = filtered.filter((v) => v.requires_proposal);
    const admin = filtered.filter((v) => !v.requires_proposal);

    return {
      proposalVariables: proposal,
      adminVariables: admin,
    };
  }, [variables, variableSearch]);

  // Group variables by category
  function groupByCategory(vars: GovernanceVariable[]): Map<string, GovernanceVariable[]> {
    const map = new Map<string, GovernanceVariable[]>();
    for (const v of vars) {
      const list = map.get(v.category) ?? [];
      list.push(v);
      map.set(v.category, list);
    }
    return map;
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Get current campfire value for a variable key
  function getCurrentForKey(key: string): string | undefined {
    const s = settings.find((s) => s.key === key);
    return s?.value;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!campfireId) {
      setFormError("Campfire could not be resolved.");
      return;
    }
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setFormError("Description is required.");
      return;
    }

    // Build proposed_changes based on type
    let proposed_changes: Record<string, unknown> = {};
    if (proposalType === "change_settings") {
      if (!selectedVariable) {
        setFormError("Select a governance variable to change.");
        return;
      }
      if (!proposedValue.trim()) {
        setFormError("Enter the proposed value.");
        return;
      }
      proposed_changes = {
        type: "change_settings",
        variable_key: selectedVariable,
        proposed_value: proposedValue,
      };
    } else if (proposalType === "modify_prompt") {
      proposed_changes = {
        type: "modify_prompt",
        proposed_prompt: proposedValue || "",
      };
    } else {
      proposed_changes = {
        type: "addendum_prompt",
        addendum: proposedValue || "",
      };
    }

    try {
      const result = await createProposal({
        campfire_id: campfireId,
        proposal_type: proposalType,
        title: title.trim(),
        description: description.trim(),
        proposed_changes,
      });
      router.push(`/governance/${result.proposal.id}`);
    } catch {
      // Error is set via the hook's error state
    }
  }

  if (authLoading || campfireLoading) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-flame-400" />
        <p className="mt-4 text-sm text-ash">Loading...</p>
      </div>
    );
  }

  if (campfireError) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400/60" />
        <p className="mt-4 text-ash">{campfireError}</p>
        <Link
          href="/governance"
          className="mt-4 inline-block text-sm text-flame-400 hover:underline"
        >
          Back to governance
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/governance?campfire=${campfireName}`}
        className="inline-flex items-center gap-1.5 text-sm text-smoke transition-colors hover:text-ash"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to proposals
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-foreground">Create Proposal</h1>
        <p className="mt-1 text-sm text-ash">
          Propose a governance change for{" "}
          <span className="text-flame-400 font-medium">
            <span className="text-lava-hot">f</span>
            <span className="text-smoke mx-1">|</span>
            {campfireName}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-ash mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief title for your proposal"
            maxLength={200}
            className="border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-[10px] text-smoke">{title.length}/200</p>
        </div>

        {/* Proposal Type */}
        <div>
          <label className="block text-sm font-medium text-ash mb-1.5">
            Proposal Type <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {PROPOSAL_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => {
                  setProposalType(pt.value);
                  setSelectedVariable("");
                  setProposedValue("");
                }}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  proposalType === pt.value
                    ? "border-flame-500/50 bg-flame-500/10"
                    : "border-charcoal bg-charcoal/30 hover:border-charcoal",
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  proposalType === pt.value ? "text-flame-400" : "text-ash",
                )}>
                  {pt.label}
                </span>
                <p className="text-xs text-smoke mt-0.5">{pt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Variable selector for change_settings */}
        {proposalType === "change_settings" && (
          <div>
            <label className="block text-sm font-medium text-ash mb-1.5">
              Governance Variable <span className="text-red-400">*</span>
            </label>
            {varsLoading || settingsLoading ? (
              <p className="text-xs text-smoke">Loading variables...</p>
            ) : variables.length === 0 ? (
              <p className="text-xs text-smoke">No governance variables found.</p>
            ) : (
              <div className="space-y-2">
                {/* Search filter */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-smoke" />
                  <input
                    type="text"
                    value={variableSearch}
                    onChange={(e) => setVariableSearch(e.target.value)}
                    placeholder="Search variables..."
                    className="w-full rounded-md border border-charcoal bg-coal pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-smoke focus:outline-none focus:ring-1 focus:ring-flame-500/50 font-mono"
                  />
                </div>

                {/* Proposal-required variables (main list) */}
                <div className="rounded-md border border-charcoal bg-coal max-h-64 overflow-y-auto">
                  {proposalVariables.length === 0 && !showAdminOnly && (
                    <p className="p-3 text-xs text-smoke text-center">
                      {variableSearch ? "No matching proposal-required variables." : "No proposal-required variables found."}
                    </p>
                  )}
                  {Array.from(groupByCategory(proposalVariables)).map(([category, vars]) => (
                    <div key={category}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-flame-400 bg-charcoal/50 hover:bg-charcoal/70 transition-colors sticky top-0 z-10"
                      >
                        {collapsedCategories.has(category) ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <Shield className="h-3 w-3" />
                        {category.replace(/_/g, " ")}
                        <span className="text-smoke font-normal ml-auto">{vars.length}</span>
                      </button>
                      {!collapsedCategories.has(category) &&
                        vars.map((v) => {
                          const campfireVal = getCurrentForKey(v.key);
                          const displayVal = campfireVal ?? v.default_value;
                          return (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => {
                                setSelectedVariable(v.key);
                                setProposedValue("");
                              }}
                              className={cn(
                                "flex w-full items-center justify-between px-3 py-2 text-left transition-colors border-b border-charcoal/50 last:border-b-0",
                                selectedVariable === v.key
                                  ? "bg-flame-500/10 text-flame-400"
                                  : "hover:bg-charcoal/30 text-ash"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-mono block truncate">{v.display_name}</span>
                                <span className="text-[10px] text-smoke block truncate">{v.key}</span>
                              </div>
                              <span className="ml-2 shrink-0 text-[10px] font-mono text-smoke bg-charcoal/50 px-1.5 py-0.5 rounded">
                                {campfireVal ? displayVal : `${displayVal}`}
                                {!campfireVal && <span className="text-smoke/50 ml-0.5">(default)</span>}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>

                {/* Admin-only toggle */}
                {adminVariables.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdminOnly(!showAdminOnly)}
                      className="flex items-center gap-1.5 text-[11px] text-smoke hover:text-ash transition-colors"
                    >
                      {showAdminOnly ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <Lock className="h-3 w-3" />
                      Admin-only settings ({adminVariables.length})
                      <span className="text-smoke/60 ml-1">-- no proposal needed</span>
                    </button>
                    {showAdminOnly && (
                      <div className="mt-1 rounded-md border border-charcoal/50 bg-coal/50 max-h-48 overflow-y-auto opacity-70">
                        {Array.from(groupByCategory(adminVariables)).map(([category, vars]) => (
                          <div key={category}>
                            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-smoke bg-charcoal/30">
                              {category.replace(/_/g, " ")}
                            </div>
                            {vars.map((v) => {
                              const campfireVal = getCurrentForKey(v.key);
                              const displayVal = campfireVal ?? v.default_value;
                              return (
                                <div
                                  key={v.key}
                                  className="flex items-center justify-between px-3 py-1.5 text-xs text-smoke border-b border-charcoal/30 last:border-b-0"
                                >
                                  <span className="font-mono truncate">{v.display_name}</span>
                                  <span className="ml-2 shrink-0 font-mono text-[10px] bg-charcoal/30 px-1.5 py-0.5 rounded">
                                    {displayVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Variable details panel */}
            {activeVariable && (
              <div className="mt-2 rounded-md border border-charcoal bg-charcoal/30 p-3 text-xs text-smoke space-y-1.5">
                <p className="text-ash text-sm font-medium">{activeVariable.display_name}</p>
                <p>{activeVariable.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Type: <span className="text-ash font-mono">{activeVariable.data_type}</span>
                  </span>
                  {activeVariable.min_value != null && (
                    <span>Min: <span className="text-ash font-mono">{activeVariable.min_value}</span></span>
                  )}
                  {activeVariable.max_value != null && (
                    <span>Max: <span className="text-ash font-mono">{activeVariable.max_value}</span></span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Default: <span className="text-ash font-mono">{activeVariable.default_value}</span>
                  </span>
                  <span>
                    Current:{" "}
                    <span className={cn("font-mono", isCurrentDefault ? "text-smoke" : "text-flame-400")}>
                      {currentValue ?? activeVariable.default_value}
                    </span>
                    {isCurrentDefault && <span className="text-smoke/50 ml-1">(default)</span>}
                    {!isCurrentDefault && <span className="text-flame-400/50 ml-1">(override)</span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proposed value */}
        {proposalType === "change_settings" && selectedVariable && activeVariable && (
          <div>
            <label htmlFor="proposed-value" className="block text-sm font-medium text-ash mb-1.5">
              Proposed Value <span className="text-red-400">*</span>
              {currentValue != null && (
                <span className="ml-2 font-normal text-smoke text-xs">
                  changing from <span className="font-mono text-ash">{currentValue}</span>
                </span>
              )}
            </label>
            {activeVariable.data_type === "boolean" ? (
              <div className="flex gap-3">
                {["true", "false"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProposedValue(val)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-mono transition-colors",
                      proposedValue === val
                        ? "border-flame-500/50 bg-flame-500/10 text-flame-400"
                        : "border-charcoal bg-coal text-ash hover:border-charcoal",
                      currentValue === val && proposedValue !== val && "border-smoke/30"
                    )}
                  >
                    {val}
                    {currentValue === val && (
                      <span className="ml-1.5 text-[10px] text-smoke">(current)</span>
                    )}
                  </button>
                ))}
              </div>
            ) : activeVariable.data_type === "enum" && activeVariable.allowed_values ? (
              <div className="space-y-1.5">
                {activeVariable.allowed_values.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProposedValue(val)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      proposedValue === val
                        ? "border-flame-500/50 bg-flame-500/10 text-flame-400"
                        : "border-charcoal bg-coal text-ash hover:border-charcoal"
                    )}
                  >
                    <span
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors",
                        proposedValue === val
                          ? "border-flame-400 bg-flame-400"
                          : "border-smoke bg-transparent"
                      )}
                    />
                    <span className="font-mono">{val}</span>
                    {currentValue === val && (
                      <span className="ml-auto text-[10px] text-smoke">(current)</span>
                    )}
                  </button>
                ))}
              </div>
            ) : activeVariable.data_type === "integer" ? (
              <div className="space-y-2">
                <Input
                  id="proposed-value"
                  type="number"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder={`Enter new value (current: ${currentValue ?? activeVariable.default_value})`}
                  min={activeVariable.min_value ?? undefined}
                  max={activeVariable.max_value ?? undefined}
                  className="border-charcoal bg-coal text-sm font-mono placeholder:text-smoke focus-visible:ring-flame-500/50"
                />
                {activeVariable.min_value != null && activeVariable.max_value != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-smoke shrink-0">{activeVariable.min_value}</span>
                    <input
                      type="range"
                      min={activeVariable.min_value}
                      max={activeVariable.max_value}
                      value={proposedValue || activeVariable.default_value}
                      onChange={(e) => setProposedValue(e.target.value)}
                      className="flex-1 h-1.5 appearance-none rounded-full bg-charcoal accent-flame-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-flame-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-coal"
                    />
                    <span className="text-[10px] font-mono text-smoke shrink-0">{activeVariable.max_value}</span>
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="proposed-value"
                type="text"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder={`Enter new value (current: ${currentValue ?? activeVariable.default_value})`}
                className="border-charcoal bg-coal text-sm font-mono placeholder:text-smoke focus-visible:ring-flame-500/50"
              />
            )}
          </div>
        )}

        {/* Proposed prompt text for modify/addendum types */}
        {(proposalType === "modify_prompt" || proposalType === "addendum_prompt") && (
          <div>
            <label htmlFor="proposed-text" className="block text-sm font-medium text-ash mb-1.5">
              {proposalType === "modify_prompt" ? "Proposed Prompt" : "Addendum Text"}
            </label>
            <Textarea
              id="proposed-text"
              value={proposedValue}
              onChange={(e) => setProposedValue(e.target.value)}
              placeholder={
                proposalType === "modify_prompt"
                  ? "Describe the prompt changes you propose..."
                  : "Enter the addendum text..."
              }
              rows={4}
              className="min-h-[100px] resize-y border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ash mb-1.5">
            Description <span className="text-red-400">*</span>
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain why this change should be made and what impact it will have..."
            rows={4}
            maxLength={5000}
            className="min-h-[100px] resize-y border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
          />
          <p className="mt-1 text-[10px] text-smoke">{description.length}/5000</p>
        </div>

        {/* Errors */}
        {(formError || createError) && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{formError || createError}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/governance?campfire=${campfireName}`}>
            <Button type="button" variant="outline" size="sm" className="border-charcoal text-ash">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="spark"
            size="sm"
            disabled={creating}
            className="gap-1.5"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? "Creating..." : "Create Proposal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
