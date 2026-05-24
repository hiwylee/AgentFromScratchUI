// Shared types aligned with AgentFromScratch P8-P10 backend output shapes.

export type RunState =
  | "running" | "completed" | "failed" | "cancelled"
  | "timed_out" | "stopped" | "paused" | "checkpoint_required"
  | "closed" | "blocked" | "pending" | "unknown";

// ── P9: SelfEvaluator ──────────────────────────────────────────────
export interface EvalCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface EvalResult {
  passed: boolean;
  score?: number;
  checks?: EvalCheck[];
  issues?: string[];
  suggestions?: string[];
}

// ── P10: Memory ────────────────────────────────────────────────────
export interface MemoryRecord {
  memory_id?: string;
  key?: string;
  value?: string;
  status?: "active" | "proposed";
  relevance?: number;
  tags?: string[];
  created_at?: string;
}

export interface MemorySummary {
  records?: MemoryRecord[];
  total_injected?: number;
  summary?: string;
}

// ── Intent (P1 + confidence/alternatives from IntentResult) ────────
export interface IntentAlternative {
  intent_type: string;
  confidence: number;
}

export interface IntentResult {
  intent_type?: string;
  task_type?: string;
  safety_level?: string;
  next_action?: string;
  requires_oracle_adw_context?: boolean;
  entities?: Record<string, string[]>;
  // P1 fields not yet shown in UI:
  confidence?: number;
  alternatives?: IntentAlternative[];
  needs_clarification?: boolean;
  clarification_prompt?: string | null;
  ambiguities?: string[];
}

// ── P8: Plan Execution ─────────────────────────────────────────────
export type PlanStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PlanStepVerification {
  passed: boolean;
  failure_reason?: string;
  suggested_action?: string;
  issues?: string[];
}

export interface PlanStep {
  step_id?: string;
  name?: string;
  action?: string;
  status?: PlanStepStatus;
  requires_approval?: boolean;
  latency_ms?: number;
  attempts?: number;
  tool_result?: Record<string, unknown>;
  verification?: PlanStepVerification;
  result?: unknown;
}

export interface PlanResult {
  mode: "shadow" | "execution";
  plan_id?: string;
  steps?: PlanStep[];
  status?: string;
  shadow_mode?: boolean;
}

// ── Agent Result (AgentLoop output) ───────────────────────────────
export interface AgentResult {
  run_id?: string;
  intent?: IntentResult;
  action?: {
    kind?: string;
    reason?: string;
    payload?: Record<string, unknown>;
  };
  final_answer?: {
    content?: string;
    next_action?: string;
    assumptions?: string[];
  };
  // P8
  plan_shadow?: PlanResult;
  plan_execution?: PlanResult;
  // P9
  eval_result?: EvalResult;
  // P10
  memory_summary?: string | MemorySummary;
  // Paths
  status_path?: string;
  events_path?: string;
  audit_path?: string;
  // Error
  error?: string;
  error_code?: string;
  raw?: string;
  [key: string]: unknown;
}

// ── Status / Run Monitor ───────────────────────────────────────────
export interface RunEvent {
  event: string;
  ts?: string;
  detail?: unknown;
}

export interface RunStep {
  step: string;
  status?: string;
  result?: unknown;
  latency_ms?: number;
}

export interface RunEntry {
  run_id?: string;
  status?: RunState;
  started_at?: string;
  completed_at?: string;
  intent?: string;
  action?: string;
  events?: RunEvent[];
  steps?: RunStep[];
  [key: string]: unknown;
}

export interface StatusData {
  runs?: RunEntry[];
  latest?: RunEntry;
  error?: string;
  raw?: string;
}

// ── Audit ──────────────────────────────────────────────────────────
export interface AuditEntry {
  _line: number;
  event?: string;
  run_id?: string;
  ts?: string;
  timestamp?: string;
  // P9 answer_evaluated fields
  eval_result?: EvalResult;
  // P10 session_summarized fields
  summary?: {
    session_id?: string;
    total_runs?: number;
    failed_runs?: number;
    success_rate?: number;
    failure_patterns?: string[];
    proposed_memory_paths?: string[];
  };
  [key: string]: unknown;
}

export interface AuditData {
  entries: AuditEntry[];
  total: number;
  eventTypes: string[];
  error?: string;
}

// ── Workflow ───────────────────────────────────────────────────────
export interface WorkflowStepDef {
  id: string;
  label: string;
  description: string;
}

export interface WorkflowResult {
  status?: string;
  steps?: Array<{ name: string; status: string; result?: unknown }>;
  current_step?: string;
  run_id?: string;
  error?: string;
  error_code?: string;
  requires_approval?: boolean;
  approval_context?: {
    step: string;
    prompt: string;
    data?: unknown;
  };
  raw?: string;
  [key: string]: unknown;
}

export interface StructuredError {
  code: string;
  message: string;
  step?: string;
  supported?: string[];
  isKnown: boolean;
}
