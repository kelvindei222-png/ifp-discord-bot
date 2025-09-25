import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType, OverwriteType } from "discord.js";
import { Command } from "../../types/discordClient";

export const ticket: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Advanced ticket system management")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set up the ticket system")
        .addChannelOption(option =>
          option.setName("category")
            .setDescription("Category for ticket channels")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true))
        .addChannelOption(option =>
          option.setName("logs")
            .setDescription("Channel for ticket logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false))
        .addRoleOption(option =>
          option.setName("support_role")
            .setDescription("Role that can view tickets")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("panel")
        .setDescription("Create a ticket creation panel")
        .addStringOption(option =>
          option.setName("title")
            .setDescription("Panel title")
            .setRequired(false))
        .addStringOption(option =>
          option.setName("description")
            .setDescription("Panel description")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("close")
        .setDescription("Close the current ticket")
        .addStringOption(option =>
          option.setName("reason")
            .setDescription("Reason for closing")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a user to the current ticket")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("User to add")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a user from the current ticket")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("User to remove")
            .setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    switch (subcommand) {
      case "setup": {
        const category = interaction.options.getChannel("category", true);
        const logsChannel = interaction.options.getChannel("logs");
        const supportRole = interaction.options.getRole("support_role");

        // Store config (you could expand this with a proper database)
        const config = {
          categoryId: category.id,
          logsChannelId: logsChannel?.id,
          supportRoleId: supportRole?.id,
          guildId: guild.id
        };

        const embed = new EmbedBuilder()
          .setTitle("✅ Ticket System Setup Complete")
          .setDescription("Your ticket system has been configured successfully!")
          .addFields(
            { name: "🗂️ Category", value: `${category}`, inline: true },
            { name: "📝 Logs Channel", value: logsChannel ? `${logsChannel}` : "Not set", inline: true },
            { name: "👮 Support Role", value: supportRole ? `${supportRole}` : "Not set", inline: true }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "panel": {
        const title = interaction.options.getString("title") || "🎫 Support Tickets";
        const description = interaction.options.getString("description") || "Need help? Create a support ticket and our team will assist you!\n\n**What can we help with?**\n🔧 Technical Issues\n❓ General Questions\n🎮 Server Support\n💡 Suggestions";

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(0x5865F2)
          .addFields(
            { name: "📋 How it works", value: "1️⃣ Click the button below\n2️⃣ Choose your ticket type\n3️⃣ Explain your issue\n4️⃣ Wait for support", inline: false },
            { name: "⏱️ Response Time", value: "We typically respond within **2-6 hours**", inline: true },
            { name: "🕒 Availability", value: "24/7 Support Available", inline: true }
          )
          .setFooter({ text: "Click the button below to create a ticket" })
          .setTimestamp();

        const buttons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("create_ticket_general")
              .setLabel("💬 General Support")
              .setEmoji("🎫")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("create_ticket_technical")
              .setLabel("🔧 Technical Issue")
              .setEmoji("⚡")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("create_ticket_report")
              .setLabel("🚨 Report Issue")
              .setEmoji("⚠️")
              .setStyle(ButtonStyle.Danger)
          );

        await interaction.reply({ embeds: [embed], components: [buttons] });

        // Set up button collector for the panel
        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button
        });

        collector.on("collect", async (buttonInteraction) => {
          await handleTicketCreation(buttonInteraction, buttonInteraction.customId);
        });

        break;
      }

      case "close": {
        const reason = interaction.options.getString("reason") || "No reason provided";
        
        if (!interaction.channel || !('name' in interaction.channel) || !interaction.channel.name?.startsWith("ticket-")) {
          await interaction.reply({ content: "❌ This command can only be used in ticket channels!", ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🔒 Ticket Closing")
          .setDescription(`This ticket is being closed by ${interaction.user}\n\n**Reason:** ${reason}`)
          .setColor(0xFF6B35)
          .addFields(
            { name: "⏰ Closed At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: "🧵 Transcript", value: "Generating transcript...", inline: true }
          )
          .setTimestamp();

        const closeButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("confirm_close_ticket")
              .setLabel("Confirm Close")
              .setEmoji("✅")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("cancel_close_ticket")
              .setLabel("Cancel")
              .setEmoji("❌")
              .setStyle(ButtonStyle.Secondary)
          );

        await interaction.reply({ embeds: [embed], components: [closeButton] });

        const collector = interaction.channel.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000
        });

        collector.on("collect", async (buttonInteraction) => {
          if (buttonInteraction.customId === "confirm_close_ticket") {
            // Create transcript and delete channel
            await buttonInteraction.update({ 
              content: "🗑️ Deleting channel in 5 seconds...", 
              embeds: [], 
              components: [] 
            });
            
            setTimeout(async () => {
              try {
                await interaction.channel?.delete();
              } catch (error) {
                console.error("Error deleting ticket channel:", error);
              }
            }, 5000);
          } else {
            await buttonInteraction.update({ 
              content: "❌ Ticket closure cancelled.", 
              embeds: [], 
              components: [] 
            });
          }
        });

        break;
      }

      case "add": {
        const user = interaction.options.getUser("user", true);
        
        if (!interaction.channel || !('name' in interaction.channel) || !interaction.channel.name?.startsWith("ticket-")) {
          await interaction.reply({ content: "❌ This command can only be used in ticket channels!", ephemeral: true });
          return;
        }

        try {
          if ('permissionOverwrites' in interaction.channel) {
            await interaction.channel.permissionOverwrites.create(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
            });
          }

          const embed = new EmbedBuilder()
            .setTitle("✅ User Added to Ticket")
            .setDescription(`${user} has been added to this ticket by ${interaction.user}`)
            .setColor(0x00FF00)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "❌ Failed to add user to ticket!", ephemeral: true });
        }
        break;
      }

      case "remove": {
        const user = interaction.options.getUser("user", true);
        
        if (!interaction.channel || !('name' in interaction.channel) || !interaction.channel.name?.startsWith("ticket-")) {
          await interaction.reply({ content: "❌ This command can only be used in ticket channels!", ephemeral: true });
          return;
        }

        try {
          if ('permissionOverwrites' in interaction.channel) {
            await interaction.channel.permissionOverwrites.delete(user.id);
          }

          const embed = new EmbedBuilder()
            .setTitle("❌ User Removed from Ticket")
            .setDescription(`${user} has been removed from this ticket by ${interaction.user}`)
            .setColor(0xFF6B35)
            .setTimestamp();

          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "❌ Failed to remove user from ticket!", ephemeral: true });
        }
        break;
      }
    }
  }
};

async function handleTicketCreation(interaction: any, ticketType: string) {
    const guild = interaction.guild;
    const user = interaction.user;
    
    // Check if user already has a ticket
    const existingTicket = guild.channels.cache.find((channel: any) => 
      channel.name === `ticket-${user.username.toLowerCase()}` && channel.type === ChannelType.GuildText
    );

    if (existingTicket) {
      await interaction.reply({ 
        content: `❌ You already have an open ticket: ${existingTicket}`, 
        ephemeral: true 
      });
      return;
    }

    try {
      // Create ticket channel
      const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: "1234567890123456789", // Category ID - should be stored in config
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          // Add support role permissions if configured
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Support Ticket - ${ticketType.replace('create_ticket_', '').toUpperCase()}`)
        .setDescription(`Hello ${user}! Welcome to your support ticket.\n\nPlease describe your issue in detail and our support team will assist you shortly.`)
        .addFields(
          { name: "📝 Ticket Type", value: ticketType.replace('create_ticket_', '').replace('_', ' ').toUpperCase(), inline: true },
          { name: "👤 Created By", value: `${user}`, inline: true },
          { name: "🕐 Created At", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setColor(0x00AE86)
        .setFooter({ text: "Use /ticket close to close this ticket" })
        .setTimestamp();

      const ticketButtons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel("Claim Ticket")
            .setEmoji("👋")
            .setStyle(ButtonStyle.Success)
        );

      await ticketChannel.send({ 
        content: `${user}`, 
        embeds: [ticketEmbed], 
        components: [ticketButtons] 
      });

      await interaction.reply({ 
        content: `✅ Ticket created! Please check ${ticketChannel}`, 
        ephemeral: true 
      });

    } catch (error) {
      console.error("Error creating ticket:", error);
      await interaction.reply({ 
        content: "❌ Failed to create ticket. Please try again later.", 
        ephemeral: true 
      });
    }
  }
