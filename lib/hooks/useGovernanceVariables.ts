"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GovernanceVariable {
  id: string;
  key: string;
  display_name: string;
  description: string;
  data_type: "boolean" | "integer" | "string" | "text" | "enum" | "multi_enum";
  default_value: string;
  min_value: string | null;
  max_value: string | null;
  allowed_values: string[] | null;
  level: "campfire" | "platform";
  category: string;
  sort_order: number;
  is_active: boolean;
  requires_proposal: boolean;
  created_at: string;
}

export interface ResolvedSetting {
  key: string;
  display_name: string;
  description: string;
  data_type: string;
  value: string;
  is_default: boolean;
  category: string;
  allowed_values: string[] | null;
  min_value: string | null;
  max_value: string | null;
}

// ---------------------------------------------------------------------------
// All governance variables (public registry)
// ---------------------------------------------------------------------------

interface UseGovernanceVariablesReturn {
  variables: GovernanceVariable[];
  loading: boolean;
  error: string | null;
}

export function useGovernanceVariables(): UseGovernanceVariablesReturn {
  const [variables, setVariables] = useState<GovernanceVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ variables: GovernanceVariable[] }>("/api/governance-variables")
      .then((data) => {
        if (!cancelled) setVariables(data.variables);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load governance variables",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { variables, loading, error };
}

// ---------------------------------------------------------------------------
// Resolved settings for a specific campfire
// ---------------------------------------------------------------------------

interface UseCampfireSettingsReturn {
  settings: ResolvedSetting[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCampfireSettings(
  campfireId: string | null,
): UseCampfireSettingsReturn {
  const [settings, setSettings] = useState<ResolvedSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campfireId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ settings: ResolvedSetting[] }>(
        `/api/campfires/${campfireId}/settings`,
      );
      setSettings(data.settings);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load campfire settings",
      );
    } finally {
      setLoading(false);
    }
  }, [campfireId]);

  useEffect(() => {
    let cancelled = false;
    if (!campfireId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<{ settings: ResolvedSetting[] }>(
        `/api/campfires/${campfireId}/settings`,
      )
      .then((data) => {
        if (!cancelled) setSettings(data.settings);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load campfire settings",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campfireId]);

  return { settings, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Update a single setting
// ---------------------------------------------------------------------------

interface UseUpdateSettingReturn {
  updateSetting: (
    campfireId: string,
    key: string,
    value: string,
    reason?: string,
  ) => Promise<void>;
  updating: boolean;
  error: string | null;
}

export function useUpdateSetting(): UseUpdateSettingReturn {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = useCallback(
    async (
      campfireId: string,
      key: string,
      value: string,
      reason?: string,
    ) => {
      setUpdating(true);
      setError(null);
      try {
        await api.put(`/api/campfires/${campfireId}/settings`, {
          key,
          value,
          reason,
        });
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "Failed to update setting";
        setError(msg);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [],
  );

  return { updateSetting, updating, error };
}
