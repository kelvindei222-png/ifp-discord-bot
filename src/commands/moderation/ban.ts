import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types/command";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .addUserOption(option =>
      option.setName("target").setDescription("The member to ban").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for ban").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = interaction.guild?.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({
        content: "❌ Member not found.",
        ephemeral: true,
      });
      return;
    }

    if (!member.bannable) {
      await interaction.reply({
        content: "❌ I can't ban that user.",
        ephemeral: true,
      });
      return;
    }

    await member.ban({ reason });
    await interaction.reply(`🔨 ${target.tag} was banned. Reason: ${reason}`);
  },
};
