import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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
    .setName("warn")
    .setDescription("Warn a user and record it")
    .addUserOption(option =>
      option.setName("target").setDescription("User to warn").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for warning").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "❌ Command must be run in a server.", ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
      return;
    }

    const warnings = loadWarnings();
    const key = `${guild.id}-${target.id}`;

    if (!warnings[key]) warnings[key] = [];

    const warning: WarningEntry = {
      id: uuidv4(),
      moderator: interaction.user.id,
      reason,
      timestamp: Date.now(),
    };

    warnings[key].push(warning);
    saveWarnings(warnings);

    const warningCount = warnings[key].length;
    let reply = `⚠️ ${target.tag} has been warned.\n📝 Reason: ${reason}\n📚 Total warnings: ${warningCount}`;

    // Optional: Auto mute if 3 or more warnings
    if (warningCount >= 3) {
      const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
      if (muteRole && !member.roles.cache.has(muteRole.id)) {
        await member.roles.add(muteRole, "Auto-muted due to 3 warnings");
        reply += `\n🔇 ${target.tag} has been automatically muted.`;
      } else if (!muteRole) {
        reply += `\n❗ Mute role not found.`;
      }
    }

    await interaction.reply(reply);
  }
};
