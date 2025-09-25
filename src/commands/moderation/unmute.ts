import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types/command";
import { loadMuteStore, saveMuteStore } from "../../lib/muteStore";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute a user manually")
    .addUserOption(option =>
      option.setName("target").setDescription("User to unmute").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser("target", true);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "❌ This command can only be used in a server.", ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Could not find that member in this server.", ephemeral: true });
      return;
    }

    const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    if (!muteRole) {
      await interaction.reply({ content: "❌ Mute role not found.", ephemeral: true });
      return;
    }

    if (!member.roles.cache.has(muteRole.id)) {
      await interaction.reply({ content: "ℹ️ That user is not currently muted.", ephemeral: true });
      return;
    }

    await member.roles.remove(muteRole, `Manual unmute by ${interaction.user.tag}`);

    // Clean from mute store
    const muteStore = loadMuteStore();
    const key = `${guild.id}-${target.id}`;
    if (muteStore[key]) {
      delete muteStore[key];
      saveMuteStore(muteStore);
    }

    await interaction.reply(`🔊 ${target.tag} has been unmuted.`);
  },
};
