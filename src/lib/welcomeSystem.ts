import * as fs from 'fs';
import * as path from 'path';
import { GuildMember, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateWelcomeCard } from './welcomeCard';
import { economyManager } from './economyManager';

interface WelcomeConfig {
  enabled: boolean;
  channelId?: string;
  message?: string;
  cardEnabled: boolean;
  autoRole?: string;
  dmWelcome: boolean;
  embedColor: string;
  bonusCoins: number;
  mentionUser: boolean;
}

interface GuildWelcomeConfig {
  [guildId: string]: WelcomeConfig;
}

const configPath = path.join(__dirname, '../data/welcomeConfig.json');

export class WelcomeSystem {
  private config: GuildWelcomeConfig = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading welcome config:', error);
      this.config = {};
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving welcome config:', error);
    }
  }

  private getGuildConfig(guildId: string): WelcomeConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {
        enabled: true,
        cardEnabled: true,
        dmWelcome: false,
        embedColor: '#667eea',
        bonusCoins: 100,
        mentionUser: true,
        message: 'Welcome to **{server}**, {user}! 🎉\n\nWe\'re excited to have you here! Make sure to:\n📜 Read the rules\n🎭 Get your roles\n💬 Say hi in chat\n\nEnjoy your stay! ✨'
      };
      this.saveConfig();
    }
    return this.config[guildId];
  }

  public setWelcomeChannel(guildId: string, channelId: string): void {
    const config = this.getGuildConfig(guildId);
    config.channelId = channelId;
    this.saveConfig();
  }

  public setWelcomeMessage(guildId: string, message: string): void {
    const config = this.getGuildConfig(guildId);
    config.message = message;
    this.saveConfig();
  }

  public toggleWelcome(guildId: string, enabled: boolean): void {
    const config = this.getGuildConfig(guildId);
    config.enabled = enabled;
    this.saveConfig();
  }

  public toggleCard(guildId: string, enabled: boolean): void {
    const config = this.getGuildConfig(guildId);
    config.cardEnabled = enabled;
    this.saveConfig();
  }

  public setAutoRole(guildId: string, roleId?: string): void {
    const config = this.getGuildConfig(guildId);
    config.autoRole = roleId;
    this.saveConfig();
  }

  public async handleMemberJoin(member: GuildMember): Promise<void> {
    const config = this.getGuildConfig(member.guild.id);
    
    if (!config.enabled) return;

    try {
      // Give welcome bonus coins
      if (config.bonusCoins > 0) {
        economyManager.addMoney(member.id, config.bonusCoins);
        economyManager.addXP(member.id, 50); // Bonus XP for joining
      }

      // Auto-role assignment
      if (config.autoRole) {
        const role = member.guild.roles.cache.get(config.autoRole);
        if (role) {
          await member.roles.add(role);
        }
      }

      // Send welcome message in channel
      if (config.channelId) {
        const channel = member.guild.channels.cache.get(config.channelId) as TextChannel;
        if (channel && channel.isTextBased()) {
          await this.sendWelcomeMessage(member, channel, config);
        }
      }

      // Send DM welcome
      if (config.dmWelcome) {
        await this.sendDMWelcome(member, config);
      }

    } catch (error) {
      console.error('Error handling member join:', error);
    }
  }

  private async sendWelcomeMessage(member: GuildMember, channel: TextChannel, config: WelcomeConfig): Promise<void> {
    const welcomeText = this.formatMessage(config.message || '', member);
    
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Welcome to ${member.guild.name}!`)
      .setDescription(welcomeText)
      .setColor(config.embedColor as any)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Member', value: `${member.user.tag}`, inline: true },
        { name: '📅 Joined', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '🎯 Member #', value: `${member.guild.memberCount}`, inline: true }
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();

    if (config.bonusCoins > 0) {
      embed.addFields({
        name: '🎁 Welcome Bonus',
        value: `You received **${config.bonusCoins}** coins and **50 XP**!`,
        inline: false
      });
    }

    // Interactive buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('welcome_rules')
          .setLabel('📜 Rules')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('welcome_roles')
          .setLabel('🎭 Get Roles')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('welcome_help')
          .setLabel('❓ Help')
          .setStyle(ButtonStyle.Secondary)
      );

    const messageContent = config.mentionUser ? `${member}` : undefined;
    
    if (config.cardEnabled) {
      try {
        const welcomeCard = await generateWelcomeCard(member);
        await channel.send({
          content: messageContent,
          embeds: [embed],
          files: [welcomeCard],
          components: [buttons]
        });
      } catch (error) {
        // Fallback without card
        await channel.send({
          content: messageContent,
          embeds: [embed],
          components: [buttons]
        });
      }
    } else {
      await channel.send({
        content: messageContent,
        embeds: [embed],
        components: [buttons]
      });
    }
  }

  private async sendDMWelcome(member: GuildMember, config: WelcomeConfig): Promise<void> {
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`Welcome to ${member.guild.name}! 🎉`)
        .setDescription(`Thanks for joining **${member.guild.name}**!\n\nHere are some quick tips to get started:\n\n🔹 Check out the server rules\n🔹 Introduce yourself\n🔹 Explore different channels\n🔹 Have fun and be respectful!\n\nIf you need help, don't hesitate to ask the moderators.`)
        .setColor(config.embedColor as any)
        .setThumbnail(member.guild.iconURL())
        .setFooter({ text: member.guild.name })
        .setTimestamp();

      await member.send({ embeds: [dmEmbed] });
    } catch (error) {
      // User has DMs disabled, ignore
    }
  }

  private formatMessage(message: string, member: GuildMember): string {
    return message
      .replace(/\{user\}/g, `<@${member.id}>`)
      .replace(/\{username\}/g, member.user.username)
      .replace(/\{displayName\}/g, member.displayName)
      .replace(/\{server\}/g, member.guild.name)
      .replace(/\{memberCount\}/g, member.guild.memberCount.toString());
  }

  public getConfig(guildId: string): WelcomeConfig {
    return this.getGuildConfig(guildId);
  }

  public updateConfig(guildId: string, updates: Partial<WelcomeConfig>): void {
    const config = this.getGuildConfig(guildId);
    Object.assign(config, updates);
    this.saveConfig();
  }
}

export const welcomeSystem = new WelcomeSystem();