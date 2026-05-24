"use client";

import { Settings2, Clock } from "lucide-react";

export default function OperatorPage() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4 text-muted-foreground">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.82_0.16_80)] to-[oklch(0.78_0.18_55)] flex items-center justify-center opacity-60">
        <Settings2 className="w-6 h-6 text-white" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Operator Tools</h2>
        <p className="text-xs text-muted-foreground">Sprint 3에서 구현 예정</p>
        <p className="text-xs text-muted-foreground/60 font-mono">adw-smoke · adw-query · propose-improvement · config</p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40 border border-border/20 px-3 py-1.5 rounded-full">
        <Clock className="w-3 h-3" />
        Coming in Sprint 3
      </div>
    </div>
  );
}
