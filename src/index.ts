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
import * as http from 'http';

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

// ✅ Create simple HTTP server for Render health checks
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      bot: client.user?.tag || 'Starting...',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`🌐 Health check server running on port ${port}`);
});

initializeBot().catch(console.error);

 