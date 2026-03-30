import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("renders runtime and error detail metadata in contract summaries", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fluxer-report-summary-"));
  const reportPath = path.join(tempDir, "contract-report.json");
  await writeFile(reportPath, JSON.stringify({
    mode: "contract",
    status: "failed",
    startedAt: "2026-03-29T00:00:00.000Z",
    finishedAt: "2026-03-29T00:00:01.000Z",
    instanceUrl: "https://api.fluxer.app",
    channelId: "channel_1",
    keepAlive: false,
    listLimit: 10,
    timeoutMs: 5000,
    runtime: {
      nodeVersion: "v22.19.0",
      platform: "win32",
      hasWebSocket: true
    },
    instance: {
      apiBaseUrl: "https://api.fluxer.app/api/v1",
      gatewayUrl: "wss://api.fluxer.app/gateway",
      apiCodeVersion: 7,
      isSelfHosted: false,
      capabilities: ["gateway", "attachments"]
    },
    steps: [],
    error: {
      name: "PlatformBootstrapError",
      message: "Missing capabilities: gatewayBot",
      code: "INSTANCE_CAPABILITY_UNSUPPORTED",
      details: {
        missingCapabilities: ["gatewayBot"],
        instanceUrl: "https://api.fluxer.app"
      }
    }
  }, null, 2), "utf8");

  const scriptPath = path.resolve("scripts/summarize-live-contract-report.mjs");
  const { stdout } = await execFileAsync(process.execPath, [scriptPath, reportPath], {
    cwd: path.resolve(".")
  });

  assert.match(stdout, /## Runtime/);
  assert.match(stdout, /- Node: v22\.19\.0/);
  assert.match(stdout, /- WebSocket available: yes/);
  assert.match(stdout, /- Detail missingCapabilities: `\["gatewayBot"\]`/);
  assert.match(stdout, /- Detail instanceUrl: https:\/\/api\.fluxer\.app/);
});
