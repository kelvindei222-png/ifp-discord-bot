import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../types/discordClient";

export const serverinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get information about the current server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const roles = guild.roles.cache;
    const members = guild.members.cache;

    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;
    const categories = channels.filter(c => c.type === 4).size;

    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;

    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High"
    };

    const embed = new EmbedBuilder()
      .setTitle(`🏠 ${guild.name} Information`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(0x5865F2)
      .addFields(
        { name: "📈 General", value: `**Owner:** ${owner.user.tag}\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D>\n**ID:** \`${guild.id}\``, inline: true },
        { name: "👥 Members", value: `**Total:** ${guild.memberCount}\n**Humans:** ${humans}\n**Bots:** ${bots}`, inline: true },
        { name: "📝 Channels", value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}`, inline: true },
        { name: "🎭 Roles", value: `**Total:** ${roles.size}\n**Highest:** ${guild.roles.highest.name}`, inline: true },
        { name: "🛡️ Security", value: `**Verification:** ${verificationLevels[guild.verificationLevel]}\n**MFA Required:** ${guild.mfaLevel === 1 ? "Yes" : "No"}`, inline: true },
        { name: "🎵 Boosts", value: `**Level:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount || 0}`, inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    if (guild.banner) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
  }
};