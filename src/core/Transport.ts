import type { FluxerMessageHandler, FluxerTransport, SendMessagePayload } from "./types.js";

export abstract class BaseTransport implements FluxerTransport {
  #messageHandler?: FluxerMessageHandler;

  public onMessage(handler: FluxerMessageHandler): void {
    this.#messageHandler = handler;
  }

  protected async emitMessage(message: Parameters<FluxerMessageHandler>[0]): Promise<void> {
    await this.#messageHandler?.(message);
  }

  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract sendMessage(payload: SendMessagePayload): Promise<void>;
}
