import test from "node:test";
import assert from "node:assert/strict";
import { FluxerBot } from "../src/core/Bot.js";
import { EmbedBuilder, MessageBuilder, resolveMessagePayload } from "../src/core/builders.js";
import { parseCommandInput } from "../src/core/CommandParser.js";
import { FluxerClient } from "../src/core/Client.js";
import { defaultParseDispatchEvent } from "../src/core/createPlatformTransport.js";
import { GatewayProtocolError, GatewayTransportError } from "../src/core/errors.js";
import { GatewayTransport } from "../src/core/GatewayTransport.js";
import { MockTransport } from "../src/core/MockTransport.js";
import { createPermissionGuard } from "../src/core/Permissions.js";
import { createEssentialsPlugin } from "../src/plugins/essentials.js";
import type { FluxerCommand, FluxerMessage, SendMessagePayload } from "../src/core/types.js";

function createMessage(content: string, overrides: Partial<FluxerMessage> = {}): FluxerMessage {
  return {
    id: "msg_1",
    content,
    author: {
      id: "user_1",
      username: "fluxguy"
    },
    channel: {
      id: "general",
      name: "general",
      type: "text"
    },
    createdAt: new Date(),
    ...overrides
  };
}

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  public readyState = FakeWebSocket.CONNECTING;
  public readonly sent: string[] = [];
  readonly #listeners = new Map<string, Array<(event?: { data?: unknown }) => void>>();

  public addEventListener(type: string, listener: (event?: { data?: unknown }) => void): void {
    const listeners = this.#listeners.get(type) ?? [];
    listeners.push(listener);
    this.#listeners.set(type, listeners);
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.#emit("close");
  }

  public emitOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.#emit("open");
  }

  public emitMessage(data: unknown): void {
    this.#emit("message", { data: JSON.stringify(data) });
  }

  public emitError(): void {
    this.#emit("error");
  }

  #emit(type: string, event?: { data?: unknown }): void {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

test("runs middleware before executing commands", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const calls: string[] = [];

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  bot.use(async (context, next) => {
    calls.push(`before:${context.commandName}`);
    await next();
    calls.push(`after:${context.commandName}`);
  });

  bot.command({
    name: "ping",
    execute: async () => {
      calls.push("execute:ping");
    }
  });

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!ping"));

  assert.deepEqual(calls, ["before:ping", "execute:ping", "after:ping"]);
});

test("blocks commands when permission guards fail", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const replies: Array<Omit<SendMessagePayload, "channelId">> = [];

  client.sendMessage = async (_channelId, message) => {
    if (typeof message === "string") {
      replies.push({ content: message });
      return;
    }

    if ("toJSON" in message && typeof message.toJSON === "function") {
      replies.push(message.toJSON());
      return;
    }

    replies.push(message as Omit<SendMessagePayload, "channelId">);
  };

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  const restrictedCommand: FluxerCommand = {
    name: "admin",
    guards: [
      createPermissionGuard({
        allowUserIds: ["operator_1"],
        reason: "No access."
      })
    ],
    execute: () => {
      throw new Error("should not run");
    }
  };

  bot.command(restrictedCommand);

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!admin"));

  assert.deepEqual(replies, [{ content: "No access." }]);
});

test("installs module commands once even if the module is re-used", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  let executions = 0;

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  const moduleCommand: FluxerCommand = {
    name: "once",
    execute: async () => {
      executions += 1;
    }
  };

  const module = {
    name: "utility",
    commands: [moduleCommand]
  };

  bot.module(module);
  bot.module(module);

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!once"));

  assert.equal(executions, 1);
  assert.deepEqual(bot.modules, ["utility"]);
});

test("fires commandNotFound hooks for missing commands", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const missing: string[] = [];

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!",
    hooks: {
      commandNotFound: ({ commandName }) => {
        missing.push(commandName);
      }
    }
  });

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!unknown"));

  assert.deepEqual(missing, ["unknown"]);
});

test("parses quoted command arguments", () => {
  const parsed = parseCommandInput('!say "hello world" test', "!");

  assert.deepEqual(parsed, {
    commandName: "say",
    args: ["hello world", "test"]
  });
});

test("matches commands case-insensitively by default", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  let executions = 0;

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  bot.command({
    name: "Ping",
    execute: async () => {
      executions += 1;
    }
  });

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!ping"));

  assert.equal(executions, 1);
});

test("throws on duplicate command aliases", () => {
  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  bot.command({
    name: "ping",
    aliases: ["p"],
    execute: async () => {}
  });

  assert.throws(() => {
    bot.command({
      name: "pong",
      aliases: ["p"],
      execute: async () => {}
    });
  }, /already registered/);
});

test("awaits async module setup through installModule", async () => {
  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  const calls: string[] = [];

  await bot.installModule({
    name: "async-module",
    setup: async () => {
      calls.push("setup");
    }
  });

  assert.deepEqual(calls, ["setup"]);
  assert.deepEqual(bot.modules, ["async-module"]);
});

test("rejects async module setup through module()", () => {
  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  assert.throws(() => {
    bot.module({
      name: "async-module",
      setup: async () => {}
    });
  }, /Use installModule\(\)/);
});

test("builds rich message payloads with embeds", () => {
  const payload = new MessageBuilder()
    .setContent("hello")
    .addEmbed(
      new EmbedBuilder()
        .setTitle("Status")
        .setDescription("All systems operational")
        .addField({ name: "Latency", value: "42ms", inline: true })
    )
    .toJSON();

  assert.equal(payload.content, "hello");
  assert.equal(payload.embeds?.[0]?.title, "Status");
  assert.equal(payload.embeds?.[0]?.fields?.[0]?.value, "42ms");
});

test("normalizes string and builder message payloads", () => {
  const fromString = resolveMessagePayload("pong");
  const fromBuilder = resolveMessagePayload(
    new MessageBuilder().setContent("pong").addEmbed(new EmbedBuilder().setTitle("Info"))
  );

  assert.deepEqual(fromString, { content: "pong" });
  assert.equal(fromBuilder.content, "pong");
  assert.equal(fromBuilder.embeds?.[0]?.title, "Info");
});

test("maps gateway dispatch events onto client events", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const events: string[] = [];

  client.on("gatewayDispatch", ({ type }) => {
    events.push(`dispatch:${type}`);
  });

  client.on("guildCreate", (guild) => {
    events.push(`guild:${guild.id}`);
  });

  client.on("messageDelete", (message) => {
    events.push(`message-delete:${message.id}`);
  });

  await client.receiveGatewayDispatch({
    type: "GUILD_CREATE",
    sequence: 1,
    data: {
      id: "guild_1",
      name: "Fluxer HQ"
    },
    raw: {
      op: 0,
      d: {
        id: "guild_1",
        name: "Fluxer HQ"
      },
      s: 1,
      t: "GUILD_CREATE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "MESSAGE_DELETE",
    sequence: 2,
    data: {
      id: "msg_9",
      channel_id: "general"
    },
    raw: {
      op: 0,
      d: {
        id: "msg_9",
        channel_id: "general"
      },
      s: 2,
      t: "MESSAGE_DELETE"
    }
  });

  assert.deepEqual(events, [
    "dispatch:GUILD_CREATE",
    "guild:guild_1",
    "dispatch:MESSAGE_DELETE",
    "message-delete:msg_9"
  ]);
});

test("parses raw gateway dispatch envelopes", () => {
  const event = defaultParseDispatchEvent({
    op: 0,
    d: { id: "guild_1" },
    s: 10,
    t: "GUILD_DELETE"
  });

  assert.equal(event?.type, "GUILD_DELETE");
  assert.equal(event?.sequence, 10);
});

test("installs plugins and exposes their commands", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const replies: Array<Omit<SendMessagePayload, "channelId">> = [];

  client.sendMessage = async (_channelId, message) => {
    if (typeof message === "string") {
      replies.push({ content: message });
      return;
    }

    if ("toJSON" in message && typeof message.toJSON === "function") {
      replies.push(message.toJSON());
      return;
    }

    replies.push(message as Omit<SendMessagePayload, "channelId">);
  };

  const bot = new FluxerBot({
    name: "TestBot",
    prefix: "!"
  });

  bot.plugin(
    createEssentialsPlugin({
      aboutText: "Fluxer.JS keeps the core sharp."
    })
  );

  client.registerBot(bot);
  await client.connect();
  await transport.injectMessage(createMessage("!about"));

  assert.deepEqual(bot.plugins, ["essentials"]);
  assert.deepEqual(replies, [{ content: "Fluxer.JS keeps the core sharp." }]);
});

test("maps member, presence, typing, and user gateway events", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const events: string[] = [];

  client.on("guildMemberAdd", (member) => {
    events.push(`member-add:${member.user.username}`);
  });

  client.on("presenceUpdate", (presence) => {
    events.push(`presence:${presence.userId}:${presence.status}`);
  });

  client.on("typingStart", (typing) => {
    events.push(`typing:${typing.userId}:${typing.channelId}`);
  });

  client.on("userUpdate", (user) => {
    events.push(`user:${user.username}`);
  });

  await client.receiveGatewayDispatch({
    type: "GUILD_MEMBER_ADD",
    sequence: 3,
    data: {
      guild_id: "guild_1",
      nick: "Flux Guy",
      roles: ["role_1"],
      joined_at: "2026-03-17T05:00:00.000Z",
      user: {
        id: "user_1",
        username: "fluxguy"
      }
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        nick: "Flux Guy",
        roles: ["role_1"],
        joined_at: "2026-03-17T05:00:00.000Z",
        user: {
          id: "user_1",
          username: "fluxguy"
        }
      },
      s: 3,
      t: "GUILD_MEMBER_ADD"
    }
  });

  await client.receiveGatewayDispatch({
    type: "PRESENCE_UPDATE",
    sequence: 4,
    data: {
      user: { id: "user_1" },
      status: "online",
      activities: [{ name: "Building bots", type: 0 }]
    },
    raw: {
      op: 0,
      d: {
        user: { id: "user_1" },
        status: "online",
        activities: [{ name: "Building bots", type: 0 }]
      },
      s: 4,
      t: "PRESENCE_UPDATE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "TYPING_START",
    sequence: 5,
    data: {
      channel_id: "general",
      user_id: "user_1",
      timestamp: 1_763_086_800
    },
    raw: {
      op: 0,
      d: {
        channel_id: "general",
        user_id: "user_1",
        timestamp: 1_763_086_800
      },
      s: 5,
      t: "TYPING_START"
    }
  });

  await client.receiveGatewayDispatch({
    type: "USER_UPDATE",
    sequence: 6,
    data: {
      id: "user_1",
      username: "fluxguy"
    },
    raw: {
      op: 0,
      d: {
        id: "user_1",
        username: "fluxguy"
      },
      s: 6,
      t: "USER_UPDATE"
    }
  });

  assert.deepEqual(events, [
    "member-add:fluxguy",
    "presence:user_1:online",
    "typing:user_1:general",
    "user:fluxguy"
  ]);
});

test("maps role, reaction, and voice gateway events", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const events: string[] = [];

  client.on("roleCreate", (role) => {
    events.push(`role:${role.id}:${role.name}`);
  });

  client.on("messageReactionAdd", (reaction) => {
    events.push(`reaction:${reaction.messageId}:${reaction.emoji.name}`);
  });

  client.on("voiceStateUpdate", (voiceState) => {
    events.push(`voice-state:${voiceState.userId}:${voiceState.channelId}`);
  });

  client.on("voiceServerUpdate", (voiceServer) => {
    events.push(`voice-server:${voiceServer.guildId}:${voiceServer.endpoint}`);
  });

  await client.receiveGatewayDispatch({
    type: "GUILD_ROLE_CREATE",
    sequence: 7,
    data: {
      guild_id: "guild_1",
      role: {
        id: "role_1",
        name: "moderator",
        color: 0xff0000
      }
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        role: {
          id: "role_1",
          name: "moderator",
          color: 0xff0000
        }
      },
      s: 7,
      t: "GUILD_ROLE_CREATE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "MESSAGE_REACTION_ADD",
    sequence: 8,
    data: {
      user_id: "user_1",
      channel_id: "general",
      message_id: "msg_1",
      emoji: {
        name: "wave"
      }
    },
    raw: {
      op: 0,
      d: {
        user_id: "user_1",
        channel_id: "general",
        message_id: "msg_1",
        emoji: {
          name: "wave"
        }
      },
      s: 8,
      t: "MESSAGE_REACTION_ADD"
    }
  });

  await client.receiveGatewayDispatch({
    type: "VOICE_STATE_UPDATE",
    sequence: 9,
    data: {
      guild_id: "guild_1",
      channel_id: "voice_1",
      user_id: "user_1",
      session_id: "session_1",
      self_mute: false
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        channel_id: "voice_1",
        user_id: "user_1",
        session_id: "session_1",
        self_mute: false
      },
      s: 9,
      t: "VOICE_STATE_UPDATE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "VOICE_SERVER_UPDATE",
    sequence: 10,
    data: {
      guild_id: "guild_1",
      token: "voice-token",
      endpoint: "voice.fluxer.app"
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        token: "voice-token",
        endpoint: "voice.fluxer.app"
      },
      s: 10,
      t: "VOICE_SERVER_UPDATE"
    }
  });

  assert.deepEqual(events, [
    "role:role_1:moderator",
    "reaction:msg_1:wave",
    "voice-state:user_1:voice_1",
    "voice-server:guild_1:voice.fluxer.app"
  ]);
});

test("maps moderation and invite gateway events", async () => {
  const transport = new MockTransport();
  const client = new FluxerClient(transport);
  const events: string[] = [];

  client.on("guildBanAdd", (ban) => {
    events.push(`ban-add:${ban.guildId}:${ban.user.username}`);
  });

  client.on("guildBanRemove", (ban) => {
    events.push(`ban-remove:${ban.guildId}:${ban.user.username}`);
  });

  client.on("inviteCreate", (invite) => {
    events.push(`invite-create:${invite.code}:${invite.inviter?.username ?? "unknown"}`);
  });

  client.on("inviteDelete", (invite) => {
    events.push(`invite-delete:${invite.code}:${invite.channelId}`);
  });

  await client.receiveGatewayDispatch({
    type: "GUILD_BAN_ADD",
    sequence: 11,
    data: {
      guild_id: "guild_1",
      user: {
        id: "user_2",
        username: "modtarget"
      }
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        user: {
          id: "user_2",
          username: "modtarget"
        }
      },
      s: 11,
      t: "GUILD_BAN_ADD"
    }
  });

  await client.receiveGatewayDispatch({
    type: "GUILD_BAN_REMOVE",
    sequence: 12,
    data: {
      guild_id: "guild_1",
      user: {
        id: "user_2",
        username: "modtarget"
      }
    },
    raw: {
      op: 0,
      d: {
        guild_id: "guild_1",
        user: {
          id: "user_2",
          username: "modtarget"
        }
      },
      s: 12,
      t: "GUILD_BAN_REMOVE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "INVITE_CREATE",
    sequence: 13,
    data: {
      code: "welcome123",
      channel_id: "general",
      guild_id: "guild_1",
      inviter: {
        id: "user_1",
        username: "fluxguy"
      },
      uses: 0,
      max_uses: 5
    },
    raw: {
      op: 0,
      d: {
        code: "welcome123",
        channel_id: "general",
        guild_id: "guild_1",
        inviter: {
          id: "user_1",
          username: "fluxguy"
        },
        uses: 0,
        max_uses: 5
      },
      s: 13,
      t: "INVITE_CREATE"
    }
  });

  await client.receiveGatewayDispatch({
    type: "INVITE_DELETE",
    sequence: 14,
    data: {
      code: "welcome123",
      channel_id: "general",
      guild_id: "guild_1"
    },
    raw: {
      op: 0,
      d: {
        code: "welcome123",
        channel_id: "general",
        guild_id: "guild_1"
      },
      s: 14,
      t: "INVITE_DELETE"
    }
  });

  assert.deepEqual(events, [
    "ban-add:guild_1:modtarget",
    "ban-remove:guild_1:modtarget",
    "invite-create:welcome123:fluxguy",
    "invite-delete:welcome123:general"
  ]);
});

test("tracks gateway state and resumes sessions on reconnect", async () => {
  const sockets: FakeWebSocket[] = [];
  const states: string[] = [];
  const sessions: Array<{ sessionId?: string; sequence: number | null; resumable: boolean }> = [];
  const debugEvents: string[] = [];

  const transport = new GatewayTransport({
    url: "wss://gateway.fluxer.test",
    auth: { token: "bot-token" },
    reconnect: {
      baseDelayMs: 0,
      maxDelayMs: 0
    },
    webSocketFactory: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    buildIdentifyPayload: ({ auth }) => ({
      op: 2,
      d: { token: auth?.token }
    }),
    parseMessageEvent: () => null
  });

  transport.onGatewayStateChange(({ state }) => {
    states.push(state);
  });

  transport.onGatewaySessionUpdate((session) => {
    sessions.push(session);
  });

  transport.onDebug((event) => {
    debugEvents.push(event.event);
  });

  const connectPromise = transport.connect();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const firstSocket = sockets[0];
  firstSocket.emitOpen();
  await connectPromise;

  firstSocket.emitMessage({
    op: 10,
    d: {
      heartbeat_interval: 1000
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(JSON.parse(firstSocket.sent[0]).op, 2);

  firstSocket.emitMessage({
    op: 0,
    t: "READY",
    s: 1,
    d: {
      session_id: "session_1"
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  firstSocket.close();
  await new Promise((resolve) => setTimeout(resolve, 10));

  const secondSocket = sockets[1];
  secondSocket.emitOpen();
  secondSocket.emitMessage({
    op: 10,
    d: {
      heartbeat_interval: 1000
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(JSON.parse(secondSocket.sent[0]).op, 6);

  secondSocket.emitMessage({
    op: 0,
    t: "RESUMED",
    s: 2,
    d: {}
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(states[0], "connecting");
  assert.ok(states.includes("identifying"));
  assert.ok(states.includes("reconnecting"));
  assert.ok(states.includes("resuming"));
  assert.equal(states.at(-1), "ready");
  assert.equal(sessions.at(-1)?.sessionId, "session_1");
  assert.equal(sessions.at(-1)?.sequence, 2);
  assert.equal(sessions.at(-1)?.resumable, true);
  assert.ok(debugEvents.includes("resume_sent"));
});

test("emits typed protocol errors for invalid sessions", async () => {
  const sockets: FakeWebSocket[] = [];
  const errors: Error[] = [];

  const transport = new GatewayTransport({
    url: "wss://gateway.fluxer.test",
    auth: { token: "bot-token" },
    webSocketFactory: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    parseMessageEvent: () => null
  });

  transport.onError((error) => {
    errors.push(error);
  });

  const connectPromise = transport.connect();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const socket = sockets[0];
  socket.emitOpen();
  await connectPromise;

  socket.emitMessage({
    op: 10,
    d: {
      heartbeat_interval: 1000
    }
  });

  socket.emitMessage({
    op: 9,
    d: false
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(errors.some((error) => error instanceof GatewayProtocolError));
  assert.ok(errors.some((error) => error instanceof GatewayTransportError));
});
