import { Events } from "discord.js";
import { ExtendedClient } from "../structs/ExtendedClient";

const event = {
  name: Events.ClientReady,
  once: true,
  execute(client: ExtendedClient) {
    console.log(`✅ Logged in as ${client.user?.tag}`);
  },
};

export default event;
