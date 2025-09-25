import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  DiscordGatewayAdapterCreator,
  PlayerSubscription,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { Guild, TextChannel, VoiceChannel, User, EmbedBuilder } from 'discord.js';
import { AudioService, AudioTrack } from './audioService';

export interface Song {
  title: string;
  url: string;
  duration: number;
  thumbnail: string;
  requester: User;
  author: string;
  views?: number;
  source: 'radio' | 'soundcloud' | 'freemusicarchive' | 'jamendo';
}

export interface QueueSettings {
  loop: 'none' | 'song' | 'queue';
  shuffle: boolean;
  volume: number;
  autoplay: boolean;
  bassBoost: boolean;
  nightcore: boolean;
  vaporwave: boolean;
}

export interface MusicStats {
  songsPlayed: number;
  totalDuration: number;
  timeListening: number;
  favoriteGenres: Map<string, number>;
  mostPlayedSongs: Map<string, number>;
}

export class MusicManager {
  private static instances = new Map<string, MusicManager>();
  
  public guild: Guild;
  public textChannel: TextChannel;
  public voiceChannel: VoiceChannel | null = null;
  public connection: VoiceConnection | null = null;
  public player: AudioPlayer;
  public subscription: PlayerSubscription | null = null;
  
  public queue: Song[] = [];
  public history: Song[] = [];
  public currentSong: Song | null = null;
  public settings: QueueSettings = {
    loop: 'none',
    shuffle: false,
    volume: 50,
    autoplay: false,
    bassBoost: false,
    nightcore: false,
    vaporwave: false,
  };
  
  public isPlaying = false;
  public isPaused = false;
  private currentPosition = 0;
  private startTime = 0;
  
  public stats: MusicStats = {
    songsPlayed: 0,
    totalDuration: 0,
    timeListening: 0,
    favoriteGenres: new Map(),
    mostPlayedSongs: new Map(),
  };

  private constructor(guild: Guild, textChannel: TextChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.player = createAudioPlayer();
    this.setupPlayerEvents();
  }

  public static getInstance(guild: Guild, textChannel: TextChannel): MusicManager {
    if (!MusicManager.instances.has(guild.id)) {
      MusicManager.instances.set(guild.id, new MusicManager(guild, textChannel));
      console.log('🎵 Audio service initialized for guild');
    }
    return MusicManager.instances.get(guild.id)!;
  }

  private setupPlayerEvents(): void {
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.startTime = Date.now();
      console.log(`🎵 Now playing: ${this.currentSong?.title}`);
    });

    this.player.on(AudioPlayerStatus.Paused, () => {
      this.isPaused = true;
      if (this.startTime) {
        this.currentPosition += Date.now() - this.startTime;
      }
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      this.isPaused = false;
      
      if (this.currentSong) {
        this.updateStats();
        this.history.unshift(this.currentSong);
        if (this.history.length > 50) this.history.pop();
      }
      
      this.handleSongEnd();
    });

    this.player.on('error', (error) => {
      console.error('Audio player error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        currentSong: this.currentSong?.title,
        currentUrl: this.currentSong?.url,
        playerState: this.player.state.status,
        connectionState: this.connection?.state.status
      });
      
      let errorMessage: string | null = '❌ **Audio playback error**';
      
      if (error.message.includes('Status code: 403') || error.message.includes('403')) {
        errorMessage = '🚫 **Audio stream is temporarily unavailable**\n\nThe radio station might be offline or experiencing issues. Trying next song...';
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = '⏰ **Connection timed out**\n\nThe radio stream is not responding. Trying next song...';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        errorMessage = '🌐 **Network error**\n\nCouldn\'t connect to the audio source. Trying next song...';
      } else if (error.message.includes('spawn') || error.message.includes('ffmpeg')) {
        errorMessage = '🎧 **Audio processing error**\n\nFFmpeg might not be installed or accessible. Please restart your shell and try again.';
      } else if (error.message.includes('aborted')) {
        // Don't show aborted errors to users as they're often normal
        console.log('Stream aborted (normal behavior for some streams)');
        errorMessage = null; // Don't send error message
      } else {
        errorMessage = `❌ **Audio error**: ${error.message.substring(0, 100)}...`;
      }
      
      // Only send error message if it's not null
      if (errorMessage) {
        this.textChannel.send(errorMessage).catch(console.error);
      }
      
      // Try to skip to next song if available
      if (this.queue.length > 0) {
        setTimeout(() => this.skip(), 2000); // Wait a bit before trying next song
      } else {
        // No more songs, stop playing
        this.stop();
      }
    });
  }

  public async connect(voiceChannel: VoiceChannel): Promise<void> {
    // Clean up any existing connection first
    if (this.connection) {
      if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        this.connection.destroy();
      }
      this.connection = null;
    }

    this.voiceChannel = voiceChannel;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log('Voice connection disconnected');
      // Don't cleanup immediately, try to reconnect
      setTimeout(() => {
        if (this.connection && this.connection.state.status === VoiceConnectionStatus.Disconnected) {
          this.cleanup();
        }
      }, 5000);
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log('Voice connection destroyed');
      // Clean up without trying to destroy the connection again
      this.player.stop();
      this.subscription?.unsubscribe();
      this.queue = [];
      this.currentSong = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.connection = null;
      this.subscription = null;
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30000);
      this.subscription = this.connection.subscribe(this.player) || null;
      console.log('Successfully connected to voice channel');
    } catch (error) {
      console.error('Failed to connect to voice channel:', error);
      if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        this.connection.destroy();
      }
      this.connection = null;
      throw new Error('Failed to join voice channel. Make sure I have the necessary permissions.');
    }
  }

  public async addSong(query: string, requester: User): Promise<Song[]> {
    try {
      console.log(`🎵 Searching for: ${query}`);
      
      // Use AudioService to find tracks
      const audioTracks = await AudioService.searchTrack(query, requester);
      
      if (audioTracks.length === 0) {
        throw new Error(`No music found for "${query}". Try searching for genres like: lofi, jazz, classical, rock, pop`);
      }
      
      // Convert AudioTrack to Song format
      const songs: Song[] = audioTracks.map(track => ({
        title: track.title,
        url: track.url,
        duration: track.duration,
        thumbnail: track.thumbnail,
        requester: track.requester,
        author: track.artist,
        views: 0,
        source: track.source as any // Convert to compatible source type
      }));
      
      // Add to queue
      this.queue.push(...songs);
      
      console.log(`✅ Added ${songs.length} track(s) to queue`);
      return songs;
      
    } catch (error) {
      console.error('Error adding song:', error);
      throw error instanceof Error ? error : new Error('Failed to add music to queue.');
    }
  }


  public async play(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to voice channel');
    }

    if (this.queue.length === 0) {
      if (this.settings.autoplay && this.history.length > 0) {
        await this.generateAutoplay();
      } else {
        this.textChannel.send('🔇 Queue is empty. Add some songs to continue playing!');
        return;
      }
    }

    this.currentSong = this.queue.shift()!;
    this.currentPosition = 0;

    try {
      const resource = await this.createAudioResource(this.currentSong);
      this.player.play(resource);
      
      await this.sendNowPlayingEmbed();
    } catch (error) {
      console.error('Error playing song:', error);
      this.textChannel.send(`❌ Failed to play: ${this.currentSong.title}`);
      if (this.queue.length > 0) {
        this.play();
      }
    }
  }

  private async createAudioResource(song: Song): Promise<AudioResource> {
    try {
      console.log(`🎧 Creating audio stream for: ${song.title}`);
      console.log(`🌐 Stream URL: ${song.url}`);
      
      const https = require('https');
      const http = require('http');
      
      // Create a stream from the radio URL
      const client = song.url.startsWith('https://') ? https : http;
      
      return new Promise((resolve, reject) => {
        const request = client.get(song.url, { 
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'audio/mpeg, audio/*',
            'Icy-MetaData': '1'
          }
        }, (response: any) => {
          if (response.statusCode !== 200 && response.statusCode !== 206) {
            reject(new Error(`HTTP Error: ${response.statusCode} - ${response.statusMessage}`));
            return;
          }
          
          console.log(`✅ Connected to radio stream (Status: ${response.statusCode})`);
          console.log(`🎵 Content-Type: ${response.headers['content-type']}`);
          
          try {
            // Create audio resource with proper input type for radio streams
            const resource = createAudioResource(response, {
              inputType: response.headers['content-type']?.includes('audio/mpeg') ? StreamType.Arbitrary : StreamType.Arbitrary,
              inlineVolume: true,
              metadata: {
                title: song.title,
                artist: song.author
              }
            });
            
            // Set volume
            if (resource.volume) {
              resource.volume.setVolume(this.settings.volume / 100);
            }
            
            console.log(`✅ Successfully created audio resource with StreamType.Arbitrary for radio stream`);
            resolve(resource);
            
          } catch (resourceError) {
            console.error('Error creating audio resource from stream:', resourceError);
            reject(new Error(`Audio resource creation failed: ${resourceError instanceof Error ? resourceError.message : 'Unknown error'}`));
          }
        });
        
        request.on('error', (error: Error) => {
          console.error('HTTP request error:', error);
          reject(new Error(`Failed to connect to radio stream: ${error.message}`));
        });
        
        request.setTimeout(15000, () => {
          request.destroy();
          reject(new Error('Connection timeout - radio stream took too long to respond'));
        });
      });
      
    } catch (error) {
      console.error('Error creating audio resource:', error);
      throw new Error(`Failed to create audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  public pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.player.pause();
    }
  }

  public resume(): void {
    if (this.isPaused) {
      this.player.unpause();
    }
  }

  public skip(): void {
    if (this.currentSong) {
      this.player.stop();
    }
  }

  public stop(): void {
    this.queue = [];
    this.player.stop();
  }

  public setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(100, volume));
    
    // Apply volume to current playing audio resource if available
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      const resource = (this.player.state as any).resource;
      if (resource && resource.volume) {
        resource.volume.setVolume(this.settings.volume / 100);
        console.log(`Volume set to ${this.settings.volume}%`);
      }
    }
  }

  public shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.settings.shuffle = true;
  }

  public setLoop(mode: 'none' | 'song' | 'queue'): void {
    this.settings.loop = mode;
  }

  private handleSongEnd(): void {
    if (this.settings.loop === 'song' && this.currentSong) {
      this.queue.unshift(this.currentSong);
    } else if (this.settings.loop === 'queue' && this.currentSong) {
      this.queue.push(this.currentSong);
    }

    if (this.queue.length > 0) {
      this.play();
    } else if (this.settings.autoplay) {
      this.generateAutoplay().then(() => this.play());
    }
  }

  private async generateAutoplay(): Promise<void> {
    // Autoplay functionality disabled temporarily
    console.log('Autoplay functionality disabled temporarily');
    return;
  }

  private async sendNowPlayingEmbed(): Promise<void> {
    if (!this.currentSong) return;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${this.currentSong.title}**`)
      .addFields(
        { name: '🎤 Artist', value: this.currentSong.author, inline: true },
        { name: '⏱️ Duration', value: this.formatTime(this.currentSong.duration), inline: true },
        { name: '👤 Requested by', value: this.currentSong.requester.tag, inline: true },
        { name: '🔊 Volume', value: `${this.settings.volume}%`, inline: true },
        { name: '🔁 Loop', value: this.settings.loop, inline: true },
        { name: '📋 Queue', value: `${this.queue.length} songs`, inline: true }
      )
      .setThumbnail(this.currentSong.thumbnail)
      .setTimestamp();

    this.textChannel.send({ embeds: [embed] });
  }

  public getCurrentPosition(): number {
    if (!this.isPlaying) return this.currentPosition;
    return this.currentPosition + (Date.now() - this.startTime);
  }

  public seek(position: number): void {
    if (this.currentSong && position >= 0 && position <= this.currentSong.duration * 1000) {
      this.currentPosition = position;
      // Seeking would require restarting the stream at the specified position
      // This is complex with ytdl-core and would need specialized implementation
    }
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private updateStats(): void {
    if (!this.currentSong) return;
    
    this.stats.songsPlayed++;
    this.stats.totalDuration += this.currentSong.duration;
    
    const songKey = `${this.currentSong.title} - ${this.currentSong.author}`;
    this.stats.mostPlayedSongs.set(songKey, (this.stats.mostPlayedSongs.get(songKey) || 0) + 1);
  }

  public getQueueEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 Music Queue')
      .setTimestamp();

    if (this.currentSong) {
      embed.addFields({
        name: '🎵 Now Playing',
        value: `**${this.currentSong.title}** - ${this.currentSong.author}\nRequested by: ${this.currentSong.requester.tag}`,
      });
    }

    if (this.queue.length > 0) {
      const queueList = this.queue.slice(0, 10).map((song, index) => 
        `${index + 1}. **${song.title}** - ${song.author} (${this.formatTime(song.duration)})`
      ).join('\n');
      
      embed.addFields({
        name: `📋 Up Next (${this.queue.length} songs)`,
        value: queueList + (this.queue.length > 10 ? `\n... and ${this.queue.length - 10} more` : ''),
      });
    } else {
      embed.addFields({
        name: '📋 Queue',
        value: 'No songs in queue',
      });
    }

    embed.addFields(
      { name: '🔊 Volume', value: `${this.settings.volume}%`, inline: true },
      { name: '🔁 Loop', value: this.settings.loop, inline: true },
      { name: '🔀 Shuffle', value: this.settings.shuffle ? 'On' : 'Off', inline: true }
    );

    return embed;
  }

  public cleanup(): void {
    this.player.stop();
    
    // Only destroy connection if it exists and isn't already destroyed
    if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      this.connection.destroy();
    }
    
    this.subscription?.unsubscribe();
    this.queue = [];
    this.currentSong = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.connection = null;
    this.subscription = null;
    MusicManager.instances.delete(this.guild.id);
  }

  public disconnect(): void {
    this.cleanup();
  }
}