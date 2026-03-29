import type { ConnectionStatus } from "@/types/signal";
import { cn } from "@/lib/utils";

const config: Record<ConnectionStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: { label: "Kafka Connected", dotClass: "bg-success", textClass: "text-success" },
  "no-data": { label: "Waiting for data…", dotClass: "bg-warning", textClass: "text-warning" },
  error: { label: "Connection Error", dotClass: "bg-destructive", textClass: "text-destructive" },
};

export function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const c = config[status];
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse", c.dotClass)} />
      <span className={cn("text-sm font-medium font-mono", c.textClass)}>{c.label}</span>
    </div>
  );
}
