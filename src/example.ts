import { FluxerBot } from "./core/Bot.js";
import { FluxerClient } from "./core/Client.js";
import { MockTransport } from "./core/MockTransport.js";

const transport = new MockTransport();
const client = new FluxerClient(transport);

const bot = new FluxerBot({
  name: "StarterBot",
  prefix: "!"
});

bot.command({
  name: "ping",
  description: "Check whether the bot is alive.",
  execute: async ({ reply }) => {
    await reply("pong");
  }
});

bot.command({
  name: "echo",
  description: "Echo back the provided message.",
  execute: async ({ args, reply }) => {
    const content = args.join(" ").trim();
    await reply(content.length > 0 ? content : "Nothing to echo.");
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
