import { createCanvas } from "canvas";

export function generateCountdownImage(minutesLeft: number): Buffer {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e1e2f";
  ctx.fillRect(0, 0, width, height);

  // Countdown Circle
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#282c34";
  ctx.fill();

  // Text
  ctx.font = "bold 40px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${minutesLeft} min`, width / 2, height / 2);

  return canvas.toBuffer("image/png");
}
