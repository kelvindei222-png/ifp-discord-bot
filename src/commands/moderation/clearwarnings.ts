import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";
import type { Command } from "../../types/command";

const warningsPath = path.join(__dirname, "../../data/warnings.json");

type WarningEntry = {
  id: string;
  moderator: string;
  reason: string;
  timestamp: number;
};

function loadWarnings(): Record<string, WarningEntry[]> {
  if (!fs.existsSync(warningsPath)) fs.writeFileSync(warningsPath, "{}");
  const data = fs.readFileSync(warningsPath, "utf8");
  return JSON.parse(data || "{}");
}

function saveWarnings(data: Record<string, WarningEntry[]>) {
  fs.writeFileSync(warningsPath, JSON.stringify(data, null, 2));
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear warnings for a user")
    .addUserOption(option =>
      option.setName("target").setDescription("User to clear warnings for").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("id").setDescription("Specific warning ID to remove").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const warningId = interaction.options.getString("id");
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "❌ Command must be run in a server.", ephemeral: true });
      return;
    }

    const key = `${guild.id}-${target.id}`;
    const warnings = loadWarnings();

    if (!warnings[key] || warnings[key].length === 0) {
      await interaction.reply({ content: `${target.tag} has no warnings.`, ephemeral: true });
      return;
    }

    // Delete one warning by ID
    if (warningId) {
      const index = warnings[key].findIndex(w => w.id === warningId);
      if (index === -1) {
        await interaction.reply({ content: `❌ Warning ID \`${warningId}\` not found.`, ephemeral: true });
        return;
      }

      warnings[key].splice(index, 1);
      saveWarnings(warnings);
      await interaction.reply(`🗑️ Removed warning \`${warningId}\` from ${target.tag}.`);
    }
    // Delete all warnings
    else {
      delete warnings[key];
      saveWarnings(warnings);
      await interaction.reply(`🧹 Cleared all warnings for ${target.tag}.`);
    }
  }
};
