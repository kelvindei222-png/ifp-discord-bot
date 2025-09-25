import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import type { Command } from "../types/discordClient"; // ✅ Use the unified command type

export class ExtendedClient extends Client {
  public commands: Collection<string, Command>; // ✅ should work now

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.User],
    });

    this.commands = new Collection<string, Command>();
  }
}
