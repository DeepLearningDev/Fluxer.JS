import { FluxerBot } from "./core/Bot.js";
import { FluxerClient } from "./core/Client.js";
import { MockTransport } from "./core/MockTransport.js";

const transport = new MockTransport();
const client = new FluxerClient(transport);

const bot = new FluxerBot({
  name: "StarterBot",
  prefix: "!",
  hooks: {
    commandNotFound: async ({ message, commandName }) => {
      if (commandName.length > 0) {
        console.log(`Unknown command "${commandName}" from ${message.author.username}`);
      }
    },
    commandError: async ({ error, commandContext }) => {
      console.error(`Command "${commandContext.commandName}" failed:`, error.message);
      await commandContext.reply("Something went wrong while running that command.");
    }
  }
});

bot.guard(({ message }) => {
  if (message.channel.type === "dm") {
    return "Commands are disabled in DMs for this bot.";
  }

  return true;
});

bot.use(async (context, next) => {
  const startedAt = Date.now();
  await next();
  context.state.durationMs = Date.now() - startedAt;
  console.log(`Command "${context.commandName}" finished in ${context.state.durationMs}ms`);
});

bot.command({
  name: "ping",
  description: "Check whether the bot is alive.",
  execute: async ({ reply, state }) => {
    await reply("pong");
    state.lastCommand = "ping";
  }
});

bot.command({
  name: "echo",
  description: "Echo back the provided message.",
  guards: [
    ({ args }) => {
      if (args.length === 0) {
        return "Provide text to echo.";
      }

      return true;
    }
  ],
  execute: async ({ args, reply }) => {
    const content = args.join(" ").trim();
    await reply(content);
  }
});

client.on("ready", ({ connectedAt }) => {
  console.log(`Connected at ${connectedAt.toISOString()}`);
});

client.registerBot(bot);
await client.connect();

await transport.injectMessage({
  id: "msg_1",
  content: "!ping",
  author: {
    id: "user_1",
    username: "kaleb"
  },
  channel: {
    id: "general",
    name: "general",
    type: "text"
  },
  createdAt: new Date()
});

await transport.injectMessage({
  id: "msg_3",
  content: "!missing",
  author: {
    id: "user_1",
    username: "kaleb"
  },
  channel: {
    id: "general",
    name: "general",
    type: "text"
  },
  createdAt: new Date()
});

await transport.injectMessage({
  id: "msg_2",
  content: "!echo Fluxer bot framework online",
  author: {
    id: "user_1",
    username: "kaleb"
  },
  channel: {
    id: "general",
    name: "general",
    type: "text"
  },
  createdAt: new Date()
});
