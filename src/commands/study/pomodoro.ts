import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { startPomodoroCountdown } from "../../lib/countdownManager";

export const command = {
  data: new SlashCommandBuilder()
    .setName("pomodoro")
    .setDescription("Start a Pomodoro session")
    .addIntegerOption(option =>
      option.setName("duration").setDescription("Duration in minutes").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const duration = interaction.options.getInteger("duration") ?? 25;

    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) {
      await interaction.reply({
        content: "This command must be used in a server text channel.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `🕒 Starting a ${duration}-minute Pomodoro session.`,
      ephemeral: true,
    });

    const textChannel = interaction.channel as TextChannel;
    await startPomodoroCountdown(interaction.guild.id, textChannel, duration);
  },
};
