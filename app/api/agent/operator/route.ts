import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const AGENT_BIN = process.env.AGENT_BIN_PATH ?? "/Users/wylee/WorkspacesV2/AgentFromScratch/bin/agent";
const AUDIT_LOG = process.env.AGENT_AUDIT_LOG ?? "/tmp/afs.jsonl";
const PROJECT_DIR = process.env.AGENT_PROJECT_DIR ?? path.dirname(path.dirname(path.resolve(AGENT_BIN)));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sql } = body as { action: string; sql?: string };

    if (!["adw-smoke", "adw-query", "config"].includes(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (action === "adw-query") {
      if (!sql || typeof sql !== "string") {
        return NextResponse.json({ error: "Missing sql" }, { status: 400 });
      }
      if (!/^\s*SELECT\b/i.test(sql)) {
        return NextResponse.json({ error: "Only SELECT queries are allowed" }, { status: 400 });
      }
      const result = await runAgent(
        ["operator", "adw-query", "--sql", sql, "--confirm-live-adw-query", "true", "--audit-log", AUDIT_LOG],
        60000
      );
      return NextResponse.json(result);
    }

    if (action === "adw-smoke") {
      const result = await runAgent(
        ["operator", "adw-smoke", "--confirm-live-adw-smoke", "true", "--audit-log", AUDIT_LOG],
        60000
      );
      return NextResponse.json(result);
    }

    const result = await runAgent(["operator", "config"], 10000);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function runAgent(args: string[], timeout: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const agentPath = path.resolve(AGENT_BIN);
    const proc = spawn(agentPath, args, {
      cwd: PROJECT_DIR,
      env: { ...process.env, UV_CACHE_DIR: path.join(PROJECT_DIR, ".uv-cache") },
      timeout,
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
