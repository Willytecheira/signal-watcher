import type { Signal } from "@/types/signal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  signal: Signal;
  onClose: () => void;
}

export function SignalDetail({ signal, onClose }: Props) {
  const isBuy = signal.action?.toUpperCase() === "BUY";
  const isSell = signal.action?.toUpperCase() === "SELL";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-foreground">
            <span className="font-mono text-lg">{signal.symbol}</span>
            <Badge
              className={cn(
                "font-mono border-0",
                isBuy && "bg-buy/15 text-buy",
                isSell && "bg-sell/15 text-sell"
              )}
            >
              {signal.action}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {[
            ["Timestamp", new Date(signal.timestamp).toLocaleString()],
            ["Price", typeof signal.price === "number" ? signal.price.toFixed(6) : signal.price],
            ["Confidence", `${signal.confidence}%`],
            ["Source", signal.source],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
              <span className="font-mono text-sm text-foreground">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Raw Payload</p>
          <pre className="bg-secondary rounded-lg p-4 text-xs font-mono text-foreground overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(signal.payload, null, 2)}
          </pre>
        </div>
      </SheetContent>
    </Sheet>
  );
}
