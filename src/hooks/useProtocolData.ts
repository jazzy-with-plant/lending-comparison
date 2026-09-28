import { useCallback, useEffect, useState } from "react";
import { fetchCollectedHistory, fetchHyperliquidReserves, fetchMidnightBooks } from "../lib/data";
import type { HyperliquidHistoryPoint, HyperliquidReserve, MidnightBook } from "../types";

interface ProtocolDataState {
  reserves: HyperliquidReserve[];
  history: HyperliquidHistoryPoint[];
  books: MidnightBook[];
  loading: boolean;
  errors: string[];
  refresh: () => Promise<void>;
}

export function useProtocolData(): ProtocolDataState {
  const [reserves, setReserves] = useState<HyperliquidReserve[]>([]);
  const [history, setHistory] = useState<HyperliquidHistoryPoint[]>([]);
  const [books, setBooks] = useState<MidnightBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetchHyperliquidReserves(), fetchCollectedHistory(), fetchMidnightBooks(),
    ]);
    const nextErrors: string[] = [];
    if (results[0].status === "fulfilled") setReserves(results[0].value);
    else nextErrors.push(results[0].reason instanceof Error ? results[0].reason.message : "Hyperliquid live data failed.");
    if (results[1].status === "fulfilled") setHistory(results[1].value);
    else nextErrors.push(results[1].reason instanceof Error ? results[1].reason.message : "History failed.");
    if (results[2].status === "fulfilled") setBooks(results[2].value);
    else nextErrors.push(results[2].reason instanceof Error ? results[2].reason.message : "Midnight live data failed.");
    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  return { reserves, history, books, loading, errors, refresh };
}
