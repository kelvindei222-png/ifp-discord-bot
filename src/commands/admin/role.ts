import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits, User } from "discord.js";
import { Command } from "../../types/discordClient";

export const role: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage user roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a role to a user")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("The user to add the role to")
            .setRequired(true))
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("The role to add")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a user")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("The user to remove the role from")
            .setRequired(true))
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("The role to remove")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all roles in the server")
        .addBooleanOption(option =>
          option.setName("show_permissions")
            .setDescription("Show role permissions")
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("info")
        .setDescription("Get information about a specific role")
        .addRoleOption(option =>
          option.setName("role")
            .setDescription("The role to get info about")
            .setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    switch (subcommand) {
      case "add": {
        const user = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        const guildRole = guild.roles.cache.get(role.id);
        
        if (!guildRole) {
          await interaction.reply({ content: "Role not found!", ephemeral: true });
          return;
        }
        
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          await interaction.reply({ content: "User not found in this server!", ephemeral: true });
          return;
        }

        if (member.roles.cache.has(role.id)) {
          await interaction.reply({ content: `${user.tag} already has the ${guildRole.name} role!`, ephemeral: true });
          return;
        }

        try {
          await member.roles.add(guildRole);
          const embed = new EmbedBuilder()
            .setTitle("✅ Role Added")
            .setDescription(`Successfully added the **${guildRole.name}** role to ${user.tag}`)
            .setColor(0x00FF00)
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to add role. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "remove": {
        const user = interaction.options.getUser("user", true);
        const role = interaction.options.getRole("role", true);
        const guildRole = guild.roles.cache.get(role.id);
        
        if (!guildRole) {
          await interaction.reply({ content: "Role not found!", ephemeral: true });
          return;
        }
        
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          await interaction.reply({ content: "User not found in this server!", ephemeral: true });
          return;
        }

        if (!member.roles.cache.has(role.id)) {
          await interaction.reply({ content: `${user.tag} doesn't have the ${guildRole.name} role!`, ephemeral: true });
          return;
        }

        try {
          await member.roles.remove(guildRole);
          const embed = new EmbedBuilder()
            .setTitle("✅ Role Removed")
            .setDescription(`Successfully removed the **${guildRole.name}** role from ${user.tag}`)
            .setColor(0xFF6B35)
            .setTimestamp();
          
          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          await interaction.reply({ content: "Failed to remove role. Check my permissions!", ephemeral: true });
        }
        break;
      }

      case "list": {
        const showPermissions = interaction.options.getBoolean("show_permissions") || false;
        const roles = guild.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(role => {
            if (showPermissions) {
              const perms = role.permissions.toArray().slice(0, 3);
              return `${role} - \`${role.members.size} members\` - ${perms.length > 0 ? perms.join(", ") : "No permissions"}`;
            }
            return `${role} - \`${role.members.size} members\``;
          });

        const embed = new EmbedBuilder()
          .setTitle(`🎭 Roles in ${guild.name}`)
          .setDescription(roles.slice(0, 20).join("\n") + (roles.length > 20 ? "\n*...and more*" : ""))
          .setColor(0x5865F2)
          .setFooter({ text: `Total: ${roles.length} roles` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "info": {
        const role = interaction.options.getRole("role", true);
        const guildRole = guild.roles.cache.get(role.id);
        
        if (!guildRole) {
          await interaction.reply({ content: "Role not found!", ephemeral: true });
          return;
        }
        
        const permissions = guildRole.permissions.toArray();

        const embed = new EmbedBuilder()
          .setTitle(`🎭 Role Information: ${guildRole.name}`)
          .setColor(guildRole.color || 0x5865F2)
          .addFields(
            { name: "ID", value: `\`${guildRole.id}\``, inline: true },
            { name: "Color", value: guildRole.hexColor, inline: true },
            { name: "Members", value: guildRole.members.size.toString(), inline: true },
            { name: "Position", value: guildRole.position.toString(), inline: true },
            { name: "Mentionable", value: guildRole.mentionable ? "Yes" : "No", inline: true },
            { name: "Hoisted", value: guildRole.hoist ? "Yes" : "No", inline: true },
            { name: "Created", value: `<t:${Math.floor(guildRole.createdTimestamp / 1000)}:F>`, inline: false },
            { name: "Permissions", value: permissions.length > 0 ? permissions.slice(0, 10).join(", ") + (permissions.length > 10 ? "..." : "") : "None", inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  }
};