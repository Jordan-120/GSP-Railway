// navbar/functions/multi-tabs.js
// Creates the Multi-tabs widget and wires up tab behavior

function buildTabButton(index) {
  return `
    <button type="button" class="tab-btn" data-tab="${index}">Tab ${index}</button>
  `;
}

function buildTabContent(index) {
  return `
    <div class="tab-content" data-tab="${index}">
      Content for tab ${index} (double-click to edit)
    </div>
  `;
}

export function createTabsWidget(tabCount = 4) {
  const safeCount = Math.max(1, Math.min(10, Number(tabCount) || 4));
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-tabs-widget";

  const buttons = Array.from({ length: safeCount }, (_, index) =>
    buildTabButton(index + 1)
  ).join("");
  const contents = Array.from({ length: safeCount }, (_, index) =>
    buildTabContent(index + 1)
  ).join("");

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Multi-tabs</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack">
      <div class="tabs-header">${buttons}</div>
      <div class="tabs-content-shell">${contents}</div>
    </div>
  `;

  setupTabs(widget);
  return widget;
}

function setupTabs(widgetRoot) {
  const buttons = widgetRoot.querySelectorAll(".tab-btn");
  const contents = widgetRoot.querySelectorAll(".tab-content");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      buttons.forEach((b) => {
        b.disabled = false;
        b.classList.remove("active");
      });

      btn.disabled = true;
      btn.classList.add("active");

      contents.forEach((content) => {
        content.style.display = content.dataset.tab === tabId ? "block" : "none";
      });
    });
  });

  const firstBtn = buttons[0];
  if (firstBtn) firstBtn.click();
}

// Called from viewFunctions.rehydrateBuilderWidgets
export function rehydrateTabsWidget(widgetRoot) {
  if (widgetRoot.querySelector(".tab-btn")) {
    setupTabs(widgetRoot);
  }
}
