import type { FluxerClient } from "./Client.js";
import type {
  CommandContext,
  FluxerBotOptions,
  FluxerCommand,
  FluxerMessage
} from "./types.js";

export class FluxerBot {
  readonly name: string;
  readonly prefix: string;
  readonly ignoreBots: boolean;

  #client?: FluxerClient;
  #commands = new Map<string, FluxerCommand>();

  public constructor(options: FluxerBotOptions) {
    this.name = options.name;
    this.prefix = options.prefix ?? "!";
    this.ignoreBots = options.ignoreBots ?? true;
  }

  public attach(client: FluxerClient): void {
    this.#client = client;
  }

  public command(command: FluxerCommand): this {
    this.#commands.set(command.name, command);

    for (const alias of command.aliases ?? []) {
      this.#commands.set(alias, command);
    }

    return this;
  }

  public get commands(): FluxerCommand[] {
    return [...new Set(this.#commands.values())];
  }

  public async handleMessage(message: FluxerMessage): Promise<void> {
    if (!this.#client) {
      throw new Error(`Bot "${this.name}" is not attached to a FluxerClient.`);
    }

    if (this.ignoreBots && message.author.isBot) {
      return;
    }

    if (!message.content.startsWith(this.prefix)) {
      return;
    }

    const [commandName, ...args] = message.content.slice(this.prefix.length).trim().split(/\s+/);
    if (!commandName) {
      return;
    }

    const command = this.#commands.get(commandName);
    if (!command) {
      return;
    }

    const context: CommandContext = {
      client: this.#client,
      bot: this,
      message,
      args,
      commandName,
      reply: async (content: string) => {
        await this.#client?.sendMessage(message.channel.id, content);
      }
    };

    await command.execute(context);
    this.#client.emit("commandExecuted", { commandName, message });
  }
}
