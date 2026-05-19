"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Filter, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditEntry {
  _line: number;
  event?: string;
  run_id?: string;
  ts?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface AuditData {
  entries: AuditEntry[];
  total: number;
  eventTypes: string[];
  error?: string;
}

const EVENT_COLORS: Record<string, string> = {
  run_started: "text-[oklch(0.65_0.22_200)] bg-[oklch(0.65_0.22_200/0.1)] border-[oklch(0.65_0.22_200/0.3)]",
  run_completed: "text-[oklch(0.70_0.18_145)] bg-[oklch(0.60_0.18_145/0.1)] border-[oklch(0.60_0.18_145/0.3)]",
  run_failed: "text-[oklch(0.65_0.22_25)] bg-[oklch(0.55_0.22_25/0.1)] border-[oklch(0.55_0.22_25/0.3)]",
  action_executed: "text-[oklch(0.72_0.19_280)] bg-[oklch(0.72_0.19_280/0.1)] border-[oklch(0.72_0.19_280/0.3)]",
  schema_inspected: "text-[oklch(0.70_0.20_300)] bg-[oklch(0.70_0.20_300/0.1)] border-[oklch(0.70_0.20_300/0.3)]",
  parse_error: "text-[oklch(0.80_0.18_80)] bg-[oklch(0.70_0.18_80/0.1)] border-[oklch(0.70_0.18_80/0.3)]",
};

function getEventStyle(event?: string) {
  if (!event) return "text-muted-foreground bg-muted/20 border-border/30";
  return (
    EVENT_COLORS[event] ??
    "text-muted-foreground bg-secondary/30 border-border/30"
  );
}

function formatTs(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ts; }
}

function summarize(entry: AuditEntry): string {
  const skip = new Set(["event", "run_id", "ts", "timestamp", "_line"]);
  const parts = Object.entries(entry)
    .filter(([k, v]) => !skip.has(k) && v != null)
    .slice(0, 3)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  return parts.join(" · ") || "—";
}

export default function AuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchAudit = useCallback(async (event?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (event) params.set("event", event);
      params.set("limit", "500");
      const res = await fetch(`/api/agent/audit?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData({ entries: [], total: 0, eventTypes: [], error: "Failed to fetch audit log" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAudit(eventFilter || undefined); }, [fetchAudit, eventFilter]);

  const entries = (data?.entries ?? []).filter((e) => {
    if (!search) return true;
    return JSON.stringify(e).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.70_0.20_300)] to-[oklch(0.72_0.19_280)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Audit Log Viewer</h1>
            <p className="text-xs text-muted-foreground">
              {data?.total ?? "…"} total entries · showing {entries.length}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchAudit(eventFilter || undefined)} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border/30 flex items-center gap-3 bg-background/50">
        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="h-7 text-xs bg-input/40 border-border/40 font-mono"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setEventFilter("")}
              className={`text-xs px-2 py-0.5 rounded-full border font-mono transition-all ${!eventFilter ? "bg-primary/20 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:text-foreground"}`}
            >
              all
            </button>
            {(data?.eventTypes ?? []).map((et) => (
              <button
                key={et}
                onClick={() => setEventFilter(et === eventFilter ? "" : et)}
                className={`text-xs px-2 py-0.5 rounded-full border font-mono transition-all ${eventFilter === et ? "bg-primary/20 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:text-foreground"}`}
              >
                {et}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <ScrollArea className="flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <tr className="border-b border-border/40">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium w-40">Timestamp</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium w-36">Event</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium w-48">Run ID</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {data?.error && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-destructive text-sm">
                    {data.error}
                  </td>
                </tr>
              )}
              {entries.length === 0 && !loading && !data?.error && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No audit entries found. The log file may not exist yet.
                  </td>
                </tr>
              )}
              {entries.map((entry, idx) => (
                <motion.tr
                  key={entry._line}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                  onClick={() => setSelectedEntry(selectedEntry?._line === entry._line ? null : entry)}
                  className={`border-b border-border/20 cursor-pointer transition-colors ${
                    selectedEntry?._line === entry._line
                      ? "bg-primary/10"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {formatTs(entry.ts ?? entry.timestamp as string | undefined)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium ${getEventStyle(entry.event)}`}>
                      {entry.event ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground/70 truncate max-w-[180px]">
                    {entry.run_id ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-[300px]">
                    {summarize(entry)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        {/* Detail panel */}
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 border-l border-border/50 flex flex-col bg-background/50"
          >
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-semibold">Entry Detail</span>
              <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <ScrollArea className="flex-1">
              <pre className="px-4 py-3 text-xs font-mono text-cyan-300/80 leading-relaxed">
                {JSON.stringify(selectedEntry, null, 2)}
              </pre>
            </ScrollArea>
          </motion.div>
        )}
      </div>
    </div>
  );
}
