# REST Error Codes

This document describes the current error codes emitted by `RestTransport`.

REST-side failures are surfaced as `RestTransportError`.

Each instance includes:

- `message`
- `code`
- `retryable`
- `status?`
- `details?`

## Shared Fields

### `retryable`

Whether the failure is considered recoverable in principle.

This does not guarantee an automatic retry. It only classifies the failure.

### `status`

Optional HTTP status code for response-based failures.

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
}
```

Typical fix:

- provide `baseUrl`, `discovery`, or `instanceUrl`

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
  method: "POST";
  url: string;
  channelId: string;
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
  method: "POST";
  url: string;
  channelId: string;
  statusText: string;
  responseBody?: string;
}
```

Typical fix:

- inspect auth, permissions, payload validity, or server behavior depending on the status code

## Practical Usage

```ts
client.on("error", (error) => {
  if (error instanceof RestTransportError) {
    console.error(error.code, error.status, error.retryable, error.details);
  }
});
```

For gateway-side failures, see [GatewayErrorCodes.md](./GatewayErrorCodes.md).
