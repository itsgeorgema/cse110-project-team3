import type { MapNode } from "./mapPreview.ts";

/** Fixed display values only: no scoring, persistence, or progression updates. */
const mockResults: Readonly<Record<string, { accuracy: string; correct: string }>> = {
  "dressing-room": { accuracy: "90", correct: "9 / 10" },
  backstage: { accuracy: "80", correct: "8 / 10" },
};

/** Native modal keeps focus inside the summary and leaves map scroll intact. */
export function showResultsSummary(container: HTMLElement, node: MapNode, trigger: HTMLElement): void {
  const result = mockResults[node.id];
  if (!result || container.querySelector(".results-screen")) return;

  const dialog = document.createElement("dialog");
  dialog.className = "results-screen";
  dialog.setAttribute("aria-labelledby", "results-title");
  dialog.setAttribute("aria-describedby", "results-sample-note");
  dialog.innerHTML = `
    <div class="results-shell">
      <header class="results-topbar"><span class="wordmark">ESCAPE ROUTE</span><span class="preview-badge">Sample results</span></header>
      <div class="results-content">
        <button class="results-back" type="button" autofocus><span aria-hidden="true">←</span> Back to story map</button>
        <div class="results-layout">
          <section class="results-story">
            <span class="eyebrow">CHAPTER 0${node.chapter + 1} / LEVEL 0${node.level.levelId}</span>
            <h1 id="results-title">Results Summary</h1>
            <div class="results-completed"><span aria-hidden="true">✓</span> Level completed</div>
            <h2>${node.title}</h2>
            <p>${node.story}</p>
            <div class="results-memento" aria-hidden="true">
              <svg viewBox="0 0 300 100" fill="none"><path d="M15 68C70 68 64 25 125 25S192 75 280 40" stroke="#526e72" stroke-width="2" stroke-dasharray="5 7"/><circle cx="15" cy="68" r="7" fill="#98b6a1"/><circle cx="125" cy="25" r="10" fill="#dbb37c"/><path d="m120 25 4 4 7-8" stroke="#182a30" stroke-width="2"/><circle cx="280" cy="40" r="7" stroke="#98b6a1" stroke-width="2"/></svg>
              <span>ONE STEP CLOSER TO FREEDOM</span>
            </div>
          </section>
          <section class="results-score" aria-label="Sample level performance">
            <span class="eyebrow">FINAL ACCURACY</span>
            <div class="accuracy-display"><strong>${result.accuracy}</strong><span>%</span></div>
            <p class="results-score-caption">A strong finish under the spotlight.</p>
            <dl class="results-stat"><div><dt>Correct answers</dt><dd>${result.correct}</dd></div><div><dt>Level status</dt><dd>Completed</dd></div></dl>
            <button class="results-map-button" type="button">Return to story map <span aria-hidden="true">→</span></button>
            <p id="results-sample-note" class="results-note">Mock results for this preview. No score is calculated or saved.</p>
          </section>
        </div>
      </div>
    </div>`;
  const close = () => dialog.close();
  dialog.querySelector(".results-back")!.addEventListener("click", close);
  dialog.querySelector(".results-map-button")!.addEventListener("click", close);
  dialog.addEventListener("close", () => {
    dialog.remove();
    trigger.focus({ preventScroll: true });
  }, { once: true });
  container.append(dialog);
  dialog.showModal();
}
