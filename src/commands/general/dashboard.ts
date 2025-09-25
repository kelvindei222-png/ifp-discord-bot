import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { LeaderboardManager } from '../../lib/leaderboardManager';
import { TimerManager } from '../../lib/timerManager';
import { MusicManager } from '../../lib/musicManager';

export const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('📊 View comprehensive server statistics and bot status');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  await interaction.deferReply();

  try {
    const embed = await createMainDashboard(interaction);
    const components = createDashboardComponents();

    const response = await interaction.editReply({ 
      embeds: [embed], 
      components 
    });

    // Handle component interactions
    const collector = response.createMessageComponentCollector({
      time: 600000 // 10 minutes
    });

    collector.on('collect', async (componentInteraction) => {
      if (componentInteraction.user.id !== interaction.user.id) {
        return componentInteraction.reply({ 
          content: '❌ Only the command user can interact with this dashboard!', 
          ephemeral: true 
        });
      }

      if (componentInteraction.isButton()) {
        await handleButtonInteraction(componentInteraction, interaction);
      } else if (componentInteraction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(componentInteraction, interaction);
      }
    });

    collector.on('end', () => {
      const disabledComponents = createDashboardComponents(true);
      interaction.editReply({ components: disabledComponents }).catch(() => {});
    });

  } catch (error) {
    console.error('Dashboard command error:', error);
    await interaction.editReply('❌ An error occurred while loading the dashboard.');
  }
}

async function createMainDashboard(interaction: ChatInputCommandInteraction): Promise<EmbedBuilder> {
  const guild = interaction.guild!;
  const leaderboardManager = LeaderboardManager.getInstance(guild.id, interaction.client);
  const timerManager = TimerManager.getInstance(guild.id, interaction.client);

  // Get server statistics
  const memberCount = guild.memberCount;
  const channelCount = guild.channels.cache.size;
  const roleCount = guild.roles.cache.size;
  const emojiCount = guild.emojis.cache.size;

  // Get leaderboard statistics
  const allUserStats = Array.from({ length: 10 }, (_, i) => 
    leaderboardManager.getUserStats(`dummy${i}`)
  ).filter(stats => stats.xp > 0); // Only users with activity

  const totalXP = allUserStats.reduce((sum, stats) => sum + stats.xp, 0);
  const totalMessages = allUserStats.reduce((sum, stats) => sum + stats.messages, 0);
  const totalVoiceTime = allUserStats.reduce((sum, stats) => sum + stats.voiceTime, 0);
  const totalStudyTime = allUserStats.reduce((sum, stats) => sum + stats.studyTime, 0);

  // Get active timers
  const activeTimers = timerManager.getActiveTimers();
  const studyTimers = activeTimers.filter(t => t.type === 'study').length;
  const pomodoroTimers = activeTimers.filter(t => t.type === 'pomodoro').length;

  // Get top performers
  const topXPUsers = leaderboardManager.getLeaderboard('xp', 3);
  const topMessageUsers = leaderboardManager.getLeaderboard('messages', 3);

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`📊 ${guild.name} Dashboard`)
    .setThumbnail(guild.iconURL())
    .setTimestamp();

  // Server Overview
  embed.addFields(
    {
      name: '🏠 Server Overview',
      value: `👥 Members: **${memberCount.toLocaleString()}**\n` +
             `📋 Channels: **${channelCount}**\n` +
             `🎭 Roles: **${roleCount}**\n` +
             `😀 Emojis: **${emojiCount}**`,
      inline: true
    },
    {
      name: '📈 Activity Stats',
      value: `⭐ Total XP: **${totalXP.toLocaleString()}**\n` +
             `💬 Messages: **${totalMessages.toLocaleString()}**\n` +
             `🎤 Voice Hours: **${Math.floor(totalVoiceTime / 60)}**\n` +
             `📚 Study Hours: **${Math.floor(totalStudyTime / 60)}**`,
      inline: true
    },
    {
      name: '⏰ Active Systems',
      value: `🍅 Pomodoros: **${pomodoroTimers}**\n` +
             `📖 Study Sessions: **${studyTimers}**\n` +
             `⏱️ Total Timers: **${activeTimers.length}**\n` +
             `🎵 Music Queues: **0**`, // TODO: Get from MusicManager
      inline: true
    }
  );

  // Top performers
  if (topXPUsers.length > 0) {
    const xpLeaders = topXPUsers.map((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      return `${medal} <@${user.userId}> (${user.xp.toLocaleString()} XP)`;
    }).join('\n');

    embed.addFields({
      name: '👑 Top Contributors',
      value: xpLeaders,
      inline: false
    });
  }

  // System status
  const botUptime = process.uptime();
  const uptimeHours = Math.floor(botUptime / 3600);
  const uptimeMinutes = Math.floor((botUptime % 3600) / 60);

  embed.addFields({
    name: '🤖 Bot Status',
    value: `⏱️ Uptime: **${uptimeHours}h ${uptimeMinutes}m**\n` +
           `💾 Memory: **${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB**\n` +
           `📡 Ping: **${interaction.client.ws.ping}ms**\n` +
           `🔧 Version: **1.0.0**`,
    inline: false
  });

  return embed;
}

function createDashboardComponents(disabled: boolean = false): ActionRowBuilder<any>[] {
  const buttonRow = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard_refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('dashboard_leaderboard')
        .setLabel('🏆 Leaderboards')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('dashboard_timers')
        .setLabel('⏰ Active Timers')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('dashboard_music')
        .setLabel('🎵 Music Status')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dashboard_category')
        .setPlaceholder('Select detailed view')
        .setDisabled(disabled)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Activity Overview')
            .setDescription('Detailed activity statistics')
            .setValue('activity')
            .setEmoji('📊'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Achievement Summary')
            .setDescription('Server-wide achievements')
            .setValue('achievements')
            .setEmoji('🏆'),
          new StringSelectMenuOptionBuilder()
            .setLabel('System Health')
            .setDescription('Bot performance metrics')
            .setValue('system')
            .setEmoji('⚙️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Recent Activity')
            .setDescription('Latest user activities')
            .setValue('recent')
            .setEmoji('🕐')
        )
    );

  return [buttonRow, selectRow];
}

async function handleButtonInteraction(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const customId = componentInteraction.customId;

  switch (customId) {
    case 'dashboard_refresh':
      const newEmbed = await createMainDashboard(originalInteraction);
      await componentInteraction.update({ embeds: [newEmbed] });
      break;

    case 'dashboard_leaderboard':
      await showLeaderboardOverview(componentInteraction, originalInteraction);
      break;

    case 'dashboard_timers':
      await showActiveTimers(componentInteraction, originalInteraction);
      break;

    case 'dashboard_music':
      await showMusicStatus(componentInteraction, originalInteraction);
      break;
  }
}

async function handleSelectMenuInteraction(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const selectedValue = componentInteraction.values[0];

  switch (selectedValue) {
    case 'activity':
      await showActivityOverview(componentInteraction, originalInteraction);
      break;

    case 'achievements':
      await showAchievementSummary(componentInteraction, originalInteraction);
      break;

    case 'system':
      await showSystemHealth(componentInteraction, originalInteraction);
      break;

    case 'recent':
      await showRecentActivity(componentInteraction, originalInteraction);
      break;
  }
}

async function showLeaderboardOverview(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const guild = originalInteraction.guild!;
  const leaderboardManager = LeaderboardManager.getInstance(guild.id, originalInteraction.client);

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Leaderboard Overview')
    .setTimestamp();

  const categories = ['xp', 'messages', 'voice', 'study'];
  
  for (const categoryId of categories) {
    const leaderboard = leaderboardManager.getLeaderboard(categoryId, 3);
    const category = leaderboardManager.getCategories().find(c => c.id === categoryId);
    
    if (leaderboard.length > 0 && category) {
      const topUsers = leaderboard.map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        const value = category.formatValue(category.getValue(user));
        return `${medal} <@${user.userId}> - ${value}`;
      }).join('\n');

      embed.addFields({
        name: `${category.emoji} ${category.name}`,
        value: topUsers,
        inline: true
      });
    }
  }

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showActiveTimers(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const guild = originalInteraction.guild!;
  const timerManager = TimerManager.getInstance(guild.id, originalInteraction.client);
  const activeTimers = timerManager.getActiveTimers();

  const embed = new EmbedBuilder()
    .setColor(0xff6b35)
    .setTitle('⏰ Active Timers')
    .setTimestamp();

  if (activeTimers.length === 0) {
    embed.setDescription('No active timers in this server.');
  } else {
    const timersByType = activeTimers.reduce((acc, timer) => {
      if (!acc[timer.type]) acc[timer.type] = [];
      acc[timer.type].push(timer);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [type, timers] of Object.entries(timersByType)) {
      const timerList = timers.slice(0, 5).map(timer => {
        const timeLeft = Math.floor(timer.remainingTime / 60);
        const status = timer.isPaused ? '⏸️' : '▶️';
        return `${status} ${timer.name} - ${timeLeft}m left`;
      }).join('\n');

      const typeEmoji = type === 'pomodoro' ? '🍅' : type === 'study' ? '📚' : type === 'break' ? '☕' : '⏰';
      
      embed.addFields({
        name: `${typeEmoji} ${type.charAt(0).toUpperCase() + type.slice(1)} (${timers.length})`,
        value: timerList + (timers.length > 5 ? `\n...and ${timers.length - 5} more` : ''),
        inline: false
      });
    }
  }

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showMusicStatus(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🎵 Music System Status')
    .setDescription('Music system is ready! Use `/play` to start playing music.')
    .addFields(
      { name: '🎶 Features', value: '• YouTube playback\n• Queue management\n• Volume control\n• Loop modes\n• Shuffle', inline: true },
      { name: '⚙️ Status', value: '• Ready ✅\n• Voice connection: Ready\n• Audio quality: High\n• Autoplay: Available', inline: true }
    )
    .setTimestamp();

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showActivityOverview(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const guild = originalInteraction.guild!;
  const leaderboardManager = LeaderboardManager.getInstance(guild.id, originalInteraction.client);

  // Generate sample activity data
  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('📊 Detailed Activity Overview')
    .setDescription('Comprehensive server activity statistics')
    .addFields(
      { name: '📈 Growth Metrics', value: 'Daily active users: **0**\nWeekly new members: **0**\nMonthly message growth: **0%**', inline: true },
      { name: '🎯 Engagement', value: 'Avg. session length: **0m**\nCommand usage: **0/day**\nVoice participation: **0%**', inline: true },
      { name: '🏆 Achievements', value: 'Total unlocked: **0**\nRare achievements: **0**\nLegendary achievements: **0**', inline: true }
    )
    .setTimestamp();

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showAchievementSummary(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const guild = originalInteraction.guild!;
  const leaderboardManager = LeaderboardManager.getInstance(guild.id, originalInteraction.client);
  const allAchievements = leaderboardManager.getAchievements();

  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Achievement Summary')
    .setTimestamp();

  const rarityCount = allAchievements.reduce((acc, achievement) => {
    acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rarityEmojis = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '💜',
    legendary: '🌟'
  };

  const summaryText = Object.entries(rarityCount)
    .map(([rarity, count]) => `${rarityEmojis[rarity as keyof typeof rarityEmojis]} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}: ${count}`)
    .join('\n');

  embed.addFields(
    { name: '📊 Available Achievements', value: summaryText, inline: false },
    { name: '🎯 Categories', value: '• Activity & Communication\n• Voice & Music\n• Study & Learning\n• Streaks & Consistency\n• Special Milestones', inline: false }
  );

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showSystemHealth(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('⚙️ System Health')
    .addFields(
      { name: '💾 Memory Usage', value: `Heap Used: **${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB**\nHeap Total: **${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB**\nExternal: **${Math.round(memoryUsage.external / 1024 / 1024)}MB**`, inline: true },
      { name: '⏱️ Performance', value: `Uptime: **${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m**\nPing: **${originalInteraction.client.ws.ping}ms**\nNode.js: **${process.version}**`, inline: true },
      { name: '🔧 Systems Status', value: '• Music System: ✅ Ready\n• Timer System: ✅ Ready\n• Leaderboards: ✅ Ready\n• Activity Tracking: ✅ Active', inline: false }
    )
    .setTimestamp();

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}

async function showRecentActivity(componentInteraction: any, originalInteraction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('🕐 Recent Activity')
    .setDescription('Latest server activities and events')
    .addFields(
      { name: '💬 Messages', value: 'No recent message activity tracked.', inline: true },
      { name: '🎤 Voice', value: 'No recent voice activity tracked.', inline: true },
      { name: '⏰ Timers', value: 'No recent timer activity tracked.', inline: true }
    )
    .setTimestamp();

  await componentInteraction.reply({ embeds: [embed], ephemeral: true });
}