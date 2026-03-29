# Waits And Collectors

`Fluxer.JS` exposes three small conversation primitives for reply-driven flows:

- `client.waitFor(...)` for any client event
- `client.waitForMessage(...)` for one matching inbound message
- `client.createMessageCollector(...)` for multi-message capture over time

These primitives stay narrow on purpose. They are meant to cover common bot conversations without forcing a larger orchestration framework into the core package.

## `client.waitFor(...)`

Use `waitFor(...)` when you want one matching event and already know the event name.

```ts
const typing = await client.waitFor("typingStart", {
  timeoutMs: 5_000,
  filter: (event) => event.channelId === "general"
});
```

Key behavior:

- resolves on the first matching event
- rejects with `WAIT_FOR_TIMEOUT` when `timeoutMs` expires
- rejects with `WAIT_FOR_ABORTED` when the provided `AbortSignal` aborts
- removes its internal event and abort listeners after it settles

## `client.waitForMessage(...)`

Use `waitForMessage(...)` when you want a single inbound message that matches author, channel, bot-policy, or a custom filter.

```ts
const reply = await client.waitForMessage({
  authorId: message.author.id,
  channelId: message.channel.id,
  timeoutMs: 10_000,
  filter: (incoming) => incoming.content.toLowerCase() === "yes"
});
```

Defaults worth remembering:

- bot messages are ignored unless `includeBots: true`
- the wait does not inspect old history; it only watches new inbound events
- aborts use the same typed `WAIT_FOR_ABORTED` error as `waitFor(...)`

## `context.awaitReply(...)`

`awaitReply(...)` is the command-context convenience wrapper around `client.waitForMessage(...)`.

```ts
bot.command({
  name: "confirm",
  execute: async ({ reply, awaitReply }) => {
    await reply("Reply with yes to confirm.");

    const confirmation = await awaitReply({
      timeoutMs: 10_000,
      filter: (message) => message.content.toLowerCase() === "yes"
    });

    await reply(`confirmed:${confirmation.id}`);
  }
});
```

Defaults:

- `authorId` defaults to the invoking author
- `channelId` defaults to the invoking channel
- `signal`, `timeoutMs`, `includeBots`, and `filter` still pass through

That makes it the right default for simple request-response command flows.

## `client.createMessageCollector(...)`

Use a collector when one reply is not enough.

```ts
const collector = client.createMessageCollector({
  channelId: "general",
  max: 3,
  idleMs: 15_000
});

collector.on("collect", (message) => {
  console.log("collected", message.content);
});

const result = await collector.wait();
console.log(result.reason, result.collected.length);
```

Collector stop reasons:

- `manual`
- `limit`
- `timeout`
- `idle`
- `abort`

Collector behavior:

- `wait()` resolves with `{ collected, reason }`
- collectors stop cleanly when their abort signal aborts
- collectors remove their internal listeners after they end

## Abort Pattern

Use `AbortController` when the surrounding workflow should cancel the wait explicitly.

```ts
const controller = new AbortController();

const waitPromise = client.waitForMessage({
  channelId: "general",
  timeoutMs: 30_000,
  signal: controller.signal
});

setTimeout(() => controller.abort(), 5_000);

await waitPromise;
```

This is especially useful when:

- a command flow has multiple branches
- a parent task times out before the wait should
- UI or operator input cancels the current conversation

## Recommendation

Use the smallest primitive that matches the job:

- one event: `waitFor(...)`
- one reply: `waitForMessage(...)` or `awaitReply(...)`
- several replies over time: `createMessageCollector(...)`
