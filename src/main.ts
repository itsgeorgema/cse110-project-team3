import "./style.css";
import { SaveManager } from "./data/SaveManager.ts";
import type { SaveData } from "./data/SaveData.ts";
import { OverworldMap } from "./view/overworld/OverworldMap.ts";
import {
  previewNodes,
  previewConnections,
} from "./view/overworld/mapPreview.ts";
import { createLevelCatalog } from "./data/levelCatalog.ts";
import { LevelManager } from "./controller/LevelManager.ts";
import { LevelSession } from "./controller/LevelSession.ts";
import { LevelPanel } from "./view/LevelPanel.ts";
import { OverworldGraph } from "./model/OverworldGraph.ts";
import { OverworldNavigation } from "./controller/OverworldNavigation.ts";
import { FakeAnimationEngine } from "./view/animation/FakeAnimationEngine.ts";
import { saveAttempts } from "./controller/saveAttempts.ts";

// Composition root: the one place that builds the objects and wires them together.
const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error('index.html is missing <div id="app">');
}
let saveManager: SaveManager | undefined;
let savedProgress: SaveData = {
  schemaVersion: 2,
  completedLevels: [],
  currentLevel: null,
  attempts: [],
};
try {
  saveManager = new SaveManager(window.localStorage);
  savedProgress = saveManager.load();
} catch {
  // Keep the map usable with session-only progress when storage is unavailable.
}

const knownLevels = new Set(
  previewNodes.map((node) => `${node.level.gameId}:${node.level.levelId}`),
);
const completedLevels = new Set(
  savedProgress.completedLevels
    .filter((level) => knownLevels.has(`${level.gameId}:${level.levelId}`))
    .map((level) => `${level.gameId}:${level.levelId}`),
);
const levelHost = document.createElement("div");
container.after(levelHost);
const levelManager = new LevelManager(createLevelCatalog());
const levelPanel = new LevelPanel(levelHost, () => levelSession.close());
// LevelPanel has no animation stage yet, so each level gets a canvas-free engine
// that finishes at once and an empty run. Swap in the level's AnimationFactory
// engine, a PhysicsEngine run builder and ProgressController once the panel mounts a stage.
const levelSession = new LevelSession(levelManager, levelPanel, () => ({
  animation: new FakeAnimationEngine(),
  buildRun: () => [],
  progress: saveAttempts(saveManager),
}));

const navigation = new OverworldNavigation(
  new OverworldGraph(previewNodes, previewConnections),
  levelManager.listLevels(),
  {
    isCompleted: (level) =>
      completedLevels.has(`${level.gameId}:${level.levelId}`),
  },
  savedProgress.currentLevel,
);

new OverworldMap(
  container,
  navigation,
  (level) => {
    savedProgress = { ...savedProgress, currentLevel: level };
    try {
      saveManager?.save(savedProgress.completedLevels, level);
    } catch {
      // The current selection still works for this session without storage.
    }
  },
  () => {
    completedLevels.clear();
    savedProgress = {
      schemaVersion: 2,
      completedLevels: [],
      currentLevel: null,
      attempts: [],
    };
    try {
      saveManager?.reset();
    } catch {
      // Reset the visible session even when browser storage is unavailable.
    }
  },
  (level, trigger) => {
    const registered = levelManager
      .listLevels()
      .find(
        (entry) =>
          entry.gameId === level.gameId && entry.levelId === level.levelId,
      );
    if (!registered) return;
    levelPanel.open(registered.title, trigger);
    levelSession.selectLevel(level);
  },
);
