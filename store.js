// Simple JSON-file persistence for "last picked" timestamps, per track.
// Swap this out for a real database later if you ever need to run
// multiple instances of the bot — a flat file is fine for a single process.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "history.json");

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");
}

function loadHistory() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error("Failed to read history file, starting fresh:", err);
    return {};
  }
}

function saveHistory(history) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
}

function recordPick(trackName, whenMs = Date.now()) {
  const history = loadHistory();
  history[trackName] = whenMs;
  saveHistory(history);
}

/**
 * Removes any history entries for tracks that no longer exist in the
 * current track list (e.g. renamed or deleted in tracks.json), so the
 * history file doesn't quietly accumulate dead names forever.
 *
 * @param {string[]} validTrackNames
 * @returns {{ removed: string[] }}
 */
function pruneHistory(validTrackNames) {
  const history = loadHistory();
  const validSet = new Set(validTrackNames);
  const removed = [];

  for (const name of Object.keys(history)) {
    if (!validSet.has(name)) {
      removed.push(name);
      delete history[name];
    }
  }

  if (removed.length > 0) saveHistory(history);
  return { removed };
}

module.exports = { loadHistory, saveHistory, recordPick, pruneHistory };
