import { 
  Client, 
  Message, 
  VoiceState, 
  MessageReaction, 
  User, 
  PartialMessageReaction, 
  PartialUser 
} from 'discord.js';
import { LeaderboardManager } from '../lib/leaderboardManager';

interface VoiceTracker {
  userId: string;
  joinTime: number;
  channelId: string;
}

class ActivityTracker {
  private voiceTrackers = new Map<string, VoiceTracker>();

  constructor(private client: Client) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Message activity tracking
    this.client.on('messageCreate', this.handleMessage.bind(this));
    
    // Voice activity tracking
    this.client.on('voiceStateUpdate', this.handleVoiceStateUpdate.bind(this));
    
    // Reaction tracking
    this.client.on('messageReactionAdd', this.handleReactionAdd.bind(this));
    this.client.on('messageReactionRemove', this.handleReactionRemove.bind(this));
    
    // Command usage tracking
    this.client.on('interactionCreate', this.handleInteraction.bind(this));
  }

  private async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const leaderboardManager = LeaderboardManager.getInstance(message.guild.id, this.client);
    
    // Add message activity and XP
    leaderboardManager.addActivity(message.author.id, 'message', 1);

    // Check for level up notifications
    const result = leaderboardManager.addXP(message.author.id, 0); // XP already added in addActivity
    if (result.levelUp && result.newLevel) {
      await this.sendLevelUpNotification(message, message.author.id, result.newLevel);
    }

    // Check for new achievements
    const stats = leaderboardManager.getUserStats(message.author.id);
    if (stats.messages === 1 || stats.messages === 100 || stats.messages === 1000 || stats.messages === 10000) {
      await this.sendAchievementNotification(message, message.author.id);
    }
  }

  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!oldState.guild || !newState.member || newState.member.user.bot) return;

    const userId = newState.member.id;
    const guildId = newState.guild.id;
    const leaderboardManager = LeaderboardManager.getInstance(guildId, this.client);

    // User joined a voice channel
    if (!oldState.channel && newState.channel) {
      this.voiceTrackers.set(userId, {
        userId,
        joinTime: Date.now(),
        channelId: newState.channelId!
      });
    }
    // User left a voice channel
    else if (oldState.channel && !newState.channel) {
      const tracker = this.voiceTrackers.get(userId);
      if (tracker) {
        const duration = Math.floor((Date.now() - tracker.joinTime) / 1000 / 60); // in minutes
        if (duration >= 1) { // Only track if spent at least 1 minute
          leaderboardManager.addActivity(userId, 'voice', duration);
        }
        this.voiceTrackers.delete(userId);
      }
    }
    // User switched channels
    else if (oldState.channelId !== newState.channelId) {
      const tracker = this.voiceTrackers.get(userId);
      if (tracker) {
        const duration = Math.floor((Date.now() - tracker.joinTime) / 1000 / 60);
        if (duration >= 1) {
          leaderboardManager.addActivity(userId, 'voice', duration);
        }
        // Update tracker for new channel
        tracker.joinTime = Date.now();
        tracker.channelId = newState.channelId!;
      }
    }
  }

  private async handleReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (user.bot || !reaction.message.guild) return;

    const leaderboardManager = LeaderboardManager.getInstance(reaction.message.guild.id, this.client);
    
    // Track reaction given
    leaderboardManager.addActivity(user.id, 'reaction_given', 1);
    
    // Track reaction received (for message author)
    if (reaction.message.author && !reaction.message.author.bot && reaction.message.author.id !== user.id) {
      leaderboardManager.addActivity(reaction.message.author.id, 'reaction_received', 1);
    }
  }

  private async handleReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (user.bot || !reaction.message.guild) return;

    const leaderboardManager = LeaderboardManager.getInstance(reaction.message.guild.id, this.client);
    
    // Remove reaction tracking (negative values)
    leaderboardManager.addActivity(user.id, 'reaction_given', -1);
    
    if (reaction.message.author && !reaction.message.author.bot && reaction.message.author.id !== user.id) {
      leaderboardManager.addActivity(reaction.message.author.id, 'reaction_received', -1);
    }
  }

  private async handleInteraction(interaction: any): Promise<void> {
    if (!interaction.isCommand() || !interaction.guild || interaction.user.bot) return;

    const leaderboardManager = LeaderboardManager.getInstance(interaction.guild.id, this.client);
    leaderboardManager.addActivity(interaction.user.id, 'command', 1);
  }

  private async sendLevelUpNotification(message: Message, userId: string, newLevel: number): Promise<void> {
    const member = message.guild?.members.cache.get(userId);
    if (!member) return;

    // Create level up embed
    const embed = {
      color: 0x00ff00,
      title: '🎉 Level Up!',
      description: `Congratulations ${member.displayName}! You've reached **Level ${newLevel}**!`,
      thumbnail: { url: member.displayAvatarURL() },
      fields: [
        {
          name: '⭐ New Level',
          value: newLevel.toString(),
          inline: true
        },
        {
          name: '🎯 Achievement',
          value: this.getLevelUpReward(newLevel),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Send in the same channel if it's a text-based channel
    try {
      if ('send' in message.channel) {
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Failed to send level up notification:', error);
    }
  }

  private async sendAchievementNotification(message: Message, userId: string): Promise<void> {
    if (!message.guild) return;
    const member = message.guild.members.cache.get(userId);
    if (!member) return;

    const leaderboardManager = LeaderboardManager.getInstance(message.guild.id, this.client);
    const stats = leaderboardManager.getUserStats(userId);
    const achievements = leaderboardManager.getAchievements();
    
    // Find achievements unlocked with this message
    const recentAchievement = achievements.find(a => 
      stats.achievements.includes(a.id) && 
      (stats.messages === 1 || stats.messages === 100 || stats.messages === 1000 || stats.messages === 10000)
    );

    if (recentAchievement) {
      const embed = {
        color: this.getAchievementColor(recentAchievement.rarity),
        title: '🏆 Achievement Unlocked!',
        description: `${member.displayName} earned: **${recentAchievement.name}**`,
        thumbnail: { url: member.displayAvatarURL() },
        fields: [
          {
            name: `${recentAchievement.emoji} ${recentAchievement.name}`,
            value: recentAchievement.description,
            inline: false
          },
          {
            name: '💰 Reward',
            value: `+${recentAchievement.reward} XP`,
            inline: true
          },
          {
            name: '💎 Rarity',
            value: recentAchievement.rarity.charAt(0).toUpperCase() + recentAchievement.rarity.slice(1),
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      try {
        if ('send' in message.channel) {
          await message.channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Failed to send achievement notification:', error);
      }
    }
  }

  private getLevelUpReward(level: number): string {
    if (level >= 100) return '🔮 Mythical Status';
    if (level >= 50) return '🌟 Server Legend';
    if (level >= 25) return '🏛️ Community Pillar';
    if (level >= 10) return '⭐ Rising Star';
    if (level >= 5) return '🚀 Getting Started';
    return '📈 Keep Growing!';
  }

  private getAchievementColor(rarity: string): number {
    const colors = {
      common: 0x95a5a6,      // Gray
      uncommon: 0x2ecc71,    // Green
      rare: 0x3498db,        // Blue
      epic: 0x9b59b6,        // Purple
      legendary: 0xf39c12    // Orange/Gold
    };
    return colors[rarity as keyof typeof colors] || 0x95a5a6;
  }

  // Cleanup method for voice trackers when bot restarts
  public cleanup(): void {
    this.voiceTrackers.clear();
  }

  // Manual method to process existing voice states on startup
  public async processExistingVoiceStates(): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      for (const member of guild.members.cache.values()) {
        if (member.voice.channel && !member.user.bot) {
          this.voiceTrackers.set(member.id, {
            userId: member.id,
            joinTime: Date.now(),
            channelId: member.voice.channelId!
          });
        }
      }
    }
  }
}

// Export function to initialize activity tracking
export function initializeActivityTracking(client: Client): ActivityTracker {
  const tracker = new ActivityTracker(client);
  
  // Process existing voice states when bot starts
  client.once('ready', () => {
    tracker.processExistingVoiceStates();
  });

  return tracker;
}