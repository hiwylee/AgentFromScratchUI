"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: Record<string, unknown>;
  error?: string;
  ts: number;
}

function JsonBlock({ data }: { data: unknown }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mt-3 rounded-md border border-border/50 overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Raw JSON
      </button>
      {!collapsed && (
        <pre className="px-3 py-2 text-xs font-mono text-cyan-300/80 bg-black/30 overflow-x-auto leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v || null;
  if (typeof v === "object") return null;
  return String(v);
}

function ResultCard({ result }: { result: Record<string, unknown> }) {
  const intent = asObj(result.intent);
  const action = asObj(result.action);
  const finalAnswer = asObj(result.final_answer);
  const runId = asStr(result.run_id);

  return (
    <div className="space-y-3 mt-2">
      {intent && (
        <div className="glass rounded-md px-3 py-2 space-y-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Intent</div>
          <div className="flex flex-wrap gap-2">
            {asStr(intent.intent_type) && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary/60 text-cyan-300">
                {asStr(intent.intent_type)}
              </span>
            )}
            {asStr(intent.task_type) && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                {asStr(intent.task_type)}
              </span>
            )}
            {asStr(intent.safety_level) && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary/60 text-yellow-400/80">
                {asStr(intent.safety_level)}
              </span>
            )}
          </div>
          {asStr(intent.next_action) && (
            <div className="text-xs text-muted-foreground">
              Next: <span className="text-foreground">{asStr(intent.next_action)}</span>
            </div>
          )}
        </div>
      )}

      {action && (
        <div className="glass rounded-md px-3 py-2 space-y-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Action</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[oklch(0.65_0.22_200/0.15)] border border-[oklch(0.65_0.22_200/0.3)] text-[oklch(0.75_0.18_200)]">
              {asStr(action.kind) ?? "—"}
            </span>
          </div>
          {asStr(action.reason) && (
            <div className="text-sm text-muted-foreground leading-relaxed">{asStr(action.reason)}</div>
          )}
        </div>
      )}

      {finalAnswer && (
        <div className="rounded-md px-3 py-2 bg-[oklch(0.72_0.19_280/0.1)] border border-[oklch(0.72_0.19_280/0.25)] space-y-1.5">
          <div className="text-xs uppercase tracking-widest text-[oklch(0.72_0.19_280)]">Final Answer</div>
          {asStr(finalAnswer.content) && (
            <div className="text-base text-foreground leading-relaxed">{asStr(finalAnswer.content)}</div>
          )}
          {asStr(finalAnswer.next_action) && asStr(finalAnswer.next_action) !== "none" && (
            <div className="text-xs text-muted-foreground">
              Next: <span className="text-foreground/70">{asStr(finalAnswer.next_action)}</span>
            </div>
          )}
          {Array.isArray(finalAnswer.assumptions) && finalAnswer.assumptions.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
              {(finalAnswer.assumptions as unknown[]).map((a, i) => (
                <li key={i}>{String(a)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {runId && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground/60">run: {runId}</span>
        </div>
      )}

      <JsonBlock data={result} />
    </div>
  );
}

function ErrorCard({ error }: { error: string }) {
  const isLong = error.length > 120;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-destructive/20">
        <span className="text-xs uppercase tracking-widest text-destructive/80 font-semibold">Error</span>
      </div>
      <pre className={`px-3 py-2 text-xs font-mono text-destructive/90 whitespace-pre-wrap break-all leading-relaxed ${!expanded && isLong ? "max-h-24 overflow-hidden" : ""}`}>
        {error}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 border-t border-destructive/20 transition-colors"
        >
          {expanded ? "Show less" : "Show full error"}
        </button>
      )}
    </div>
  );
}

const SUGGESTED = [
  "What tables are available in the Oracle ADW schema?",
  "Show me the top 10 customers by revenue",
  "Run a workflow for Q1 sales reconciliation",
  "Check the status of the latest agent run",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(query?: string) {
    const text = (query ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ts: Date.now(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();

      const finalAnswerContent =
        typeof data.final_answer?.content === "string"
          ? data.final_answer.content
          : data.raw ?? "";
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: finalAnswerContent,
        result: res.ok ? data : undefined,
        error: !res.ok ? (data.error ?? "Unknown error") : undefined,
        ts: Date.now(),
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err) {
      toast.error("Failed to reach agent API");
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Failed to connect to the agent backend.",
        error: err instanceof Error ? err.message : String(err),
        ts: Date.now(),
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.72_0.19_280)] to-[oklch(0.65_0.22_200)] flex items-center justify-center glow-purple">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">Agent Chat</h1>
          <p className="text-sm text-muted-foreground">Natural language interface to AgentFromScratch</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.19_280)] to-[oklch(0.65_0.22_200)] flex items-center justify-center glow-purple">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold gradient-text mb-2">AgentFromScratch Console</h2>
                <p className="text-base text-muted-foreground max-w-xs">
                  Ask questions in natural language. The agent will interpret your intent, select actions, and return structured results.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="text-left text-sm px-3 py-3 rounded-lg glass border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[oklch(0.72_0.19_280)] to-[oklch(0.65_0.22_200)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-xl px-4 py-3 text-base leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/15 border border-primary/25 text-foreground"
                      : "glass text-foreground"
                  }`}
                >
                  {msg.content}
                  {msg.error && <ErrorCard error={msg.error} />}
                  {msg.result && !msg.error && <ResultCard result={msg.result} />}
                </div>
                <span className="text-xs text-muted-foreground/50 mt-1 px-1 font-mono">
                  {new Date(msg.ts).toLocaleTimeString()}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[oklch(0.72_0.19_280)] to-[oklch(0.65_0.22_200)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-base text-muted-foreground font-mono">Agent processing</span>
                <span className="cursor-blink text-primary">_</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent anything… (Enter to send, Shift+Enter for newline)"
            className="min-h-[48px] max-h-[160px] resize-none bg-input/50 border-border/60 focus:border-primary/50 font-mono text-sm placeholder:text-muted-foreground/40"
            rows={1}
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-12 w-12 flex-shrink-0 bg-primary hover:bg-primary/80 glow-purple transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
