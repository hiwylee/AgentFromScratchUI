"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Play, Loader2, CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface WorkflowResult {
  status?: string;
  steps?: Array<{ name: string; status: string; result?: unknown }>;
  current_step?: string;
  run_id?: string;
  error?: string;
  raw?: string;
  [key: string]: unknown;
}

const WORKFLOW_STEPS = [
  { id: "ab_lookup", label: "A/B Lookup", description: "Source data extraction" },
  { id: "c_enrichment", label: "C Enrichment", description: "Data enrichment & joining" },
  { id: "reconciliation", label: "Reconciliation", description: "Cross-validation & diff" },
  { id: "human_review", label: "Human Review", description: "Checkpoint gate" },
  { id: "d_loading", label: "D Loading", description: "Target load & commit" },
];

type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface StepState {
  status: StepStatus;
  result?: unknown;
}

const STEP_EXAMPLES = [
  "Reconcile Q1 FY26 sales data between NAOS and ADW",
  "Load customer master data from source A to Oracle ADW",
  "Run monthly billing reconciliation workflow",
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-[oklch(0.70_0.18_145)]" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-[oklch(0.65_0.22_200)] animate-spin" />;
  if (status === "failed") return <AlertCircle className="w-4 h-4 text-[oklch(0.65_0.22_25)]" />;
  if (status === "skipped") return <Clock className="w-4 h-4 text-muted-foreground/40" />;
  return <Circle className="w-4 h-4 text-muted-foreground/30" />;
}

function mapResultToSteps(result: WorkflowResult): Record<string, StepState> {
  const states: Record<string, StepState> = {};
  for (const s of WORKFLOW_STEPS) {
    states[s.id] = { status: "pending" };
  }

  if (result.steps && Array.isArray(result.steps)) {
    for (const step of result.steps) {
      const matched = WORKFLOW_STEPS.find(
        (s) => s.id === step.name || s.label.toLowerCase() === step.name?.toLowerCase()
      );
      if (matched) {
        states[matched.id] = {
          status: (step.status as StepStatus) ?? "completed",
          result: step.result,
        };
      }
    }
  } else if (result.current_step) {
    const idx = WORKFLOW_STEPS.findIndex((s) => s.id === result.current_step || s.label === result.current_step);
    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      if (i < idx) states[WORKFLOW_STEPS[i].id] = { status: "completed" };
      else if (i === idx) states[WORKFLOW_STEPS[i].id] = { status: "running" };
    }
  }

  if (result.status === "completed") {
    for (const s of WORKFLOW_STEPS) {
      if (states[s.id].status === "pending") states[s.id] = { status: "completed" };
    }
  }

  return states;
}

export default function WorkflowPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});

  async function handleRun() {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    const initial: Record<string, StepState> = {};
    for (const s of WORKFLOW_STEPS) initial[s.id] = { status: "pending" };
    setStepStates(initial);

    try {
      const res = await fetch("/api/agent/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data: WorkflowResult = await res.json();
      setResult(data);
      setStepStates(mapResultToSteps(data));
      if (data.error) {
        toast.error(`Workflow error: ${data.error}`);
      } else {
        toast.success("Workflow completed");
      }
    } catch (err) {
      toast.error("Failed to reach workflow API");
      const errResult: WorkflowResult = { error: err instanceof Error ? err.message : String(err) };
      setResult(errResult);
    } finally {
      setLoading(false);
    }
  }

  const hasResult = result !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.70_0.20_300)] to-[oklch(0.65_0.22_200)] flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">Workflow Runner</h1>
          <p className="text-xs text-muted-foreground">State machine: A/B Lookup → Enrichment → Reconciliation → Review → Load</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Input card */}
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Workflow Request</div>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the workflow to run… e.g. Reconcile Q1 sales between source A and Oracle ADW"
            className="min-h-[80px] resize-none bg-input/40 border-border/40 font-mono text-sm placeholder:text-muted-foreground/40"
            disabled={loading}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleRun}
              disabled={!query.trim() || loading}
              className="gap-2 bg-primary hover:bg-primary/80 glow-purple"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "Running…" : "Run Workflow"}
            </Button>
            <div className="flex gap-1.5 flex-wrap">
              {STEP_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  disabled={loading}
                  className="text-xs px-2 py-1 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                >
                  {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* State machine diagram */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Pipeline State</div>
          <div className="flex flex-col gap-0">
            {WORKFLOW_STEPS.map((step, idx) => {
              const state = stepStates[step.id] ?? { status: "pending" as StepStatus };
              const isLast = idx === WORKFLOW_STEPS.length - 1;

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Connector line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      state.status === "completed"
                        ? "border-[oklch(0.70_0.18_145)] bg-[oklch(0.60_0.18_145/0.15)]"
                        : state.status === "running"
                        ? "border-[oklch(0.65_0.22_200)] bg-[oklch(0.55_0.22_200/0.15)]"
                        : state.status === "failed"
                        ? "border-[oklch(0.65_0.22_25)] bg-[oklch(0.55_0.22_25/0.15)]"
                        : "border-border/30 bg-secondary/20"
                    }`}>
                      <StepIcon status={state.status} />
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-8 transition-all duration-700 ${
                        state.status === "completed" ? "bg-[oklch(0.70_0.18_145/0.5)]" : "bg-border/20"
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <motion.div
                    className="flex-1 pb-4"
                    animate={{ opacity: state.status === "pending" ? 0.5 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-0.5 h-8">
                      <span className={`text-sm font-medium ${
                        state.status === "completed" ? "text-[oklch(0.70_0.18_145)]"
                        : state.status === "running" ? "text-[oklch(0.65_0.22_200)]"
                        : state.status === "failed" ? "text-[oklch(0.65_0.22_25)]"
                        : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                      {step.id === "human_review" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[oklch(0.80_0.18_80/0.4)] text-[oklch(0.80_0.18_80)] bg-[oklch(0.70_0.18_80/0.1)] font-mono">
                          checkpoint
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/60">{step.description}</div>
                    {state.result != null && (
                      <pre className="mt-2 text-xs font-mono text-cyan-300/70 bg-black/20 px-2 py-1 rounded border border-border/20 overflow-x-auto">
                        {JSON.stringify(state.result, null, 2)}
                      </pre>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {hasResult && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-xl p-4 space-y-2"
            >
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Raw Result</div>
              {result?.error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/30">
                  {result.error}
                </div>
              )}
              <pre className="text-xs font-mono text-cyan-300/80 leading-relaxed overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
              {result?.run_id && (
                <div className="text-xs font-mono text-muted-foreground">Run ID: {result.run_id}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
