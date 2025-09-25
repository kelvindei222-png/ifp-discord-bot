import { Guild, User, EmbedBuilder, Client, GuildMember } from 'discord.js';

export interface UserStats {
  userId: string;
  guildId: string;
  xp: number;
  level: number;
  messages: number;
  voiceTime: number; // in minutes
  musicListenTime: number; // in minutes
  commandsUsed: number;
  achievements: string[];
  lastActive: Date;
  dailyStreak: number;
  weeklyStreak: number;
  totalReactions: number;
  reactionsReceived: number;
  studyTime: number; // in minutes
  economyBalance: number;
  customFields: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
  reward: number; // XP reward
  category: 'activity' | 'social' | 'music' | 'study' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardCategory {
  id: string;
  name: string;
  emoji: string;
  getValue: (stats: UserStats) => number;
  formatValue: (value: number) => string;
}

export class LeaderboardManager {
  private static instances = new Map<string, LeaderboardManager>();
  private userStats = new Map<string, UserStats>();
  private achievements: Achievement[] = [];
  private categories: LeaderboardCategory[] = [];

  private constructor(private guildId: string, private client: Client) {
    this.initializeAchievements();
    this.initializeCategories();
    this.startPeriodicUpdates();
  }

  public static getInstance(guildId: string, client: Client): LeaderboardManager {
    if (!LeaderboardManager.instances.has(guildId)) {
      LeaderboardManager.instances.set(guildId, new LeaderboardManager(guildId, client));
    }
    return LeaderboardManager.instances.get(guildId)!;
  }

  private initializeAchievements(): void {
    this.achievements = [
      // Activity Achievements
      {
        id: 'first_message',
        name: 'First Steps',
        description: 'Send your first message',
        emoji: '👋',
        condition: (stats) => stats.messages >= 1,
        reward: 10,
        category: 'activity',
        rarity: 'common'
      },
      {
        id: 'chatter',
        name: 'Chatter',
        description: 'Send 100 messages',
        emoji: '💬',
        condition: (stats) => stats.messages >= 100,
        reward: 50,
        category: 'activity',
        rarity: 'common'
      },
      {
        id: 'conversationalist',
        name: 'Conversationalist',
        description: 'Send 1,000 messages',
        emoji: '🗣️',
        condition: (stats) => stats.messages >= 1000,
        reward: 200,
        category: 'activity',
        rarity: 'uncommon'
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Send 10,000 messages',
        emoji: '🦋',
        condition: (stats) => stats.messages >= 10000,
        reward: 1000,
        category: 'activity',
        rarity: 'rare'
      },
      
      // Voice Achievements
      {
        id: 'voice_newcomer',
        name: 'Voice Newcomer',
        description: 'Spend 1 hour in voice channels',
        emoji: '🎤',
        condition: (stats) => stats.voiceTime >= 60,
        reward: 25,
        category: 'social',
        rarity: 'common'
      },
      {
        id: 'voice_regular',
        name: 'Voice Regular',
        description: 'Spend 24 hours in voice channels',
        emoji: '🔊',
        condition: (stats) => stats.voiceTime >= 1440,
        reward: 100,
        category: 'social',
        rarity: 'uncommon'
      },
      {
        id: 'voice_addict',
        name: 'Voice Addict',
        description: 'Spend 168 hours in voice channels',
        emoji: '📢',
        condition: (stats) => stats.voiceTime >= 10080,
        reward: 500,
        category: 'social',
        rarity: 'rare'
      },

      // Music Achievements
      {
        id: 'music_lover',
        name: 'Music Lover',
        description: 'Listen to music for 2 hours',
        emoji: '🎵',
        condition: (stats) => stats.musicListenTime >= 120,
        reward: 50,
        category: 'music',
        rarity: 'common'
      },
      {
        id: 'audiophile',
        name: 'Audiophile',
        description: 'Listen to music for 24 hours',
        emoji: '🎧',
        condition: (stats) => stats.musicListenTime >= 1440,
        reward: 200,
        category: 'music',
        rarity: 'uncommon'
      },
      {
        id: 'music_maestro',
        name: 'Music Maestro',
        description: 'Listen to music for 100 hours',
        emoji: '🎼',
        condition: (stats) => stats.musicListenTime >= 6000,
        reward: 750,
        category: 'music',
        rarity: 'epic'
      },

      // Study Achievements
      {
        id: 'study_starter',
        name: 'Study Starter',
        description: 'Study for 1 hour total',
        emoji: '📚',
        condition: (stats) => stats.studyTime >= 60,
        reward: 30,
        category: 'study',
        rarity: 'common'
      },
      {
        id: 'dedicated_learner',
        name: 'Dedicated Learner',
        description: 'Study for 25 hours total',
        emoji: '🎓',
        condition: (stats) => stats.studyTime >= 1500,
        reward: 150,
        category: 'study',
        rarity: 'uncommon'
      },
      {
        id: 'academic_excellence',
        name: 'Academic Excellence',
        description: 'Study for 100 hours total',
        emoji: '🏆',
        condition: (stats) => stats.studyTime >= 6000,
        reward: 500,
        category: 'study',
        rarity: 'rare'
      },

      // Streak Achievements
      {
        id: 'daily_dedication',
        name: 'Daily Dedication',
        description: 'Maintain a 7-day activity streak',
        emoji: '🔥',
        condition: (stats) => stats.dailyStreak >= 7,
        reward: 100,
        category: 'special',
        rarity: 'uncommon'
      },
      {
        id: 'consistency_king',
        name: 'Consistency King',
        description: 'Maintain a 30-day activity streak',
        emoji: '👑',
        condition: (stats) => stats.dailyStreak >= 30,
        reward: 500,
        category: 'special',
        rarity: 'epic'
      },
      {
        id: 'legendary_streak',
        name: 'Legendary Streak',
        description: 'Maintain a 100-day activity streak',
        emoji: '⚡',
        condition: (stats) => stats.dailyStreak >= 100,
        reward: 2000,
        category: 'special',
        rarity: 'legendary'
      },

      // Level Achievements
      {
        id: 'level_10',
        name: 'Rising Star',
        description: 'Reach level 10',
        emoji: '⭐',
        condition: (stats) => stats.level >= 10,
        reward: 100,
        category: 'special',
        rarity: 'common'
      },
      {
        id: 'level_25',
        name: 'Community Pillar',
        description: 'Reach level 25',
        emoji: '🏛️',
        condition: (stats) => stats.level >= 25,
        reward: 300,
        category: 'special',
        rarity: 'uncommon'
      },
      {
        id: 'level_50',
        name: 'Server Legend',
        description: 'Reach level 50',
        emoji: '🌟',
        condition: (stats) => stats.level >= 50,
        reward: 800,
        category: 'special',
        rarity: 'rare'
      },
      {
        id: 'level_100',
        name: 'Mythical Being',
        description: 'Reach level 100',
        emoji: '🔮',
        condition: (stats) => stats.level >= 100,
        reward: 2500,
        category: 'special',
        rarity: 'legendary'
      }
    ];
  }

  private initializeCategories(): void {
    this.categories = [
      {
        id: 'xp',
        name: 'Experience Points',
        emoji: '⭐',
        getValue: (stats) => stats.xp,
        formatValue: (value) => value.toLocaleString()
      },
      {
        id: 'level',
        name: 'Level',
        emoji: '🔥',
        getValue: (stats) => stats.level,
        formatValue: (value) => `Level ${value}`
      },
      {
        id: 'messages',
        name: 'Messages Sent',
        emoji: '💬',
        getValue: (stats) => stats.messages,
        formatValue: (value) => value.toLocaleString()
      },
      {
        id: 'voice',
        name: 'Voice Time',
        emoji: '🎤',
        getValue: (stats) => stats.voiceTime,
        formatValue: (value) => `${Math.floor(value / 60)}h ${value % 60}m`
      },
      {
        id: 'music',
        name: 'Music Time',
        emoji: '🎵',
        getValue: (stats) => stats.musicListenTime,
        formatValue: (value) => `${Math.floor(value / 60)}h ${value % 60}m`
      },
      {
        id: 'study',
        name: 'Study Time',
        emoji: '📚',
        getValue: (stats) => stats.studyTime,
        formatValue: (value) => `${Math.floor(value / 60)}h ${value % 60}m`
      },
      {
        id: 'streak',
        name: 'Daily Streak',
        emoji: '🔥',
        getValue: (stats) => stats.dailyStreak,
        formatValue: (value) => `${value} days`
      },
      {
        id: 'achievements',
        name: 'Achievements',
        emoji: '🏆',
        getValue: (stats) => stats.achievements.length,
        formatValue: (value) => `${value} unlocked`
      }
    ];
  }

  public getUserStats(userId: string): UserStats {
    const key = `${this.guildId}:${userId}`;
    if (!this.userStats.has(key)) {
      this.userStats.set(key, {
        userId,
        guildId: this.guildId,
        xp: 0,
        level: 1,
        messages: 0,
        voiceTime: 0,
        musicListenTime: 0,
        commandsUsed: 0,
        achievements: [],
        lastActive: new Date(),
        dailyStreak: 0,
        weeklyStreak: 0,
        totalReactions: 0,
        reactionsReceived: 0,
        studyTime: 0,
        economyBalance: 0,
        customFields: {}
      });
    }
    return this.userStats.get(key)!;
  }

  public addXP(userId: string, amount: number, source: string = 'activity'): { levelUp: boolean; newLevel?: number } {
    const stats = this.getUserStats(userId);
    stats.xp += amount;
    stats.lastActive = new Date();

    const oldLevel = stats.level;
    const newLevel = this.calculateLevel(stats.xp);
    const levelUp = newLevel > oldLevel;

    if (levelUp) {
      stats.level = newLevel;
      this.checkAchievements(userId);
    }

    return { levelUp, newLevel: levelUp ? newLevel : undefined };
  }

  public addActivity(userId: string, type: string, amount: number = 1): void {
    const stats = this.getUserStats(userId);
    
    switch (type) {
      case 'message':
        stats.messages += amount;
        this.addXP(userId, Math.floor(Math.random() * 15) + 5, 'message'); // 5-20 XP per message
        break;
      case 'voice':
        stats.voiceTime += amount;
        this.addXP(userId, amount * 2, 'voice'); // 2 XP per minute
        break;
      case 'music':
        stats.musicListenTime += amount;
        this.addXP(userId, amount, 'music'); // 1 XP per minute
        break;
      case 'study':
        stats.studyTime += amount;
        this.addXP(userId, amount * 3, 'study'); // 3 XP per minute of study
        break;
      case 'reaction_given':
        stats.totalReactions += amount;
        this.addXP(userId, amount, 'reaction');
        break;
      case 'reaction_received':
        stats.reactionsReceived += amount;
        this.addXP(userId, amount * 2, 'reaction');
        break;
      case 'command':
        stats.commandsUsed += amount;
        this.addXP(userId, 2, 'command');
        break;
    }

    this.checkAchievements(userId);
  }

  private calculateLevel(xp: number): number {
    // Progressive XP curve: level = floor(sqrt(xp / 100))
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  public getXPForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  public getXPToNextLevel(stats: UserStats): number {
    const nextLevelXP = this.getXPForLevel(stats.level + 1);
    return nextLevelXP - stats.xp;
  }

  private checkAchievements(userId: string): string[] {
    const stats = this.getUserStats(userId);
    const newAchievements: string[] = [];

    for (const achievement of this.achievements) {
      if (!stats.achievements.includes(achievement.id) && achievement.condition(stats)) {
        stats.achievements.push(achievement.id);
        stats.xp += achievement.reward;
        newAchievements.push(achievement.id);
      }
    }

    return newAchievements;
  }

  public getLeaderboard(category: string, limit: number = 10): Array<UserStats & { rank: number }> {
    const categoryConfig = this.categories.find(c => c.id === category);
    if (!categoryConfig) return [];

    const allStats = Array.from(this.userStats.values())
      .filter(stats => stats.guildId === this.guildId)
      .sort((a, b) => categoryConfig.getValue(b) - categoryConfig.getValue(a))
      .slice(0, limit)
      .map((stats, index) => ({ ...stats, rank: index + 1 }));

    return allStats;
  }

  public getUserRank(userId: string, category: string): number {
    const categoryConfig = this.categories.find(c => c.id === category);
    if (!categoryConfig) return -1;

    const userStats = this.getUserStats(userId);
    const userValue = categoryConfig.getValue(userStats);

    const rank = Array.from(this.userStats.values())
      .filter(stats => stats.guildId === this.guildId)
      .filter(stats => categoryConfig.getValue(stats) > userValue)
      .length + 1;

    return rank;
  }

  public createLeaderboardEmbed(category: string, limit: number = 10): EmbedBuilder {
    const categoryConfig = this.categories.find(c => c.id === category);
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }

    const leaderboard = this.getLeaderboard(category, limit);
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`${categoryConfig.emoji} ${categoryConfig.name} Leaderboard`)
      .setTimestamp();

    if (leaderboard.length === 0) {
      embed.setDescription('No data available yet. Start being active to appear on the leaderboard!');
      return embed;
    }

    const description = leaderboard.map((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔸';
      const value = categoryConfig.formatValue(categoryConfig.getValue(user));
      return `${medal} **${user.rank}.** <@${user.userId}> - ${value}`;
    }).join('\n');

    embed.setDescription(description);

    // Add footer with total participants
    const totalUsers = Array.from(this.userStats.values())
      .filter(stats => stats.guildId === this.guildId).length;
    
    embed.setFooter({ text: `Total participants: ${totalUsers}` });

    return embed;
  }

  public createUserProfileEmbed(userId: string, member: GuildMember): EmbedBuilder {
    const stats = this.getUserStats(userId);
    const embed = new EmbedBuilder()
      .setColor(member.displayColor || 0x00ff00)
      .setTitle(`📊 ${member.displayName}'s Profile`)
      .setThumbnail(member.displayAvatarURL())
      .setTimestamp();

    // Level and XP
    const xpToNext = this.getXPToNextLevel(stats);
    const levelProgress = `Level ${stats.level} (${stats.xp.toLocaleString()} XP)\n${xpToNext.toLocaleString()} XP to next level`;
    
    embed.addFields(
      { name: '⭐ Level & Experience', value: levelProgress, inline: true },
      { name: '🔥 Daily Streak', value: `${stats.dailyStreak} days`, inline: true },
      { name: '💬 Messages', value: stats.messages.toLocaleString(), inline: true },
      { name: '🎤 Voice Time', value: `${Math.floor(stats.voiceTime / 60)}h ${stats.voiceTime % 60}m`, inline: true },
      { name: '🎵 Music Time', value: `${Math.floor(stats.musicListenTime / 60)}h ${stats.musicListenTime % 60}m`, inline: true },
      { name: '📚 Study Time', value: `${Math.floor(stats.studyTime / 60)}h ${stats.studyTime % 60}m`, inline: true }
    );

    // Recent achievements
    const recentAchievements = stats.achievements.slice(-3)
      .map(id => this.achievements.find(a => a.id === id))
      .filter(Boolean)
      .map(achievement => `${achievement!.emoji} ${achievement!.name}`)
      .join('\n') || 'No recent achievements';

    embed.addFields(
      { name: '🏆 Recent Achievements', value: recentAchievements, inline: false },
      { name: '📈 Total Achievements', value: `${stats.achievements.length}/${this.achievements.length}`, inline: true }
    );

    return embed;
  }

  public getCategories(): LeaderboardCategory[] {
    return [...this.categories];
  }

  public getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  public getAchievement(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id);
  }

  private startPeriodicUpdates(): void {
    // Update streaks every hour
    setInterval(() => {
      this.updateStreaks();
    }, 60 * 60 * 1000);
  }

  private updateStreaks(): void {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const stats of this.userStats.values()) {
      if (stats.guildId !== this.guildId) continue;

      // Check if user was active yesterday
      if (stats.lastActive < yesterday) {
        stats.dailyStreak = 0;
        stats.weeklyStreak = 0;
      } else if (stats.lastActive >= yesterday) {
        // User was active, potentially increment streak
        const daysSinceActive = Math.floor((now.getTime() - stats.lastActive.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceActive === 1) {
          stats.dailyStreak += 1;
          if (stats.dailyStreak % 7 === 0) {
            stats.weeklyStreak += 1;
          }
        }
      }
    }
  }
}