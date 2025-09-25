import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, GuildMember, VoiceChannel, TextChannel } from "discord.js";
import { Command } from "../../types/discordClient";
import { MusicManager } from "../../lib/musicManager";

export const music: Command = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Music commands with YouTube search support")
    .addSubcommand(subcommand =>
      subcommand
        .setName("play")
        .setDescription("Play a song")
        .addStringOption(option =>
          option.setName("query")
            .setDescription("Song name, artist, or YouTube URL")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Stop the music"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("skip")
        .setDescription("Skip current song"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("queue")
        .setDescription("View the music queue"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("volume")
        .setDescription("Set music volume")
        .addIntegerOption(option =>
          option.setName("level")
            .setDescription("Volume level (0-100)")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("pause")
        .setDescription("Pause the current song"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("resume")
        .setDescription("Resume the paused song")),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = interaction.member as GuildMember;

    if (!guild) {
      await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
      return;
    }

    // Check if user is in a voice channel
    const voiceChannel = member.voice.channel as VoiceChannel;
    if (!voiceChannel) {
      await interaction.reply({ 
        content: "❌ You need to be in a voice channel to use music commands!", 
        ephemeral: true 
      });
      return;
    }
    
    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(guild.members.me!);
    if (!permissions?.has(['Connect', 'Speak'])) {
      await interaction.reply({
        content: "❌ I don't have permission to join or speak in your voice channel!",
        ephemeral: true
      });
      return;
    }

    switch (subcommand) {
      case "play": {
        const query = interaction.options.getString("query", true);
        
        await interaction.deferReply();
        
        try {
          const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
          
          // Connect to voice channel if not already connected
          if (!musicManager.connection) {
            await musicManager.connect(voiceChannel);
          }
          
          // Add song to queue
          const songs = await musicManager.addSong(query, interaction.user);
          
          if (songs.length === 0) {
            await interaction.editReply('❌ No songs found for your search query.');
            return;
          }
          
          const song = songs[0];
          const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎵 Added to Queue')
            .setDescription(`**${song.title}**`)
            .addFields(
              { name: '🎤 Artist', value: song.author, inline: true },
              { name: '⏱️ Duration', value: formatTime(song.duration), inline: true },
              { name: '📍 Position', value: `${musicManager.queue.length}`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
          // Start playing if nothing is currently playing
          if (!musicManager.isPlaying && !musicManager.isPaused) {
            musicManager.play();
          }
          
        } catch (error) {
          console.error('Music play error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to play music';
          
          if (errorMessage.includes('Search failed') || errorMessage.includes('No search results')) {
            await interaction.editReply(`❌ ${errorMessage}`);
          } else if (errorMessage.includes('permissions')) {
            await interaction.editReply('❌ I don\'t have permission to join or speak in your voice channel. Please check my permissions.');
          } else if (errorMessage.includes('longer than 10 minutes')) {
            await interaction.editReply('❌ Videos longer than 10 minutes are not supported to prevent abuse.');
          } else if (errorMessage.includes('Age-restricted')) {
            await interaction.editReply('❌ Age-restricted videos cannot be played.');
          } else if (errorMessage.includes('Live streams')) {
            await interaction.editReply('❌ Live streams are not supported.');
          } else if (errorMessage.includes('YouTube is blocking') || errorMessage.includes('403') || errorMessage.includes('🚫')) {
            await interaction.editReply(errorMessage); // Send the full detailed message
          } else if (errorMessage.includes('anti-bot') || errorMessage.includes('⏰')) {
            await interaction.editReply(errorMessage); // Send the full detailed message  
          } else {
            await interaction.editReply(`❌ Error: ${errorMessage}`);
          }
        }
        break;
      }

      case "queue": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        const embed = musicManager.getQueueEmbed();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "skip": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        
        if (!musicManager.currentSong && musicManager.queue.length === 0) {
          await interaction.reply({ content: '❌ There\'s nothing to skip!', ephemeral: true });
          return;
        }
        
        const currentSong = musicManager.currentSong;
        musicManager.skip();
        
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('⏭️ Song Skipped')
          .setDescription(currentSong ? `**${currentSong.title}** by ${currentSong.author}` : 'Current song')
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }
      
      case "stop": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        
        if (!musicManager.isPlaying && !musicManager.isPaused && musicManager.queue.length === 0) {
          await interaction.reply({ content: '❌ There\'s nothing to stop!', ephemeral: true });
          return;
        }
        
        const queueSize = musicManager.queue.length;
        musicManager.stop();
        musicManager.disconnect();
        
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('⏹️ Music Stopped')
          .setDescription(`Cleared queue with ${queueSize} songs and disconnected from voice channel.`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }
      
      case "volume": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        const volumeLevel = interaction.options.getInteger("level", true);
        
        musicManager.setVolume(volumeLevel);
        
        const volumeEmoji = volumeLevel === 0 ? '🔇' : volumeLevel < 30 ? '🔉' : volumeLevel < 70 ? '🔊' : '📢';
        
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle(`${volumeEmoji} Volume Changed`)
          .setDescription(`Volume set to **${volumeLevel}%**`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "pause": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        
        if (!musicManager.isPlaying) {
          await interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
          return;
        }
        
        musicManager.pause();
        
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('⏸️ Music Paused')
          .setDescription('Music has been paused. Use `/music resume` to continue playing.')
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case "resume": {
        const musicManager = MusicManager.getInstance(guild, interaction.channel as TextChannel);
        
        if (!musicManager.isPaused) {
          await interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
          return;
        }
        
        musicManager.resume();
        
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('▶️ Music Resumed')
          .setDescription('Music has been resumed.')
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        break;
      }
      
      default: {
        const embed = new EmbedBuilder()
          .setTitle("🎵 Music System")
          .setDescription(`**${subcommand}** command not recognized.`)
          .setColor(0xFF0000)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        break;
      }
    }
  }
};

// Helper function to format time in seconds to MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}