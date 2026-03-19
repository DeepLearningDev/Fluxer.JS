import { BaseTransport } from "./Transport.js";
import type {
  FluxerDebugEvent,
  FluxerGatewayDispatchEvent,
  FluxerGatewaySession,
  FluxerGatewayStateChangeEvent,
  FluxerMessage,
  SendMessagePayload
} from "./types.js";

export class MockTransport extends BaseTransport {
  #connected = false;
  #sentMessages: SendMessagePayload[] = [];
  readonly #sendHandlers = new Set<(payload: SendMessagePayload) => void | Promise<void>>();

  public get isConnected(): boolean {
    return this.#connected;
  }

  public get sentMessages(): SendMessagePayload[] {
    return [...this.#sentMessages];
  }

  public clearSentMessages(): void {
    this.#sentMessages = [];
  }

  public onSend(handler: (payload: SendMessagePayload) => void | Promise<void>): () => void {
    this.#sendHandlers.add(handler);
    return () => {
      this.#sendHandlers.delete(handler);
    };
  }

  public async connect(): Promise<void> {
    this.#connected = true;
  }

  public async disconnect(): Promise<void> {
    this.#connected = false;
  }

  public async sendMessage(payload: SendMessagePayload): Promise<void> {
    this.#sentMessages.push(payload);
    for (const handler of this.#sendHandlers) {
      await handler(payload);
    }
    const timestamp = new Date().toISOString();
    const content = payload.content ?? "[rich message]";
    const embedSuffix = payload.embeds?.length ? ` (+${payload.embeds.length} embed(s))` : "";
    const attachmentSuffix = payload.attachments?.length
      ? ` (+${payload.attachments.length} attachment(s))`
      : "";
    console.log(`[Fluxer:${timestamp}] -> ${payload.channelId}: ${content}${embedSuffix}${attachmentSuffix}`);
  }

  public async injectMessage(message: FluxerMessage): Promise<void> {
    if (!this.#connected) {
      const error = new Error("MockTransport is not connected.");
      await this.emitError(error);
      throw error;
    }

    await this.emitMessage(message);
  }

  public async injectGatewayDispatch(event: FluxerGatewayDispatchEvent): Promise<void> {
    await this.emitGatewayDispatch(event);
  }

  public async injectGatewayStateChange(event: FluxerGatewayStateChangeEvent): Promise<void> {
    await this.emitGatewayStateChange(event);
  }

  public async injectGatewaySessionUpdate(session: FluxerGatewaySession): Promise<void> {
    await this.emitGatewaySessionUpdate(session);
  }

  public async injectDebug(event: FluxerDebugEvent): Promise<void> {
    await this.emitDebug(event);
  }
}
