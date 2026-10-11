# GT7 Track Bot

A tiny Discord bot with one slash command, `/track`, that picks a random
Gran Turismo 7 track. Any track it picks goes on a 24-hour cooldown so you
won't get repeats — everything else stays in the pool.

## How it works
- `tracks.json` — the full track list.
- `data/history.json` — created automatically the first time the bot runs.
  Stores `{ "trackName": lastPickedTimestamp }`.
- On each `/track` call, the bot filters out any track picked in the last
  24 hours, picks randomly from what's left, and records the new pick.
- If every single track happens to be on cooldown (very unlikely with 40+
  tracks), it falls back to whichever has been waiting longest so the
  command never just fails.

## Setup

1. **Create a Discord application & bot**
   - Go to https://discord.com/developers/applications → New Application.
   - Under **Bot**, click "Reset Token" and copy it — this is `DISCORD_TOKEN`.
   - Under **General Information**, copy the **Application ID** — this is `CLIENT_ID`.
   - Under **OAuth2 → URL Generator**, check scopes `bot` and `applications.commands`,
     give it permissions `Send Messages`, `Read Message History`, and `Add Reactions`
     (the last two are needed for `/track-vote`'s reaction poll), then open the
     generated URL to invite it to your server.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in `DISCORD_TOKEN` and `CLIENT_ID`. Optionally set `GUILD_ID` (your
   server's ID) while testing — guild-scoped commands register instantly,
   global ones can take up to an hour to appear.

4. **Register the slash command**
   ```bash
   npm run deploy
   ```

5. **Run the bot**
   ```bash
   npm start
   ```

Then in any channel the bot can see, type `/track`.

## Voting between two tracks
`/track-vote` posts two random tracks (preferring ones off cooldown) with
1️⃣ and 2️⃣ reactions. After 20 seconds, whichever has more reactions wins
and goes on the usual 24h cooldown — a tie (including zero votes) is
broken randomly. Note: if someone reacts to *both* options, both reactions
count — there's no vote-switching logic, just a simple reaction count.

## Checking what's on cooldown
`/track-history` lists every track picked in the last 24h and how long until
each is back in the pool, soonest first. If nothing's on cooldown it just
says so. No special permissions needed — anyone can run it.

## Updating the track list
Just edit `tracks.json` (plain JSON array of strings), save it, then run
`/reload-tracks` in Discord — no restart needed. By default only members
with the "Manage Server" permission can run it (change or remove the
`.setDefaultMemberPermissions(...)` line in `commands/deploy-commands.js`
and re-run `npm run deploy` if you want anyone to be able to use it).

`/reload-tracks` will:
- Re-read `tracks.json` from disk
- Tell you what was added/removed compared to the previous list
- Clear out any 24h-cooldown history for tracks that got renamed or removed,
  so it doesn't pile up stale entries in `data/history.json`
- Refuse to apply the change (and keep the old list running) if
  `tracks.json` has a JSON syntax error, so a typo can't take the bot down

## Hosting
This just needs to stay running somewhere (a small VPS, Railway, Render,
a Raspberry Pi, etc.) — `data/history.json` persists to disk next to the
code, so as long as the same instance/volume keeps running, the 24h
memory survives restarts.

## Changing the cooldown window
Edit `TWENTY_FOUR_HOURS_MS` in `pick-track.js` if you ever want a shorter
or longer "no repeats" window.
