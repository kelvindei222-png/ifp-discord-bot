import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types/discordClient";
import { economyManager } from "../../lib/economyManager";

export const coinflip: Command = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Gamble coins on a coinflip!")
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(10))
    .addStringOption(option =>
      option.setName("side")
        .setDescription("Choose heads or tails")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )),

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger("amount", true);
    const side = interaction.options.getString("side", true);
    const userId = interaction.user.id;

    const balance = economyManager.getBalance(userId);
    
    if (balance.balance < amount) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Insufficient Funds")
        .setDescription(`You need **${amount.toLocaleString()}** coins but only have **${balance.balance.toLocaleString()}** in your wallet!`)
        .setColor(0xFF6B35);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (amount > 10000) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Bet Too High")
        .setDescription("Maximum bet is **10,000** coins!")
        .setColor(0xFF6B35);
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // Flip the coin
    const coinSides = ["heads", "tails"];
    const result = coinSides[Math.floor(Math.random() * 2)];
    const won = result === side;

    // Update balance
    if (won) {
      economyManager.addMoney(userId, amount);
      // Add XP for winning
      economyManager.addXP(userId, Math.floor(amount / 10));
    } else {
      economyManager.removeMoney(userId, amount);
      // Add small XP for participating
      economyManager.addXP(userId, Math.floor(amount / 50));
    }

    const coinEmoji = result === "heads" ? "🪙" : "🔄";
    const resultEmoji = won ? "🎉" : "💸";
    
    const embed = new EmbedBuilder()
      .setTitle(`${coinEmoji} Coinflip Result`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "Your Choice", value: side === "heads" ? "🪙 Heads" : "🔄 Tails", inline: true },
        { name: "Result", value: result === "heads" ? "🪙 Heads" : "🔄 Tails", inline: true },
        { name: "Outcome", value: won ? "✅ Won" : "❌ Lost", inline: true },
        { name: "Amount", value: `${amount.toLocaleString()} coins`, inline: true },
        { name: won ? "Winnings" : "Lost", value: `${resultEmoji} ${amount.toLocaleString()} coins`, inline: true },
        { name: "New Balance", value: `💰 ${economyManager.getBalance(userId).balance.toLocaleString()} coins`, inline: true }
      )
      .setColor(won ? 0x00FF00 : 0xFF6B35)
      .setFooter({ text: won ? "Lucky! 🍀" : "Better luck next time!" })
      .setTimestamp();

    if (won) {
      embed.setDescription(`**Congratulations!** You won **${amount.toLocaleString()}** coins! ${resultEmoji}`);
    } else {
      embed.setDescription(`**Oops!** You lost **${amount.toLocaleString()}** coins. ${resultEmoji}`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};