import { createBotAuthHeader, fetchInstanceDiscoveryDocument, normalizeBaseUrl } from "./Discovery.js";
import { BaseTransport } from "./Transport.js";
import type {
  FluxerRestTransportOptions,
  SendMessagePayload
} from "./types.js";

export class RestTransport extends BaseTransport {
  #baseUrl?: string;
  readonly #instanceUrl?: string;
  readonly #auth?: FluxerRestTransportOptions["auth"];
  readonly #fetchImpl: typeof fetch;
  readonly #sendMessagePath: NonNullable<FluxerRestTransportOptions["sendMessagePath"]>;
  readonly #headers: Record<string, string>;
  readonly #userAgent?: string;

  public constructor(options: FluxerRestTransportOptions) {
    super();
    this.#baseUrl = options.baseUrl ? normalizeBaseUrl(options.baseUrl) : undefined;
    this.#instanceUrl = options.instanceUrl;
    this.#auth = options.auth;
    this.#fetchImpl = options.fetchImpl ?? fetch;
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
    const response = await this.#fetchImpl(
      `${baseUrl}/v1${this.#sendMessagePath(payload.channelId)}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(this.#userAgent ? { "user-agent": this.#userAgent } : {}),
          ...this.#headers,
          ...this.#createAuthHeader()
        },
        body: JSON.stringify({
          content: payload.content,
          nonce: payload.nonce,
          message_reference: payload.messageReference
            ? {
                message_id: payload.messageReference.messageId,
                channel_id: payload.messageReference.channelId,
                guild_id: payload.messageReference.guildId,
                type: payload.messageReference.type
              }
            : undefined
        })
      }
    );

    if (!response.ok) {
      throw new Error(`RestTransport failed to send message: ${response.status} ${response.statusText}`);
    }
  }

  #createAuthHeader(): Record<string, string> {
    return createBotAuthHeader(this.#auth);
  }

  async #ensureBaseUrl(): Promise<string> {
    if (this.#baseUrl) {
      return this.#baseUrl;
    }

    const discovery = await fetchInstanceDiscoveryDocument({
      instanceUrl: this.#instanceUrl,
      fetchImpl: this.#fetchImpl
    });

    this.#baseUrl = normalizeBaseUrl(discovery.endpoints.api);
    return this.#baseUrl;
  }
}
