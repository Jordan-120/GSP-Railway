// navbar/functions/dropdown.js
// Creates the Dropdown widget and wires up per-option text fields

function buildDropdownOption(index) {
  return `<option value="${index}">Option ${index}</option>`;
}

function buildOptionField(index) {
  return `
    <div class="dropdown-option-field" data-option="${index}">
      <label>
        <span>Option ${index} text</span>
        <input type="text" placeholder="Description for option ${index}" />
      </label>
    </div>
  `;
}

export function createDropdownWidget(optionCount = 4) {
  const safeCount = Math.max(1, Math.min(10, Number(optionCount) || 4));
  const widget = document.createElement("div");
  widget.className = "builder-widget gs-widget gs-dropdown-widget";

  const options = Array.from({ length: safeCount }, (_, index) =>
    buildDropdownOption(index + 1)
  ).join("");
  const fields = Array.from({ length: safeCount }, (_, index) =>
    buildOptionField(index + 1)
  ).join("");

  widget.innerHTML = `
    <div class="gs-widget-header">
      <span class="gs-widget-kicker">Function</span>
      <h3>Dropdown</h3>
    </div>
    <div class="gs-widget-body gs-widget-stack">
      <label class="gs-widget-field-label">
        <span>Choose an option</span>
        <select class="dropdown-select">${options}</select>
      </label>
      <div class="dropdown-option-notes">${fields}</div>
    </div>
  `;

  setupDropdown(widget);
  return widget;
}

function setupDropdown(widgetRoot) {
  const select = widgetRoot.querySelector(".dropdown-select");
  const fields = widgetRoot.querySelectorAll(".dropdown-option-field");
  if (!select || !fields.length) return;

  function syncFields() {
    const value = select.value;
    fields.forEach((field) => {
      field.style.display = field.dataset.option === value ? "block" : "none";
    });
  }

  select.addEventListener("change", syncFields);
  syncFields();
}

// Called from viewFunctions.rehydrateBuilderWidgets
export function rehydrateDropdownWidget(widgetRoot) {
  if (widgetRoot.querySelector(".dropdown-select")) {
    setupDropdown(widgetRoot);
  }
}
