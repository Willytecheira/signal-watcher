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

const actionColor: Record<string, string> = {
  BUY: "bg-buy/15 text-buy",
  SELL: "bg-sell/15 text-sell",
  NEUTRAL: "bg-muted text-muted-foreground",
};

export function SignalTable({ signals }: Props) {
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
            className="pl-9 bg-secondary border-border font-mono text-sm"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[140px] bg-secondary border-border text-sm">
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
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/60">
                {["Timestamp", "Symbol", "Action", "Confidence", "Source", "Event", "Title"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No signals found
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr
                    key={s.id || `${s.timestamp}-${i}`}
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
                      <Badge className={cn("font-mono text-xs px-2.5 py-0.5 border-0", actionColor[s.action] || actionColor.NEUTRAL)}>
                        {s.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {s.confidence != null ? s.confidence : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.source}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[180px]">
                      {s.eventName || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[220px]">
                      {s.title || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <SignalDetail signal={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
