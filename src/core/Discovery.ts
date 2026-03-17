import type {
  FluxerAuth,
  FluxerGatewayInfo,
  FluxerInstanceDiscoveryDocument
} from "./types.js";

const DEFAULT_INSTANCE_URL = "https://api.fluxer.app";

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveDiscoveryUrl(instanceUrl = DEFAULT_INSTANCE_URL): string {
  return `${normalizeBaseUrl(instanceUrl)}/v1/.well-known/fluxer`;
}

export function createBotAuthHeader(auth?: FluxerAuth): Record<string, string> {
  if (!auth) {
    return {};
  }

  return {
    authorization: `${auth.scheme ?? "Bot"} ${auth.token}`
  };
}

export async function fetchInstanceDiscoveryDocument(options?: {
  instanceUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<FluxerInstanceDiscoveryDocument> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(resolveDiscoveryUrl(options?.instanceUrl), {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Fluxer discovery document: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as FluxerInstanceDiscoveryDocument;
}

export async function fetchGatewayInformation(options: {
  apiBaseUrl: string;
  auth: FluxerAuth;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}): Promise<FluxerGatewayInfo> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${normalizeBaseUrl(options.apiBaseUrl)}/v1/gateway/bot`, {
    headers: {
      accept: "application/json",
      ...(options.userAgent ? { "user-agent": options.userAgent } : {}),
      ...createBotAuthHeader(options.auth)
    }
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Fluxer gateway information: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as FluxerGatewayInfo;
}
