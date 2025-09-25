import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';

export async function generatePomodoroImage(timeLeft: string, label = "FOCUS", sessionTitle = "Pomodoro") {
  const width = 512;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Colors
  const bgColor = '#1e1e2f';
  const cardColor = '#2e2e3f';
  const textColor = '#ffffff';
  const accentColor = '#ffcc00';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Card
  ctx.fillStyle = cardColor;
  ctx.roundRect(40, 40, width - 80, height - 100, 20);
  ctx.fill();

  // Title
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 28px Sans';
  ctx.textAlign = 'center';
  ctx.fillText(sessionTitle, width / 2, 80);

  // Timer Circle
  ctx.beginPath();
  ctx.arc(width / 2, 160, 70, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();

  // Time
  ctx.fillStyle = textColor;
  ctx.font = 'bold 40px Sans';
  ctx.fillText(timeLeft, width / 2, 170);

  // Label
  ctx.font = '20px Sans';
  ctx.fillStyle = '#888';
  ctx.fillText(label, width / 2, 200);

  // Footer
  ctx.font = '16px Sans';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Stay focused 💪', width / 2, height - 30);

  return canvas.toBuffer('image/png');
}
