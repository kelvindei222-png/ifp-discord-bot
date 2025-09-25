import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from "discord.js";
import { Command } from "../../types/discordClient";
import { welcomeSystem } from "../../lib/welcomeSystem";

export const welcome: Command = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure the welcome system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set up the welcome channel")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel for welcome messages")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("message")
        .setDescription("Set custom welcome message")
        .addStringOption(option =>
          option.setName("text")
            .setDescription("Welcome message (use {user}, {server}, {memberCount})")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("toggle")
        .setDescription("Enable/disable welcome messages")
        .addBooleanOption(option =>
          option.setName("enabled")
            .setDescription("Enable or disable welcome messages")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("card")
        .setDescription("Toggle welcome cards")
        .addBooleanOption(option =>
          option.setName("enabled")
            .setDescription("Enable or disable welcome cards")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("autorole")
        .setDescription("Set automatic role for new members")
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("Role to give to new members")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("bonus")
        .setDescription("Set welcome bonus coins")
        .addIntegerOption(option =>
          option.setName("amount")
            .setDescription("Amount of coins to give new members")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10000)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("dm")
        .setDescription("Toggle DM welcome messages")
        .addBooleanOption(option =>
          option.setName("enabled")
            .setDescription("Send welcome message via DM")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("color")
        .setDescription("Set welcome embed color")
        .addStringOption(option =>
          option.setName("hex")
            .setDescription("Hex color code (e.g., #667eea)")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("settings")
        .setDescription("View current welcome settings"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("test")
        .setDescription("Test the welcome system")),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    switch (subcommand) {
      case "setup": {
        const channel = interaction.options.getChannel("channel", true);
        
        welcomeSystem.setWelcomeChannel(guild.id, channel.id);
        
        const embed = new EmbedBuilder()
          .setTitle("✅ Welcome System Setup")
          .setDescription(`Welcome channel has been set to ${channel}!\n\nNew members will now receive welcome messages in this channel.`)
          .setColor(0x00FF00)
          .addFields(
            { name: "📝 Pro Tip", value: "Use `/welcome message` to customize the welcome message!\nUse `/welcome settings` to view all current settings.", inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "message": {
        const message = interaction.options.getString("text", true);
        
        welcomeSystem.setWelcomeMessage(guild.id, message);
        
        const embed = new EmbedBuilder()
          .setTitle("✅ Welcome Message Updated")
          .setDescription("Custom welcome message has been set!")
          .addFields(
            { name: "📄 New Message", value: message, inline: false },
            { name: "🏷️ Available Variables", value: "`{user}` - Mention user\n`{username}` - Username\n`{displayName}` - Display name\n`{server}` - Server name\n`{memberCount}` - Member count", inline: false }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "toggle": {
        const enabled = interaction.options.getBoolean("enabled", true);
        
        welcomeSystem.toggleWelcome(guild.id, enabled);
        
        const embed = new EmbedBuilder()
          .setTitle(`${enabled ? '✅' : '❌'} Welcome System ${enabled ? 'Enabled' : 'Disabled'}`)
          .setDescription(`Welcome messages are now **${enabled ? 'enabled' : 'disabled'}** for this server.`)
          .setColor(enabled ? 0x00FF00 : 0xFF6B35)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "card": {
        const enabled = interaction.options.getBoolean("enabled", true);
        
        welcomeSystem.toggleCard(guild.id, enabled);
        
        const embed = new EmbedBuilder()
          .setTitle(`${enabled ? '✅' : '❌'} Welcome Cards ${enabled ? 'Enabled' : 'Disabled'}`)
          .setDescription(`Welcome cards are now **${enabled ? 'enabled' : 'disabled'}**.\n\n${enabled ? 'New members will get a beautiful welcome card!' : 'Welcome messages will use embeds only.'}`)
          .setColor(enabled ? 0x00FF00 : 0xFF6B35)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "autorole": {
        const role = interaction.options.getRole("role");
        
        if (role) {
          welcomeSystem.setAutoRole(guild.id, role.id);
          
          const embed = new EmbedBuilder()
            .setTitle("✅ Auto-Role Set")
            .setDescription(`New members will automatically receive the ${role} role!`)
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } else {
          welcomeSystem.setAutoRole(guild.id, undefined);
          
          const embed = new EmbedBuilder()
            .setTitle("❌ Auto-Role Removed")
            .setDescription("Auto-role assignment has been disabled.")
            .setColor(0xFF6B35)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        }
        break;
      }

      case "bonus": {
        const amount = interaction.options.getInteger("amount", true);
        
        welcomeSystem.updateConfig(guild.id, { bonusCoins: amount });
        
        const embed = new EmbedBuilder()
          .setTitle("💰 Welcome Bonus Updated")
          .setDescription(`New members will receive **${amount}** coins as a welcome bonus!${amount > 0 ? '\n\nThey also get **50 XP** for joining!' : ''}`)
          .setColor(0xFFD700)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "dm": {
        const enabled = interaction.options.getBoolean("enabled", true);
        
        welcomeSystem.updateConfig(guild.id, { dmWelcome: enabled });
        
        const embed = new EmbedBuilder()
          .setTitle(`${enabled ? '✅' : '❌'} DM Welcome ${enabled ? 'Enabled' : 'Disabled'}`)
          .setDescription(`New members will ${enabled ? 'receive' : 'not receive'} a DM welcome message.`)
          .setColor(enabled ? 0x00FF00 : 0xFF6B35)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "color": {
        const hex = interaction.options.getString("hex", true);
        
        if (!/^#[0-9A-F]{6}$/i.test(hex)) {
          await interaction.reply({ content: "❌ Invalid hex color! Use format: #667eea", ephemeral: true });
          return;
        }
        
        welcomeSystem.updateConfig(guild.id, { embedColor: hex });
        
        const embed = new EmbedBuilder()
          .setTitle("🎨 Welcome Color Updated")
          .setDescription(`Welcome embed color has been set to **${hex}**!`)
          .setColor(hex as any)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "settings": {
        const config = welcomeSystem.getConfig(guild.id);
        const channel = config.channelId ? guild.channels.cache.get(config.channelId) : null;
        const role = config.autoRole ? guild.roles.cache.get(config.autoRole) : null;
        
        const embed = new EmbedBuilder()
          .setTitle("⚙️ Welcome System Settings")
          .setColor(config.embedColor as any)
          .addFields(
            { name: "🔧 Status", value: config.enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
            { name: "📢 Channel", value: channel ? `${channel}` : "❌ Not set", inline: true },
            { name: "🖼️ Welcome Cards", value: config.cardEnabled ? "✅ Enabled" : "❌ Disabled", inline: true },
            { name: "💰 Bonus Coins", value: config.bonusCoins.toString(), inline: true },
            { name: "🎭 Auto Role", value: role ? `${role}` : "❌ Not set", inline: true },
            { name: "📨 DM Welcome", value: config.dmWelcome ? "✅ Enabled" : "❌ Disabled", inline: true },
            { name: "🎨 Embed Color", value: config.embedColor, inline: true },
            { name: "👤 Mention User", value: config.mentionUser ? "✅ Yes" : "❌ No", inline: true },
            { name: "📄 Custom Message", value: config.message ? "✅ Set" : "❌ Using default", inline: true }
          )
          .setFooter({ text: "Use /welcome help for configuration commands" })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "test": {
        try {
          await welcomeSystem.handleMemberJoin(interaction.member as any);
          
          const embed = new EmbedBuilder()
            .setTitle("🧪 Welcome Test")
            .setDescription("Welcome system test completed! Check the welcome channel to see how it looks.")
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
          await interaction.reply({ content: "❌ Test failed! Make sure the welcome channel is properly configured.", ephemeral: true });
        }
        break;
      }
    }
  }
};