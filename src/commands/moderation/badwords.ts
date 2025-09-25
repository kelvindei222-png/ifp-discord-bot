import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { Command } from "../../types/command";

import path from "path";
import fs from "fs";

// Path to bad words JSON
const filePath = path.join(__dirname, "../../../data/badwords.json");

function loadBadWords(): string[] {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveBadWords(words: string[]) {
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("badwords")
    .setDescription("Manage the bad words filter")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a bad word to the filter")
        .addStringOption(option =>
          option.setName("word").setDescription("The word to block").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a bad word from the filter")
        .addStringOption(option =>
          option.setName("word").setDescription("The word to unblock").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all blocked words")
    ),

  async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const word = interaction.options.getString("word")?.toLowerCase();
    let words = loadBadWords();

    if (subcommand === "add") {
      if (word && !words.includes(word)) {
        words.push(word);
        saveBadWords(words);
        await interaction.reply(`✅ \`${word}\` has been added to the filter.`);
      } else {
        await interaction.reply(`⚠️ \`${word}\` is already in the filter or invalid.`);
      }
    } else if (subcommand === "remove") {
      if (word && words.includes(word)) {
        words = words.filter(w => w !== word);
        saveBadWords(words);
        await interaction.reply(`✅ \`${word}\` has been removed from the filter.`);
      } else {
        await interaction.reply(`⚠️ \`${word}\` is not in the filter.`);
      }
    } else if (subcommand === "list") {
      const formatted = words.length > 0 ? words.map(w => `- \`${w}\``).join("\n") : "No bad words found.";
      await interaction.reply(`📃 **Blocked Words:**\n${formatted}`);
    }
  },
};
