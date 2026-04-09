// navbar/functions/textbox.js
// Creates the simple Text widget (no input, just editable text)

export function createTextboxWidget() {
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-text-widget";

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Text</h3>
    </div>
    <div class="gs-widget-body">
      <p>Double-click to edit text</p>
    </div>
  `;

  return widget;
}

export function rehydrateTextboxWidget(_widgetRoot) {
  // no special behavior beyond generic inline editing
}
