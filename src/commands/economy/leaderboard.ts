import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { Command } from "../../types/discordClient";
import { economyManager } from "../../lib/economyManager";

export const leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View server leaderboards")
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Leaderboard type")
        .setRequired(false)
        .addChoices(
          { name: "💰 Balance", value: "balance" },
          { name: "📈 Level", value: "level" },
          { name: "💎 Total Earned", value: "total" }
        ))
    .addIntegerOption(option =>
      option.setName("page")
        .setDescription("Page number")
        .setRequired(false)
        .setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString("type") || "balance";
    const page = interaction.options.getInteger("page") || 1;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    await displayLeaderboard(interaction, type as 'balance' | 'level' | 'total', page);
  }
};

async function displayLeaderboard(interaction: any, type: 'balance' | 'level' | 'total', page: number) {
    const guild = interaction.guild!;
    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;
    
    // Get leaderboard data
    const leaderboard = economyManager.getLeaderboard(type, 50); // Get top 50 for pagination
    const pageData = leaderboard.slice(startIndex, startIndex + itemsPerPage);
    
    if (pageData.length === 0) {
      await interaction.reply({ content: "❌ No data found for this page!", ephemeral: true });
      return;
    }

    const maxPages = Math.ceil(leaderboard.length / itemsPerPage);
    
    // Get user data for display
    const leaderboardText = await Promise.all(
      pageData.map(async (userData, index) => {
        const actualIndex = startIndex + index + 1;
        let user;
        
        try {
          user = await guild.members.fetch(userData.userId);
        } catch {
          return `\`${actualIndex}.\` Unknown User - **${userData.value.toLocaleString()}**`;
        }
        
        const medal = actualIndex <= 3 ? ['🥇', '🥈', '🥉'][actualIndex - 1] : '🏅';
        let displayValue = '';
        
        switch (type) {
          case 'balance':
            displayValue = `💰 **${userData.value.toLocaleString()}** coins`;
            break;
          case 'level':
            const userStats = economyManager.getStats(userData.userId);
            displayValue = `📈 Level **${userData.value}** (${userStats.xp.toLocaleString()} XP)`;
            break;
          case 'total':
            displayValue = `💎 **${userData.value.toLocaleString()}** total earned`;
            break;
        }
        
        return `\`${actualIndex}.\` ${medal} ${user.displayName} - ${displayValue}`;
      })
    );

    // Find current user's position
    const userPosition = leaderboard.findIndex(data => data.userId === interaction.user.id) + 1;
    const userStats = economyManager.getStats(interaction.user.id);
    
    let userValue = '';
    switch (type) {
      case 'balance':
        userValue = `💰 ${userStats.balance + userStats.bank} coins`;
        break;
      case 'level':
        userValue = `📈 Level ${userStats.level} (${userStats.xp.toLocaleString()} XP)`;
        break;
      case 'total':
        userValue = `💎 ${userStats.totalEarned.toLocaleString()} total earned`;
        break;
    }

    const titles = {
      balance: '💰 Balance Leaderboard',
      level: '📈 Level Leaderboard', 
      total: '💎 Total Earnings Leaderboard'
    };

    const descriptions = {
      balance: 'Top members by total balance (wallet + bank)',
      level: 'Top members by XP level',
      total: 'Top members by total coins earned'
    };

    const embed = new EmbedBuilder()
      .setTitle(`${titles[type]} - ${guild.name}`)
      .setDescription(`${descriptions[type]}\n\n${leaderboardText.join('\n')}`)
      .setColor(type === 'balance' ? 0xFFD700 : type === 'level' ? 0x00AE86 : 0xFF6B35)
      .addFields(
        { name: '📊 Your Position', value: userPosition > 0 ? `#${userPosition} - ${userValue}` : 'Not ranked yet', inline: true },
        { name: '📄 Page', value: `${page}/${maxPages}`, inline: true },
        { name: '👥 Total Members', value: leaderboard.length.toString(), inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // Create navigation buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`lb_${type}_${Math.max(1, page - 1)}`)
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId('lb_balance_1')
          .setLabel('💰 Balance')
          .setStyle(type === 'balance' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('lb_level_1')
          .setLabel('📈 Level')
          .setStyle(type === 'level' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('lb_total_1')
          .setLabel('💎 Total')
          .setStyle(type === 'total' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`lb_${type}_${Math.min(maxPages, page + 1)}`)
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === maxPages)
      );

    const response = await interaction.reply({ embeds: [embed], components: [buttons], fetchReply: true });

    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute
    });

    collector.on('collect', async (buttonInteraction: any) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({ content: '❌ You cannot interact with this leaderboard!', ephemeral: true });
        return;
      }

      const [_, newType, newPageStr] = buttonInteraction.customId.split('_');
      const newPage = parseInt(newPageStr);
      
      await buttonInteraction.deferUpdate();
      await displayLeaderboard(buttonInteraction, newType as any, newPage);
    });

    collector.on('end', async () => {
      try {
        // Disable all buttons when collector expires
        const disabledButtons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            buttons.components.map(button => 
              ButtonBuilder.from(button).setDisabled(true)
            )
          );
        
        await response.edit({ components: [disabledButtons] });
      } catch (error) {
        // Message might have been deleted
      }
    });
  }
