# Fluxer.JS

TypeScript framework for building bots on Fluxer.

## Current scope

This bootstrap gives you a clean starting point for a bot SDK:

- Strongly typed message and command contracts
- A lightweight `FluxerClient` event layer
- A transport abstraction for real Fluxer adapters later
- A reusable `FluxerBot` base class
- Command registration and prefix parsing
- An example bot entrypoint for local iteration

## Getting started

```bash
npm install
npm run dev
```

## Example

```ts
import { FluxerBot, FluxerClient } from "fluxer-js";

const client = new FluxerClient();
const bot = new FluxerBot({
  name: "EchoBot",
  prefix: "!"
});

bot.command({
  name: "ping",
  description: "Replies with pong",
  execute: async ({ reply }) => {
    await reply("pong");
  }
});

client.registerBot(bot);
await client.connect();
```

## Project layout

- `src/core` contains the reusable framework pieces
- `src/example.ts` shows how a Fluxer bot is composed
- `src/index.ts` exports the public API

## Transport layers

The framework now supports three transport patterns:

- `MockTransport` for local development and tests
- `RestTransport` for outbound HTTP actions like sending messages
- `GatewayTransport` for realtime inbound events over WebSocket

If Fluxer uses separate HTTP and gateway channels, combine them with `PlatformTransport`.

The current implementation follows the official Fluxer docs:

- Discovery document: `GET /v1/.well-known/fluxer`
- Gateway bootstrap: `GET /v1/gateway/bot`
- Message send: `POST /v1/channels/{channel_id}/messages`
- Bot auth header: `Authorization: Bot <token>`

The gateway session layer currently assumes Discord-style gateway lifecycle semantics as an inference from Fluxer's quickstart guidance that the gateway is Discord-compatible. The official lifecycle page is still `TBD`, so the SDK treats these parts as adapter-safe defaults rather than a final protocol guarantee:

- `HELLO` starts the heartbeat loop
- `HEARTBEAT_ACK` clears the pending heartbeat state
- `RECONNECT` and invalid session payloads trigger reconnect
- `IDENTIFY` can be generated automatically from the bot token

```ts
import {
  FluxerBot,
  FluxerClient,
  createFluxerPlatformTransport,
  defaultParseMessageEvent
} from "fluxer-js";

const transport = await createFluxerPlatformTransport({
  instanceUrl: "https://api.fluxer.app",
  auth: { token: process.env.FLUXER_TOKEN ?? "" },
  intents: 513,
  parseMessageEvent: defaultParseMessageEvent
});

const client = new FluxerClient(transport);
```

## Progress

Current state is the SDK foundation layer:

- Command parsing and bot lifecycle are in place
- The client is now transport-driven instead of hard-coded to console output
- `MockTransport` supports local development while the real Fluxer transport is built

This is still not a production framework. The biggest missing pieces are:

- Full gateway event opcode and payload coverage
- Rich message payload builders for embeds and attachments
- Middleware, permissions, and richer command routing
- Testing, packaging, and versioned API guarantees

## Next steps

- Replace the simulated transport with real Fluxer API/websocket adapters
- Add middleware, permissions, and richer event types
- Add test coverage around command routing and client lifecycle
