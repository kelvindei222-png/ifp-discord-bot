import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const commands: any[] = [];

// Function to recursively read command files
function loadCommandsFromDir(dir: string) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      loadCommandsFromDir(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      try {
        const command = require(filePath);
        const commandData = command.default || command[Object.keys(command)[0]];
        
        if (commandData && commandData.data) {
          commands.push(commandData.data.toJSON());
          console.log(`✅ Loaded command: ${commandData.data.name}`);
        }
      } catch (error) {
        console.error(`❌ Error loading command from ${filePath}:`, error);
      }
    }
  }
}

async function deployCommands() {
  try {
    // Load all commands
    const commandsPath = path.join(__dirname, 'commands');
    loadCommandsFromDir(commandsPath);
    
    console.log(`📋 Found ${commands.length} commands to deploy.`);
    
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN is not set in environment variables');
    }
    
    if (!process.env.CLIENT_ID) {
      throw new Error('CLIENT_ID is not set in environment variables');
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    console.log('🚀 Started refreshing application (/) commands.');
    
    if (process.env.GUILD_ID) {
      // Deploy to specific guild (for development)
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      ) as any[];
      
      console.log(`✅ Successfully reloaded ${data.length} guild commands.`);
    } else {
      // Deploy globally (for production)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      ) as any[];
      
      console.log(`✅ Successfully reloaded ${data.length} global commands.`);
      console.log('⚠️  Global commands may take up to 1 hour to appear.');
    }
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Command line arguments handling
if (process.argv.includes('--clear')) {
  console.log('🧹 Clearing all commands...');
  // Implementation for clearing commands would go here
}

deployCommands();