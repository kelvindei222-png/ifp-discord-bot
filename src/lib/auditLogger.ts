import { Client, EmbedBuilder, TextChannel, Guild, User, GuildMember, Message, Role, GuildChannel } from "discord.js";
import * as fs from 'fs';
import * as path from 'path';

interface LogConfig {
  channelId?: string;
  enabled: boolean;
  events: {
    memberJoin: boolean;
    memberLeave: boolean;
    messageDelete: boolean;
    messageEdit: boolean;
    channelCreate: boolean;
    channelDelete: boolean;
    roleCreate: boolean;
    roleDelete: boolean;
    memberBan: boolean;
    memberUnban: boolean;
    memberKick: boolean;
    memberMute: boolean;
    memberUnmute: boolean;
    memberWarn: boolean;
  };
}

interface GuildLogConfig {
  [guildId: string]: LogConfig;
}

const configPath = path.join(__dirname, '../data/logConfig.json');

export class AuditLogger {
  private client: Client;
  private config: GuildLogConfig = {};

  constructor(client: Client) {
    this.client = client;
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(rawData);
      }
    } catch (error) {
      console.error('Error loading log config:', error);
      this.config = {};
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving log config:', error);
    }
  }

  private getGuildConfig(guildId: string): LogConfig {
    if (!this.config[guildId]) {
      this.config[guildId] = {
        enabled: false,
        events: {
          memberJoin: true,
          memberLeave: true,
          messageDelete: true,
          messageEdit: true,
          channelCreate: true,
          channelDelete: true,
          roleCreate: true,
          roleDelete: true,
          memberBan: true,
          memberUnban: true,
          memberKick: true,
          memberMute: true,
          memberUnmute: true,
          memberWarn: true
        }
      };
      this.saveConfig();
    }
    return this.config[guildId];
  }

  public setLogChannel(guildId: string, channelId: string): void {
    const config = this.getGuildConfig(guildId);
    config.channelId = channelId;
    config.enabled = true;
    this.saveConfig();
  }

  public toggleLogging(guildId: string, enabled: boolean): void {
    const config = this.getGuildConfig(guildId);
    config.enabled = enabled;
    this.saveConfig();
  }

  public toggleEvent(guildId: string, event: keyof LogConfig['events'], enabled: boolean): void {
    const config = this.getGuildConfig(guildId);
    config.events[event] = enabled;
    this.saveConfig();
  }

  private async sendLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
    const config = this.getGuildConfig(guild.id);
    
    if (!config.enabled || !config.channelId) return;

    try {
      const channel = await guild.channels.fetch(config.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error sending audit log:', error);
    }
  }

  // Event logging methods
  public async logMemberJoin(member: GuildMember): Promise<void> {
    const config = this.getGuildConfig(member.guild.id);
    if (!config.events.memberJoin) return;

    const embed = new EmbedBuilder()
      .setTitle("📥 Member Joined")
      .setColor(0x00FF00)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "Member Count", value: member.guild.memberCount.toString(), inline: true }
      )
      .setFooter({ text: "User joined" })
      .setTimestamp();

    await this.sendLog(member.guild, embed);
  }

  public async logMemberLeave(member: GuildMember): Promise<void> {
    const config = this.getGuildConfig(member.guild.id);
    if (!config.events.memberLeave) return;

    const embed = new EmbedBuilder()
      .setTitle("📤 Member Left")
      .setColor(0xFF6B35)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.user.id})`, inline: true },
        { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: true },
        { name: "Member Count", value: (member.guild.memberCount - 1).toString(), inline: true }
      )
      .setFooter({ text: "User left" })
      .setTimestamp();

    await this.sendLog(member.guild, embed);
  }

  public async logMessageDelete(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;
    
    const config = this.getGuildConfig(message.guild.id);
    if (!config.events.messageDelete) return;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .setColor(0xFF6B35)
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: "Author", value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: "Channel", value: `${message.channel}`, inline: true },
        { name: "Content", value: message.content.slice(0, 1024) || "*No content*", inline: false }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    await this.sendLog(message.guild, embed);
  }

  public async logMemberBan(guild: Guild, user: User, reason?: string): Promise<void> {
    const config = this.getGuildConfig(guild.id);
    if (!config.events.memberBan) return;

    const embed = new EmbedBuilder()
      .setTitle("🔨 Member Banned")
      .setColor(0xFF0000)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Reason", value: reason || "No reason provided", inline: true }
      )
      .setFooter({ text: "User banned" })
      .setTimestamp();

    await this.sendLog(guild, embed);
  }

  public async logMemberKick(guild: Guild, user: User, moderator: User, reason?: string): Promise<void> {
    const config = this.getGuildConfig(guild.id);
    if (!config.events.memberKick) return;

    const embed = new EmbedBuilder()
      .setTitle("👢 Member Kicked")
      .setColor(0xFFA500)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${moderator.tag}`, inline: true },
        { name: "Reason", value: reason || "No reason provided", inline: false }
      )
      .setFooter({ text: "User kicked" })
      .setTimestamp();

    await this.sendLog(guild, embed);
  }

  public async logMemberMute(guild: Guild, user: User, moderator: User, duration?: string, reason?: string): Promise<void> {
    const config = this.getGuildConfig(guild.id);
    if (!config.events.memberMute) return;

    const embed = new EmbedBuilder()
      .setTitle("🔇 Member Muted")
      .setColor(0x808080)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${moderator.tag}`, inline: true },
        { name: "Duration", value: duration || "Permanent", inline: true },
        { name: "Reason", value: reason || "No reason provided", inline: false }
      )
      .setFooter({ text: "User muted" })
      .setTimestamp();

    await this.sendLog(guild, embed);
  }

  public async logMemberWarn(guild: Guild, user: User, moderator: User, reason: string): Promise<void> {
    const config = this.getGuildConfig(guild.id);
    if (!config.events.memberWarn) return;

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Member Warned")
      .setColor(0xFFFF00)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})`, inline: true },
        { name: "Moderator", value: `${moderator.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false }
      )
      .setFooter({ text: "User warned" })
      .setTimestamp();

    await this.sendLog(guild, embed);
  }

  public getConfig(guildId: string): LogConfig {
    return this.getGuildConfig(guildId);
  }
}

export let auditLogger: AuditLogger;

export function initializeAuditLogger(client: Client): void {
  auditLogger = new AuditLogger(client);
}