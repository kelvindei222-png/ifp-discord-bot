// src/handlers/commandHandler.ts
import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { Client } from "discord.js";
import fs from "fs";
import path from "path";
import { Command } from "../types/discordClient";

async function loadCommandsFromDirectory(client: Client, dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively load from subdirectories
      await loadCommandsFromDirectory(client, fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      try {
        const commandModule = await import(fullPath);
        // Try different export patterns
        const command: Command = commandModule.default || 
                                 commandModule[Object.keys(commandModule).find(key => key !== 'default') || ''] ||
                                 commandModule;
        
        if (command && command.data && typeof command.execute === 'function') {
          client.commands.set(command.data.name, command);
          console.log(`✅ Loaded command: ${command.data.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error loading command from ${fullPath}:`, error);
      }
    }
  }
}

export async function loadCommands(client: Client) {
  client.commands.clear();
  
  const commandsPath = path.join(__dirname, "../commands");
  await loadCommandsFromDirectory(client, commandsPath);
  
  console.log(`📦 Loaded ${client.commands.size} commands total.`);
}

export async function registerCommands(client: Client) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  for (const command of client.commands.values()) {
    commands.push(command.data.toJSON()); // ✅ Convert SlashCommandBuilder -> JSON
  }

  try {
    console.log("🔄 Refreshing application (/) commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: commands }
    );

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
}
