import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "https://consumer.clickwa.tech";

interface LogEntry {
  id: number;
  webhook_id: string;
  webhook_name: string;
  signal_id: string;
  signal_symbol: string;
  status: string;
  http_status: number | null;
  error_message: string | null;
  response_body: string | null;
  created_at: string;
}

export const WebhookLogs = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/webhooks/logs?page=${page}&limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotalPages(data.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <ScrollText className="h-4 w-4 text-primary" />
          Logs de envío
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6 font-mono">No hay logs aún</p>
      ) : (
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-border/30 px-3 py-2 flex items-center gap-3 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{log.webhook_name || log.webhook_id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary font-mono">{log.signal_symbol}</span>
                  {log.http_status && (
                    <span className={`px-1.5 py-0.5 rounded font-mono ${log.status === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {log.http_status}
                    </span>
                  )}
                </div>
                {log.error_message && (
                  <p className="text-red-400/80 font-mono truncate mt-0.5">{log.error_message}</p>
                )}
              </div>
              <span className="text-muted-foreground font-mono text-[10px] flex-shrink-0">
                {new Date(log.created_at + "Z").toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground font-mono">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
