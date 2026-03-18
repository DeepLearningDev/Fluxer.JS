import { FluxerClient } from "../core/Client.js";
import { MockTransport } from "../core/MockTransport.js";
import type {
  FluxerBotLike,
  FluxerGatewayDispatchEvent,
  FluxerMessage,
  SendMessagePayload
} from "../core/types.js";
import {
  createTestChannel,
  createTestGatewayDispatch,
  createTestGuild,
  createTestMessage,
  createTestUser
} from "./fixtures.js";

export class FluxerTestRuntime {
  readonly transport: MockTransport;
  readonly client: FluxerClient;

  #messageSequence = 0;
  #dispatchSequence = 0;

  public constructor() {
    this.transport = new MockTransport();
    this.client = new FluxerClient(this.transport);
  }

  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  public registerBot(bot: FluxerBotLike): this {
    this.client.registerBot(bot as never);
    return this;
  }

  public get sentMessages(): SendMessagePayload[] {
    return this.transport.sentMessages;
  }

  public clearSentMessages(): void {
    this.transport.clearSentMessages();
  }

  public createUser = createTestUser;
  public createChannel = createTestChannel;
  public createGuild = createTestGuild;

  public createMessage(content = "!ping", overrides: Partial<FluxerMessage> = {}): FluxerMessage {
    this.#messageSequence += 1;
    return createTestMessage(content, {
      id: `msg_${this.#messageSequence}`,
      ...overrides
    });
  }

  public createDispatch(
    type: string,
    data: Record<string, unknown>,
    overrides: Partial<FluxerGatewayDispatchEvent> = {}
  ): FluxerGatewayDispatchEvent {
    this.#dispatchSequence += 1;
    return createTestGatewayDispatch(type, data, {
      sequence: this.#dispatchSequence,
      ...overrides
    });
  }

  public async injectMessage(
    messageOrContent: FluxerMessage | string,
    overrides: Partial<FluxerMessage> = {}
  ): Promise<void> {
    const message = typeof messageOrContent === "string"
      ? this.createMessage(messageOrContent, overrides)
      : messageOrContent;
    await this.transport.injectMessage(message);
  }

  public async injectGatewayDispatch(
    eventOrType: FluxerGatewayDispatchEvent | string,
    data?: Record<string, unknown>,
    overrides: Partial<FluxerGatewayDispatchEvent> = {}
  ): Promise<void> {
    const event = typeof eventOrType === "string"
      ? this.createDispatch(eventOrType, data ?? {}, overrides)
      : eventOrType;
    await this.transport.injectGatewayDispatch(event);
  }
}
