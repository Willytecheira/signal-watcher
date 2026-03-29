import { useSignals } from "@/hooks/useSignals";
import { StatusIndicator } from "@/components/StatusIndicator";
import { MetricCards } from "@/components/MetricCards";
import { SignalTable } from "@/components/SignalTable";
import { Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { signals, status, lastUpdated, refetch } = useSignals(5000);

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-accent/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 rounded-xl border border-border/50 p-5" style={{ background: 'var(--gradient-header)' }}>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-3 animate-pulse-glow">
              <Radio className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Signal Monitor
              </h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50" />
                bridgewise.alerts.normalized
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusIndicator status={status} />
            {lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Metrics */}
        <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <MetricCards signals={signals} />
        </section>

        {/* Table */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <SignalTable signals={signals} />
        </section>

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            © {new Date().getFullYear()} Bridgewise Signal Monitor. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
