import { EventEmitter } from "node:events";
import type { FluxerBot } from "./Bot.js";
import type { FluxerEventMap, FluxerMessage, FluxerTransport } from "./types.js";
import { MockTransport } from "./MockTransport.js";

type EventKey = keyof FluxerEventMap;

export class FluxerClient extends EventEmitter {
  #connected = false;
  #bots = new Set<FluxerBot>();
  #transport: FluxerTransport;

  public constructor(transport: FluxerTransport = new MockTransport()) {
    super();
    this.#transport = transport;
    this.#transport.onMessage(async (message) => {
      await this.receiveMessage(message);
    });
  }

  public async connect(): Promise<void> {
    await this.#transport.connect();
    this.#connected = true;
    this.emit("ready", { connectedAt: new Date() } satisfies FluxerEventMap["ready"]);
  }

  public async disconnect(): Promise<void> {
    await this.#transport.disconnect();
    this.#connected = false;
  }

  public isConnected(): boolean {
    return this.#connected;
  }

  public registerBot(bot: FluxerBot): void {
    this.#bots.add(bot);
    bot.attach(this);
  }

  public async sendMessage(channelId: string, content: string): Promise<void> {
    await this.#transport.sendMessage({ channelId, content });
  }

  public async receiveMessage(message: FluxerMessage): Promise<void> {
    this.emit("messageCreate", message);

    for (const bot of this.#bots) {
      await bot.handleMessage(message);
    }
  }

  public override on<E extends EventKey>(
    eventName: E,
    listener: (payload: FluxerEventMap[E]) => void,
  ): this {
    return super.on(eventName, listener);
  }

  public override emit<E extends EventKey>(eventName: E, payload: FluxerEventMap[E]): boolean {
    return super.emit(eventName, payload);
  }
}
