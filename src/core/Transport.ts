import type {
  FluxerErrorHandler,
  FluxerMessageHandler,
  FluxerTransport,
  SendMessagePayload
} from "./types.js";

export abstract class BaseTransport implements FluxerTransport {
  #messageHandler?: FluxerMessageHandler;
  #errorHandler?: FluxerErrorHandler;

  public onMessage(handler: FluxerMessageHandler): void {
    this.#messageHandler = handler;
  }

  public onError(handler: FluxerErrorHandler): void {
    this.#errorHandler = handler;
  }

  protected async emitMessage(message: Parameters<FluxerMessageHandler>[0]): Promise<void> {
    await this.#messageHandler?.(message);
  }

  protected async emitError(error: Error): Promise<void> {
    await this.#errorHandler?.(error);
  }

  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract sendMessage(payload: SendMessagePayload): Promise<void>;
}
