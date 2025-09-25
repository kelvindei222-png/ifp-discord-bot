import { Events, ChatInputCommandInteraction, Client } from "discord.js";

const event = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: "❌ Unknown command.", ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ There was an error executing this command.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ There was an error executing this command.", ephemeral: true });
      }
    }
  },
};

export default event;
