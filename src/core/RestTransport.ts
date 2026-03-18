import { createBotAuthHeader, fetchInstanceDiscoveryDocument, normalizeBaseUrl } from "./Discovery.js";
import { RestTransportError } from "./errors.js";
import { BaseTransport } from "./Transport.js";
import type {
  FluxerInstanceDiscoveryDocument,
  FluxerRestTransportOptions,
  SendMessagePayload
} from "./types.js";

export class RestTransport extends BaseTransport {
  #baseUrl?: string;
  readonly #instanceUrl?: string;
  readonly #auth?: FluxerRestTransportOptions["auth"];
  readonly #fetchImpl: typeof fetch;
  readonly #discovery?: FluxerInstanceDiscoveryDocument;
  readonly #sendMessagePath: NonNullable<FluxerRestTransportOptions["sendMessagePath"]>;
  readonly #headers: Record<string, string>;
  readonly #userAgent?: string;

  public constructor(options: FluxerRestTransportOptions) {
    super();
    this.#baseUrl = options.baseUrl ? normalizeBaseUrl(options.baseUrl) : undefined;
    this.#instanceUrl = options.instanceUrl;
    this.#auth = options.auth;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#discovery = options.discovery;
    this.#sendMessagePath = options.sendMessagePath ?? ((channelId) => `/channels/${channelId}/messages`);
    this.#headers = options.headers ?? {};
    this.#userAgent = options.userAgent;
  }

  public async connect(): Promise<void> {
    await this.#ensureBaseUrl();
  }

  public async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  public async sendMessage(payload: SendMessagePayload): Promise<void> {
    const baseUrl = await this.#ensureBaseUrl();
    const requestUrl = `${baseUrl}/v1${this.#sendMessagePath(payload.channelId)}`;
    const requestBody = JSON.stringify({
      content: payload.content,
      embeds: payload.embeds?.map((embed) => ({
        ...embed,
        footer: embed.footer
          ? {
              text: embed.footer.text,
              icon_url: embed.footer.iconUrl
            }
          : undefined,
        author: embed.author
          ? {
              name: embed.author.name,
              url: embed.author.url,
              icon_url: embed.author.iconUrl
            }
          : undefined,
        image: embed.image
          ? {
              url: embed.image.url
            }
          : undefined,
        thumbnail: embed.thumbnail
          ? {
              url: embed.thumbnail.url
            }
          : undefined,
        fields: embed.fields?.map((field) => ({
          name: field.name,
          value: field.value,
          inline: field.inline
        }))
      })),
      nonce: payload.nonce,
      message_reference: payload.messageReference
        ? {
            message_id: payload.messageReference.messageId,
            channel_id: payload.messageReference.channelId,
            guild_id: payload.messageReference.guildId,
            type: payload.messageReference.type
          }
        : undefined
    });

    let response: Response;
    try {
      response = await this.#fetchImpl(
        requestUrl,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            ...(this.#userAgent ? { "user-agent": this.#userAgent } : {}),
            ...this.#headers,
            ...this.#createAuthHeader()
          },
          body: requestBody
        }
      );
    } catch (error) {
      throw new RestTransportError({
        message: "RestTransport failed to send the request.",
        code: "REST_REQUEST_FAILED",
        retryable: true,
        details: {
          method: "POST",
          url: requestUrl,
          channelId: payload.channelId,
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }

    if (!response.ok) {
      const responseBody = await safeReadResponseText(response);
      throw new RestTransportError({
        message: `RestTransport failed to send message: ${response.status} ${response.statusText}`,
        code: "REST_HTTP_ERROR",
        status: response.status,
        retryable: response.status >= 500,
        details: {
          method: "POST",
          url: requestUrl,
          channelId: payload.channelId,
          statusText: response.statusText,
          responseBody
        }
      });
    }
  }

  #createAuthHeader(): Record<string, string> {
    return createBotAuthHeader(this.#auth);
  }

  async #ensureBaseUrl(): Promise<string> {
    if (this.#baseUrl) {
      return this.#baseUrl;
    }

    if (this.#discovery) {
      this.#baseUrl = normalizeBaseUrl(this.#discovery.endpoints.api);
      return this.#baseUrl;
    }

    if (!this.#instanceUrl) {
      throw new RestTransportError({
        message: "RestTransport requires either a baseUrl, discovery document, or instanceUrl.",
        code: "REST_CONFIGURATION_INVALID",
        retryable: false,
        details: {
          hasBaseUrl: Boolean(this.#baseUrl),
          hasDiscovery: Boolean(this.#discovery),
          hasInstanceUrl: Boolean(this.#instanceUrl)
        }
      });
    }

    let discovery: FluxerInstanceDiscoveryDocument;
    try {
      discovery = await fetchInstanceDiscoveryDocument({
        instanceUrl: this.#instanceUrl,
        fetchImpl: this.#fetchImpl
      });
    } catch (error) {
      throw new RestTransportError({
        message: "RestTransport failed to fetch the instance discovery document.",
        code: "REST_DISCOVERY_FAILED",
        retryable: true,
        details: {
          instanceUrl: this.#instanceUrl,
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }

    this.#baseUrl = normalizeBaseUrl(discovery.endpoints.api);
    return this.#baseUrl;
  }
}

async function safeReadResponseText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}
