import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const processRef = globalThis.process;
const consoleRef = globalThis.console;
const [, , inputArg, outputArg] = processRef.argv;

if (!inputArg) {
  consoleRef.error("Usage: node scripts/summarize-live-contract-report.mjs <report.json> [summary.md]");
  processRef.exit(1);
}

const inputPath = path.resolve(processRef.cwd(), inputArg);
const raw = await readFile(inputPath, "utf8");
const report = JSON.parse(raw);
const summary = renderSummary(report, inputPath);

if (outputArg) {
  const outputPath = path.resolve(processRef.cwd(), outputArg);
  await writeFile(outputPath, summary, "utf8");
  consoleRef.log(`Contract summary written to ${outputPath}`);
} else {
  processRef.stdout.write(summary);
}

function renderSummary(report, inputPath) {
  const lines = [
    "# Fluxer.JS Live Contract Report",
    "",
    `- Status: ${String(report.status ?? "unknown")}`,
    `- Started: ${String(report.startedAt ?? "unknown")}`,
    `- Finished: ${String(report.finishedAt ?? "unknown")}`,
    `- Source report: \`${inputPath}\``,
    `- Instance: ${String(report.instanceUrl ?? "unknown")}`,
    `- Channel: ${String(report.channelId ?? "unknown")}`,
    `- Keep alive: ${report.keepAlive === true ? "yes" : "no"}`,
    ""
  ];

  if (report.currentUser) {
    lines.push("## Current User", "");
    lines.push(`- Username: ${String(report.currentUser.username ?? "unknown")}`);
    lines.push(`- User ID: ${String(report.currentUser.id ?? "unknown")}`, "");
  }

  if (report.probe) {
    lines.push("## Probe", "");
    lines.push(`- Content: ${String(report.probe.content ?? "unknown")}`);
    lines.push(`- Confirmed message ID: ${String(report.probe.confirmedMessageId ?? "not confirmed")}`, "");
  }

  lines.push("## Steps", "");
  for (const step of Array.isArray(report.steps) ? report.steps : []) {
    lines.push(`- ${String(step.name)}: ${String(step.status)} at ${String(step.timestamp ?? "unknown")}`);
  }
  lines.push("");

  if (report.error) {
    lines.push("## Error", "");
    lines.push(`- Name: ${String(report.error.name ?? "unknown")}`);
    lines.push(`- Message: ${String(report.error.message ?? "unknown")}`);
    if (report.error.code) {
      lines.push(`- Code: ${String(report.error.code)}`);
    }
    lines.push("");
  }

  return lines.join("\n") + "\n";
}
