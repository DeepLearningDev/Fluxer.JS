import type {
  FluxerEmbed,
  FluxerEmbedAuthor,
  FluxerEmbedField,
  FluxerEmbedFooter,
  FluxerEmbedImage,
  MessageBuilderLike,
  SendMessagePayload
} from "./types.js";

export class EmbedBuilder {
  #embed: FluxerEmbed = {};

  public setTitle(title: string): this {
    this.#embed.title = title;
    return this;
  }

  public setDescription(description: string): this {
    this.#embed.description = description;
    return this;
  }

  public setUrl(url: string): this {
    this.#embed.url = url;
    return this;
  }

  public setColor(color: number): this {
    this.#embed.color = color;
    return this;
  }

  public setTimestamp(timestamp: Date | string = new Date()): this {
    this.#embed.timestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
    return this;
  }

  public setFooter(footer: FluxerEmbedFooter): this {
    this.#embed.footer = footer;
    return this;
  }

  public setAuthor(author: FluxerEmbedAuthor): this {
    this.#embed.author = author;
    return this;
  }

  public setImage(image: FluxerEmbedImage): this {
    this.#embed.image = image;
    return this;
  }

  public setThumbnail(thumbnail: FluxerEmbedImage): this {
    this.#embed.thumbnail = thumbnail;
    return this;
  }

  public addField(field: FluxerEmbedField): this {
    this.#embed.fields ??= [];
    this.#embed.fields.push(field);
    return this;
  }

  public addFields(fields: FluxerEmbedField[]): this {
    for (const field of fields) {
      this.addField(field);
    }

    return this;
  }

  public toJSON(): FluxerEmbed {
    return {
      ...this.#embed,
      footer: this.#embed.footer ? { ...this.#embed.footer } : undefined,
      author: this.#embed.author ? { ...this.#embed.author } : undefined,
      image: this.#embed.image ? { ...this.#embed.image } : undefined,
      thumbnail: this.#embed.thumbnail ? { ...this.#embed.thumbnail } : undefined,
      fields: this.#embed.fields?.map((field) => ({ ...field }))
    };
  }
}

export class MessageBuilder {
  #payload: Omit<SendMessagePayload, "channelId"> = {};

  public setContent(content: string): this {
    this.#payload.content = content;
    return this;
  }

  public setNonce(nonce: string): this {
    this.#payload.nonce = nonce;
    return this;
  }

  public setMessageReference(
    messageReference: Omit<NonNullable<SendMessagePayload["messageReference"]>, never>
  ): this {
    this.#payload.messageReference = { ...messageReference };
    return this;
  }

  public addEmbed(embed: EmbedBuilder | FluxerEmbed): this {
    this.#payload.embeds ??= [];
    this.#payload.embeds.push(embed instanceof EmbedBuilder ? embed.toJSON() : { ...embed });
    return this;
  }

  public addEmbeds(embeds: Array<EmbedBuilder | FluxerEmbed>): this {
    for (const embed of embeds) {
      this.addEmbed(embed);
    }

    return this;
  }

  public toJSON(): Omit<SendMessagePayload, "channelId"> {
    return {
      ...this.#payload,
      messageReference: this.#payload.messageReference
        ? { ...this.#payload.messageReference }
        : undefined,
      embeds: this.#payload.embeds?.map((embed) => ({
        ...embed,
        footer: embed.footer ? { ...embed.footer } : undefined,
        author: embed.author ? { ...embed.author } : undefined,
        image: embed.image ? { ...embed.image } : undefined,
        thumbnail: embed.thumbnail ? { ...embed.thumbnail } : undefined,
        fields: embed.fields?.map((field) => ({ ...field }))
      }))
    };
  }
}

export function resolveMessagePayload(
  message: string | Omit<SendMessagePayload, "channelId"> | MessageBuilderLike
): Omit<SendMessagePayload, "channelId"> {
  if (typeof message === "string") {
    return { content: message };
  }

  if ("toJSON" in message && typeof message.toJSON === "function") {
    return message.toJSON();
  }

  const payload = message as Omit<SendMessagePayload, "channelId">;

  return {
    ...payload,
    messageReference: payload.messageReference ? { ...payload.messageReference } : undefined,
    embeds: payload.embeds?.map((embed) => ({
      ...embed,
      footer: embed.footer ? { ...embed.footer } : undefined,
      author: embed.author ? { ...embed.author } : undefined,
      image: embed.image ? { ...embed.image } : undefined,
      thumbnail: embed.thumbnail ? { ...embed.thumbnail } : undefined,
      fields: embed.fields?.map((field: FluxerEmbedField) => ({ ...field }))
    }))
  };
}
