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

function ResultCard({ result }: { result: Record<string, unknown> }) {
  const intent = result.intent != null ? String(result.intent) : null;
  const action = result.action != null ? String(result.action) : null;
  const finalAnswer = result.final_answer != null ? String(result.final_answer) : null;
  const status = result.status != null ? String(result.status) : null;
  const runId = result.run_id != null ? String(result.run_id) : null;

  return (
    <div className="space-y-3 mt-2">
      {intent && (
        <div className="glass rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Intent</div>
          <div className="text-sm text-foreground">{intent}</div>
        </div>
      )}
      {action && (
        <div className="glass rounded-md px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Action</div>
          <div className="text-sm font-mono text-[oklch(0.75_0.18_200)]">{action}</div>
        </div>
      )}
      {finalAnswer && (
        <div className="rounded-md px-3 py-2 bg-[oklch(0.72_0.19_280/0.1)] border border-[oklch(0.72_0.19_280/0.25)]">
          <div className="text-[10px] uppercase tracking-widest text-[oklch(0.72_0.19_280)] mb-1">Final Answer</div>
          <div className="text-sm text-foreground leading-relaxed">{finalAnswer}</div>
        </div>
      )}
      {status && (
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {runId && (
            <span className="text-xs font-mono text-muted-foreground">{runId}</span>
          )}
        </div>
      )}
      <JsonBlock data={result} />
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

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.final_answer ?? data.raw ?? "Agent returned a response.",
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
          <h1 className="text-sm font-semibold text-foreground">Agent Chat</h1>
          <p className="text-xs text-muted-foreground">Natural language interface to AgentFromScratch</p>
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
                <p className="text-sm text-muted-foreground max-w-xs">
                  Ask questions in natural language. The agent will interpret your intent, select actions, and return structured results.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg glass border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all duration-150"
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
                  className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/15 border border-primary/25 text-foreground"
                      : msg.error
                      ? "bg-destructive/10 border border-destructive/30 text-destructive"
                      : "glass text-foreground"
                  }`}
                >
                  {msg.content}
                  {msg.result && <ResultCard result={msg.result} />}
                </div>
                <span className="text-[10px] text-muted-foreground/50 mt-1 px-1 font-mono">
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
                <span className="text-sm text-muted-foreground font-mono">Agent processing</span>
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
