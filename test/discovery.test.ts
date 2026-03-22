import assert from "node:assert/strict";
import test from "node:test";
import {
  DiscoveryError,
  fetchGatewayInformation,
  fetchInstanceDiscoveryDocument
} from "../src/index.js";

test("emits typed diagnostics when discovery document requests fail before a response", async () => {
  await assert.rejects(async () => {
    await fetchInstanceDiscoveryDocument({
      instanceUrl: "https://fluxer.local",
      fetchImpl: async () => {
        throw new Error("network down");
      }
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "DISCOVERY_REQUEST_FAILED");
    assert.equal(error.retryable, true);
    assert.equal(error.status, undefined);
    assert.deepEqual(error.details, {
      url: "https://fluxer.local/v1/.well-known/fluxer",
      instanceUrl: "https://fluxer.local",
      message: "network down"
    });
    return true;
  });
});

test("emits typed diagnostics for discovery document http failures", async () => {
  await assert.rejects(async () => {
    await fetchInstanceDiscoveryDocument({
      instanceUrl: "https://fluxer.local",
      fetchImpl: async () => new Response("denied", {
        status: 403,
        statusText: "Forbidden"
      })
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "DISCOVERY_HTTP_ERROR");
    assert.equal(error.retryable, false);
    assert.equal(error.status, 403);
    assert.deepEqual(error.details, {
      url: "https://fluxer.local/v1/.well-known/fluxer",
      instanceUrl: "https://fluxer.local",
      statusText: "Forbidden",
      responseBody: "denied"
    });
    return true;
  });
});

test("emits typed diagnostics when gateway bootstrap requests fail before a response", async () => {
  await assert.rejects(async () => {
    await fetchGatewayInformation({
      apiBaseUrl: "https://fluxer.local/api",
      auth: {
        token: "secret"
      },
      fetchImpl: async () => {
        throw new Error("socket hang up");
      }
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "GATEWAY_INFO_REQUEST_FAILED");
    assert.equal(error.retryable, true);
    assert.equal(error.status, undefined);
    assert.deepEqual(error.details, {
      url: "https://fluxer.local/api/v1/gateway/bot",
      apiBaseUrl: "https://fluxer.local/api",
      message: "socket hang up"
    });
    return true;
  });
});

test("emits typed diagnostics for gateway bootstrap http failures", async () => {
  await assert.rejects(async () => {
    await fetchGatewayInformation({
      apiBaseUrl: "https://fluxer.local/api",
      auth: {
        token: "secret"
      },
      fetchImpl: async () => new Response("busy", {
        status: 503,
        statusText: "Service Unavailable"
      })
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "GATEWAY_INFO_HTTP_ERROR");
    assert.equal(error.retryable, true);
    assert.equal(error.status, 503);
    assert.deepEqual(error.details, {
      url: "https://fluxer.local/api/v1/gateway/bot",
      apiBaseUrl: "https://fluxer.local/api",
      statusText: "Service Unavailable",
      responseBody: "busy"
    });
    return true;
  });
});

test("emits typed diagnostics for invalid discovery document json", async () => {
  await assert.rejects(async () => {
    await fetchInstanceDiscoveryDocument({
      instanceUrl: "https://fluxer.local",
      fetchImpl: async () => new Response("{", {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "DISCOVERY_RESPONSE_INVALID");
    assert.equal(error.retryable, false);
    assert.equal(error.status, 200);
    assert.equal(error.details?.url, "https://fluxer.local/v1/.well-known/fluxer");
    assert.equal(error.details?.instanceUrl, "https://fluxer.local");
    assert.equal(typeof error.details?.message, "string");
    return true;
  });
});

test("emits typed diagnostics for invalid gateway bootstrap json", async () => {
  await assert.rejects(async () => {
    await fetchGatewayInformation({
      apiBaseUrl: "https://fluxer.local/api",
      auth: {
        token: "secret"
      },
      fetchImpl: async () => new Response("{", {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "GATEWAY_INFO_RESPONSE_INVALID");
    assert.equal(error.retryable, false);
    assert.equal(error.status, 200);
    assert.equal(error.details?.url, "https://fluxer.local/api/v1/gateway/bot");
    assert.equal(error.details?.apiBaseUrl, "https://fluxer.local/api");
    assert.equal(typeof error.details?.message, "string");
    return true;
  });
});

test("keeps discovery http failures typed when reading the response body fails", async () => {
  const response = new Response(null, {
    status: 502,
    statusText: "Bad Gateway"
  });

  response.text = async () => {
    throw new Error("body stream failed");
  };

  await assert.rejects(async () => {
    await fetchInstanceDiscoveryDocument({
      instanceUrl: "https://fluxer.local",
      fetchImpl: async () => response
    });
  }, (error: unknown) => {
    assert.ok(error instanceof DiscoveryError);
    assert.equal(error.code, "DISCOVERY_HTTP_ERROR");
    assert.equal(error.retryable, true);
    assert.equal(error.status, 502);
    assert.deepEqual(error.details, {
      url: "https://fluxer.local/v1/.well-known/fluxer",
      instanceUrl: "https://fluxer.local",
      statusText: "Bad Gateway",
      responseBodyReadFailed: true,
      responseBodyReadError: "body stream failed"
    });
    return true;
  });
});
