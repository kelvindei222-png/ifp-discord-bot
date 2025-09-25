import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { Command } from "../../types/discordClient";

export const serverstats: Command = {
  data: new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("Display detailed server statistics")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    const owner = await guild.fetchOwner();
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    const members = await guild.members.fetch();

    // Calculate channel types
    const textChannels = channels.filter(c => c?.type === 0).size;
    const voiceChannels = channels.filter(c => c?.type === 2).size;
    const categories = channels.filter(c => c?.type === 4).size;

    // Calculate member statistics
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;
    const onlineMembers = members.filter(m => m.presence?.status === "online").size;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name} Statistics`)
      .setThumbnail(guild.iconURL())
      .setColor(0x00AE86)
      .addFields(
        {
          name: "📈 General Info",
          value: `**Owner:** ${owner.user.tag}\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n**Server ID:** \`${guild.id}\``,
          inline: true
        },
        {
          name: "👥 Members",
          value: `**Total:** ${guild.memberCount}\n**Humans:** ${humans}\n**Bots:** ${bots}\n**Online:** ${onlineMembers}`,
          inline: true
        },
        {
          name: "📝 Channels",
          value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}\n**Total:** ${channels.size}`,
          inline: true
        },
        {
          name: "🎭 Roles",
          value: `**Total:** ${roles.size}\n**Highest:** ${guild.roles.highest.name}`,
          inline: true
        },
        {
          name: "🛡️ Security",
          value: `**Verification:** ${guild.verificationLevel}\n**MFA Required:** ${guild.mfaLevel === 1 ? "Yes" : "No"}`,
          inline: true
        },
        {
          name: "🎵 Features",
          value: `**Boost Level:** ${guild.premiumTier}\n**Boost Count:** ${guild.premiumSubscriptionCount || 0}\n**Features:** ${guild.features.length > 0 ? guild.features.slice(0, 3).join(", ") : "None"}`,
          inline: true
        }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};