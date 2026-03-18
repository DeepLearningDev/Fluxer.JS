# Payload Builders

`Fluxer.JS` treats outbound message payloads as framework-owned objects rather than loose JSON blobs. The builder layer exists to reduce bot boilerplate while making malformed payloads fail early and predictably.

## Main surfaces

- `MessageBuilder` composes outbound message payloads.
- `EmbedBuilder` handles embed structure and higher-level convenience helpers.
- `AttachmentBuilder` handles outbound file metadata and binary/text/json content.
- `createEmbedTemplate(...)` and `createMessageTemplate(...)` let you reuse validated payload bases.
- `serializeMessagePayload(...)` exposes the JSON-safe payload shape sent through the REST serializer.
- `validateMessagePayload(...)` enforces framework-level payload rules before transport send.

## Embed ergonomics

```ts
import { EmbedBuilder } from "fluxer-js";

const embed = new EmbedBuilder()
  .setTitle("Release Status")
  .setDescription("All checks passed.")
  .setColorHex("#16a34a")
  .setTimestampNow()
  .setFooter("Fluxer.JS")
  .addInlineField("Latency", "42ms")
  .addFieldsFromRecord({
    Region: "us-east",
    Healthy: true
  }, { inline: true });
```

Useful convenience methods:

- `setColorHex(...)` parses `#rrggbb` style colors.
- `setTimestampNow()` sets the embed timestamp to the current time.
- `addInlineField(name, value)` creates inline fields without repeating the object shape.
- `addFieldsFromRecord(...)` helps turn small status maps into fields quickly.
- `setAttachmentImage(...)` and `setAttachmentThumbnail(...)` wire embeds to outbound attachments.

## Attachment builders

```ts
import { AttachmentBuilder, MessageBuilder } from "fluxer-js";

const payload = new MessageBuilder()
  .setContent("Deployment artifact")
  .addAttachment(
    new AttachmentBuilder()
      .setFilename("deploy.json")
      .setJson({ ok: true, version: "0.1-alpha" }, 2)
  )
  .addAttachment(
    new AttachmentBuilder()
      .setFilename("graph.png")
      .setContentType("image/png")
      .setData(new Uint8Array([1, 2, 3]))
  );
```

Useful convenience methods:

- `setText(...)` creates text attachments with a default UTF-8 content type.
- `setJson(...)` serializes structured JSON and applies an `application/json` content type.
- `setSpoiler(true)` marks the outgoing filename with the spoiler prefix during serialization.

## Serializer preview

`serializeMessagePayload(...)` gives you the exact JSON-safe payload sent as the request body for plain messages, or as `payload_json` inside multipart attachment requests.

```ts
import {
  AttachmentBuilder,
  EmbedBuilder,
  MessageBuilder,
  serializeMessagePayload
} from "fluxer-js";

const payload = serializeMessagePayload(
  new MessageBuilder()
    .setContent("Report ready")
    .addAttachment(
      new AttachmentBuilder()
        .setFilename("report.json")
        .setJson({ ok: true })
    )
    .addEmbed(
      new EmbedBuilder()
        .setTitle("Report")
        .setAttachmentThumbnail("report.png")
    )
);

console.log(payload);
```

The result shape looks like:

```ts
{
  content: "Report ready",
  attachments: [
    { id: 0, filename: "report.json" }
  ],
  embeds: [
    {
      title: "Report",
      thumbnail: { url: "attachment://report.png" }
    }
  ]
}
```

## Transport behavior

- If there are no attachments, `RestTransport` sends JSON.
- If attachments are present, `RestTransport` sends `multipart/form-data`.
- The multipart body contains:
  - `payload_json` with the output of `serializeMessagePayload(...)`
  - `files[0]`, `files[1]`, and so on for each attachment blob

This means bot code can stay at the builder level while the framework handles the transport switch automatically.

## Validation rules

Current framework-owned validation includes:

- messages must include content, embeds, or attachments
- attachment filenames cannot be empty
- attachment filenames must be unique within one message
- attachment data is required
- embed fields require non-empty names and values
- `attachment://...` embed references must point at outgoing attachments
- attachment-backed embed image/thumbnail references must point at image-like filenames

Validation failures throw `PayloadValidationError`, which keeps malformed payloads from reaching the transport layer.

## Current limits

- Attachment support currently focuses on outbound message serialization.
- The framework does not yet expose dedicated upload/edit/delete attachment lifecycle APIs.
- Builder validation only covers the rules that the SDK currently owns with confidence.
