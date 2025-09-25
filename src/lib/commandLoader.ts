import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { ExtendedClient } from "../structs/ExtendedClient";
import type { Command } from "../types/command";

export async function loadCommands(client: ExtendedClient) {
  const commands: Command[] = [];

  const commandsPath = path.join(__dirname, "../commands");
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter(file => file.endsWith(".ts") || file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const { command } = await import(filePath);
      if (!command?.data || !command?.execute) continue;

      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    }
  }

  // Register slash commands globally
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN!);
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
    body: commands,
  });

  console.log("✅ Slash commands registered.");
}
