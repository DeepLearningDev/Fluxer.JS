import { BaseTransport } from "./Transport.js";
import type {
  FluxerDebugHandler,
  FluxerGatewayDispatchHandler,
  FluxerGatewaySessionHandler,
  FluxerGatewayStateHandler,
  FluxerMessageHandler,
  FluxerTransport,
  SendMessagePayload
} from "./types.js";

export interface PlatformTransportOptions {
  inbound: FluxerTransport;
  outbound: FluxerTransport;
}

export class PlatformTransport extends BaseTransport {
  readonly #inbound: FluxerTransport;
  readonly #outbound: FluxerTransport;

  public constructor(options: PlatformTransportOptions) {
    super();
    this.#inbound = options.inbound;
    this.#outbound = options.outbound;
  }

  public override onMessage(handler: FluxerMessageHandler): void {
    super.onMessage(handler);
    this.#inbound.onMessage(handler);
  }

  public override onError(handler: (error: Error) => Promise<void> | void): void {
    super.onError(handler);
    this.#inbound.onError(handler);
    this.#outbound.onError(handler);
  }

  public override onGatewayDispatch(handler: FluxerGatewayDispatchHandler): void {
    super.onGatewayDispatch(handler);
    this.#inbound.onGatewayDispatch(handler);
  }

  public override onGatewayStateChange(handler: FluxerGatewayStateHandler): void {
    super.onGatewayStateChange(handler);
    this.#inbound.onGatewayStateChange(handler);
  }

  public override onGatewaySessionUpdate(handler: FluxerGatewaySessionHandler): void {
    super.onGatewaySessionUpdate(handler);
    this.#inbound.onGatewaySessionUpdate(handler);
  }

  public override onDebug(handler: FluxerDebugHandler): void {
    super.onDebug(handler);
    this.#inbound.onDebug(handler);
    this.#outbound.onDebug(handler);
  }

  public async connect(): Promise<void> {
    await Promise.all([this.#inbound.connect(), this.#outbound.connect()]);
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.#inbound.disconnect(), this.#outbound.disconnect()]);
  }

  public async sendMessage(payload: SendMessagePayload): Promise<void> {
    await this.#outbound.sendMessage(payload);
  }
}
