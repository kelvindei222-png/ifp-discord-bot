import fs from "fs";
import path from "path";
import { Client } from "discord.js";
import { Event } from "../types/event";

export async function loadEvents(client: Client) {
  const eventsPath = path.join(__dirname, "../events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const eventModule = await import(filePath);
      const event: Event<any> = eventModule.default || eventModule.event || eventModule;

      if (event && event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ Loaded event: ${event.name}`);
      } else {
        console.warn(`⚠️ Skipping invalid event file: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error loading event ${file}:`, error);
    }
  }
  
  console.log(`🎉 Loaded events successfully.`);
}
