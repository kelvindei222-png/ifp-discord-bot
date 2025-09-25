import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { MusicManager } from '../../lib/musicManager';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('⏭️ Skip the current song')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('Number of songs to skip')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  const musicManager = MusicManager.getInstance(interaction.guild, interaction.channel as any);
  
  if (!musicManager.currentSong && musicManager.queue.length === 0) {
    return interaction.reply({ content: '❌ There\'s nothing to skip!', ephemeral: true });
  }

  const amount = interaction.options.getInteger('amount') ?? 1;
  
  if (amount > 1) {
    // Skip multiple songs
    const skipped = musicManager.queue.splice(0, Math.min(amount - 1, musicManager.queue.length));
    musicManager.skip();
    
    return interaction.reply({
      content: `⏭️ Skipped ${amount} songs (including current song)`,
    });
  } else {
    // Skip current song
    const currentSong = musicManager.currentSong;
    musicManager.skip();
    
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⏭️ Song Skipped')
      .setDescription(currentSong ? `**${currentSong.title}** by ${currentSong.author}` : 'Current song')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}