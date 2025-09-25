import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types/discordClient";

export const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user to get information about")
        .setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "User not found in this server!", ephemeral: true });
      return;
    }

    const roles = member.roles.cache
      .filter(role => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(role => role.toString())
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Information: ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setColor(member.displayColor || 0x5865F2)
      .addFields(
        { name: "ID", value: `\`${targetUser.id}\``, inline: true },
        { name: "Username", value: targetUser.username, inline: true },
        { name: "Discriminator", value: `#${targetUser.discriminator}`, inline: true },
        { name: "Display Name", value: member.displayName, inline: true },
        { name: "Bot", value: targetUser.bot ? "Yes" : "No", inline: true },
        { name: "Status", value: member.presence?.status || "Unknown", inline: true },
        { name: "Account Created", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: false },
        { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: false },
        { name: `Roles [${member.roles.cache.size - 1}]`, value: roles.length > 0 ? roles.join(" ") : "None", inline: false }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // Add activity if present
    if (member.presence?.activities && member.presence.activities.length > 0) {
      const activity = member.presence.activities[0];
      embed.addFields({ name: "Activity", value: `${activity.name}${activity.details ? ` - ${activity.details}` : ""}`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};