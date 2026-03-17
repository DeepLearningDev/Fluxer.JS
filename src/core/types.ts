export interface FluxerUser {
  id: string;
  username: string;
  displayName?: string;
  isBot?: boolean;
}

export interface FluxerChannel {
  id: string;
  name: string;
  type: "dm" | "group" | "text";
}

export interface FluxerMessage {
  id: string;
  content: string;
  author: FluxerUser;
  channel: FluxerChannel;
  createdAt: Date;
}

export interface SendMessagePayload {
  channelId: string;
  content: string;
  nonce?: string;
  messageReference?: FluxerMessageReference;
}

export interface FluxerAuth {
  token: string;
  scheme?: string;
}

export interface FluxerMessageReference {
  messageId: string;
  channelId?: string;
  guildId?: string;
  type?: number;
}

export interface CommandContext {
  client: FluxerClientLike;
  bot: FluxerBotLike;
  message: FluxerMessage;
  args: string[];
  commandName: string;
  reply: (content: string) => Promise<void>;
}

export interface FluxerCommand {
  name: string;
  aliases?: string[];
  description?: string;
  execute: (context: CommandContext) => Promise<void> | void;
}

export interface FluxerBotOptions {
  name: string;
  prefix?: string;
  ignoreBots?: boolean;
}

export interface FluxerEventMap {
  ready: { connectedAt: Date };
  messageCreate: FluxerMessage;
  commandExecuted: { commandName: string; message: FluxerMessage };
  error: Error;
}

export type FluxerMessageHandler = (message: FluxerMessage) => Promise<void> | void;

export interface FluxerTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(payload: SendMessagePayload): Promise<void>;
  onMessage(handler: FluxerMessageHandler): void;
}

export interface FluxerReconnectOptions {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface FluxerGatewayInfo {
  url: string;
  shards: number;
  session_start_limit: {
    total: number;
    remaining: number;
    reset_after: number;
    max_concurrency: number;
  };
}

export interface FluxerInstanceDiscoveryDocument {
  api_code_version: number;
  endpoints: {
    api: string;
    api_client: string;
    api_public: string;
    gateway: string;
    media: string;
    static_cdn: string;
    marketing: string;
    admin: string;
    invite: string;
    gift: string;
    webapp: string;
  };
  features: Record<string, boolean>;
  federation?: {
    enabled: boolean;
    version: number;
  };
}

export interface FluxerRestTransportOptions {
  baseUrl?: string;
  instanceUrl?: string;
  auth?: FluxerAuth;
  fetchImpl?: typeof fetch;
  sendMessagePath?: (channelId: string) => string;
  headers?: Record<string, string>;
  userAgent?: string;
}

export interface FluxerGatewayTransportOptions {
  url?: string;
  apiBaseUrl?: string;
  instanceUrl?: string;
  auth?: FluxerAuth;
  protocols?: string | string[];
  fetchImpl?: typeof fetch;
  webSocketFactory?: (url: string, protocols?: string | string[]) => WebSocket;
  identifyPayload?: unknown;
  reconnect?: FluxerReconnectOptions;
  parseMessageEvent: (payload: unknown) => FluxerMessage | null;
}

export interface FluxerClientLike {
  isConnected(): boolean;
  sendMessage(channelId: string, content: string): Promise<void>;
}

export interface FluxerBotLike {
  readonly name: string;
  readonly prefix: string;
}
