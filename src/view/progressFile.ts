/** Name for a downloaded progress file, e.g. escape-route-progress-2026-11-23.json. */
export function progressFileName(date = new Date()): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `escape-route-progress-${day}.json`;
}

/** Saves the exported progress as a file in the player's downloads (#3). */
export function downloadProgressFile(contents: string): void {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = progressFileName();
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Let the click start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
