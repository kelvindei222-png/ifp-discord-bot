import "dotenv/config"; // must be first
// src/index.ts
import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import { Command } from "./types/discordClient"; // adjust path if needed
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { initializeAuditLogger } from "./lib/auditLogger";
import { economyManager } from "./lib/economyManager";
import { initializeActivityTracking } from "./events/activityTracker";

config(); // Load .env

// ✅ Create client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ✅ Attach commands collection with correct typing
client.commands = new Collection<string, Command>();

// ✅ Initialize systems and load handlers
async function initializeBot() {
  initializeAuditLogger(client);
  initializeActivityTracking(client);
  
  await loadCommands(client);
  await loadEvents(client);
  
  // ✅ Login
  await client.login(process.env.DISCORD_TOKEN);
  console.log(`✅ Logged in as ${client.user?.tag}`);
}

initializeBot().catch(console.error);

 