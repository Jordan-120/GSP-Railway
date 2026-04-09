// homepage/navbar/functions/progressBar.js
// Creates a progress bar widget that advances by 1% up to 100%

export function createProgressBarWidget() {
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-progress-widget progress-bar-widget";
  widget.dataset.percent = "0";

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Progress</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack">
      <div class="progress-bar-container">
        <div class="progress-bar-fill"></div>
        <span class="progress-bar-label">0%</span>
      </div>
      <button type="button" class="progress-bar-button">+1%</button>
    </div>
  `;

  wireProgressBar(widget);
  return widget;
}

function wireProgressBar(widgetRoot) {
  const fill = widgetRoot.querySelector(".progress-bar-fill");
  const label = widgetRoot.querySelector(".progress-bar-label");
  const button = widgetRoot.querySelector(".progress-bar-button");

  if (!fill || !label || !button) return;

  function setPercent(pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    widgetRoot.dataset.percent = String(clamped);
    fill.style.width = `${clamped}%`;
    label.textContent = `${clamped}%`;
  }

  const initial = parseInt(widgetRoot.dataset.percent || "0", 10);
  setPercent(initial);

  button.addEventListener("click", () => {
    const current = parseInt(widgetRoot.dataset.percent || "0", 10);
    const next = Math.min(100, current + 1);
    setPercent(next);
  });
}

export function rehydrateProgressBarWidget(widgetRoot) {
  wireProgressBar(widgetRoot);
}
