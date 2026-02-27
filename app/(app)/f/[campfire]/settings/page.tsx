"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, AlertTriangle, Loader2, Vote, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampfire } from "@/lib/hooks/useCampfires";
import {
  useGovernanceVariables,
  useCampfireSettings,
  useUpdateSetting,
  type GovernanceVariable,
  type ResolvedSetting,
} from "@/lib/hooks/useGovernanceVariables";
import { useAuth } from "@/lib/contexts/auth-context";

// ---------------------------------------------------------------------------
// Category display names and ordering
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  moderation: { label: "moderation", order: 0 },
  content: { label: "content", order: 1 },
  access: { label: "access", order: 2 },
  governance: { label: "governance", order: 3 },
  identity: { label: "identity", order: 4 },
};

function categoryOrder(cat: string): number {
  return CATEGORY_META[cat]?.order ?? 99;
}

// ---------------------------------------------------------------------------
// Settings skeleton
// ---------------------------------------------------------------------------

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div
              key={j}
              className="flex items-center justify-between rounded-md border border-lava-hot/10 bg-coal/50 p-4"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual setting editor
// ---------------------------------------------------------------------------

interface SettingEditorProps {
  setting: ResolvedSetting;
  variable: GovernanceVariable | undefined;
  campfireId: string;
  isAdmin: boolean;
  onSaved: () => void;
}

function SettingEditor({
  setting,
  variable,
  campfireId,
  isAdmin,
  onSaved,
}: SettingEditorProps) {
  const requiresProposal = variable?.requires_proposal ?? false;
  const [localValue, setLocalValue] = React.useState(setting.value);
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const { updateSetting, updating, error } = useUpdateSetting();

  // Reset local value when setting changes (e.g. after refresh)
  React.useEffect(() => {
    setLocalValue(setting.value);
    setDirty(false);
  }, [setting.value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    setDirty(newValue !== setting.value);
    setSaved(false);
  };

  // Validation for integer fields
  const isIntegerOutOfRange = React.useMemo(() => {
    if (setting.data_type !== "integer") return false;
    const numVal = parseInt(localValue, 10);
    if (isNaN(numVal)) return true;
    const minNum = setting.min_value !== null ? parseInt(setting.min_value, 10) : null;
    const maxNum = setting.max_value !== null ? parseInt(setting.max_value, 10) : null;
    if (minNum !== null && !isNaN(minNum) && numVal < minNum) return true;
    if (maxNum !== null && !isNaN(maxNum) && numVal > maxNum) return true;
    return false;
  }, [setting.data_type, setting.min_value, setting.max_value, localValue]);

  const handleSave = async () => {
    if (isIntegerOutOfRange) return;
    try {
      await updateSetting(campfireId, setting.key, localValue);
      setSaved(true);
      setDirty(false);
      onSaved();
      // Clear saved indicator after 2s
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error is set by the hook
    }
  };

  // Render the correct input based on data_type
  const renderInput = () => {
    switch (setting.data_type) {
      case "boolean":
        return (
          <button
            type="button"
            disabled={!isAdmin || requiresProposal}
            onClick={() => handleChange(localValue === "true" ? "false" : "true")}
            className={`font-mono text-sm px-3 py-1 rounded border transition-colors ${
              localValue === "true"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            } ${!isAdmin || requiresProposal ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
          >
            {localValue === "true" ? "true" : "false"}
          </button>
        );

      case "integer": {
        const numVal = parseInt(localValue, 10);
        const minNum = setting.min_value !== null ? parseInt(setting.min_value, 10) : null;
        const maxNum = setting.max_value !== null ? parseInt(setting.max_value, 10) : null;
        const outOfRange =
          !isNaN(numVal) &&
          ((minNum !== null && !isNaN(minNum) && numVal < minNum) ||
            (maxNum !== null && !isNaN(maxNum) && numVal > maxNum));
        return (
          <div>
            <input
              type="number"
              disabled={!isAdmin || requiresProposal}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              min={minNum ?? undefined}
              max={maxNum ?? undefined}
              className={`w-24 rounded border bg-void px-2 py-1 text-sm font-mono text-foreground
                         focus:outline-none focus:ring-1
                         disabled:opacity-50 disabled:cursor-not-allowed ${
                           outOfRange
                             ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                             : "border-charcoal focus:border-lava-hot/50 focus:ring-lava-hot/30"
                         }`}
            />
            {outOfRange && (
              <p className="mt-0.5 text-[10px] text-red-400 flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                Must be between {setting.min_value ?? "..."} and{" "}
                {setting.max_value ?? "..."}
              </p>
            )}
          </div>
        );
      }

      case "enum":
        return (
          <select
            disabled={!isAdmin || requiresProposal}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded border border-charcoal bg-void px-2 py-1 text-sm font-mono text-foreground
                       focus:border-lava-hot/50 focus:outline-none focus:ring-1 focus:ring-lava-hot/30
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(setting.allowed_values ?? []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        );

      case "multi_enum": {
        const selected = localValue
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const toggleValue = (val: string) => {
          const next = selected.includes(val)
            ? selected.filter((s) => s !== val)
            : [...selected, val];
          handleChange(next.join(","));
        };
        return (
          <div className="flex flex-wrap gap-1.5">
            {(setting.allowed_values ?? []).map((v) => {
              const active = selected.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  disabled={!isAdmin || requiresProposal}
                  onClick={() => toggleValue(v)}
                  className={`rounded border px-2 py-0.5 text-xs font-mono transition-colors ${
                    active
                      ? "border-flame-500/40 bg-flame-500/15 text-flame-400"
                      : "border-charcoal bg-void text-smoke"
                  } ${!isAdmin || requiresProposal ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        );
      }

      case "string":
        return (
          <div className="w-full max-w-xs">
            <input
              type="text"
              disabled={!isAdmin || requiresProposal}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={200}
              className="w-full rounded border border-charcoal bg-void px-2 py-1 text-sm font-mono text-foreground
                         focus:border-lava-hot/50 focus:outline-none focus:ring-1 focus:ring-lava-hot/30
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-0.5 text-right text-[10px] text-smoke/60">
              {localValue.length}/200
            </p>
          </div>
        );

      case "text":
        return (
          <div className="w-full max-w-md">
            <textarea
              disabled={!isAdmin || requiresProposal}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded border border-charcoal bg-void px-2 py-1 text-sm font-mono text-foreground
                         focus:border-lava-hot/50 focus:outline-none focus:ring-1 focus:ring-lava-hot/30
                         disabled:opacity-50 disabled:cursor-not-allowed resize-y"
            />
            <p className="mt-0.5 text-right text-[10px] text-smoke/60">
              {localValue.length.toLocaleString()}/2,000
            </p>
          </div>
        );

      default:
        return (
          <span className="text-sm font-mono text-smoke">{localValue}</span>
        );
    }
  };

  return (
    <div className="rounded-md border border-lava-hot/10 bg-coal/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Label + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {setting.display_name}
            </span>
            {!setting.is_default && (
              <Badge
                variant="outline"
                className="border-flame-500/30 bg-flame-500/10 text-flame-400 text-[10px]"
              >
                Modified
              </Badge>
            )}
            {requiresProposal && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]"
              >
                <Vote className="mr-0.5 h-2.5 w-2.5" />
                Requires Proposal
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-smoke leading-relaxed">
            {setting.description}
          </p>
          {setting.data_type === "integer" &&
            (setting.min_value !== null || setting.max_value !== null) && (
              <p className="mt-0.5 text-[10px] text-smoke/60 font-mono">
                range: [{setting.min_value ?? "..."}
                {" - "}
                {setting.max_value ?? "..."}]
              </p>
            )}
        </div>

        {/* Editor + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {renderInput()}

          {/* Save / Propose buttons */}
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-[10px] text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {error}
              </span>
            )}
            {saved && (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {requiresProposal && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                disabled
                title="Proposal system coming soon"
              >
                <Vote className="mr-1 h-3 w-3" />
                Propose Change
              </Button>
            )}
            {!requiresProposal && isAdmin && dirty && (
              <Button
                variant="spark"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={updating || isIntegerOutOfRange}
              >
                {updating ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CampfireSettingsPage() {
  const params = useParams();
  const campfireSlug = params.campfire as string;
  const { user } = useAuth();

  // Fetch campfire to get ID
  const {
    campfire,
    loading: campfireLoading,
    error: campfireError,
  } = useCampfire(campfireSlug);

  // Fetch governance variables (the registry of all variable definitions)
  const {
    variables,
    loading: variablesLoading,
    error: variablesError,
  } = useGovernanceVariables();

  // Fetch resolved settings for this campfire (once we have the ID)
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    refresh: refreshSettings,
  } = useCampfireSettings(campfire?.id ?? null);

  // Build a map from variable key -> variable definition for quick lookup
  const variableMap = React.useMemo(() => {
    const map = new Map<string, GovernanceVariable>();
    for (const v of variables) {
      map.set(v.key, v);
    }
    return map;
  }, [variables]);

  // Determine if user is admin (created the campfire)
  const isUserAdmin = Boolean(
    user && campfire && campfire.created_by === user.id,
  );

  // Page title
  React.useEffect(() => {
    document.title = `Settings - f/${campfireSlug} - fuega`;
  }, [campfireSlug]);

  // Group settings by category
  const grouped = React.useMemo(() => {
    const groups = new Map<string, ResolvedSetting[]>();
    for (const s of settings) {
      const cat = s.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    // Sort categories
    return Array.from(groups.entries()).sort(
      ([a], [b]) => categoryOrder(a) - categoryOrder(b),
    );
  }, [settings]);

  const loading = campfireLoading || variablesLoading || settingsLoading;
  const error = campfireError || variablesError || settingsError;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href={`/f/${campfireSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-smoke hover:text-flame-400 transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to{" "}
        <span className="text-flame-400 font-semibold">f</span>
        <span className="text-smoke">|</span>
        <span className="text-flame-400">{campfireSlug}</span>
      </Link>

      {/* Page header */}
      <div className="rounded-lg border border-charcoal bg-charcoal/50 p-5 mb-6">
        <h1 className="text-lg font-bold text-foreground font-mono">
          <span className="text-smoke">$ </span>
          governance settings
        </h1>
        <p className="mt-1 text-xs text-ash leading-relaxed">
          Governance variables control how this campfire&apos;s Tender operates.
          {isUserAdmin
            ? " As an admin, you can modify settings that don't require a proposal."
            : " Only campfire admins can modify these settings."}
        </p>
      </div>

      {/* Loading state */}
      {loading && <SettingsSkeleton />}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <p className="text-sm text-red-400">{error}</p>
          <Link
            href={`/f/${campfireSlug}`}
            className="mt-3 inline-block text-xs text-flame-400 hover:underline"
          >
            Back to campfire
          </Link>
        </div>
      )}

      {/* Permission check for non-admins */}
      {!loading && !error && !isUserAdmin && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <p className="text-sm font-medium text-amber-400">
            You don&apos;t have permission to modify these settings
          </p>
          <p className="mt-1 text-xs text-smoke">
            Only the campfire creator can change governance variables.
            You can still view the current configuration below.
          </p>
        </div>
      )}

      {/* Settings grouped by category */}
      {!loading && !error && (
        <div className="space-y-8">
          {grouped.length === 0 ? (
            <div className="rounded-lg border border-charcoal bg-coal/50 p-8 text-center">
              <p className="text-sm text-smoke">
                No governance variables configured yet.
              </p>
            </div>
          ) : (
            grouped.map(([category, categorySettings]) => (
              <div key={category}>
                {/* Category header */}
                <h2 className="text-sm font-bold text-foreground font-mono mb-3">
                  <span className="text-smoke">$ </span>
                  <span className="text-lava-hot">{category}</span>
                </h2>

                {/* Settings in this category */}
                <div className="space-y-2">
                  {categorySettings.map((s) => (
                    <SettingEditor
                      key={s.key}
                      setting={s}
                      variable={variableMap.get(s.key)}
                      campfireId={campfire!.id}
                      isAdmin={isUserAdmin}
                      onSaved={refreshSettings}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
