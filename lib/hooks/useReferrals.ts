"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type ReferralStats,
  type ReferralHistoryEntry,
  ApiError,
} from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Referral link
// ---------------------------------------------------------------------------

interface UseReferralLinkReturn {
  referralLink: string | null;
  referralCode: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReferralLink(): UseReferralLinkReturn {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ referral_code: string; referral_link: string }>(
        "/api/referrals/link",
      );
      setReferralCode(data.referral_code);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : "Failed to load referral link");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get<{ referral_code: string; referral_link: string }>("/api/referrals/link")
      .then((data) => { if (!cancelled) setReferralCode(data.referral_code); })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load referral link");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/join?ref=${referralCode}`
    : null;

  return { referralLink, referralCode, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Referral stats
// ---------------------------------------------------------------------------

interface UseReferralStatsReturn {
  stats: ReferralStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReferralStats(): UseReferralStatsReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ReferralStats>("/api/referrals/stats");
      setStats(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : "Failed to load referral stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get<ReferralStats>("/api/referrals/stats")
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load referral stats");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { stats, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// Referral history
// ---------------------------------------------------------------------------

interface UseReferralHistoryReturn {
  history: ReferralHistoryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReferralHistory(): UseReferralHistoryReturn {
  const [history, setHistory] = useState<ReferralHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ referrals: ReferralHistoryEntry[] }>(
        "/api/referrals/history",
      );
      setHistory(data.referrals);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : "Failed to load referral history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get<{ referrals: ReferralHistoryEntry[] }>("/api/referrals/history")
      .then((data) => { if (!cancelled) setHistory(data.referrals); })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return;
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load referral history");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { history, loading, error, refresh };
}
