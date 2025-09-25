import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { Command } from "../../types/discordClient";

export const poll: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create interactive polls")
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a new poll")
        .addStringOption(option =>
          option.setName("question")
            .setDescription("The poll question")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("options")
            .setDescription("Poll options separated by | (max 5)")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName("duration")
            .setDescription("Poll duration in minutes (1-1440)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(1440)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("simple")
        .setDescription("Create a simple yes/no poll")
        .addStringOption(option =>
          option.setName("question")
            .setDescription("The poll question")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName("duration")
            .setDescription("Poll duration in minutes (1-1440)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(1440))),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const question = interaction.options.getString("question", true);
    const duration = interaction.options.getInteger("duration") || 60; // Default 1 hour
    
    if (subcommand === "simple") {
      // Simple Yes/No poll
      const embed = new EmbedBuilder()
        .setTitle("📊 Poll")
        .setDescription(`**${question}**`)
        .addFields(
          { name: "✅ Yes", value: "0 votes (0%)", inline: true },
          { name: "❌ No", value: "0 votes (0%)", inline: true },
          { name: "⏰ Duration", value: `${duration} minutes`, inline: true }
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Created by ${interaction.user.tag} • React to vote!`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      
      // Add reactions
      await message.react("✅");
      await message.react("❌");

      // Set up vote counting
      const votes = new Map<string, { yes: Set<string>, no: Set<string> }>();
      votes.set(message.id, { yes: new Set(), no: new Set() });

      // Update poll periodically
      const updateInterval = setInterval(async () => {
        try {
          const fetchedMessage = await message.fetch();
          const yesReaction = fetchedMessage.reactions.cache.get("✅");
          const noReaction = fetchedMessage.reactions.cache.get("❌");
          
          const yesCount = (yesReaction?.count || 1) - 1; // -1 for bot reaction
          const noCount = (noReaction?.count || 1) - 1; // -1 for bot reaction
          const totalVotes = yesCount + noCount;
          
          const yesPercent = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0;
          const noPercent = totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0;

          const updatedEmbed = new EmbedBuilder()
            .setTitle("📊 Poll")
            .setDescription(`**${question}**`)
            .addFields(
              { name: "✅ Yes", value: `${yesCount} votes (${yesPercent}%)`, inline: true },
              { name: "❌ No", value: `${noCount} votes (${noPercent}%)`, inline: true },
              { name: "📈 Total", value: `${totalVotes} votes`, inline: true }
            )
            .setColor(0x5865F2)
            .setFooter({ text: `Created by ${interaction.user.tag} • React to vote!`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

          await fetchedMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
          console.error('Error updating poll:', error);
        }
      }, 10000); // Update every 10 seconds

      // End poll after duration
      setTimeout(() => {
        clearInterval(updateInterval);
      }, duration * 60 * 1000);

    } else if (subcommand === "create") {
      // Custom options poll
      const optionsString = interaction.options.getString("options", true);
      const options = optionsString.split("|").map(opt => opt.trim()).slice(0, 5);
      
      if (options.length < 2) {
        await interaction.reply({ content: "❌ You need at least 2 options! Separate options with |", ephemeral: true });
        return;
      }

      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Poll")
        .setDescription(`**${question}**\n\n` + options.map((opt, i) => `${emojis[i]} ${opt}`).join("\n"))
        .addFields(
          { name: "📊 Results", value: options.map((opt, i) => `${emojis[i]} ${opt}: 0 votes (0%)`).join("\n"), inline: false },
          { name: "⏰ Duration", value: `${duration} minutes`, inline: true },
          { name: "📈 Total Votes", value: "0", inline: true }
        )
        .setColor(0x5865F2)
        .setFooter({ text: `Created by ${interaction.user.tag} • React to vote!`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      const message = await interaction.reply({ embeds: [embed], fetchReply: true });
      
      // Add reactions
      for (let i = 0; i < options.length; i++) {
        await message.react(emojis[i]);
      }

      // Update poll periodically
      const updateInterval = setInterval(async () => {
        try {
          const fetchedMessage = await message.fetch();
          const reactions = options.map((_, i) => fetchedMessage.reactions.cache.get(emojis[i]));
          const voteCounts = reactions.map(r => (r?.count || 1) - 1); // -1 for bot reaction
          const totalVotes = voteCounts.reduce((a, b) => a + b, 0);
          
          const results = options.map((opt, i) => {
            const count = voteCounts[i];
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return `${emojis[i]} ${opt}: ${count} votes (${percent}%)`;
          }).join("\n");

          const updatedEmbed = new EmbedBuilder()
            .setTitle("📊 Poll")
            .setDescription(`**${question}**\n\n` + options.map((opt, i) => `${emojis[i]} ${opt}`).join("\n"))
            .addFields(
              { name: "📊 Results", value: results, inline: false },
              { name: "📈 Total Votes", value: totalVotes.toString(), inline: true }
            )
            .setColor(0x5865F2)
            .setFooter({ text: `Created by ${interaction.user.tag} • React to vote!`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

          await fetchedMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
          console.error('Error updating poll:', error);
        }
      }, 10000); // Update every 10 seconds

      // End poll after duration
      setTimeout(() => {
        clearInterval(updateInterval);
      }, duration * 60 * 1000);
    }
  }
};