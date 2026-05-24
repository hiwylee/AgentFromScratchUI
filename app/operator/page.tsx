"use client";

import { useState } from "react";
import { Settings2, Database, Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SectionResult = Record<string, unknown> | null;

function StatusBadge({ status }: { status: string }) {
  const ok = status === "ok" || status === "passed";
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full border"
      style={
        ok
          ? {
              color: "oklch(0.70 0.18 145)",
              borderColor: "oklch(0.70 0.18 145 / 0.4)",
              background: "oklch(0.60 0.18 145 / 0.12)",
            }
          : {
              color: "oklch(0.65 0.22 25)",
              borderColor: "oklch(0.65 0.22 25 / 0.4)",
              background: "oklch(0.55 0.22 25 / 0.12)",
            }
      }
    >
      {status}
    </span>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border p-3 text-sm font-mono"
      style={{
        borderColor: "oklch(0.65 0.22 25 / 0.4)",
        background: "oklch(0.55 0.22 25 / 0.08)",
        color: "oklch(0.65 0.22 25)",
      }}
    >
      {message}
    </div>
  );
}

function SmokeResult({ result }: { result: SectionResult }) {
  const [open, setOpen] = useState(false);
  if (!result) return null;
  const status = typeof result.status === "string" ? result.status : null;
  const latency = typeof result.latency_ms === "number" ? result.latency_ms : null;
  const message = typeof result.message === "string" ? result.message : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {status && <StatusBadge status={status} />}
        {latency !== null && (
          <span className="text-xs font-mono text-muted-foreground">{latency} ms</span>
        )}
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <button
        type="button"
        aria-label="Toggle raw JSON"
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide" : "Show"} raw JSON
      </button>
      {open && (
        <pre className="text-xs font-mono text-cyan-300/80 bg-black/20 px-3 py-2 rounded border border-border/20 overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function QueryResult({ result }: { result: SectionResult }) {
  if (!result) return null;
  const rows = Array.isArray(result.rows) ? (result.rows as unknown[]) : null;

  if (rows && rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null) {
    const cols = Object.keys(rows[0] as Record<string, unknown>);
    const display = rows.slice(0, 10) as Record<string, unknown>[];
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground font-mono">{rows.length} row{rows.length !== 1 ? "s" : ""}</div>
        <div className="overflow-x-auto">
          <table className="text-xs font-mono w-full border-collapse">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="text-left px-2 py-1 border-b border-border/40 text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {display.map((row, i) => (
                <tr key={i} className="border-b border-border/20">
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-1 text-foreground/80">
                      {String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <pre className="text-xs font-mono text-cyan-300/80 bg-black/20 px-3 py-2 rounded border border-border/20 overflow-x-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function OperatorPage() {
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [smokeResult, setSmokeResult] = useState<SectionResult>(null);
  const [smokeError, setSmokeError] = useState<string | null>(null);

  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<SectionResult>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [sql, setSql] = useState("");

  const [configLoading, setConfigLoading] = useState(false);
  const [configResult, setConfigResult] = useState<SectionResult>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  async function callOperator(body: Record<string, unknown>): Promise<SectionResult> {
    const res = await fetch("/api/agent/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as SectionResult;
  }

  async function handleSmoke() {
    setSmokeLoading(true);
    setSmokeResult(null);
    setSmokeError(null);
    try {
      const data = await callOperator({ action: "adw-smoke" });
      setSmokeResult(data);
    } catch (err) {
      setSmokeError(err instanceof Error ? err.message : String(err));
    } finally {
      setSmokeLoading(false);
    }
  }

  async function handleQuery() {
    const trimmed = sql.trim();
    if (!trimmed || queryLoading) return;
    setQueryLoading(true);
    setQueryResult(null);
    setQueryError(null);
    try {
      const data = await callOperator({ action: "adw-query", sql: trimmed });
      setQueryResult(data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : String(err));
    } finally {
      setQueryLoading(false);
    }
  }

  async function handleConfig() {
    setConfigLoading(true);
    setConfigResult(null);
    setConfigError(null);
    try {
      const data = await callOperator({ action: "config" });
      setConfigResult(data);
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfigLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.82_0.16_80)] to-[oklch(0.78_0.18_55)] flex items-center justify-center">
          <Settings2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold">Operator Tools</h1>
          <p className="text-sm text-muted-foreground">ADW connectivity · query · config</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">ADW Smoke Test</span>
          </div>
          <p className="text-sm text-muted-foreground">Run a lightweight connectivity check against Oracle ADW</p>
          <Button
            type="button"
            aria-label="Run smoke test"
            onClick={handleSmoke}
            disabled={smokeLoading}
            className="gap-2"
          >
            {smokeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Run Smoke Test
          </Button>
          {smokeError && <ErrorCard message={smokeError} />}
          {smokeResult && <SmokeResult result={smokeResult} />}
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">ADW Query</span>
          </div>
          <Textarea
            aria-label="SQL query input"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT 1 FROM DUAL"
            className="min-h-[100px] resize-none bg-input/40 border-border/40 font-mono text-sm placeholder:text-muted-foreground/40"
            disabled={queryLoading}
          />
          <Button
            type="button"
            aria-label="Execute SQL query"
            onClick={handleQuery}
            disabled={!sql.trim() || queryLoading}
            className="gap-2"
          >
            {queryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Execute Query
          </Button>
          {queryError && <ErrorCard message={queryError} />}
          {queryResult && <QueryResult result={queryResult} />}
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Config</span>
          </div>
          <Button
            type="button"
            aria-label="Load config"
            onClick={handleConfig}
            disabled={configLoading}
            className="gap-2"
          >
            {configLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Load Config
          </Button>
          {configError && <ErrorCard message={configError} />}
          {configResult && (
            <pre className="text-xs font-mono text-cyan-300/80 bg-black/20 px-3 py-2 rounded border border-border/20 overflow-x-auto">
              {JSON.stringify(configResult, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
