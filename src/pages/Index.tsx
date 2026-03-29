import { useSignals } from "@/hooks/useSignals";
import { StatusIndicator } from "@/components/StatusIndicator";
import { MetricCards } from "@/components/MetricCards";
import { SignalTable } from "@/components/SignalTable";
import { Radio } from "lucide-react";

const Index = () => {
  const { signals, status, lastUpdated } = useSignals(5000);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Radio className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Kafka Signal Monitor</h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              bridgewise.alerts.normalized
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusIndicator status={status} />
          {lastUpdated && (
            <span className="text-xs text-muted-foreground font-mono">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Metrics */}
      <section className="mb-6">
        <MetricCards signals={signals} />
      </section>

      {/* Table */}
      <section>
        <SignalTable signals={signals} />
      </section>
    </div>
  );
};

export default Index;
