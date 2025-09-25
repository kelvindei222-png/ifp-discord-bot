import { createCanvas, loadImage, registerFont } from 'canvas';
import { AttachmentBuilder, GuildMember } from 'discord.js';
import * as path from 'path';

export async function generateWelcomeCard(member: GuildMember): Promise<AttachmentBuilder> {
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, canvas.width, 80);
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

  // Add some geometric shapes for decoration
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(canvas.width - 100, 100, 120, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(100, canvas.height - 100, 100, 0, Math.PI * 2);
  ctx.fill();

  // Welcome text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME!', canvas.width / 2, 80);

  // User avatar (with error handling)
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    
    // Draw circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 180, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, (canvas.width / 2) - 70, 110, 140, 140);
    ctx.restore();

    // Avatar border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 180, 70, 0, Math.PI * 2);
    ctx.stroke();
  } catch (error) {
    // Fallback if avatar loading fails
    ctx.fillStyle = '#444444';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 180, 70, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👤', canvas.width / 2, 190);
  }

  // Username
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  const displayName = member.displayName.length > 20 ? member.displayName.slice(0, 17) + '...' : member.displayName;
  ctx.fillText(displayName, canvas.width / 2, 290);

  // Server name and member count
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(`Welcome to ${member.guild.name}!`, canvas.width / 2, 320);
  
  ctx.font = '18px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`You are member #${member.guild.memberCount}`, canvas.width / 2, 345);

  // Convert to buffer and create attachment
  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'welcome.png' });
}