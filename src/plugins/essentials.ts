import {
  describeCommandCatalog,
  defineCommand,
  describeCommand,
  describeCommandGroup,
} from "../core/CommandSchema.js";
import type { FluxerPlugin } from "../core/types.js";

export interface EssentialsPluginOptions {
  aboutText?: string;
  includeHiddenCommands?: boolean;
}

export function createEssentialsPlugin(options: EssentialsPluginOptions = {}): FluxerPlugin {
  return {
    name: "essentials",
    description: "Core utility commands for Fluxer bots.",
    modules: [
      {
        name: "essentials-core",
        commands: [
          defineCommand({
            name: "help",
            description: "Show the available commands for the current bot.",
            examples: ["!help", "!help ping"],
            schema: {
              args: [
                { name: "command", rest: true }
              ] as const
            },
            execute: async ({ bot, input, reply }) => {
              const catalog = bot.createCommandCatalog({
                includeHidden: options.includeHiddenCommands
              });
              const requestedCommand = Array.isArray(input?.args.command)
                ? input.args.command.join(" ").trim()
                : "";

              if (requestedCommand.length > 0) {
                const command = bot.resolveCommandFromInput(requestedCommand);
                if (!command || (!options.includeHiddenCommands && command.hidden)) {
                  const group = bot.resolveCommandGroup(requestedCommand);
                  if (group && (options.includeHiddenCommands || !group.hidden)) {
                    await reply(describeCommandGroup(group, { prefix: bot.prefix }));
                    return;
                  }

                  await reply(`Unknown command "${requestedCommand}".`);
                  return;
                }

                await reply(describeCommand(command, { prefix: bot.prefix }));
                return;
              }

              await reply(describeCommandCatalog(catalog));
            }
          }),
          {
            name: "about",
            description: "Show information about the bot.",
            execute: async ({ bot, reply }) => {
              await reply(options.aboutText ?? `${bot.name} is powered by Fluxer.JS.`);
            }
          }
        ]
      }
    ]
  };
}
