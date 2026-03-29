import { useState, useEffect, useCallback } from "react";
import type { Signal, ConnectionStatus } from "@/types/signal";

const API_URL = import.meta.env.VITE_API_URL || "";

export function useSignals(interval = 5000) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("no-data");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/signals`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Signal[] = await res.json();
      setSignals(data);
      setStatus(data.length > 0 ? "connected" : "no-data");
      setLastUpdated(new Date());
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, interval);
    return () => clearInterval(id);
  }, [fetchSignals, interval]);

  return { signals, status, lastUpdated, refetch: fetchSignals };
}
