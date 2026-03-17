import { fetchGatewayInformation } from "./Discovery.js";
import { BaseTransport } from "./Transport.js";
import type {
  FluxerGatewayTransportOptions,
  FluxerReconnectOptions,
  SendMessagePayload
} from "./types.js";

const DEFAULT_RECONNECT: Required<FluxerReconnectOptions> = {
  enabled: true,
  maxAttempts: Infinity,
  baseDelayMs: 500,
  maxDelayMs: 10_000
};

export class GatewayTransport extends BaseTransport {
  readonly #options: FluxerGatewayTransportOptions;
  readonly #reconnect: Required<FluxerReconnectOptions>;
  readonly #fetchImpl: typeof fetch;
  #socket?: WebSocket;
  #manualClose = false;
  #reconnectAttempts = 0;
  #reconnectTimer?: ReturnType<typeof setTimeout>;

  public constructor(options: FluxerGatewayTransportOptions) {
    super();
    this.#options = options;
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#reconnect = {
      ...DEFAULT_RECONNECT,
      ...options.reconnect
    };
  }

  public async connect(): Promise<void> {
    this.#manualClose = false;
    await this.#openSocket();
  }

  public async disconnect(): Promise<void> {
    this.#manualClose = true;

    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = undefined;
    }

    this.#socket?.close();
    this.#socket = undefined;
  }

  public async sendMessage(_payload: SendMessagePayload): Promise<void> {
    throw new Error("GatewayTransport cannot send messages directly. Pair it with RestTransport.");
  }

  async #openSocket(): Promise<void> {
    const socketUrl = await this.#resolveSocketUrl();
    const factory =
      this.#options.webSocketFactory ??
      ((url: string, protocols?: string | string[]) => new WebSocket(url, protocols));

    const socket = factory(socketUrl, this.#options.protocols);
    this.#socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      socket.addEventListener("open", () => {
        settled = true;
        this.#reconnectAttempts = 0;

        if (this.#options.identifyPayload !== undefined) {
          socket.send(JSON.stringify(this.#options.identifyPayload));
        }

        resolve();
      });

      socket.addEventListener("message", async (event) => {
        const payload = this.#parseIncomingPayload(event.data);
        const message = this.#options.parseMessageEvent(payload);
        if (message) {
          await this.emitMessage(message);
        }
      });

      socket.addEventListener("error", () => {
        if (!settled) {
          reject(new Error("GatewayTransport failed to connect."));
        }
      });

      socket.addEventListener("close", () => {
        this.#socket = undefined;
        if (!settled) {
          reject(new Error("GatewayTransport closed before the connection was established."));
          return;
        }

        if (!this.#manualClose) {
          this.#scheduleReconnect();
        }
      });
    });
  }

  #scheduleReconnect(): void {
    if (!this.#reconnect.enabled) {
      return;
    }

    if (this.#reconnectAttempts >= this.#reconnect.maxAttempts) {
      return;
    }

    const delay = Math.min(
      this.#reconnect.baseDelayMs * 2 ** this.#reconnectAttempts,
      this.#reconnect.maxDelayMs
    );

    this.#reconnectAttempts += 1;
    this.#reconnectTimer = setTimeout(() => {
      void this.#openSocket();
    }, delay);
  }

  #parseIncomingPayload(rawData: unknown): unknown {
    if (typeof rawData !== "string") {
      return rawData;
    }

    try {
      return JSON.parse(rawData);
    } catch {
      return rawData;
    }
  }

  async #resolveSocketUrl(): Promise<string> {
    if (this.#options.url) {
      return this.#options.url;
    }

    if (!this.#options.apiBaseUrl || !this.#options.auth) {
      throw new Error("GatewayTransport requires either a direct url or both apiBaseUrl and auth.");
    }

    const gateway = await fetchGatewayInformation({
      apiBaseUrl: this.#options.apiBaseUrl,
      auth: this.#options.auth,
      fetchImpl: this.#fetchImpl
    });

    return gateway.url;
  }
}
