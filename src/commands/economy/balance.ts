import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types/discordClient";
import { economyManager } from "../../lib/economyManager";

export const balance: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your or another user's balance")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to check balance for")
        .setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const balance = economyManager.getBalance(targetUser.id);
    const level = economyManager.getLevel(targetUser.id);
    
    const embed = new EmbedBuilder()
      .setTitle(`💰 ${targetUser.username}'s Balance`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0xFFD700)
      .addFields(
        { name: "💵 Wallet", value: `${balance.balance.toLocaleString()} coins`, inline: true },
        { name: "🏦 Bank", value: `${balance.bank.toLocaleString()} coins`, inline: true },
        { name: "💎 Total", value: `${balance.total.toLocaleString()} coins`, inline: true },
        { name: "📈 Level", value: `${level.level}`, inline: true },
        { name: "⭐ XP", value: `${level.xp.toLocaleString()}`, inline: true },
        { name: "🎯 Next Level", value: `${level.xpForNext.toLocaleString()} XP`, inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};