// Run this once (and again any time the command definition changes):
//   npm run deploy
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("track")
    .setDescription("Pick a random GT7 track (won't repeat one picked in the last 24h)"),
  new SlashCommandBuilder()
    .setName("reload-tracks")
    .setDescription("Reload the track list from tracks.json without restarting the bot")
    // Defaults to server members who can manage the server; adjust/remove
    // this line if you want anyone to be able to run it.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("track-history")
    .setDescription("Show which tracks were picked in the last 24h and when they're back up"),
  new SlashCommandBuilder()
    .setName("track-vote")
    .setDescription("Vote between two random tracks — 20 seconds, most reactions wins"),
].map((command) => command.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const { CLIENT_ID, GUILD_ID } = process.env;
    if (!CLIENT_ID) throw new Error("CLIENT_ID is missing from your .env file");

    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) // instant, one server — good for testing
      : Routes.applicationCommands(CLIENT_ID); // global, can take up to ~1hr to show up

    await rest.put(route, { body: commands });
    console.log(
      `Registered /track command ${GUILD_ID ? `to guild ${GUILD_ID}` : "globally"}.`
    );
  } catch (err) {
    console.error(err);
  }
})();
