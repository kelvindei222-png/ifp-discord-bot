import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../../types/command";
import { cancelPomodoroForGuild } from "../../lib/countdownManager";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cancelpomodoro")
    .setDescription("Cancel the ongoing Pomodoro timer for your server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.reply({
        content: "❌ This command must be used in a server.",
        ephemeral: true,
      });
      return;
    }

    // No truthy check, just call the function
    cancelPomodoroForGuild(guildId);

    await interaction.reply({
      content: "⛔ Pomodoro timer canceled for this server.",
    });
  },
};
