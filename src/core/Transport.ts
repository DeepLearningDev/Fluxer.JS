import type {
  FluxerDebugHandler,
  FluxerErrorHandler,
  FluxerGatewayDispatchHandler,
  FluxerGatewaySessionHandler,
  FluxerGatewayStateHandler,
  FluxerMessageHandler,
  FluxerTransport,
  SendMessagePayload
} from "./types.js";

export abstract class BaseTransport implements FluxerTransport {
  #messageHandler?: FluxerMessageHandler;
  #errorHandler?: FluxerErrorHandler;
  #gatewayDispatchHandler?: FluxerGatewayDispatchHandler;
  #gatewayStateHandler?: FluxerGatewayStateHandler;
  #gatewaySessionHandler?: FluxerGatewaySessionHandler;
  #debugHandler?: FluxerDebugHandler;

  public onMessage(handler: FluxerMessageHandler): void {
    this.#messageHandler = handler;
  }

  public onError(handler: FluxerErrorHandler): void {
    this.#errorHandler = handler;
  }

  public onGatewayDispatch(handler: FluxerGatewayDispatchHandler): void {
    this.#gatewayDispatchHandler = handler;
  }

  public onGatewayStateChange(handler: FluxerGatewayStateHandler): void {
    this.#gatewayStateHandler = handler;
  }

  public onGatewaySessionUpdate(handler: FluxerGatewaySessionHandler): void {
    this.#gatewaySessionHandler = handler;
  }

  public onDebug(handler: FluxerDebugHandler): void {
    this.#debugHandler = handler;
  }

  protected async emitMessage(message: Parameters<FluxerMessageHandler>[0]): Promise<void> {
    await this.#messageHandler?.(message);
  }

  protected async emitError(error: Error): Promise<void> {
    await this.#errorHandler?.(error);
  }

  protected async emitGatewayDispatch(
    event: Parameters<FluxerGatewayDispatchHandler>[0]
  ): Promise<void> {
    await this.#gatewayDispatchHandler?.(event);
  }

  protected async emitGatewayStateChange(
    event: Parameters<FluxerGatewayStateHandler>[0]
  ): Promise<void> {
    await this.#gatewayStateHandler?.(event);
  }

  protected async emitGatewaySessionUpdate(
    session: Parameters<FluxerGatewaySessionHandler>[0]
  ): Promise<void> {
    await this.#gatewaySessionHandler?.(session);
  }

  protected async emitDebug(event: Parameters<FluxerDebugHandler>[0]): Promise<void> {
    await this.#debugHandler?.(event);
  }

  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract sendMessage(payload: SendMessagePayload): Promise<void>;
}
