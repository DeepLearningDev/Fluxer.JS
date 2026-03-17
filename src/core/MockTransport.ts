import { BaseTransport } from "./Transport.js";
import type { FluxerMessage, SendMessagePayload } from "./types.js";

export class MockTransport extends BaseTransport {
  #connected = false;

  public async connect(): Promise<void> {
    this.#connected = true;
  }

  public async disconnect(): Promise<void> {
    this.#connected = false;
  }

  public async sendMessage(payload: SendMessagePayload): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[Fluxer:${timestamp}] -> ${payload.channelId}: ${payload.content}`);
  }

  public async injectMessage(message: FluxerMessage): Promise<void> {
    if (!this.#connected) {
      const error = new Error("MockTransport is not connected.");
      await this.emitError(error);
      throw error;
    }

    await this.emitMessage(message);
  }
}
