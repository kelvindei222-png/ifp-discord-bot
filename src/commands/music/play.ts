import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  GuildMember, 
  VoiceChannel,
  EmbedBuilder 
} from 'discord.js';
import { MusicManager } from '../../lib/musicManager';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('🎵 Play music in voice channel')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Song name, YouTube URL, or playlist URL')
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option.setName('skip_queue')
      .setDescription('Skip to the front of the queue')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel;
  
  if (!voiceChannel) {
    return interaction.reply({ 
      content: '❌ You need to be in a voice channel to play music!', 
      ephemeral: true 
    });
  }

  if (!voiceChannel.permissionsFor(interaction.guild.members.me!)?.has(['Connect', 'Speak'])) {
    return interaction.reply({ 
      content: '❌ I don\'t have permission to join or speak in your voice channel!', 
      ephemeral: true 
    });
  }

  await interaction.deferReply();

  try {
    const query = interaction.options.getString('query', true);
    const skipQueue = interaction.options.getBoolean('skip_queue') ?? false;
    
    const musicManager = MusicManager.getInstance(interaction.guild, interaction.channel as any);
    
    // Connect to voice channel if not already connected
    if (!musicManager.connection) {
      await musicManager.connect(voiceChannel);
    }

    // Add song(s) to queue
    const songs = await musicManager.addSong(query, interaction.user);
    
    if (songs.length === 0) {
      return interaction.editReply('❌ No songs found for your search query.');
    }

    // Handle skip queue option
    if (skipQueue && songs.length === 1) {
      musicManager.queue.unshift(musicManager.queue.pop()!); // Move to front
    }

    // Create response embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTimestamp();

    if (songs.length === 1) {
      const song = songs[0];
      embed.setTitle('🎵 Added to Queue')
        .setDescription(`**${song.title}**`)
        .addFields(
          { name: '🎤 Artist', value: song.author, inline: true },
          { name: '⏱️ Duration', value: formatTime(song.duration), inline: true },
          { name: '📍 Position', value: `${musicManager.queue.length}`, inline: true }
        )
        .setThumbnail(song.thumbnail);
    } else {
      embed.setTitle('🎵 Playlist Added to Queue')
        .setDescription(`Added ${songs.length} songs to the queue`)
        .addFields(
          { name: '📋 Total Queue Size', value: `${musicManager.queue.length} songs`, inline: true }
        );
    }

    await interaction.editReply({ embeds: [embed] });

    // Start playing if nothing is currently playing
    if (!musicManager.isPlaying && !musicManager.isPaused) {
      musicManager.play();
    }

  } catch (error) {
    console.error('Play command error:', error);
    await interaction.editReply('❌ An error occurred while trying to play music. Please try again.');
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}