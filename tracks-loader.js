const fs = require("fs");
const path = require("path");

const TRACKS_FILE = path.join(__dirname, "tracks.json");

/**
 * Reads tracks.json fresh from disk (bypassing require's module cache,
 * so edits are picked up without restarting the bot) and validates it.
 * Throws a descriptive error if the file is missing, not valid JSON,
 * not an array, or contains non-string / empty entries.
 *
 * @returns {string[]}
 */
function loadTracksFromDisk() {
  let raw;
  try {
    raw = fs.readFileSync(TRACKS_FILE, "utf8");
  } catch (err) {
    throw new Error(`Couldn't read tracks.json: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`tracks.json isn't valid JSON: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("tracks.json must contain a JSON array of track names.");
  }

  const cleaned = parsed.map((t) => (typeof t === "string" ? t.trim() : t));
  const invalidIndex = cleaned.findIndex((t) => typeof t !== "string" || t.length === 0);
  if (invalidIndex !== -1) {
    throw new Error(`tracks.json entry at index ${invalidIndex} isn't a non-empty string.`);
  }

  const deduped = [...new Set(cleaned)];
  if (deduped.length === 0) {
    throw new Error("tracks.json is empty — need at least one track.");
  }

  return deduped;
}

module.exports = { loadTracksFromDisk, TRACKS_FILE };
