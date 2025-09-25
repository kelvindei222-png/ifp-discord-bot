import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ComponentType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } from "discord.js";
import { Command } from "../../types/discordClient";
import { economyManager } from "../../lib/economyManager";

interface GiveawayData {
  prize: string;
  endTime: number;
  hostId: string;
  channelId: string;
  messageId: string;
  participants: Set<string>;
  winnerCount: number;
  client: Client;
  requirements?: {
    minLevel?: number;
    requiredRole?: string;
  };
}

const activeGiveaways = new Map<string, GiveawayData>();

export const giveaway: Command = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways")
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a new giveaway")
        .addStringOption(option =>
          option.setName("prize")
            .setDescription("The giveaway prize")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName("duration")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)) // Max 1 week
        .addIntegerOption(option =>
          option.setName("winners")
            .setDescription("Number of winners")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10))
        .addIntegerOption(option =>
          option.setName("min_level")
            .setDescription("Minimum level requirement")
            .setRequired(false)
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption(option =>
          option.setName("message_id")
            .setDescription("Message ID of the giveaway")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("reroll")
        .setDescription("Reroll a giveaway")
        .addStringOption(option =>
          option.setName("message_id")
            .setDescription("Message ID of the giveaway")
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case "create": {
        const prize = interaction.options.getString("prize", true);
        const duration = interaction.options.getInteger("duration", true);
        const winnerCount = interaction.options.getInteger("winners") || 1;
        const minLevel = interaction.options.getInteger("min_level");
        
        const endTime = Date.now() + (duration * 60 * 1000);
        
        const embed = new EmbedBuilder()
          .setTitle("🎉 GIVEAWAY! 🎉")
          .setDescription(`**Prize:** ${prize}\n\n**Duration:** ${duration} minutes\n**Winners:** ${winnerCount}\n**Hosted by:** ${interaction.user}\n\nClick the 🎁 button below to enter!`)
          .addFields(
            { name: "⏰ Ends", value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
            { name: "🏆 Winners", value: winnerCount.toString(), inline: true },
            { name: "👥 Entries", value: "0", inline: true }
          )
          .setColor(0xFFD700)
          .setFooter({ text: "Good luck! 🍀" })
          .setTimestamp(endTime);

        if (minLevel) {
          embed.addFields({ name: "📈 Requirements", value: `Minimum Level: ${minLevel}`, inline: false });
        }

        const button = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("giveaway_enter")
              .setLabel("Enter Giveaway")
              .setEmoji("🎁")
              .setStyle(ButtonStyle.Primary)
          );

        const message = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });
        
        // Store giveaway data
        const giveawayData: GiveawayData = {
          prize,
          endTime,
          hostId: interaction.user.id,
          channelId: interaction.channelId,
          messageId: message.id,
          participants: new Set(),
          winnerCount,
          client: interaction.client,
          requirements: minLevel ? { minLevel } : undefined
        };
        
        activeGiveaways.set(message.id, giveawayData);

        // Set up button collector
        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: duration * 60 * 1000
        });

        collector.on("collect", async (buttonInteraction) => {
          if (buttonInteraction.customId === "giveaway_enter") {
            const userId = buttonInteraction.user.id;
            const giveaway = activeGiveaways.get(message.id);
            
            if (!giveaway) {
              await buttonInteraction.reply({ content: "❌ Giveaway not found!", ephemeral: true });
              return;
            }

            // Check requirements
            if (giveaway.requirements?.minLevel) {
              const userLevel = economyManager.getLevel(userId);
              if (userLevel.level < giveaway.requirements.minLevel) {
                await buttonInteraction.reply({ 
                  content: `❌ You need to be at least level ${giveaway.requirements.minLevel} to enter this giveaway! (You are level ${userLevel.level})`, 
                  ephemeral: true 
                });
                return;
              }
            }

            if (giveaway.participants.has(userId)) {
              await buttonInteraction.reply({ content: "❌ You're already entered in this giveaway!", ephemeral: true });
              return;
            }

            giveaway.participants.add(userId);
            
            // Update embed
            const updatedEmbed = EmbedBuilder.from(embed)
              .setFields(
                { name: "⏰ Ends", value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                { name: "🏆 Winners", value: winnerCount.toString(), inline: true },
                { name: "👥 Entries", value: giveaway.participants.size.toString(), inline: true }
              );

            if (minLevel) {
              updatedEmbed.addFields({ name: "📈 Requirements", value: `Minimum Level: ${minLevel}`, inline: false });
            }

            await message.edit({ embeds: [updatedEmbed], components: [button] });
            await buttonInteraction.reply({ content: "✅ You've entered the giveaway! Good luck! 🍀", ephemeral: true });
          }
        });

        // End giveaway when time is up
        collector.on("end", async () => {
          await endGiveaway(message.id);
        });

        break;
      }

      case "end": {
        const messageId = interaction.options.getString("message_id", true);
        const giveaway = activeGiveaways.get(messageId);
        
        if (!giveaway) {
          await interaction.reply({ content: "❌ Giveaway not found!", ephemeral: true });
          return;
        }

        if (giveaway.hostId !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: "❌ You can only end your own giveaways!", ephemeral: true });
          return;
        }

        await endGiveaway(messageId);
        await interaction.reply({ content: "✅ Giveaway ended successfully!", ephemeral: true });
        break;
      }

      case "reroll": {
        const messageId = interaction.options.getString("message_id", true);
        const giveaway = activeGiveaways.get(messageId);
        
        if (!giveaway) {
          await interaction.reply({ content: "❌ Giveaway not found!", ephemeral: true });
          return;
        }

        if (giveaway.hostId !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: "❌ You can only reroll your own giveaways!", ephemeral: true });
          return;
        }

        const winners = selectWinners(Array.from(giveaway.participants), giveaway.winnerCount);
        
        if (winners.length === 0) {
          await interaction.reply({ content: "❌ No participants to reroll!", ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🎉 Giveaway Rerolled!")
          .setDescription(`**Prize:** ${giveaway.prize}\n\n**New Winner(s):**\n${winners.map(id => `<@${id}>`).join("\n")}`)
          .setColor(0x00FF00)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  }
};

async function endGiveaway(messageId: string): Promise<void> {
  const giveaway = activeGiveaways.get(messageId);
  if (!giveaway) return;

  try {
    const channel = await giveaway.client.channels.fetch(giveaway.channelId);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(messageId);
    const participants = Array.from(giveaway.participants);
    
    const embed = new EmbedBuilder()
      .setTitle("🎉 Giveaway Ended!")
      .setDescription(`**Prize:** ${giveaway.prize}`)
      .setColor(0x00FF00)
      .addFields(
        { name: "👥 Total Entries", value: participants.length.toString(), inline: true },
        { name: "🏆 Winners", value: giveaway.winnerCount.toString(), inline: true }
      )
      .setTimestamp();

    if (participants.length === 0) {
      embed.addFields({ name: "😢 Result", value: "No one entered the giveaway!", inline: false });
    } else {
      const winners = selectWinners(participants, giveaway.winnerCount);
      embed.addFields({ 
        name: "🎊 Winner(s)", 
        value: winners.length > 0 ? winners.map(id => `<@${id}>`).join("\n") : "Could not determine winners", 
        inline: false 
      });

      // Award XP to winners
      winners.forEach(winnerId => {
        economyManager.addXP(winnerId, 100); // 100 XP for winning
      });
    }

    // Disable button
    const disabledButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("giveaway_ended")
          .setLabel("Giveaway Ended")
          .setEmoji("🎁")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

    await message.edit({ embeds: [embed], components: [disabledButton] });
    
    // Send results message
    if (participants.length > 0) {
      const winners = selectWinners(participants, giveaway.winnerCount);
      if (winners.length > 0 && channel.isTextBased() && 'send' in channel) {
        await channel.send(`🎉 Congratulations ${winners.map(id => `<@${id}>`).join(", ")}! You won **${giveaway.prize}**!`);
      }
    }

    activeGiveaways.delete(messageId);
  } catch (error) {
    console.error("Error ending giveaway:", error);
  }
}

function selectWinners(participants: string[], count: number): string[] {
  if (participants.length === 0) return [];
  
  const winners: string[] = [];
  const availableParticipants = [...participants];
  
  for (let i = 0; i < Math.min(count, availableParticipants.length); i++) {
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    winners.push(availableParticipants[randomIndex]);
    availableParticipants.splice(randomIndex, 1);
  }
  
  return winners;
}