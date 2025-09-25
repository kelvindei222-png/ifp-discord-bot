import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  GuildMember,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder
} from 'discord.js';
import { LeaderboardManager } from '../../lib/leaderboardManager';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('👤 View your or another user\'s profile and statistics')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User whose profile to view')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const member = interaction.guild.members.cache.get(targetUser.id) as GuildMember;

  if (!member) {
    return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
  }

  await interaction.deferReply();

  const leaderboardManager = LeaderboardManager.getInstance(interaction.guild.id, interaction.client);
  
  try {
    const embed = leaderboardManager.createUserProfileEmbed(targetUser.id, member);
    const stats = leaderboardManager.getUserStats(targetUser.id);
    
    // Add rank information for different categories
    const categories = ['xp', 'level', 'messages', 'voice'];
    const ranks = categories.map(category => {
      const rank = leaderboardManager.getUserRank(targetUser.id, category);
      const categoryConfig = leaderboardManager.getCategories().find(c => c.id === category);
      return `${categoryConfig?.emoji} **${categoryConfig?.name}**: #${rank}`;
    });
    
    embed.addFields({ 
      name: '📊 Server Rankings', 
      value: ranks.join('\n'), 
      inline: false 
    });

    // Create interaction buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('view_achievements')
          .setLabel('🏆 View Achievements')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('view_detailed_stats')
          .setLabel('📈 Detailed Stats')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('compare_stats')
          .setLabel('⚖️ Compare')
          .setStyle(ButtonStyle.Success)
          .setDisabled(targetUser.id === interaction.user.id)
      );

    const response = await interaction.editReply({ 
      embeds: [embed], 
      components: [buttons] 
    });

    // Handle button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ 
          content: '❌ Only the command user can interact with this profile!', 
          ephemeral: true 
        });
      }

      switch (buttonInteraction.customId) {
        case 'view_achievements':
          await handleAchievementsView(buttonInteraction, leaderboardManager, targetUser.id, member);
          break;
        case 'view_detailed_stats':
          await handleDetailedStats(buttonInteraction, leaderboardManager, targetUser.id, member);
          break;
        case 'compare_stats':
          await handleCompareStats(buttonInteraction, leaderboardManager, interaction.user.id, targetUser.id);
          break;
      }
    });

    collector.on('end', () => {
      // Disable all buttons when collector ends
      buttons.components.forEach(button => button.setDisabled(true));
      interaction.editReply({ components: [buttons] }).catch(() => {});
    });

  } catch (error) {
    console.error('Profile command error:', error);
    await interaction.editReply('❌ An error occurred while fetching the profile.');
  }
}

async function handleAchievementsView(
  interaction: any, 
  leaderboardManager: LeaderboardManager, 
  userId: string, 
  member: GuildMember
) {
  const stats = leaderboardManager.getUserStats(userId);
  const allAchievements = leaderboardManager.getAchievements();
  const userAchievements = stats.achievements
    .map(id => allAchievements.find(a => a.id === id))
    .filter(Boolean);

  const embed = new EmbedBuilder()
    .setColor(member.displayColor || 0x00ff00)
    .setTitle(`🏆 ${member.displayName}'s Achievements`)
    .setThumbnail(member.displayAvatarURL())
    .setTimestamp();

  if (userAchievements.length === 0) {
    embed.setDescription('No achievements unlocked yet. Keep being active to earn some!');
  } else {
    // Group achievements by rarity
    const groupedAchievements = {
      legendary: userAchievements.filter(a => a!.rarity === 'legendary'),
      epic: userAchievements.filter(a => a!.rarity === 'epic'),
      rare: userAchievements.filter(a => a!.rarity === 'rare'),
      uncommon: userAchievements.filter(a => a!.rarity === 'uncommon'),
      common: userAchievements.filter(a => a!.rarity === 'common')
    };

    const rarityEmojis = {
      legendary: '🌟',
      epic: '💜',
      rare: '🔵',
      uncommon: '🟢',
      common: '⚪'
    };

    for (const [rarity, achievements] of Object.entries(groupedAchievements)) {
      if (achievements.length > 0) {
        const achievementList = achievements
          .map(a => `${a!.emoji} **${a!.name}**\n${a!.description}`)
          .join('\n\n');
        
        embed.addFields({
          name: `${rarityEmojis[rarity as keyof typeof rarityEmojis]} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} (${achievements.length})`,
          value: achievementList,
          inline: false
        });
      }
    }
  }

  embed.addFields({
    name: '📊 Progress',
    value: `${stats.achievements.length}/${allAchievements.length} achievements unlocked`,
    inline: true
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDetailedStats(
  interaction: any, 
  leaderboardManager: LeaderboardManager, 
  userId: string, 
  member: GuildMember
) {
  const stats = leaderboardManager.getUserStats(userId);
  const categories = leaderboardManager.getCategories();

  const embed = new EmbedBuilder()
    .setColor(member.displayColor || 0x00ff00)
    .setTitle(`📈 ${member.displayName}'s Detailed Statistics`)
    .setThumbnail(member.displayAvatarURL())
    .setTimestamp();

  // Activity breakdown
  embed.addFields(
    { name: '💬 Communication', value: `Messages: ${stats.messages.toLocaleString()}\nReactions Given: ${stats.totalReactions}\nReactions Received: ${stats.reactionsReceived}`, inline: true },
    { name: '🎤 Voice Activity', value: `Voice Time: ${Math.floor(stats.voiceTime / 60)}h ${stats.voiceTime % 60}m\nMusic Time: ${Math.floor(stats.musicListenTime / 60)}h ${stats.musicListenTime % 60}m`, inline: true },
    { name: '📚 Learning', value: `Study Time: ${Math.floor(stats.studyTime / 60)}h ${stats.studyTime % 60}m\nCommands Used: ${stats.commandsUsed}`, inline: true }
  );

  // Progress and streaks
  const xpToNext = leaderboardManager.getXPToNextLevel(stats);
  embed.addFields(
    { name: '⭐ Level Progress', value: `Level ${stats.level}\nXP: ${stats.xp.toLocaleString()}\nTo Next Level: ${xpToNext.toLocaleString()}`, inline: true },
    { name: '🔥 Streaks', value: `Daily: ${stats.dailyStreak} days\nWeekly: ${stats.weeklyStreak} weeks`, inline: true },
    { name: '🏆 Achievements', value: `Unlocked: ${stats.achievements.length}\nLast Active: ${stats.lastActive.toLocaleDateString()}`, inline: true }
  );

  // Rankings across all categories
  const rankings = categories.map(category => {
    const rank = leaderboardManager.getUserRank(userId, category.id);
    return `${category.emoji} ${category.name}: #${rank}`;
  }).join('\n');

  embed.addFields({
    name: '📊 Server Rankings',
    value: rankings,
    inline: false
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCompareStats(
  interaction: any, 
  leaderboardManager: LeaderboardManager, 
  currentUserId: string, 
  targetUserId: string
) {
  const currentStats = leaderboardManager.getUserStats(currentUserId);
  const targetStats = leaderboardManager.getUserStats(targetUserId);

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('⚖️ Statistics Comparison')
    .setTimestamp();

  const comparisons = [
    { name: '⭐ Level', current: currentStats.level, target: targetStats.level },
    { name: '💯 XP', current: currentStats.xp, target: targetStats.xp },
    { name: '💬 Messages', current: currentStats.messages, target: targetStats.messages },
    { name: '🎤 Voice Time (hours)', current: Math.floor(currentStats.voiceTime / 60), target: Math.floor(targetStats.voiceTime / 60) },
    { name: '🎵 Music Time (hours)', current: Math.floor(currentStats.musicListenTime / 60), target: Math.floor(targetStats.musicListenTime / 60) },
    { name: '📚 Study Time (hours)', current: Math.floor(currentStats.studyTime / 60), target: Math.floor(targetStats.studyTime / 60) },
    { name: '🔥 Daily Streak', current: currentStats.dailyStreak, target: targetStats.dailyStreak },
    { name: '🏆 Achievements', current: currentStats.achievements.length, target: targetStats.achievements.length }
  ];

  const comparisonText = comparisons.map(comp => {
    const diff = comp.current - comp.target;
    const diffText = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(=)';
    const emoji = diff > 0 ? '🟢' : diff < 0 ? '🔴' : '🟡';
    
    return `${comp.name}: ${comp.current.toLocaleString()} vs ${comp.target.toLocaleString()} ${emoji} ${diffText}`;
  }).join('\n');

  embed.setDescription(comparisonText);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}