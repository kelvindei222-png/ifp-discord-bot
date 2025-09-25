// src/events/guildMemberAdd.ts
import { GuildMember, EmbedBuilder } from "discord.js";
import { Event } from "../types/event";
import { auditLogger } from "../lib/auditLogger";
import { welcomeSystem } from "../lib/welcomeSystem";

export const event: Event<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  once: false,
  async execute(member: GuildMember) {
    try {
      // Handle welcome system
      await welcomeSystem.handleMemberJoin(member);
      
      // Log to audit log if enabled
      auditLogger?.logMemberJoin(member);
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
