import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types/command";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption(option =>
      option.setName("target").setDescription("The member to kick").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for kick").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({
        content: "❌ Could not find that member.",
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "❌ I can't kick that user (role hierarchy issue?).",
        ephemeral: true,
      });
      return;
    }

    await member.kick(reason);
    await interaction.reply(`👢 ${target.tag} was kicked. Reason: ${reason}`);
  },
};
