export interface Signal {
  id: string;
  timestamp: string;
  symbol: string;
  action: "BUY" | "SELL" | "NEUTRAL";
  confidence: number | null;
  source: string;
  eventName: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  payload: Record<string, unknown>;
}

export type ConnectionStatus = "connected" | "no-data" | "error";
