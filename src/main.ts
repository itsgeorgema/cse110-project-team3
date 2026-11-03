import "./style.css";
import { SaveManager } from "./data/SaveManager.ts";
import type { SaveData } from "./data/SaveData.ts";
import { OverworldMap } from "./view/overworld/OverworldMap.ts";
import { previewNodes } from "./view/overworld/mapPreview.ts";

// Composition root: the one place that builds the objects and wires them together.
const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error('index.html is missing <div id="app">');
}
let saveManager: SaveManager | undefined;
let savedProgress: SaveData = {
  schemaVersion: 1,
  completedLevels: [],
  currentLevel: null,
};
try {
  saveManager = new SaveManager(window.localStorage);
  savedProgress = saveManager.load();
} catch {
  // Keep the map usable with session-only progress when storage is unavailable.
}

// Seed the preview's sample completion state so it survives the first selection
// save, just like progress loaded from an existing save.
if (
  savedProgress.completedLevels.length === 0 &&
  savedProgress.currentLevel === null
) {
  savedProgress = {
    ...savedProgress,
    completedLevels: previewNodes
      .filter((node) => node.initialState === "cleared")
      .map((node) => node.level),
  };
}

const knownLevels = new Set(
  previewNodes.map((node) => `${node.level.gameId}:${node.level.levelId}`),
);
const completedLevels = new Set(
  savedProgress.completedLevels
    .filter((level) => knownLevels.has(`${level.gameId}:${level.levelId}`))
    .map((level) => `${level.gameId}:${level.levelId}`),
);
const validCurrentLevel =
  savedProgress.currentLevel &&
  knownLevels.has(
    `${savedProgress.currentLevel.gameId}:${savedProgress.currentLevel.levelId}`,
  )
    ? savedProgress.currentLevel
    : null;

new OverworldMap(
  container,
  completedLevels,
  validCurrentLevel,
  (level) => {
    savedProgress = { ...savedProgress, currentLevel: level };
    try {
      saveManager?.save(savedProgress.completedLevels, level);
    } catch {
      // The current selection still works for this session without storage.
    }
  },
  () => {
    savedProgress = {
      schemaVersion: 1,
      completedLevels: [],
      currentLevel: null,
    };
    try {
      saveManager?.reset();
    } catch {
      // Reset the visible session even when browser storage is unavailable.
    }
  },
);
