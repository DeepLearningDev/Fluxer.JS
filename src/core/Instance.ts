import { normalizeBaseUrl, resolveDiscoveryUrl } from "./Discovery.js";
import type {
  FluxerInstanceCapabilities,
  FluxerInstanceDiscoveryDocument,
  FluxerInstanceInfo
} from "./types.js";

const HOSTED_API_URL = "https://api.fluxer.app";

export function resolveBotApiBaseUrl(discovery: FluxerInstanceDiscoveryDocument): string {
  return normalizeBaseUrl(discovery.endpoints.api_public || discovery.endpoints.api);
}

export function detectInstanceCapabilities(
  discovery: FluxerInstanceDiscoveryDocument
): FluxerInstanceCapabilities {
  const features = discovery.features ?? {};
  const endpointValues = Object.values(discovery.endpoints ?? {});

  return {
    federation: discovery.federation?.enabled ?? Boolean(features.federation),
    invites: hasTruthyFeature(features, ["invite", "invites"]) || Boolean(discovery.endpoints?.invite),
    media: hasTruthyFeature(features, ["media", "attachments", "upload", "uploads"])
      || Boolean(discovery.endpoints?.media),
    gateway: Boolean(discovery.endpoints?.gateway),
    gatewayBot: hasTruthyFeature(features, ["gateway", "gateway_bot", "bot_gateway", "bots"]),
    botAuth: hasTruthyFeature(features, ["bots", "bot_auth", "applications"]) || endpointValues.length > 0,
    attachments: hasTruthyFeature(features, ["attachments", "media", "upload", "uploads"])
      || Boolean(discovery.endpoints?.media)
  };
}

export function createInstanceInfo(options: {
  instanceUrl: string;
  discovery: FluxerInstanceDiscoveryDocument;
}): FluxerInstanceInfo {
  const normalizedInstanceUrl = normalizeBaseUrl(options.instanceUrl);
  const capabilities = detectInstanceCapabilities(options.discovery);

  return {
    instanceUrl: normalizedInstanceUrl,
    discoveryUrl: resolveDiscoveryUrl(normalizedInstanceUrl),
    apiBaseUrl: resolveBotApiBaseUrl(options.discovery),
    gatewayBaseUrl: options.discovery.endpoints.gateway
      ? normalizeBaseUrl(options.discovery.endpoints.gateway)
      : undefined,
    apiCodeVersion: options.discovery.api_code_version,
    discovery: options.discovery,
    capabilities,
    isSelfHosted: normalizedInstanceUrl !== HOSTED_API_URL,
    federationVersion: options.discovery.federation?.version
  };
}

function hasTruthyFeature(
  features: Record<string, boolean>,
  names: string[]
): boolean {
  return names.some((name) => features[name] === true);
}
