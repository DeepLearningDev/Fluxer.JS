# REST Error Codes

This document describes the current error codes emitted by `RestTransport`.

REST-side failures are surfaced as `RestTransportError`.

Each instance includes:

- `message`
- `code`
- `retryable`
- `status?`
- `retryAfterMs?`
- `details?`

## Shared Fields

### `retryable`

Whether the failure is considered recoverable in principle.

This does not guarantee an automatic retry. It only classifies the failure.

### `status`

Optional HTTP status code for response-based failures.

### `retryAfterMs`

Optional retry hint for rate-limit failures.

When present, this is the transport's best-effort delay recommendation in milliseconds before retrying the request.

### `details`

Optional structured metadata that depends on the error code.

## Error Codes

### `REST_CONFIGURATION_INVALID`

Meaning:

- the transport could not determine an API base URL because `baseUrl`, `discovery`, and `instanceUrl` were all missing

Retryable:

- `false`

Details:

```ts
{
  hasBaseUrl: boolean;
  hasDiscovery: boolean;
  hasInstanceUrl: boolean;
  limit?: number;
}
```

Typical fix:

- provide `baseUrl`, `discovery`, or `instanceUrl`
- when calling `listMessages(...)`, keep `limit` within the documented `1-100` range

### `REST_DISCOVERY_FAILED`

Meaning:

- the transport failed while fetching the instance discovery document

Retryable:

- `true`

Details:

```ts
{
  instanceUrl: string;
  message: string;
}
```

Typical fix:

- inspect instance reachability and discovery endpoint behavior

### `REST_REQUEST_FAILED`

Meaning:

- the outbound request failed before a response was received

Retryable:

- `true`

Details:

```ts
{
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  channelId?: string;
  messageId?: string;
  message: string;
}
```

Typical fix:

- inspect network failures, DNS, TLS, proxy behavior, or the custom `fetchImpl`

### `REST_HTTP_ERROR`

Meaning:

- the request completed, but the API returned a non-2xx HTTP response

Retryable:

- `true` for `5xx`
- `false` for `4xx`

Details:

```ts
{
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  channelId?: string;
  messageId?: string;
  statusText: string;
  responseBody?: string;
}
```

Typical fix:

- inspect auth, permissions, payload validity, or server behavior depending on the status code

### `REST_RATE_LIMITED`

Meaning:

- the request completed with HTTP `429`, and the transport extracted retry metadata from headers or the response body when available

Retryable:

- `true`

Details:

```ts
{
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  channelId?: string;
  messageId?: string;
  statusText: string;
  responseBody?: string;
  retryAfterMs?: number;
  retryAfterSource?: "header" | "reset_after" | "body";
  bucket?: string;
  global?: boolean;
}
```

Typical fix:

- wait at least `retryAfterMs` when present before retrying
- inspect instance-specific rate-limit headers or body metadata if `retryAfterMs` is absent
- avoid treating rate limits as generic permission or payload failures

### `REST_RESPONSE_INVALID`

Meaning:

- the request succeeded, but the response body was not valid JSON or did not include the minimum fields needed for the current operation

Retryable:

- `false`

Details:

```ts
{
  method?: "GET" | "PATCH";
  url?: string;
  channelId?: string;
  messageId?: string;
  payload?: unknown;
}
```

Typical fix:

- inspect the instance response body and verify the endpoint still matches the expected Fluxer message contract
- check custom proxies or adapters that may be rewriting the response

This can also happen when `listMessages(...)` returns something other than a JSON array of message objects.

## Practical Usage

```ts
client.on("error", (error) => {
  if (error instanceof RestTransportError) {
    console.error(error.code, error.status, error.retryable, error.details);
  }
});
```

For gateway-side failures, see [GatewayErrorCodes.md](./GatewayErrorCodes.md).
