require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const { loadTracksFromDisk } = require("./tracks-loader");
const { loadHistory, recordPick, pruneHistory } = require("./store");
const { pickTrack, pickTwoDistinct, getOnCooldown, formatDuration, TWENTY_FOUR_HOURS_MS } = require("./pick-track");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Loaded once at startup, then refreshed in place whenever /reload-tracks
// runs — no restart needed to pick up edits to tracks.json.
let tracks = loadTracksFromDisk();
console.log(`Loaded ${tracks.length} tracks.`);

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "track") {
    const history = loadHistory();
    const { track, fallback } = pickTrack(tracks, history);
    recordPick(track);

    const hoursLeft = Math.ceil(TWENTY_FOUR_HOURS_MS / (60 * 60 * 1000));
    const note = fallback
      ? "\n_(every track was on cooldown, so this is the one that's been waiting longest)_"
      : "";

    await interaction.reply(
      `🏁 **${track}**${note}\nThis one's off the table for the next ${hoursLeft}h.`
    );
    return;
  }

  if (interaction.commandName === "track-history") {
    const history = loadHistory();
    const onCooldown = getOnCooldown(tracks, history);

    if (onCooldown.length === 0) {
      await interaction.reply("✅ No tracks on cooldown right now — the full list is up for grabs.");
      return;
    }

    const lines = onCooldown.map(
      ({ track, msRemaining }) => `• **${track}** — back in ${formatDuration(msRemaining)}`
    );

    await interaction.reply(
      `🕒 **${onCooldown.length} track${onCooldown.length === 1 ? "" : "s"} on cooldown:**\n${lines.join("\n")}`
    );
    return;
  }

  if (interaction.commandName === "track-vote") {
    const VOTE_SECONDS = 20;
    const OPTION_ONE = "1️⃣";
    const OPTION_TWO = "2️⃣";

    const history = loadHistory();
    const [optionA, optionB] = pickTwoDistinct(tracks, history);

    await interaction.reply(
      `🗳️ **Vote for the next track!** You have ${VOTE_SECONDS} seconds.\n` +
        `${OPTION_ONE} ${optionA}\n${OPTION_TWO} ${optionB}`
    );

    const message = await interaction.fetchReply();
    try {
      await message.react(OPTION_ONE);
      await message.react(OPTION_TWO);
    } catch (err) {
      console.error("Failed to add vote reactions:", err);
    }

    setTimeout(async () => {
      try {
        const freshMessage = await message.fetch();
        const reactionOne = freshMessage.reactions.cache.get(OPTION_ONE);
        const reactionTwo = freshMessage.reactions.cache.get(OPTION_TWO);
        // subtract 1 from each to exclude the bot's own seed reaction
        const votesA = Math.max(0, (reactionOne?.count ?? 1) - 1);
        const votesB = Math.max(0, (reactionTwo?.count ?? 1) - 1);

        let winner;
        let tieNote = "";
        if (votesA === votesB) {
          winner = Math.random() < 0.5 ? optionA : optionB;
          tieNote = votesA === 0 ? " (no votes cast, picked randomly)" : " (tied, picked randomly)";
        } else {
          winner = votesA > votesB ? optionA : optionB;
        }

        recordPick(winner);
        const hoursLeft = Math.ceil(TWENTY_FOUR_HOURS_MS / (60 * 60 * 1000));

        await interaction.followUp(
          `🏁 **${winner}** wins${tieNote}!\n` +
            `${OPTION_ONE} ${optionA} — ${votesA} vote${votesA === 1 ? "" : "s"}\n` +
            `${OPTION_TWO} ${optionB} — ${votesB} vote${votesB === 1 ? "" : "s"}\n` +
            `This one's off the table for the next ${hoursLeft}h.`
        );
      } catch (err) {
        console.error("Failed to resolve track-vote:", err);
        await interaction.followUp("⚠️ Something went wrong tallying the vote — try again.");
      }
    }, VOTE_SECONDS * 1000);

    return;
  }

  if (interaction.commandName === "reload-tracks") {
    const previous = tracks;

    let updated;
    try {
      updated = loadTracksFromDisk();
    } catch (err) {
      await interaction.reply({
        content: `⚠️ Couldn't reload tracks.json, keeping the current list of ${previous.length} tracks.\n\`\`\`${err.message}\`\`\``,
        ephemeral: true,
      });
      return;
    }

    const previousSet = new Set(previous);
    const updatedSet = new Set(updated);
    const added = updated.filter((t) => !previousSet.has(t));
    const removed = previous.filter((t) => !updatedSet.has(t));

    tracks = updated;
    const { removed: staleHistoryCleaned } = pruneHistory(updated);

    const lines = [`✅ Reloaded — now tracking **${updated.length}** tracks.`];
    if (added.length) lines.push(`➕ Added: ${added.join(", ")}`);
    if (removed.length) lines.push(`➖ Removed: ${removed.join(", ")}`);
    if (staleHistoryCleaned.length) {
      lines.push(`🧹 Cleared stale cooldowns for: ${staleHistoryCleaned.join(", ")}`);
    }
    if (!added.length && !removed.length) lines.push("_(no changes since last load)_");

    await interaction.reply({ content: lines.join("\n"), ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
