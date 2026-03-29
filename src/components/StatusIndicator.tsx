import type { ConnectionStatus } from "@/types/signal";
import { cn } from "@/lib/utils";

const config: Record<ConnectionStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  connected: {
    label: "Kafka Connected",
    dotClass: "bg-success shadow-[0_0_6px_hsl(142_70%_45%/0.5)]",
    bgClass: "bg-success/10 border-success/20",
    textClass: "text-success",
  },
  "no-data": {
    label: "Waiting for data…",
    dotClass: "bg-warning shadow-[0_0_6px_hsl(38_92%_55%/0.5)]",
    bgClass: "bg-warning/10 border-warning/20",
    textClass: "text-warning",
  },
  error: {
    label: "Connection Error",
    dotClass: "bg-destructive shadow-[0_0_6px_hsl(0_72%_55%/0.5)]",
    bgClass: "bg-destructive/10 border-destructive/20",
    textClass: "text-destructive",
  },
};

export function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const c = config[status];
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs", c.bgClass)}>
      <span className={cn("h-2 w-2 rounded-full animate-pulse", c.dotClass)} />
      <span className={cn("font-medium font-mono", c.textClass)}>{c.label}</span>
    </div>
  );
}
