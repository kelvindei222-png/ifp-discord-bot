import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
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

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Show all warnings for a user")
    .addUserOption(option =>
      option.setName("target").setDescription("User to view warnings for").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: "❌ Command must be run in a server.", ephemeral: true });
      return;
    }

    const warnings = loadWarnings();
    const key = `${guild.id}-${target.id}`;
    const userWarnings = warnings[key];

    if (!userWarnings || userWarnings.length === 0) {
      await interaction.reply({ content: `✅ ${target.tag} has no warnings.`, ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${target.tag}`)
      .setColor("Yellow")
      .setTimestamp();

    userWarnings.slice(0, 10).forEach((warn, index) => {
      const date = new Date(warn.timestamp).toLocaleString();
      embed.addFields({
        name: `#${index + 1} - ${date}`,
        value: `**Reason:** ${warn.reason}\n**Moderator:** <@${warn.moderator}>`,
      });
    });

    if (userWarnings.length > 10) {
      embed.setFooter({ text: `Only showing the first 10 of ${userWarnings.length} warnings.` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
