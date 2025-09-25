import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from "discord.js";
import { Command } from "../../types/discordClient";

export const channel: Command = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Manage server channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a new channel")
        .addStringOption(option =>
          option.setName("name")
            .setDescription("Channel name")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("type")
            .setDescription("Channel type")
            .setRequired(true)
            .addChoices(
              { name: "Text Channel", value: "text" },
              { name: "Voice Channel", value: "voice" },
              { name: "Category", value: "category" }
            ))
        .addStringOption(option =>
          option.setName("topic")
            .setDescription("Channel topic/description")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("delete")
        .setDescription("Delete a channel")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel to delete")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("edit")
        .setDescription("Edit channel settings")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel to edit")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("name")
            .setDescription("New channel name")
            .setRequired(false))
        .addStringOption(option =>
          option.setName("topic")
            .setDescription("New channel topic")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("lock")
        .setDescription("Lock a channel (remove send messages permission)")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel to lock")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("unlock")
        .setDescription("Unlock a channel")
        .addChannelOption(option =>
          option.setName("channel")
            .setDescription("Channel to unlock")
            .setRequired(false))),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    switch (subcommand) {
      case "create": {
        const name = interaction.options.getString("name", true);
        const type = interaction.options.getString("type", true);
        const topic = interaction.options.getString("topic");

        try {
          let channelType: ChannelType;
          switch (type) {
            case "text":
              channelType = ChannelType.GuildText;
              break;
            case "voice":
              channelType = ChannelType.GuildVoice;
              break;
            case "category":
              channelType = ChannelType.GuildCategory;
              break;
            default:
              channelType = ChannelType.GuildText;
          }

          const channel = await guild.channels.create({
            name: name,
            type: channelType,
            topic: topic || undefined
          });

          const embed = new EmbedBuilder()
            .setTitle("✅ Channel Created")
            .setDescription(`Successfully created ${channel} (${type})`)
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to create channel. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "delete": {
        const channel = interaction.options.getChannel("channel", true);
        const guildChannel = guild.channels.cache.get(channel.id);
        
        if (!guildChannel) {
          await interaction.reply({ content: "Channel not found!", ephemeral: true });
          return;
        }

        try {
          const channelName = guildChannel.name;
          await guildChannel.delete();

          const embed = new EmbedBuilder()
            .setTitle("🗑️ Channel Deleted")
            .setDescription(`Successfully deleted **#${channelName}**`)
            .setColor(0xFF6B35)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to delete channel. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "edit": {
        const channel = interaction.options.getChannel("channel", true);
        const guildChannel = guild.channels.cache.get(channel.id);
        const newName = interaction.options.getString("name");
        const newTopic = interaction.options.getString("topic");

        if (!guildChannel) {
          await interaction.reply({ content: "Channel not found!", ephemeral: true });
          return;
        }

        if (!newName && !newTopic) {
          await interaction.reply({ content: "Please provide either a new name or topic!", ephemeral: true });
          return;
        }

        try {
          const updateData: any = {};
          if (newName) updateData.name = newName;
          if (newTopic && guildChannel.isTextBased()) updateData.topic = newTopic;

          await guildChannel.edit(updateData);

          const embed = new EmbedBuilder()
            .setTitle("✅ Channel Updated")
            .setDescription(`Successfully updated ${channel}`)
            .setColor(0x00AE86)
            .setTimestamp();

          if (newName) embed.addFields({ name: "New Name", value: newName, inline: true });
          if (newTopic) embed.addFields({ name: "New Topic", value: newTopic, inline: true });

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to edit channel. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "lock": {
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const guildChannel = channel ? guild.channels.cache.get(channel.id) : interaction.channel;

        if (!guildChannel || !guildChannel.isTextBased() || guildChannel.type !== ChannelType.GuildText) {
          await interaction.reply({ content: "This command only works on text channels!", ephemeral: true });
          return;
        }

        try {
          await guildChannel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false
          });

          const embed = new EmbedBuilder()
            .setTitle("🔒 Channel Locked")
            .setDescription(`${channel} has been locked. Users can no longer send messages.`)
            .setColor(0xFF6B35)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to lock channel. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "unlock": {
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const guildChannel = channel ? guild.channels.cache.get(channel.id) : interaction.channel;

        if (!guildChannel || !guildChannel.isTextBased() || guildChannel.type !== ChannelType.GuildText) {
          await interaction.reply({ content: "This command only works on text channels!", ephemeral: true });
          return;
        }

        try {
          await guildChannel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: null
          });

          const embed = new EmbedBuilder()
            .setTitle("🔓 Channel Unlocked")
            .setDescription(`${channel} has been unlocked. Users can now send messages.`)
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to unlock channel. Check my permissions!", ephemeral: true });
        }
        break;
      }
    }
  }
};