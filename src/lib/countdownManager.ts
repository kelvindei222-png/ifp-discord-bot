import { createCanvas, registerFont } from "canvas";
import { TextChannel } from "discord.js";
import path from "path";

// Register custom font
registerFont(path.join(__dirname, "../../assets/fonts/Poppins-Bold.ttf"), {
  family: "Poppins",
});


interface PomodoroSession {
  timer: NodeJS.Timeout;
  endTime: number;
}

const activeSessions = new Map<string, PomodoroSession>();

function formatTime(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function generateCountdownImage(time: string): Promise<Buffer> {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1e1e2f"; // Background
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff"; // Text
  ctx.font = "bold 72px Open Sans";
  ctx.textAlign = "center";
  ctx.fillText(time, width / 2, height / 2 + 25);

  return canvas.toBuffer("image/png");
}

export async function startPomodoroCountdown(
  guildId: string,
  channel: TextChannel,
  duration: number
): Promise<boolean> {
  if (activeSessions.has(guildId)) return false;

  const endTime = Date.now() + duration * 60 * 1000;
  const sentMessage = await channel.send({
    content: `🕒 **Pomodoro Countdown Started**`,
  });

  const timer = setInterval(async () => {
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      clearInterval(timer);
      activeSessions.delete(guildId);
      await sentMessage.edit({
        content: `✅ Pomodoro complete! Great work! 🎉`,
        files: [],
      });
      return;
    }

    const image = await generateCountdownImage(formatTime(remaining));
    await sentMessage.edit({
      content: "",
      files: [{ attachment: image, name: "countdown.png" }],
    });
  }, 60 * 1000);

  activeSessions.set(guildId, { timer, endTime });
  return true;
}

export function cancelPomodoroForGuild(guildId: string): boolean {
  const session = activeSessions.get(guildId);
  if (!session) return false;

  clearInterval(session.timer);
  activeSessions.delete(guildId);
  return true;
}
