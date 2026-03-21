import { fetchGatewayInformation, fetchInstanceDiscoveryDocument } from "./Discovery.js";
import { PlatformBootstrapError } from "./errors.js";
import { GatewayTransport } from "./GatewayTransport.js";
import { createInstanceInfo } from "./Instance.js";
import { PlatformTransport } from "./PlatformTransport.js";
import { RestTransport } from "./RestTransport.js";
import type {
  FluxerAuth,
  FluxerDebugHandler,
  FluxerGatewayDispatchEvent,
  FluxerGatewayEnvelope,
  FluxerInstanceDiscoveryDocument,
  FluxerInstanceInfo,
  FluxerGatewayTransportOptions,
  FluxerMessage,
  FluxerTransport
} from "./types.js";

export interface CreateFluxerPlatformTransportOptions {
  auth: FluxerAuth;
  instanceUrl?: string;
  discovery?: FluxerInstanceDiscoveryDocument;
  fetchImpl?: typeof fetch;
  userAgent?: string;
  protocols?: string | string[];
  identifyPayload?: unknown;
  debug?: FluxerDebugHandler;
  onInstanceInfo?: (instance: FluxerInstanceInfo) => void;
  intents?: number;
  shard?: [number, number];
  properties?: Record<string, string>;
  presence?: Record<string, unknown>;
  webSocketFactory?: (url: string, protocols?: string | string[]) => WebSocket;
  parseMessageEvent?: FluxerGatewayTransportOptions["parseMessageEvent"];
}

export async function createFluxerPlatformTransport(
  options: CreateFluxerPlatformTransportOptions
): Promise<FluxerTransport> {
  const discovery = options.discovery ?? await fetchDiscoveryForPlatformTransport(options);
  const instanceInfo = createInstanceInfo({
    instanceUrl: options.instanceUrl ?? discovery.endpoints.api,
    discovery
  });
  options.onInstanceInfo?.(instanceInfo);
  options.debug?.({
    scope: "transport",
    event: "instance_detected",
    level: "info",
    timestamp: new Date().toISOString(),
    data: {
      instanceUrl: instanceInfo.instanceUrl,
      apiBaseUrl: instanceInfo.apiBaseUrl,
      apiCodeVersion: instanceInfo.apiCodeVersion,
      isSelfHosted: instanceInfo.isSelfHosted,
      capabilities: Object.entries(instanceInfo.capabilities)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(",")
    }
  });

  assertPlatformTransportCapabilities(instanceInfo, options.debug);

  const gateway = await fetchGatewayInfoForPlatformTransport(instanceInfo, options);

  options.debug?.({
    scope: "transport",
    event: "platform_transport_bootstrapped",
    level: "info",
    timestamp: new Date().toISOString(),
    data: {
      instanceUrl: instanceInfo.instanceUrl,
      apiBaseUrl: instanceInfo.apiBaseUrl,
      gatewayUrl: gateway.url
    }
  });

  return new PlatformTransport({
    inbound: new GatewayTransport({
      url: gateway.url,
      apiBaseUrl: instanceInfo.apiBaseUrl,
      auth: options.auth,
      fetchImpl: options.fetchImpl,
      protocols: options.protocols,
      debug: options.debug,
      identifyPayload: options.identifyPayload,
      buildIdentifyPayload: ({ auth }) => {
        if (options.identifyPayload !== undefined) {
          return options.identifyPayload;
        }

        if (!auth) {
          return undefined;
        }

        return {
          op: 2,
          d: {
            token: auth.token,
            intents: options.intents ?? 0,
            properties: options.properties ?? {
              os: process.platform,
              browser: "fluxer-js",
              device: "fluxer-js"
            },
            presence: options.presence,
            shard: options.shard
          }
        };
      },
      webSocketFactory: options.webSocketFactory,
      parseDispatchEvent: defaultParseDispatchEvent,
      parseMessageEvent: options.parseMessageEvent ?? defaultParseMessageEvent
    }),
    outbound: new RestTransport({
      baseUrl: instanceInfo.apiBaseUrl,
      discovery,
      auth: options.auth,
      fetchImpl: options.fetchImpl,
      userAgent: options.userAgent
    })
  });
}

async function fetchDiscoveryForPlatformTransport(
  options: CreateFluxerPlatformTransportOptions
): Promise<FluxerInstanceDiscoveryDocument> {
  try {
    return await fetchInstanceDiscoveryDocument({
      instanceUrl: options.instanceUrl,
      fetchImpl: options.fetchImpl
    });
  } catch (error) {
    const normalizedError = createPlatformBootstrapError({
      message: "Failed to fetch the Fluxer discovery document during platform transport bootstrap.",
      code: "PLATFORM_DISCOVERY_FAILED",
      retryable: true,
      details: {
        instanceUrl: options.instanceUrl,
        message: error instanceof Error ? error.message : "Unknown discovery bootstrap failure."
      }
    });

    options.debug?.({
      scope: "transport",
      event: "platform_transport_discovery_failed",
      level: "error",
      timestamp: new Date().toISOString(),
      data: normalizedError.details
    });

    throw normalizedError;
  }
}

async function fetchGatewayInfoForPlatformTransport(
  instanceInfo: FluxerInstanceInfo,
  options: CreateFluxerPlatformTransportOptions
) {
  try {
    return await fetchGatewayInformation({
      apiBaseUrl: instanceInfo.apiBaseUrl,
      auth: options.auth,
      fetchImpl: options.fetchImpl,
      userAgent: options.userAgent
    });
  } catch (error) {
    const normalizedError = createPlatformBootstrapError({
      message: "Failed to fetch gateway bootstrap information during platform transport creation.",
      code: "PLATFORM_GATEWAY_INFO_FAILED",
      retryable: true,
      details: {
        instanceUrl: instanceInfo.instanceUrl,
        apiBaseUrl: instanceInfo.apiBaseUrl,
        message: error instanceof Error ? error.message : "Unknown gateway bootstrap failure."
      }
    });

    options.debug?.({
      scope: "transport",
      event: "platform_transport_gateway_info_failed",
      level: "error",
      timestamp: new Date().toISOString(),
      data: normalizedError.details
    });

    throw normalizedError;
  }
}

function assertPlatformTransportCapabilities(
  instanceInfo: FluxerInstanceInfo,
  debug?: FluxerDebugHandler
): void {
  const missingCapabilities: string[] = [];

  if (!instanceInfo.capabilities.gateway) {
    missingCapabilities.push("gateway");
  }

  if (!instanceInfo.capabilities.gatewayBot) {
    missingCapabilities.push("gatewayBot");
  }

  if (missingCapabilities.length === 0) {
    return;
  }

  debug?.({
    scope: "transport",
    event: "platform_transport_bootstrap_blocked",
    level: "error",
    timestamp: new Date().toISOString(),
    data: {
      instanceUrl: instanceInfo.instanceUrl,
      missingCapabilities
    }
  });

  throw createPlatformBootstrapError({
    message: `This Fluxer instance does not support platform transport bootstrap. Missing capabilities: ${missingCapabilities.join(", ")}.`,
    code: "INSTANCE_CAPABILITY_UNSUPPORTED",
    retryable: false,
    details: {
      instanceUrl: instanceInfo.instanceUrl,
      missingCapabilities
    }
  });
}

function createPlatformBootstrapError(options: {
  message: string;
  code: string;
  retryable: boolean;
  details: Record<string, unknown>;
}): PlatformBootstrapError {
  return new PlatformBootstrapError(options);
}

export function defaultParseDispatchEvent(payload: unknown): FluxerGatewayDispatchEvent | null {
  const envelope = payload as FluxerGatewayEnvelope;

  if (envelope.op !== 0 || typeof envelope.t !== "string") {
    return null;
  }

  return {
    type: envelope.t,
    sequence: envelope.s ?? null,
    data: envelope.d,
    raw: envelope
  };
}

export function defaultParseMessageEvent(payload: unknown): FluxerMessage | null {
  const event = defaultParseDispatchEvent(payload);

  if (event?.type !== "MESSAGE_CREATE" || !event.data) {
    return null;
  }

  const payloadData = event.data as {
    id: string;
    content: string;
    author: { id: string; username: string; global_name?: string; bot?: boolean };
    channel_id: string;
    timestamp: string;
  };

  return {
    id: payloadData.id,
    content: payloadData.content,
    author: {
      id: payloadData.author.id,
      username: payloadData.author.username,
      displayName: payloadData.author.global_name,
      isBot: payloadData.author.bot
    },
    channel: {
      id: payloadData.channel_id,
      name: payloadData.channel_id,
      type: "text"
    },
    createdAt: new Date(payloadData.timestamp)
  };
}
