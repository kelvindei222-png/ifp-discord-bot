import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { TimerManager } from '../../lib/timerManager';

export const data = new SlashCommandBuilder()
  .setName('timer')
  .setDescription('⏰ Create and manage timers')
  .addSubcommand(subcommand =>
    subcommand
      .setName('start')
      .setDescription('Start a new timer')
      .addStringOption(option =>
        option.setName('preset')
          .setDescription('Choose a timer preset')
          .setRequired(false)
          .addChoices(
            { name: '🍅 Pomodoro (25min)', value: 'pomodoro_25' },
            { name: '📚 Study Hour (60min)', value: 'study_60' },
            { name: '☕ Quick Break (5min)', value: 'break_5' },
            { name: '🧘 Meditation (10min)', value: 'meditation_10' },
            { name: '💪 Workout (30min)', value: 'exercise_30' }
          )
      )
      .addIntegerOption(option =>
        option.setName('duration')
          .setDescription('Timer duration in minutes (overrides preset)')
          .setMinValue(1)
          .setMaxValue(480)
          .setRequired(false)
      )
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Custom timer name')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('pomodoro')
      .setDescription('Start a Pomodoro session')
      .addIntegerOption(option =>
        option.setName('work_duration')
          .setDescription('Work session duration in minutes (default: 25)')
          .setMinValue(15)
          .setMaxValue(90)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option.setName('cycles')
          .setDescription('Number of work cycles (default: 4)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('study')
      .setDescription('Start a study session')
      .addStringOption(option =>
        option.setName('subject')
          .setDescription('What are you studying?')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('duration')
          .setDescription('Study duration in minutes (default: 60)')
          .setMinValue(15)
          .setMaxValue(240)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List your active timers')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('stop')
      .setDescription('Stop a timer')
      .addStringOption(option =>
        option.setName('timer_id')
          .setDescription('Timer ID to stop (use /timer list to see IDs)')
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();
  const timerManager = TimerManager.getInstance(interaction.guild.id, interaction.client);

  switch (subcommand) {
    case 'start':
      await handleStartTimer(interaction, timerManager);
      break;
    case 'pomodoro':
      await handlePomodoroSession(interaction, timerManager);
      break;
    case 'study':
      await handleStudySession(interaction, timerManager);
      break;
    case 'list':
      await handleListTimers(interaction, timerManager);
      break;
    case 'stop':
      await handleStopTimer(interaction, timerManager);
      break;
  }
}

async function handleStartTimer(interaction: ChatInputCommandInteraction, timerManager: TimerManager) {
  const presetId = interaction.options.getString('preset');
  const customDuration = interaction.options.getInteger('duration');
  const customName = interaction.options.getString('name');

  if (!presetId && !customDuration) {
    return interaction.reply({
      content: '❌ You must either choose a preset or specify a duration!',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    let timer;
    
    if (customDuration) {
      // Custom timer
      const name = customName || `Custom Timer (${customDuration}min)`;
      timer = timerManager.createTimer(
        interaction.user.id,
        interaction.channelId,
        'custom',
        customDuration * 60,
        name,
        { description: `Custom ${customDuration} minute timer` }
      );
    } else {
      // Preset timer
      const presets = timerManager.getPresets();
      const preset = presets.find(p => p.id === presetId);
      
      if (!preset) {
        return interaction.editReply('❌ Invalid preset selected!');
      }

      const name = customName || preset.name;
      timer = timerManager.createTimer(
        interaction.user.id,
        interaction.channelId,
        preset.type,
        preset.duration,
        name,
        { description: preset.description }
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⏰ Timer Started!')
      .setDescription(`**${timer.name}** is now running!`)
      .addFields(
        { name: '⏱️ Duration', value: formatTime(timer.duration), inline: true },
        { name: '🏁 Ends At', value: `<t:${Math.floor(timer.endTime.getTime() / 1000)}:T>`, inline: true },
        { name: '🆔 Timer ID', value: `\`${timer.id.split('-')[0]}\``, inline: true }
      )
      .setTimestamp();

    if (timer.description) {
      embed.addFields({ name: '📝 Description', value: timer.description, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Timer start error:', error);
    await interaction.editReply('❌ An error occurred while starting the timer.');
  }
}

async function handlePomodoroSession(interaction: ChatInputCommandInteraction, timerManager: TimerManager) {
  const workDuration = (interaction.options.getInteger('work_duration') || 25) * 60;
  const cycles = interaction.options.getInteger('cycles') || 4;

  await interaction.deferReply();

  try {
    const timer = timerManager.createPomodoroSession(
      interaction.user.id,
      interaction.channelId,
      workDuration,
      5 * 60, // 5 min short break
      15 * 60, // 15 min long break
      cycles
    );

    const embed = new EmbedBuilder()
      .setColor(0xff6b35)
      .setTitle('🍅 Pomodoro Session Started!')
      .setDescription(`Starting ${cycles}-cycle Pomodoro session!`)
      .addFields(
        { name: '⏱️ Work Duration', value: formatTime(workDuration), inline: true },
        { name: '🔄 Total Cycles', value: cycles.toString(), inline: true },
        { name: '🆔 Session ID', value: `\`${timer.id.split('-')[0]}\``, inline: true },
        { name: '📊 Current Phase', value: '🍅 Work Session 1', inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Pomodoro session error:', error);
    await interaction.editReply('❌ An error occurred while starting the Pomodoro session.');
  }
}

async function handleStudySession(interaction: ChatInputCommandInteraction, timerManager: TimerManager) {
  const subject = interaction.options.getString('subject', true);
  const duration = (interaction.options.getInteger('duration') || 60) * 60;

  await interaction.deferReply();

  try {
    const session = timerManager.createStudySession(
      interaction.user.id,
      interaction.channelId,
      subject,
      duration
    );

    const embed = new EmbedBuilder()
      .setColor(0x4a90e2)
      .setTitle('📚 Study Session Started!')
      .setDescription(`Time to study **${subject}**!`)
      .addFields(
        { name: '📖 Subject', value: subject, inline: true },
        { name: '⏱️ Duration', value: formatTime(duration), inline: true },
        { name: '🏁 Ends At', value: `<t:${Math.floor((Date.now() + duration * 1000) / 1000)}:T>`, inline: true },
        { name: '🆔 Session ID', value: `\`${session.id.split('-')[1]}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Study session error:', error);
    await interaction.editReply('❌ An error occurred while starting the study session.');
  }
}

async function handleListTimers(interaction: ChatInputCommandInteraction, timerManager: TimerManager) {
  const activeTimers = timerManager.getActiveTimers(interaction.user.id);

  if (activeTimers.length === 0) {
    return interaction.reply({
      content: '⏰ You don\'t have any active timers. Use `/timer start` to create one!',
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('⏰ Your Active Timers')
    .setTimestamp();

  const timerList = activeTimers.map((timer, index) => {
    const status = timer.isPaused ? '⏸️ Paused' : '▶️ Running';
    const timeLeft = formatTime(timer.remainingTime);
    const progress = Math.floor(((timer.duration - timer.remainingTime) / timer.duration) * 100);
    
    return `**${index + 1}.** ${timer.name}\n` +
           `📊 ${status} | ⏰ ${timeLeft} left | 📈 ${progress}% complete\n` +
           `🆔 \`${timer.id.split('-')[0]}\``;
  }).join('\n\n');

  embed.setDescription(timerList);

  // Add control buttons for the first timer
  const firstTimer = activeTimers[0];
  const buttons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`pause_timer_${firstTimer.id}`)
        .setLabel(firstTimer.isPaused ? '▶️ Resume' : '⏸️ Pause')
        .setStyle(firstTimer.isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stop_timer_${firstTimer.id}`)
        .setLabel('⏹️ Stop')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`view_timer_${firstTimer.id}`)
        .setLabel('👁️ View Details')
        .setStyle(ButtonStyle.Primary)
    );

  const response = await interaction.reply({ 
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
        content: '❌ Only the timer owner can control this timer!', 
        ephemeral: true 
      });
    }

    const [action, , timerId] = buttonInteraction.customId.split('_');
    
    switch (action) {
      case 'pause':
        const paused = timerManager.pauseTimer(timerId);
        const resumed = timerManager.resumeTimer(timerId);
        const timer = timerManager.getTimer(timerId);
        
        if (timer) {
          await buttonInteraction.reply({ 
            content: timer.isPaused ? '⏸️ Timer paused!' : '▶️ Timer resumed!',
            ephemeral: true 
          });
        }
        break;
        
      case 'stop':
        const stopped = timerManager.stopTimer(timerId);
        if (stopped) {
          await buttonInteraction.reply({ 
            content: '⏹️ Timer stopped!',
            ephemeral: true 
          });
        }
        break;
        
      case 'view':
        const viewTimer = timerManager.getTimer(timerId);
        if (viewTimer) {
          const detailEmbed = timerManager.createTimerEmbed(viewTimer);
          await buttonInteraction.reply({ 
            embeds: [detailEmbed],
            ephemeral: true 
          });
        }
        break;
    }
  });

  collector.on('end', () => {
    buttons.components.forEach(button => button.setDisabled(true));
    interaction.editReply({ components: [buttons] }).catch(() => {});
  });
}

async function handleStopTimer(interaction: ChatInputCommandInteraction, timerManager: TimerManager) {
  const timerId = interaction.options.getString('timer_id', true);
  const userTimers = timerManager.getActiveTimers(interaction.user.id);
  
  // Find timer by partial ID
  const timer = userTimers.find(t => t.id.startsWith(timerId) || t.id.includes(timerId));
  
  if (!timer) {
    return interaction.reply({
      content: '❌ Timer not found! Use `/timer list` to see your active timers.',
      ephemeral: true
    });
  }

  const stopped = timerManager.stopTimer(timer.id);
  
  if (stopped) {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('⏹️ Timer Stopped')
      .setDescription(`**${timer.name}** has been stopped.`)
      .addFields(
        { name: '⏱️ Time Remaining', value: formatTime(timer.remainingTime), inline: true },
        { name: '📊 Progress', value: `${Math.floor(((timer.duration - timer.remainingTime) / timer.duration) * 100)}%`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else {
    await interaction.reply({
      content: '❌ Failed to stop the timer. It may have already ended.',
      ephemeral: true
    });
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}