// navbar/functions/checkbox.js
// Creates the checkbox widget

function buildCheckboxRow(index) {
  return `
    <label class="checkbox-row">
      <input type="checkbox" />
      <span>Option ${index}</span>
    </label>
  `;
}

export function createCheckboxWidget(optionCount = 4) {
  const safeCount = Math.max(1, Math.min(10, Number(optionCount) || 4));
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-checkbox-widget";

  const rows = Array.from({ length: safeCount }, (_, index) =>
    buildCheckboxRow(index + 1)
  ).join("");

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Checkboxes</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack checkbox-group">
      ${rows}
    </div>
  `;

  return widget;
}

export function rehydrateCheckboxWidget(_widgetRoot) {
  // no special behavior beyond generic inline editing
}
