import type {
  FluxerChannel,
  FluxerGatewayDispatchEvent,
  FluxerGuild,
  FluxerMessage,
  FluxerUser
} from "../core/types.js";

export function createTestUser(overrides: Partial<FluxerUser> = {}): FluxerUser {
  return {
    id: "user_1",
    username: "fluxguy",
    ...overrides
  };
}

export function createTestChannel(overrides: Partial<FluxerChannel> = {}): FluxerChannel {
  return {
    id: "general",
    name: "general",
    type: "text",
    ...overrides
  };
}

export function createTestGuild(overrides: Partial<FluxerGuild> = {}): FluxerGuild {
  return {
    id: "guild_1",
    name: "Fluxer Test Guild",
    ...overrides
  };
}

export function createTestMessage(
  content = "!ping",
  overrides: Partial<FluxerMessage> = {}
): FluxerMessage {
  return {
    id: "msg_1",
    content,
    author: createTestUser(),
    channel: createTestChannel(),
    createdAt: new Date(),
    ...overrides
  };
}

export function createTestGatewayDispatch(
  type: string,
  data: Record<string, unknown>,
  overrides: Partial<FluxerGatewayDispatchEvent> = {}
): FluxerGatewayDispatchEvent {
  return {
    type,
    sequence: overrides.sequence ?? 1,
    data,
    raw: overrides.raw ?? {
      op: 0,
      d: data,
      s: overrides.sequence ?? 1,
      t: type
    }
  };
}
