// navbar/functions/accordion.js
// Creates the Accordion widget DOM element

function buildAccordionSection(index, isOpen = false) {
  return `
    <details class="gs-widget-accordion-section" ${isOpen ? "open" : ""}>
      <summary>
        <span class="gs-widget-accordion-title">Section ${index}</span>
      </summary>
      <div class="gs-widget-accordion-body">
        <p>Double-click to edit this text…</p>
      </div>
    </details>
  `;
}

export function createAccordionWidget(sectionCount = 4) {
  const safeCount = Math.max(1, Math.min(10, Number(sectionCount) || 4));
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-accordion-widget";

  const sections = Array.from({ length: safeCount }, (_, index) =>
    buildAccordionSection(index + 1, index === 0)
  ).join("");

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Accordion</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack">
      ${sections}
    </div>
  `;

  return widget;
}

// For rehydration, nothing special is needed right now,
// but we export a stub in case you add custom behavior later.
export function rehydrateAccordionWidget(_widget) {
  // no-op for now
}
