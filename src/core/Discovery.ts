import type {
  FluxerAuth,
  FluxerGatewayInfo,
  FluxerInstanceDiscoveryDocument
} from "./types.js";
import { DiscoveryError } from "./errors.js";

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

async function readResponseBodySafely(response: Response): Promise<{
  responseBody?: string;
  responseBodyReadFailed?: boolean;
  responseBodyReadError?: string;
}> {
  try {
    return {
      responseBody: await response.text()
    };
  } catch (error) {
    return {
      responseBodyReadFailed: true,
      responseBodyReadError: error instanceof Error ? error.message : "Unknown response body read failure."
    };
  }
}

export async function fetchInstanceDiscoveryDocument(options?: {
  instanceUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<FluxerInstanceDiscoveryDocument> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = resolveDiscoveryUrl(options?.instanceUrl);
  let response: Response;

  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "application/json"
      }
    });
  } catch (error) {
    throw new DiscoveryError({
      message: "Failed to fetch the Fluxer discovery document.",
      code: "DISCOVERY_REQUEST_FAILED",
      retryable: true,
      details: {
        url,
        instanceUrl: options?.instanceUrl,
        message: error instanceof Error ? error.message : "Unknown discovery request failure."
      }
    });
  }

  if (!response.ok) {
    const bodyDetails = await readResponseBodySafely(response);

    throw new DiscoveryError({
      message: `Failed to fetch the Fluxer discovery document: ${response.status} ${response.statusText}`,
      code: "DISCOVERY_HTTP_ERROR",
      retryable: response.status >= 500,
      status: response.status,
      details: {
        url,
        instanceUrl: options?.instanceUrl,
        statusText: response.statusText,
        ...bodyDetails
      }
    });
  }

  try {
    return (await response.json()) as FluxerInstanceDiscoveryDocument;
  } catch (error) {
    throw new DiscoveryError({
      message: "Failed to parse the Fluxer discovery document response.",
      code: "DISCOVERY_RESPONSE_INVALID",
      retryable: false,
      status: response.status,
      details: {
        url,
        instanceUrl: options?.instanceUrl,
        message: error instanceof Error ? error.message : "Unknown discovery response parsing failure."
      }
    });
  }
}

export async function fetchGatewayInformation(options: {
  apiBaseUrl: string;
  auth: FluxerAuth;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}): Promise<FluxerGatewayInfo> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${normalizeBaseUrl(options.apiBaseUrl)}/v1/gateway/bot`;
  let response: Response;

  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        ...(options.userAgent ? { "user-agent": options.userAgent } : {}),
        ...createBotAuthHeader(options.auth)
      }
    });
  } catch (error) {
    throw new DiscoveryError({
      message: "Failed to fetch Fluxer gateway bootstrap information.",
      code: "GATEWAY_INFO_REQUEST_FAILED",
      retryable: true,
      details: {
        url,
        apiBaseUrl: options.apiBaseUrl,
        message: error instanceof Error ? error.message : "Unknown gateway bootstrap request failure."
      }
    });
  }

  if (!response.ok) {
    const bodyDetails = await readResponseBodySafely(response);

    throw new DiscoveryError({
      message: `Failed to fetch Fluxer gateway bootstrap information: ${response.status} ${response.statusText}`,
      code: "GATEWAY_INFO_HTTP_ERROR",
      retryable: response.status >= 500,
      status: response.status,
      details: {
        url,
        apiBaseUrl: options.apiBaseUrl,
        statusText: response.statusText,
        ...bodyDetails
      }
    });
  }

  try {
    return (await response.json()) as FluxerGatewayInfo;
  } catch (error) {
    throw new DiscoveryError({
      message: "Failed to parse the Fluxer gateway bootstrap response.",
      code: "GATEWAY_INFO_RESPONSE_INVALID",
      retryable: false,
      status: response.status,
      details: {
        url,
        apiBaseUrl: options.apiBaseUrl,
        message: error instanceof Error ? error.message : "Unknown gateway bootstrap response parsing failure."
      }
    });
  }
}
