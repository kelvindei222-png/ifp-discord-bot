import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types/discordClient";
import { economyManager } from "../../lib/economyManager";

export const daily: Command = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily coins reward"),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    
    if (!economyManager.canClaimDaily(userId)) {
      const stats = economyManager.getStats(userId);
      const nextClaim = new Date(stats.lastDaily + 24 * 60 * 60 * 1000);
      
      const embed = new EmbedBuilder()
        .setTitle("⏰ Daily Already Claimed")
        .setDescription(`You've already claimed your daily reward!\nNext claim: <t:${Math.floor(nextClaim.getTime() / 1000)}:R>`)
        .setColor(0xFF6B35)
        .setThumbnail(interaction.user.displayAvatarURL());
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const amount = economyManager.claimDaily(userId);
    const streaks = ["🔥", "⚡", "✨", "💫", "🌟"];
    const randomStreak = streaks[Math.floor(Math.random() * streaks.length)];
    
    // Add some XP for claiming daily
    const xpGained = Math.floor(Math.random() * 20) + 10;
    const levelResult = economyManager.addXP(userId, xpGained);
    
    const embed = new EmbedBuilder()
      .setTitle(`${randomStreak} Daily Reward Claimed!`)
      .setDescription(`You've earned **${amount.toLocaleString()} coins** and **${xpGained} XP**!`)
      .setColor(0x00FF00)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "💰 Coins Earned", value: `${amount.toLocaleString()}`, inline: true },
        { name: "⭐ XP Gained", value: `${xpGained}`, inline: true },
        { name: "⏰ Next Claim", value: "<t:" + Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) + ":R>", inline: true }
      )
      .setFooter({ text: "Come back tomorrow for more rewards!" })
      .setTimestamp();

    if (levelResult.levelUp) {
      embed.addFields({ name: "🎉 Level Up!", value: `You are now level **${levelResult.newLevel}**!`, inline: false });
      embed.setColor(0xFFD700);
    }

    await interaction.reply({ embeds: [embed] });
  }
};