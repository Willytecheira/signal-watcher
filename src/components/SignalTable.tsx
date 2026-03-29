import { useState, useMemo } from "react";
import type { Signal } from "@/types/signal";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SignalDetail } from "@/components/SignalDetail";
import { Search, Filter } from "lucide-react";

interface Props {
  signals: Signal[];
}

export function SignalTable({ signals }: Props) {
  const [search, setSearch] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [selected, setSelected] = useState<Signal | null>(null);

  const symbols = useMemo(
    () => [...new Set(signals.map((s) => s.symbol))].sort(),
    [signals]
  );

  const filtered = useMemo(() => {
    return signals
      .filter((s) => {
        if (filterSymbol !== "all" && s.symbol !== filterSymbol) return false;
        if (filterAction !== "all" && s.action?.toUpperCase() !== filterAction) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            s.symbol?.toLowerCase().includes(q) ||
            s.action?.toLowerCase().includes(q) ||
            s.source?.toLowerCase().includes(q) ||
            String(s.price).includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [signals, search, filterSymbol, filterAction]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search signals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border font-mono text-sm"
          />
        </div>
        <div className="flex gap-3">
          <Select value={filterSymbol} onValueChange={setFilterSymbol}>
            <SelectTrigger className="w-[140px] bg-secondary border-border text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              {symbols.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[120px] bg-secondary border-border text-sm">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/60">
                {["Timestamp", "Symbol", "Action", "Price", "Confidence", "Source"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    No signals found
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => {
                  const isBuy = s.action?.toUpperCase() === "BUY";
                  const isSell = s.action?.toUpperCase() === "SELL";
                  return (
                    <tr
                      key={`${s.timestamp}-${i}`}
                      onClick={() => setSelected(s)}
                      className="cursor-pointer hover:bg-secondary/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(s.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {s.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            "font-mono text-xs px-2.5 py-0.5 border-0",
                            isBuy && "bg-buy/15 text-buy",
                            isSell && "bg-sell/15 text-sell",
                            !isBuy && !isSell && "bg-muted text-muted-foreground"
                          )}
                        >
                          {s.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        {typeof s.price === "number" ? s.price.toFixed(4) : s.price}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(s.confidence, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{s.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.source}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <SignalDetail signal={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
