import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType
} from 'discord.js';
import { MusicManager } from '../../lib/musicManager';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('🎵 Display the current music queue')
  .addIntegerOption(option =>
    option.setName('page')
      .setDescription('Page number to display')
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  const musicManager = MusicManager.getInstance(interaction.guild, interaction.channel as any);
  
  if (musicManager.queue.length === 0 && !musicManager.currentSong) {
    return interaction.reply({
      content: '📭 The queue is empty. Use `/play` to add some music!',
      ephemeral: true
    });
  }

  const pageSize = 10;
  const totalPages = Math.ceil(musicManager.queue.length / pageSize);
  let currentPage = interaction.options.getInteger('page') ?? 1;
  
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const embed = createQueueEmbed(musicManager, currentPage, pageSize);
  
  if (totalPages <= 1) {
    return interaction.reply({ embeds: [embed] });
  }

  // Create navigation buttons
  const buttons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('queue_first')
        .setLabel('⏪')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('queue_prev')
        .setLabel('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('queue_current')
        .setLabel(`${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('queue_next')
        .setLabel('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages),
      new ButtonBuilder()
        .setCustomId('queue_last')
        .setLabel('⏩')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages)
    );

  const response = await interaction.reply({ embeds: [embed], components: [buttons] });

  // Handle button interactions
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes
  });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({ content: '❌ Only the command user can navigate the queue!', ephemeral: true });
    }

    switch (buttonInteraction.customId) {
      case 'queue_first':
        currentPage = 1;
        break;
      case 'queue_prev':
        currentPage = Math.max(1, currentPage - 1);
        break;
      case 'queue_next':
        currentPage = Math.min(totalPages, currentPage + 1);
        break;
      case 'queue_last':
        currentPage = totalPages;
        break;
    }

    const newEmbed = createQueueEmbed(musicManager, currentPage, pageSize);
    
    // Update button states
    buttons.components[0].setDisabled(currentPage === 1); // First
    buttons.components[1].setDisabled(currentPage === 1); // Prev
    buttons.components[2].setLabel(`${currentPage}/${totalPages}`); // Current
    buttons.components[3].setDisabled(currentPage === totalPages); // Next
    buttons.components[4].setDisabled(currentPage === totalPages); // Last

    await buttonInteraction.update({ embeds: [newEmbed], components: [buttons] });
  });

  collector.on('end', () => {
    // Disable all buttons when collector ends
    buttons.components.forEach(button => button.setDisabled(true));
    interaction.editReply({ components: [buttons] }).catch(() => {});
  });
}

function createQueueEmbed(musicManager: MusicManager, page: number, pageSize: number) {
  const embed = musicManager.getQueueEmbed();
  
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageQueue = musicManager.queue.slice(startIndex, endIndex);
  
  if (pageQueue.length > 0) {
    const queueList = pageQueue.map((song, index) => 
      `${startIndex + index + 1}. **${song.title}** - ${song.author} (${formatTime(song.duration)})\n` +
      `   👤 ${song.requester.tag}`
    ).join('\n\n');
    
    // Replace the queue field with paginated version
    const queueFieldIndex = embed.data.fields?.findIndex(field => field.name?.includes('Up Next')) ?? -1;
    if (queueFieldIndex !== -1 && embed.data.fields) {
      embed.data.fields[queueFieldIndex] = {
        name: `📋 Queue (Page ${page}) - ${musicManager.queue.length} total songs`,
        value: queueList,
        inline: false
      };
    }
  }
  
  return embed;
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