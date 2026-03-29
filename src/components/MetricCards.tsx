import type { Signal } from "@/types/signal";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, MinusCircle, Clock } from "lucide-react";

interface Props {
  signals: Signal[];
}

export function MetricCards({ signals }: Props) {
  const total = signals.length;
  const buys = signals.filter((s) => s.action === "BUY").length;
  const sells = signals.filter((s) => s.action === "SELL").length;
  const neutrals = signals.filter((s) => s.action === "NEUTRAL").length;
  const latest = signals[0];

  const metrics = [
    {
      label: "Total Signals",
      value: total,
      icon: Activity,
      accent: "text-primary",
      glowClass: "glow-primary",
      bgAccent: "bg-primary/10",
    },
    {
      label: "BUY",
      value: buys,
      icon: TrendingUp,
      accent: "text-buy",
      glowClass: "glow-success",
      bgAccent: "bg-buy/10",
    },
    {
      label: "SELL",
      value: sells,
      icon: TrendingDown,
      accent: "text-sell",
      glowClass: "glow-destructive",
      bgAccent: "bg-sell/10",
    },
    {
      label: "NEUTRAL",
      value: neutrals,
      icon: MinusCircle,
      accent: "text-muted-foreground",
      glowClass: "",
      bgAccent: "bg-secondary",
    },
    {
      label: "Latest",
      value: latest ? `${latest.symbol} · ${latest.action}` : "—",
      icon: Clock,
      accent: "text-primary",
      glowClass: "glow-primary",
      bgAccent: "bg-primary/10",
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m, i) => (
        <Card
          key={m.label}
          className={`glass glass-hover ${m.glowClass}`}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded-xl ${m.bgAccent} p-2.5 transition-transform group-hover:scale-110`}>
              <m.icon className={`h-5 w-5 ${m.accent}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{m.label}</p>
              <p className={`font-mono font-bold ${m.small ? "text-sm" : "text-2xl"} text-foreground mt-0.5 truncate`}>
                {m.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
