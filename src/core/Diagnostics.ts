import type { FluxerClient } from "./Client.js";
import type { FluxerDebugEvent, FluxerDebugHandler } from "./types.js";

export interface FluxerConsoleDebugOptions {
  minLevel?: "debug" | "info" | "warn" | "error";
  includeData?: boolean;
}

const DEBUG_LEVEL_ORDER: Record<NonNullable<FluxerDebugEvent["level"]>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createConsoleDebugHandler(
  options: FluxerConsoleDebugOptions = {}
): FluxerDebugHandler {
  const minLevel = options.minLevel ?? "debug";
  const includeData = options.includeData ?? true;

  return (event) => {
    if (!shouldLogDebugEvent(event, minLevel)) {
      return;
    }

    const prefix = `[Fluxer][${event.scope}][${event.level ?? "debug"}] ${event.event}`;
    const suffix = includeData && event.data && Object.keys(event.data).length > 0
      ? ` ${JSON.stringify(event.data)}`
      : "";
    console.log(`${prefix}${suffix}`);
  };
}

export function attachDebugHandler(client: FluxerClient, handler: FluxerDebugHandler): FluxerClient {
  client.on("debug", handler);
  return client;
}

export function shouldLogDebugEvent(
  event: FluxerDebugEvent,
  minLevel: NonNullable<FluxerDebugEvent["level"]> = "debug"
): boolean {
  const eventLevel = event.level ?? "debug";
  return DEBUG_LEVEL_ORDER[eventLevel] >= DEBUG_LEVEL_ORDER[minLevel];
}
