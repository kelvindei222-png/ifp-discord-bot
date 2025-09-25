// src/lib/eventLoader.ts

import { ExtendedClient } from "../structs/ExtendedClient";
import { readdirSync } from "fs";
import path from "path";

export async function loadEvents(client: ExtendedClient) {
  const eventsPath = path.join(__dirname, "../events");
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const eventModule = await import(filePath);

    const event = eventModule.default; // ← this MUST exist

    if (!event || !event.name || typeof event.execute !== "function") {
      console.warn(`⚠️ Skipping invalid event file: ${file}`);
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args, client));
  }

  console.log("✅ Events loaded.");
}
