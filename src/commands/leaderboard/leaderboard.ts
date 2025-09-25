import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder
} from 'discord.js';
import { LeaderboardManager } from '../../lib/leaderboardManager';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('📊 View server leaderboards')
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Category to display')
      .setRequired(false)
      .addChoices(
        { name: '⭐ Experience Points', value: 'xp' },
        { name: '🔥 Level', value: 'level' },
        { name: '💬 Messages', value: 'messages' },
        { name: '🎤 Voice Time', value: 'voice' },
        { name: '🎵 Music Time', value: 'music' },
        { name: '📚 Study Time', value: 'study' },
        { name: '🔥 Daily Streak', value: 'streak' },
        { name: '🏆 Achievements', value: 'achievements' }
      )
  )
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of users to show (1-25)')
      .setMinValue(1)
      .setMaxValue(25)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  await interaction.deferReply();

  const leaderboardManager = LeaderboardManager.getInstance(interaction.guild.id, interaction.client);
  const category = interaction.options.getString('category') || 'xp';
  const limit = interaction.options.getInteger('limit') || 10;

  try {
    const embed = leaderboardManager.createLeaderboardEmbed(category, limit);
    const categories = leaderboardManager.getCategories();

    // Create category selection dropdown
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('leaderboard_category')
      .setPlaceholder('Select a leaderboard category')
      .addOptions(
        categories.map(cat => 
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.name)
            .setDescription(`View ${cat.name.toLowerCase()} rankings`)
            .setValue(cat.id)
            .setEmoji(cat.emoji)
            .setDefault(cat.id === category)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    const response = await interaction.editReply({ 
      embeds: [embed], 
      components: [row] 
    });

    // Handle dropdown interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (selectInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        return selectInteraction.reply({ 
          content: '❌ Only the command user can change the leaderboard category!', 
          ephemeral: true 
        });
      }

      const selectedCategory = selectInteraction.values[0];
      const newEmbed = leaderboardManager.createLeaderboardEmbed(selectedCategory, limit);

      // Update the dropdown to show new selection
      const updatedSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('leaderboard_category')
        .setPlaceholder('Select a leaderboard category')
        .addOptions(
          categories.map(cat => 
            new StringSelectMenuOptionBuilder()
              .setLabel(cat.name)
              .setDescription(`View ${cat.name.toLowerCase()} rankings`)
              .setValue(cat.id)
              .setEmoji(cat.emoji)
              .setDefault(cat.id === selectedCategory)
          )
        );

      const updatedRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(updatedSelectMenu);

      await selectInteraction.update({ 
        embeds: [newEmbed], 
        components: [updatedRow] 
      });
    });

    collector.on('end', () => {
      // Disable the select menu when collector ends
      selectMenu.setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);
      
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });

  } catch (error) {
    console.error('Leaderboard command error:', error);
    await interaction.editReply('❌ An error occurred while fetching the leaderboard.');
  }
}