"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw, Clock, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

interface RunEntry {
  run_id?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  intent?: string;
  action?: string;
  events?: Array<{ event: string; ts: string; detail?: unknown }>;
  steps?: Array<{ step: string; result?: unknown }>;
  [key: string]: unknown;
}

interface StatusData {
  runs?: RunEntry[];
  latest?: RunEntry;
  error?: string;
  raw?: string;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/status");
      const json = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch {
      setData({ error: "Failed to fetch status" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const runs: RunEntry[] = data?.runs ?? (data?.latest ? [data.latest] : []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.65_0.22_200)] to-[oklch(0.60_0.18_160)] flex items-center justify-center glow-cyan">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">Run Status Monitor</h1>
            <p className="text-xs text-muted-foreground">
              {lastFetched ? `Updated ${timeAgo(lastFetched.toISOString())}` : "Fetching…"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh((a) => !a)}
            className={`text-xs gap-1.5 ${autoRefresh ? "text-[oklch(0.70_0.18_145)]" : "text-muted-foreground"}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-[oklch(0.70_0.18_145)] animate-pulse" : "bg-muted-foreground"}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {data?.error && (
          <div className="glass rounded-lg p-4 border-destructive/30 text-sm text-destructive">
            {data.error}
          </div>
        )}

        {runs.length === 0 && !loading && !data?.error && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <Cpu className="w-8 h-8 opacity-30" />
            <p className="text-sm">No runs found. Run <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">agent ask</code> to create one.</p>
          </div>
        )}

        {runs.map((run, idx) => (
          <motion.div
            key={run.run_id ?? idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={run.status ?? "unknown"} />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {run.run_id ?? "—"}
                  </span>
                </div>
                {run.intent && (
                  <p className="text-sm text-foreground">{run.intent}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right text-xs text-muted-foreground space-y-0.5">
                {run.started_at && (
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {timeAgo(run.started_at)}
                  </div>
                )}
              </div>
            </div>

            {run.action && (
              <div className="px-3 py-2 rounded-md bg-black/30 border border-border/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Action · </span>
                <span className="text-xs font-mono text-[oklch(0.75_0.18_200)]">{run.action}</span>
              </div>
            )}

            {/* Events timeline */}
            {run.events && run.events.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Events</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {run.events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                      <span className="font-mono text-[oklch(0.72_0.19_280)]">{ev.event}</span>
                      <span className="text-muted-foreground/50 ml-auto">{timeAgo(ev.ts)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            {run.steps && run.steps.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Steps</div>
                <div className="flex flex-wrap gap-1.5">
                  {run.steps.map((step, i) => (
                    <span key={i} className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                      {step.step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
