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
import { AnimationFactory } from "./view/animation/AnimationFactory.ts";
import { animationRegistry } from "./view/animation/animationRegistry.ts";
import { KonvaStage } from "./view/KonvaStage.ts";
import { runBuilderFor } from "./controller/runRegistry.ts";
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
const stage = new KonvaStage(levelPanel.stageHost);
const animations = new AnimationFactory(animationRegistry);
// A level with a RunBuilder and a registered game plays its answer on the
// stage (#116). Other levels keep the canvas-free engine, which finishes at
// once, until their run builder lands.
const levelSession = new LevelSession(levelManager, levelPanel, (config) => {
  const progress = saveAttempts(saveManager);
  const buildRun = runBuilderFor(config);
  if (buildRun === undefined || !animations.has(config.gameId)) {
    return {
      animation: new FakeAnimationEngine(),
      buildRun: () => [],
      progress,
    };
  }
  levelPanel.showStage(true);
  stage.reset();
  return {
    animation: animations.create(config.gameId, stage),
    buildRun,
    progress,
  };
});

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
