import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const AGENT_BIN = process.env.AGENT_BIN_PATH ?? "/Users/wylee/WorkspacesV2/AgentFromScratch/bin/agent";
const PROJECT_DIR = process.env.AGENT_PROJECT_DIR ?? path.dirname(path.dirname(path.resolve(AGENT_BIN)));
const WORKFLOW_RUN_DIR = process.env.AGENT_WORKFLOW_RUN_DIR ?? "/tmp/afs-wf";
const WORKFLOW_AUDIT_LOG = process.env.AGENT_WORKFLOW_AUDIT_LOG ?? "/tmp/afs-wf.jsonl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { run_id, decision, reason } = body as {
      run_id?: string;
      decision?: string;
      reason?: string;
    };

    if (!run_id || typeof run_id !== "string") {
      return NextResponse.json({ error: "Missing run_id" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(run_id)) {
      return NextResponse.json({ error: "Invalid run_id format" }, { status: 400 });
    }
    if (!decision || !["approve", "reject", "skip"].includes(decision)) {
      return NextResponse.json(
        { error: "decision must be one of: approve, reject, skip" },
        { status: 400 }
      );
    }

    const args = [
      "workflow",
      "approve",
      "--run-id",
      run_id,
      "--decision",
      decision,
      "--run-dir",
      WORKFLOW_RUN_DIR,
      "--audit-log",
      WORKFLOW_AUDIT_LOG,
      ...(reason ? ["--reason", reason] : []),
    ];

    const result = await runAgent(args);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function runAgent(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const agentPath = path.resolve(AGENT_BIN);
    const proc = spawn(agentPath, args, {
      cwd: PROJECT_DIR,
      env: { ...process.env, UV_CACHE_DIR: path.join(PROJECT_DIR, ".uv-cache") },
      timeout: 120000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Agent exited ${code}: ${stderr || stdout}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ raw: stdout, stderr });
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn agent: ${err.message}`));
    });
  });
}
