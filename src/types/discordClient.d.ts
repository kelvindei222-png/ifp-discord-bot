import { Client, Collection, ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";

// ✅ Exported Command interface
export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// ✅ Module augmentation for discord.js Client
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}
