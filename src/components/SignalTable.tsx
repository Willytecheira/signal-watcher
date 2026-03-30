import { useState, useMemo } from "react";
import type { Signal } from "@/types/signal";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SignalDetail } from "@/components/SignalDetail";
import { Button } from "@/components/ui/button";
import { Search, Filter, Inbox, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  signals: Signal[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const actionColor: Record<string, string> = {
  BUY: "bg-buy/15 text-buy border border-buy/20",
  SELL: "bg-sell/15 text-sell border border-sell/20",
  NEUTRAL: "bg-muted text-muted-foreground border border-border",
};

export function SignalTable({ signals, page, totalPages, total, onPageChange }: Props) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [selected, setSelected] = useState<Signal | null>(null);

  const filtered = useMemo(() => {
    return signals
      .filter((s) => {
        if (filterAction !== "all" && s.action !== filterAction) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            s.symbol?.toLowerCase().includes(q) ||
            s.eventName?.toLowerCase().includes(q) ||
            s.title?.toLowerCase().includes(q) ||
            s.source?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [signals, search, filterAction]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, event, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60 backdrop-blur-sm border-border/60 font-mono text-sm focus:border-primary/40 focus:ring-primary/20 transition-all"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px] bg-card/60 backdrop-blur-sm border-border/60 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="BUY">BUY</SelectItem>
            <SelectItem value="SELL">SELL</SelectItem>
            <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden glass">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/50">
                {["Timestamp", "Symbol", "Action", "Confidence", "Source", "Event", "Title"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-secondary p-4">
                        <Inbox className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">No signals found</p>
                      <p className="text-muted-foreground/60 text-xs">Waiting for Kafka messages…</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr
                    key={s.id || `${s.timestamp}-${i}`}
                    onClick={() => setSelected(s)}
                    className="cursor-pointer hover:bg-primary/[0.03] transition-all duration-200 group animate-shimmer"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                      {s.symbol}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={cn("font-mono text-[10px] font-semibold px-2.5 py-0.5", actionColor[s.action] || actionColor.NEUTRAL)}>
                        {s.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {s.confidence != null ? s.confidence : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.source}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[180px]">
                      {s.eventName || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[220px]">
                      {s.title || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-muted-foreground font-mono">
            {total.toLocaleString()} señales · Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs font-mono"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selected && <SignalDetail signal={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
