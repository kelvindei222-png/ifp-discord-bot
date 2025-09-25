import { 
  Client, 
  Guild, 
  User, 
  TextChannel, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} from 'discord.js';

export interface Timer {
  id: string;
  userId: string;
  guildId: string;
  channelId: string;
  type: 'pomodoro' | 'study' | 'break' | 'reminder' | 'custom';
  name: string;
  description?: string;
  duration: number; // in seconds
  remainingTime: number;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  isPaused: boolean;
  phase?: 'work' | 'shortBreak' | 'longBreak'; // for pomodoro
  cycleCount?: number; // for pomodoro cycles
  totalCycles?: number;
  recurring?: {
    interval: number; // in seconds
    count?: number; // how many times to repeat
  };
  notifications: {
    halfway: boolean;
    fiveMin: boolean;
    oneMin: boolean;
    completed: boolean;
  };
  settings: {
    autoStart: boolean;
    playSound: boolean;
    mentionUser: boolean;
    showProgress: boolean;
  };
}

export interface TimerPreset {
  id: string;
  name: string;
  type: Timer['type'];
  duration: number;
  description: string;
  emoji: string;
  category: 'productivity' | 'study' | 'wellness' | 'custom';
}

export interface StudySession {
  id: string;
  userId: string;
  subject: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  breaks: Array<{ start: Date; end: Date; duration: number }>;
  notes?: string;
  rating?: number; // 1-5 stars
  completed: boolean;
}

export class TimerManager {
  private static instances = new Map<string, TimerManager>();
  private activeTimers = new Map<string, Timer>();
  private studySessions = new Map<string, StudySession>();
  private presets: TimerPreset[] = [];
  private intervals = new Map<string, NodeJS.Timeout>();

  private constructor(private guildId: string, private client: Client) {
    this.initializePresets();
    this.startPeriodicUpdates();
  }

  public static getInstance(guildId: string, client: Client): TimerManager {
    if (!TimerManager.instances.has(guildId)) {
      TimerManager.instances.set(guildId, new TimerManager(guildId, client));
    }
    return TimerManager.instances.get(guildId)!;
  }

  private initializePresets(): void {
    this.presets = [
      // Pomodoro Timers
      {
        id: 'pomodoro_25',
        name: 'Classic Pomodoro',
        type: 'pomodoro',
        duration: 25 * 60,
        description: '25 minutes of focused work',
        emoji: '🍅',
        category: 'productivity'
      },
      {
        id: 'pomodoro_45',
        name: 'Extended Pomodoro',
        type: 'pomodoro',
        duration: 45 * 60,
        description: '45 minutes of deep work',
        emoji: '🔥',
        category: 'productivity'
      },
      {
        id: 'pomodoro_90',
        name: 'Ultradian Rhythm',
        type: 'pomodoro',
        duration: 90 * 60,
        description: '90 minutes following natural focus cycles',
        emoji: '🧠',
        category: 'productivity'
      },

      // Study Sessions
      {
        id: 'study_30',
        name: 'Quick Study',
        type: 'study',
        duration: 30 * 60,
        description: '30 minutes of focused studying',
        emoji: '📚',
        category: 'study'
      },
      {
        id: 'study_60',
        name: 'Study Hour',
        type: 'study',
        duration: 60 * 60,
        description: '1 hour of dedicated learning',
        emoji: '📖',
        category: 'study'
      },
      {
        id: 'study_120',
        name: 'Deep Study',
        type: 'study',
        duration: 120 * 60,
        description: '2 hours of intensive studying',
        emoji: '🎓',
        category: 'study'
      },

      // Break Timers
      {
        id: 'break_5',
        name: 'Quick Break',
        type: 'break',
        duration: 5 * 60,
        description: '5 minute refresher break',
        emoji: '☕',
        category: 'wellness'
      },
      {
        id: 'break_15',
        name: 'Standard Break',
        type: 'break',
        duration: 15 * 60,
        description: '15 minute relaxation break',
        emoji: '🧘',
        category: 'wellness'
      },
      {
        id: 'break_30',
        name: 'Long Break',
        type: 'break',
        duration: 30 * 60,
        description: '30 minute extended break',
        emoji: '🌿',
        category: 'wellness'
      },

      // Wellness Timers
      {
        id: 'meditation_10',
        name: 'Quick Meditation',
        type: 'custom',
        duration: 10 * 60,
        description: '10 minutes of mindfulness',
        emoji: '🧘‍♂️',
        category: 'wellness'
      },
      {
        id: 'meditation_20',
        name: 'Deep Meditation',
        type: 'custom',
        duration: 20 * 60,
        description: '20 minutes of deep meditation',
        emoji: '🕯️',
        category: 'wellness'
      },
      {
        id: 'exercise_30',
        name: 'Workout Session',
        type: 'custom',
        duration: 30 * 60,
        description: '30 minutes of exercise',
        emoji: '💪',
        category: 'wellness'
      }
    ];
  }

  public createTimer(
    userId: string,
    channelId: string,
    type: Timer['type'],
    duration: number,
    name: string,
    options: Partial<Timer> = {}
  ): Timer {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const timer: Timer = {
      id,
      userId,
      guildId: this.guildId,
      channelId,
      type,
      name,
      description: options.description,
      duration,
      remainingTime: duration,
      startTime: now,
      endTime: new Date(now.getTime() + duration * 1000),
      isActive: true,
      isPaused: false,
      phase: options.phase,
      cycleCount: options.cycleCount || 0,
      totalCycles: options.totalCycles || 1,
      recurring: options.recurring,
      notifications: {
        halfway: true,
        fiveMin: true,
        oneMin: true,
        completed: true,
        ...options.notifications
      },
      settings: {
        autoStart: true,
        playSound: false,
        mentionUser: true,
        showProgress: true,
        ...options.settings
      }
    };

    this.activeTimers.set(id, timer);
    this.startTimer(timer);
    return timer;
  }

  public createPomodoroSession(
    userId: string,
    channelId: string,
    workDuration: number = 25 * 60,
    shortBreakDuration: number = 5 * 60,
    longBreakDuration: number = 15 * 60,
    totalCycles: number = 4
  ): Timer {
    return this.createTimer(userId, channelId, 'pomodoro', workDuration, 'Pomodoro Session', {
      phase: 'work',
      cycleCount: 0,
      totalCycles,
      description: `${totalCycles}-cycle Pomodoro session with ${workDuration/60}min work periods`
    });
  }

  public createStudySession(userId: string, channelId: string, subject: string, duration: number): StudySession {
    const id = `study-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: StudySession = {
      id,
      userId,
      subject,
      startTime: new Date(),
      duration: duration / 60, // convert to minutes
      breaks: [],
      completed: false
    };

    this.studySessions.set(id, session);
    
    // Create associated timer
    this.createTimer(userId, channelId, 'study', duration, `Study: ${subject}`, {
      description: `Studying ${subject} for ${duration/60} minutes`
    });

    return session;
  }

  private startTimer(timer: Timer): void {
    const updateInterval = setInterval(() => {
      if (timer.isPaused || !timer.isActive) return;

      timer.remainingTime -= 1;

      // Check for notifications
      this.checkNotifications(timer);

      // Timer completed
      if (timer.remainingTime <= 0) {
        this.completeTimer(timer);
        clearInterval(updateInterval);
        this.intervals.delete(timer.id);
      }
    }, 1000);

    this.intervals.set(timer.id, updateInterval);
  }

  private async checkNotifications(timer: Timer): Promise<void> {
    const channel = await this.client.channels.fetch(timer.channelId) as TextChannel;
    if (!channel) return;

    const remainingPercent = timer.remainingTime / timer.duration;
    const remainingMinutes = Math.floor(timer.remainingTime / 60);

    // Halfway notification
    if (timer.notifications.halfway && remainingPercent <= 0.5 && remainingPercent > 0.49) {
      await this.sendNotification(channel, timer, '⏰ Halfway point reached!', 'You\'re halfway through your timer.');
    }

    // 5 minute warning
    if (timer.notifications.fiveMin && timer.remainingTime === 300) {
      await this.sendNotification(channel, timer, '⏰ 5 minutes remaining!', 'Almost there! Keep going strong.');
    }

    // 1 minute warning
    if (timer.notifications.oneMin && timer.remainingTime === 60) {
      await this.sendNotification(channel, timer, '⏰ 1 minute remaining!', 'Final stretch! You\'ve got this.');
    }
  }

  private async completeTimer(timer: Timer): Promise<void> {
    timer.isActive = false;
    timer.remainingTime = 0;

    const channel = await this.client.channels.fetch(timer.channelId) as TextChannel;
    if (!channel) return;

    // Handle Pomodoro cycle logic
    if (timer.type === 'pomodoro' && timer.totalCycles && timer.cycleCount! < timer.totalCycles) {
      await this.handlePomodoroCompletion(timer, channel);
    } else {
      await this.sendCompletionNotification(channel, timer);
      
      // Handle recurring timers
      if (timer.recurring && (timer.recurring.count === undefined || timer.recurring.count > 0)) {
        setTimeout(() => {
          this.createRecurringTimer(timer);
        }, timer.recurring.interval * 1000);
      }
    }

    // Update study session if applicable
    if (timer.type === 'study') {
      this.updateStudySession(timer);
    }
  }

  private async handlePomodoroCompletion(timer: Timer, channel: TextChannel): Promise<void> {
    timer.cycleCount!++;
    
    if (timer.phase === 'work') {
      // Work phase completed, start break
      const isLongBreak = timer.cycleCount! % 4 === 0;
      const breakDuration = isLongBreak ? 15 * 60 : 5 * 60;
      
      const breakTimer = this.createTimer(
        timer.userId,
        timer.channelId,
        'break',
        breakDuration,
        isLongBreak ? 'Long Break' : 'Short Break',
        {
          phase: isLongBreak ? 'longBreak' : 'shortBreak',
          cycleCount: timer.cycleCount,
          totalCycles: timer.totalCycles,
          description: `${isLongBreak ? 'Long' : 'Short'} break after work session ${timer.cycleCount}`
        }
      );

      await this.sendPomodoroTransition(channel, timer, breakTimer, 'work', isLongBreak);
      
    } else {
      // Break completed, start work (if not finished)
      if (timer.cycleCount! < timer.totalCycles!) {
        const workTimer = this.createTimer(
          timer.userId,
          timer.channelId,
          'pomodoro',
          25 * 60, // Default work duration
          `Work Session ${timer.cycleCount! + 1}`,
          {
            phase: 'work',
            cycleCount: timer.cycleCount,
            totalCycles: timer.totalCycles,
            description: `Work session ${timer.cycleCount! + 1} of ${timer.totalCycles}`
          }
        );

        await this.sendPomodoroTransition(channel, timer, workTimer, 'break', false);
      } else {
        // All cycles completed
        await this.sendPomodoroSessionComplete(channel, timer);
      }
    }
  }

  private createRecurringTimer(originalTimer: Timer): void {
    if (originalTimer.recurring) {
      if (originalTimer.recurring.count !== undefined) {
        originalTimer.recurring.count--;
        if (originalTimer.recurring.count <= 0) return;
      }

      this.createTimer(
        originalTimer.userId,
        originalTimer.channelId,
        originalTimer.type,
        originalTimer.duration,
        originalTimer.name,
        {
          ...originalTimer,
          recurring: originalTimer.recurring
        }
      );
    }
  }

  private async sendNotification(channel: TextChannel, timer: Timer, title: string, description: string): Promise<void> {
    const user = timer.settings.mentionUser ? `<@${timer.userId}>` : '';
    
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle(title)
      .setDescription(`${description}\n\n**Timer:** ${timer.name}`)
      .addFields(
        { name: '⏰ Time Remaining', value: this.formatTime(timer.remainingTime), inline: true },
        { name: '📊 Progress', value: this.createProgressBar(timer), inline: true }
      )
      .setTimestamp();

    await channel.send({ content: user, embeds: [embed] });
  }

  private async sendCompletionNotification(channel: TextChannel, timer: Timer): Promise<void> {
    const user = timer.settings.mentionUser ? `<@${timer.userId}>` : '';
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎉 Timer Completed!')
      .setDescription(`**${timer.name}** has finished!`)
      .addFields(
        { name: '⏱️ Duration', value: this.formatTime(timer.duration), inline: true },
        { name: '✅ Status', value: 'Completed', inline: true }
      )
      .setTimestamp();

    if (timer.description) {
      embed.addFields({ name: '📝 Description', value: timer.description, inline: false });
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`restart_timer_${timer.id}`)
          .setLabel('🔄 Restart')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rate_session_${timer.id}`)
          .setLabel('⭐ Rate Session')
          .setStyle(ButtonStyle.Secondary)
      );

    await channel.send({ 
      content: user, 
      embeds: [embed], 
      components: timer.type === 'study' ? [buttons] : undefined 
    });
  }

  private async sendPomodoroTransition(
    channel: TextChannel, 
    completedTimer: Timer, 
    nextTimer: Timer, 
    completedPhase: string, 
    isLongBreak: boolean
  ): Promise<void> {
    const user = completedTimer.settings.mentionUser ? `<@${completedTimer.userId}>` : '';
    
    const embed = new EmbedBuilder()
      .setColor(completedPhase === 'work' ? 0x00ff00 : 0x0099ff)
      .setTitle(completedPhase === 'work' ? '🎉 Work Session Complete!' : '🔄 Break Time Over!')
      .setDescription(
        completedPhase === 'work' 
          ? `Great job! Time for a ${isLongBreak ? 'long' : 'short'} break.`
          : 'Break time is over. Ready to get back to work?'
      )
      .addFields(
        { name: '📊 Progress', value: `${completedTimer.cycleCount}/${completedTimer.totalCycles} cycles completed`, inline: true },
        { name: '⏭️ Next Phase', value: nextTimer.name, inline: true },
        { name: '⏰ Duration', value: this.formatTime(nextTimer.duration), inline: true }
      )
      .setTimestamp();

    await channel.send({ content: user, embeds: [embed] });
  }

  private async sendPomodoroSessionComplete(channel: TextChannel, timer: Timer): Promise<void> {
    const user = timer.settings.mentionUser ? `<@${timer.userId}>` : '';
    
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🏆 Pomodoro Session Complete!')
      .setDescription(`Congratulations! You've completed all ${timer.totalCycles} work cycles!`)
      .addFields(
        { name: '✅ Cycles Completed', value: `${timer.cycleCount}/${timer.totalCycles}`, inline: true },
        { name: '⏱️ Total Work Time', value: this.formatTime(timer.totalCycles! * 25 * 60), inline: true },
        { name: '🎯 Achievement', value: 'Pomodoro Master', inline: true }
      )
      .setTimestamp();

    await channel.send({ content: user, embeds: [embed] });
  }

  public pauseTimer(timerId: string): boolean {
    const timer = this.activeTimers.get(timerId);
    if (!timer || !timer.isActive) return false;

    timer.isPaused = true;
    return true;
  }

  public resumeTimer(timerId: string): boolean {
    const timer = this.activeTimers.get(timerId);
    if (!timer || !timer.isActive || !timer.isPaused) return false;

    timer.isPaused = false;
    timer.endTime = new Date(Date.now() + timer.remainingTime * 1000);
    return true;
  }

  public stopTimer(timerId: string): boolean {
    const timer = this.activeTimers.get(timerId);
    if (!timer) return false;

    timer.isActive = false;
    const interval = this.intervals.get(timerId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(timerId);
    }
    
    this.activeTimers.delete(timerId);
    return true;
  }

  public getActiveTimers(userId?: string): Timer[] {
    const timers = Array.from(this.activeTimers.values())
      .filter(timer => timer.guildId === this.guildId);
    
    return userId ? timers.filter(timer => timer.userId === userId) : timers;
  }

  public getTimer(timerId: string): Timer | undefined {
    return this.activeTimers.get(timerId);
  }

  public createTimerEmbed(timer: Timer): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(timer.isPaused ? 0xffa500 : timer.isActive ? 0x00ff00 : 0xff0000)
      .setTitle(`${this.getTimerEmoji(timer.type)} ${timer.name}`)
      .setTimestamp();

    if (timer.description) {
      embed.setDescription(timer.description);
    }

    const status = timer.isPaused ? 'Paused' : timer.isActive ? 'Running' : 'Completed';
    const statusEmoji = timer.isPaused ? '⏸️' : timer.isActive ? '▶️' : '✅';

    embed.addFields(
      { name: '📊 Status', value: `${statusEmoji} ${status}`, inline: true },
      { name: '⏰ Time Remaining', value: this.formatTime(timer.remainingTime), inline: true },
      { name: '⏱️ Total Duration', value: this.formatTime(timer.duration), inline: true }
    );

    if (timer.settings.showProgress) {
      embed.addFields({ 
        name: '📈 Progress', 
        value: this.createProgressBar(timer), 
        inline: false 
      });
    }

    if (timer.type === 'pomodoro' && timer.totalCycles) {
      embed.addFields({ 
        name: '🔄 Cycles', 
        value: `${timer.cycleCount}/${timer.totalCycles}`, 
        inline: true 
      });
    }

    return embed;
  }

  private getTimerEmoji(type: Timer['type']): string {
    const emojis = {
      pomodoro: '🍅',
      study: '📚',
      break: '☕',
      reminder: '⏰',
      custom: '⚙️'
    };
    return emojis[type] || '⏰';
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private createProgressBar(timer: Timer, length: number = 20): string {
    const progress = 1 - (timer.remainingTime / timer.duration);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.floor(progress * 100);
    
    return `${bar} ${percent}%`;
  }

  private updateStudySession(timer: Timer): void {
    const session = Array.from(this.studySessions.values())
      .find(s => s.userId === timer.userId && !s.completed);
    
    if (session) {
      session.endTime = new Date();
      session.completed = true;
    }
  }

  public getPresets(): TimerPreset[] {
    return [...this.presets];
  }

  public getPresetsByCategory(category: TimerPreset['category']): TimerPreset[] {
    return this.presets.filter(preset => preset.category === category);
  }

  private startPeriodicUpdates(): void {
    // Clean up completed timers every 5 minutes
    setInterval(() => {
      this.cleanupCompletedTimers();
    }, 5 * 60 * 1000);
  }

  private cleanupCompletedTimers(): void {
    const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago
    
    for (const [id, timer] of this.activeTimers.entries()) {
      if (!timer.isActive && timer.endTime.getTime() < cutoffTime) {
        this.activeTimers.delete(id);
        const interval = this.intervals.get(id);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(id);
        }
      }
    }
  }
}