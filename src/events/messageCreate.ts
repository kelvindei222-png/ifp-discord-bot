// src/events/messageCreate.ts

import {
  Message,
  Events,
  TextChannel,
  NewsChannel,
  ThreadChannel,
} from "discord.js";
import { Event } from "../types/event"; // ✅ Make sure this is the correct path

export const event: Event<Events.MessageCreate> = {
  name: Events.MessageCreate,
  once: false,

  async execute(message: Message) {
    if (message.author.bot || !message.guild || !message.content) return;

    const regexPatterns = [
      { pattern: /discord\.gg\/\w+/gi, reason: "Unauthorized invite link" },
      { pattern: /free\s*nitro/gi, reason: "Potential scam link" },
      { pattern: /http[s]?:\/\/(grabify|iplogger|2no\.co|iplogger\.org|yip\.su)/gi, reason: "Suspicious IP logger" },
      { pattern: /(viagra|cialis|free money|click here)/gi, reason: "Suspicious spam content" },
    ];

    for (const { pattern, reason } of regexPatterns) {
      if (pattern.test(message.content)) {
        await message.delete().catch(() => {});

        if (
          message.channel instanceof TextChannel ||
          message.channel instanceof NewsChannel ||
          message.channel instanceof ThreadChannel
        ) {
          await message.channel.send({
            content: `🚨 <@${message.author.id}>, your message was removed.\n**Reason:** ${reason}`,
          });
        }

        break;
      }
    }
  },
};
