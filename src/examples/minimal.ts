import { FluxerBot, FluxerClient, MockTransport } from "../index.js";

const transport = new MockTransport();
const client = new FluxerClient(transport);
const bot = new FluxerBot({
  name: "HelloBot",
  prefix: "!"
});

bot.command({
  name: "ping",
  description: "Reply with pong.",
  execute: async ({ reply }) => {
    await reply("pong");
  }
});

client.on("ready", () => {
  console.log("HelloBot is ready.");
});

client.registerBot(bot);
await client.connect();

await transport.injectMessage({
  id: "msg_1",
  content: "!ping",
  author: {
    id: "user_1",
    username: "fluxguy"
  },
  channel: {
    id: "general",
    name: "general",
    type: "text"
  },
  createdAt: new Date()
});

console.log(transport.sentMessages[0]?.content);
