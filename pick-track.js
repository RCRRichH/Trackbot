const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Picks a random track, excluding any track picked within the last 24h.
 * If every track is on cooldown (shouldn't happen with 40+ tracks, but
 * just in case), falls back to the least-recently-picked track so the
 * bot never simply fails to answer.
 *
 * @param {string[]} tracks - full list of track names
 * @param {Record<string, number>} history - track name -> last-picked timestamp (ms)
 * @param {number} now - current time in ms (injectable for testing)
 * @returns {{ track: string, fallback: boolean }}
 */
function pickTrack(tracks, history, now = Date.now()) {
  const available = tracks.filter((track) => {
    const lastPicked = history[track];
    return !lastPicked || now - lastPicked >= TWENTY_FOUR_HOURS_MS;
  });

  if (available.length > 0) {
    const track = available[Math.floor(Math.random() * available.length)];
    return { track, fallback: false };
  }

  // Every track is on cooldown — pick whichever has been waiting longest.
  const oldest = tracks.reduce((oldestTrack, track) => {
    const trackTime = history[track] ?? 0;
    const oldestTime = history[oldestTrack] ?? 0;
    return trackTime < oldestTime ? track : oldestTrack;
  }, tracks[0]);

  return { track: oldest, fallback: true };
}

/**
 * Returns the tracks currently on cooldown (picked within the last 24h),
 * each with how much time is left until they're eligible again, soonest
 * first.
 *
 * @param {string[]} tracks - current valid track list (filters out stale history entries)
 * @param {Record<string, number>} history
 * @param {number} now
 * @returns {{ track: string, msRemaining: number }[]}
 */
function getOnCooldown(tracks, history, now = Date.now()) {
  const validSet = new Set(tracks);
  return Object.entries(history)
    .filter(([track]) => validSet.has(track))
    .map(([track, lastPicked]) => ({
      track,
      msRemaining: TWENTY_FOUR_HOURS_MS - (now - lastPicked),
    }))
    .filter((entry) => entry.msRemaining > 0)
    .sort((a, b) => a.msRemaining - b.msRemaining);
}

/**
 * Formats a millisecond duration as e.g. "3h 12m" or "48m" for display.
 * @param {number} ms
 */
function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Picks two distinct tracks for a head-to-head vote, preferring tracks
 * that aren't currently on cooldown. Falls back to the full track list
 * if fewer than 2 tracks are off cooldown (rare, but keeps this from
 * ever failing outright).
 *
 * @param {string[]} tracks
 * @param {Record<string, number>} history
 * @param {number} now
 * @returns {[string, string]}
 */
function pickTwoDistinct(tracks, history, now = Date.now()) {
  const available = tracks.filter((track) => {
    const lastPicked = history[track];
    return !lastPicked || now - lastPicked >= TWENTY_FOUR_HOURS_MS;
  });

  const pool = available.length >= 2 ? available : tracks;

  const first = pool[Math.floor(Math.random() * pool.length)];
  let second = first;
  while (second === first && pool.length > 1) {
    second = pool[Math.floor(Math.random() * pool.length)];
  }
  return [first, second];
}

module.exports = { pickTrack, pickTwoDistinct, getOnCooldown, formatDuration, TWENTY_FOUR_HOURS_MS };
