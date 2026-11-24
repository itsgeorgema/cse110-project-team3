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
import { clearOnCorrect } from "./controller/clearOnCorrect.ts";
import { AnimationFactory } from "./view/animation/AnimationFactory.ts";
import { animationRegistry } from "./view/animation/animationRegistry.ts";
import { KonvaStage } from "./view/KonvaStage.ts";
import { runBuilderFor } from "./controller/runRegistry.ts";
import { saveAttempts } from "./controller/saveAttempts.ts";
import type { AttemptRecorder } from "./controller/GameController.ts";
import { LeaveGuard } from "./controller/LeaveGuard.ts";
import { downloadProgressFile } from "./view/progressFile.ts";
import { QuitDialog } from "./view/QuitDialog.ts";

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
// Closing a level redraws the map, so a level cleared inside it shows the
// next node unlocked at once.
const levelPanel = new LevelPanel(levelHost, () => {
  levelSession.close();
  map.refresh();
});
// A correct answer clears its level: the map unlocks the next node, and the
// save keeps it. savedProgress is updated too, because map moves save from it.
const clearing = clearOnCorrect({
  isCleared: (level) => completedLevels.has(`${level.gameId}:${level.levelId}`),
  markCleared: (level) => {
    completedLevels.add(`${level.gameId}:${level.levelId}`);
    savedProgress = {
      ...savedProgress,
      completedLevels: [...savedProgress.completedLevels, level],
    };
    try {
      saveManager?.save(
        savedProgress.completedLevels,
        savedProgress.currentLevel,
      );
    } catch {
      // The level stays cleared for this session without storage.
    }
  },
});
// Every checked answer is added to the saved history (#81), then a correct one
// clears its level (#106).
const attempts = saveAttempts(saveManager);
const progress: AttemptRecorder = {
  recordAttempt(result) {
    attempts.recordAttempt(result);
    clearing.recordAttempt(result);
  },
};
const stage = new KonvaStage(levelPanel.stageHost);
const animations = new AnimationFactory(animationRegistry);
// A level with a RunBuilder and a registered game plays its answer on the
// stage (#116). Other levels keep the canvas-free engine, which finishes at
// once, until their run builder lands.
const levelSession = new LevelSession(levelManager, levelPanel, (config) => {
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

// Clears the saved and visible progress, for Reset and for quitting with delete.
function resetProgress(): void {
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
}

// Closing the tab asks the player to use Quit first (#3).
const leaveGuard = new LeaveGuard(window);
leaveGuard.arm();
const quitDialog = new QuitDialog(
  document.body,
  container,
  (choice) => {
    if (choice === "delete") resetProgress();
    leaveGuard.disarm();
  },
  () => location.reload(),
);

const navigation = new OverworldNavigation(
  new OverworldGraph(previewNodes, previewConnections),
  levelManager.listLevels(),
  {
    isCompleted: (level) =>
      completedLevels.has(`${level.gameId}:${level.levelId}`),
  },
  savedProgress.currentLevel,
);

const map = new OverworldMap(
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
  resetProgress,
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
  {
    downloadProgress() {
      let contents: string;
      try {
        contents = saveManager!.exportSave();
      } catch {
        // Without storage, export what this session has played.
        contents = `${JSON.stringify(savedProgress, null, 2)}\n`;
      }
      downloadProgressFile(contents);
    },
    async importProgress(file) {
      if (!saveManager) {
        return "Progress can't be imported because this browser blocks saving.";
      }
      try {
        saveManager.importSave(await file.text());
      } catch {
        return "That file isn't an Escape Route progress file. Your progress is unchanged.";
      }
      // Rebuild the map and level state from the imported save.
      leaveGuard.disarm();
      location.reload();
      return undefined;
    },
    quit: (trigger) => quitDialog.open(trigger),
  },
);
