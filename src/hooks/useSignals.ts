import { useState, useEffect, useCallback } from "react";
import type { Signal, ConnectionStatus } from "@/types/signal";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface PaginatedResponse {
  data: Signal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useSignals(interval = 5000, pageSize = 50) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("no-data");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchSignals = useCallback(async (p?: number) => {
    const currentPage = p ?? page;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/signals?page=${currentPage}&limit=${pageSize}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedResponse = await res.json();
      setSignals(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setStatus(json.data.length > 0 ? "connected" : "no-data");
      setLastUpdated(new Date());
    } catch {
      setStatus("error");
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(() => fetchSignals(), interval);
    return () => clearInterval(id);
  }, [fetchSignals, interval]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
  }, []);

  return { signals, status, lastUpdated, refetch: fetchSignals, page, totalPages, total, goToPage };
}
