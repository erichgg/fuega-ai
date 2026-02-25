"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertCircle,
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

  const { createProposal, creating, error: createError } = useCreateProposal();
  const { variables, loading: varsLoading } = useGovernanceVariables();

  const [campfireId, setCampfireId] = React.useState<string | null>(null);
  const [campfireLoading, setCampfireLoading] = React.useState(true);
  const [campfireError, setCampfireError] = React.useState<string | null>(null);

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [proposalType, setProposalType] = React.useState<ProposalType>("change_settings");
  const [selectedVariable, setSelectedVariable] = React.useState<string>("");
  const [proposedValue, setProposedValue] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);

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
            <label htmlFor="variable" className="block text-sm font-medium text-ash mb-1.5">
              Governance Variable <span className="text-red-400">*</span>
            </label>
            {varsLoading ? (
              <p className="text-xs text-smoke">Loading variables...</p>
            ) : variables.length === 0 ? (
              <p className="text-xs text-smoke">No governance variables found.</p>
            ) : (
              <select
                id="variable"
                value={selectedVariable}
                onChange={(e) => {
                  setSelectedVariable(e.target.value);
                  setProposedValue("");
                }}
                className="w-full rounded-md border border-charcoal bg-coal px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500/50"
              >
                <option value="">Select a variable...</option>
                {variables
                  .filter((v) => v.is_active)
                  .map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.display_name} ({v.key})
                    </option>
                  ))}
              </select>
            )}

            {activeVariable && (
              <div className="mt-2 rounded-md border border-charcoal bg-charcoal/30 p-3 text-xs text-smoke space-y-1">
                <p>{activeVariable.description}</p>
                <p>
                  Type: <span className="text-ash">{activeVariable.data_type}</span>
                  {activeVariable.min_value != null && (
                    <> | Min: <span className="text-ash">{activeVariable.min_value}</span></>
                  )}
                  {activeVariable.max_value != null && (
                    <> | Max: <span className="text-ash">{activeVariable.max_value}</span></>
                  )}
                </p>
                <p>Default: <span className="text-ash">{activeVariable.default_value}</span></p>
              </div>
            )}
          </div>
        )}

        {/* Proposed value */}
        {proposalType === "change_settings" && selectedVariable && activeVariable && (
          <div>
            <label htmlFor="proposed-value" className="block text-sm font-medium text-ash mb-1.5">
              Proposed Value <span className="text-red-400">*</span>
            </label>
            {activeVariable.data_type === "boolean" ? (
              <select
                id="proposed-value"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                className="w-full rounded-md border border-charcoal bg-coal px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500/50"
              >
                <option value="">Select...</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : activeVariable.data_type === "enum" && activeVariable.allowed_values ? (
              <select
                id="proposed-value"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                className="w-full rounded-md border border-charcoal bg-coal px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500/50"
              >
                <option value="">Select...</option>
                {activeVariable.allowed_values.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : (
              <Input
                id="proposed-value"
                type={activeVariable.data_type === "integer" ? "number" : "text"}
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder={`Enter new value (default: ${activeVariable.default_value})`}
                min={activeVariable.min_value ?? undefined}
                max={activeVariable.max_value ?? undefined}
                className="border-charcoal bg-coal text-sm placeholder:text-smoke focus-visible:ring-flame-500/50"
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
