import { createCanvas, loadImage } from "canvas";
import path from "path";

// Helper to format remaining time as MM:SS
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export async function generateCountdownImage(timeRemainingMs: number): Promise<Buffer> {
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e1e2f";
  ctx.fillRect(0, 0, width, height);

  // Optional: Add background image
  // const background = await loadImage(path.resolve(__dirname, "../assets/pomobg.png"));
  // ctx.drawImage(background, 0, 0, width, height);

  // Title
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Pomodoro Timer", width / 2, 80);

  // Time
  ctx.font = "bold 90px Arial";
  ctx.fillStyle = "#00ff88";
  ctx.fillText(formatTime(timeRemainingMs), width / 2, 180);

  // Message
  ctx.font = "28px Arial";
  ctx.fillStyle = "#aaaaaa";
  ctx.fillText("Stay focused. You're doing great!", width / 2, 240);

  return canvas.toBuffer("image/png");
}
