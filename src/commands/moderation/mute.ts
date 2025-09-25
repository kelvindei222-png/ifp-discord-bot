import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types/command";
import { loadMuteStore, saveMuteStore } from "../../lib/muteStore";

// Parse "10m", "1h" etc → milliseconds
function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a user, optionally for a duration")
    .addUserOption(option =>
      option.setName("target").setDescription("User to mute").setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("duration")
        .setDescription("Duration (e.g. 10m, 1h, 30s). Leave blank for permanent.")
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for mute").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const target = interaction.options.getUser("target", true);
    const durationInput = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "❌ Guild not found.", ephemeral: true });
      return;
    }

    const member = guild.members.cache.get(target.id);
    if (!member) {
      await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
      return;
    }

    const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    if (!muteRole) {
      await interaction.reply({
        content: "❗ Mute failed: no role named `Muted` exists.",
        ephemeral: true,
      });
      return;
    }

    if (member.roles.cache.has(muteRole.id)) {
      await interaction.reply({
        content: `${target.tag} is already muted.`,
        ephemeral: true,
      });
      return;
    }

    await member.roles.add(muteRole, reason);
    let reply = `🔇 ${target.tag} has been muted.\nReason: ${reason}`;

    // Handle timed mute
    if (durationInput) {
      const ms = parseDuration(durationInput);
      if (!ms) {
        reply += `\n⚠️ Invalid duration format. Use \`10m\`, \`1h\`, \`30s\`, etc.`;
      } else {
        const key = `${guild.id}-${target.id}`;
        const muteStore = loadMuteStore();
        muteStore[key] = {
          userId: target.id,
          guildId: guild.id,
          unmuteAt: Date.now() + ms
        };
        saveMuteStore(muteStore);

        setTimeout(async () => {
          const refreshed = await guild.members.fetch(target.id).catch(() => null);
          if (refreshed && refreshed.roles.cache.has(muteRole.id)) {
            await refreshed.roles.remove(muteRole, "Mute duration expired");
          }

          const updatedStore = loadMuteStore();
          delete updatedStore[key];
          saveMuteStore(updatedStore);
        }, ms);

        reply += `\n⏳ They will be unmuted in **${durationInput}**.`;
      }
    }

    await interaction.reply(reply);
  },
};
