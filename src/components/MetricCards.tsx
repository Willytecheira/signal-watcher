import type { Signal } from "@/types/signal";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Props {
  signals: Signal[];
}

export function MetricCards({ signals }: Props) {
  const total = signals.length;
  const buys = signals.filter((s) => s.action?.toUpperCase() === "BUY").length;
  const sells = signals.filter((s) => s.action?.toUpperCase() === "SELL").length;
  const latest = signals[0];

  const metrics = [
    {
      label: "Total Signals",
      value: total,
      icon: Activity,
      accent: "text-primary",
    },
    {
      label: "BUY Signals",
      value: buys,
      icon: TrendingUp,
      accent: "text-buy",
    },
    {
      label: "SELL Signals",
      value: sells,
      icon: TrendingDown,
      accent: "text-sell",
    },
    {
      label: "Latest Signal",
      value: latest
        ? `${latest.symbol} · ${latest.action}`
        : "—",
      icon: Clock,
      accent: "text-primary",
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label} className="glass glow-primary">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-secondary p-2.5">
              <m.icon className={`h-5 w-5 ${m.accent}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className={`font-mono font-semibold ${m.small ? "text-sm" : "text-2xl"} text-foreground mt-0.5`}>
                {m.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
