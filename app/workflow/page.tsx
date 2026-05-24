"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Play, Loader2, CheckCircle2, Circle, AlertCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseError } from "@/lib/errors";
import type { WorkflowResult } from "@/lib/types";

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
  "이번달 특허자산 대체 등록 진행해줘",
  "금월 특허 자산 대체 등록 워크플로우 실행",
  "특허자산 대체 등록 처리 시작해줘",
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-[oklch(0.70_0.18_145)]" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-[oklch(0.65_0.22_200)] animate-spin" />;
  if (status === "failed") return <AlertCircle className="w-4 h-4 text-[oklch(0.65_0.22_25)]" />;
  if (status === "skipped") return <Clock className="w-4 h-4 text-muted-foreground/40" />;
  return <Circle className="w-4 h-4 text-muted-foreground/60" />;
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
    const idx = WORKFLOW_STEPS.findIndex(
      (s) => s.id === result.current_step || s.label === result.current_step
    );
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

interface ApprovalContext {
  step: string;
  prompt: string;
  data?: unknown;
}

function HumanDecisionGate({
  runId,
  context,
  onDecision,
}: {
  runId: string;
  context: ApprovalContext;
  onDecision: (decision: "approve" | "reject" | "skip", reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | "skip" | null>(null);
  const [dataExpanded, setDataExpanded] = useState(false);

  async function submit(decision: "approve" | "reject" | "skip") {
    if (submitting) return;
    setSubmitting(decision);
    try {
      const res = await fetch("/api/agent/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId, decision, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(`Approval failed: ${err.error ?? res.statusText}`);
        return;
      }
      toast.success(`Decision submitted: ${decision}`);
      onDecision(decision, reason.trim() || undefined);
    } catch (err) {
      toast.error(`Failed to submit decision: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border bg-secondary/10 backdrop-blur-sm p-5 space-y-4"
      style={{ borderColor: "oklch(0.80 0.18 80 / 0.6)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold tracking-widest animate-pulse"
          style={{
            borderColor: "oklch(0.80 0.18 80 / 0.5)",
            color: "oklch(0.80 0.18 80)",
            backgroundColor: "oklch(0.70 0.18 80 / 0.1)",
          }}
        >
          CHECKPOINT
        </span>
        <span className="font-mono text-sm" style={{ color: "oklch(0.80 0.18 80)" }}>
          {context.step}
        </span>
      </div>

      <p className="text-base text-foreground leading-relaxed">{context.prompt}</p>

      {context.data != null && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setDataExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle approval data"
          >
            {dataExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Approval data
          </button>
          {dataExpanded && (
            <pre className="text-xs font-mono text-cyan-300/70 bg-black/20 px-3 py-2 rounded border border-border/20 overflow-x-auto">
              {JSON.stringify(context.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      <Textarea
        aria-label="Approval reason or comment"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Optional reason or comment…"
        className="min-h-[60px] resize-none bg-input/40 border-border/40 text-sm placeholder:text-muted-foreground/40"
        disabled={busy}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Approve workflow step"
          disabled={busy}
          onClick={() => submit("approve")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "oklch(0.70 0.18 145)" }}
        >
          {submitting === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>✓</span>}
          Approve
        </button>
        <button
          type="button"
          aria-label="Reject workflow step"
          disabled={busy}
          onClick={() => submit("reject")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "oklch(0.65 0.22 25)" }}
        >
          {submitting === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>✗</span>}
          Reject
        </button>
        <button
          type="button"
          aria-label="Skip workflow step"
          disabled={busy}
          onClick={() => submit("skip")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground border border-border/50 hover:border-border hover:text-foreground transition-colors disabled:opacity-50"
        >
          {submitting === "skip" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>→</span>}
          Skip
        </button>
      </div>
    </motion.div>
  );
}

function WorkflowErrorBlock({ result }: { result: WorkflowResult }) {
  const err = parseError(result);
  if (!err) return null;

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
      <div className="text-xs uppercase tracking-widest text-destructive/80 font-semibold">오류</div>
      {err.code === "unsupported_workflow" ? (
        <div className="space-y-1">
          <div className="text-sm text-destructive font-medium">지원하지 않는 워크플로우 요청입니다.</div>
          {err.supported && err.supported.length > 0 && (
            <div className="text-sm text-muted-foreground">
              지원 워크플로우:{" "}
              {err.supported.map((w) => (
                <span key={w} className="font-mono text-foreground">{w}</span>
              ))}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            요청 텍스트에{" "}
            <span className="text-yellow-400">특허</span> +{" "}
            <span className="text-yellow-400">대체</span> +{" "}
            <span className="text-yellow-400">등록</span>{" "}
            세 단어가 포함되어야 합니다.
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-sm font-mono text-destructive/90">
            [{err.code}] {err.message}
          </div>
          {err.step && (
            <div className="text-xs text-muted-foreground">Step: <span className="font-mono">{err.step}</span></div>
          )}
          {!err.isKnown && (
            <div className="text-xs text-muted-foreground/60 italic">알 수 없는 오류 유형</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkflowPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [approvalPending, setApprovalPending] = useState(false);

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
      if (data.approval_context) {
        setApprovalPending(true);
      }
      if (data.error) {
        const err = parseError(data);
        toast.error(err?.isKnown ? `[${err.code}] ${err.message}` : `Workflow error: ${data.error}`);
      } else if (!data.approval_context) {
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

  function handleDecision(_decision: "approve" | "reject" | "skip", _reason?: string) {
    setApprovalPending(false);
    setResult((prev) => (prev ? { ...prev, approval_context: undefined } : prev));
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
          <h1 className="text-base font-semibold">Workflow Runner</h1>
          <p className="text-sm text-muted-foreground">A/B 조회 → 보강 → 조정 → 검토 → 로드</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Input card */}
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Workflow Request</div>
          <Textarea
            aria-label="Workflow request input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the workflow to run… e.g. 이번달 특허자산 대체 등록 진행해줘"
            className="min-h-[80px] resize-none bg-input/40 border-border/40 font-mono text-sm placeholder:text-muted-foreground/40"
            disabled={loading}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              aria-label={loading ? "Agent processing" : "Run workflow"}
              onClick={handleRun}
              disabled={!query.trim() || loading}
              className="gap-2 bg-primary hover:bg-primary/80 glow-purple"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? "실행 중…" : "워크플로우 실행"}
            </Button>
            <div className="flex gap-1.5 flex-wrap">
              {STEP_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  aria-label={`Use example: ${ex}`}
                  onClick={() => setQuery(ex)}
                  disabled={loading}
                  className="text-sm px-2 py-1 rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                >
                  {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground border border-border/30 rounded-md px-3 py-2 bg-secondary/20">
            {"※ 현재 지원 워크플로우: 특허자산 대체 등록 (한국어, '특허'+'대체'+'등록' 포함 필요)"}
          </div>
        </div>

        {/* State machine diagram */}
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Pipeline State</div>

          {/* Pre-run placeholder */}
          {!hasResult && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground/60">
              <GitBranch className="w-6 h-6" />
              <p className="text-xs text-center">워크플로우를 실행하면<br/>실제 스텝이 여기에 표시됩니다</p>
            </div>
          )}

          {/* Dynamic steps from backend result.steps[] */}
          {hasResult && result?.steps && Array.isArray(result.steps) && result.steps.length > 0 && (
            <div className="flex flex-col gap-0">
              {result.steps.map((step, idx) => {
                const isLast = idx === (result.steps?.length ?? 0) - 1;
                const stepStatus = (step.status as StepStatus) ?? "completed";
                return (
                  <div key={step.name ?? idx} className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        stepStatus === "completed" ? "border-[oklch(0.70_0.18_145)] bg-[oklch(0.60_0.18_145/0.15)]"
                        : stepStatus === "running" ? "border-[oklch(0.65_0.22_200)] bg-[oklch(0.55_0.22_200/0.15)]"
                        : stepStatus === "failed" ? "border-[oklch(0.65_0.22_25)] bg-[oklch(0.55_0.22_25/0.15)]"
                        : "border-border/50 bg-secondary/30"
                      }`}>
                        <StepIcon status={stepStatus} />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 transition-all duration-700 ${
                          stepStatus === "completed" ? "bg-[oklch(0.70_0.18_145/0.5)]" : "bg-border/20"
                        }`} />
                      )}
                    </div>
                    <motion.div
                      className="flex-1 pb-4"
                      animate={{ opacity: stepStatus === "pending" ? 0.75 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-0.5 h-8">
                        <span className={`text-sm font-medium ${
                          stepStatus === "completed" ? "text-[oklch(0.70_0.18_145)]"
                          : stepStatus === "running" ? "text-[oklch(0.65_0.22_200)]"
                          : stepStatus === "failed" ? "text-[oklch(0.65_0.22_25)]"
                          : "text-foreground/80"
                        }`}>
                          {step.name}
                        </span>
                      </div>
                      {step.result != null && (
                        <pre className="mt-2 text-xs font-mono text-cyan-300/70 bg-black/20 px-2 py-1 rounded border border-border/20 overflow-x-auto">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback: hardcoded steps (when result exists but no steps[] returned) */}
          {hasResult && (!result?.steps || result.steps.length === 0) && (
            <div className="flex flex-col gap-0">
              {WORKFLOW_STEPS.map((step, idx) => {
                const state = stepStates[step.id] ?? { status: "pending" as StepStatus };
                const isLast = idx === WORKFLOW_STEPS.length - 1;
                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        state.status === "completed" ? "border-[oklch(0.70_0.18_145)] bg-[oklch(0.60_0.18_145/0.15)]"
                        : state.status === "running" ? "border-[oklch(0.65_0.22_200)] bg-[oklch(0.55_0.22_200/0.15)]"
                        : state.status === "failed" ? "border-[oklch(0.65_0.22_25)] bg-[oklch(0.55_0.22_25/0.15)]"
                        : "border-border/50 bg-secondary/30"
                      }`}>
                        <StepIcon status={state.status} />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 transition-all duration-700 ${
                          state.status === "completed" ? "bg-[oklch(0.70_0.18_145/0.5)]" : "bg-border/20"
                        }`} />
                      )}
                    </div>
                    <motion.div
                      className="flex-1 pb-4"
                      animate={{ opacity: state.status === "pending" ? 0.75 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-0.5 h-8">
                        <span className={`text-sm font-medium ${
                          state.status === "completed" ? "text-[oklch(0.70_0.18_145)]"
                          : state.status === "running" ? "text-[oklch(0.65_0.22_200)]"
                          : state.status === "failed" ? "text-[oklch(0.65_0.22_25)]"
                          : "text-foreground/80"
                        }`}>
                          {step.label}
                        </span>
                        {step.id === "human_review" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[oklch(0.80_0.18_80/0.4)] text-[oklch(0.80_0.18_80)] bg-[oklch(0.70_0.18_80/0.1)] font-mono">
                            checkpoint
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{step.description}</div>
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
          )}
        </div>

        {/* Human Decision Gate */}
        <AnimatePresence>
          {approvalPending && result?.approval_context && result?.run_id && (
            <HumanDecisionGate
              runId={result.run_id}
              context={result.approval_context as ApprovalContext}
              onDecision={handleDecision}
            />
          )}
        </AnimatePresence>

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
              {result?.error && <WorkflowErrorBlock result={result} />}
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
